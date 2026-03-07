import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  QuizAnswer,
  PredictionResult,
  CareerRoadmap,
  InterviewMode,
  DifficultyLevel,
  InterviewFeedback,
  InterviewMessage,
  InterviewSession,
  InterviewReport,
  ChatMessage,
} from '../types';
import { classifyToPrediction } from './classifier';

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = 'gemini-2.0-flash';

const TIMEOUT_MS = 15000;

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Koha e pritjes u tejkalua. Provo përsëri.')), ms)
  );
  return Promise.race([promise, timeout]);
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();
    const isRateLimit = message.includes('429') || message.includes('rate limit') || message.includes('resource_exhausted');
    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

function extractJson(text: string): string {
  const clean = text.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return '{}';
  return clean.slice(start, end + 1);
}

function safeParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(extractJson(text)) as T;
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
// Gemini caller
// ─────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  if (!genAI) throw new Error('Mungon VITE_GEMINI_API_KEY. Konfiguro çelësin API.');

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await withTimeout(model.generateContent(prompt));
  const response = result.response;
  return response.text().trim();
}

// ─────────────────────────────────────────────
// Career Prediction
// ─────────────────────────────────────────────

export const predictCareer = async (answers: QuizAnswer[]): Promise<PredictionResult> => {
  const localResult = classifyToPrediction(answers);

  if (!GEMINI_API_KEY) return localResult;

  const answersText = answers.map((a, i) => `${i + 1}. ${a.answer}`).join('\n');

  const prompt = `Bazuar në këto përgjigje të kuizit të karrierës, analizo dhe kthe një objekt JSON.
Karriera kryesore sipas analizës: ${localResult.primaryCareer}
Alternativat: ${localResult.alternatives.map(a => a.career).join(', ')}

Përgjigjet:
${answersText}

Kthe VETËM JSON të vlefshëm, pa asnjë tekst tjetër:
{
  "primaryCareer": "${localResult.primaryCareer}",
  "confidence": ${localResult.confidence},
  "description": "shkruaj 2-3 fjali në shqip pse kjo karrierë i përshtatet personit bazuar në përgjigjet",
  "alternatives": [
    {"career": "${localResult.alternatives[0]?.career || ''}", "confidence": ${localResult.alternatives[0]?.confidence || 0.5}, "description": "pse kjo alternativë"},
    {"career": "${localResult.alternatives[1]?.career || ''}", "confidence": ${localResult.alternatives[1]?.confidence || 0.4}, "description": "pse kjo alternativë"}
  ],
  "learningPath": ["hapi 1", "hapi 2", "hapi 3", "hapi 4", "hapi 5"]
}`;

  try {
    const resp = await withRetry(async () => callGemini(prompt));
    if (resp) {
      const parsed = safeParse<PredictionResult>(resp, localResult);
      if (parsed.primaryCareer && parsed.description && parsed.alternatives?.length) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('AI enrichment failed, using local result:', err);
  }

  return localResult;
};

// ─────────────────────────────────────────────
// Career Roadmap Generation
// ─────────────────────────────────────────────

export const generateCareerRoadmap = async (career: string): Promise<CareerRoadmap> => {
  const fallback: CareerRoadmap = {
    subjects: ['Matematikë', 'Fizikë', 'Informatikë'],
    universities: ['Universiteti i Tiranës', 'Universiteti Politeknik i Tiranës'],
    careerPath: ['Studime Bachelor', 'Praktikë/Stazh', 'Pozicion Junior', 'Pozicion Senior', 'Menaxher/Ekspert'],
    salaryRange: '40,000 - 120,000 ALL/muaj',
    jobDemand: 'Kërkesë e lartë',
  };

  if (!GEMINI_API_KEY) return fallback;

  const prompt = `Për karrierën "${career}" në Shqipëri, kthe VETËM JSON valid:
{
  "subjects": ["5 lëndë gjimnazi relevante"],
  "universities": ["3-5 universitete/fakultete shqiptare që ofrojnë këtë fushë"],
  "careerPath": ["5 hapa tipikë të karrierës në Shqipëri"],
  "salaryRange": "diapazoni i pagës mujore në ALL për Shqipërinë",
  "jobDemand": "përshkrim i shkurtër i kërkesës në tregun e punës shqiptar"
}`;

  try {
    const resp = await withRetry(async () => callGemini(prompt));
    return safeParse<CareerRoadmap>(resp, fallback);
  } catch {
    return fallback;
  }
};

// ─────────────────────────────────────────────
// Interview Question Generation
// ─────────────────────────────────────────────

export const generateDynamicQuestion = async (
  career: string,
  mode: InterviewMode,
  difficulty: DifficultyLevel,
  history: InterviewMessage[],
  weakAreas: string[] = [],
): Promise<{ question: string; type: 'technical' | 'behavioral'; hints: string[] }> => {
  const fallback = getFallbackQuestion(career, mode);

  return withRetry(async () => {
    const modeDescriptions = {
      [InterviewMode.TECHNICAL]: 'pyetje teknike specifike për fushën',
      [InterviewMode.BEHAVIORAL]: 'pyetje rreth përvojave dhe situatave të sjelljes',
      [InterviewMode.MIXED]: 'pyetje të përzier teknike dhe sjelljeore',
      [InterviewMode.STRESS]: 'pyetje sfiduese që testojnë reagimin nën presion',
    };
    const difficultyContext = {
      [DifficultyLevel.EASY]: 'Bazike, për ngrohje',
      [DifficultyLevel.MEDIUM]: 'Me intensitet mesatar, kërkon mendim',
      [DifficultyLevel.HARD]: 'Komplekse, kërkon thellësi dhe analitikë',
    };

    const historySummary = history
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.substring(0, 100))
      .join(' | ');

    const prompt = `Je intervistues ekspert për pozicionin: ${career}

Lloji i intervistës: ${modeDescriptions[mode]}
Niveli i vështirësisë: ${difficultyContext[difficulty]}
${weakAreas.length > 0 ? `Fusha që duhen përmirësuar: ${weakAreas.join(', ')}` : ''}
Përgjigjet e fundit të kandidatit: ${historySummary || 'Asnjë ende'}

KTHE VETËM JSON VALID:
{
  "question": "Pyetja në shqip (e qartë dhe koncize)",
  "type": "technical ose behavioral",
  "hints": ["hint 1 pa zbuluar përgjigjen", "hint 2", "hint 3"]
}`;

    try {
      const text = await callGemini(prompt);
      return safeParse(text, fallback);
    } catch {
      return fallback;
    }
  });
};

function getFallbackQuestion(
  career: string,
  mode: InterviewMode,
): { question: string; type: 'technical' | 'behavioral'; hints: string[] } {
  const technicalQs = [
    { question: `Çfarë teknologjish ose mjetesh ke përdorur në ${career}?`, type: 'technical' as const, hints: ['Mendo për projektet e fundit', 'Përmend teknologjitë kryesore', 'Flit për rezultatet'] },
    { question: 'Si e qase një problem kompleks në punë?', type: 'technical' as const, hints: ['Përshkrua hap pas hapi', 'Çfarë vendimesh more?', 'Cili ishte rezultati?'] },
  ];
  const behavioralQs = [
    { question: 'Na trego për një sfidë që e ke kapërcyer në ekip.', type: 'behavioral' as const, hints: ['Çfarë ndodhi saktësisht?', 'Cili ishte roli yt?', 'Çfarë mësove?'] },
    { question: 'Si punon nën presion?', type: 'behavioral' as const, hints: ['Jep një shembull konkret', 'Si e menaxhon kohën?', 'Çfarë strategjish përdor?'] },
  ];
  const pool = mode === InterviewMode.BEHAVIORAL ? behavioralQs :
    mode === InterviewMode.TECHNICAL ? technicalQs :
    [...technicalQs, ...behavioralQs];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────
// Answer Evaluation
// ─────────────────────────────────────────────

export const evaluateAnswerWithFeedback = async (
  career: string,
  question: string,
  answer: string,
  mode: InterviewMode,
  difficulty: DifficultyLevel,
): Promise<InterviewFeedback> => {
  const fallback: InterviewFeedback = {
    score: 60,
    strengths: ['Përgjigjja është relevante'],
    improvements: ['Shto më shumë detaje dhe shembuj'],
    detailedFeedback: 'Përgjigjja ka bazë të mirë, por mund të thellohet më shumë me shembuj konkretë.',
    technicalAccuracy: 60,
    communication: 70,
    problemSolving: 55,
  };

  if (!GEMINI_API_KEY) return fallback;

  return withRetry(async () => {
    const prompt = `Si intervistues për ${career}, vlerëso këtë përgjigje.

Pyetja: ${question}
Përgjigjja: ${answer}
Lloji i intervistës: ${mode}
Vështirësia: ${difficulty}

KTHE VETËM JSON VALID:
{
  "score": 0-100,
  "strengths": ["pika e fortë 1", "pika e fortë 2"],
  "improvements": ["përmirësim 1", "përmirësim 2"],
  "detailedFeedback": "Feedback i detajuar në shqip",
  "technicalAccuracy": 0-100,
  "communication": 0-100,
  "problemSolving": 0-100
}`;

    try {
      const text = await callGemini(prompt);
      return safeParse<InterviewFeedback>(text, fallback);
    } catch {
      return fallback;
    }
  });
};

// ─────────────────────────────────────────────
// Adaptive Difficulty
// ─────────────────────────────────────────────

export const determineNextDifficulty = async (
  history: InterviewMessage[],
  currentDifficulty: DifficultyLevel,
): Promise<DifficultyLevel> => {
  if (history.filter(m => m.role === 'user').length < 2) return currentDifficulty;

  const recentScores = history
    .filter(m => m.role === 'user' && m.metadata?.feedback?.score)
    .slice(-3)
    .map(m => m.metadata?.feedback?.score || 50);

  if (recentScores.length === 0) return currentDifficulty;

  const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

  if (avg >= 75 && currentDifficulty !== DifficultyLevel.HARD) {
    return currentDifficulty === DifficultyLevel.EASY ? DifficultyLevel.MEDIUM : DifficultyLevel.HARD;
  }
  if (avg < 50 && currentDifficulty !== DifficultyLevel.EASY) {
    return currentDifficulty === DifficultyLevel.HARD ? DifficultyLevel.MEDIUM : DifficultyLevel.EASY;
  }

  return currentDifficulty;
};

// ─────────────────────────────────────────────
// Interview Report Generation
// ─────────────────────────────────────────────

export const generateInterviewReport = async (
  session: InterviewSession,
): Promise<InterviewReport> => {
  const answers = session.messages
    .filter(m => m.role === 'user')
    .map((m, i) => {
      const question = session.messages.filter(m2 => m2.role === 'assistant')[i];
      return {
        question: question?.content || '',
        answer: m.content,
        score: m.metadata?.feedback?.score || 50,
        feedback: m.metadata?.feedback?.detailedFeedback || '',
      };
    });

  const categoryScores = { technical: 0, communication: 0, problemSolving: 0, cultureFit: 0 };
  let scoreCount = 0;

  session.messages
    .filter(m => m.role === 'user' && m.metadata?.feedback)
    .forEach(m => {
      const f = m.metadata!.feedback!;
      categoryScores.technical += f.technicalAccuracy || f.score;
      categoryScores.communication += f.communication || f.score;
      categoryScores.problemSolving += f.problemSolving || f.score;
      categoryScores.cultureFit += (f.communication || f.score) * 0.8;
      scoreCount++;
    });

  if (scoreCount > 0) {
    categoryScores.technical = Math.round(categoryScores.technical / scoreCount);
    categoryScores.communication = Math.round(categoryScores.communication / scoreCount);
    categoryScores.problemSolving = Math.round(categoryScores.problemSolving / scoreCount);
    categoryScores.cultureFit = Math.round(categoryScores.cultureFit / scoreCount);
  }

  const verdict = session.overallScore >= 70 ? 'hired' :
    session.overallScore >= 50 ? 'consider' : 'rejected';

  const summaryPrompt = `Gjenero një raport përfundimtar për intervistën.

Pozicioni: ${session.career}
Rezultati i përgjithshëm: ${session.overallScore}/100
Vendimi: ${verdict === 'hired' ? 'Pranuar' : verdict === 'consider' ? 'Në konsideratë' : 'I refuzuar'}
Fusha të dobëta: ${session.weakAreas.join(', ') || 'Asnjë'}
Fusha të forta: ${session.strongAreas.join(', ') || 'Asnjë'}

KTHE VETËM JSON VALID:
{
  "summary": "Përmbledhje në 2-3 fjali në shqip",
  "recommendations": ["rekomandim 1", "rekomandim 2", "rekomandim 3"],
  "weakTopics": ["temë e dobët 1", "temë e dobët 2"],
  "practiceSuggestions": ["sugjerim praktike 1", "sugjerim 2"]
}`;

  const fallbackReport = {
    summary: `Intervista përfundoi me rezultat ${session.overallScore}/100. ${verdict === 'hired' ? 'Kandidati tregon gatishmëri.' : verdict === 'consider' ? 'Ka potencial, por nevojiten përmirësime.' : 'Duhen më shumë përgatitje.'}`,
    recommendations: ['Praktikoni më shumë intervista', 'Thelloni njohuritë teknike', 'Përgatitni shembuj konkretë'],
    weakTopics: session.weakAreas.length > 0 ? session.weakAreas : ['Përgjigje më të detajuara'],
    practiceSuggestions: ['Intervista simulate', 'Studime rasti', 'Rishikim i literaturës profesionale'],
  };

  try {
    const text = await callGemini(summaryPrompt);
    const aiReport = safeParse(text, fallbackReport);

    return {
      sessionId: session.id,
      career: session.career,
      mode: session.mode,
      overallScore: session.overallScore,
      verdict,
      summary: aiReport.summary,
      categoryScores,
      answersReview: answers,
      recommendations: aiReport.recommendations,
      weakTopics: aiReport.weakTopics,
      practiceSuggestions: aiReport.practiceSuggestions,
      duration: session.endTime ? session.endTime - session.startTime : 0,
    };
  } catch {
    return {
      sessionId: session.id,
      career: session.career,
      mode: session.mode,
      overallScore: session.overallScore,
      verdict,
      ...fallbackReport,
      categoryScores,
      answersReview: answers,
      duration: session.endTime ? session.endTime - session.startTime : 0,
    };
  }
};

// ─────────────────────────────────────────────
// Hint Generator
// ─────────────────────────────────────────────

export const getHint = async (question: string, career: string): Promise<string> => {
  if (!GEMINI_API_KEY) return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';

  try {
    const text = await callGemini(
      `Ti je mentor karriere. Për pyetjen: "${question}" në kontekstin e karrierës ${career}, jep një hint të shkurtër në shqip që ndihmon kandidatin pa zbuluar përgjigjen. Vetëm 1-2 fjali.`
    );
    return text || 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  } catch {
    return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  }
};

// ─────────────────────────────────────────────
// Career Chat Assistant
// ─────────────────────────────────────────────

export const getCareerAssistantResponse = async (
  message: string,
  chatHistory: ChatMessage[],
  userContext?: {
    careerPath?: string;
    quizResults?: string;
    weakAreas?: string[];
  },
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return 'Shërbimi AI nuk është konfiguruar. Konfiguro VITE_GEMINI_API_KEY për të aktivizuar asistentin.';
  }

  return withRetry(async () => {
    const recentHistory = chatHistory.slice(-6);
    const historyContext = recentHistory
      .map(m => `${m.role === 'user' ? 'Përdoruesi' : 'Busulla'}: ${m.content}`)
      .join('\n');

    const contextParts: string[] = [];
    if (userContext?.careerPath) contextParts.push(`Karriera e rekomanduar: ${userContext.careerPath}`);
    if (userContext?.weakAreas?.length) contextParts.push(`Fusha për përmirësim: ${userContext.weakAreas.join(', ')}`);

    const prompt = `Ti je "Busulla", një këshilltar karriere miqësor dhe profesional për nxënësit e gjimnazit në Shqipëri.

RREGULLAT E TUA:
- GJITHMONË përgjigju në shqip
- Qëndro i fokusuar në tema karriere, arsimi, dhe zhvillimi profesional
- Ji i ngrohtë, inkurajues, dhe praktik
- Jep këshilla konkrete dhe të zbatueshme për kontekstin shqiptar
- Nëse pyetja nuk ka lidhje me karrierën, thuaj me mirësjellje që je i specializuar vetëm për karrierë

KONTEKSTI I PËRDORUESIT:
${contextParts.length > 0 ? contextParts.join('\n') : 'Asnjë kontekst specifik'}

HISTORIA E BISEDËS:
${historyContext || 'Bisedë e re'}

Përdoruesi: ${message}

Busulla:`;

    try {
      const text = await callGemini(prompt);
      return text || 'Më vjen keq, nuk mund ta përpunoj këtë kërkesë tani. Provo përsëri!';
    } catch {
      return 'Më vjen keq, provo ta riformulosh pyetjen me më shumë detaje.';
    }
  });
};
