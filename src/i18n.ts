import { useEffect, useState } from 'react';
import { QuizQuestion, InterviewMode, DifficultyLevel, QuickAction } from './types';

// =============================================================================
// Bilingual dictionary — EN is the primary interface language for global audit;
// AL is available via the header toggle. Both dicts share IDENTICAL keys.
// =============================================================================

type Dict = {
  landing: { title: string; subtitle: string };
  common: Record<string, string>;
  quiz: { progress: string };
  analyzing: { title: string; subtitle: string };
  results: Record<string, string>;
  interviewSetup: {
    title: string; subtitle: string; selectMode: string; selectDifficulty: string; startButton: string;
    modes: Record<string, { name: string; description: string }>;
    difficulties: Record<string, { name: string; description: string }>;
    careerInfo: string; questionsCount: string; hints: string;
  };
  interviewSession: Record<string, string>;
  interviewReport: any;
  chat: Record<string, string>;
  about: Record<string, string>;
  stats: Record<string, string>;
  nav: { about: string; restart: string; languageToggle: string };
};

const EN_DICT: Dict = {
  landing: {
    title: 'DIGITAL COMPASS',
    subtitle:
      'An AI-driven career mapping and accessibility ecosystem engineered to democratize professional guidance, bridge regional opportunity gaps, and provide inclusive, neurodivergent-friendly evaluation metrics.',
  },
  common: {
    start: 'START',
    restart: 'RESTART',
    back: 'BACK',
    other: 'Other',
    customPlaceholder: 'Write your own answer...',
    send: 'SEND',
    returnToStart: 'RETURN TO START',
    loading: 'Loading...',
    close: 'Close',
    next: 'Continue',
    skip: 'Skip',
    retry: 'Try again',
    export: 'Export',
    error: 'An error occurred. Please try again.',
    tryAnother: 'TRY ANOTHER CAREER',
  },
  quiz: { progress: 'QUESTION' },
  analyzing: {
    title: 'Analyzing Aptitudes...',
    subtitle: 'The AI is analyzing your career profile.',
  },
  results: {
    title: 'Career Results',
    match: 'Primary Match',
    confidence: 'Match',
    alternatives: 'Alternative Paths',
    whyFit: 'Why this career suits you',
    salary: 'Salary Range',
    learning: 'Learning Path',
    practice: 'Start Interview Practice',
    roadmap: 'Career Roadmap',
    roadmapSubjects: 'High-school subjects to focus on',
    roadmapUniversities: 'Universities & faculties in Albania',
    roadmapCareerPath: 'Typical career progression',
    roadmapSalary: 'Salary range in Albania',
    roadmapDemand: 'Labor market demand',
    shareTitle: 'Share with friends!',
    shareDescription: 'Scan the QR code to try Digital Compass',
    mlAnalysis: 'ML Analysis',
    mlBadge: 'local model',
    tracksTitle: 'Local Tracks · Democratic Access',
    trackEducation: 'Education & Certifications',
    trackEducationSub: 'Public universities + free courses',
    trackMarket: 'Local Job Market',
    trackMarketSub: 'Companies and sectors in Albania',
    trackSkills: 'Practical Skills',
    trackSkillsSub: 'CodeWeek, Coursera, bootcamps',
    missionsTitle: 'Your Core Action Plan',
    missionsSubtitle: 'Check off missions as you complete them',
    mission1: 'Complete a 2-minute mock interview',
    mission2: 'Review free regional coding resources',
    mission3: 'Reach out to one professional in this field',
    progressLabel: 'Progress',
    radarTitle: 'Regional Opportunity Radar',
    radarSubtitle: 'Demand across Albanian regions',
  },
  interviewSetup: {
    title: 'Configure Interview',
    subtitle: 'Choose the mode and difficulty of your simulated interview',
    selectMode: 'Select Mode',
    selectDifficulty: 'Select Difficulty',
    startButton: 'START INTERVIEW',
    modes: {
      technical: { name: 'Technical', description: 'Questions focused on technical skills and domain knowledge' },
      behavioral: { name: 'Behavioral', description: 'Questions about experience, situations, and interpersonal management' },
      mixed: { name: 'Mixed', description: 'A combination of technical and behavioral questions' },
      stress: { name: 'Stress Test', description: 'Challenging questions that test your response under pressure' },
    },
    difficulties: {
      easy: { name: 'Easy', description: 'Warm-up questions' },
      medium: { name: 'Medium', description: 'Moderately intense questions' },
      hard: { name: 'Hard', description: 'Complex questions requiring depth' },
    },
    careerInfo: 'Your career:',
    questionsCount: '5-10 questions',
    hints: '3 hints available',
  },
  interviewSession: {
    title: 'Simulated Interview',
    subtitle: 'Answer the questions and receive instant feedback',
    timeRemaining: 'Elapsed',
    score: 'Score',
    currentDifficulty: 'Difficulty',
    questionsAnswered: 'Questions answered',
    hintsRemaining: 'Hints remaining',
    chatPlaceholder: 'Write your response...',
    sendAnswer: 'SEND RESPONSE',
    getHint: 'REQUEST HINT',
    finishInterview: 'FINISH INTERVIEW',
    typing: 'Typing...',
    evaluating: 'Evaluating...',
    feedback: 'Feedback',
    strengths: 'Strengths',
    improvements: 'Improvements',
  },
  interviewReport: {
    title: 'Interview Report',
    overallScore: 'Overall Score',
    verdict: 'Verdict',
    verdicts: { hired: 'HIRED', consider: 'UNDER CONSIDERATION', rejected: 'REJECTED' },
    summary: 'Summary',
    categoryScores: 'Category Scores',
    categories: { technical: 'Technical Skills', communication: 'Communication', problemSolving: 'Problem Solving', cultureFit: 'Culture Fit' },
    answersReview: 'Answer Review',
    recommendations: 'Recommendations',
    weakTopics: 'Areas to Improve',
    practiceSuggestions: 'Practice Suggestions',
    duration: 'Duration',
    minutes: 'minutes',
    newInterview: 'NEW INTERVIEW',
    backToResults: 'BACK TO RESULTS',
    exportReport: 'EXPORT REPORT',
    nextSteps: 'Next Steps',
    weakAnswers: 'Weakest Answers',
    tipForImprovement: 'Tip for Improvement',
  },
  chat: {
    title: 'Compass',
    subtitle: 'Your AI career counselor',
    placeholder: 'Ask me anything about your career...',
    send: 'Send',
    minimized: 'Compass',
    newChat: 'New chat',
    quickActions: 'Quick actions',
    welcome: "Hello! I'm Compass, your AI career counselor. How can I help you today?",
    error: 'An error occurred. Please try again.',
    apiQuotaExceeded: 'The AI service is overloaded. Please try again later.',
  },
  about: {
    title: 'About the Project',
    subtitle: 'Digital Compass — AI-powered career orientation',
    problem: 'The Challenge',
    problemText:
      'Traditional career counseling is centralized in major urban hubs, creating massive regional opportunity gaps for youth across Albania and driving talent emigration (brain drain).',
    methodology: 'The AI Solution',
    methodologyText:
      'Digital Compass democratizes professional development by combining multimodal language model assessment, automated conversational mock interviews, and regional economic mapping tailored to the Albanian labor market.',
    team: 'Inclusion Engine',
    teamText:
      'A specialized Web Speech API transcription layer supports motor and anxiety accessibility, alongside a toggleable Neurodiversity Mode that strips out ambiguous corporate jargon and restructures interview prompts into clear STAR-method milestones for students on the autism spectrum.',
    tech: 'Technology',
    techText:
      'React + TypeScript + Vite + Google Gemini 2.0. Local vector classification (Holland RIASEC) enriched with generative AI, with an OpenVINO-ready edge inference layer for low-bandwidth classroom deployment.',
  },
  stats: {
    title: 'Digital Compass has been used by',
    students: 'students',
    topCareers: 'Most suggested careers:',
  },
  nav: {
    about: 'About',
    restart: 'RESTART',
    languageToggle: 'EN / AL',
  },
};

const AL_DICT: Dict = {
  landing: {
    title: 'BUSULLA DIGJITALE',
    subtitle:
      'Një ekosistem i udhëheqjes së karrierës i mundësuar nga IA, i projektuar për të demokratizuar orientimin profesional, për të zvogëluar diferencat rajonale dhe për të ofruar metrika përfshirëse për njerëzit neurodivergjentë.',
  },
  common: {
    start: 'FILLO',
    restart: 'RIFILLO',
    back: 'KTHEHU',
    other: 'Tjetër',
    customPlaceholder: 'Shkruani përgjigjen tuaj...',
    send: 'DËRGONI',
    returnToStart: 'KTHEHU NË FILLIM',
    loading: 'Duke ngarkuar...',
    close: 'Mbyll',
    next: 'Vazhdo',
    skip: 'Kapërce',
    retry: 'Provo përsëri',
    export: 'Eksporto',
    error: 'Ndodhi një gabim. Provo përsëri.',
    tryAnother: 'PROVO NJË KARRIERË TJETËR',
  },
  quiz: { progress: 'PYETJA' },
  analyzing: {
    title: 'Duke Analizuar...',
    subtitle: 'Inteligjenca artificiale po analizon profilin tuaj të karrierës.',
  },
  results: {
    title: 'Rezultatet e Karrierës',
    match: 'Përputhja Kryesore',
    confidence: 'Përputhja',
    alternatives: 'Alternativa të Tjera',
    whyFit: 'Pse kjo karrierë ju përshtatet?',
    salary: 'Diapazoni i Pagës',
    learning: 'Rrugëtimi i Mësimit',
    practice: 'Fillo Praktikën e Intervistës',
    roadmap: 'Harta e Karrierës',
    roadmapSubjects: 'Lëndët për tu fokusuar në gjimnaz',
    roadmapUniversities: 'Universitete/Fakultete në Shqipëri',
    roadmapCareerPath: 'Rruga tipike e karrierës',
    roadmapSalary: 'Diapazoni i pagës në Shqipëri',
    roadmapDemand: 'Kërkesa në tregun e punës',
    shareTitle: 'Ndaj me shokët!',
    shareDescription: 'Skano kodin QR për të provuar Busullën',
    mlAnalysis: 'Analiza ML',
    mlBadge: 'model lokal',
    tracksTitle: 'Trajektoret Lokale · Akses Demokratik',
    trackEducation: 'Arsimi dhe Certifikimet',
    trackEducationSub: 'Universitete publike + kurse falas',
    trackMarket: 'Tregu Lokal i Punës',
    trackMarketSub: 'Kompani dhe sektorë në Shqipëri',
    trackSkills: 'Aftësi Praktike',
    trackSkillsSub: 'CodeWeek, Coursera, bootcamp-e',
    missionsTitle: 'Plani Yt i Veprimit',
    missionsSubtitle: 'Shëno misionet ndërsa i përfundon',
    mission1: 'Përfundo një intervistë 2-minutëshe',
    mission2: 'Shfleto burimet falas rajonale të kodimit',
    mission3: 'Kontakto një profesionist në këtë fushë',
    progressLabel: 'Progresi',
    radarTitle: 'Radari Rajonal i Mundësive',
    radarSubtitle: 'Kërkesa nëpër rajonet shqiptare',
  },
  interviewSetup: {
    title: 'Konfiguro Intervistën',
    subtitle: 'Zgjidhni mënyrën dhe vështirësinë e intervistës suaj simulate',
    selectMode: 'Zgjidhni Mënyrën',
    selectDifficulty: 'Zgjidhni Vështirësinë',
    startButton: 'FILLO INTERVISTËN',
    modes: {
      technical: { name: 'Teknike', description: 'Pyetje të fokusuara në aftësi teknike dhe njohuri të fushës' },
      behavioral: { name: 'Sjelljeore', description: 'Pyetje rreth përvojave, situatave dhe menaxhimit interpersonal' },
      mixed: { name: 'Të Përzier', description: 'Kombinim i pyetjeve teknike dhe sjelljeore' },
      stress: { name: 'Stres Test', description: 'Pyetje sfiduese që testojnë reagimin nën presion' },
    },
    difficulties: {
      easy: { name: 'E Lehtë', description: 'Pyetje bazike për ngrohje' },
      medium: { name: 'Mesatare', description: 'Pyetje me intensitet mesatar' },
      hard: { name: 'E Vështirë', description: 'Pyetje komplekse që kërkojnë thellësi' },
    },
    careerInfo: 'Karriera juaj:',
    questionsCount: '5-10 pyetje',
    hints: '3 hints të disponueshme',
  },
  interviewSession: {
    title: 'Intervistë Simuluar',
    subtitle: 'Përgjigjuni pyetjeve dhe merrni feedback të menjëhershëm',
    timeRemaining: 'Koha',
    score: 'Rezultati',
    currentDifficulty: 'Vështirësia',
    questionsAnswered: 'Pyetje të përgjigjura',
    hintsRemaining: 'Hints të mbetura',
    chatPlaceholder: 'Shkruani përgjigjen tuaj...',
    sendAnswer: 'DËRGO PËRGJIGJEN',
    getHint: 'KËRKO HINT',
    finishInterview: 'PËRFUNDO INTERVISTËN',
    typing: 'Po shkruan...',
    evaluating: 'Duke vlerësuar...',
    feedback: 'Feedback',
    strengths: 'Pikat e forta',
    improvements: 'Përmirësime',
  },
  interviewReport: {
    title: 'Raporti i Intervistës',
    overallScore: 'Rezultati i Përgjithshëm',
    verdict: 'Vendimi',
    verdicts: { hired: 'PRANUAR', consider: 'NË KONSIDERATË', rejected: 'I REFUZUAR' },
    summary: 'Përmbledhje',
    categoryScores: 'Rezultatet sipas Kategorive',
    categories: { technical: 'Aftësi Teknike', communication: 'Komunikim', problemSolving: 'Zgjidhje Problemesh', cultureFit: 'Përshtatje Kulturore' },
    answersReview: 'Rishikimi i Përgjigjeve',
    recommendations: 'Rekomandime',
    weakTopics: 'Tema për Përmirësim',
    practiceSuggestions: 'Sugjerime për Praktikë',
    duration: 'Kohëzgjatja',
    minutes: 'minuta',
    newInterview: 'INTERVISTË E RE',
    backToResults: 'KTHEHU TE REZULTATET',
    exportReport: 'SHKARKO RAPORTIN',
    nextSteps: 'Hapat e Ardhshëm',
    weakAnswers: 'Përgjigjet e Dobëta',
    tipForImprovement: 'Këshillë për Përmirësim',
  },
  chat: {
    title: 'Busulla',
    subtitle: 'Këshilltari juaj i karrierës',
    placeholder: 'Shkruani pyetjen tuaj...',
    send: 'Dërgo',
    minimized: 'Busulla',
    newChat: 'Bisedë e re',
    quickActions: 'Veprime të shpejta',
    welcome: "Përshëndetje! Unë jam Busulla, këshilltari juaj i karrierës. Si mund t'ju ndihmoj sot?",
    error: 'Ndodhi një gabim. Provo përsëri.',
    apiQuotaExceeded: 'Shërbimi AI është i mbingarkuar. Provo përsëri më vonë.',
  },
  about: {
    title: 'Rreth Projektit',
    subtitle: 'Busulla Digjitale — Orientimi digjital i karrierës',
    problem: 'Sfida',
    problemText:
      'Këshillimi tradicional i karrierës është i centralizuar në qendrat e mëdha urbane, duke krijuar hendeqe masive rajonale të mundësive për të rinjtë në gjithë Shqipërinë dhe duke nxitur emigrimin e talenteve (brain drain).',
    methodology: 'Zgjidhja me AI',
    methodologyText:
      'Busulla Digjitale demokratizon zhvillimin profesional duke kombinuar vlerësimin me modele gjuhësore multimodale, intervista simulate të automatizuara dhe hartografim ekonomik rajonal të përshtatur me tregun shqiptar.',
    team: 'Motori i Gjithëpërfshirjes',
    teamText:
      'Një shtresë e specializuar transkriptimi me Web Speech API mbështet aksesueshmërinë për vështirësi motorike dhe ankth, së bashku me një Modalitet Gjithëpërfshirës që heq zhargonin e paqartë korporativ dhe ristrukturon pyetjet e intervistës në etapa të qarta të metodës STAR për nxënësit në spektrin autik.',
    tech: 'Teknologjia',
    techText:
      'React + TypeScript + Vite + Google Gemini 2.0. Klasifikim lokal vektorial (Holland RIASEC) i pasuruar me AI gjenerativ, me një shtresë inferencë të gatshme për OpenVINO për zbatim në klasa me brez të ulët brezpe.',
  },
  stats: {
    title: 'Busulla është përdorur nga',
    students: 'studentë',
    topCareers: 'Karrierat më të sugjeruara:',
  },
  nav: {
    about: 'Rreth',
    restart: 'RIFILLO',
    languageToggle: 'EN / AL',
  },
};

// -----------------------------------------------------------------------------
// Language state — mutable module var + Proxy exports so all `TRANSLATIONS.foo`
// references resolve to the currently active dictionary at read time. React
// components subscribe via `useLanguage()` and re-render on toggle.
// -----------------------------------------------------------------------------

export type Language = 'en' | 'al';
const STORAGE_KEY = 'busulla-language';

let _lang: Language =
  (typeof window !== 'undefined' && (localStorage.getItem(STORAGE_KEY) as Language)) || 'en';

const listeners = new Set<() => void>();

export const setLanguage = (l: Language) => {
  if (l === _lang) return;
  _lang = l;
  try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  listeners.forEach(fn => fn());
};

export const getLanguage = (): Language => _lang;

export const useLanguage = (): { lang: Language; setLang: (l: Language) => void } => {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick(x => x + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return { lang: _lang, setLang: setLanguage };
};

const currentDict = (): Dict => (_lang === 'en' ? EN_DICT : AL_DICT);

// Deep proxy — every nested access reads from the CURRENT dictionary.
function makeDeepProxy<T extends object>(getRoot: () => any, path: string[] = []): T {
  return new Proxy({} as any, {
    get(_t, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;
      // Traverse into current dict along the path + prop
      let val: any = getRoot();
      for (const p of path) val = val?.[p];
      const next = val?.[prop];
      if (next && typeof next === 'object' && !Array.isArray(next)) {
        return makeDeepProxy(getRoot, [...path, prop]);
      }
      return next;
    },
    has(_t, prop) {
      let val: any = getRoot();
      for (const p of path) val = val?.[p];
      return prop in (val ?? {});
    },
    ownKeys() {
      let val: any = getRoot();
      for (const p of path) val = val?.[p];
      return Object.keys(val ?? {});
    },
    getOwnPropertyDescriptor(_t, prop) {
      let val: any = getRoot();
      for (const p of path) val = val?.[p];
      if (val && prop in val) {
        return { configurable: true, enumerable: true, value: val[prop as any] };
      }
      return undefined;
    },
  }) as T;
}

export const TRANSLATIONS = makeDeepProxy<Dict>(currentDict);

// -----------------------------------------------------------------------------
// Quiz questions & quick actions — bilingual arrays behind the same Proxy trick
// -----------------------------------------------------------------------------

const QUIZ_EN: QuizQuestion[] = [
  { id: 1, text: 'How do you prefer to work during the day?', category: 'Environment', options: [
    'Alone, in a quiet and focused environment',
    'On a team, with constant collaboration',
    'Hybrid — a balance of solo and group time',
    'Constantly on the move, meeting new people',
  ]},
  { id: 2, text: 'What motivates you most in a project?', category: 'Motivation', options: [
    'Solving complex technical problems',
    'Creating something visual and artistic',
    'Directly helping other people',
    'Hitting financial goals and growing a business',
  ]},
  { id: 3, text: 'How do you react to unexpected situations?', category: 'Crisis management', options: [
    'I analyze the data and find a logical solution',
    'I use intuition and creativity to improvise',
    'I ask the team for help and delegate tasks',
    'I stay calm and follow pre-defined procedures',
  ]},
  { id: 4, text: 'Which of these skills do you consider your strongest?', category: 'Skills', options: [
    'Analytical thinking and mathematics',
    'Communication and persuasion',
    'Design and aesthetics',
    'Organization and time management',
  ]},
  { id: 5, text: 'In what kind of environment are you most productive?', category: 'Environment', options: [
    'A modern corporate office',
    'A creative studio or workshop',
    'In the field (outside an office)',
    'From home or a co-working space',
  ]},
  { id: 6, text: 'How important is innovation to you at work?', category: 'Innovation', options: [
    'Essential — I want to work with cutting-edge technology',
    'Important, but stability comes first',
    'Moderate — I prefer proven methods',
    "It doesn't matter, as long as the work has impact",
  ]},
  { id: 7, text: 'How would you describe your learning style?', category: 'Learning', options: [
    'I learn by reading and studying theory',
    'I learn by doing (hands-on)',
    'I learn through discussions with others',
    'I learn through videos and visuals',
  ]},
  { id: 8, text: 'What is your main goal in the next 5 years?', category: 'Goals', options: [
    'To become an expert in a narrow field',
    'To manage a large team of people',
    'To start my own business',
    'To contribute to a social cause',
  ]},
  { id: 9, text: 'How do you manage stress at work?', category: 'Stress', options: [
    'By focusing fully on the work until it is done',
    'By taking short breaks and chatting with colleagues',
    'By meditating or doing physical activity',
    'By asking for input and support',
  ]},
  { id: 10, text: 'Which field would you find most interesting to study?', category: 'Interests', options: [
    'Computer science and AI',
    'Psychology and social sciences',
    'Management and economics',
    'Medicine and life sciences',
  ]},
];

const QUIZ_AL: QuizQuestion[] = [
  { id: 1, text: 'Si preferoni të punoni gjatë ditës?', category: 'Mjedisi', options: [
    'Vetëm, në një mjedis të qetë dhe të fokusuar',
    'Në ekip, me bashkëpunim të vazhdueshëm',
    'Hibrid - kohë të balancuar vetëm dhe në grup',
    'Në lëvizje të vazhdueshme dhe me njerëz të rinj',
  ]},
  { id: 2, text: 'Çfarë ju motivon më shumë në një projekt?', category: 'Motivimi', options: [
    'Zgjidhja e problemeve komplekse teknike',
    'Krijimi i diçkaje vizuale dhe artistike',
    'Ndihma direkte për njerëzit e tjerë',
    'Arritja e objektivave financiare dhe rritja e biznesit',
  ]},
  { id: 3, text: 'Si reagoni ndaj situatave të paparashikuara?', category: 'Menaxhimi i krizës', options: [
    'Analizoj të dhënat dhe gjej një zgjidhje logjike',
    'Përdor intuitën dhe kreativitetin për të improvizuar',
    'Kërkoj ndihmë nga ekipi dhe delegoj detyrat',
    'Qëndroj i qetë dhe ndjek procedurat e paracaktuara',
  ]},
  { id: 4, text: 'Cila nga këto aftësi mendoni se është pika juaj më e fortë?', category: 'Aftësitë', options: [
    'Mendimi analitik dhe matematika',
    'Komunikimi dhe bindja e të tjerëve',
    'Dizajni dhe estetika',
    'Organizimi dhe menaxhimi i kohës',
  ]},
  { id: 5, text: 'Në çfarë lloj mjedisi ndiheni më produktiv?', category: 'Mjedisi', options: [
    'Një zyrë moderne korporative',
    'Një studio krijuese ose punishte',
    'Në terren (jashtë zyrës)',
    'Nga shtëpia ose hapësira bashkëpunuese',
  ]},
  { id: 6, text: 'Sa rëndësi ka inovacioni për ju në punë?', category: 'Inovacioni', options: [
    'Thelbësore, dua të punoj me teknologjinë e fundit',
    'E rëndësishme, por stabiliteti vjen i pari',
    'Mesatare, preferoj metodat e provuara',
    'Nuk ka rëndësi, për sa kohë puna ka impakt',
  ]},
  { id: 7, text: 'Si do ta përshkruanit stilin tuaj të mësimit?', category: 'Të mësuarit', options: [
    'Mësoj duke lexuar dhe studiuar teori',
    'Mësoj duke vepruar (praktikisht)',
    'Mësoj përmes diskutimeve me të tjerët',
    'Mësoj përmes videove dhe ilustrimeve',
  ]},
  { id: 8, text: 'Cili është qëllimi juaj kryesor në 5 vitet e ardhshme?', category: 'Qëllimet', options: [
    'Të bëhem ekspert në një fushë të ngushtë',
    'Të menaxhoj një ekip të madh njerëzish',
    'Të hap biznesin tim personal',
    'Të kontribuoj në një kauzë sociale',
  ]},
  { id: 9, text: 'Si e menaxhoni stresin në punë?', category: 'Stresi', options: [
    'Duke u fokusuar plotësisht te puna deri në fund',
    'Duke bërë pushime të shkurtra dhe biseduar me koleget',
    'Duke medituar ose bërë aktivitet fizik',
    'Duke kërkuar mendime dhe mbështetje',
  ]},
  { id: 10, text: 'Cila fushë ju duket më interesante për të studiuar?', category: 'Interesat', options: [
    'Shkencat kompjuterike dhe AI',
    'Psikologjia dhe shkencat sociale',
    'Menaxhimi dhe ekonomia',
    'Mjekësia dhe shkencat e jetës',
  ]},
];

const currentQuiz = (): QuizQuestion[] => (_lang === 'en' ? QUIZ_EN : QUIZ_AL);

export const QUIZ_QUESTIONS: QuizQuestion[] = new Proxy([] as QuizQuestion[], {
  get(_t, prop) {
    const arr = currentQuiz();
    const val: any = (arr as any)[prop];
    return typeof val === 'function' ? val.bind(arr) : val;
  },
  has(_t, prop) { return prop in currentQuiz(); },
  ownKeys() { return Reflect.ownKeys(currentQuiz()); },
  getOwnPropertyDescriptor(_t, prop) {
    return Object.getOwnPropertyDescriptor(currentQuiz(), prop);
  },
}) as QuizQuestion[];

const QA_EN: QuickAction[] = [
  { id: 'career-match', label: 'Best-fit career', icon: 'career', prompt: 'Which career would suit me best?' },
  { id: 'university-prep', label: 'University prep', icon: 'university', prompt: 'How should I prepare for university?' },
  { id: 'job-market', label: 'Job market', icon: 'market', prompt: 'What are the most in-demand jobs in Albania?' },
];
const QA_AL: QuickAction[] = [
  { id: 'career-match', label: 'Karrierë e përshtatshme', icon: 'career', prompt: 'Çfarë karriere më përshtatet?' },
  { id: 'university-prep', label: 'Përgatitje për universitet', icon: 'university', prompt: 'Si të përgatitem për universitet?' },
  { id: 'job-market', label: 'Tregu i punës', icon: 'market', prompt: 'Cilat janë punët më të kërkuara në Shqipëri?' },
];
const currentQA = (): QuickAction[] => (_lang === 'en' ? QA_EN : QA_AL);

export const QUICK_ACTIONS: QuickAction[] = new Proxy([] as QuickAction[], {
  get(_t, prop) {
    const arr = currentQA();
    const val: any = (arr as any)[prop];
    return typeof val === 'function' ? val.bind(arr) : val;
  },
  has(_t, prop) { return prop in currentQA(); },
  ownKeys() { return Reflect.ownKeys(currentQA()); },
  getOwnPropertyDescriptor(_t, prop) {
    return Object.getOwnPropertyDescriptor(currentQA(), prop);
  },
}) as QuickAction[];

// Mode / difficulty info — these read TRANSLATIONS (already a Proxy) via getters
export const INTERVIEW_MODE_INFO = {
  [InterviewMode.TECHNICAL]: {
    get name() { return TRANSLATIONS.interviewSetup.modes.technical.name; },
    get description() { return TRANSLATIONS.interviewSetup.modes.technical.description; },
    icon: 'technical',
  },
  [InterviewMode.BEHAVIORAL]: {
    get name() { return TRANSLATIONS.interviewSetup.modes.behavioral.name; },
    get description() { return TRANSLATIONS.interviewSetup.modes.behavioral.description; },
    icon: 'behavioral',
  },
  [InterviewMode.MIXED]: {
    get name() { return TRANSLATIONS.interviewSetup.modes.mixed.name; },
    get description() { return TRANSLATIONS.interviewSetup.modes.mixed.description; },
    icon: 'mixed',
  },
  [InterviewMode.STRESS]: {
    get name() { return TRANSLATIONS.interviewSetup.modes.stress.name; },
    get description() { return TRANSLATIONS.interviewSetup.modes.stress.description; },
    icon: 'stress',
  },
};

export const DIFFICULTY_INFO = {
  [DifficultyLevel.EASY]: {
    get name() { return TRANSLATIONS.interviewSetup.difficulties.easy.name; },
    get description() { return TRANSLATIONS.interviewSetup.difficulties.easy.description; },
    color: 'text-success', bgColor: 'bg-success/10', borderColor: 'border-success/30',
  },
  [DifficultyLevel.MEDIUM]: {
    get name() { return TRANSLATIONS.interviewSetup.difficulties.medium.name; },
    get description() { return TRANSLATIONS.interviewSetup.difficulties.medium.description; },
    color: 'text-warning', bgColor: 'bg-warning/10', borderColor: 'border-warning/30',
  },
  [DifficultyLevel.HARD]: {
    get name() { return TRANSLATIONS.interviewSetup.difficulties.hard.name; },
    get description() { return TRANSLATIONS.interviewSetup.difficulties.hard.description; },
    color: 'text-destructive', bgColor: 'bg-destructive/10', borderColor: 'border-destructive/30',
  },
};
