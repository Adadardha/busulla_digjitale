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

// Config
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODEL_NAME = 'gemini-2.0-flash';
const TIMEOUT_MS = 15000;

// Utilities

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
    console.warn('[Busulla] JSON parse failed for text:', text.substring(0, 200));
    return fallback;
  }
}

// Gemini caller

async function callGemini(prompt: string): Promise<string> {
  if (!genAI) throw new Error('Mungon VITE_GEMINI_API_KEY. Konfiguro çelësin API.');

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const result = await withTimeout(model.generateContent(prompt));
  const response = result.response;
  const text = response.text().trim();
  console.log('[Busulla] Gemini raw response:', text.substring(0, 300));
  return text;
}

const STRICT_JSON_INSTRUCTION = `

IMPORTANT: You MUST return valid JSON only. No markdown, no explanation, no code fences, no extra text. Just the raw JSON object starting with { and ending with }.`;

// Career Prediction

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
}${STRICT_JSON_INSTRUCTION}`;

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

// Career Roadmap Generation
function getLocalRoadmap(career: string): CareerRoadmap {
  const roadmaps: Record<string, CareerRoadmap> = {
    'Zhvillues Software': {
      subjects: ['Matematikë', 'Informatikë', 'Fizikë', 'Logjikë', 'Anglisht'],
      universities: ['Fakulteti i Shkencave Natyrore (FSHN)', 'Universiteti Politeknik i Tiranës', 'UET Tiranë', 'EPOKA University'],
      careerPath: ['Studime Bachelor Informatikë', 'Praktikë në kompani tech', 'Junior Developer', 'Mid-level Developer', 'Senior / Tech Lead'],
      salaryRange: '60,000 - 200,000 ALL/muaj',
      jobDemand: 'Kërkesë shumë e lartë — tregu shqiptar dhe remote',
    },
    'Shkencëtar të Dhënash': {
      subjects: ['Matematikë', 'Statistikë', 'Informatikë', 'Fizikë', 'Anglisht'],
      universities: ['FSHN Tiranë', 'Universiteti Politeknik', 'UET', 'EPOKA University'],
      careerPath: ['Bachelor Matematikë/Informatikë', 'Certifikime ML/AI', 'Data Analyst Junior', 'Data Scientist', 'Lead Data Scientist'],
      salaryRange: '70,000 - 220,000 ALL/muaj',
      jobDemand: 'Kërkesë në rritje të shpejtë në Shqipëri dhe rajon',
    },
    'Dizajner UX/UI': {
      subjects: ['Art', 'Informatikë', 'Psikologji', 'Anglisht', 'Matematikë'],
      universities: ['Akademia e Arteve Tiranë', 'UET', 'POLIS University', 'Shkolla e Dizajnit'],
      careerPath: ['Bachelor Dizajn/Arteve', 'Portfolio personale', 'Junior Designer', 'UI/UX Designer', 'Lead Designer / Art Director'],
      salaryRange: '50,000 - 150,000 ALL/muaj',
      jobDemand: 'Kërkesë e mirë veçanërisht për agjenci digjitale',
    },
    'Menaxher Projekti': {
      subjects: ['Matematikë', 'Ekonomi', 'Gjuhë Shqipe', 'Anglisht', 'Informatikë'],
      universities: ['Fakulteti Ekonomik UT', 'UBT', 'UET', 'Universiteti Marin Barleti'],
      careerPath: ['Bachelor Ekonomi/Biznes', 'Asistent Projekti', 'Koordinator', 'Project Manager', 'Senior PM / Drejtues'],
      salaryRange: '60,000 - 180,000 ALL/muaj',
      jobDemand: 'Kërkesë konstante në sektorin publik dhe privat',
    },
    'Sipërmarrës / Themelues Startup': {
      subjects: ['Ekonomi', 'Matematikë', 'Anglisht', 'Informatikë', 'Histori'],
      universities: ['Fakulteti Ekonomik UT', 'UET', 'EPOKA', 'Universiteti Marin Barleti'],
      careerPath: ['Bachelor Biznes/Ekonomi', 'Përvojë në startup', 'Biznes i vogël', 'Startup me financim', 'Kompani e qëndrueshme'],
      salaryRange: 'E ndryshueshme — 30,000 deri +500,000 ALL/muaj',
      jobDemand: 'Ekosistemi startup shqiptar në zhvillim të shpejtë',
    },
    'Psikolog / Këshilltar': {
      subjects: ['Biologji', 'Sociologji', 'Gjuhë Shqipe', 'Filozofi', 'Anglisht'],
      universities: ['Fakulteti i Shkencave Sociale UT', 'Universiteti Aleksandër Moisiu Durrës', 'UET'],
      careerPath: ['Bachelor Psikologji', 'Master Klinik', 'Praktikë e mbikëqyrur', 'Psikolog i licencuar', 'Praktikë private'],
      salaryRange: '40,000 - 120,000 ALL/muaj',
      jobDemand: 'Kërkesë në rritje — shëndet mendor në fokus',
    },
    'Mjek / Profesionist Shëndetësor': {
      subjects: ['Biologji', 'Kimi', 'Fizikë', 'Matematikë', 'Anglisht'],
      universities: ['Universiteti i Mjekësisë Tiranë', 'UAMD Durrës — Infermieri', 'UMB'],
      careerPath: ['Fakulteti i Mjekësisë (6 vjet)', 'Rezidencë (3-5 vjet)', 'Mjek i licencuar', 'Specializim', 'Mjek Specialist'],
      salaryRange: '60,000 - 250,000 ALL/muaj',
      jobDemand: 'Kërkesë konstante dhe e lartë',
    },
    'Menaxher Marketingu': {
      subjects: ['Ekonomi', 'Anglisht', 'Informatikë', 'Sociologji', 'Art'],
      universities: ['Fakulteti Ekonomik UT', 'UET', 'Universiteti Marin Barleti', 'EPOKA'],
      careerPath: ['Bachelor Marketing/Ekonomi', 'Asistent Marketing', 'Specialist Digital', 'Marketing Manager', 'CMO / Drejtues'],
      salaryRange: '50,000 - 160,000 ALL/muaj',
      jobDemand: 'Kërkesë e mirë veçanërisht digital marketing',
    },
    'Inxhinier / Arkitekt': {
      subjects: ['Matematikë', 'Fizikë', 'Kimi', 'Vizatim Teknik', 'Informatikë'],
      universities: ['Universiteti Politeknik i Tiranës', 'POLIS University', 'UAMD'],
      careerPath: ['Bachelor Inxhinieri/Arkitekturë', 'Praktikë profesionale', 'Inxhinier Junior', 'Inxhinier i Licencuar', 'Drejtues Projekti'],
      salaryRange: '50,000 - 170,000 ALL/muaj',
      jobDemand: 'Kërkesë e qëndrueshme — ndërtim dhe infrastrukturë',
    },
    'Mësues / Trajner': {
      subjects: ['Gjuhë Shqipe', 'Pedagogji', 'Psikologji', 'Matematikë', 'Anglisht'],
      universities: ['Fakulteti i Shkencave Sociale UT', 'Universiteti Fan Noli Korçë', 'UAMD'],
      careerPath: ['Bachelor Mësuesi', 'Master Profesional', 'Mësues i ri', 'Mësues i kualifikuar', 'Drejtor/Trajner'],
      salaryRange: '35,000 - 90,000 ALL/muaj',
      jobDemand: 'Kërkesë konstante — sektor publik dhe privat',
    },
  };

  return roadmaps[career] || {
    subjects: ['Matematikë', 'Anglisht', 'Informatikë', 'Gjuhë Shqipe', 'Sociologji'],
    universities: ['Universiteti i Tiranës', 'UET', 'EPOKA University'],
    careerPath: ['Studime Bachelor', 'Praktikë profesionale', 'Pozicion fillestar', 'Zhvillim profesional', 'Ekspert i fushës'],
    salaryRange: '40,000 - 120,000 ALL/muaj',
    jobDemand: 'Kërkesë e mirë në tregun shqiptar',
  };
}
export const generateCareerRoadmap = async (career: string): Promise<CareerRoadmap> => {
  const fallback: CareerRoadmap = getLocalRoadmap(career);

  if (!GEMINI_API_KEY) return fallback;

  const prompt = `Për karrierën "${career}" në Shqipëri, kthe VETËM JSON valid:
{
  "subjects": ["5 lëndë gjimnazi relevante"],
  "universities": ["3-5 universitete/fakultete shqiptare që ofrojnë këtë fushë"],
  "careerPath": ["5 hapa tipikë të karrierës në Shqipëri"],
  "salaryRange": "diapazoni i pagës mujore në ALL për Shqipërinë",
  "jobDemand": "përshkrim i shkurtër i kërkesës në tregun e punës shqiptar"
}${STRICT_JSON_INSTRUCTION}`;

  try {
    const resp = await withRetry(async () => callGemini(prompt));
    return safeParse<CareerRoadmap>(resp, fallback);
  } catch {
    return fallback;
  }
};

// Interview Question Generation

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
}${STRICT_JSON_INSTRUCTION}`;

    try {
      const text = await callGemini(prompt);
      const parsed = safeParse(text, fallback);
      if (parsed.question && parsed.question.length > 5) return parsed;
      return fallback;
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

// Answer Evaluation

export const evaluateAnswerWithFeedback = async (
  career: string,
  question: string,
  answer: string,
  mode: InterviewMode,
  difficulty: DifficultyLevel,
): Promise<InterviewFeedback> => {
  if (!GEMINI_API_KEY) {
    return estimateScoreFromAnswer(answer);
  }

  const attempt = async (): Promise<InterviewFeedback> => {
    const prompt = `Si intervistues ekspert për ${career}, vlerëso këtë përgjigje me rigorozitet.

Pyetja: ${question}
Përgjigjja e kandidatit: ${answer}
Lloji i intervistës: ${mode}
Vështirësia: ${difficulty}

RREGULLAT E VLERËSIMIT (NDJEK STRIKT):
- Përgjigje me 1-2 fjalë ose bosh: score 0-10
- Përgjigje e shkurtër pa shembuj: score 10-30
- Përgjigje mesatare me pak detaje: score 30-50
- Përgjigje e mirë me shembuj: score 50-70
- Përgjigje e detajuar me analitikë: score 70-90
- Përgjigje e shkëlqyer, eksperte: score 90-100

You MUST return valid JSON only. No markdown, no explanation, no code fences, no extra text. Just the raw JSON object starting with { and ending with }.

{
  "score": <number 0-100 based on rules above>,
  "strengths": ["pika e fortë 1", "pika e fortë 2"],
  "improvements": ["përmirësim 1", "përmirësim 2"],
  "detailedFeedback": "Feedback i detajuar në shqip",
  "technicalAccuracy": <number 0-100>,
  "communication": <number 0-100>,
  "problemSolving": <number 0-100>
}`;

    const text = await callGemini(prompt);
    const parsed = safeParse<InterviewFeedback | null>(text, null);

    if (parsed && typeof parsed.score === 'number' && parsed.strengths && parsed.improvements) {
      // Clamp score
      parsed.score = Math.max(0, Math.min(100, parsed.score));
      if (parsed.technicalAccuracy != null) parsed.technicalAccuracy = Math.max(0, Math.min(100, parsed.technicalAccuracy));
      if (parsed.communication != null) parsed.communication = Math.max(0, Math.min(100, parsed.communication));
      if (parsed.problemSolving != null) parsed.problemSolving = Math.max(0, Math.min(100, parsed.problemSolving));
      return parsed;
    }

    throw new Error('Invalid parsed feedback');
  };

  // Try twice before falling back
  try {
    return await withRetry(attempt, 1, 1500);
  } catch (err) {
    console.warn('[Busulla] evaluateAnswer failed after retries:', err);
    return estimateScoreFromAnswer(answer);
  }
};

function estimateScoreFromAnswer(answer: string): InterviewFeedback {
  const wordCount = answer.trim().split(/\s+/).length;
  let score: number;
  if (wordCount <= 2) score = 5;
  else if (wordCount <= 10) score = 20;
  else if (wordCount <= 30) score = 45;
  else if (wordCount <= 60) score = 65;
  else score = 78;

  return {
    score,
    strengths: wordCount > 10 ? ['Përgjigjja ka përmbajtje relevante'] : ['Kandidati u përpoq të përgjigjej'],
    improvements: wordCount <= 10
      ? ['Shto shumë më shumë detaje dhe shembuj konkretë', 'Përgjigjja ishte shumë e shkurtër']
      : ['Mund të shtosh më shumë shembuj praktikë'],
    detailedFeedback: wordCount <= 10
      ? 'Përgjigjja ishte shumë e shkurtër. Në një intervistë reale, duhet të jepni përgjigje të detajuara me shembuj konkretë.'
      : 'Përgjigjja ka bazë të mirë. Mund të përmirësohet duke shtuar shembuj më konkretë dhe duke treguar rezultate specifike.',
    technicalAccuracy: Math.max(score - 10, 0),
    communication: Math.min(score + 10, 100),
    problemSolving: score,
  };
}

// Adaptive Difficulty

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

// Interview Report Generation

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

  const fallbackReport = {
    summary: `Intervista përfundoi me rezultat ${session.overallScore}/100. ${verdict === 'hired' ? 'Kandidati tregon gatishmëri.' : verdict === 'consider' ? 'Ka potencial, por nevojiten përmirësime.' : 'Duhen më shumë përgatitje.'}`,
    recommendations: ['Praktikoni më shumë intervista', 'Thelloni njohuritë teknike', 'Përgatitni shembuj konkretë'],
    weakTopics: session.weakAreas.length > 0 ? session.weakAreas : ['Përgjigje më të detajuara'],
    practiceSuggestions: ['Intervista simulate', 'Studime rasti', 'Rishikim i literaturës profesionale'],
  };

  if (!GEMINI_API_KEY) {
    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict, ...fallbackReport,
      categoryScores, answersReview: answers,
      duration: session.endTime ? session.endTime - session.startTime : 0,
    };
  }

  const summaryPrompt = `Gjenero një raport përfundimtar për intervistën.

Pozicioni: ${session.career}
Rezultati i përgjithshëm: ${session.overallScore}/100
Vendimi: ${verdict === 'hired' ? 'Pranuar' : verdict === 'consider' ? 'Në konsideratë' : 'I refuzuar'}
Fusha të dobëta: ${session.weakAreas.join(', ') || 'Asnjë'}
Fusha të forta: ${session.strongAreas.join(', ') || 'Asnjë'}

You MUST return valid JSON only. No markdown, no explanation, no code fences, no extra text. Just the raw JSON object starting with { and ending with }.

{
  "summary": "Përmbledhje në 2-3 fjali në shqip",
  "recommendations": ["rekomandim 1", "rekomandim 2", "rekomandim 3"],
  "weakTopics": ["temë e dobët 1", "temë e dobët 2"],
  "practiceSuggestions": ["sugjerim praktike 1", "sugjerim 2"]
}`;

  try {
    const text = await withRetry(async () => callGemini(summaryPrompt), 1, 1500);
    const aiReport = safeParse(text, fallbackReport);

    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict,
      summary: aiReport.summary || fallbackReport.summary,
      categoryScores, answersReview: answers,
      recommendations: aiReport.recommendations?.length ? aiReport.recommendations : fallbackReport.recommendations,
      weakTopics: aiReport.weakTopics?.length ? aiReport.weakTopics : fallbackReport.weakTopics,
      practiceSuggestions: aiReport.practiceSuggestions?.length ? aiReport.practiceSuggestions : fallbackReport.practiceSuggestions,
      duration: session.endTime ? session.endTime - session.startTime : 0,
    };
  } catch {
    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict, ...fallbackReport,
      categoryScores, answersReview: answers,
      duration: session.endTime ? session.endTime - session.startTime : 0,
    };
  }
};

// Hint Generator

export const getHint = async (question: string, career: string): Promise<string> => {
  if (!GEMINI_API_KEY) return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';

  try {
    const text = await callGemini(
      `Ti je mentor karriere. Për pyetjen: "${question}" në kontekstin e karrierës ${career}, jep një hint të shkurtër në shqip që ndihmon kandidatin pa zbuluar përgjigjen. Vetëm 1-2 fjali. Mos përdor emoji.`
    );
    return text || 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  } catch {
    return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  }
};

// Career Chat Assistant

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
- MOS përdor emoji në asnjë rast

KONTEKSTI I PËRDORUESIT:
${contextParts.length > 0 ? contextParts.join('\n') : 'Asnjë kontekst specifik'}

HISTORIA E BISEDËS:
${historyContext || 'Bisedë e re'}

Përdoruesi: ${message}

Busulla:`;

    try {
      const text = await callGemini(prompt);
      return text || 'Faleminderit për pyetjen! Si këshilltar karriere, jam këtu për të ndihmuar me orientimin profesional. Mund të pyesësh për karriera, universitete, ose përgatitjen për tregun e punës në Shqipëri.';
    } catch {
      return 'Faleminderit për pyetjen! Për momentin nuk mund të lidhem me shërbimin AI. Megjithatë, mund të përdorësh kuizin e karrierës për të zbuluar rrugën tënde, ose intervistën simulate për tu praktikuar.';
    }
  });
};
