import React, { useEffect, useState } from 'react';
import { UsageStats } from '../types';
import { TRANSLATIONS } from '../i18n';

const STORAGE_KEY = 'busulla-usage-stats';

export function getUsageStats(): UsageStats {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { totalQuizzes: 0, careerCounts: {} };
}

export function recordQuizCompletion(career: string) {
  const stats = getUsageStats();
  stats.totalQuizzes += 1;
  stats.careerCounts[career] = (stats.careerCounts[career] || 0) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

const UsageStatsBanner: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>(getUsageStats());

  useEffect(() => {
    const handleStorage = () => setStats(getUsageStats());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  if (stats.totalQuizzes === 0) return null;

  const topCareers = Object.entries(stats.careerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([career]) => career);

  return (
    <div className="w-full max-w-2xl md:max-w-4xl px-4">
      <div className="p-4 brutalist-border bg-foreground/5 text-center">
        <p className="text-sm">
          <span className="text-muted-foreground">{TRANSLATIONS.stats.title}</span>{' '}
          <span className="font-bold text-accent">{stats.totalQuizzes}</span>{' '}
          <span className="text-muted-foreground">{TRANSLATIONS.stats.students}.</span>
        </p>
        {topCareers.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {TRANSLATIONS.stats.topCareers}{' '}
            <span className="font-medium text-foreground">{topCareers.join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default UsageStatsBanner;
