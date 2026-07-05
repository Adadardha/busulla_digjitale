import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, ArrowUp, Mic, MicOff, ClipboardList, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { InterviewSession as InterviewSessionType } from '../../types';
import { TRANSLATIONS, DIFFICULTY_INFO, getLanguage } from '../../i18n';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface InterviewSessionProps {
  session: InterviewSessionType;
  userInput: string;
  isGeneratingQuestion: boolean;
  isEvaluating: boolean;
  onInputChange: (value: string) => void;
  onSubmitAnswer: () => void;
  onRequestHint: () => void;
  onFinish: () => void;
}

// ---------- Input guardrails ----------
function isSpammyOrTooShort(text: string): { blocked: boolean; reason?: string } {
  const trimmed = text.trim();
  if (trimmed.length < 5) return { blocked: true, reason: 'short' };
  if (/^(.)\1{2,}$/.test(trimmed)) return { blocked: true, reason: 'repeat' };
  if (/^([a-zç]{1,3})\1{2,}$/i.test(trimmed.replace(/\s+/g, ''))) return { blocked: true, reason: 'repeat' };
  const nonAnswer = /^(nuk\s*e\s*di|s'?e\s*di|se\s*di|spo\s*di|skam\s*ide|s'?kam\s*ide|nuk\s*kam\s*ide|idk|i\s*don'?t\s*know|no\s*idea)\.?$/i;
  if (nonAnswer.test(trimmed)) return { blocked: true, reason: 'nonanswer' };
  return { blocked: false };
}

const guardrailMessage = () =>
  getLanguage() === 'en'
    ? 'Please give a slightly more detailed answer so the AI can help you better.'
    : "Ju lutem, jepni një përgjigje pak më të detajuar që inteligjenca artificiale t'ju ndihmojë më mirë!";

// ---------- STAR scaffold (neurodiversity mode) ----------
const StarScaffold: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-4 md:p-5 border border-accent/30"
  >
    <div className="flex items-center gap-2 mb-3">
      <ClipboardList className="w-4 h-4 text-accent" />
      <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-accent">
        Struktura e Përgjigjes (Metoda STAR)
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm">
      {[
        { l: 'S — Situata', d: 'Përshkruani kontekstin konkret.' },
        { l: 'T — Detyra', d: 'Cila ishte përgjegjësia juaj?' },
        { l: 'A — Veprimi', d: 'Çfarë hapash konkretë ndërmorët?' },
        { l: 'R — Rezultati', d: 'Çfarë ndodhi? Matje/pasoja.' },
      ].map(({ l, d }) => (
        <div key={l} className="p-2 rounded border border-border/60 bg-background/40">
          <p className="font-bold text-accent text-[11px] md:text-xs">{l}</p>
          <p className="text-muted-foreground text-[11px] md:text-xs mt-0.5">{d}</p>
        </div>
      ))}
    </div>
  </motion.div>
);

const InterviewSessionComponent: React.FC<InterviewSessionProps> = ({
  session, userInput, isGeneratingQuestion, isEvaluating,
  onInputChange, onSubmitAnswer, onRequestHint, onFinish,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const difficultyInfo = DIFFICULTY_INFO[session.currentDifficulty];
  const hintsRemaining = session.maxHints - session.hintsUsed;
  const [interimTranscript, setInterimTranscript] = useState('');
  const baseTextRef = useRef('');

  const { listening, supported, start, stop } = useSpeechRecognition(
    (final) => {
      // Append final to committed text
      const combined = (baseTextRef.current + ' ' + final).trim();
      baseTextRef.current = combined;
      onInputChange(combined);
      setInterimTranscript('');
    },
    (interim) => setInterimTranscript(interim),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime;
  const durationStr = `${Math.floor(duration / 60000)}:${(Math.floor((duration % 60000) / 1000)).toString().padStart(2, '0')}`;

  const handleSubmitClick = () => {
    const check = isSpammyOrTooShort(userInput);
    if (check.blocked) {
      toast.warning(guardrailMessage(), {
        description: check.reason === 'nonanswer'
          ? (getLanguage() === 'en'
              ? 'Try: paraphrase the question, share what you know, or make a hypothesis.'
              : 'Provoni: parafrazoni pyetjen, ndani atë që dini, ose bëni hipoteza.')
          : undefined,
      });
      return;
    }
    if (listening) stop();
    baseTextRef.current = '';
    setInterimTranscript('');
    onSubmitAnswer();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitClick();
    }
  };

  const toggleMic = () => {
    if (!supported) {
      toast.error(
        getLanguage() === 'en'
          ? 'Speech recognition is not supported in this browser. Try Chrome or Edge.'
          : 'Njohja e zërit nuk mbështetet nga ky shfletues. Provoni Chrome ose Edge.',
      );
      return;
    }
    if (listening) {
      stop();
    } else {
      baseTextRef.current = userInput;
      start();
    }
  };

  const displayValue = useMemo(
    () => (listening && interimTranscript ? `${baseTextRef.current} ${interimTranscript}`.trim() : userInput),
    [listening, interimTranscript, userInput],
  );

  const disabled = isGeneratingQuestion || isEvaluating;

  return (
    <motion.div
      key="interview-session"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl"
    >
      <div className="glass-card p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="min-w-0">
            <h2 className="text-xl md:text-3xl font-heading font-bold truncate">
              {TRANSLATIONS.interviewSession.title}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 truncate">
              {session.career} — {session.questionsAnswered} {getLanguage() === 'en' ? 'questions' : 'pyetje'}
              {session.neurodivergent && (
                <span className="ml-2 text-accent">· {getLanguage() === 'en' ? 'Inclusion Mode' : 'Modaliteti Gjithëpërfshirës'}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Minimalist stopwatch pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 backdrop-blur-sm">
              <Timer className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {TRANSLATIONS.interviewSession.timeRemaining}
              </span>
              <span className="font-mono text-sm font-bold tabular-nums">{durationStr}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{TRANSLATIONS.interviewSession.score}</span>
              <span className="font-mono text-sm font-bold intel-text-gradient">{session.overallScore}/100</span>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-sm ${difficultyInfo.bgColor} ${difficultyInfo.borderColor}`}>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{TRANSLATIONS.interviewSession.currentDifficulty}</span>
              <span className={`text-sm font-bold ${difficultyInfo.color}`}>{difficultyInfo.name}</span>
            </div>
          </div>
        </div>


        {session.neurodivergent && (
          <div className="mb-4">
            <StarScaffold />
          </div>
        )}

        {/* Messages */}
        <div className="mb-6 h-[40vh] md:h-[45vh] overflow-y-auto custom-scrollbar space-y-4 pr-2">
          <AnimatePresence>
            {session.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[92%] md:max-w-[85%] p-4 rounded-2xl break-words ${
                  msg.role === 'user'
                    ? 'bg-primary/15 border border-primary/30 rounded-tr-sm'
                    : 'bg-card/60 border border-border rounded-tl-sm'
                }`}>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {msg.role === 'user' ? 'Ju' : 'Intervistues'}
                      {msg.metadata?.isHint && ' · Hint'}
                    </p>
                    {msg.metadata?.difficulty && (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${DIFFICULTY_INFO[msg.metadata.difficulty].bgColor} ${DIFFICULTY_INFO[msg.metadata.difficulty].color}`}>
                        {DIFFICULTY_INFO[msg.metadata.difficulty].name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.metadata?.feedback && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase">{TRANSLATIONS.interviewSession.feedback}:</span>
                        <span className={`text-sm font-bold ${
                          msg.metadata.feedback.score >= 70 ? 'text-success' :
                          msg.metadata.feedback.score >= 50 ? 'text-warning' : 'text-destructive'
                        }`}>
                          {msg.metadata.feedback.score}/100
                        </span>
                      </div>
                      {msg.metadata.feedback.strengths.length > 0 && (
                        <p className="text-xs text-success mb-1 flex items-start gap-1.5">
                          <Check className="w-3 h-3 mt-0.5 shrink-0" /> <span>{msg.metadata.feedback.strengths[0]}</span>
                        </p>
                      )}
                      {msg.metadata.feedback.improvements.length > 0 && (
                        <p className="text-xs text-warning flex items-start gap-1.5">
                          <ArrowUp className="w-3 h-3 mt-0.5 shrink-0" /> <span>{msg.metadata.feedback.improvements[0]}</span>
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(isGeneratingQuestion || isEvaluating) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
              <div className="max-w-[85%] p-4 rounded-2xl rounded-tl-sm bg-card/60 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {isEvaluating ? 'Feedback' : 'Intervistues'}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {isEvaluating ? TRANSLATIONS.interviewSession.evaluating : TRANSLATIONS.interviewSession.typing}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 min-w-[200px] md:min-w-[300px]">
                  <div className="h-3 bg-foreground/10 relative overflow-hidden rounded" style={{ width: '92%' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-[shimmer_1.5s_infinite]" />
                  </div>
                  <div className="h-3 bg-foreground/10 relative overflow-hidden rounded" style={{ width: '78%' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-[shimmer_1.5s_infinite]" style={{ animationDelay: '0.2s' }} />
                  </div>
                  <div className="h-3 bg-foreground/10 relative overflow-hidden rounded" style={{ width: '85%' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-[shimmer_1.5s_infinite]" style={{ animationDelay: '0.4s' }} />
                  </div>
                  {isEvaluating && (
                    <div className="pt-2 mt-2 border-t border-border grid grid-cols-3 gap-2">
                      <SkeletonMetric label="Teknike" />
                      <SkeletonMetric label="Komunikim" />
                      <SkeletonMetric label="Zgjidhje" />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={displayValue}
              onChange={e => { baseTextRef.current = e.target.value; onInputChange(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder={
                listening
                  ? 'Duke dëgjuar... Flisni tani në shqip.'
                  : TRANSLATIONS.interviewSession.chatPlaceholder
              }
              className="w-full bg-background/40 border border-border rounded-lg p-4 pr-14 min-h-[110px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={toggleMic}
              disabled={disabled}
              aria-label={listening ? 'Ndalo diktimin me zë' : 'Fillo diktimin me zë'}
              className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                listening
                  ? 'bg-destructive/20 border-destructive text-destructive mic-pulse'
                  : supported
                  ? 'bg-accent/10 border-accent/40 text-accent hover:bg-accent/20'
                  : 'bg-muted/20 border-muted text-muted-foreground opacity-50 cursor-not-allowed'
              }`}
              title={supported ? (listening ? 'Ndalo' : 'Diktim me zë (shqip/anglisht)') : 'Mikrofoni nuk mbështetet'}
            >
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={handleSubmitClick}
              disabled={!userInput.trim() || disabled}
              className="flex-1 p-4 rounded-lg glow-cta font-bold uppercase text-sm md:text-base intel-focus transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {TRANSLATIONS.interviewSession.sendAnswer}
            </button>
            <button
              onClick={onRequestHint}
              disabled={hintsRemaining <= 0 || disabled}
              className="p-4 rounded-lg border border-border hover:border-accent/50 hover:bg-accent/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm md:text-base flex items-center justify-center gap-2"
            >
              <Lightbulb className="w-4 h-4" /> {TRANSLATIONS.interviewSession.getHint} ({hintsRemaining})
            </button>
            {session.questionsAnswered >= 3 && (
              <button
                onClick={onFinish}
                className="p-4 rounded-lg border border-destructive/40 hover:bg-destructive/20 text-destructive transition-all text-sm md:text-base font-bold uppercase"
              >
                {TRANSLATIONS.interviewSession.finishInterview}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SkeletonMetric: React.FC<{ label: string }> = ({ label }) => (
  <div className="space-y-1">
    <div className="h-2 bg-foreground/10 relative overflow-hidden rounded">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/40 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
    <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/60">{label}</p>
  </div>
);

export default InterviewSessionComponent;
