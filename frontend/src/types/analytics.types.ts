export interface ResultsFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  courseId?: string;
  classId?: string;
  sectionId?: string;
  academicYear?: number;
  assessmentId?: string;
  category?: string;
  companyId?: string;
  isPassed?: boolean;
  status?: string; // AttemptStatus: IN_PROGRESS | SUBMITTED | EXPIRED
  resultStatus?: string; // 'ALL' | 'PASSED' | 'FAILED' | 'PENDING' | 'NOT_APPEARED'
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'percentage' | 'obtainedMarks' | 'accuracy' | 'studentName';
  sortOrder?: 'asc' | 'desc';
}

export interface ResultListItemDto {
  id: string;
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentId?: string;
  departmentName?: string;
  departmentCode?: string;
  courseId?: string;
  courseCode?: string;
  classId?: string;
  className?: string;
  sectionId?: string;
  sectionName?: string;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  accuracy: number;
  isPassed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  submittedAt: string | null;
  createdAt: string;
  attemptStatus?: string;
  timeTakenMinutes?: number | null;
  startTime?: string | null;
  violationCount?: number;
  violations?: Array<{
    id: string;
    violationType: string;
    timestamp: string;
    details?: string;
  }>;
}

export interface PaginatedResultsDto {
  items: ResultListItemDto[];
  pagination: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ScoreDistributionBucketDto {
  range: string;
  label: string;
  count: number;
  percentage: number;
}

export interface AdminAnalyticsSummaryDto {
  totalStudents: number;
  activeStudents: number;
  appearedStudents: number;
  notAppearedStudents: number;
  startedIncompleteCount: number;
  totalAssessments: number;
  activeAssessments: number;
  completedAssessments: number;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
  failPercentage: number;
  overallParticipationRate: number;
  passedCount?: number;
  failedCount?: number;
  scoreDistribution: ScoreDistributionBucketDto[];
  recentResults: ResultListItemDto[];
}

export interface DepartmentAnalyticsDto {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  totalStudents: number;
  participatingStudents: number;
  notAppeared: number;
  completedAssessments: number;
  participationRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
  failPercentage: number;
  averageAccuracy: number;
}

export interface AssessmentWiseSummaryDto {
  assessmentId: string;
  assessmentName: string;
  category: string;
  status: string;
  durationMinutes: number;
  totalMarks: number;
  passingPercentage: number;
  eligibleScope: string;
  totalEligibleStudents: number;
  appearedStudents: number;
  notAppearedStudents: number;
  startedIncompleteCount: number;
  completedAssessments: number;
  passedCount: number;
  failedCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
  failPercentage: number;
}

export interface TopicPerformanceDto {
  topic: string;
  category: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  accuracy: number;
  averageScore: number;
  strength: 'STRONG' | 'AVERAGE' | 'WEAK';
}

export interface CategoryPerformanceDto {
  category: string;
  displayName: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  accuracy: number;
  averageScore: number;
}

export interface TopicAnalyticsDto {
  categories: CategoryPerformanceDto[];
  topics: TopicPerformanceDto[];
}

export interface FunnelStageDto {
  stage: 'Registered' | 'Appeared' | 'Completed' | 'Passed' | 'Interview' | 'Selected';
  count: number;
  conversionRate: number;
  stageConversionRate: number;
  description: string;
  isImplemented: boolean;
}

export interface PlacementFunnelDto {
  totalEligible: number;
  stages: FunnelStageDto[];
  filtersApplied: {
    assessmentId?: string;
    departmentId?: string;
    batchYear?: number;
  };
}

export interface CategoryComparisonDto {
  category: string;
  displayName: string;
  previousScore: number;
  currentScore: number;
  change: number;
}

export interface AssessmentComparisonDto {
  hasCompletedAssessments: boolean;
  canCompare: boolean;
  statusMessage?: string;
  previousTest?: {
    assessmentId: string;
    assessmentTitle: string;
    date: string;
    score: number;
    totalMarks: number;
    percentage: number;
  };
  currentTest?: {
    assessmentId: string;
    assessmentTitle: string;
    date: string;
    score: number;
    totalMarks: number;
    percentage: number;
  };
  scoreChange?: number;
  percentageChange?: number | null;
  percentageChangeDisplay?: string;
  status?: 'Improved' | 'Decreased' | 'No Change';
  categoryComparison?: CategoryComparisonDto[];
}

export interface StudentResumeMetadataDto {
  exists: boolean;
  fileName?: string;
  fileUrl?: string | null;
  uploadedAt?: string;
  status?: string;
  fileSize?: string;
  message?: string;
}

export interface StudentDrilldownDto {
  student: {
    id: string;
    name: string;
    email: string;
    registerNumber: string;
    departmentName: string;
    departmentCode: string;
    courseName: string;
    className: string;
    sectionName: string;
    batchYear: number;
    cgpa: number;
    status: string;
  };
  summary: {
    totalAssigned: number;
    totalAttempted: number;
    totalCompleted: number;
    totalPassed: number;
    averageScore: number;
    averageAccuracy: number;
    passRate: number;
  };
  assessmentHistory: ResultListItemDto[];
  categoryPerformance: CategoryPerformanceDto[];
  codingPerformance: {
    totalSubmissions: number;
    acceptedCount: number;
    partialCount: number;
    failedCount: number;
    passedTestsRatio: number;
    languagesUsed: string[];
  };
  performanceProgress?: AssessmentComparisonDto;
  resume?: StudentResumeMetadataDto;
  humanEvaluation?: {
    gd: {
      totalAssigned: number;
      totalEvaluated: number;
      averagePercentage: number;
      latestPercentage: number | null;
      progression: Array<{
        previousScore: number | null;
        currentScore: number;
        difference: number | null;
        displayText: string;
      }>;
    };
    interview: {
      totalAssigned: number;
      totalEvaluated: number;
      averagePercentage: number;
      latestPercentage: number | null;
      progression: Array<{
        previousScore: number | null;
        currentScore: number;
        difference: number | null;
        displayText: string;
      }>;
    };
  };
}

export interface StudentDashboardDto {
  summary: {
    totalAssigned: number;
    completedAssessments: number;
    availableAssessments: number;
    averageScore: number;
    passRate: number;
    averageAccuracy: number;
  };
  recentResults: ResultListItemDto[];
  upcomingAssessments: {
    id: string;
    title: string;
    category: string;
    totalMarks: number;
    durationMinutes: number;
    startDate: string;
    endDate: string;
    passingPercentage: number;
  }[];
}

export interface TrendDataPointDto {
  assessmentId: string;
  assessmentTitle: string;
  date: string;
  percentage: number;
  accuracy: number;
  isPassed: boolean;
}

export interface StudentPerformanceAnalyticsDto {
  summary: {
    totalAssessmentsTaken: number;
    totalPassed: number;
    averageScore: number;
    averageAccuracy: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
  };
  trends: TrendDataPointDto[];
  categoryPerformance: CategoryPerformanceDto[];
  topicPerformance: TopicPerformanceDto[];
  codingPerformance: {
    totalSubmissions: number;
    acceptedCount: number;
    partialCount: number;
    failedCount: number;
    passedTestsRatio: number;
    languagesUsed: string[];
  };
  assessmentHistory: ResultListItemDto[];
  humanEvaluation?: {
    gd: {
      totalAssigned: number;
      totalEvaluated: number;
      averagePercentage: number;
      latestPercentage: number | null;
      progression: Array<{
        previousScore: number | null;
        currentScore: number;
        difference: number | null;
        displayText: string;
      }>;
    };
    interview: {
      totalAssigned: number;
      totalEvaluated: number;
      averagePercentage: number;
      latestPercentage: number | null;
      progression: Array<{
        previousScore: number | null;
        currentScore: number;
        difference: number | null;
        displayText: string;
      }>;
    };
  };
}
