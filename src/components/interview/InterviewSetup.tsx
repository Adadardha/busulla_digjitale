import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Shuffle, Zap } from 'lucide-react';
import { InterviewMode, DifficultyLevel, PredictionResult } from '../../types';
import { TRANSLATIONS, INTERVIEW_MODE_INFO, DIFFICULTY_INFO } from '../../i18n';

const MODE_ICONS: Record<string, React.ReactNode> = {
  technical: <Settings className="w-5 h-5" />,
  behavioral: <Users className="w-5 h-5" />,
  mixed: <Shuffle className="w-5 h-5" />,
  stress: <Zap className="w-5 h-5" />,
};

interface InterviewSetupProps {
  prediction: PredictionResult;
  selectedMode: InterviewMode;
  selectedDifficulty: DifficultyLevel;
  onModeChange: (mode: InterviewMode) => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onStart: () => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({
  prediction, selectedMode, selectedDifficulty,
  onModeChange, onDifficultyChange, onStart,
}) => {
  const modes = [InterviewMode.TECHNICAL, InterviewMode.BEHAVIORAL, InterviewMode.MIXED, InterviewMode.STRESS];
  const difficulties = [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD];

  return (
    <motion.div
      key="interview-setup"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="w-full max-w-4xl"
    >
      <div className="brutalist-border bg-background p-6 md:p-8 lg:p-12">
        <div className="mb-8">
          <h2 className="text-2xl md:text-4xl font-heading font-bold mb-2">
            {TRANSLATIONS.interviewSetup.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {TRANSLATIONS.interviewSetup.subtitle}
          </p>
        </div>

        <div className="mb-8 p-4 md:p-6 brutalist-border bg-foreground/5">
          <p className="text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {TRANSLATIONS.interviewSetup.careerInfo}
          </p>
          <p className="text-xl md:text-2xl font-bold">{prediction.primaryCareer}</p>
          <div className="flex gap-4 mt-3 text-xs md:text-sm text-muted-foreground">
            <span>{TRANSLATIONS.interviewSetup.questionsCount}</span>
            <span>{TRANSLATIONS.interviewSetup.hints}</span>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 uppercase tracking-wider">
            {TRANSLATIONS.interviewSetup.selectMode}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modes.map(mode => {
              const info = INTERVIEW_MODE_INFO[mode];
              const isSelected = selectedMode === mode;
              return (
                <motion.button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`p-4 md:p-6 text-left transition-all ${
                    isSelected ? 'brutalist-border bg-foreground/10' : 'border-2 border-border hover:border-foreground/40'
                  }`}
                  whileHover={{ scale: isSelected ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-muted-foreground">{MODE_ICONS[info.icon] || <Settings className="w-5 h-5" />}</span>
                    <div>
                      <p className="font-bold text-base md:text-lg">{info.name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">{info.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 text-xs font-bold uppercase">
                      E ZGJEDHUR
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg md:text-xl font-bold mb-4 uppercase tracking-wider">
            {TRANSLATIONS.interviewSetup.selectDifficulty}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficulties.map(difficulty => {
              const info = DIFFICULTY_INFO[difficulty];
              const isSelected = selectedDifficulty === difficulty;
              return (
                <motion.button
                  key={difficulty}
                  onClick={() => onDifficultyChange(difficulty)}
                  className={`p-4 md:p-6 text-left transition-all ${
                    isSelected ? `brutalist-border ${info.bgColor}` : 'border-2 border-border hover:border-foreground/40'
                  }`}
                  whileHover={{ scale: isSelected ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <p className={`font-bold text-base md:text-lg ${info.color}`}>{info.name}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">{info.description}</p>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 text-xs font-bold uppercase">
                      E ZGJEDHUR
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <motion.button
          onClick={onStart}
          className="w-full p-6 md:p-8 bg-foreground text-background font-heading font-bold text-lg md:text-2xl uppercase brutalist-button hover:scale-[1.02] transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {TRANSLATIONS.interviewSetup.startButton} →
        </motion.button>
      </div>
    </motion.div>
  );
};

export default InterviewSetup;
