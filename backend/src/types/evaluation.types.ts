export type GdRoundStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type InterviewType = 'MOCK' | 'HR' | 'TECHNICAL' | 'MANAGERIAL';
export type InterviewRoundStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';
export type EvaluationStatus = 'PENDING' | 'DRAFT' | 'EVALUATED';

export interface CriterionConfig {
  id?: string;
  name: string;
  maxMarks?: number;
  order?: number;
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

// -----------------------------------------------------------------------------
// GD DTOs
// -----------------------------------------------------------------------------

export interface CreateGdRoundDto {
  title: string;
  topic: string;
  instructions?: string;
  scheduledDate: string | Date;
  durationMinutes?: number;
  evaluatorId?: string;
  departmentId?: string;
  courseId?: string;
  batchYear?: number;
  criteria?: CriterionConfig[];
  studentIds?: string[];
}

export interface UpdateGdRoundDto {
  title?: string;
  topic?: string;
  instructions?: string;
  scheduledDate?: string | Date;
  durationMinutes?: number;
  status?: GdRoundStatus;
  evaluatorId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  batchYear?: number | null;
  criteria?: CriterionConfig[];
}

export interface CriterionScoreInput {
  criterionId: string;
  score: number;
  comment?: string;
}

export interface SubmitGdEvaluationDto {
  participantId: string;
  feedback?: string;
  criterionScores: CriterionScoreInput[];
}

export interface UpdateGdAttendanceDto {
  participantId: string;
  attendance: AttendanceStatus;
}

export interface BatchGdAttendanceDto {
  records: Array<{
    participantId: string;
    attendance: AttendanceStatus;
  }>;
}

export interface AssignStudentsDto {
  studentIds: string[];
}

// -----------------------------------------------------------------------------
// Interview DTOs
// -----------------------------------------------------------------------------

export interface CreateInterviewRoundDto {
  title: string;
  interviewType: InterviewType;
  instructions?: string;
  scheduledDate: string | Date;
  durationMinutes?: number;
  evaluatorId?: string;
  departmentId?: string;
  courseId?: string;
  batchYear?: number;
  criteria?: CriterionConfig[];
  studentIds?: string[];
}

export interface UpdateInterviewRoundDto {
  title?: string;
  interviewType?: InterviewType;
  instructions?: string;
  scheduledDate?: string | Date;
  durationMinutes?: number;
  status?: InterviewRoundStatus;
  evaluatorId?: string | null;
  departmentId?: string | null;
  courseId?: string | null;
  batchYear?: number | null;
}

export interface SubmitInterviewEvaluationDto {
  participantId: string;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
  criterionScores: CriterionScoreInput[];
}

export interface UpdateInterviewAttendanceDto {
  participantId: string;
  attendance: AttendanceStatus;
}

export interface BatchInterviewAttendanceDto {
  records: Array<{
    participantId: string;
    attendance: AttendanceStatus;
  }>;
}

// -----------------------------------------------------------------------------
// Response Models & Evaluation Comparison
// -----------------------------------------------------------------------------

export interface EvaluationComparisonDto {
  previousScore: number | null;
  currentScore: number | null;
  improvement: number | null;
  displayText: string;
  previousEvaluationDate?: string | null;
  currentEvaluationDate?: string | null;
}

export interface GdCriterionScoreDto {
  id: string;
  criterionId: string;
  criterionName: string;
  score: number;
  maxMarks: number;
  comment?: string | null;
}

export interface GdEvaluationDto {
  id: string;
  participantId: string;
  evaluatorId: string;
  evaluatorName?: string;
  evaluatorEmail?: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  feedback?: string | null;
  status: EvaluationStatus;
  evaluatedAt: string | Date;
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
  evaluation?: GdEvaluationDto | null;
  createdAt: string | Date;
}

export interface GdRoundDto {
  id: string;
  title: string;
  topic: string;
  instructions?: string | null;
  scheduledDate: string | Date;
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
  averageScore?: number | null;
  participants?: GdParticipantDto[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InterviewCriterionScoreDto {
  id: string;
  criterionId: string;
  criterionName: string;
  score: number;
  maxMarks: number;
  comment?: string | null;
}

export interface InterviewEvaluationDto {
  id: string;
  participantId: string;
  evaluatorId: string;
  evaluatorName?: string;
  evaluatorEmail?: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  strengths?: string | null;
  areasForImprovement?: string | null;
  overallFeedback?: string | null;
  status: EvaluationStatus;
  evaluatedAt: string | Date;
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
  evaluation?: InterviewEvaluationDto | null;
  createdAt: string | Date;
}

export interface InterviewRoundDto {
  id: string;
  title: string;
  interviewType: InterviewType;
  instructions?: string | null;
  scheduledDate: string | Date;
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
  averageScore?: number | null;
  participants?: InterviewParticipantDto[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface StudentHumanEvaluationSummaryDto {
  gd: {
    totalAssigned: number;
    totalAttended: number;
    totalEvaluated: number;
    averagePercentage: number;
    latestScore: number | null;
    comparison: EvaluationComparisonDto;
    history: Array<{
      roundId: string;
      title: string;
      topic: string;
      scheduledDate: string | Date;
      attendance: AttendanceStatus;
      evaluation: GdEvaluationDto | null;
    }>;
  };
  interview: {
    totalAssigned: number;
    totalAttended: number;
    totalEvaluated: number;
    averagePercentage: number;
    latestScore: number | null;
    comparison: EvaluationComparisonDto;
    history: Array<{
      roundId: string;
      title: string;
      interviewType: InterviewType;
      scheduledDate: string | Date;
      attendance: AttendanceStatus;
      evaluation: InterviewEvaluationDto | null;
    }>;
  };
}

// -----------------------------------------------------------------------------
// Bulk Evaluation DTOs
// -----------------------------------------------------------------------------

export interface BulkStudentEvaluationScoreInput {
  criterionId: string;
  score: number;
  comment?: string;
}

export interface BulkStudentEvaluationItemInput {
  studentId: string;
  participantId?: string;
  feedback?: string;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
  criterionScores?: BulkStudentEvaluationScoreInput[];
  scores?: BulkStudentEvaluationScoreInput[];
}

export interface BulkEvaluationRequestDto {
  isDraft?: boolean;
  evaluations: BulkStudentEvaluationItemInput[];
}

export interface BulkEvaluationSingleResultDto {
  studentId: string;
  participantId: string;
  studentName: string;
  registerNumber: string;
  totalScore: number;
  maxPossibleMarks: number;
  percentage: number;
  status: EvaluationStatus;
  criterionScoresCount: number;
}

export interface BulkEvaluationResultDto {
  roundId: string;
  roundType: 'GD' | 'INTERVIEW';
  status: EvaluationStatus;
  evaluatedCount: number;
  totalProcessed?: number;
  isDraft: boolean;
  results: BulkEvaluationSingleResultDto[];
}

