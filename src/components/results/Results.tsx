import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { PredictionResult, CareerRoadmap } from '../../types';
import { TRANSLATIONS } from '../../i18n';
import { generateCareerRoadmap } from '../../services/gemini';
import { LoadingSpinner, ErrorMessage } from '../Decorations';

interface ResultsProps {
  prediction: PredictionResult;
  mlScores: Array<{ career: string; confidence: number }>;
  onStartInterview: () => void;
  onRetakeQuiz: () => void;
}

const Results: React.FC<ResultsProps> = ({ prediction, mlScores, onStartInterview, onRetakeQuiz }) => {
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState(false);

  const loadRoadmap = async () => {
    setRoadmapLoading(true);
    setRoadmapError(false);
    try {
      const r = await generateCareerRoadmap(prediction.primaryCareer);
      setRoadmap(r);
    } catch {
      setRoadmapError(true);
    } finally {
      setRoadmapLoading(false);
    }
  };

  useEffect(() => {
    loadRoadmap();
  }, [prediction.primaryCareer]);

  const matchPercent = (prediction.confidence * 100).toFixed(0);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-2xl md:max-w-4xl space-y-6 md:space-y-8"
    >
      <div className="brutalist-border bg-background p-6 md:p-8 lg:p-12">
        <h2 className="text-2xl md:text-4xl font-heading font-bold mb-6 md:mb-8">
          {TRANSLATIONS.results.title}
        </h2>

        {/* Primary Match Card */}
        <div className="mb-8 md:mb-12 p-6 md:p-8 brutalist-border bg-foreground/5">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 md:mb-6 gap-4">
            <div>
              <p className="text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {TRANSLATIONS.results.match}
              </p>
              <h3 className="text-3xl md:text-5xl font-heading font-black">
                {prediction.primaryCareer}
              </h3>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2">
                {TRANSLATIONS.results.confidence}
              </p>
              <p className="text-4xl md:text-6xl font-mono font-bold text-accent">
                {matchPercent}%
              </p>
            </div>
          </div>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            {prediction.description}
          </p>
        </div>

        {/* Alternatives */}
        {prediction.alternatives && prediction.alternatives.length > 0 && (
          <div className="mb-8 md:mb-12">
            <h4 className="text-lg md:text-xl font-bold mb-4 md:mb-6 uppercase tracking-wider">
              {TRANSLATIONS.results.alternatives}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {prediction.alternatives.map((alt, i) => (
                <div key={i} className="p-4 md:p-6 brutalist-border bg-foreground/5">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-bold text-base md:text-lg">{alt.career}</h5>
                    <span className="text-sm font-mono text-muted-foreground">
                      {(alt.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">{alt.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ML Scores */}
        {mlScores.length > 0 && (
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
              <h4 className="text-lg md:text-xl font-bold uppercase tracking-wider">
                Analiza ML
              </h4>
              <span className="text-[10px] font-mono px-2 py-1 border border-border uppercase tracking-widest text-muted-foreground">
                model lokal
              </span>
            </div>
            <div className="space-y-2 md:space-y-3">
              {mlScores.slice(0, 6).map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-36 md:w-48 text-xs md:text-sm font-mono truncate text-muted-foreground">
                    {s.career}
                  </span>
                  <div className="flex-1 h-2 bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full ${i === 0 ? 'bg-foreground' : 'bg-foreground/40'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.confidence * 100}%` }}
                      transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs font-mono text-muted-foreground">
                    {(s.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career Roadmap */}
        <div className="mb-8 md:mb-12">
          <h4 className="text-lg md:text-xl font-bold mb-4 md:mb-6 uppercase tracking-wider">
            {TRANSLATIONS.results.roadmap}
          </h4>
          {roadmapLoading && <LoadingSpinner text="Duke gjeneruar hartën e karrierës..." />}
          {roadmapError && <ErrorMessage message={TRANSLATIONS.common.error} onRetry={loadRoadmap} />}
          {roadmap && (
            <div className="space-y-4 md:space-y-6">
              <RoadmapSection icon="📚" title={TRANSLATIONS.results.roadmapSubjects} items={roadmap.subjects} />
              <RoadmapSection icon="🎓" title={TRANSLATIONS.results.roadmapUniversities} items={roadmap.universities} />
              <RoadmapSection icon="📈" title={TRANSLATIONS.results.roadmapCareerPath} items={roadmap.careerPath} numbered />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 brutalist-border bg-foreground/5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    💰 {TRANSLATIONS.results.roadmapSalary}
                  </p>
                  <p className="font-bold text-lg">{roadmap.salaryRange}</p>
                </div>
                <div className="p-4 brutalist-border bg-foreground/5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    📊 {TRANSLATIONS.results.roadmapDemand}
                  </p>
                  <p className="font-bold text-lg">{roadmap.jobDemand}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Learning Path */}
        {prediction.learningPath && (
          <div className="mb-8 md:mb-12">
            <h4 className="text-lg md:text-xl font-bold mb-4 md:mb-6 uppercase tracking-wider">
              {TRANSLATIONS.results.learning}
            </h4>
            <ul className="space-y-3 md:space-y-4">
              {prediction.learningPath.map((step, i) => (
                <li key={i} className="flex items-start gap-3 md:gap-4">
                  <span className="font-mono text-xs md:text-sm mt-1 text-muted-foreground">
                    {i + 1}.
                  </span>
                  <span className="text-sm md:text-base">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* QR Code */}
        <div className="mb-8 md:mb-12 p-6 brutalist-border bg-foreground/5 text-center">
          <p className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
            {TRANSLATIONS.results.shareTitle}
          </p>
          <div className="inline-block p-3 bg-foreground">
            <QRCodeSVG
              value="https://busullafs.vercel.app"
              size={120}
              bgColor="hsl(0, 0%, 100%)"
              fgColor="hsl(0, 0%, 2%)"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {TRANSLATIONS.results.shareDescription}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onStartInterview}
            className="w-full p-6 md:p-8 bg-foreground text-background font-heading font-bold text-lg md:text-2xl uppercase brutalist-button hover:scale-[1.02] transition-all"
          >
            {TRANSLATIONS.results.practice} →
          </button>
          <button
            onClick={onRetakeQuiz}
            className="w-full p-4 brutalist-border hover:bg-foreground/10 transition-all font-bold uppercase text-sm"
          >
            {TRANSLATIONS.common.tryAnother}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const RoadmapSection: React.FC<{
  icon: string;
  title: string;
  items: string[];
  numbered?: boolean;
}> = ({ icon, title, items, numbered }) => (
  <div className="p-4 brutalist-border bg-foreground/5">
    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
      {icon} {title}
    </p>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="text-muted-foreground font-mono text-xs mt-0.5">
            {numbered ? `${i + 1}.` : '•'}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default Results;
