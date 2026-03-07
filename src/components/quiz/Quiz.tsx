import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSLATIONS, QUIZ_QUESTIONS } from '../../i18n';
import { QuizAnswer } from '../../types';

interface QuizProps {
  onComplete: (answers: QuizAnswer[]) => void;
}

const Quiz: React.FC<QuizProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [customValue, setCustomValue] = useState('');

  const handleAnswer = (answer: string, isCustom = false) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = {
      questionId: QUIZ_QUESTIONS[currentIndex].id,
      answer,
      isCustom,
    };
    setAnswers(newAnswers);
    setCustomValue('');

    if (currentIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(newAnswers);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const question = QUIZ_QUESTIONS[currentIndex];
  const progress = ((currentIndex + 1) / QUIZ_QUESTIONS.length) * 100;

  return (
    <motion.div
      key="quiz"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-2xl md:max-w-4xl"
    >
      <div className="brutalist-border bg-background p-6 md:p-8 lg:p-12">
        {/* Progress */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs md:text-sm uppercase font-mono text-muted-foreground">
              {TRANSLATIONS.quiz.progress}
            </span>
            <span className="text-xs md:text-sm font-bold">
              {currentIndex + 1}/{QUIZ_QUESTIONS.length}
            </span>
          </div>
          <div className="h-1 md:h-2 bg-muted brutalist-border overflow-hidden">
            <motion.div
              className="h-full bg-foreground"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h2 className="text-2xl md:text-4xl font-heading font-bold mb-6 md:mb-8 leading-tight">
              {question.text}
            </h2>

            <div className="space-y-3 md:space-y-4">
              {question.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  className="w-full text-left p-4 md:p-6 brutalist-border hover:bg-foreground hover:text-background transition-all text-sm md:text-base group"
                >
                  <span className="font-mono text-xs mr-3 md:mr-4 text-muted-foreground group-hover:text-background/60">
                    [{String.fromCharCode(65 + i)}]
                  </span>
                  {option}
                </button>
              ))}

              {/* Custom answer */}
              <div className="pt-4 md:pt-6 border-t border-border">
                <input
                  type="text"
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  placeholder={TRANSLATIONS.common.customPlaceholder}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customValue.trim()) handleAnswer(customValue, true);
                  }}
                  className="w-full bg-transparent border-2 border-border p-4 md:p-6 mb-3 md:mb-4 focus:border-foreground outline-none text-sm md:text-base"
                />
                <button
                  onClick={() => customValue.trim() && handleAnswer(customValue, true)}
                  disabled={!customValue.trim()}
                  className="w-full brutalist-border p-4 md:p-6 hover:bg-foreground hover:text-background transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm md:text-base"
                >
                  {TRANSLATIONS.common.other}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {currentIndex > 0 && (
          <button
            onClick={goBack}
            className="mt-6 md:mt-8 text-xs md:text-sm uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {TRANSLATIONS.common.back}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default Quiz;
