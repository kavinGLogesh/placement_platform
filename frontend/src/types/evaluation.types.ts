export type GdRoundStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type InterviewType = 'MOCK' | 'HR' | 'TECHNICAL' | 'MANAGERIAL';
export type InterviewRoundStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';
export type EvaluationStatus = 'COMPLETED' | 'DRAFT' | 'EVALUATED' | 'PENDING';

export interface CriterionConfig {
  id?: string;
  name: string;
  maxMarks: number;
  order: number;
}

export const DEFAULT_GD_CRITERIA: CriterionConfig[] = [
  { name: 'Communication', maxMarks: 10, order: 1 },
  { name: 'Confidence', maxMarks: 10, order: 2 },
  { name: 'Subject Knowledge', maxMarks: 10, order: 3 },
  { name: 'Participation', maxMarks: 10, order: 4 },
  { name: 'Listening & Response', maxMarks: 10, order: 5 },
  { name: 'Teamwork', maxMarks: 10, order: 6 },
  { name: 'Leadership', maxMarks: 10, order: 7 },
  { name: 'Grammar / Language', maxMarks: 10, order: 8 },
  { name: 'Body Language', maxMarks: 10, order: 9 },
  { name: 'Overall Presentation', maxMarks: 10, order: 10 },
];

export const DEFAULT_INTERVIEW_CRITERIA: CriterionConfig[] = [
  { name: 'Communication Skills', maxMarks: 10, order: 1 },
  { name: 'Confidence', maxMarks: 10, order: 2 },
  { name: 'Technical Knowledge', maxMarks: 10, order: 3 },
  { name: 'Problem Solving', maxMarks: 10, order: 4 },
  { name: 'Body Language', maxMarks: 10, order: 5 },
  { name: 'Eye Contact', maxMarks: 10, order: 6 },
  { name: 'Professional Behaviour', maxMarks: 10, order: 7 },
  { name: 'Answer Relevance', maxMarks: 10, order: 8 },
  { name: 'Grammar / Language', maxMarks: 10, order: 9 },
  { name: 'Overall Impression', maxMarks: 10, order: 10 },
];

export interface EvaluationComparisonDto {
  previousScore: number | null;
  currentScore: number;
  difference: number | null;
  displayText: string;
  previousEvaluatedAt: string | null;
  currentEvaluatedAt: string;
}

export interface GdCriterionScoreDto {
  id: string;
  criterionId: string;
  criterionName: string;
  score: number;
  maxMarks: number;
  comment?: string;
}

export interface GdEvaluationDto {
  id: string;
  participantId: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail?: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  feedback?: string;
  status: EvaluationStatus;
  evaluatedAt: string;
  criterionScores: GdCriterionScoreDto[];
  comparison?: EvaluationComparisonDto;
}

export interface GdParticipantDto {
  id: string;
  roundId: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  collegeEmail: string;
  departmentId?: string;
  departmentName?: string;
  courseId?: string;
  courseName?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  attendance: AttendanceStatus;
  evaluation: GdEvaluationDto | null;
  createdAt: string;
}

export interface GdRoundDto {
  id: string;
  title: string;
  topic: string;
  instructions?: string;
  scheduledDate: string;
  durationMinutes: number;
  status: GdRoundStatus;
  evaluatorId?: string | null;
  evaluatorName?: string | null;
  evaluatorEmail?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  batchYear?: number | null;
  criteria: Array<{
    id: string;
    name: string;
    maxMarks: number;
    order: number;
  }>;
  totalParticipants: number;
  evaluatedCount: number;
  averageScore: number | null;
  participants: GdParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface InterviewCriterionScoreDto {
  id: string;
  criterionId: string;
  criterionName: string;
  score: number;
  maxMarks: number;
  comment?: string;
}

export interface InterviewEvaluationDto {
  id: string;
  participantId: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorEmail?: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
  status: EvaluationStatus;
  evaluatedAt: string;
  criterionScores: InterviewCriterionScoreDto[];
  comparison?: EvaluationComparisonDto;
}

export interface InterviewParticipantDto {
  id: string;
  roundId: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  collegeEmail: string;
  departmentName?: string;
  courseName?: string;
  attendance: AttendanceStatus;
  evaluation: InterviewEvaluationDto | null;
  createdAt: string;
}

export interface InterviewRoundDto {
  id: string;
  title: string;
  interviewType: InterviewType;
  instructions?: string;
  scheduledDate: string;
  durationMinutes: number;
  status: InterviewRoundStatus;
  evaluatorId?: string | null;
  evaluatorName?: string | null;
  evaluatorEmail?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  courseId?: string | null;
  courseName?: string | null;
  batchYear?: number | null;
  criteria: Array<{
    id: string;
    name: string;
    maxMarks: number;
    order: number;
  }>;
  totalParticipants: number;
  evaluatedCount: number;
  averageScore: number | null;
  participants: InterviewParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentEvaluationItemDto {
  roundId: string;
  title: string;
  topic?: string;
  interviewType?: InterviewType;
  instructions?: string;
  scheduledDate: string;
  durationMinutes: number;
  evaluatorName?: string;
  participantId: string;
  attendance: AttendanceStatus;
  evaluation: GdEvaluationDto | InterviewEvaluationDto | null;
  comparison?: EvaluationComparisonDto;
}

export interface StudentHumanEvaluationSummaryDto {
  gd: {
    totalAssigned: number;
    totalEvaluated: number;
    averagePercentage: number;
    latestPercentage: number | null;
    progression: EvaluationComparisonDto[];
  };
  interview: {
    totalAssigned: number;
    totalEvaluated: number;
    averagePercentage: number;
    latestPercentage: number | null;
    progression: EvaluationComparisonDto[];
  };
}

export interface CreateGdRoundInput {
  title: string;
  topic: string;
  instructions?: string;
  scheduledDate: string;
  durationMinutes?: number;
  evaluatorId?: string;
  departmentId?: string;
  courseId?: string;
  batchYear?: number;
  criteria?: CriterionConfig[];
  studentIds?: string[];
}

export interface CreateInterviewRoundInput {
  title: string;
  interviewType: InterviewType;
  instructions?: string;
  scheduledDate: string;
  durationMinutes?: number;
  evaluatorId?: string;
  departmentId?: string;
  courseId?: string;
  batchYear?: number;
  criteria?: CriterionConfig[];
  studentIds?: string[];
}

export interface SubmitGdEvaluationInput {
  participantId: string;
  feedback?: string;
  criterionScores: Array<{
    criterionId: string;
    score: number;
    comment?: string;
  }>;
}

export interface SubmitInterviewEvaluationInput {
  participantId: string;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
  criterionScores: Array<{
    criterionId: string;
    score: number;
    comment?: string;
  }>;
}

// =============================================================================
// BULK EVALUATION TYPES
// =============================================================================

export interface BulkStudentEvaluationScoreInput {
  criterionId: string;
  score: number;
  comment?: string;
}

export interface BulkStudentEvaluationItemInput {
  studentId: string;
  participantId?: string;
  scores: BulkStudentEvaluationScoreInput[];
  feedback?: string;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
}

export interface BulkEvaluationRequestDto {
  evaluations: BulkStudentEvaluationItemInput[];
  isDraft?: boolean;
}

export interface BulkEvaluationSingleResultDto {
  studentId: string;
  participantId: string;
  evaluationId: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  status: EvaluationStatus;
  studentName?: string;
  registerNumber?: string;
}

export interface BulkEvaluationResultDto {
  roundId: string;
  roundTitle: string;
  isDraft: boolean;
  totalProcessed: number;
  results: BulkEvaluationSingleResultDto[];
}
