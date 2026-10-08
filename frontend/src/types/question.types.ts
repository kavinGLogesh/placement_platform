export type QuestionCategory =
  | 'QUANTITATIVE_APTITUDE'
  | 'LOGICAL_REASONING'
  | 'VERBAL_ABILITY'
  | 'TECHNICAL_MCQ'
  | 'CODING';

export type QuestionDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type QuestionType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'DESCRIPTIVE'
  | 'CODING';

export type QuestionStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

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

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionOptionInput {
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export type AiClassificationStatus =
  | 'AI_PENDING'
  | 'CLASSIFIED'
  | 'NEEDS_REVIEW'
  | 'AI_FAILED';

export interface ConfidenceScores {
  category: number;
  topic: number;
  difficulty: number;
  questionType: number;
  answer?: number;
  overall?: number;
}

export interface QuestionAiClassification {
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
  approvedAt?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  companyId?: string | null;
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  questionText: string;
  imageUrl?: string | null;
  marks: number;
  negativeMarks: number;
  correctAnswer?: string | null;
  explanation?: string | null;
  status: QuestionStatus;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  options: QuestionOption[];
  createdBy?: { id: string; email: string } | null;
  company?: { id: string; name: string; code: string; logoUrl?: string | null } | null;
  aiClassification?: QuestionAiClassification | null;
  _count?: {
    usages: number;
  };
}

export interface CreateQuestionInput {
  companyId?: string | null;
  category: QuestionCategory;
  topic: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  questionText: string;
  imageUrl?: string | null;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: string;
  explanation?: string;
  status?: QuestionStatus;
  options?: CreateQuestionOptionInput[];
  autoClassify?: boolean;
}

export interface UpdateQuestionInput {
  companyId?: string | null;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  questionText?: string;
  imageUrl?: string | null;
  marks?: number;
  negativeMarks?: number;
  correctAnswer?: string;
  explanation?: string;
  status?: QuestionStatus;
  options?: CreateQuestionOptionInput[];
}

export interface QuestionFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  status?: QuestionStatus;
  aiStatus?: AiClassificationStatus;
  companyId?: string | null;
  sortBy?: 'createdAt' | 'marks' | 'difficulty' | 'questionType' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminReviewClassificationInput {
  action: 'APPROVE' | 'ACCEPT_AI' | 'ACCEPT' | 'OVERRIDE' | 'SEND_TO_REVIEW';
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  notes?: string;
}

export interface AiDetectInput {
  questionText: string;
  options?: Array<{ optionText: string; isCorrect?: boolean }>;
  correctAnswer?: string | null;
  explanation?: string | null;
}

export interface AiDetectResult {
  category: QuestionCategory;
  topic: string;
  difficulty: QuestionDifficulty;
  questionType: QuestionType;
  confidence: ConfidenceScores;
  reasoning: string;
  status: AiClassificationStatus;
  modelName?: string;
}

export interface BatchClassifyResponse {
  totalRequested: number;
  processed: number;
  classified: number;
  needsReview: number;
  failed: number;
  results: Array<{
    questionId: string;
    status: AiClassificationStatus;
    classification?: AiDetectResult;
    error?: string;
  }>;
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
  options: CreateQuestionOptionInput[];
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
