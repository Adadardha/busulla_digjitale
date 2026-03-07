import { QuizAnswer, PredictionResult } from '../types';

const TRAITS = [
  'analitik', 'krijues', 'social', 'organizues', 'teknik',
  'sipërmarrës', 'kujdesar', 'lider', 'hulumtues', 'vizual',
] as const;

type Trait = typeof TRAITS[number];
type TraitVector = Record<Trait, number>;

function zeroVector(): TraitVector {
  return Object.fromEntries(TRAITS.map(t => [t, 0])) as TraitVector;
}

function addVec(a: TraitVector, b: Partial<TraitVector>): void {
  for (const t of TRAITS) {
    if (b[t] !== undefined) a[t] += b[t]!;
  }
}

function magnitude(v: TraitVector): number {
  return Math.sqrt(TRAITS.reduce((s, t) => s + v[t] ** 2, 0));
}

function cosine(a: TraitVector, b: TraitVector): number {
  const dot = TRAITS.reduce((s, t) => s + a[t] * b[t], 0);
  const mag = magnitude(a) * magnitude(b);
  return mag === 0 ? 0 : dot / mag;
}

const OPTION_TRAITS: Array<[string, Partial<TraitVector>]> = [
  ['vetëm, në një mjedis',        { analitik: 2, teknik: 1, hulumtues: 1 }],
  ['në ekip, me bashkëpunim',     { social: 2, lider: 1, organizues: 1 }],
  ['hibrid',                       { organizues: 1, social: 1, analitik: 1 }],
  ['në lëvizje të vazhdueshme',   { social: 2, sipërmarrës: 1, kujdesar: 1 }],
  ['zgjidhja e problemeve komplekse', { analitik: 3, teknik: 2, hulumtues: 1 }],
  ['krijimi i diçkaje vizuale',        { krijues: 3, vizual: 2 }],
  ['ndihma direkte për njerëzit',      { kujdesar: 3, social: 2 }],
  ['arritja e objektivave financiare', { sipërmarrës: 3, lider: 1, organizues: 1 }],
  ['analizoj të dhënat',           { analitik: 3, teknik: 1, hulumtues: 1 }],
  ['intuitën dhe kreativitetin',   { krijues: 2, vizual: 1, sipërmarrës: 1 }],
  ['kërkoj ndihmë nga ekipi',      { social: 2, lider: 2, organizues: 1 }],
  ['qëndroj i qetë dhe ndjek',     { organizues: 3, kujdesar: 1 }],
  ['mendimi analitik dhe matematika', { analitik: 3, teknik: 2, hulumtues: 1 }],
  ['komunikimi dhe bindja',           { social: 3, lider: 2, sipërmarrës: 1 }],
  ['dizajni dhe estetika',            { vizual: 3, krijues: 3 }],
  ['organizimi dhe menaxhimi',        { organizues: 3, lider: 2 }],
  ['zyrë moderne korporative',        { organizues: 2, lider: 1, sipërmarrës: 1 }],
  ['studio krijuese',                 { krijues: 3, vizual: 2 }],
  ['në terren (jashtë',               { social: 2, kujdesar: 2, sipërmarrës: 1 }],
  ['shtëpia ose hapësira bashkëpunuese', { analitik: 1, teknik: 1, hulumtues: 1 }],
  ['thelbësore, dua të punoj me teknologjinë', { teknik: 3, hulumtues: 2, analitik: 1 }],
  ['e rëndësishme, por stabiliteti',            { organizues: 2, analitik: 1 }],
  ['mesatare, preferoj metodat',                { organizues: 2, kujdesar: 1 }],
  ['nuk ka rëndësi, për sa kohë',               { kujdesar: 2, social: 2 }],
  ['mësoj duke lexuar dhe studiuar', { analitik: 2, hulumtues: 2, teknik: 1 }],
  ['mësoj duke vepruar',             { teknik: 2, sipërmarrës: 1, krijues: 1 }],
  ['mësoj përmes diskutimeve',       { social: 3, lider: 1 }],
  ['mësoj përmes videove dhe ilustrimeve', { vizual: 2, krijues: 1 }],
  ['të bëhem ekspert',         { analitik: 2, teknik: 2, hulumtues: 2 }],
  ['të menaxhoj një ekip',     { lider: 3, organizues: 2, social: 1 }],
  ['të hap biznesin',          { sipërmarrës: 3, lider: 2, krijues: 1 }],
  ['të kontribuoj në një kauzë sociale', { kujdesar: 3, social: 2 }],
  ['duke u fokusuar plotësisht', { analitik: 2, teknik: 1, organizues: 1 }],
  ['duke bërë pushime të shkurtra dhe biseduar', { social: 2, kujdesar: 1 }],
  ['duke medituar ose bërë aktivitet fizik',      { kujdesar: 2, organizues: 1 }],
  ['duke kërkuar feedback dhe mbështetje',        { social: 2, lider: 1, hulumtues: 1 }],
  ['shkencat kompjuterike dhe ai', { teknik: 3, analitik: 2, hulumtues: 2 }],
  ['psikologjia dhe shkencat sociale', { social: 3, kujdesar: 2, hulumtues: 1 }],
  ['menaxhimi dhe ekonomia',          { sipërmarrës: 3, lider: 2, organizues: 1 }],
  ['mjekësia dhe shkencat e jetës',   { kujdesar: 3, hulumtues: 2, analitik: 1 }],
];

interface CareerProfile {
  name: string;
  traits: Partial<TraitVector>;
  description: string;
  learningPath: string[];
}

const CAREER_PROFILES: CareerProfile[] = [
  {
    name: 'Zhvillues Software',
    traits: { analitik: 3, teknik: 3, hulumtues: 2, organizues: 1 },
    description: 'Ndërtoni aplikacione dhe sisteme softuerike, duke zgjidhur probleme komplekse teknike çdo ditë.',
    learningPath: [
      'Mësoni bazat e programimit (Python ose JavaScript)',
      'Studioni strukturat e të dhënave dhe algoritmet',
      'Ndërtoni projekte personale dhe kontribuoni në open-source',
      'Fitoni përvojë me cloud (AWS/GCP) dhe DevOps',
      'Aplikoni për role junior developer dhe ndërtoni portfolio',
    ],
  },
  {
    name: 'Shkencëtar të Dhënash',
    traits: { analitik: 3, teknik: 2, hulumtues: 3, vizual: 1 },
    description: 'Analizoni grumbuj të mëdhenj të dhënash, krijoni modele ML dhe nxirrni insight-e që drejtojnë vendimet e biznesit.',
    learningPath: [
      'Forconi bazat e statistikës dhe matematikës',
      'Mësoni Python (pandas, scikit-learn, PyTorch)',
      'Praktikoni me dataset-e reale në Kaggle',
      'Studioni machine learning dhe deep learning',
      'Ndërtoni portfolio me projekte analize dhe parashikim',
    ],
  },
  {
    name: 'Dizajner UX/UI',
    traits: { vizual: 3, krijues: 3, social: 2, analitik: 1 },
    description: 'Krijoni eksperienca digjitale intuitive dhe estetikisht tërheqëse duke vendosur përdoruesin në qendër.',
    learningPath: [
      'Mësoni parimet e dizajnit dhe tipografisë',
      'Zotëroni Figma dhe mjete prototipimi',
      'Studioni user research dhe metodologjitë UX',
      'Ndërtoni case study-et e forta dizajni',
      'Aplikoni në studio dizajni ose agjenci digjitale',
    ],
  },
  {
    name: 'Menaxher Projekti',
    traits: { organizues: 3, lider: 3, social: 2, sipërmarrës: 1 },
    description: 'Koordinoni ekipe, burime dhe afate për të dorëzuar projekte me sukses brenda buxhetit dhe kohës.',
    learningPath: [
      'Fitoni certifikimin PMP ose PRINCE2',
      'Mësoni metodologjitë Agile dhe Scrum',
      'Zhvilloni aftësi komunikimi dhe negocimi',
      'Praktikoni me mjete si Jira, Asana dhe MS Project',
      'Ndërtoni përvojë duke menaxhuar projekte të vogla',
    ],
  },
  {
    name: 'Sipërmarrës / Themelues Startup',
    traits: { sipërmarrës: 3, lider: 2, krijues: 2, social: 1 },
    description: 'Ndërtoni biznesin tuaj nga zero, duke identifikuar mundësi tregu dhe duke krijuar produkte ose shërbime novatore.',
    learningPath: [
      'Studioni modelet e biznesit dhe Lean Startup',
      'Mësoni bazat e financave dhe menaxhimit financiar',
      'Ndërtoni rrjetin tuaj profesional',
      'Fitoni përvojë praktike në startup-e ekzistuese',
      'Zhvilloni MVP-në tuaj të parë dhe testoni me treg',
    ],
  },
  {
    name: 'Psikolog / Këshilltar',
    traits: { kujdesar: 3, social: 3, hulumtues: 1, analitik: 1 },
    description: 'Ndihmoni individë dhe grupe të kapërcejnë sfidat emocionale dhe psikologjike për një jetë më të mirë.',
    learningPath: [
      'Studioni psikologjinë klinike ose këshillimin',
      'Fitoni licencën profesionale të psikologut',
      'Kryeni praktikë klinike të mbikëqyrur',
      'Specializohuni (terapia CBT, çiftet, fëmijët)',
      'Ndërtoni praktikën private ose bashkohuni me klinikë',
    ],
  },
  {
    name: 'Mjek / Profesionist Shëndetësor',
    traits: { kujdesar: 3, hulumtues: 2, analitik: 2, organizues: 1 },
    description: 'Diagnostikoni dhe trajtoni sëmundjet, duke kombinuar njohuritë shkencore me kujdesin human për pacientët.',
    learningPath: [
      'Kryeni studimet e mjekësisë (6 vjet)',
      'Kryeni rezidencën në specialitetin e zgjedhur',
      'Merrni licencën e ushtrimit të mjekësisë',
      'Specializohuni dhe ndiqni edukimin e vazhdueshëm',
      'Konsideroni kërkimin shkencor ose diplomacinë shëndetësore',
    ],
  },
  {
    name: 'Menaxher Marketingu',
    traits: { social: 2, krijues: 2, sipërmarrës: 2, analitik: 1, vizual: 1 },
    description: 'Zhvilloni strategji marketingu, ndërtoni brande dhe drejtoni fushatat që rrisin biznesin.',
    learningPath: [
      'Studioni marketingun digjital dhe traditional',
      'Mësoni SEO, SEM, social media dhe email marketing',
      'Zotëroni mjete analitike (Google Analytics, Meta Ads)',
      'Ndërtoni portfolio me fushata reale',
      'Fitoni certifikime Google, HubSpot ose Meta',
    ],
  },
  {
    name: 'Inxhinier / Arkitekt',
    traits: { teknik: 3, analitik: 2, organizues: 2, vizual: 1 },
    description: 'Projektoni dhe ndërtoni infrastruktura, ndërtesa ose sisteme inxhinierike që formësojnë botën fizike.',
    learningPath: [
      'Studioni inxhinierinë ose arkitekturën (5 vjet)',
      'Zotëroni softuerin CAD/BIM (AutoCAD, Revit)',
      'Fitoni licencën profesionale të inxhinierit',
      'Ndërtoni portofolin me projekte të ndryshme',
      'Specializohuni në fushën e preferuar (civile, elektrike, mekanike)',
    ],
  },
  {
    name: 'Mësues / Trajner',
    traits: { social: 3, kujdesar: 2, organizues: 1, hulumtues: 1, lider: 1 },
    description: 'Transmetoni njohuri dhe aftësi, duke inspiruar dhe aftësuar brezat e ardhshëm ose profesionistët.',
    learningPath: [
      'Studioni pedagogjinë ose fushën e specializimit',
      'Fitoni diplomën e mësimdhënies ose certifikimin e trajnerëve',
      'Zhvilloni kurrikula dhe materiale mësimore',
      'Eksperimentoni me metodologji mësimore inovative',
      'Konsideroni platformat e mësimit online (Udemy, Coursera)',
    ],
  },
];

function encodeAnswers(answers: QuizAnswer[]): TraitVector {
  const vec = zeroVector();
  for (const ans of answers) {
    const lower = ans.answer.toLowerCase();
    for (const [key, traits] of OPTION_TRAITS) {
      if (lower.includes(key)) {
        addVec(vec, traits);
        break;
      }
    }
    if (ans.isCustom) {
      addVec(vec, { hulumtues: 1, sipërmarrës: 1 });
    }
  }
  return vec;
}

function profileToVector(profile: CareerProfile): TraitVector {
  const vec = zeroVector();
  addVec(vec, profile.traits);
  return vec;
}

export interface ClassifierResult {
  career: string;
  score: number;
  confidence: number;
  description: string;
  learningPath: string[];
}

export function classifyCareer(answers: QuizAnswer[]): ClassifierResult[] {
  const userVec = encodeAnswers(answers);

  const scored = CAREER_PROFILES.map(profile => ({
    profile,
    score: cosine(userVec, profileToVector(profile)),
  })).sort((a, b) => b.score - a.score);

  const topScore = scored[0].score || 1;

  return scored.map(({ profile, score }) => ({
    career: profile.name,
    score,
    confidence: score / topScore,
    description: profile.description,
    learningPath: profile.learningPath,
  }));
}

export function classifyToPrediction(answers: QuizAnswer[]): PredictionResult {
  const ranked = classifyCareer(answers);
  const [first, second, third] = ranked;

  const rawConfidence = first.score;
  const normalised = Math.min(0.97, Math.max(0.52, 0.52 + rawConfidence * 0.48));

  return {
    primaryCareer: first.career,
    confidence: parseFloat(normalised.toFixed(2)),
    description: first.description,
    alternatives: [
      {
        career: second.career,
        confidence: parseFloat((normalised * (second.score / first.score)).toFixed(2)),
        description: second.description,
      },
      {
        career: third.career,
        confidence: parseFloat((normalised * (third.score / first.score)).toFixed(2)),
        description: third.description,
      },
    ],
    learningPath: first.learningPath,
  };
}
