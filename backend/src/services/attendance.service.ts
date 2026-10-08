import {
  AssessmentAttendanceOverviewDto,
  StudentAttendanceRecordDto,
  AttendanceFilterQuery,
  PaginatedAttendanceDto,
  AttendanceAlertDto,
  RepeatedNonAttendanceStudentDto,
  AttendanceAutomationConfigDto,
  SendReminderRequestDto,
  SendReminderResultDto,
} from '../types/attendance.types.js';
import { attendanceRepository, AttendanceRepository } from '../repositories/attendance.repository.js';
import { assessmentRepository, AssessmentRepository } from '../repositories/assessment.repository.js';
import { emailService, EmailService } from '../utils/email.util.js';
import { generateExcelBuffer } from '../utils/export.util.js';
import { ExportColumnDef, ExportDataPayload } from '../types/report.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class AttendanceService {
  constructor(
    private attendanceRepo: AttendanceRepository = attendanceRepository,
    private assessmentRepo: AssessmentRepository = assessmentRepository,
    private mailer: EmailService = emailService
  ) {}

  // ===========================================================================
  // 1. OVERVIEWS & AGGREGATIONS
  // ===========================================================================
  async getAssessmentAttendanceOverview(
    assessmentId: string
  ): Promise<AssessmentAttendanceOverviewDto> {
    return this.attendanceRepo.getAssessmentAttendanceOverview(assessmentId);
  }

  async getAllAssessmentsAttendanceOverview(): Promise<AssessmentAttendanceOverviewDto[]> {
    return this.attendanceRepo.getAllAssessmentsAttendanceOverview();
  }

  // ===========================================================================
  // 2. FILTERED STUDENT LIST
  // ===========================================================================
  async getStudentAttendanceList(query: AttendanceFilterQuery): Promise<PaginatedAttendanceDto> {
    return this.attendanceRepo.getStudentAttendanceList(query);
  }

  async getNotAttendedStudents(assessmentId: string): Promise<StudentAttendanceRecordDto[]> {
    return this.attendanceRepo.getNotAttendedStudents(assessmentId);
  }

  // ===========================================================================
  // 3. EXCEL EXPORT (NOT ATTENDED STUDENTS)
  // ===========================================================================
  async exportNotAttendedStudentsExcel(
    assessmentId: string,
    userEmail: string
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const assessment = await this.assessmentRepo.getAssessmentById(assessmentId);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const notAttendedList = await this.attendanceRepo.getNotAttendedStudents(assessmentId);

    const columns: ExportColumnDef[] = [
      { header: 'Student Name', key: 'studentName', width: 22 },
      { header: 'Register Number', key: 'registerNumber', width: 16 },
      { header: 'Department', key: 'departmentCode', width: 12 },
      { header: 'Course', key: 'courseCode', width: 12 },
      { header: 'Class', key: 'className', width: 16 },
      { header: 'Section', key: 'sectionName', width: 10 },
      { header: 'Email', key: 'collegeEmail', width: 26 },
      { header: 'Assessment', key: 'assessmentName', width: 26 },
      { header: 'Assessment Date', key: 'assessmentDate', width: 24 },
      { header: 'Attendance Status', key: 'attendanceStatus', width: 18 },
    ];

    const exportRows = notAttendedList.map((s) => ({
      studentName: s.studentName,
      registerNumber: s.registerNumber,
      departmentCode: s.departmentCode,
      courseCode: s.courseCode,
      className: s.className,
      sectionName: s.sectionName,
      collegeEmail: s.collegeEmail,
      assessmentName: s.assessmentName,
      assessmentDate: s.assessmentDate,
      attendanceStatus: s.attendanceStatus,
    }));

    const payload: ExportDataPayload = {
      institutionName: 'College Placement Assessment Platform',
      reportTitle: `Non-Attended Students Report - ${assessment.name}`,
      reportDate: new Date().toLocaleString(),
      generatedBy: userEmail,
      appliedFilters: {
        Assessment: assessment.name,
        Status: 'NOT_ATTENDED',
        TotalNotAttended: notAttendedList.length,
      },
      summaryMetrics: {
        'Assessment Name': assessment.name,
        'Total Not Attended': notAttendedList.length,
        'Generated Date': new Date().toLocaleDateString(),
      },
      columns,
      data: exportRows,
    };

    const buffer = generateExcelBuffer(payload);
    const sanitizedTitle = assessment.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Not_Attended_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return {
      buffer,
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  // ===========================================================================
  // 4. EMAIL REMINDER DISPATCH & AUTOMATION (DUPLICATE-SAFE)
  // ===========================================================================
  async sendRemindersToNotAttended(
    payload: SendReminderRequestDto
  ): Promise<SendReminderResultDto> {
    const { assessmentId, studentIds, customSubject, customMessage } = payload;

    const assessment = await this.assessmentRepo.getAssessmentById(assessmentId);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    // Check configuration
    const config = await this.attendanceRepo.getAttendanceConfig(assessmentId);
    if (!config.isEmailReminderEnabled) {
      throw new AppError(
        'Email reminders are disabled in the automation configuration for this assessment',
        400
      );
    }

    // Get non-attended students
    let targets = await this.attendanceRepo.getNotAttendedStudents(assessmentId);

    // If specific subset requested, filter accordingly
    if (studentIds && studentIds.length > 0) {
      const idSet = new Set(studentIds);
      targets = targets.filter((s) => idSet.has(s.studentId));
    }

    let sentCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const logs = [];

    for (const student of targets) {
      // 1. Idempotency & Duplicate prevention:
      const alreadySent = await this.attendanceRepo.hasEmailBeenSent(
        assessmentId,
        student.studentId,
        'REMINDER'
      );

      if (alreadySent) {
        skippedCount++;
        continue;
      }

      // 2. Generate email
      const template = this.mailer.generateNotAttendedEmail({
        studentName: student.studentName,
        registerNumber: student.registerNumber,
        assessmentName: assessment.name,
        assessmentDate: student.assessmentDate,
        customMessage,
      });

      const finalSubject = customSubject || template.subject;

      // 3. Send via transporter
      const delivery = await this.mailer.sendEmail({
        to: student.collegeEmail,
        subject: finalSubject,
        html: template.html,
        text: template.text,
      });

      // 4. Log delivery status
      const log = await this.attendanceRepo.logEmailSent({
        assessmentId,
        studentId: student.studentId,
        recipientEmail: student.collegeEmail,
        emailType: 'REMINDER',
        status: delivery.success ? 'SENT' : 'FAILED',
        subject: finalSubject,
        messageBody: template.text,
        errorMessage: delivery.error || null,
      });

      logs.push(log);

      if (delivery.success) {
        sentCount++;
      } else {
        failedCount++;
      }
    }

    return {
      assessmentId,
      totalTargeted: targets.length,
      sentCount,
      skippedCount,
      failedCount,
      logs,
    };
  }

  // ===========================================================================
  // 5. ALERTS & NOTIFICATIONS
  // ===========================================================================
  async getActiveAlerts(): Promise<AttendanceAlertDto[]> {
    return this.attendanceRepo.getActiveAlerts();
  }

  async resolveAlert(alertId: string): Promise<void> {
    return this.attendanceRepo.resolveAlert(alertId);
  }

  async syncAssessments(): Promise<{ processedCount: number; newAlertsCount: number }> {
    return this.attendanceRepo.syncClosedAssessments();
  }

  // ===========================================================================
  // 6. REPEATED NON-ATTENDANCE INSIGHTS
  // ===========================================================================
  async getRepeatedNonAttendanceStudents(): Promise<RepeatedNonAttendanceStudentDto[]> {
    return this.attendanceRepo.getRepeatedNonAttendanceStudents();
  }

  // ===========================================================================
  // 7. CONFIGURATION
  // ===========================================================================
  async getAttendanceConfig(assessmentId: string): Promise<AttendanceAutomationConfigDto> {
    return this.attendanceRepo.getAttendanceConfig(assessmentId);
  }

  async updateAttendanceConfig(
    assessmentId: string,
    payload: Partial<AttendanceAutomationConfigDto>
  ): Promise<AttendanceAutomationConfigDto> {
    return this.attendanceRepo.updateAttendanceConfig(assessmentId, payload);
  }

  // ===========================================================================
  // 8. STUDENT OWN ATTENDANCE (ROLE STUDENT ONLY)
  // ===========================================================================
  async getStudentOwnAttendance(studentId: string): Promise<StudentAttendanceRecordDto[]> {
    return this.attendanceRepo.getStudentOwnAttendance(studentId);
  }
}

export const attendanceService = new AttendanceService();
