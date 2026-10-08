import { assessmentRepository } from '../repositories/assessment.repository.js';
import { questionSelectionEngine } from './selection-engine.service.js';
import {
  AssessmentDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateAssignmentDto,
  AssessmentQueryFilters,
  AssessmentPaperDto,
  AssessmentAssignmentDto,
  PaperGenerationResult,
} from '../types/assessment.types.js';
import { PaginatedResult } from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';

export class AssessmentService {
  async createAssessment(payload: CreateAssessmentDto, createdById?: string): Promise<AssessmentDto> {
    return assessmentRepository.createAssessment(payload, createdById);
  }

  async getAssessments(filters: AssessmentQueryFilters): Promise<PaginatedResult<AssessmentDto>> {
    return assessmentRepository.getAssessments(filters);
  }

  async getAssessmentById(id: string): Promise<AssessmentDto> {
    const assessment = await assessmentRepository.getAssessmentById(id);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }
    return assessment;
  }

  async updateAssessment(id: string, payload: UpdateAssessmentDto): Promise<AssessmentDto> {
    return assessmentRepository.updateAssessment(id, payload);
  }

  async deleteAssessment(id: string): Promise<boolean> {
    return assessmentRepository.deleteAssessment(id);
  }

  async generatePapers(assessmentId: string): Promise<PaperGenerationResult> {
    // Acquire mutex lock to guarantee concurrency safety
    const lockAcquired = assessmentRepository.acquireGenerationLock(assessmentId);
    if (!lockAcquired) {
      throw new AppError('Assessment paper generation is already in progress for this assessment. Please wait.', 409);
    }

    try {
      const assessment = await assessmentRepository.getAssessmentById(assessmentId);
      if (!assessment) {
        throw new AppError('Assessment not found', 404);
      }

      if (assessment.status === 'PUBLISHED') {
        throw new AppError('Cannot regenerate papers for a published assessment', 400);
      }

      const sections = assessment.sections;
      if (!sections || sections.length === 0) {
        throw new AppError('Assessment has no configured sections. Please configure sections first', 400);
      }

      // Execute Selection Engine Pipeline
      const { papers, usageRecords, resultSummary } = await questionSelectionEngine.generatePapers(
        assessment,
        sections
      );

      // Save inside atomic transaction
      await assessmentRepository.saveGeneratedPapersTransaction(
        assessmentId,
        papers,
        usageRecords
      );

      return resultSummary;
    } finally {
      assessmentRepository.releaseGenerationLock(assessmentId);
    }
  }

  async publishAssessment(id: string): Promise<AssessmentDto> {
    return assessmentRepository.setStatus(id, 'PUBLISHED');
  }

  async unpublishAssessment(id: string): Promise<AssessmentDto> {
    return assessmentRepository.setStatus(id, 'DRAFT');
  }

  async scheduleAssessment(id: string, startDate: Date, endDate: Date): Promise<AssessmentDto> {
    return assessmentRepository.scheduleAssessment(id, startDate, endDate);
  }

  async getAssessmentPapers(id: string): Promise<AssessmentPaperDto[]> {
    const assessment = await assessmentRepository.getAssessmentById(id);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }
    return assessmentRepository.getAssessmentPapers(id);
  }

  async assignStudents(
    id: string,
    payload: CreateAssignmentDto
  ): Promise<{ assignedCount: number; assignments: AssessmentAssignmentDto[] }> {
    return assessmentRepository.assignStudents(id, payload);
  }

  async getAssessmentAssignments(id: string): Promise<AssessmentAssignmentDto[]> {
    const assessment = await assessmentRepository.getAssessmentById(id);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }
    return assessmentRepository.getAssessmentAssignments(id);
  }
}

export const assessmentService = new AssessmentService();
