import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TRANSLATIONS } from '../../i18n';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto brutalist-border bg-background p-6 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-heading font-bold">{TRANSLATIONS.about.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{TRANSLATIONS.about.subtitle}</p>
              </div>
              <button onClick={onClose} className="text-xl hover:text-muted-foreground transition-colors">✕</button>
            </div>

            <div className="space-y-6">
              <Section title={`🎯 ${TRANSLATIONS.about.problem}`} text={TRANSLATIONS.about.problemText} />
              <Section title={`🔬 ${TRANSLATIONS.about.methodology}`} text={TRANSLATIONS.about.methodologyText} />
              <Section title={`👥 ${TRANSLATIONS.about.team}`} text={TRANSLATIONS.about.teamText} />
              <Section title={`⚡ ${TRANSLATIONS.about.tech}`} text={TRANSLATIONS.about.techText} />

              <div className="pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Festivali Kombëtar i Shkencës 2026 • Shqipëri
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Section: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="p-4 brutalist-border bg-foreground/5">
    <h3 className="font-bold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
  </div>
);

export default AboutModal;
