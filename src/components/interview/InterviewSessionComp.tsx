import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, ArrowUp } from 'lucide-react';
import { InterviewSession as InterviewSessionType } from '../../types';
import { TRANSLATIONS, DIFFICULTY_INFO } from '../../i18n';

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

const InterviewSessionComponent: React.FC<InterviewSessionProps> = ({
  session, userInput, isGeneratingQuestion, isEvaluating,
  onInputChange, onSubmitAnswer, onRequestHint, onFinish,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const difficultyInfo = DIFFICULTY_INFO[session.currentDifficulty];
  const hintsRemaining = session.maxHints - session.hintsUsed;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  const duration = session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime;
  const durationStr = `${Math.floor(duration / 60000)}:${(Math.floor((duration % 60000) / 1000)).toString().padStart(2, '0')}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmitAnswer();
    }
  };

  return (
    <motion.div
      key="interview-session"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl"
    >
      <div className="brutalist-border bg-background p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-heading font-bold">
              {TRANSLATIONS.interviewSession.title}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {session.career} -- {session.questionsAnswered} pyetje
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="brutalist-border bg-foreground/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{TRANSLATIONS.interviewSession.timeRemaining}</p>
              <p className="text-lg font-mono font-bold">{durationStr}</p>
            </div>
            <div className="brutalist-border bg-foreground/5 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{TRANSLATIONS.interviewSession.score}</p>
              <p className="text-lg font-mono font-bold">{session.overallScore}/100</p>
            </div>
            <div className={`brutalist-border px-3 py-2 ${difficultyInfo.bgColor}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{TRANSLATIONS.interviewSession.currentDifficulty}</p>
              <p className={`text-lg font-bold ${difficultyInfo.color}`}>{difficultyInfo.name}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="mb-6 h-[40vh] md:h-[45vh] overflow-y-auto custom-scrollbar space-y-4 pr-2">
          <AnimatePresence>
            {session.messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 brutalist-border ${
                  msg.role === 'user' ? 'bg-foreground/10 ml-0 md:ml-8' :
                  msg.role === 'assistant' ? 'bg-foreground/5 mr-0 md:mr-8' : 'hidden'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {msg.role === 'user' ? 'Ju' : 'Intervistues'}
                    {msg.metadata?.isHint && ' (Hint)'}
                  </p>
                  {msg.metadata?.difficulty && (
                    <span className={`text-[10px] px-2 py-1 ${DIFFICULTY_INFO[msg.metadata.difficulty].bgColor} ${DIFFICULTY_INFO[msg.metadata.difficulty].color}`}>
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
                      <p className="text-xs text-success mb-1 flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> {msg.metadata.feedback.strengths[0]}
                      </p>
                    )}
                    {msg.metadata.feedback.improvements.length > 0 && (
                      <p className="text-xs text-warning flex items-center gap-1.5">
                        <ArrowUp className="w-3 h-3" /> {msg.metadata.feedback.improvements[0]}
                      </p>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {(isGeneratingQuestion || isEvaluating) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 brutalist-border bg-foreground/5 mr-0 md:mr-8">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Intervistues</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-muted-foreground">
                  {isEvaluating ? TRANSLATIONS.interviewSession.evaluating : TRANSLATIONS.interviewSession.typing}
                </span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="space-y-4">
          <textarea
            value={userInput}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={TRANSLATIONS.interviewSession.chatPlaceholder}
            className="w-full bg-transparent border-2 border-border p-4 min-h-[100px] focus:border-foreground outline-none resize-none text-sm md:text-base"
            disabled={isGeneratingQuestion || isEvaluating}
          />
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={onSubmitAnswer}
              disabled={!userInput.trim() || isGeneratingQuestion || isEvaluating}
              className="flex-1 brutalist-border p-4 hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm md:text-base font-bold uppercase"
            >
              {TRANSLATIONS.interviewSession.sendAnswer}
            </button>
            <button
              onClick={onRequestHint}
              disabled={hintsRemaining <= 0 || isGeneratingQuestion || isEvaluating}
              className="brutalist-border p-4 hover:bg-foreground/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm md:text-base flex items-center justify-center gap-2"
            >
              <Lightbulb className="w-4 h-4" /> {TRANSLATIONS.interviewSession.getHint} ({hintsRemaining})
            </button>
            {session.questionsAnswered >= 3 && (
              <button
                onClick={onFinish}
                className="brutalist-border p-4 hover:bg-destructive hover:text-destructive-foreground transition-all text-sm md:text-base font-bold uppercase"
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

export default InterviewSessionComponent;
