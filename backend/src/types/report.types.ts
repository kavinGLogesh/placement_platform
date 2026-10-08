export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'html';

export type ProficiencyRating = 'Strong' | 'Moderate' | 'Needs Improvement';

// Common Filter Queries
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentReportFilterQuery extends PaginationQuery {
  academicYear?: number;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  assessmentId?: string;
  isPassed?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface AssessmentReportFilterQuery extends PaginationQuery {
  assessmentId?: string;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  isPassed?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface DepartmentReportFilterQuery {
  assessmentId?: string;
  academicYear?: number;
  startDate?: string;
  endDate?: string;
}

export interface TopicReportFilterQuery {
  assessmentId?: string;
  departmentId?: string;
  category?: string;
  topic?: string;
  startDate?: string;
  endDate?: string;
}

export interface QuestionReportFilterQuery extends PaginationQuery {
  assessmentId?: string;
  category?: string;
  difficulty?: string;
  topic?: string;
  search?: string;
}

export interface CodingReportFilterQuery extends PaginationQuery {
  assessmentId?: string;
  studentId?: string;
  language?: string;
  status?: string;
  departmentId?: string;
  startDate?: string;
  endDate?: string;
}

export interface FunnelReportFilterQuery {
  assessmentId?: string;
  departmentId?: string;
  batchYear?: number;
}

export interface StudentOwnReportFilterQuery extends PaginationQuery {
  assessmentId?: string;
  startDate?: string;
  endDate?: string;
}

// 1. Student Performance Report
export interface StudentPerformanceRowDto {
  studentId: string;
  registerNumber: string;
  studentName: string;
  departmentCode: string;
  departmentName: string;
  courseCode: string;
  className: string;
  sectionName: string;
  academicYear: number;
  assessmentsAssigned: number;
  assessmentsCompleted: number;
  totalMarksObtained: number;
  totalMarksPossible: number;
  averagePercentage: number;
  averageAccuracy: number;
  passCount: number;
  failCount: number;
  overallPassed: boolean;
  lastAssessmentDate: string | null;
}

export interface StudentPerformanceReportDto {
  summary: {
    totalStudents: number;
    totalAssessmentsCompleted: number;
    overallAveragePercentage: number;
    overallAverageAccuracy: number;
    overallPassRate: number;
  };
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  rows: StudentPerformanceRowDto[];
}

// 2. Assessment Result Report
export interface AssessmentResultRowDto {
  resultId: string;
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentCode: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  accuracy: number;
  isPassed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  submittedAt: string | null;
}

export interface AssessmentResultReportDto {
  summary: {
    assessmentTitle?: string;
    totalAssigned: number;
    totalAppeared: number;
    totalPassed: number;
    passRate: number;
    highestScore: number;
    lowestScore: number;
    averageScore: number;
    averagePercentage: number;
  };
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  rows: AssessmentResultRowDto[];
}

// 3. Department Performance Report
export interface DepartmentPerformanceRowDto {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  enrolledStudents: number;
  totalAssessmentsAssigned: number;
  totalAttemptsCompleted: number;
  totalPassed: number;
  passRate: number;
  averagePercentage: number;
  averageAccuracy: number;
  topCategory?: string;
}

export interface DepartmentPerformanceReportDto {
  summary: {
    totalDepartments: number;
    totalStudents: number;
    totalCompletedAttempts: number;
    institutionAveragePercentage: number;
    institutionPassRate: number;
  };
  rows: DepartmentPerformanceRowDto[];
}

// 4. Topic Performance Report
export interface TopicPerformanceRowDto {
  category: string;
  topic: string;
  totalQuestions: number;
  totalAttempts: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  proficiencyRating: ProficiencyRating;
}

export interface TopicPerformanceReportDto {
  summary: {
    totalCategories: number;
    totalTopics: number;
    strongTopicsCount: number;
    needsImprovementCount: number;
    overallAccuracy: number;
  };
  rows: TopicPerformanceRowDto[];
}

// 5. Question Analysis Report
export interface QuestionAnalysisRowDto {
  questionId: string;
  questionSnippet: string;
  category: string;
  topic: string;
  difficulty: string;
  questionType: string;
  marks: number;
  timesAppeared: number;
  timesAnswered: number;
  correctCount: number;
  incorrectCount: number;
  successRatePercentage: number;
  discriminationRating: string;
}

export interface QuestionAnalysisReportDto {
  summary: {
    totalQuestionsAnalyzed: number;
    averageSuccessRate: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
  };
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  rows: QuestionAnalysisRowDto[];
}

// 6. Coding Assessment Report
export interface CodingAssessmentRowDto {
  submissionId: string;
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentCode: string;
  questionTopic: string;
  language: string;
  status: string;
  passedTestCount: number;
  totalTestCount: number;
  scorePercentage: number;
  executionTime: number | null;
  memoryUsed: number | null;
  submittedAt: string;
}

export interface CodingAssessmentReportDto {
  summary: {
    totalSubmissions: number;
    acceptedCount: number;
    acceptanceRate: number;
    avgExecutionTime: number;
    languageBreakdown: Record<string, number>;
  };
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  rows: CodingAssessmentRowDto[];
}

// 7. Placement Funnel Report
export interface FunnelStageReportDto {
  stage: string;
  count: number;
  percentage: number;
  dropOffRate: number;
  isImplemented: boolean;
}

export interface PlacementFunnelReportDto {
  summary: {
    registeredCount: number;
    passedAssessmentCount: number;
    conversionRate: number;
  };
  stages: FunnelStageReportDto[];
}

// 8. Student Own Performance Report
export interface StudentOwnPerformanceReportDto {
  student: {
    id: string;
    name: string;
    registerNumber: string;
    collegeEmail: string;
    departmentCode: string;
    departmentName: string;
    courseCode: string;
    className: string;
    sectionName: string;
    year: number;
    cgpa: number | null;
  };
  summary: {
    totalAssessmentsAssigned: number;
    totalAssessmentsCompleted: number;
    averageScore: number;
    averagePercentage: number;
    overallAccuracy: number;
    passRate: number;
    passedAssessments: number;
    failedAssessments: number;
  };
  assessments: {
    assessmentId: string;
    assessmentTitle: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    accuracy: number;
    isPassed: boolean;
    submittedAt: string | null;
  }[];
  topicProficiency: {
    category: string;
    topic: string;
    accuracyPercentage: number;
    proficiencyRating: ProficiencyRating;
  }[];
}

// Export formatting options
export interface ExportColumnDef {
  header: string;
  key: string;
  width?: number;
  format?: 'string' | 'number' | 'percentage' | 'date' | 'boolean';
}

export interface ExportDataPayload {
  institutionName: string;
  reportTitle: string;
  reportDate: string;
  generatedBy: string;
  appliedFilters: Record<string, string | number | boolean | undefined>;
  summaryMetrics?: Record<string, string | number>;
  columns: ExportColumnDef[];
  data: Record<string, any>[];
}

// -----------------------------------------------------------------------------
// GD & INTERVIEW REPORT INTERFACES
// -----------------------------------------------------------------------------

export interface GdReportFilterQuery {
  page?: number;
  limit?: number;
  departmentId?: string;
  evaluatorId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface GdReportRowDto {
  roundId: string;
  title: string;
  topic: string;
  scheduledDate: string;
  studentName: string;
  registerNumber: string;
  departmentName: string;
  attendance: string;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  evaluatorName: string;
  evaluatedAt: string;
  comparisonText: string;
}

export interface GdPerformanceReportDto {
  totalRounds: number;
  totalParticipants: number;
  totalEvaluated: number;
  averageScorePercentage: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalRounds: number;
    totalParticipants: number;
    totalEvaluated: number;
    averageScorePercentage: number;
    attendanceRate: number;
  };
  rows: GdReportRowDto[];
}

export interface InterviewReportFilterQuery {
  page?: number;
  limit?: number;
  departmentId?: string;
  interviewType?: string;
  evaluatorId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface InterviewReportRowDto {
  roundId: string;
  title: string;
  interviewType: string;
  scheduledDate: string;
  studentName: string;
  registerNumber: string;
  departmentName: string;
  attendance: string;
  totalScore: number;
  maxMarks: number;
  percentage: number;
  evaluatorName: string;
  evaluatedAt: string;
  comparisonText: string;
}

export interface InterviewPerformanceReportDto {
  totalRounds: number;
  totalParticipants: number;
  totalEvaluated: number;
  averageScorePercentage: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalRounds: number;
    totalParticipants: number;
    totalEvaluated: number;
    averageScorePercentage: number;
    attendanceRate: number;
  };
  rows: InterviewReportRowDto[];
}

