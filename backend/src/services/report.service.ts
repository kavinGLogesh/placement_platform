import { reportRepository, ReportRepository } from '../repositories/report.repository.js';
import {
  StudentReportFilterQuery,
  AssessmentReportFilterQuery,
  DepartmentReportFilterQuery,
  TopicReportFilterQuery,
  QuestionReportFilterQuery,
  CodingReportFilterQuery,
  FunnelReportFilterQuery,
  StudentOwnReportFilterQuery,
  StudentPerformanceReportDto,
  AssessmentResultReportDto,
  DepartmentPerformanceReportDto,
  TopicPerformanceReportDto,
  QuestionAnalysisReportDto,
  CodingAssessmentReportDto,
  PlacementFunnelReportDto,
  StudentOwnPerformanceReportDto,
  GdReportFilterQuery,
  GdPerformanceReportDto,
  InterviewReportFilterQuery,
  InterviewPerformanceReportDto,
  ExportFormat,
  ExportDataPayload,
  ExportColumnDef,
} from '../types/report.types.js';
import {
  generateExcelBuffer,
  generateCsvBuffer,
  generatePdfBuffer,
  generateHtmlPrint,
} from '../utils/export.util.js';
import { AppError } from '../middleware/errorHandler.js';
import { attendanceRepository } from '../repositories/attendance.repository.js';
import { assessmentRepository } from '../repositories/assessment.repository.js';

export interface ExportResult {
  content: Buffer | string;
  contentType: string;
  filename: string;
}

export class ReportService {
  constructor(private readonly repo: ReportRepository = reportRepository) {}

  // 1. Student Performance Report
  async getStudentPerformanceReport(query: StudentReportFilterQuery): Promise<StudentPerformanceReportDto> {
    return this.repo.getStudentPerformanceReport(query, false);
  }

  // 2. Assessment Result Report
  async getAssessmentResultReport(query: AssessmentReportFilterQuery): Promise<AssessmentResultReportDto> {
    return this.repo.getAssessmentResultReport(query, false);
  }

  // 3. Department Performance Report
  async getDepartmentPerformanceReport(
    query: DepartmentReportFilterQuery
  ): Promise<DepartmentPerformanceReportDto> {
    return this.repo.getDepartmentPerformanceReport(query);
  }

  // 4. Topic Performance Report
  async getTopicPerformanceReport(query: TopicReportFilterQuery): Promise<TopicPerformanceReportDto> {
    return this.repo.getTopicPerformanceReport(query);
  }

  // 5. Question Analysis Report
  async getQuestionAnalysisReport(query: QuestionReportFilterQuery): Promise<QuestionAnalysisReportDto> {
    return this.repo.getQuestionAnalysisReport(query, false);
  }

  // 6. Coding Assessment Report
  async getCodingAssessmentReport(query: CodingReportFilterQuery): Promise<CodingAssessmentReportDto> {
    return this.repo.getCodingAssessmentReport(query, false);
  }

  // 7. Placement Funnel Report
  async getPlacementFunnelReport(query: FunnelReportFilterQuery): Promise<PlacementFunnelReportDto> {
    return this.repo.getPlacementFunnelReport(query);
  }

  // 8. Student Own Performance Report
  async getStudentOwnReport(
    studentId: string,
    query: StudentOwnReportFilterQuery
  ): Promise<StudentOwnPerformanceReportDto> {
    if (!studentId) {
      throw new AppError('Student ID is required', 400);
    }
    return this.repo.getStudentOwnReport(studentId, query);
  }

  // 9. GD Performance Report
  async getGdPerformanceReport(query: GdReportFilterQuery): Promise<GdPerformanceReportDto> {
    return this.repo.getGdPerformanceReport(query, false);
  }

  // 10. Interview Performance Report
  async getInterviewPerformanceReport(query: InterviewReportFilterQuery): Promise<InterviewPerformanceReportDto> {
    return this.repo.getInterviewPerformanceReport(query, false);
  }

  // ===========================================================================
  // EXPORT ENGINE ORCHESTRATION
  // ===========================================================================
  async exportReport(
    reportType: string,
    format: ExportFormat,
    filters: any,
    userEmail: string
  ): Promise<ExportResult> {
    let payload: ExportDataPayload;
    const nowStr = new Date().toISOString().slice(0, 10);

    switch (reportType.toLowerCase()) {
      case 'students':
      case 'student-performance': {
        const report = await this.repo.getStudentPerformanceReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Register No', key: 'registerNumber', width: 14 },
          { header: 'Student Name', key: 'studentName', width: 22 },
          { header: 'Dept', key: 'departmentCode', width: 8 },
          { header: 'Course', key: 'courseCode', width: 10 },
          { header: 'Class', key: 'className', width: 14 },
          { header: 'Assigned', key: 'assessmentsAssigned', width: 10 },
          { header: 'Completed', key: 'assessmentsCompleted', width: 10 },
          { header: 'Marks Obt', key: 'totalMarksObtained', width: 10 },
          { header: 'Avg %', key: 'averagePercentage', width: 10 },
          { header: 'Accuracy %', key: 'averageAccuracy', width: 12 },
          { header: 'Status', key: 'overallPassed', width: 10 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Student Performance & Placement Readiness Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Total Students': report.summary.totalStudents,
            'Total Completed': report.summary.totalAssessmentsCompleted,
            'Avg Percentage': `${report.summary.overallAveragePercentage}%`,
            'Avg Accuracy': `${report.summary.overallAverageAccuracy}%`,
            'Overall Pass Rate': `${report.summary.overallPassRate}%`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'assessments':
      case 'assessment-results': {
        const report = await this.repo.getAssessmentResultReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Assessment', key: 'assessmentTitle', width: 24 },
          { header: 'Register No', key: 'registerNumber', width: 14 },
          { header: 'Student Name', key: 'studentName', width: 20 },
          { header: 'Dept', key: 'departmentCode', width: 8 },
          { header: 'Total Marks', key: 'totalMarks', width: 10 },
          { header: 'Obtained', key: 'obtainedMarks', width: 10 },
          { header: 'Percentage', key: 'percentage', width: 10 },
          { header: 'Accuracy', key: 'accuracy', width: 10 },
          { header: 'Result', key: 'isPassed', width: 10 },
          { header: 'Submitted At', key: 'submittedAt', width: 18 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Assessment Result & Score Registry Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Total Appeared': report.summary.totalAppeared,
            'Total Passed': report.summary.totalPassed,
            'Pass Rate': `${report.summary.passRate}%`,
            'Highest Score': report.summary.highestScore,
            'Average Score': report.summary.averageScore,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'departments':
      case 'department-performance': {
        const report = await this.repo.getDepartmentPerformanceReport(filters);
        const columns: ExportColumnDef[] = [
          { header: 'Code', key: 'departmentCode', width: 8 },
          { header: 'Department Name', key: 'departmentName', width: 28 },
          { header: 'Enrolled', key: 'enrolledStudents', width: 12 },
          { header: 'Assigned', key: 'totalAssessmentsAssigned', width: 12 },
          { header: 'Completed', key: 'totalAttemptsCompleted', width: 12 },
          { header: 'Passed', key: 'totalPassed', width: 10 },
          { header: 'Pass Rate %', key: 'passRate', width: 12 },
          { header: 'Avg %', key: 'averagePercentage', width: 10 },
          { header: 'Accuracy %', key: 'averageAccuracy', width: 12 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Department Performance Comparative Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            Departments: report.summary.totalDepartments,
            'Total Enrolled': report.summary.totalStudents,
            'Completed Tests': report.summary.totalCompletedAttempts,
            'Institution Avg %': `${report.summary.institutionAveragePercentage}%`,
            'Institution Pass Rate': `${report.summary.institutionPassRate}%`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'topics':
      case 'topic-performance': {
        const report = await this.repo.getTopicPerformanceReport(filters);
        const columns: ExportColumnDef[] = [
          { header: 'Category', key: 'category', width: 22 },
          { header: 'Topic', key: 'topic', width: 24 },
          { header: 'Questions', key: 'totalQuestions', width: 10 },
          { header: 'Attempts', key: 'totalAttempts', width: 10 },
          { header: 'Correct', key: 'correctAnswers', width: 10 },
          { header: 'Incorrect', key: 'incorrectAnswers', width: 10 },
          { header: 'Accuracy %', key: 'accuracyPercentage', width: 12 },
          { header: 'Proficiency', key: 'proficiencyRating', width: 16 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Curriculum & Topic Competency Analysis Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Categories Evaluated': report.summary.totalCategories,
            'Topics Evaluated': report.summary.totalTopics,
            'Strong Topics': report.summary.strongTopicsCount,
            'Needs Improvement': report.summary.needsImprovementCount,
            'Overall Accuracy': `${report.summary.overallAccuracy}%`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'questions':
      case 'question-analysis': {
        const report = await this.repo.getQuestionAnalysisReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Question Snippet', key: 'questionSnippet', width: 34 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Topic', key: 'topic', width: 18 },
          { header: 'Difficulty', key: 'difficulty', width: 12 },
          { header: 'Type', key: 'questionType', width: 14 },
          { header: 'Marks', key: 'marks', width: 8 },
          { header: 'Appeared', key: 'timesAppeared', width: 10 },
          { header: 'Answered', key: 'timesAnswered', width: 10 },
          { header: 'Success %', key: 'successRatePercentage', width: 12 },
          { header: 'Discrimination', key: 'discriminationRating', width: 18 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Question Bank Psychometric Analysis Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Questions Analyzed': report.summary.totalQuestionsAnalyzed,
            'Average Success Rate': `${report.summary.averageSuccessRate}%`,
            'Easy Questions': report.summary.easyCount,
            'Medium Questions': report.summary.mediumCount,
            'Hard Questions': report.summary.hardCount,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'coding':
      case 'coding-assessment': {
        const report = await this.repo.getCodingAssessmentReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Student Name', key: 'studentName', width: 18 },
          { header: 'Register No', key: 'registerNumber', width: 14 },
          { header: 'Assessment', key: 'assessmentTitle', width: 20 },
          { header: 'Challenge', key: 'questionTopic', width: 18 },
          { header: 'Language', key: 'language', width: 10 },
          { header: 'Status', key: 'status', width: 16 },
          { header: 'Passed Tests', key: 'passedTestCount', width: 12 },
          { header: 'Total Tests', key: 'totalTestCount', width: 12 },
          { header: 'Score %', key: 'scorePercentage', width: 10 },
          { header: 'Exec Time (s)', key: 'executionTime', width: 12 },
          { header: 'Submitted At', key: 'submittedAt', width: 18 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Coding Assessment & Execution Analytics Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Total Submissions': report.summary.totalSubmissions,
            Accepted: report.summary.acceptedCount,
            'Acceptance Rate': `${report.summary.acceptanceRate}%`,
            'Avg Execution Time': `${report.summary.avgExecutionTime}s`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'funnel':
      case 'placement-funnel': {
        const report = await this.repo.getPlacementFunnelReport(filters);
        const columns: ExportColumnDef[] = [
          { header: 'Funnel Stage', key: 'stage', width: 18 },
          { header: 'Candidate Count', key: 'count', width: 16 },
          { header: 'Stage %', key: 'percentage', width: 14 },
          { header: 'Drop-off %', key: 'dropOffRate', width: 14 },
          { header: 'Stage Status', key: 'isImplemented', width: 16 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Placement Recruitment Funnel Progression Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Registered Candidates': report.summary.registeredCount,
            'Passed Assessment': report.summary.passedAssessmentCount,
            'Conversion Rate': `${report.summary.conversionRate}%`,
          },
          columns,
          data: report.stages.map((s) => ({
            ...s,
            isImplemented: s.isImplemented ? 'IMPLEMENTED' : 'NOT IMPLEMENTED (PHASE 9+)',
          })),
        };
        break;
      }

      case 'gd':
      case 'gd-performance': {
        const report = await this.repo.getGdPerformanceReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Round Title', key: 'title', width: 20 },
          { header: 'Topic', key: 'topic', width: 22 },
          { header: 'Date', key: 'scheduledDate', width: 14 },
          { header: 'Student Name', key: 'studentName', width: 18 },
          { header: 'Register No', key: 'registerNumber', width: 14 },
          { header: 'Department', key: 'departmentName', width: 16 },
          { header: 'Attendance', key: 'attendance', width: 12 },
          { header: 'Score', key: 'totalScore', width: 10 },
          { header: 'Max Marks', key: 'maxMarks', width: 10 },
          { header: 'Percentage', key: 'percentage', width: 12 },
          { header: 'Evaluator', key: 'evaluatorName', width: 16 },
          { header: 'Improvement / Status', key: 'comparisonText', width: 24 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Group Discussion (GD) Structured Evaluation Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Total GD Rounds': report.summary.totalRounds,
            'Total Participants': report.summary.totalParticipants,
            'Total Evaluated': report.summary.totalEvaluated,
            'Average Score': `${report.summary.averageScorePercentage}%`,
            'Attendance Rate': `${report.summary.attendanceRate}%`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'interviews':
      case 'interview-performance': {
        const report = await this.repo.getInterviewPerformanceReport(filters, true);
        const columns: ExportColumnDef[] = [
          { header: 'Round Title', key: 'title', width: 20 },
          { header: 'Interview Type', key: 'interviewType', width: 16 },
          { header: 'Date', key: 'scheduledDate', width: 14 },
          { header: 'Student Name', key: 'studentName', width: 18 },
          { header: 'Register No', key: 'registerNumber', width: 14 },
          { header: 'Department', key: 'departmentName', width: 16 },
          { header: 'Attendance', key: 'attendance', width: 12 },
          { header: 'Score', key: 'totalScore', width: 10 },
          { header: 'Max Marks', key: 'maxMarks', width: 10 },
          { header: 'Percentage', key: 'percentage', width: 12 },
          { header: 'Evaluator', key: 'evaluatorName', width: 16 },
          { header: 'Improvement / Status', key: 'comparisonText', width: 24 },
        ];
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: 'Structured Interview Evaluation Report',
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Total Interview Rounds': report.summary.totalRounds,
            'Total Participants': report.summary.totalParticipants,
            'Total Evaluated': report.summary.totalEvaluated,
            'Average Score': `${report.summary.averageScorePercentage}%`,
            'Attendance Rate': `${report.summary.attendanceRate}%`,
          },
          columns,
          data: report.rows,
        };
        break;
      }

      case 'not-attended':
      case 'not-attended-students': {
        const assessmentId = filters.assessmentId;
        if (!assessmentId) {
          throw new AppError('assessmentId is required for not-attended export', 400);
        }
        const notAttendedList = await attendanceRepository.getNotAttendedStudents(assessmentId);
        const asmt = await assessmentRepository.getAssessmentById(assessmentId);
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
        payload = {
          institutionName: 'College Placement Assessment Platform',
          reportTitle: `Non-Attended Students Report - ${asmt?.name || 'Assessment'}`,
          reportDate: new Date().toLocaleString(),
          generatedBy: userEmail,
          appliedFilters: filters,
          summaryMetrics: {
            'Assessment Name': asmt?.name || 'Assessment',
            'Total Not Attended': notAttendedList.length,
          },
          columns,
          data: notAttendedList,
        };
        break;
      }

      default:
        throw new AppError(`Unknown report type: ${reportType}`, 400);
    }

    return this.renderExport(payload, format, `${reportType}-${nowStr}`);
  }

  // Export for individual student
  async exportStudentOwnReport(
    studentId: string,
    format: ExportFormat,
    filters: StudentOwnReportFilterQuery,
    userEmail: string
  ): Promise<ExportResult> {
    const report = await this.repo.getStudentOwnReport(studentId, filters);
    const nowStr = new Date().toISOString().slice(0, 10);

    const columns: ExportColumnDef[] = [
      { header: 'Assessment Title', key: 'assessmentTitle', width: 28 },
      { header: 'Total Marks', key: 'totalMarks', width: 12 },
      { header: 'Marks Obtained', key: 'obtainedMarks', width: 14 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Accuracy', key: 'accuracy', width: 12 },
      { header: 'Result', key: 'isPassed', width: 12 },
      { header: 'Submitted At', key: 'submittedAt', width: 20 },
    ];

    const payload: ExportDataPayload = {
      institutionName: 'College Placement Assessment Platform',
      reportTitle: `Individual Candidate Performance Transcript — ${report.student.name} (${report.student.registerNumber})`,
      reportDate: new Date().toLocaleString(),
      generatedBy: userEmail,
      appliedFilters: filters as any,
      summaryMetrics: {
        Candidate: report.student.name,
        'Register No': report.student.registerNumber,
        Department: `${report.student.departmentName} (${report.student.departmentCode})`,
        'Assessments Taken': report.summary.totalAssessmentsCompleted,
        'Average Score': report.summary.averageScore,
        'Average Percentage': `${report.summary.averagePercentage}%`,
        'Overall Pass Rate': `${report.summary.passRate}%`,
      },
      columns,
      data: report.assessments,
    };

    return this.renderExport(
      payload,
      format,
      `student-transcript-${report.student.registerNumber}-${nowStr}`
    );
  }

  private async renderExport(
    payload: ExportDataPayload,
    format: ExportFormat,
    baseName: string
  ): Promise<ExportResult> {
    switch (format.toLowerCase()) {
      case 'xlsx': {
        const buffer = generateExcelBuffer(payload);
        return {
          content: buffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          filename: `${baseName}.xlsx`,
        };
      }
      case 'csv': {
        const buffer = generateCsvBuffer(payload);
        return {
          content: buffer,
          contentType: 'text/csv; charset=utf-8',
          filename: `${baseName}.csv`,
        };
      }
      case 'pdf': {
        const buffer = await generatePdfBuffer(payload);
        return {
          content: buffer,
          contentType: 'application/pdf',
          filename: `${baseName}.pdf`,
        };
      }
      case 'html': {
        const html = generateHtmlPrint(payload);
        return {
          content: html,
          contentType: 'text/html; charset=utf-8',
          filename: `${baseName}.html`,
        };
      }
      default:
        throw new AppError(`Unsupported export format: ${format}. Supported formats: xlsx, csv, pdf, html`, 400);
    }
  }
}

export const reportService = new ReportService();
