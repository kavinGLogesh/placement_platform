export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java';

export type CodingExecutionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'INTERNAL_ERROR'
  | 'EXECUTION_FAILED';

export interface SampleTestCase {
  index: number;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface CodingQuestion {
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
  sampleTestCases: SampleTestCase[];
  totalHiddenTestCases: number;
  timeLimitSeconds: number;
  memoryLimitKb: number;
  lastSubmission?: {
    id: string;
    language: SupportedLanguage;
    sourceCode: string;
    status: CodingExecutionStatus;
    submissionType: 'RUN' | 'SUBMIT';
    passedTestCount: number;
    totalTestCount: number;
    createdAt: string;
  } | null;
}

export interface SampleExecutionResult {
  testCaseIndex: number;
  status: CodingExecutionStatus;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime?: number;
  memoryUsed?: number;
  errorMessage?: string;
}

export interface HiddenExecutionSummary {
  passedTestCount: number;
  totalHiddenCount: number;
}

export interface CodingExecutionResponse {
  submissionId: string;
  submissionType: 'RUN' | 'SUBMIT';
  status: CodingExecutionStatus;
  passedTestCount: number;
  totalTestCount: number;
  executionTime: number;
  memoryUsed: number;
  compileError?: string | null;
  runtimeError?: string | null;
  sampleResults: SampleExecutionResult[];
  hiddenResultsSummary?: HiddenExecutionSummary;
  marksAwarded?: number;
  totalMarks?: number;
  createdAt: string;
}

export interface SubmissionHistoryItem {
  id: string;
  language: SupportedLanguage;
  submissionType: 'RUN' | 'SUBMIT';
  status: CodingExecutionStatus;
  passedTestCount: number;
  totalTestCount: number;
  executionTime?: number | null;
  memoryUsed?: number | null;
  createdAt: string;
}
