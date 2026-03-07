export enum AppState {
  LANDING = 'LANDING',
  QUIZ = 'QUIZ',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  INTERVIEW_SETUP = 'INTERVIEW_SETUP',
  INTERVIEW_SESSION = 'INTERVIEW_SESSION',
  INTERVIEW_REPORT = 'INTERVIEW_REPORT',
}

export interface QuizAnswer {
  questionId: number;
  answer: string;
  isCustom: boolean;
}

export interface AlternativeCareer {
  career: string;
  confidence: number;
  description: string;
}

export interface CareerRoadmap {
  subjects: string[];
  universities: string[];
  careerPath: string[];
  salaryRange: string;
  jobDemand: string;
}

export interface PredictionResult {
  primaryCareer: string;
  confidence: number;
  description: string;
  alternatives: AlternativeCareer[];
  learningPath: string[];
  roadmap?: CareerRoadmap;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  category: string;
}

export enum InterviewMode {
  TECHNICAL = 'TECHNICAL',
  BEHAVIORAL = 'BEHAVIORAL',
  MIXED = 'MIXED',
  STRESS = 'STRESS',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface InterviewFeedback {
  score: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  technicalAccuracy?: number;
  communication?: number;
  problemSolving?: number;
}

export interface InterviewMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    questionType?: 'technical' | 'behavioral' | 'followup';
    difficulty?: DifficultyLevel;
    feedback?: InterviewFeedback;
    isHint?: boolean;
    hintsRemaining?: number;
  };
}

export interface InterviewSession {
  id: string;
  career: string;
  mode: InterviewMode;
  messages: InterviewMessage[];
  currentDifficulty: DifficultyLevel;
  overallScore: number;
  weakAreas: string[];
  strongAreas: string[];
  startTime: number;
  endTime?: number;
  isComplete: boolean;
  questionsAnswered: number;
  hintsUsed: number;
  maxHints: number;
}

export interface InterviewReport {
  sessionId: string;
  career: string;
  mode: InterviewMode;
  overallScore: number;
  verdict: 'hired' | 'consider' | 'rejected';
  summary: string;
  categoryScores: {
    technical: number;
    communication: number;
    problemSolving: number;
    cultureFit: number;
  };
  answersReview: {
    question: string;
    answer: string;
    score: number;
    feedback: string;
  }[];
  recommendations: string[];
  weakTopics: string[];
  practiceSuggestions: string[];
  duration: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  context?: {
    careerPath?: string;
    quizResults?: string;
    currentTopic?: string;
  };
}

export interface ChatSession {
  messages: ChatMessage[];
  context: {
    careerPath?: string;
    lastTopic?: string;
    userPreferences: Record<string, any>;
  };
  lastUpdated: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export interface UsageStats {
  totalQuizzes: number;
  careerCounts: Record<string, number>;
}
