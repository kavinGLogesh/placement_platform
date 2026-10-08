import { apiClient } from '../api/axios.client.js';
import {
  StudentPerformanceReportDto,
  AssessmentResultReportDto,
  DepartmentPerformanceReportDto,
  TopicPerformanceReportDto,
  QuestionAnalysisReportDto,
  CodingAssessmentReportDto,
  PlacementFunnelReportDto,
  StudentOwnPerformanceReportDto,
  GdPerformanceReportDto,
  InterviewPerformanceReportDto,
  ExportFormat,
} from '../types/report.types.js';

export class ReportService {
  // 1. Student Performance Report
  async getStudentReport(params: Record<string, any> = {}): Promise<StudentPerformanceReportDto> {
    const res = await apiClient.get('/reports/students', { params });
    return res.data.data;
  }

  // 2. Assessment Result Report
  async getAssessmentReport(params: Record<string, any> = {}): Promise<AssessmentResultReportDto> {
    const res = await apiClient.get('/reports/assessments', { params });
    return res.data.data;
  }

  // 3. Department Performance Report
  async getDepartmentReport(params: Record<string, any> = {}): Promise<DepartmentPerformanceReportDto> {
    const res = await apiClient.get('/reports/departments', { params });
    return res.data.data;
  }

  // 4. Topic Performance Report
  async getTopicReport(params: Record<string, any> = {}): Promise<TopicPerformanceReportDto> {
    const res = await apiClient.get('/reports/topics', { params });
    return res.data.data;
  }

  // 5. Question Analysis Report
  async getQuestionReport(params: Record<string, any> = {}): Promise<QuestionAnalysisReportDto> {
    const res = await apiClient.get('/reports/questions', { params });
    return res.data.data;
  }

  // 6. Coding Assessment Report
  async getCodingReport(params: Record<string, any> = {}): Promise<CodingAssessmentReportDto> {
    const res = await apiClient.get('/reports/coding', { params });
    return res.data.data;
  }

  // 7. Placement Funnel Report
  async getFunnelReport(params: Record<string, any> = {}): Promise<PlacementFunnelReportDto> {
    const res = await apiClient.get('/reports/funnel', { params });
    return res.data.data;
  }

  // 8. Student Own Performance Report
  async getStudentOwnReport(params: Record<string, any> = {}): Promise<StudentOwnPerformanceReportDto> {
    const res = await apiClient.get('/reports/student/me', { params });
    return res.data.data;
  }

  // 9. GD Performance Report
  async getGdReport(params: Record<string, any> = {}): Promise<GdPerformanceReportDto> {
    const res = await apiClient.get('/reports/gd', { params });
    return res.data.data;
  }

  // 10. Interview Performance Report
  async getInterviewReport(params: Record<string, any> = {}): Promise<InterviewPerformanceReportDto> {
    const res = await apiClient.get('/reports/interviews', { params });
    return res.data.data;
  }

  // Format to authoritative MIME type mapping
  private static readonly MIME_TYPES: Record<ExportFormat, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv; charset=utf-8',
    pdf: 'application/pdf',
    html: 'text/html; charset=utf-8',
  };

  // Extract filename from Content-Disposition header with fallback
  private extractFilename(contentDisposition?: string, fallbackFilename: string = 'report.bin'): string {
    if (contentDisposition) {
      const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return fallbackFilename;
  }

  // Download export for Admin reports
  async downloadReport(
    reportType: string,
    format: ExportFormat,
    filters: Record<string, any> = {}
  ): Promise<string> {
    const { page: _page, limit: _limit, ...exportFilters } = filters;
    const params = { ...exportFilters, format };
    const expectedMime = ReportService.MIME_TYPES[format] || 'application/octet-stream';
    const nowStr = new Date().toISOString().slice(0, 10);
    const fallbackFilename = `${reportType}-${nowStr}.${format}`;

    if (format === 'html') {
      const res = await apiClient.get(`/reports/${reportType}/export`, {
        params,
        responseType: 'text',
      });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(res.data);
        printWindow.document.close();
      }
      return `${reportType}-${nowStr}.html`;
    }

    try {
      const res = await apiClient.get(`/reports/${reportType}/export`, {
        params,
        responseType: 'blob',
      });

      // Handle cases where server might return JSON error as a blob
      if (res.data instanceof Blob && res.data.type?.includes('application/json')) {
        const errorText = await res.data.text();
        try {
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || 'Export generation failed');
        } catch {
          throw new Error(errorText || 'Export generation failed');
        }
      }

      const rawContentDisposition = res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition'];
      const filename = this.extractFilename(
        typeof rawContentDisposition === 'string' ? rawContentDisposition : undefined,
        fallbackFilename
      );

      const rawContentType = res.headers?.['content-type'] ?? res.headers?.['Content-Type'];
      const mimeType = typeof rawContentType === 'string' ? rawContentType : expectedMime;
      this.triggerDownload(res.data, filename, mimeType);
      return filename;
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || err.message || 'Export request failed');
        } catch (inner) {
          if (inner instanceof Error && inner.message !== 'Export request failed') {
            throw inner;
          }
        }
      }
      throw err;
    }
  }

  // Download export for Student Own report
  async downloadStudentOwnReport(
    format: ExportFormat,
    filters: Record<string, any> = {}
  ): Promise<string> {
    const { page: _page, limit: _limit, ...exportFilters } = filters;
    const params = { ...exportFilters, format };
    const expectedMime = ReportService.MIME_TYPES[format] || 'application/octet-stream';
    const nowStr = new Date().toISOString().slice(0, 10);
    const fallbackFilename = `student-transcript-${nowStr}.${format}`;

    if (format === 'html') {
      const res = await apiClient.get('/reports/student/me/export', {
        params,
        responseType: 'text',
      });
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(res.data);
        printWindow.document.close();
      }
      return `student-transcript-${nowStr}.html`;
    }

    try {
      const res = await apiClient.get('/reports/student/me/export', {
        params,
        responseType: 'blob',
      });

      if (res.data instanceof Blob && res.data.type?.includes('application/json')) {
        const errorText = await res.data.text();
        try {
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || 'Student export generation failed');
        } catch {
          throw new Error(errorText || 'Student export generation failed');
        }
      }

      const rawContentDisposition = res.headers?.['content-disposition'] ?? res.headers?.['Content-Disposition'];
      const filename = this.extractFilename(
        typeof rawContentDisposition === 'string' ? rawContentDisposition : undefined,
        fallbackFilename
      );

      const rawContentType = res.headers?.['content-type'] ?? res.headers?.['Content-Type'];
      const mimeType = typeof rawContentType === 'string' ? rawContentType : expectedMime;
      this.triggerDownload(res.data, filename, mimeType);
      return filename;
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const errorText = await err.response.data.text();
          const parsed = JSON.parse(errorText);
          throw new Error(parsed.message || err.message || 'Student export request failed');
        } catch (inner) {
          if (inner instanceof Error && inner.message !== 'Student export request failed') {
            throw inner;
          }
        }
      }
      throw err;
    }
  }

  private triggerDownload(data: BlobPart, defaultFilename: string, mimeType?: string): void {
    const blob =
      data instanceof Blob
        ? (mimeType && (!data.type || data.type === 'application/octet-stream') ? new Blob([data], { type: mimeType }) : data)
        : new Blob([data], { type: mimeType || 'application/octet-stream' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', defaultFilename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    // Defer cleanup to give modern browser download managers time to initiate
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    }, 1000);
  }
}

export const reportService = new ReportService();
