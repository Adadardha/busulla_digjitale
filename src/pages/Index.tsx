import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AppState, QuizAnswer, PredictionResult, InterviewMode, DifficultyLevel,
  InterviewSession, InterviewReport as InterviewReportType, ChatSession,
} from '../types';
import { TRANSLATIONS, QUIZ_QUESTIONS, useLanguage } from '../i18n';
import {
  predictCareer, generateDynamicQuestion, evaluateAnswerWithFeedback,
  determineNextDifficulty, generateInterviewReport, getHint,
} from '../services/gemini';
import { classifyCareer } from '../services/classifier';
import { ASCIIHeader, ASCIIGrid, LoadingSpinner, ErrorMessage } from '../components/Decorations';
import Quiz from '../components/quiz/Quiz';
import Results from '../components/results/Results';
import InterviewSetup from '../components/interview/InterviewSetup';
import InterviewSessionComponent from '../components/interview/InterviewSessionComp';
import InterviewReport from '../components/interview/InterviewReport';
import CareerAssistant from '../components/chat/CareerAssistant';
import AboutModal from '../components/about/AboutModal';
import PrivacyGate from '../components/PrivacyGate';
import { recordQuizCompletion } from '../components/UsageStats';
import { Zap } from 'lucide-react';

const CHAT_SESSION_KEY = 'busulla-chat-session';
const PRIVACY_CONSENT_KEY = 'busulla-privacy-consent';
const MAX_QUESTIONS = 7;
const USAGE_KEY = 'busulla-total-users';
const USAGE_BASELINE = 47;
const CHAT_ENABLED = true;

// Interactive compass that follows mouse
const InteractiveCompass: React.FC<{ isRevealing?: boolean }> = ({ isRevealing }) => {
  const [rotation, setRotation] = useState(0);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);
  const animFrameRef = useRef<number>(0);
  const [glowing, setGlowing] = useState(false);
  const [revealPhase, setRevealPhase] = useState<'idle' | 'spinning' | 'locking'>('idle');

  // Mouse tracking for landing page
  useEffect(() => {
    if (isRevealing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
      targetRotation.current = angle;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isRevealing]);

  // Smooth lerp animation
  useEffect(() => {
    if (isRevealing) return;

    const animate = () => {
      const diff = targetRotation.current - currentRotation.current;
      // Normalize to -180..180
      const normalized = ((diff + 540) % 360) - 180;
      currentRotation.current += normalized * 0.06;
      setRotation(currentRotation.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isRevealing]);

  // Career reveal animation
  useEffect(() => {
    if (!isRevealing) {
      setRevealPhase('idle');
      setGlowing(false);
      return;
    }

    setRevealPhase('spinning');
    let spinStart = Date.now();
    let frame: number;

    const spinAnimate = () => {
      const elapsed = Date.now() - spinStart;

      if (elapsed < 1500) {
        // Fast spin phase
        const speed = 15 - (elapsed / 1500) * 12; // decelerate from 15 to 3
        currentRotation.current += speed;
        setRotation(currentRotation.current);
        frame = requestAnimationFrame(spinAnimate);
      } else {
        // Lock phase - snap to north (0)
        setRevealPhase('locking');
        const lockTarget = Math.round(currentRotation.current / 360) * 360; // nearest full rotation
        const lockAnimate = () => {
          const diff = lockTarget - currentRotation.current;
          if (Math.abs(diff) < 0.5) {
            currentRotation.current = lockTarget;
            setRotation(lockTarget);
            setGlowing(true);
            setTimeout(() => setGlowing(false), 1200);
            return;
          }
          currentRotation.current += diff * 0.15;
          setRotation(currentRotation.current);
          frame = requestAnimationFrame(lockAnimate);
        };
        lockAnimate();
      }
    };

    frame = requestAnimationFrame(spinAnimate);
    return () => cancelAnimationFrame(frame);
  }, [isRevealing]);

  return (
    <div className="relative inline-block">
      <svg
        width="160"
        height="160"
        viewBox="0 0 160 160"
        className="md:w-[200px] md:h-[200px]"
      >
        {/* Outer ring */}
        <circle cx="80" cy="80" r="74" stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none" opacity="0.3" />
        <circle cx="80" cy="80" r="70" stroke="hsl(var(--foreground))" strokeWidth="0.5" fill="none" opacity="0.15" />

        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10) * Math.PI / 180;
          const isMajor = i % 9 === 0;
          const r1 = isMajor ? 62 : 66;
          const r2 = 70;
          return (
            <line
              key={i}
              x1={80 + r1 * Math.sin(angle)}
              y1={80 - r1 * Math.cos(angle)}
              x2={80 + r2 * Math.sin(angle)}
              y2={80 - r2 * Math.cos(angle)}
              stroke="hsl(var(--foreground))"
              strokeWidth={isMajor ? 1.5 : 0.5}
              opacity={isMajor ? 0.6 : 0.2}
            />
          );
        })}

        {/* Cardinal labels */}
        <text x="80" y="24" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace" opacity="0.4">N</text>
        <text x="80" y="142" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace" opacity="0.4">S</text>
        <text x="142" y="84" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace" opacity="0.4">E</text>
        <text x="18" y="84" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="10" fontFamily="monospace" opacity="0.4">W</text>

        {/* Rotating needle group */}
        <g transform={`rotate(${rotation}, 80, 80)`}>
          {/* North needle - with golden glow when locking */}
          <polygon
            points="80,20 75,75 80,68 85,75"
            fill="hsl(var(--foreground))"
            style={{
              filter: glowing ? 'drop-shadow(0 0 8px #D4A520) drop-shadow(0 0 16px #D4A520)' : 'none',
              transition: 'filter 0.3s ease',
            }}
          />
          {/* South needle */}
          <polygon
            points="80,140 75,85 80,92 85,85"
            fill="hsl(var(--foreground))"
            opacity="0.25"
          />
        </g>

        {/* Center dot */}
        <circle cx="80" cy="80" r="3" fill="hsl(var(--foreground))" />
        <circle cx="80" cy="80" r="5" stroke="hsl(var(--foreground))" strokeWidth="0.5" fill="none" opacity="0.3" />
      </svg>

      {/* Golden glow pulse overlay */}
      {glowing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.4, 0], scale: [0.8, 1.3, 1.5] }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(212, 165, 32, 0.3) 0%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
};

const AnimatedUsageCounter: React.FC = () => {
  const { lang } = useLanguage();
  const stored = parseInt(localStorage.getItem(USAGE_KEY) || String(USAGE_BASELINE), 10);
  const target = Math.max(stored, USAGE_BASELINE);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target <= 0) return;
    const duration = 1500;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target]);

  return (
    <p className="text-sm text-muted-foreground">
      {count}+ {UI_CONTENT[lang].usageSuffix}
    </p>
  );
};

// ---------------------------------------------------------------------------
// Centralized UI dictionary — strict separation of markup from copy so the
// EN/AL toggle can never leak strings across states. Every visible string
// used directly inside this file's JSX must have a parallel key in both
// dictionaries below.
// ---------------------------------------------------------------------------
const UI_CONTENT = {
  en: {
    badge: 'Career orientation · powered by AI',
    lowBwLabel: 'Low-BW',
    lowBwDescription:
      'System configured for local hardware acceleration. Optimizing text embeddings to minimize network strain.',
    usageSuffix: 'students have used Digital Compass',
    toggleLangAria: 'Toggle language',
    lowBwAria: 'Low-Bandwidth Mode',
    lowBwTitle: 'Low-Bandwidth Mode (Intel OpenVINO Optimization)',
    brand: 'Compass',
  },
  al: {
    badge: 'Orientim karriere · i mundësuar nga AI',
    lowBwLabel: 'Brez i Ulët',
    lowBwDescription:
      'Sistemi i konfiguruar për përshpejtim lokal të harduerit. Duke optimizuar embeddings-et për të minimizuar trafikun në rrjet.',
    usageSuffix: 'studentë kanë përdorur Busullën',
    toggleLangAria: 'Ndrysho gjuhën',
    lowBwAria: 'Modaliteti me brez të ulët',
    lowBwTitle: 'Modaliteti me brez të ulët (Optimizim me Intel OpenVINO)',
    brand: 'Busulla',
  },
} as const;

const Index: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const [currentStep, setCurrentStep] = useState<AppState>(AppState.LANDING);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [mlScores, setMlScores] = useState<Array<{ career: string; confidence: number }>>([]);

  const [interviewMode, setInterviewMode] = useState<InterviewMode>(InterviewMode.MIXED);
  const [interviewDifficulty, setInterviewDifficulty] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [neurodivergent, setNeurodivergent] = useState<boolean>(false);
  const [interviewSession, setInterviewSession] = useState<InterviewSession | null>(null);
  const [interviewInput, setInterviewInput] = useState('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [interviewReport, setInterviewReport] = useState<InterviewReportType | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  // Ethical disclosure is now a dedicated step (AppState.ETHICAL_DISCLOSURE),
  // not a modal — no local open/close flag needed.
  const [lowBandwidth, setLowBandwidth] = useState<boolean>(() => {
    try { return localStorage.getItem('busulla-low-bandwidth') === 'true'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('busulla-low-bandwidth', String(lowBandwidth)); } catch {}
  }, [lowBandwidth]);
  const [chatSession, setChatSession] = useState<ChatSession>(() => {
    try {
      const saved = localStorage.getItem(CHAT_SESSION_KEY);
      if (saved) { const parsed = JSON.parse(saved); if (parsed.messages) return parsed; }
    } catch {}
    return { messages: [], context: { userPreferences: {} }, lastUpdated: Date.now() };
  });

  useEffect(() => {
    try { localStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(chatSession)); } catch {}
  }, [chatSession]);

  const handleStartClick = () => {
    // Always route the user through the Responsible AI disclosure step
    // before the quiz. If they've already consented previously, we still
    // show it as a fast confirmation screen — it's part of the flow.
    setCurrentStep(AppState.ETHICAL_DISCLOSURE);
  };

  const handlePrivacyAgree = () => {
    localStorage.setItem(PRIVACY_CONSENT_KEY, 'true');
    setCurrentStep(AppState.QUIZ);
  };

  const handlePrivacyCancel = () => {
    setCurrentStep(AppState.LANDING);
  };

  const processResults = async (finalAnswers: QuizAnswer[]) => {
    setCurrentStep(AppState.ANALYZING);
    setIsLoading(true);
    setLoadingError(null);
    try {
      const scores = classifyCareer(finalAnswers);
      setMlScores(scores.map(s => ({ career: s.career, confidence: s.confidence })));
      const result = await predictCareer(finalAnswers);
      setPrediction(result);
      recordQuizCompletion(result.primaryCareer);
      const current = parseInt(localStorage.getItem(USAGE_KEY) || String(USAGE_BASELINE), 10);
      localStorage.setItem(USAGE_KEY, String(Math.max(current, USAGE_BASELINE) + 1));
      setCurrentStep(AppState.RESULTS);
    } catch (error) {
      console.error(error);
      setLoadingError(TRANSLATIONS.common.error);
      setCurrentStep(AppState.LANDING);
    } finally {
      setIsLoading(false);
    }
  };

  const retakeQuiz = () => {
    setPrediction(null);
    setMlScores([]);
    setCurrentStep(AppState.QUIZ);
  };

  const startInterview = useCallback(async () => {
    if (!prediction) return;
    const newSession: InterviewSession = {
      id: `interview-${Date.now()}`, career: prediction.primaryCareer, mode: interviewMode,
      messages: [], currentDifficulty: interviewDifficulty, overallScore: 0,
      weakAreas: [], strongAreas: [], startTime: Date.now(), isComplete: false,
      questionsAnswered: 0, hintsUsed: 0, maxHints: 3,
      neurodivergent,
    };
    setInterviewSession(newSession);
    setCurrentStep(AppState.INTERVIEW_SESSION);
    setInterviewInput('');
    setInterviewReport(null);
    setIsGeneratingQuestion(true);
    try {
      const result = await generateDynamicQuestion(prediction.primaryCareer, interviewMode, interviewDifficulty, [], [], neurodivergent);
      setInterviewSession(prev => prev ? { ...prev, messages: [...prev.messages, {
        role: 'assistant' as const, content: result.question, timestamp: Date.now(),
        metadata: { questionType: result.type, difficulty: interviewDifficulty },
      }] } : prev);
    } catch {
      setInterviewSession(prev => prev ? { ...prev, messages: [...prev.messages, {
        role: 'assistant' as const, content: 'Na trego për veten tënde dhe pse dëshiron këtë pozicion.', timestamp: Date.now(),
      }] } : prev);
    } finally { setIsGeneratingQuestion(false); }
  }, [prediction, interviewMode, interviewDifficulty, neurodivergent]);

  const submitInterviewAnswer = useCallback(async () => {
    if (!interviewSession || !interviewInput.trim() || isEvaluating) return;
    const userMessage = { role: 'user' as const, content: interviewInput, timestamp: Date.now() };
    const updatedMessages = [...interviewSession.messages, userMessage];
    setInterviewSession(prev => prev ? { ...prev, messages: updatedMessages } : prev);
    setInterviewInput('');
    setIsEvaluating(true);
    try {
      const lastQuestion = [...interviewSession.messages].reverse().find(m => m.role === 'assistant');
      if (!lastQuestion) return;
      // Loading state is bound to the real async fetch promise below — no hardcoded setTimeouts.
      const feedback = await evaluateAnswerWithFeedback(
        interviewSession.career, lastQuestion.content, interviewInput,
        interviewSession.mode, interviewSession.currentDifficulty,
        interviewSession.neurodivergent,
      );
      const messageWithFeedback = { ...userMessage, metadata: { feedback } };
      const newQA = interviewSession.questionsAnswered + 1;
      const newScore = Math.round((interviewSession.overallScore * interviewSession.questionsAnswered + feedback.score) / newQA);
      const newWeak = [...interviewSession.weakAreas]; const newStrong = [...interviewSession.strongAreas];
      if (feedback.score < 50) feedback.improvements.forEach(imp => { if (!newWeak.includes(imp)) newWeak.push(imp); });
      else if (feedback.score >= 70) feedback.strengths.forEach(str => { if (!newStrong.includes(str)) newStrong.push(str); });
      const nextDifficulty = await determineNextDifficulty([...updatedMessages, messageWithFeedback], interviewSession.currentDifficulty);
      setInterviewSession(prev => {
        if (!prev) return prev;
        const msgs = prev.messages.map(m => m.timestamp === userMessage.timestamp ? messageWithFeedback : m);
        return { ...prev, messages: msgs, questionsAnswered: newQA, overallScore: newScore, currentDifficulty: nextDifficulty, weakAreas: newWeak.slice(0, 5), strongAreas: newStrong.slice(0, 5) };
      });
      if (newQA < MAX_QUESTIONS) {
        setIsGeneratingQuestion(true);
        const nextQ = await generateDynamicQuestion(
          interviewSession.career, interviewSession.mode, nextDifficulty,
          [...updatedMessages, messageWithFeedback], newWeak, interviewSession.neurodivergent,
        );
        setInterviewSession(prev => prev ? { ...prev, messages: [...prev.messages, {
          role: 'assistant' as const, content: nextQ.question, timestamp: Date.now(),
          metadata: { questionType: nextQ.type, difficulty: nextDifficulty },
        }] } : prev);
        setIsGeneratingQuestion(false);
      }
    } catch (error) { console.error(error); } finally { setIsEvaluating(false); }
  }, [interviewSession, interviewInput, isEvaluating]);

  const requestHint = useCallback(async () => {
    if (!interviewSession || interviewSession.hintsUsed >= interviewSession.maxHints) return;
    const lastQ = [...interviewSession.messages].reverse().find(m => m.role === 'assistant');
    if (!lastQ) return;
    try {
      const hint = await getHint(lastQ.content, interviewSession.career);
      setInterviewSession(prev => prev ? { ...prev, messages: [...prev.messages, { role: 'assistant' as const, content: `Hint: ${hint}`, timestamp: Date.now(), metadata: { isHint: true } }], hintsUsed: prev.hintsUsed + 1 } : prev);
    } catch {}
  }, [interviewSession]);

  const finishInterview = useCallback(async () => {
    if (!interviewSession) return;
    setIsEvaluating(true);
    try {
      const completed = { ...interviewSession, isComplete: true, endTime: Date.now() };
      setInterviewSession(completed);
      const report = await generateInterviewReport(completed);
      setInterviewReport(report);
      setCurrentStep(AppState.INTERVIEW_REPORT);
    } catch (error) { console.error(error); } finally { setIsEvaluating(false); }
  }, [interviewSession]);

  const resetToStart = () => {
    setCurrentStep(AppState.LANDING);
    setPrediction(null);
    setIsLoading(false);
    setLoadingError(null);
    setInterviewSession(null);
    setInterviewInput('');
    setInterviewReport(null);
    setMlScores([]);
  };

  return (
    <div className="min-h-screen selection:bg-foreground selection:text-background overflow-x-hidden bg-background">
      <ASCIIGrid />

      <nav className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 backdrop-blur-sm bg-background/80 border-b border-border">
        <div className="flex items-center gap-3 md:gap-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <circle cx="14" cy="14" r="13" stroke="hsl(var(--foreground))" strokeWidth="1.5" fill="none" />
            <circle cx="14" cy="14" r="2" fill="hsl(var(--foreground))" />
            <polygon points="14,2 12,10 14,8 16,10" fill="hsl(var(--foreground))" />
            <polygon points="14,26 12,18 14,20 16,18" fill="hsl(var(--foreground))" opacity="0.4" />
            <polygon points="26,14 18,12 20,14 18,16" fill="hsl(var(--foreground))" opacity="0.4" />
            <polygon points="2,14 10,12 8,14 10,16" fill="hsl(var(--foreground))" opacity="0.4" />
          </svg>
          <span className="font-heading font-bold text-base md:text-lg tracking-tighter uppercase leading-none">{UI_CONTENT[lang].brand}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'en' ? 'al' : 'en')}
            aria-label={UI_CONTENT[lang].toggleLangAria}
            title={UI_CONTENT[lang].toggleLangAria}
            className="text-[10px] md:text-xs uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-all font-mono"
          >
            <span className={lang === 'en' ? 'font-bold' : 'opacity-40'}>EN</span>
            <span className="mx-1 opacity-40">/</span>
            <span className={lang === 'al' ? 'font-bold' : 'opacity-40'}>AL</span>
          </button>
          <button
            onClick={() => setLowBandwidth(v => !v)}
            aria-label={UI_CONTENT[lang].lowBwAria}
            title={UI_CONTENT[lang].lowBwTitle}
            className={`hidden md:inline-flex items-center gap-1.5 text-[10px] md:text-xs uppercase tracking-widest border px-3 py-2 transition-all font-mono ${
              lowBandwidth ? 'border-accent text-accent bg-accent/10' : 'border-border hover:bg-foreground hover:text-background'
            }`}
          >
            <Zap className="w-3 h-3" />
            {UI_CONTENT[lang].lowBwLabel}
          </button>
          <button onClick={() => setIsAboutOpen(true)} className="text-[10px] md:text-xs uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-all">
            {TRANSLATIONS.nav.about}
          </button>
          {currentStep !== AppState.LANDING && (
            <button onClick={resetToStart} className="text-[10px] md:text-xs font-bold uppercase tracking-widest border border-border px-3 py-2 hover:bg-foreground hover:text-background transition-all">
              {TRANSLATIONS.common.restart}
            </button>
          )}
        </div>
      </nav>

      <main className="relative flex flex-col items-center justify-center min-h-screen px-4 md:px-6 lg:px-8 pt-20 md:pt-24 pb-20 gap-6">
        <AnimatePresence mode="wait">
          {currentStep === AppState.LANDING && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-6xl min-h-[80vh] flex flex-col justify-between items-center text-center relative z-10 gap-8 md:gap-12 py-6 md:py-10">
              <div className="aurora-bg" aria-hidden="true">
                <div className="aurora-orb" />
              </div>
              <div className="grain-overlay" aria-hidden="true" />

              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="relative z-10 inline-flex items-center gap-2 border border-border/60 bg-background/40 backdrop-blur-sm px-4 py-1.5 text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                {UI_CONTENT[lang].badge}
              </motion.div>

              {lowBandwidth && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 inline-flex items-center gap-2 border border-accent/40 bg-accent/10 backdrop-blur-sm px-4 py-1.5 text-[10px] md:text-xs tracking-wide text-accent max-w-3xl"
                >
                  <Zap className="w-3 h-3 shrink-0" />
                  {UI_CONTENT[lang].lowBwDescription}
                </motion.div>
              )}

              <ASCIIHeader />

              <div className="space-y-4 md:space-y-6 relative z-10">
                <h1 className="text-4xl md:text-7xl lg:text-9xl font-heading font-black uppercase leading-[0.85] tracking-tighter headline-gradient">
                  {TRANSLATIONS.landing.title.split(' ').map((word, j) => (
                    <span key={j} className="block hover:italic transition-all">{word}</span>
                  ))}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-xl mx-auto italic border-l-2 border-border pl-4 md:pl-6">
                  {TRANSLATIONS.landing.subtitle}
                </p>
              </div>

              <div className="relative z-10">
                <InteractiveCompass />
              </div>

              {loadingError && <ErrorMessage message={loadingError} />}

              <motion.button
                onClick={handleStartClick}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative z-10 px-8 py-4 md:px-16 md:py-8 bg-foreground text-background font-heading font-black text-xl md:text-3xl uppercase brutalist-button glow-cta transition-all"
              >
                {TRANSLATIONS.common.start} →
              </motion.button>

              <div className="relative z-10 flex flex-col items-center gap-3">
                <AnimatedUsageCounter />
              </div>
            </motion.div>
          )}


          {currentStep === AppState.QUIZ && (
            <Quiz key="quiz" onComplete={processResults} />
          )}

          {currentStep === AppState.ANALYZING && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6 md:space-y-8 max-w-2xl w-full relative z-10">
              <h2 className="text-3xl md:text-5xl font-heading font-bold">{TRANSLATIONS.analyzing.title}</h2>
              <InteractiveCompass isRevealing />
              <LoadingSpinner text={TRANSLATIONS.analyzing.subtitle} />
            </motion.div>
          )}

          {currentStep === AppState.RESULTS && prediction && (
            <Results key="results" prediction={prediction} mlScores={mlScores} onStartInterview={() => setCurrentStep(AppState.INTERVIEW_SETUP)} onRetakeQuiz={retakeQuiz} />
          )}

          {currentStep === AppState.INTERVIEW_SETUP && prediction && (
            <InterviewSetup
              key="setup"
              prediction={prediction}
              selectedMode={interviewMode}
              selectedDifficulty={interviewDifficulty}
              neurodivergent={neurodivergent}
              onModeChange={setInterviewMode}
              onDifficultyChange={setInterviewDifficulty}
              onNeurodivergentChange={setNeurodivergent}
              onStart={startInterview}
            />
          )}

          {currentStep === AppState.INTERVIEW_SESSION && interviewSession && (
            <InterviewSessionComponent key="session" session={interviewSession} userInput={interviewInput} isGeneratingQuestion={isGeneratingQuestion} isEvaluating={isEvaluating} onInputChange={setInterviewInput} onSubmitAnswer={submitInterviewAnswer} onRequestHint={requestHint} onFinish={finishInterview} />
          )}

          {currentStep === AppState.INTERVIEW_REPORT && interviewReport && (
            <InterviewReport key="report" report={interviewReport} onNewInterview={() => setCurrentStep(AppState.INTERVIEW_SETUP)} onBackToResults={() => setCurrentStep(AppState.RESULTS)} />
          )}
        </AnimatePresence>
      </main>

      {CHAT_ENABLED && (
        <CareerAssistant isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} session={chatSession} onSessionUpdate={setChatSession} careerContext={prediction?.primaryCareer} weakAreas={interviewSession?.weakAreas} />
      )}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <PrivacyGate
        isOpen={isPrivacyGateOpen}
        onAgree={handlePrivacyAgree}
        onCancel={() => setIsPrivacyGateOpen(false)}
      />
    </div>
  );
};

export default Index;
