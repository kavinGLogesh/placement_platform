export interface AssessmentAttendanceOverviewDto {
  assessmentId: string;
  assessmentName: string;
  isCompanyAssessment: boolean;
  companyName?: string | null;
  companyCode?: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  isWindowClosed: boolean;
  totalRegistered: number;
  eligibleStudents: number;
  assignedStudents: number;
  attended: number;
  notAttended: number;
  completed: number;
  passed: number;
  failed: number;
  attendanceRate: number;
  completionRate: number;
  passRate: number;
}

export type StudentAttendanceStatus =
  | 'ASSIGNED'
  | 'NOT_STARTED'
  | 'ATTENDED'
  | 'COMPLETED'
  | 'NOT_ATTENDED';

export interface StudentAttendanceRecordDto {
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  courseCode: string;
  courseName: string;
  className: string;
  sectionName: string;
  collegeEmail: string;
  assessmentId: string;
  assessmentName: string;
  assessmentStartDate: string | null;
  assessmentEndDate: string | null;
  assessmentDate: string;
  attendanceStatus: StudentAttendanceStatus;
  attemptStatus?: string | null;
  attemptCount: number;
  isPassed?: boolean | null;
  obtainedMarks?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  reminderSentCount: number;
  lastReminderSentAt?: string | null;
}

export interface AttendanceFilterQuery {
  assessmentId?: string;
  departmentId?: string;
  classId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'registerNumber' | 'department' | 'attendanceStatus';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedAttendanceDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  overview: AssessmentAttendanceOverviewDto | null;
  records: StudentAttendanceRecordDto[];
}

export interface AttendanceAlertDto {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  notAttendedCount: number;
  assignedCount: number;
  alertMessage: string;
  isResolved: boolean;
  reminderSentCount: number;
  lastReminderAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepeatedNonAttendanceStudentDto {
  studentId: string;
  studentName: string;
  registerNumber: string;
  departmentCode: string;
  departmentName: string;
  className: string;
  sectionName: string;
  collegeEmail: string;
  missedAssessmentsCount: number;
  missedAssessments: Array<{
    id: string;
    name: string;
    endDate: string | null;
    formattedDate: string;
  }>;
}

export interface AttendanceAutomationConfigDto {
  id?: string;
  assessmentId: string;
  isEmailReminderEnabled: boolean;
  autoClosureReminder: boolean;
  sendClosingSoonReminder: boolean;
  closingSoonHours: number;
  reminderSubjectTemplate?: string | null;
  reminderBodyTemplate?: string | null;
}

export interface SendReminderResultDto {
  assessmentId: string;
  totalTargeted: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
}
