import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Users, Shuffle, Zap, Brain, Check } from 'lucide-react';
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
  neurodivergent: boolean;
  onModeChange: (mode: InterviewMode) => void;
  onDifficultyChange: (difficulty: DifficultyLevel) => void;
  onNeurodivergentChange: (v: boolean) => void;
  onStart: () => void;
}

const InterviewSetup: React.FC<InterviewSetupProps> = ({
  prediction, selectedMode, selectedDifficulty, neurodivergent,
  onModeChange, onDifficultyChange, onNeurodivergentChange, onStart,
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
      <div className="glass-card p-6 md:p-8 lg:p-12">
        <div className="mb-8">
          <h2 className="text-2xl md:text-4xl font-heading font-bold mb-2 intel-text-gradient">
            {TRANSLATIONS.interviewSetup.title}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {TRANSLATIONS.interviewSetup.subtitle}
          </p>
        </div>

        <div className="mb-8 p-4 md:p-6 rounded-xl intel-gradient-soft border border-primary/20">
          <p className="text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2">
            {TRANSLATIONS.interviewSetup.careerInfo}
          </p>
          <p className="text-xl md:text-2xl font-bold intel-text-gradient">{prediction.primaryCareer}</p>
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
                  className={`p-4 md:p-6 text-left rounded-lg transition-all border ${
                    isSelected ? 'border-primary/60 bg-primary/10 intel-ring' : 'border-border hover:border-primary/40 bg-card/40'
                  }`}
                  whileHover={{ scale: isSelected ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`}>{MODE_ICONS[info.icon] || <Settings className="w-5 h-5" />}</span>
                    <div>
                      <p className="font-bold text-base md:text-lg">{info.name}</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">{info.description}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-3 text-xs font-bold uppercase text-accent">
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
                  className={`p-4 md:p-6 text-left rounded-lg transition-all border ${
                    isSelected ? `border-primary/60 ${info.bgColor} intel-ring` : 'border-border hover:border-primary/40 bg-card/40'
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

        {/* Neurodiversity Toggle — THE WINNING PIVOT */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => onNeurodivergentChange(!neurodivergent)}
            className={`w-full p-5 md:p-6 rounded-xl text-left transition-all border ${
              neurodivergent
                ? 'border-accent/60 bg-accent/10 intel-ring'
                : 'border-border hover:border-accent/40 bg-card/40'
            }`}
            aria-pressed={neurodivergent}
          >
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center border ${
                neurodivergent ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-muted/30 border-border text-muted-foreground'
              }`}>
                <Brain className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-bold text-base md:text-lg">Modaliteti Gjithëpërfshirës</p>
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-accent/40 text-accent">
                    Për Neurodiversitetin
                  </span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  Mbështetje për nxënësit në spektrin autik, me ADHD, ose me ankth të lartë social.
                  Pyetje të strukturuara, pa idioma, dhe një skelet vizual STAR gjatë përgjigjeve.
                </p>
              </div>
              <div className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${
                neurodivergent ? 'bg-accent' : 'bg-muted/40'
              }`}>
                <motion.span
                  animate={{ x: neurodivergent ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-background shadow-lg flex items-center justify-center"
                >
                  {neurodivergent && <Check className="w-3 h-3 text-accent" />}
                </motion.span>
              </div>
            </div>
          </button>
        </div>

        <motion.button
          onClick={onStart}
          className="w-full p-6 md:p-8 glow-cta font-heading font-bold text-lg md:text-2xl uppercase rounded-xl brutalist-button intel-focus"
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
