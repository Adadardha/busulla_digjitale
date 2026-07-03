import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ShieldCheck } from 'lucide-react';

interface PrivacyGateProps {
  isOpen: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

const PrivacyGate: React.FC<PrivacyGateProps> = ({ isOpen, onAgree, onCancel }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-background/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="w-full max-w-lg brutalist-border bg-background p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <div className="w-10 h-10 md:w-12 md:h-12 brutalist-border bg-foreground/5 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-heading font-bold uppercase tracking-tight">
                  Privatësia në Radhë të Parë
                </h2>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Përpara se të fillojmë
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6 md:mb-8">
              <p className="text-sm md:text-base leading-relaxed">
                <span className="font-bold">Busulla Digjitale</span> përdor Google Gemini AI për të
                analizuar përgjigjet e tua të kuizit dhe intervistës.
              </p>

              <div className="space-y-3 p-4 brutalist-border bg-foreground/5">
                <PrivacyPoint>
                  <span className="font-medium">Asnjë e dhënë personale</span> nuk ruhet në serverët tanë.
                </PrivacyPoint>
                <PrivacyPoint>
                  Përgjigjet e intervistës <span className="font-medium">fshihen menjëherë</span> pas seancës.
                </PrivacyPoint>
                <PrivacyPoint>
                  Statistikat e përdorimit ruhen <span className="font-medium">vetëm në pajisjen tënde</span> (localStorage).
                </PrivacyPoint>
                <PrivacyPoint>
                  Përgjigjet e tua i dërgohen Google Gemini vetëm për analizë në kohë reale.
                </PrivacyPoint>
              </div>

              <p className="text-xs text-muted-foreground italic">
                Duke klikuar "Jam Dakord" ju pranoni kushtet e mësipërme.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={onAgree}
                className="flex-1 p-4 bg-foreground text-background font-bold uppercase tracking-wider text-sm brutalist-button hover:scale-[1.02] transition-all"
              >
                Jam Dakord
              </button>
              <button
                onClick={onCancel}
                className="p-4 brutalist-border hover:bg-foreground/10 transition-all font-bold uppercase tracking-wider text-sm"
              >
                Anulo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const PrivacyPoint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-start gap-2.5 text-sm">
    <Lock className="w-3.5 h-3.5 mt-1 shrink-0 text-muted-foreground" />
    <span>{children}</span>
  </div>
);

export default PrivacyGate;
