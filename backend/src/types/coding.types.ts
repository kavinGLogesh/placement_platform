import { CodingLanguage, CodingSubmissionType, CodingExecutionStatus } from '@prisma/client';

export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['c', 'cpp', 'python', 'java'] as const;

export const LANGUAGE_PRISMA_MAP: Record<SupportedLanguage, CodingLanguage> = {
  c: CodingLanguage.C,
  cpp: CodingLanguage.CPP,
  python: CodingLanguage.PYTHON,
  java: CodingLanguage.JAVA,
};

export const PRISMA_LANGUAGE_MAP: Record<CodingLanguage, SupportedLanguage> = {
  [CodingLanguage.C]: 'c',
  [CodingLanguage.CPP]: 'cpp',
  [CodingLanguage.PYTHON]: 'python',
  [CodingLanguage.JAVA]: 'java',
};

export const JUDGE0_LANGUAGE_IDS: Record<SupportedLanguage, number> = {
  c: 50,      // C (GCC 9.2.0)
  cpp: 54,    // C++ (GCC 9.2.0)
  python: 71, // Python (3.8.1)
  java: 62,   // Java (OpenJDK 13.0.1)
};

export interface CodingTestCase {
  index: number;
  isSample: boolean;
  input: string;
  expectedOutput: string;
  explanation?: string;
  timeLimitSeconds?: number;
  memoryLimitKb?: number;
}

export interface CodingQuestionDetails {
  title?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  starterCode?: Record<SupportedLanguage, string>;
  testCases: CodingTestCase[];
  timeLimitSeconds?: number;
  memoryLimitKb?: number;
}

export interface SampleTestCaseDto {
  index: number;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface SanitizedCodingQuestionDto {
  id: string;
  category: 'CODING';
  topic: string;
  difficulty: string;
  marks: number;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  starterCode: Record<SupportedLanguage, string>;
  sampleTestCases: SampleTestCaseDto[];
  totalHiddenTestCases: number;
  timeLimitSeconds: number;
  memoryLimitKb: number;
  lastSubmission?: {
    id: string;
    language: SupportedLanguage;
    sourceCode: string;
    status: CodingExecutionStatus;
    submissionType: CodingSubmissionType;
    passedTestCount: number;
    totalTestCount: number;
    createdAt: Date;
  } | null;
}

export interface RunCodeDto {
  language: SupportedLanguage;
  sourceCode: string;
}

export interface SubmitCodeDto {
  language: SupportedLanguage;
  sourceCode: string;
}

export interface SampleExecutionResultDto {
  testCaseIndex: number;
  status: CodingExecutionStatus;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime?: number;
  memoryUsed?: number;
  errorMessage?: string;
}

export interface HiddenExecutionSummaryDto {
  passedTestCount: number;
  totalHiddenCount: number;
}

export interface CodingExecutionResponseDto {
  submissionId: string;
  submissionType: CodingSubmissionType;
  status: CodingExecutionStatus;
  passedTestCount: number;
  totalTestCount: number;
  executionTime: number;
  memoryUsed: number;
  compileError?: string | null;
  runtimeError?: string | null;
  sampleResults: SampleExecutionResultDto[];
  hiddenResultsSummary?: HiddenExecutionSummaryDto;
  marksAwarded?: number;
  totalMarks?: number;
  createdAt: Date;
}

export interface SubmissionHistoryItemDto {
  id: string;
  language: SupportedLanguage;
  submissionType: CodingSubmissionType;
  status: CodingExecutionStatus;
  passedTestCount: number;
  totalTestCount: number;
  executionTime?: number | null;
  memoryUsed?: number | null;
  createdAt: Date;
}

export interface Judge0SubmissionRequest {
  source_code: string;
  language_id: number;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
}

export interface Judge0SubmissionResponse {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | number | null;
  memory?: number | null;
  status: {
    id: number;
    description: string;
  };
  token?: string;
}
