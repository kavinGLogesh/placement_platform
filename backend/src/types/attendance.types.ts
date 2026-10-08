export interface AssessmentAttendanceOverviewDto {
  assessmentId: string;
  assessmentName: string;
  isCompanyAssessment: boolean;
  companyName?: string | null;
  companyCode?: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string; // 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED'
  isWindowClosed: boolean;
  totalRegistered: number;
  eligibleStudents: number;
  assignedStudents: number;
  attended: number;
  notAttended: number;
  completed: number;
  passed: number;
  failed: number;
  attendanceRate: number; // percentage (attended / assigned * 100)
  completionRate: number; // percentage (completed / attended * 100)
  passRate: number; // percentage (passed / completed * 100)
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
  assessmentStartDate: Date | null;
  assessmentEndDate: Date | null;
  assessmentDate: string; // Human readable formatted date range
  attendanceStatus: StudentAttendanceStatus;
  attemptStatus?: string | null;
  attemptCount: number;
  isPassed?: boolean | null;
  obtainedMarks?: number | null;
  totalMarks?: number | null;
  percentage?: number | null;
  reminderSentCount: number;
  lastReminderSentAt?: Date | null;
}

export interface AttendanceFilterQuery {
  assessmentId?: string;
  departmentId?: string;
  classId?: string;
  status?: string; // 'ALL' | 'NOT_ATTENDED' | 'ATTENDED' | 'COMPLETED' | 'NOT_STARTED'
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
  lastReminderAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
    endDate: Date | null;
    formattedDate: string;
  }>;
}

export interface AttendanceEmailLogDto {
  id: string;
  assessmentId: string;
  studentId: string;
  recipientEmail: string;
  emailType: string;
  status: 'SENT' | 'FAILED';
  subject: string;
  messageBody: string;
  errorMessage?: string | null;
  sentAt: Date;
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

export interface SendReminderRequestDto {
  assessmentId: string;
  studentIds?: string[]; // If empty, sends to ALL not-attended students of this assessment
  customSubject?: string;
  customMessage?: string;
}

export interface SendReminderResultDto {
  assessmentId: string;
  totalTargeted: number;
  sentCount: number;
  skippedCount: number; // Skipped due to previous reminder already sent or unsubscribed
  failedCount: number;
  logs: AttendanceEmailLogDto[];
}
