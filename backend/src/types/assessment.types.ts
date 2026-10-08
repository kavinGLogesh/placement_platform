import {
  AssessmentStatus,
  AssessmentComponent,
  AssignmentStatus,
  QuestionDifficulty,
  QuestionType,
  QuestionCategory,
} from '@prisma/client';
import { CATEGORY_TOPICS_MAP } from './question.types.js';

export {
  AssessmentStatus,
  AssessmentComponent,
  AssignmentStatus,
  QuestionDifficulty,
  QuestionType,
  QuestionCategory,
};

// =============================================================================
// Authoritative Component -> Category & Topic Mapping
// =============================================================================

export const COMPONENT_CATEGORY_MAP: Record<AssessmentComponent, QuestionCategory> = {
  APTITUDE: 'QUANTITATIVE_APTITUDE',
  LOGICAL_REASONING: 'LOGICAL_REASONING',
  VERBAL_ABILITY: 'VERBAL_ABILITY',
  TECHNICAL_MCQ: 'TECHNICAL_MCQ',
  CODING: 'CODING',
  COMMUNICATION: 'VERBAL_ABILITY',
  PSYCHOMETRIC: 'LOGICAL_REASONING',
};

export const COMPONENT_TOPICS_MAP: Record<AssessmentComponent, readonly string[]> = {
  APTITUDE: CATEGORY_TOPICS_MAP.QUANTITATIVE_APTITUDE,
  LOGICAL_REASONING: CATEGORY_TOPICS_MAP.LOGICAL_REASONING,
  VERBAL_ABILITY: CATEGORY_TOPICS_MAP.VERBAL_ABILITY,
  TECHNICAL_MCQ: CATEGORY_TOPICS_MAP.TECHNICAL_MCQ,
  CODING: CATEGORY_TOPICS_MAP.CODING,
  COMMUNICATION: [
    'Reading Comprehension',
    'Grammar',
    'Vocabulary',
    'Sentence Correction',
    'Error Detection',
    'Para Jumbles',
    'Articles',
    'Prepositions',
  ] as const,
  PSYCHOMETRIC: [
    'Statement & Conclusion',
    'Classification',
    'Puzzles',
    'Analogy',
    'Data Sufficiency',
    'Syllogism',
  ] as const,
};

// =============================================================================
// Interfaces & DTOs
// =============================================================================

export interface AssessmentSectionDto {
  id: string;
  assessmentId: string;
  component: AssessmentComponent;
  name: string;
  sectionOrder: number;
  duration?: number | null;
  topics: string[];
  difficulty?: QuestionDifficulty | null;
  questionType?: QuestionType | null;
  questionsCount: number;
  marksPerQuestion: number;
  negativeMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAssessmentSectionDto {
  component: AssessmentComponent;
  name: string;
  sectionOrder?: number;
  duration?: number | null;
  topics: string[];
  difficulty?: QuestionDifficulty | null;
  questionType?: QuestionType | null;
  questionsCount: number;
  marksPerQuestion?: number;
  negativeMarks?: number;
}

export interface AssessmentDto {
  id: string;
  companyId?: string | null;
  isCompanyAssessment?: boolean;
  name: string;
  description?: string | null;
  duration: number; // in minutes
  maximumAttempts: number;
  negativeMarking: boolean;
  randomQuestions: boolean;
  randomOptions: boolean;
  passingPercentage: number;
  startDate?: Date | null;
  endDate?: Date | null;
  status: AssessmentStatus;
  totalMarks: number;
  totalQuestions: number;
  numberOfPapers: number;
  createdById?: string | null;
  createdAt: Date;
  updatedAt: Date;
  company?: { id: string; name: string; code: string; logoUrl?: string | null } | null;
  sections?: AssessmentSectionDto[];
  papersCount?: number;
  assignmentsCount?: number;
  departmentTargeting?: 'ALL' | 'SPECIFIC';
  departmentIds?: string[];
}

export interface CreateAssessmentDto {
  name: string;
  companyId?: string | null;
  isCompanyAssessment?: boolean;
  description?: string | null;
  duration: number;
  maximumAttempts?: number;
  negativeMarking?: boolean;
  randomQuestions?: boolean;
  randomOptions?: boolean;
  passingPercentage?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  numberOfPapers?: number;
  departmentTargeting?: 'ALL' | 'SPECIFIC';
  departmentIds?: string[];
  sections: CreateAssessmentSectionDto[];
}

export interface UpdateAssessmentDto {
  name?: string;
  companyId?: string | null;
  isCompanyAssessment?: boolean;
  description?: string | null;
  duration?: number;
  maximumAttempts?: number;
  negativeMarking?: boolean;
  randomQuestions?: boolean;
  randomOptions?: boolean;
  passingPercentage?: number;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  numberOfPapers?: number;
  departmentTargeting?: 'ALL' | 'SPECIFIC';
  departmentIds?: string[];
  sections?: CreateAssessmentSectionDto[];
}

export interface RandomizedOptionDto {
  id: string;
  optionText: string;
  optionOrder: number;
  isCorrect: boolean;
}

export interface AssessmentQuestionDto {
  id: string;
  paperId: string;
  sectionId?: string | null;
  questionId: string;
  questionOrder: number;
  marks: number;
  negativeMarks: number;
  questionText?: string;
  category?: QuestionCategory;
  topic?: string;
  difficulty?: QuestionDifficulty;
  questionType?: QuestionType;
  imageUrl?: string | null;
  randomizedOptions?: RandomizedOptionDto[];
  createdAt: Date;
}

export interface AssessmentPaperDto {
  id: string;
  assessmentId: string;
  paperCode: string;
  paperIndex: number;
  createdAt: Date;
  questions?: AssessmentQuestionDto[];
}

export interface AssessmentAssignmentDto {
  id: string;
  assessmentId: string;
  studentId?: string | null;
  departmentId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  paperId?: string | null;
  status: AssignmentStatus;
  assignedAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
  } | null;
  paper?: {
    id: string;
    paperCode: string;
    paperIndex: number;
  } | null;
}

export interface CreateAssignmentDto {
  studentIds?: string[];
  departmentId?: string;
  classId?: string;
  sectionId?: string;
}

export interface AssessmentQueryFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: AssessmentStatus;
  companyId?: string;
  isCompanyAssessment?: boolean;
  sortBy?: 'name' | 'duration' | 'totalQuestions' | 'createdAt' | 'status' | 'startDate';
  sortOrder?: 'asc' | 'desc';
}

export interface QuestionShortageDetail {
  sectionName: string;
  component: AssessmentComponent;
  category: QuestionCategory;
  topics: string[];
  difficulty: QuestionDifficulty | 'ANY';
  questionType: QuestionType | 'ANY';
  required: number;
  available: number;
  missing: number;
}

export interface QuestionShortageErrorPayload {
  message: string;
  error: 'INSUFFICIENT_QUESTIONS';
  required: number;
  available: number;
  missing: number;
  shortages: QuestionShortageDetail[];
}

export interface PaperGenerationResult {
  assessmentId: string;
  numberOfPapers: number;
  totalQuestionsPerPaper: number;
  totalQuestionsAllocated: number;
  papers: {
    id: string;
    paperCode: string;
    paperIndex: number;
    questionsCount: number;
  }[];
}
