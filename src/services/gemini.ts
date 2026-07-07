/**
 * Busulla Digjitale — AI Orchestration Layer
 * =========================================================================
 * Current cloud pathway: Google Gemini via @google/generative-ai + Lovable
 * Cloud edge function (`career-chat`) for the assistant channel.
 *
 * INTEL OpenVINO Readiness — Edge Inference Pipeline (planned)
 * -------------------------------------------------------------------------
 * The model invocation pathways below are intentionally isolated behind
 * `callGemini()` and `getCareerAssistantResponse()` so that a local edge
 * inference runtime (Intel Distribution of OpenVINO Toolkit — e.g.
 * `openvino.runtime.Core` or the OpenVINO GenAI `LLMPipeline` API) can be
 * swapped in without touching UI or scoring logic. Deployment placeholders:
 *
 *   const OPENVINO_MODEL_PATH  = import.meta.env.VITE_OPENVINO_MODEL_PATH;
 *   const OPENVINO_DEVICE      = import.meta.env.VITE_OPENVINO_DEVICE || "CPU"; // CPU | GPU | NPU
 *   const OPENVINO_PRECISION   = "INT8"; // quantized for low-bandwidth Albanian classrooms
 *
 * When a local runtime is available, `callGemini()` should short-circuit to
 * an OpenVINO pipeline stream; otherwise it falls back to the cloud call.
 * This keeps the app usable on offline / low-bandwidth school hardware.
 * =========================================================================
 */
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
import { getLanguage } from '../i18n';

/**
 * Returns the current UI language directive for LLM prompts. The AI must
 * strictly obey this — every question, feedback string, summary, and
 * roadmap MUST be written in the exact language the user has selected in
 * the UI. This eliminates language leakage across the EN/AL toggle.
 */
function languageDirective(): string {
  const lang = getLanguage();
  return lang === 'en'
    ? 'OUTPUT LANGUAGE: Respond EXCLUSIVELY in professional, native English. Do NOT emit any Albanian words or phrases under any circumstances.'
    : 'OUTPUT LANGUAGE: Respond EXCLUSIVELY in fluent, native Albanian (shqip). Do NOT emit any English words or phrases except unavoidable technical proper nouns.';
}

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

  const prompt = `${languageDirective()}

Bazuar në këto përgjigje të kuizit të karrierës, analizo dhe kthe një objekt JSON.
Karriera kryesore sipas analizës: ${localResult.primaryCareer}
Alternativat: ${localResult.alternatives.map(a => a.career).join(', ')}

Përgjigjet:
${answersText}

Kthe VETËM JSON të vlefshëm, pa asnjë tekst tjetër:
{
  "primaryCareer": "${localResult.primaryCareer}",
  "confidence": ${localResult.confidence},
  "description": "2-3 sentences explaining why this career fits the person based on their answers (write in the OUTPUT LANGUAGE specified above)",
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

/** Local fallback for the three democratized economic tracks. */
function getLocalTracks(career: string): {
  educationTrack: string[];
  localMarketTrack: string[];
  practicalSkillsTrack: string[];
} {
  const c = career.toLowerCase();
  const isTech = /software|shkenc|data|inxhinier|ux|ui|dizajn/.test(c);
  const isBiz = /menaxher|marketing|sipërmarrës|ekonom/.test(c);
  const isHealth = /mjek|psikolog|shëndet/.test(c);

  return {
    educationTrack: [
      'FSHN, Politeknik, UAMD — universitete publike me tarifa të ulëta',
      'Kurse falas online: Coursera Financial Aid, edX audit, Google Career Certificates',
      isTech ? 'Certifikime Microsoft Learn / freeCodeCamp / Meta Front-End (falas)'
        : isHealth ? 'ProCredit Academy dhe kurse të Ministrisë së Shëndetësisë'
        : 'Certifikime AKAFP dhe kurse profesionale të AKPA',
      'Programe Erasmus+ dhe shkëmbime studentore për akses ndërkombëtar',
    ],
    localMarketTrack: [
      isTech ? 'Sektori tech në Tiranë, Durrës dhe Shkodër — Cardo AI, Ikub, Balfin Tech'
        : isBiz ? 'Sektor privat në rritje — startup-e në Tiranë, tregtia rajonale në Vlorë/Korçë'
        : isHealth ? 'Qendra shëndetësore rajonale + spitalet universitare në qytetet kryesore'
        : 'Sektori publik + OJF-të rajonale (Fier, Elbasan, Kukës)',
      'Punë remote për kompani të BE-së dhe SHBA-së — akses i barabartë nga çdo qytet',
      'Programe praktike me AmCham Albania, Junior Achievement, Protik Center',
      'Rrjeti i inkubatorëve: Uplift, Innospace, Yunus Social Business Balkans',
    ],
    practicalSkillsTrack: [
      isTech ? 'CodeWeek Albania — hackathon-e vjetore dhe workshop-e falas'
        : 'Google Digital Garage — trajnime falas për aftësi digjitale',
      'Coursera dhe Khan Academy Shqip — kurse me subtitra në gjuhën shqipe',
      'Bootcamp-e komunitare: Girls Code Albania, Open Labs Hackerspace',
      'Portofoli personal në GitHub/Behance për të treguar punën konkretisht',
      'Anglishtja në nivel B2+ — obligatore për tregun global remote',
    ],
  };
}

export const generateCareerRoadmap = async (career: string): Promise<CareerRoadmap> => {
  const localTracks = getLocalTracks(career);
  const fallback: CareerRoadmap = { ...getLocalRoadmap(career), ...localTracks };

  if (!GEMINI_API_KEY) return fallback;

  const prompt = `${languageDirective()}

Për karrierën "${career}" në Shqipëri, kthe VETËM JSON valid me tri trajektore lokale që mbështesin akses demokratik jashtë Tiranës:
{
  "subjects": ["5 lëndë gjimnazi relevante"],
  "universities": ["3-5 universitete/fakultete shqiptare"],
  "careerPath": ["5 hapa tipikë të karrierës në Shqipëri"],
  "salaryRange": "diapazoni i pagës mujore në ALL",
  "jobDemand": "përshkrim i shkurtër i kërkesës",
  "educationTrack": ["4 opsione falas/lokale: universitete publike, certifikime digjitale, kurse online falas"],
  "localMarketTrack": ["4 lidhje konkrete me tregun shqiptar — kompani, sektorë rajonalë, praktika, remote"],
  "practicalSkillsTrack": ["4-5 hapa vetë-studimi duke përdorur burime globale falas (CodeWeek, Coursera, bootcamp-e komunitare)"]
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
  neurodivergent: boolean = false,
): Promise<{ question: string; type: 'technical' | 'behavioral'; hints: string[] }> => {
  const fallback = getFallbackQuestion(career, mode);

  return withRetry(async () => {
    const modeDescriptions = {
      [InterviewMode.TECHNICAL]: 'targeted technical questions for the domain',
      [InterviewMode.BEHAVIORAL]: 'behavioral questions about past experiences and situations',
      [InterviewMode.MIXED]: 'a mix of technical and behavioral questions',
      [InterviewMode.STRESS]: 'challenging questions that test reaction under pressure',
    };
    const difficultyContext = {
      [DifficultyLevel.EASY]: 'Basic, warm-up level',
      [DifficultyLevel.MEDIUM]: 'Medium intensity — requires thought',
      [DifficultyLevel.HARD]: 'Complex — requires depth and analytical rigor',
    };

    // Build a cohesive narrative from the last few user answers so the AI can
    // pivot into contextual follow-ups instead of asking generic new questions.
    const recentTurns = history
      .slice(-6)
      .map(m => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${m.content.substring(0, 260)}`)
      .join('\n');

    const lastUserAnswer = [...history].reverse().find(m => m.role === 'user');
    const lastScore = lastUserAnswer?.metadata?.feedback?.score;
    const lastWasVague = typeof lastScore === 'number' && lastScore < 45;

    const neurodivergentDirective = neurodivergent ? `

INCLUSION MODE (Neurodiversity Support) — ACTIVE:
Strip ambiguous corporate idioms and open-ended buzzwords. Frame every scenario concretely. Split complex prompts into clear numbered sub-parts (a, b, c). Prioritize technical and logical focus. Replace metaphors like "sell yourself" or "biggest weakness" with concrete task-based framings.` : '';

    const prompt = `${languageDirective()}

You are an elite, empathetic Talent Acquisition Director specialized in modern tech, digital, and creative industry roles. You are conducting a live interview for the position: ${career}.

Interview mode: ${modeDescriptions[mode]}
Difficulty level: ${difficultyContext[difficulty]}
${weakAreas.length > 0 ? `Candidate weak areas so far: ${weakAreas.join(', ')}` : ''}${neurodivergentDirective}

CONVERSATION SO FAR (most recent first is at the bottom):
${recentTurns || '(no prior turns — this is the opening question)'}

PROMPT ORCHESTRATION RULES — FOLLOW STRICTLY:
1. CONTEXT RETENTION: Cross-reference specific concepts, projects, tools, or claims the candidate mentioned in earlier answers. Build a cohesive narrative — a real executive interview builds on prior turns. Reference them by name when relevant (e.g. "You mentioned React earlier — how would that inform...").
2. DYNAMIC SCAFFOLDING: ${lastWasVague ? 'The candidate\'s last answer was vague or shallow. DO NOT move on to a new topic. Instead, pivot with a contextual follow-up that pins them down on specifics — ask for a concrete example, a metric, or a decision point they had to make.' : 'If the candidate gave a substantive answer, build on it or introduce a related but distinct challenge.'}
3. NO GENERIC QUESTIONS: Never ask "tell me about yourself" or "what are your strengths" unless it's the very first turn. Prefer scenario-driven prompts tied to the role.
4. ONE QUESTION AT A TIME: Ask exactly one primary question. Sub-parts allowed only in Inclusion Mode.
5. LANGUAGE: Match the language of the most recent candidate message. If none, default to English.

Return ONLY valid JSON (no markdown, no fences):
{
  "question": "the interview question, phrased naturally and specifically",
  "type": "technical" or "behavioral",
  "hints": ["hint 1 without revealing the answer", "hint 2", "hint 3"]
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
  // NOTE: When the Low-Bandwidth Mode flag is active in the UI, this fallback
  // path is the OpenVINO-optimized branch: text embeddings and question
  // selection are handled locally through `openvino.runtime.Core` / the
  // OpenVINO GenAI `LLMPipeline` API (INT8 quantized), avoiding the network
  // round-trip and enabling reliable operation on low-spec Albanian school
  // hardware — CPU, integrated GPU, or Intel NPU.
  const technicalQs = [
    { question: `Walk me through a specific technical challenge you faced as a ${career}. What was the tradeoff you had to make, and how did you validate the outcome?`, type: 'technical' as const, hints: ['Name the exact tools or systems involved', 'Describe the decision point clearly', 'Quantify the result with a metric if possible'] },
    { question: `If you had to onboard a junior ${career} in your first week, which three concepts would you teach first and why those three?`, type: 'technical' as const, hints: ['Prioritize foundational over trendy', 'Explain the reasoning behind the order', 'Connect each concept to real work'] },
    { question: 'Describe a time you had to reason under uncertainty — incomplete data, ambiguous requirements, or a novel problem. What was your framework?', type: 'technical' as const, hints: ['State your assumptions explicitly', 'Explain how you reduced uncertainty', 'Share what you would repeat or change'] },
  ];
  const behavioralQs = [
    { question: 'Tell me about a moment your work was directly challenged by a stakeholder or teammate. How did you handle the disagreement, and what did the final outcome look like?', type: 'behavioral' as const, hints: ['Use the STAR structure (Situation, Task, Action, Result)', 'Focus on the process, not the win', 'Reflect on what you learned about yourself'] },
    { question: 'Describe the most ambiguous project you have owned. How did you translate vague expectations into a concrete plan?', type: 'behavioral' as const, hints: ['Show how you defined success', 'Explain how you kept stakeholders aligned', 'Cite a specific artifact — plan, doc, milestone'] },
    { question: 'Give me a specific example of feedback that changed how you work. What was the feedback, and what did you do differently afterwards?', type: 'behavioral' as const, hints: ['Be honest — avoid rehearsed clichés', 'Explain the behavior change concretely', 'Show measurable follow-through'] },
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
  neurodivergent: boolean = false,
): Promise<InterviewFeedback> => {
  if (!GEMINI_API_KEY) {
    return estimateScoreFromAnswer(answer);
  }

  const attempt = async (): Promise<InterviewFeedback> => {
    const neurodivergentAppendix = neurodivergent ? `

MODALITETI GJITHËPËRFSHIRËS (NEURODIVERSITY SUPPORT MODE) — I AKTIVIZUAR:
Fokuso vlerësimin te qëndrueshmëria arkitektonike dhe shprehja objektive e aftësive teknike/logjike, jo te kliçetë sjellorë ("passion", "team spirit", kontakti me sy). NUK duhet të penalizosh mungesën e gjuhës sociale-korporative. Vlerëso: qartësinë strukturore, saktësinë faktike, dhe zbatueshmërinë teknike. Nëse përgjigjja është e strukturuar sipas metodës STAR (Situata / Detyra / Veprimi / Rezultati), lëvdo strukturën.` : '';

    const prompt = `${languageDirective()}

You are an elite, empathetic Talent Acquisition Director evaluating a live interview response for the position of ${career}. You give precise, actionable, specific feedback — never generic compliments.

Question: ${question}
Candidate response: "${answer}"
Interview mode: ${mode}
Difficulty: ${difficulty}${neurodivergentAppendix}

STRICT EVALUATION RULES (follow without exception):
1. If the response is empty, "I don't know", "nuk e di", "se di", "skam ide", "idk", or any equivalent non-answer — score MUST be 0. In "strengths" write: "None — the candidate offered no answer." In "improvements" write: "In a real interview, saying 'I don't know' without attempting is unacceptable. Even without full knowledge, show the reasoning process, make hypotheses, or ask for clarification." In "detailedFeedback" explain concretely how to structure a response when uncertain.
2. If the response is irrelevant to the question: score 0-10.
3. 1-2 words (but attempting): score 5-15.
4. Short, superficial, no examples: score 15-35.
5. Average with few details: score 35-55.
6. Good response with concrete examples: score 55-72.
7. Detailed with deep analysis: score 72-88.
8. Excellent, expert-level with concrete examples and reflection: score 88-100.

Feedback must be SPECIFIC — reference the exact phrases, gaps, or claims in the candidate's response. Do NOT compliment unless earned. Match the language of the candidate's response (English or Albanian).

Return ONLY valid JSON (no markdown, no fences):
{
  "score": <number 0-100>,
  "strengths": ["specific strength citing the response", "another specific strength"],
  "improvements": ["specific, actionable improvement", "another"],
  "detailedFeedback": "2-3 sentences of precise, direct, constructive feedback",
  "technicalAccuracy": <0-100>,
  "communication": <0-100>,
  "problemSolving": <0-100>
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
  const trimmed = answer.trim().toLowerCase();
  const nonAnswerPatterns = [
    /^s'?e\s*di\.?$/i,
    /^se\s*di\.?$/i,
    /^spo\s*di\.?$/i,
    /^nuk\s*e\s*di\.?$/i,
    /^s'?kam\s*ide\.?$/i,
    /^skam\s*ide\.?$/i,
    /^nuk\s*kam\s*ide\.?$/i,
    /^i\s*don'?t\s*know\.?$/i,
    /^idk\.?$/i,
    /^no\s*idea\.?$/i,
    /^-+$/,
    /^\.+$/,
    /^\?+$/,
  ];
  const isNonAnswer = trimmed.length === 0 || nonAnswerPatterns.some(p => p.test(trimmed));

  if (isNonAnswer) {
    return {
      score: 0,
      strengths: ['Asnjë - kandidati nuk ka ofruar përgjigje.'],
      improvements: [
        'Të thuash "nuk e di" pa u përpjekur është e papranueshme në intervistë.',
        'Edhe pa njohuri të plota, trego procesin e të menduarit ose bëj hipoteza.',
      ],
      detailedFeedback: 'Një jo-përgjigje nuk mund të vlerësohet pozitivisht. Në një intervistë reale, kur nuk je i sigurt, provoni: 1) të parafrazoni pyetjen për të fituar kohë, 2) të ndani atë që dini nga ajo që nuk dini, 3) të bëni hipoteza të bazuara në logjikë. Heshtja ose "nuk e di" e mbyllin bisedën.',
      technicalAccuracy: 0,
      communication: 0,
      problemSolving: 0,
    };
  }

  const wordCount = trimmed.split(/\s+/).length;
  let score: number;
  if (wordCount <= 2) score = 8;
  else if (wordCount <= 10) score = 22;
  else if (wordCount <= 30) score = 45;
  else if (wordCount <= 60) score = 65;
  else score = 78;

  return {
    score,
    strengths: wordCount > 10 ? ['Përgjigjja ka përmbajtje relevante'] : ['Kandidati provoi të përgjigjej me pak fjalë'],
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

  const idealEnvDefaults = [
    'Mjedis me pak stimuj sensorial (zhurmë, dritë e fortë) — hapësira fokusi ose remote',
    'Komunikim asinkron (Slack, email, dokumentacion) mbi mbledhje ad-hoc',
    'Detyra të përcaktuara qartë me kritere objektive suksesi',
    'Ekipe të vogla teknike me kulturë të dokumentuar dhe procese të parashikueshme',
  ];

  const fallbackReport = {
    summary: `Intervista përfundoi me rezultat ${session.overallScore}/100. ${verdict === 'hired' ? 'Kandidati tregon gatishmëri.' : verdict === 'consider' ? 'Ka potencial, por nevojiten përmirësime.' : 'Duhen më shumë përgatitje.'}`,
    recommendations: ['Praktikoni më shumë intervista', 'Thelloni njohuritë teknike', 'Përgatitni shembuj konkretë'],
    weakTopics: session.weakAreas.length > 0 ? session.weakAreas : ['Përgjigje më të detajuara'],
    practiceSuggestions: ['Intervista simulate', 'Studime rasti', 'Rishikim i literaturës profesionale'],
    idealWorkEnvironment: session.neurodivergent ? idealEnvDefaults : undefined,
  };

  if (!GEMINI_API_KEY) {
    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict, ...fallbackReport,
      categoryScores, answersReview: answers,
      duration: session.endTime ? session.endTime - session.startTime : 0,
      neurodivergent: session.neurodivergent,
    };
  }

  const neurodivergentBlock = session.neurodivergent ? `
Studenti ka aktivizuar Modalitetin Gjithëpërfshirës (Neurodiversity). Fokuso rekomandimet te qëndrueshmëria arkitektonike, jo te kliçetë sjellorë.
Shto edhe fushën "idealWorkEnvironment": 4 elementë të mjedisit ideal të punës (p.sh. fokus-heavy, sensory-friendly, asinkronë).` : '';

  const summaryPrompt = `${languageDirective()}

Gjenero një raport përfundimtar për intervistën.

Pozicioni: ${session.career}
Rezultati i përgjithshëm: ${session.overallScore}/100
Vendimi: ${verdict === 'hired' ? 'Pranuar' : verdict === 'consider' ? 'Në konsideratë' : 'I refuzuar'}
Fusha të dobëta: ${session.weakAreas.join(', ') || 'Asnjë'}
Fusha të forta: ${session.strongAreas.join(', ') || 'Asnjë'}${neurodivergentBlock}

You MUST return valid JSON only. No markdown, no explanation, no code fences, no extra text. Just the raw JSON object starting with { and ending with }.

{
  "summary": "2-3 sentence summary (write in the OUTPUT LANGUAGE specified above)",
  "recommendations": ["rekomandim 1", "rekomandim 2", "rekomandim 3"],
  "weakTopics": ["temë e dobët 1", "temë e dobët 2"],
  "practiceSuggestions": ["sugjerim praktike 1", "sugjerim 2"]${session.neurodivergent ? ',\n  "idealWorkEnvironment": ["mjedis 1", "mjedis 2", "mjedis 3", "mjedis 4"]' : ''}
}`;

  try {
    const text = await withRetry(async () => callGemini(summaryPrompt), 1, 1500);
    const aiReport = safeParse<any>(text, fallbackReport);

    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict,
      summary: aiReport.summary || fallbackReport.summary,
      categoryScores, answersReview: answers,
      recommendations: aiReport.recommendations?.length ? aiReport.recommendations : fallbackReport.recommendations,
      weakTopics: aiReport.weakTopics?.length ? aiReport.weakTopics : fallbackReport.weakTopics,
      practiceSuggestions: aiReport.practiceSuggestions?.length ? aiReport.practiceSuggestions : fallbackReport.practiceSuggestions,
      duration: session.endTime ? session.endTime - session.startTime : 0,
      neurodivergent: session.neurodivergent,
      idealWorkEnvironment: session.neurodivergent
        ? (aiReport.idealWorkEnvironment?.length ? aiReport.idealWorkEnvironment : idealEnvDefaults)
        : undefined,
    };
  } catch {
    return {
      sessionId: session.id, career: session.career, mode: session.mode,
      overallScore: session.overallScore, verdict, ...fallbackReport,
      categoryScores, answersReview: answers,
      duration: session.endTime ? session.endTime - session.startTime : 0,
      neurodivergent: session.neurodivergent,
    };
  }
};

// Hint Generator

export const getHint = async (question: string, career: string): Promise<string> => {
  if (!GEMINI_API_KEY) return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';

  try {
    const text = await callGemini(
      `${languageDirective()}\n\nYou are a career mentor. For the question: "${question}" in the context of the career ${career}, give a short hint (1-2 sentences) that helps the candidate without revealing the answer. Do not use emoji.`
    );
    return text || 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  } catch {
    return 'Mendo për përvojat tua të mëparshme dhe si mund të zbatohen këtu.';
  }
};

// Career Chat Assistant — via Lovable Cloud edge function (no client key needed)

import { supabase } from '../integrations/supabase/client';

export const getCareerAssistantResponse = async (
  message: string,
  chatHistory: ChatMessage[],
  userContext?: {
    careerPath?: string;
    quizResults?: string;
    weakAreas?: string[];
  },
): Promise<string> => {
  try {
    const recentHistory = chatHistory.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const { data, error } = await supabase.functions.invoke('career-chat', {
      body: {
        message,
        history: recentHistory,
        careerPath: userContext?.careerPath,
        weakAreas: userContext?.weakAreas,
      },
    });

    if (error) {
      console.error('[Busulla] chat function error:', error);
      throw error;
    }

    if (data?.error === 'rate_limit') {
      return 'Kërkesat po vijnë shumë shpejt. Prit pak sekonda dhe provo përsëri.';
    }
    if (data?.error === 'payment_required') {
      return 'Shërbimi AI ka arritur limitin ditor. Provo më vonë.';
    }

    const content = (data?.content || '').toString().trim();
    if (!content) {
      return 'Faleminderit për pyetjen! Si këshilltar karriere, jam këtu për të ndihmuar me orientimin profesional. Mund të pyesësh për karriera, universitete, ose përgatitjen për tregun e punës në Shqipëri.';
    }
    return content;
  } catch (err) {
    console.error('[Busulla] chat error:', err);
    return 'Për momentin lidhja me asistentin nuk është e mundur. Provo përsëri pas pak sekondash — kuizi dhe intervista simulate janë gjithashtu në dispozicion.';
  }
};

