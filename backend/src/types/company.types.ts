import { QuestionCategory, QuestionDifficulty, QuestionType, QuestionStatus } from './question.types.js';

export interface CompanyDto {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    assessments?: number;
    questions?: number;
    companyQuestions?: number;
  };
}

export interface CreateCompanyDto {
  code: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface UpdateCompanyDto {
  code?: string;
  name?: string;
  description?: string | null;
  logoUrl?: string | null;
  website?: string | null;
  isActive?: boolean;
}

export interface CompanyQueryFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'code' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyQuestionDto {
  id: string;
  companyId: string;
  questionId: string;
  source?: string | null;
  year?: number | null;
  occurrenceCount: number;
  label: string; // 'Company Tagged' | 'Reported Question' | 'Repeated Question' | 'Frequently Used' | 'Possible Duplicate'
  isReported: boolean;
  createdAt: Date;
  updatedAt: Date;
  question?: {
    id: string;
    category: QuestionCategory;
    topic: string;
    difficulty: QuestionDifficulty;
    questionType: QuestionType;
    questionText: string;
    marks: number;
    negativeMarks: number;
    correctAnswer?: string | null;
    explanation?: string | null;
    status: QuestionStatus;
    options?: Array<{
      id: string;
      optionText: string;
      optionOrder: number;
      isCorrect: boolean;
    }>;
  };
}

export interface QuestionDuplicateCandidateDto {
  id: string;
  companyId?: string | null;
  originalQuestionId: string;
  candidateQuestionId?: string | null;
  candidateText: string;
  similarityScore: number;
  reason: string;
  status: 'PENDING' | 'CONFIRMED_DUPLICATE' | 'REJECTED';
  metadata?: string | null;
  createdAt: Date;
  updatedAt: Date;
  originalQuestion?: {
    id: string;
    questionText: string;
    category: QuestionCategory;
    topic: string;
  };
  candidateQuestion?: {
    id: string;
    questionText: string;
    category: QuestionCategory;
    topic: string;
  } | null;
}

export interface CompanyQuestionUploadRow {
  questionText: string;
  category: QuestionCategory;
  topic: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: string;
  explanation?: string;
  source?: string;
  year?: number;
  options?: Array<{ optionText: string; isCorrect: boolean; optionOrder?: number }>;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correctOptionIndex?: number | string;
}

export interface CompanyQuestionUploadResult {
  totalRows: number;
  acceptedCount: number;
  exactDuplicatesCount: number;
  possibleDuplicatesCount: number;
  invalidCount: number;
  failedRowsCount: number;
  exactDuplicates: Array<{
    row: number;
    questionText: string;
    existingQuestionId: string;
    action: string;
  }>;
  possibleDuplicates: Array<{
    row: number;
    questionText: string;
    matchedQuestionId: string;
    matchedQuestionText: string;
    similarityScore: number;
    reason: string;
  }>;
  invalidQuestions: Array<{
    row: number;
    questionText?: string;
    error: string;
  }>;
  failedRows: Array<{
    row: number;
    reason: string;
  }>;
}

export interface CompanyQuestionIntelligenceDto {
  company: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  totalQuestions: number;
  categoryBreakdown: {
    quantitativeAptitude: number;
    logicalReasoning: number;
    verbalAbility: number;
    technicalMcq: number;
    coding: number;
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  topicDistribution: Array<{
    topic: string;
    category: QuestionCategory;
    count: number;
  }>;
  repeatedQuestionsCount: number;
  frequentlyUsedCount: number;
  possibleDuplicatesCount: number;
  yearDistribution: Array<{
    year: number;
    count: number;
  }>;
  evidenceLabels: {
    companyTagged: number;
    reportedQuestion: number;
    repeatedQuestion: number;
    frequentlyUsed: number;
    possibleDuplicate: number;
  };
}

export interface CompanyQuestionFilter {
  page?: number;
  limit?: number;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  source?: string;
  year?: number;
  label?: string;
  usageStatus?: 'USED' | 'UNUSED' | 'ALL';
  search?: string;
}
