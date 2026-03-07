import React from 'react';
import { motion } from 'framer-motion';
import { InterviewReport as InterviewReportType } from '../../types';
import { TRANSLATIONS, INTERVIEW_MODE_INFO } from '../../i18n';

interface InterviewReportProps {
  report: InterviewReportType;
  onNewInterview: () => void;
  onBackToResults: () => void;
}

const InterviewReport: React.FC<InterviewReportProps> = ({ report, onNewInterview, onBackToResults }) => {
  const verdictColors = {
    hired: 'bg-success/20 text-success border-success',
    consider: 'bg-warning/20 text-warning border-warning',
    rejected: 'bg-destructive/20 text-destructive border-destructive',
  };

  const verdictLabels = {
    hired: TRANSLATIONS.interviewReport.verdicts.hired,
    consider: TRANSLATIONS.interviewReport.verdicts.consider,
    rejected: TRANSLATIONS.interviewReport.verdicts.rejected,
  };

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins} ${TRANSLATIONS.interviewReport.minutes} ${secs}s`;
  };

  const categoryLabels = {
    technical: TRANSLATIONS.interviewReport.categories.technical,
    communication: TRANSLATIONS.interviewReport.categories.communication,
    problemSolving: TRANSLATIONS.interviewReport.categories.problemSolving,
    cultureFit: TRANSLATIONS.interviewReport.categories.cultureFit,
  };

  const getCategoryColor = (score: number) => {
    if (score >= 70) return 'bg-success';
    if (score >= 50) return 'bg-warning';
    return 'bg-destructive';
  };

  const exportReport = () => {
    const reportText = `
BUSULLA DIGJITALE - RAPORT I INTERVISTËS
========================================

Pozicioni: ${report.career}
Mënyra: ${INTERVIEW_MODE_INFO[report.mode]?.name || report.mode}
Kohëzgjatja: ${formatDuration(report.duration)}

REZULTATI I PËRGJITHSHËM: ${report.overallScore}/100
VENDIMI: ${verdictLabels[report.verdict]}

PËRMBLEDHJE:
${report.summary}

REKOMANDIME:
${report.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

---
Gjeneruar nga Busulla Digjitale
Data: ${new Date().toLocaleDateString('sq-AL')}
    `.trim();

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-report-${report.sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine weak answers for detailed feedback on fail
  const weakAnswers = report.answersReview.filter(a => a.score < 50);
  const isHired = report.verdict === 'hired';

  return (
    <motion.div
      key="interview-report"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-4xl"
    >
      <div className="brutalist-border bg-background p-6 md:p-8 lg:p-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-heading font-bold">{TRANSLATIONS.interviewReport.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{report.career}</p>
          </div>
          <div className={`px-4 py-2 border-2 ${verdictColors[report.verdict]} font-bold text-lg uppercase`}>
            {verdictLabels[report.verdict]}
          </div>
        </div>

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="brutalist-border bg-foreground/5 p-6 text-center">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{TRANSLATIONS.interviewReport.overallScore}</p>
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                <motion.circle
                  cx="64" cy="64" r="56"
                  stroke={report.overallScore >= 70 ? 'hsl(var(--success))' : report.overallScore >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                  strokeWidth="8" fill="none" strokeLinecap="round"
                  initial={{ strokeDasharray: '0 352' }}
                  animate={{ strokeDasharray: `${(report.overallScore / 100) * 352} 352` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{report.overallScore}</span>
              </div>
            </div>
          </div>

          <div className="brutalist-border bg-foreground/5 p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{TRANSLATIONS.interviewReport.duration}</p>
              <p className="text-xl font-mono">{formatDuration(report.duration)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Mënyra</p>
              <p className="text-xl">
                {INTERVIEW_MODE_INFO[report.mode]?.icon} {INTERVIEW_MODE_INFO[report.mode]?.name || report.mode}
              </p>
            </div>
          </div>
        </div>

        {/* Congratulations or Weak Answers */}
        {isHired ? (
          <div className="mb-8 p-6 brutalist-border bg-success/10">
            <h3 className="text-xl font-bold mb-3">🎉 Urime! Performanca juaj ishte e shkëlqyer!</h3>
            <p className="text-muted-foreground mb-4">{report.summary}</p>
            <h4 className="text-sm font-bold uppercase mb-3">{TRANSLATIONS.interviewReport.nextSteps}:</h4>
            <ol className="space-y-2">
              {report.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-success font-bold">{i + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <>
            <div className="mb-8 p-6 brutalist-border bg-foreground/5">
              <h3 className="text-lg font-bold mb-3 uppercase tracking-wider">{TRANSLATIONS.interviewReport.summary}</h3>
              <p className="text-muted-foreground leading-relaxed">{report.summary}</p>
            </div>

            {weakAnswers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">{TRANSLATIONS.interviewReport.weakAnswers}</h3>
                <div className="space-y-4">
                  {weakAnswers.map((answer, i) => (
                    <div key={i} className="p-4 brutalist-border bg-destructive/5">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-sm">{answer.question}</p>
                        <span className="text-sm font-bold text-destructive">{answer.score}/100</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Përgjigjja juaj: {answer.answer.substring(0, 100)}{answer.answer.length > 100 ? '...' : ''}
                      </p>
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-bold uppercase text-warning mb-1">
                          💡 {TRANSLATIONS.interviewReport.tipForImprovement}:
                        </p>
                        <p className="text-xs">{answer.feedback}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Category Scores */}
        <div className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">{TRANSLATIONS.interviewReport.categoryScores}</h3>
          <div className="space-y-4">
            {Object.entries(report.categoryScores).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">{categoryLabels[key as keyof typeof categoryLabels]}</span>
                  <span className="text-sm font-mono">{value}%</span>
                </div>
                <div className="h-3 bg-muted overflow-hidden brutalist-border">
                  <motion.div
                    className={`h-full ${getCategoryColor(value)}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-6 brutalist-border bg-foreground/5">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">{TRANSLATIONS.interviewReport.recommendations}</h3>
            <ul className="space-y-2">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 brutalist-border bg-foreground/5">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">{TRANSLATIONS.interviewReport.practiceSuggestions}</h3>
            <div className="flex flex-wrap gap-2">
              {report.practiceSuggestions.map((s, i) => (
                <span key={i} className="px-3 py-1 border border-border text-sm">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-3">
          <button onClick={onNewInterview} className="flex-1 p-4 md:p-6 bg-foreground text-background font-heading font-bold text-lg uppercase brutalist-button hover:scale-[1.02] transition-all">
            {TRANSLATIONS.interviewReport.newInterview} →
          </button>
          <button onClick={exportReport} className="brutalist-border p-4 md:p-6 hover:bg-foreground/10 transition-all font-bold uppercase">
            {TRANSLATIONS.interviewReport.exportReport}
          </button>
          <button onClick={onBackToResults} className="brutalist-border p-4 md:p-6 hover:bg-foreground/10 transition-all">
            {TRANSLATIONS.interviewReport.backToResults}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default InterviewReport;
