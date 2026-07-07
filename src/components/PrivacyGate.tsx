import React from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Scale, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n';

interface PrivacyGateProps {
  onAgree: () => void;
  onCancel: () => void;
}

// Centralized copy dictionary — parallel EN / AL keys. No hardcoded prose
// remains in the JSX below; every visible string reads through this map so
// the EN/AL toggle can never leak content across languages.
const ETHICAL_CONTENT = {
  en: {
    title: 'Responsible AI Disclosure',
    kicker: 'Before we begin',
    disclosure:
      'Responsible AI Disclosure: Digital Compass processes inputs securely. We are committed to unbiased, equitable career guidance across all regional demographics. Do you agree to proceed?',
    pillars: [
      {
        title: 'Privacy by design',
        body: 'No personal data is stored on our servers. Interview answers are discarded immediately after the session ends.',
      },
      {
        title: 'Equity across regions',
        body: 'Guidance is calibrated to serve students in every Albanian region — from Tirana to Kukës — with the same quality.',
      },
      {
        title: 'Bias-audited outputs',
        body: 'Career predictions are reviewed against Holland Career Theory and the Albanian labor market to reduce cultural bias.',
      },
      {
        title: 'Local-first processing',
        body: 'When Low-Bandwidth Mode is active, inference runs on-device via the Intel OpenVINO pipeline where possible.',
      },
    ],
    footnote: 'By clicking "I Agree" you accept the terms above.',
    agree: 'I Agree — Proceed to Quiz',
    cancel: 'Cancel',
  },
  al: {
    title: 'Deklarata Etike mbi IA',
    kicker: 'Përpara se të fillojmë',
    disclosure:
      'Deklarata Etike mbi IA: Busulla Digjitale përpunon të dhënat në mënyrë të sigurt. Ne jemi të përkushtuar për udhëheqje karriere të paanshme dhe të barabartë për të gjitha rajonet. Pranon të vazhdosh?',
    pillars: [
      {
        title: 'Privatësi që në dizajn',
        body: 'Asnjë e dhënë personale nuk ruhet në serverët tanë. Përgjigjet e intervistës fshihen menjëherë pas seancës.',
      },
      {
        title: 'Barazi mes rajoneve',
        body: 'Udhëheqja është kalibruar për të shërbyer nxënësit në çdo rajon të Shqipërisë — nga Tirana në Kukës — me të njëjtin cilësi.',
      },
      {
        title: 'Rezultate të kontrolluara nga bias',
        body: 'Parashikimet e karrierës rishikohen sipas Teorisë së Karrierës të Holland dhe tregut shqiptar për të reduktuar paragjykimet kulturore.',
      },
      {
        title: 'Përpunim lokal fillimisht',
        body: 'Kur aktivizohet Modaliteti me Brez të Ulët, inferenca ekzekutohet në pajisje përmes pipeline-it Intel OpenVINO kur është e mundur.',
      },
    ],
    footnote: 'Duke klikuar "Jam Dakord" ju pranoni kushtet e mësipërme.',
    agree: 'Jam Dakord — Vazhdo te Kuizi',
    cancel: 'Anulo',
  },
} as const;

const PILLAR_ICONS = [ShieldCheck, Scale, Sparkles, Lock];

const PrivacyGate: React.FC<PrivacyGateProps> = ({ onAgree, onCancel }) => {
  const { lang } = useLanguage();
  const c = ETHICAL_CONTENT[lang];

  return (
    <motion.div
      key="ethical"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-6xl min-h-[80vh] flex flex-col justify-between text-left relative z-10 gap-8 md:gap-10 py-6 md:py-10"
    >
      {/* Header */}
      <div className="flex items-start gap-4 md:gap-5">
        <div className="w-12 h-12 md:w-14 md:h-14 brutalist-border bg-foreground/5 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        <div>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">
            {c.kicker}
          </p>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-heading font-black uppercase tracking-tighter leading-tight">
            {c.title}
          </h2>
        </div>
      </div>

      {/* Disclosure statement */}
      <div className="brutalist-border p-5 md:p-8 bg-foreground/5">
        <p className="text-base md:text-lg lg:text-xl leading-relaxed">
          {c.disclosure}
        </p>
      </div>

      {/* Four pillars grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {c.pillars.map((p, i) => {
          const Icon = PILLAR_ICONS[i] ?? Lock;
          return (
            <div key={i} className="brutalist-border p-4 md:p-5 flex items-start gap-3 md:gap-4">
              <div className="w-9 h-9 border border-border flex items-center justify-center shrink-0 bg-background">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="font-heading font-bold text-sm md:text-base uppercase tracking-tight mb-1">
                  {p.title}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-xs md:text-sm text-muted-foreground italic max-w-md">
          {c.footnote}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-3 md:px-8 md:py-4 brutalist-border hover:bg-foreground/10 transition-all font-bold uppercase tracking-wider text-xs md:text-sm"
          >
            {c.cancel}
          </button>
          <button
            onClick={onAgree}
            className="px-8 py-3 md:px-12 md:py-4 bg-foreground text-background font-bold uppercase tracking-wider text-xs md:text-sm brutalist-button hover:scale-[1.02] transition-all"
          >
            {c.agree}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PrivacyGate;
