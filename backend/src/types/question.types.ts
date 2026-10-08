import {
  QuestionCategory,
  QuestionDifficulty,
  QuestionType,
  QuestionStatus,
  AiClassificationStatus,
} from '@prisma/client';

export { QuestionCategory, QuestionDifficulty, QuestionType, QuestionStatus, AiClassificationStatus };

// =============================================================================
// Authoritative Category -> Topics Master Matrix
// =============================================================================
export const CATEGORY_TOPICS_MAP: Record<QuestionCategory, readonly string[]> = {
  QUANTITATIVE_APTITUDE: [
    'Percentage',
    'Profit & Loss',
    'Ratio & Proportion',
    'Average',
    'Time & Work',
    'Time Speed Distance',
    'Simple Interest',
    'Compound Interest',
    'Probability',
    'Number System',
    'Permutation & Combination',
    'Data Interpretation',
  ] as const,
  LOGICAL_REASONING: [
    'Number Series',
    'Letter Series',
    'Coding-Decoding',
    'Blood Relations',
    'Direction Sense',
    'Syllogism',
    'Analogy',
    'Classification',
    'Seating Arrangement',
    'Puzzles',
    'Statement & Conclusion',
    'Data Sufficiency',
  ] as const,
  VERBAL_ABILITY: [
    'Synonyms',
    'Antonyms',
    'Grammar',
    'Vocabulary',
    'Error Detection',
    'Sentence Correction',
    'Fill in the Blanks',
    'Para Jumbles',
    'Reading Comprehension',
    'Tenses',
    'Articles',
    'Prepositions',
  ] as const,
  TECHNICAL_MCQ: [
    'C',
    'C++',
    'Java',
    'Python',
    'Data Structures',
    'Algorithms',
    'DBMS',
    'Operating Systems',
    'Computer Networks',
    'OOP',
  ] as const,
  CODING: [
    'Arrays',
    'Strings',
    'Data Structures',
    'Algorithms',
    'Dynamic Programming',
    'Recursion',
    'Math',
    'Bit Manipulation',
  ] as const,
};

/**
 * Normalizes input or AI suggested topic string to the exact canonical topic name from CATEGORY_TOPICS_MAP
 */
export function canonicalizeTopic(category: QuestionCategory, rawTopic: string): string | null {
  if (!rawTopic || !category) return null;
  const allowed = CATEGORY_TOPICS_MAP[category];
  if (!allowed) return null;

  const cleaned = rawTopic.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ');

  // Direct match
  const directMatch = allowed.find((t) => t.toLowerCase() === cleaned);
  if (directMatch) return directMatch;

  // Keyword / symbol variations (e.g., "profit and loss" vs "profit & loss", "time, speed & distance" vs "time speed distance")
  const stripped = cleaned.replace(/&/g, 'and').replace(/,/g, '').replace(/\s+/g, ' ');
  for (const t of allowed) {
    const tCleaned = t.toLowerCase().replace(/&/g, 'and').replace(/,/g, '').replace(/\s+/g, ' ');
    if (tCleaned === stripped) return t;
  }

  // Common aliases
  const ALIASES: Record<string, string> = {
    'profit and loss': 'Profit & Loss',
    'profit & loss': 'Profit & Loss',
    'profit loss': 'Profit & Loss',
    'time and work': 'Time & Work',
    'time & work': 'Time & Work',
    'time speed and distance': 'Time Speed Distance',
    'time speed distance': 'Time Speed Distance',
    'ratio and proportion': 'Ratio & Proportion',
    'ratio & proportion': 'Ratio & Proportion',
    'permutation and combination': 'Permutation & Combination',
    'permutation & combination': 'Permutation & Combination',
    'statement and conclusion': 'Statement & Conclusion',
    'statement & conclusion': 'Statement & Conclusion',
    'blood relation': 'Blood Relations',
    'blood relations': 'Blood Relations',
    'coding decoding': 'Coding-Decoding',
    'reading comprehension': 'Reading Comprehension',
    'data interpretation': 'Data Interpretation',
    'number system': 'Number System',
    'data structures': 'Data Structures',
    'operating system': 'Operating Systems',
    'operating systems': 'Operating Systems',
    'computer network': 'Computer Networks',
    'computer networks': 'Computer Networks',
  };

  if (ALIASES[cleaned]) {
    const matched = allowed.find((t) => t.toLowerCase() === ALIASES[cleaned].toLowerCase());
    if (matched) return matched;
  }

  return null;
}

/**
 * Normalizes difficulty (handles DIFFICULT <-> HARD, EASY, MEDIUM)
 */
export function canonicalizeDifficulty(rawDiff: string): QuestionDifficulty {
  if (!rawDiff) return 'MEDIUM';
  const upper = rawDiff.trim().toUpperCase();
  if (upper === 'DIFFICULT' || upper === 'HARD') return 'HARD';
  if (upper === 'EASY') return 'EASY';
  return 'MEDIUM';
}

// =============================================================================
// DTOs & Interfaces
// =============================================================================

export interface QuestionOptionDto {
  id: string;
  questionId: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionOptionDto {
  id?: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface ConfidenceScores {
  category: number;
  topic: number;
  difficulty: number;
  questionType: number;
  answer?: number;
  overall?: number;
}

export interface QuestionAiClassificationDto {
  id: string;
  questionId: string;
  suggestedCategory: QuestionCategory;
  suggestedTopic: string;
  suggestedDifficulty: QuestionDifficulty;
  suggestedQuestionType: QuestionType;
  categoryConfidence: number;
  topicConfidence: number;
  difficultyConfidence: number;
  typeConfidence: number;
  overallConfidence: number;
  reasoning?: string | null;
  status: AiClassificationStatus;
  rawAiResponse?: string | null;
  errorMessage?: string | null;
  modelName?: string | null;
  isApproved: boolean;
  approvedAt?: Date | null;
  approvedById?: string | null;
  reviewedCategory?: QuestionCategory | null;
  reviewedTopic?: string | null;
  reviewedDifficulty?: QuestionDifficulty | null;
  reviewedQuestionType?: QuestionType | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionDto {
  id: string;
  companyId?: string | null;
  exactHash?: string | null;
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  questionText: string;
  marks: number;
  negativeMarks: number;
  correctAnswer?: string | null;
  explanation?: string | null;
  imageUrl?: string | null;
  status: QuestionStatus;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
  options: QuestionOptionDto[];
  company?: { id: string; name: string; code: string } | null;
  companyQuestions?: Array<{
    id: string;
    companyId: string;
    source?: string | null;
    year?: number | null;
    occurrenceCount: number;
    label: string;
  }>;
  createdBy?: { id: string; email: string } | null;
  aiClassification?: QuestionAiClassificationDto | null;
  _count?: {
    usages: number;
  };
}

export interface CreateQuestionDto {
  id?: string;
  companyId?: string | null;
  exactHash?: string | null;
  category: QuestionCategory;
  topic: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  questionText: string;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string | null;
  status?: QuestionStatus;
  options?: CreateQuestionOptionDto[];
  autoClassify?: boolean;
  aiClassification?: {
    categoryConfidence?: number;
    topicConfidence?: number;
    difficultyConfidence?: number;
    typeConfidence?: number;
    overallConfidence?: number;
    reasoning?: string | null;
    status?: AiClassificationStatus;
    isApproved?: boolean;
    approvedById?: string | null;
  };
}

export interface UpdateQuestionDto {
  companyId?: string | null;
  exactHash?: string | null;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  questionText?: string;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: string;
  explanation?: string;
  imageUrl?: string | null;
  status?: QuestionStatus;
  options?: CreateQuestionOptionDto[];
}

export interface QuestionQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: string;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  status?: QuestionStatus;
  aiStatus?: AiClassificationStatus;
  sortBy?: 'createdAt' | 'marks' | 'difficulty' | 'questionType' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface AiClassifyQuestionInput {
  questionId?: string;
  questionText: string;
  imageUrl?: string | null;
  options?: Array<{ optionText: string; isCorrect?: boolean }>;
  correctAnswer?: string | null;
  explanation?: string | null;
}

export interface AiClassifyResult {
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  confidence: ConfidenceScores;
  reasoning: string;
  status: AiClassificationStatus;
  rawAiResponse?: string;
  modelName?: string;
}

export interface AdminReviewClassificationDto {
  action: 'APPROVE' | 'ACCEPT_AI' | 'ACCEPT' | 'OVERRIDE' | 'SEND_TO_REVIEW';
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  notes?: string;
}

export interface BatchClassifyResult {
  totalRequested: number;
  processed: number;
  classified: number;
  needsReview: number;
  failed: number;
  results: Array<{
    questionId: string;
    status: AiClassificationStatus;
    classification?: AiClassifyResult;
    error?: string;
  }>;
}

export interface QuestionUsageDto {
  id: string;
  questionId: string;
  assessmentId?: string | null;
  studentId?: string | null;
  usageMonth: number;
  usageYear: number;
  usedAt: Date;
}

export interface CreateQuestionUsageDto {
  questionId: string;
  assessmentId?: string;
  studentId?: string;
  usageMonth: number;
  usageYear: number;
}

export type ExtractedQuestionStatus = 'CLASSIFIED' | 'NEEDS_REVIEW' | 'DUPLICATE' | 'AI_FAILED';

export interface ExtractedQuestionDto {
  tempId?: string;
  companyId?: string | null;
  questionNumber?: number | string;
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  questionText: string;
  imageUrl?: string | null;
  hasUnresolvedDiagram?: boolean;
  diagramReviewNote?: string | null;
  marks: number;
  negativeMarks: number;
  correctAnswer?: string | null;
  documentAnswer?: string | null;
  aiVerifiedAnswer?: string | null;
  hasDocumentAnswer?: boolean;
  explanation?: string | null;
  options: CreateQuestionOptionDto[];
  confidence: ConfidenceScores;
  reasoning?: string | null;
  status: ExtractedQuestionStatus;
  isDuplicate: boolean;
  duplicateOfId?: string | null;
  duplicateReason?: string | null;
  isApproved?: boolean;
}

export interface GeminiParsedQuestionResult {
  detectedCompany: string | null;
  detectedYear: number | null;
  totalParsed: number;
  totalValid: number;
  totalNeedsReview: number;
  totalDuplicates: number;
  totalFailed: number;
  questions: ExtractedQuestionDto[];
}
