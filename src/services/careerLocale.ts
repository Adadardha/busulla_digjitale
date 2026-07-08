/**
 * Career localization layer — maps the canonical (Albanian) career strings
 * produced by the local classifier and cached roadmap fallbacks to their
 * English equivalents. Consumed by Results and the roadmap service so that
 * the EN/AL toggle localizes ACTUAL data rows, not only page chrome.
 */
import type { Language } from '../i18n';
import type { CareerRoadmap, PredictionResult, AlternativeCareer } from '../types';

type Bi = { en: string; al: string };

// Career name map (AL → EN). AL is the canonical key used everywhere else.
const CAREER_NAME: Record<string, string> = {
  'Zhvillues Software': 'Software Developer',
  'Shkencëtar të Dhënash': 'Data Scientist',
  'Dizajner UX/UI': 'UX/UI Designer',
  'Menaxher Projekti': 'Project Manager',
  'Sipërmarrës / Themelues Startup': 'Entrepreneur / Startup Founder',
  'Psikolog / Këshilltar': 'Psychologist / Counselor',
  'Mjek / Profesionist Shëndetësor': 'Doctor / Healthcare Professional',
  'Menaxher Marketingu': 'Marketing Manager',
  'Inxhinier / Arkitekt': 'Engineer / Architect',
  'Mësues / Trajner': 'Teacher / Trainer',
};

// Description map (AL description → EN description).
const CAREER_DESC: Record<string, string> = {
  'Ndërtoni aplikacione dhe sisteme softuerike, duke zgjidhur probleme komplekse teknike çdo ditë.':
    'Build software applications and systems, solving complex technical problems every day.',
  'Analizoni grumbuj të mëdhenj të dhënash, krijoni modele ML dhe nxirrni insight-e që drejtojnë vendimet e biznesit.':
    'Analyze large datasets, build ML models, and extract insights that drive business decisions.',
  'Krijoni eksperienca digjitale intuitive dhe estetikisht tërheqëse duke vendosur përdoruesin në qendër.':
    'Create intuitive, aesthetically compelling digital experiences with the user at the center.',
  'Koordinoni ekipe, burime dhe afate për të dorëzuar projekte me sukses brenda buxhetit dhe kohës.':
    'Coordinate teams, resources, and deadlines to deliver projects successfully on budget and on time.',
  'Ndërtoni biznesin tuaj nga zero, duke identifikuar mundësi tregu dhe duke krijuar produkte ose shërbime novatore.':
    'Build your own business from scratch — identify market opportunities and launch innovative products or services.',
  'Ndihmoni individë dhe grupe të kapërcejnë sfidat emocionale dhe psikologjike për një jetë më të mirë.':
    'Help individuals and groups overcome emotional and psychological challenges to lead better lives.',
  'Diagnostikoni dhe trajtoni sëmundjet, duke kombinuar njohuritë shkencore me kujdesin human për pacientët.':
    'Diagnose and treat illnesses, combining scientific expertise with human care for patients.',
  'Zhvilloni strategji marketingu, ndërtoni brande dhe drejtoni fushatat që rrisin biznesin.':
    'Develop marketing strategy, build brands, and lead campaigns that grow the business.',
  'Projektoni dhe ndërtoni infrastruktura, ndërtesa ose sisteme inxhinierike që formësojnë botën fizike.':
    'Design and build infrastructure, buildings, and engineering systems that shape the physical world.',
  'Transmetoni njohuri dhe aftësi, duke inspiruar dhe aftësuar brezat e ardhshëm ose profesionistët.':
    'Pass on knowledge and skills, inspiring and empowering the next generation of learners and professionals.',
};

// Learning-path step map — the classifier's 5-step arrays localized 1:1.
const LEARNING_PATH: Record<string, string> = {
  'Mësoni bazat e programimit (Python ose JavaScript)': 'Master programming fundamentals (Python or JavaScript)',
  'Studioni strukturat e të dhënave dhe algoritmet': 'Study data structures and algorithms',
  'Ndërtoni projekte personale dhe kontribuoni në open-source': 'Build personal projects and contribute to open-source',
  'Fitoni përvojë me cloud (AWS/GCP) dhe DevOps': 'Gain experience with cloud (AWS/GCP) and DevOps',
  'Aplikoni për role junior developer dhe ndërtoni portfolio': 'Apply for junior developer roles and build a portfolio',

  'Forconi bazat e statistikës dhe matematikës': 'Strengthen your statistics and mathematics foundations',
  'Mësoni Python (pandas, scikit-learn, PyTorch)': 'Learn Python (pandas, scikit-learn, PyTorch)',
  'Praktikoni me dataset-e reale në Kaggle': 'Practice with real datasets on Kaggle',
  'Studioni machine learning dhe deep learning': 'Study machine learning and deep learning',
  'Ndërtoni portfolio me projekte analize dhe parashikim': 'Build a portfolio of analysis and prediction projects',

  'Mësoni parimet e dizajnit dhe tipografisë': 'Learn design principles and typography',
  'Zotëroni Figma dhe mjete prototipimi': 'Master Figma and prototyping tools',
  'Studioni user research dhe metodologjitë UX': 'Study user research and UX methodologies',
  'Ndërtoni case study-et e forta dizajni': 'Produce strong design case studies',
  'Aplikoni në studio dizajni ose agjenci digjitale': 'Apply to design studios or digital agencies',

  'Fitoni certifikimin PMP ose PRINCE2': 'Earn PMP or PRINCE2 certification',
  'Mësoni metodologjitë Agile dhe Scrum': 'Learn Agile and Scrum methodologies',
  'Zhvilloni aftësi komunikimi dhe negocimi': 'Develop communication and negotiation skills',
  'Praktikoni me mjete si Jira, Asana dhe MS Project': 'Practice with tools like Jira, Asana, and MS Project',
  'Ndërtoni përvojë duke menaxhuar projekte të vogla': 'Build experience by managing small projects',

  'Studioni modelet e biznesit dhe Lean Startup': 'Study business models and Lean Startup',
  'Mësoni bazat e financave dhe menaxhimit financiar': 'Learn finance and financial management fundamentals',
  'Ndërtoni rrjetin tuaj profesional': 'Build your professional network',
  'Fitoni përvojë praktike në startup-e ekzistuese': 'Gain hands-on experience at existing startups',
  'Zhvilloni MVP-në tuaj të parë dhe testoni me treg': 'Ship your first MVP and validate it in-market',

  'Studioni psikologjinë klinike ose këshillimin': 'Study clinical psychology or counseling',
  'Fitoni licencën profesionale të psikologut': 'Obtain your professional psychologist license',
  'Kryeni praktikë klinike të mbikëqyrur': 'Complete supervised clinical practice',
  'Specializohuni (terapia CBT, çiftet, fëmijët)': 'Specialize (CBT, couples, children)',
  'Ndërtoni praktikën private ose bashkohuni me klinikë': 'Build a private practice or join a clinic',

  'Kryeni studimet e mjekësisë (6 vjet)': 'Complete medical studies (6 years)',
  'Kryeni rezidencën në specialitetin e zgjedhur': 'Complete residency in your chosen specialty',
  'Merrni licencën e ushtrimit të mjekësisë': 'Obtain your medical practice license',
  'Specializohuni dhe ndiqni edukimin e vazhdueshëm': 'Specialize and pursue continuing education',
  'Konsideroni kërkimin shkencor ose diplomacinë shëndetësore': 'Consider scientific research or health diplomacy',

  'Studioni marketingun digjital dhe traditional': 'Study digital and traditional marketing',
  'Mësoni SEO, SEM, social media dhe email marketing': 'Learn SEO, SEM, social media, and email marketing',
  'Zotëroni mjete analitike (Google Analytics, Meta Ads)': 'Master analytics tools (Google Analytics, Meta Ads)',
  'Ndërtoni portfolio me fushata reale': 'Build a portfolio of real campaigns',
  'Fitoni certifikime Google, HubSpot ose Meta': 'Earn Google, HubSpot, or Meta certifications',

  'Studioni inxhinierinë ose arkitekturën (5 vjet)': 'Study engineering or architecture (5 years)',
  'Zotëroni softuerin CAD/BIM (AutoCAD, Revit)': 'Master CAD/BIM software (AutoCAD, Revit)',
  'Fitoni licencën profesionale të inxhinierit': 'Earn your professional engineer license',
  'Ndërtoni portofolin me projekte të ndryshme': 'Build a portfolio spanning diverse projects',
  'Specializohuni në fushën e preferuar (civile, elektrike, mekanike)':
    'Specialize in your preferred field (civil, electrical, mechanical)',

  'Studioni pedagogjinë ose fushën e specializimit': 'Study pedagogy or your subject specialization',
  'Fitoni diplomën e mësimdhënies ose certifikimin e trajnerëve': 'Earn a teaching degree or trainer certification',
  'Zhvilloni kurrikula dhe materiale mësimore': 'Develop curricula and teaching materials',
  'Eksperimentoni me metodologji mësimore inovative': 'Experiment with innovative teaching methodologies',
  'Konsideroni platformat e mësimit online (Udemy, Coursera)': 'Consider online learning platforms (Udemy, Coursera)',
};

// Roadmap-level strings: subjects, career-path steps, salary/demand phrasing.
const ROADMAP_STR: Record<string, string> = {
  // Subjects
  'Matematikë': 'Mathematics',
  'Informatikë': 'Computer Science',
  'Fizikë': 'Physics',
  'Logjikë': 'Logic',
  'Anglisht': 'English',
  'Statistikë': 'Statistics',
  'Art': 'Art',
  'Psikologji': 'Psychology',
  'Ekonomi': 'Economics',
  'Gjuhë Shqipe': 'Albanian Language',
  'Histori': 'History',
  'Biologji': 'Biology',
  'Sociologji': 'Sociology',
  'Filozofi': 'Philosophy',
  'Kimi': 'Chemistry',
  'Vizatim Teknik': 'Technical Drawing',
  'Pedagogji': 'Pedagogy',
  // Career-path steps (partial — most useful ones)
  'Studime Bachelor Informatikë': 'Computer Science bachelor studies',
  'Praktikë në kompani tech': 'Internship at a tech company',
  'Junior Developer': 'Junior Developer',
  'Mid-level Developer': 'Mid-level Developer',
  'Senior / Tech Lead': 'Senior / Tech Lead',
  'Bachelor Matematikë/Informatikë': 'Bachelor in Mathematics / Computer Science',
  'Certifikime ML/AI': 'ML / AI certifications',
  'Data Analyst Junior': 'Junior Data Analyst',
  'Data Scientist': 'Data Scientist',
  'Lead Data Scientist': 'Lead Data Scientist',
  'Bachelor Dizajn/Arteve': 'Bachelor in Design / Arts',
  'Portfolio personale': 'Personal portfolio',
  'Junior Designer': 'Junior Designer',
  'UI/UX Designer': 'UI/UX Designer',
  'Lead Designer / Art Director': 'Lead Designer / Art Director',
  'Bachelor Ekonomi/Biznes': 'Bachelor in Economics / Business',
  'Asistent Projekti': 'Project Assistant',
  'Koordinator': 'Coordinator',
  'Project Manager': 'Project Manager',
  'Senior PM / Drejtues': 'Senior PM / Director',
  'Bachelor Biznes/Ekonomi': 'Bachelor in Business / Economics',
  'Përvojë në startup': 'Startup experience',
  'Biznes i vogël': 'Small business',
  'Startup me financim': 'Funded startup',
  'Kompani e qëndrueshme': 'Sustainable company',
  'Bachelor Psikologji': 'Bachelor in Psychology',
  'Master Klinik': 'Clinical Master\'s',
  'Praktikë e mbikëqyrur': 'Supervised practice',
  'Psikolog i licencuar': 'Licensed psychologist',
  'Praktikë private': 'Private practice',
  'Fakulteti i Mjekësisë (6 vjet)': 'Faculty of Medicine (6 years)',
  'Rezidencë (3-5 vjet)': 'Residency (3–5 years)',
  'Mjek i licencuar': 'Licensed physician',
  'Specializim': 'Specialization',
  'Mjek Specialist': 'Specialist physician',
  'Bachelor Marketing/Ekonomi': 'Bachelor in Marketing / Economics',
  'Asistent Marketing': 'Marketing Assistant',
  'Specialist Digital': 'Digital Specialist',
  'Marketing Manager': 'Marketing Manager',
  'CMO / Drejtues': 'CMO / Director',
  'Bachelor Inxhinieri/Arkitekturë': 'Bachelor in Engineering / Architecture',
  'Praktikë profesionale': 'Professional internship',
  'Inxhinier Junior': 'Junior Engineer',
  'Inxhinier i Licencuar': 'Licensed Engineer',
  'Drejtues Projekti': 'Project Lead',
  'Bachelor Mësuesi': 'Bachelor in Education',
  'Master Profesional': 'Professional Master\'s',
  'Mësues i ri': 'Early-career teacher',
  'Mësues i kualifikuar': 'Qualified teacher',
  'Drejtor/Trajner': 'Principal / Trainer',
  'Studime Bachelor': 'Bachelor studies',
  'Pozicion fillestar': 'Entry-level position',
  'Zhvillim profesional': 'Professional development',
  'Ekspert i fushës': 'Domain expert',
};

// Track-line map (Albanian sentence → English sentence).
const TRACK_LINE: Record<string, string> = {
  'FSHN, Politeknik, UAMD — universitete publike me tarifa të ulëta':
    'FSHN, Polytechnic, UAMD — low-tuition public universities',
  'Kurse falas online: Coursera Financial Aid, edX audit, Google Career Certificates':
    'Free online courses: Coursera Financial Aid, edX audit, Google Career Certificates',
  'Certifikime Microsoft Learn / freeCodeCamp / Meta Front-End (falas)':
    'Microsoft Learn / freeCodeCamp / Meta Front-End certifications (free)',
  'ProCredit Academy dhe kurse të Ministrisë së Shëndetësisë':
    'ProCredit Academy and Ministry of Health courses',
  'Certifikime AKAFP dhe kurse profesionale të AKPA':
    'AKAFP certifications and AKPA professional courses',
  'Programe Erasmus+ dhe shkëmbime studentore për akses ndërkombëtar':
    'Erasmus+ programs and student exchanges for international access',
  'Sektori tech në Tiranë, Durrës dhe Shkodër — Cardo AI, Ikub, Balfin Tech':
    'Tech sector in Tirana, Durrës, and Shkodër — Cardo AI, Ikub, Balfin Tech',
  'Sektor privat në rritje — startup-e në Tiranë, tregtia rajonale në Vlorë/Korçë':
    'Growing private sector — Tirana startups and regional commerce in Vlora / Korça',
  'Qendra shëndetësore rajonale + spitalet universitare në qytetet kryesore':
    'Regional health centers and university hospitals in the major cities',
  'Sektori publik + OJF-të rajonale (Fier, Elbasan, Kukës)':
    'Public sector and regional NGOs (Fier, Elbasan, Kukës)',
  'Punë remote për kompani të BE-së dhe SHBA-së — akses i barabartë nga çdo qytet':
    'Remote work for EU and US companies — equal access from every city',
  'Programe praktike me AmCham Albania, Junior Achievement, Protik Center':
    'Internship programs with AmCham Albania, Junior Achievement, Protik Center',
  'Rrjeti i inkubatorëve: Uplift, Innospace, Yunus Social Business Balkans':
    'Incubator network: Uplift, Innospace, Yunus Social Business Balkans',
  'CodeWeek Albania — hackathon-e vjetore dhe workshop-e falas':
    'CodeWeek Albania — annual hackathons and free workshops',
  'Google Digital Garage — trajnime falas për aftësi digjitale':
    'Google Digital Garage — free digital-skills training',
  'Coursera dhe Khan Academy Shqip — kurse me subtitra në gjuhën shqipe':
    'Coursera and Khan Academy Shqip — courses with Albanian subtitles',
  'Bootcamp-e komunitare: Girls Code Albania, Open Labs Hackerspace':
    'Community bootcamps: Girls Code Albania, Open Labs Hackerspace',
  'Portofoli personal në GitHub/Behance për të treguar punën konkretisht':
    'Personal portfolio on GitHub / Behance to showcase concrete work',
  'Anglishtja në nivel B2+ — obligatore për tregun global remote':
    'English at B2+ level — required for the global remote market',
};

/** Localize an Albanian salary range like "60,000 - 200,000 ALL/muaj". */
function localizeSalary(s: string, lang: Language): string {
  if (lang === 'al') return s;
  return s.replace(/ALL\/muaj/gi, 'ALL/month').replace(/E ndryshueshme/i, 'Variable').replace(/deri/gi, 'up to');
}

/** Localize a demand string. */
function localizeDemand(s: string, lang: Language): string {
  if (lang === 'al') return s;
  // Prefer a full-string translation table first for cleanliness.
  const map: Record<string, string> = {
    'Kërkesë shumë e lartë — tregu shqiptar dhe remote':
      'Very high demand — Albanian and remote markets',
    'Kërkesë në rritje të shpejtë në Shqipëri dhe rajon':
      'Rapidly growing demand in Albania and the region',
    'Kërkesë e mirë veçanërisht për agjenci digjitale':
      'Strong demand, especially at digital agencies',
    'Kërkesë konstante në sektorin publik dhe privat':
      'Steady demand across public and private sectors',
    'Ekosistemi startup shqiptar në zhvillim të shpejtë':
      'The Albanian startup ecosystem is developing rapidly',
    'Kërkesë në rritje — shëndet mendor në fokus':
      'Growing demand — mental health is in focus',
    'Kërkesë konstante dhe e lartë': 'Consistent, high demand',
    'Kërkesë e mirë veçanërisht digital marketing':
      'Strong demand, especially in digital marketing',
    'Kërkesë e qëndrueshme — ndërtim dhe infrastrukturë':
      'Steady demand — construction and infrastructure',
    'Kërkesë konstante — sektor publik dhe privat':
      'Steady demand — public and private sector',
    'Kërkesë e mirë në tregun shqiptar': 'Solid demand in the Albanian market',
  };
  return map[s] || s;
}

/** Look up a translated string; returns the original AL text if no entry exists. */
function look(map: Record<string, string>, s: string, lang: Language): string {
  if (lang === 'al') return s;
  return map[s] || s;
}

export function localizeCareerName(name: string, lang: Language): string {
  return look(CAREER_NAME, name, lang);
}

export function localizeDescription(desc: string, lang: Language): string {
  return look(CAREER_DESC, desc, lang);
}

export function localizePrediction(p: PredictionResult, lang: Language): PredictionResult {
  if (lang === 'al') return p;
  return {
    ...p,
    primaryCareer: localizeCareerName(p.primaryCareer, lang),
    description: localizeDescription(p.description, lang),
    learningPath: (p.learningPath || []).map(step => look(LEARNING_PATH, step, lang)),
    alternatives: (p.alternatives || []).map<AlternativeCareer>(a => ({
      ...a,
      career: localizeCareerName(a.career, lang),
      description: localizeDescription(a.description, lang),
    })),
  };
}

export function localizeRoadmap(r: CareerRoadmap, lang: Language): CareerRoadmap {
  if (lang === 'al') return r;
  return {
    ...r,
    subjects: r.subjects?.map(s => look(ROADMAP_STR, s, lang)),
    // Universities are proper nouns — kept verbatim.
    universities: r.universities,
    careerPath: r.careerPath?.map(s => look(ROADMAP_STR, s, lang)),
    salaryRange: localizeSalary(r.salaryRange, lang),
    jobDemand: localizeDemand(r.jobDemand, lang),
    educationTrack: r.educationTrack?.map(s => look(TRACK_LINE, s, lang)),
    localMarketTrack: r.localMarketTrack?.map(s => look(TRACK_LINE, s, lang)),
    practicalSkillsTrack: r.practicalSkillsTrack?.map(s => look(TRACK_LINE, s, lang)),
  };
}
