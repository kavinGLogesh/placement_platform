export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'html';

export type ProficiencyRating = 'Strong' | 'Moderate' | 'Needs Improvement';

export interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
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
  pagination: PaginationMeta;
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
  pagination: PaginationMeta;
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
  pagination: PaginationMeta;
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
  pagination: PaginationMeta;
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

// 9. GD Performance Report
export interface GdPerformanceRowDto {
  roundId: string;
  roundTitle: string;
  topic: string;
  scheduledDate: string;
  evaluatorName: string;
  departmentName: string;
  studentId: string;
  registerNumber: string;
  studentName: string;
  attendance: string;
  totalScore: number | null;
  maxPossibleMarks: number | null;
  percentage: number | null;
  feedback?: string;
  evaluatedAt: string | null;
}

export interface GdPerformanceReportDto {
  summary: {
    totalRounds: number;
    totalParticipants: number;
    totalPresent: number;
    totalEvaluated: number;
    overallAveragePercentage: number;
  };
  pagination: PaginationMeta;
  rows: GdPerformanceRowDto[];
}

// 10. Interview Performance Report
export interface InterviewPerformanceRowDto {
  roundId: string;
  roundTitle: string;
  interviewType: string;
  scheduledDate: string;
  interviewerName: string;
  departmentName: string;
  studentId: string;
  registerNumber: string;
  studentName: string;
  attendance: string;
  totalScore: number | null;
  maxPossibleMarks: number | null;
  percentage: number | null;
  strengths?: string;
  areasForImprovement?: string;
  overallFeedback?: string;
  evaluatedAt: string | null;
}

export interface InterviewPerformanceReportDto {
  summary: {
    totalRounds: number;
    totalParticipants: number;
    totalPresent: number;
    totalEvaluated: number;
    overallAveragePercentage: number;
  };
  pagination: PaginationMeta;
  rows: InterviewPerformanceRowDto[];
}

