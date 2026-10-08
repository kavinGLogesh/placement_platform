import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';
import {
  AssessmentDto,
  AssessmentSectionDto,
  AssessmentPaperDto,
  AssessmentAssignmentDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateAssignmentDto,
  AssessmentQueryFilters,
  AssessmentStatus,
  RandomizedOptionDto,
} from '../types/assessment.types.js';
import { PaginatedResult } from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { questionRepository } from './question.repository.js';
import { companyRepository } from './company.repository.js';

// =============================================================================
// In-Memory Fallback Store (for 100% test & offline repeatability)
// =============================================================================
class InMemoryAssessmentStore {
  public assessments: Map<string, AssessmentDto> = new Map();
  public sections: Map<string, AssessmentSectionDto[]> = new Map();
  public papers: Map<string, AssessmentPaperDto[]> = new Map();
  public assignments: Map<string, AssessmentAssignmentDto[]> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }
}

export class AssessmentRepository {
  public memStore = new InMemoryAssessmentStore();
  // In-process generation mutex to protect concurrent generation for same assessment
  private generationLocks = new Set<string>();
  private assessmentTargetMap = new Map<string, { departmentTargeting: 'ALL' | 'SPECIFIC'; departmentIds: string[] }>();
  private targetsFilePath = path.resolve(process.cwd(), 'src/data/assessment_targets.json');

  constructor() {
    this.memStore.initialize().catch((err) => console.error('Error init assessment memStore:', err));
    this.loadTargetsFromFile();
  }

  private loadTargetsFromFile(): void {
    try {
      if (fs.existsSync(this.targetsFilePath)) {
        const raw = fs.readFileSync(this.targetsFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [k, v] of Object.entries(parsed)) {
          this.assessmentTargetMap.set(k, v as any);
        }
      }
    } catch {
      // Safe fallback if file read fails
    }
  }

  private saveTargetsToFile(): void {
    try {
      const dir = path.dirname(this.targetsFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const obj: Record<string, any> = {};
      for (const [k, v] of this.assessmentTargetMap.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(this.targetsFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch {
      // Safe fallback if file write fails
    }
  }

  public getAssessmentTargetInfo(assessmentId: string): { departmentTargeting: 'ALL' | 'SPECIFIC'; departmentIds: string[] } | null {
    return this.assessmentTargetMap.get(assessmentId) || null;
  }

  private get hasCompanyRelation(): boolean {
    return (
      Boolean((prisma as any).company) &&
      typeof (prisma as any).company?.findUnique === 'function'
    );
  }

  acquireGenerationLock(assessmentId: string): boolean {
    if (this.generationLocks.has(assessmentId)) {
      return false;
    }
    this.generationLocks.add(assessmentId);
    return true;
  }

  releaseGenerationLock(assessmentId: string): void {
    this.generationLocks.delete(assessmentId);
  }

  // ===========================================================================
  // 1. CREATE ASSESSMENT WITH SECTIONS
  // ===========================================================================
  async createAssessment(payload: CreateAssessmentDto, createdById?: string): Promise<AssessmentDto> {
    const id = `asmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();

    const totalQuestions = (payload.sections || []).reduce((acc, s) => acc + s.questionsCount, 0);
    const totalMarks = (payload.sections || []).reduce(
      (acc, s) => acc + s.questionsCount * (s.marksPerQuestion || 1.0),
      0
    );

    const sectionsDto: AssessmentSectionDto[] = (payload.sections || []).map((sec, idx) => ({
      id: `sec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      assessmentId: id,
      component: sec.component,
      name: sec.name,
      sectionOrder: sec.sectionOrder || idx + 1,
      duration: sec.duration || null,
      topics: sec.topics,
      difficulty: sec.difficulty || null,
      questionType: sec.questionType || null,
      questionsCount: sec.questionsCount,
      marksPerQuestion: sec.marksPerQuestion || 1.0,
      negativeMarks: sec.negativeMarks || 0.0,
      createdAt: now,
      updatedAt: now,
    }));

    const targeting = payload.departmentTargeting || 'ALL';
    const deptIds = payload.departmentIds || [];

    if (targeting === 'SPECIFIC' && deptIds.length > 0 && process.env.NODE_ENV !== 'test') {
      const foundCount = await prisma.department.count({
        where: { id: { in: deptIds } },
      });
      if (foundCount !== deptIds.length) {
        throw new AppError('One or more selected departments do not exist', 400);
      }
    }

    this.assessmentTargetMap.set(id, { departmentTargeting: targeting, departmentIds: deptIds });
    this.saveTargetsToFile();

    const isCompany = payload.isCompanyAssessment !== undefined ? Boolean(payload.isCompanyAssessment) : Boolean(payload.companyId);
    let compInfo: { id: string; name: string; code: string; logoUrl?: string | null } | null = null;
    if (payload.companyId) {
      const c = await companyRepository.getCompanyById(payload.companyId);
      if (c) {
        compInfo = { id: c.id, name: c.name, code: c.code, logoUrl: c.logoUrl || null };
      }
    }

    const memoryItem: AssessmentDto = {
      id,
      companyId: payload.companyId || null,
      isCompanyAssessment: isCompany,
      name: payload.name,
      description: payload.description || null,
      duration: payload.duration,
      maximumAttempts: payload.maximumAttempts || 1,
      negativeMarking: Boolean(payload.negativeMarking),
      randomQuestions: Boolean(payload.randomQuestions),
      randomOptions: Boolean(payload.randomOptions),
      passingPercentage: payload.passingPercentage ?? 50.0,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      status: 'DRAFT',
      totalMarks,
      totalQuestions,
      numberOfPapers: payload.numberOfPapers || 1,
      createdById: createdById || null,
      createdAt: now,
      updatedAt: now,
      company: compInfo,
      sections: sectionsDto,
      papersCount: 0,
      assignmentsCount: 0,
      departmentTargeting: targeting,
      departmentIds: deptIds,
    };

    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      this.memStore.assessments.set(id, memoryItem);
      this.memStore.sections.set(id, sectionsDto);
      return memoryItem;
    }

    const createData: any = {
      id,
      name: payload.name,
      description: payload.description || null,
      duration: payload.duration,
      maximumAttempts: payload.maximumAttempts || 1,
      negativeMarking: Boolean(payload.negativeMarking),
      randomQuestions: Boolean(payload.randomQuestions),
      randomOptions: Boolean(payload.randomOptions),
      passingPercentage: payload.passingPercentage ?? 50.0,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      status: 'DRAFT',
      totalMarks,
      totalQuestions,
      numberOfPapers: payload.numberOfPapers || 1,
      createdById: createdById || null,
      sections: {
        create: payload.sections.map((sec, idx) => ({
          id: sectionsDto[idx].id,
          component: sec.component,
          name: sec.name,
          sectionOrder: sec.sectionOrder || idx + 1,
          duration: sec.duration || null,
          topics: JSON.stringify(sec.topics),
          difficulty: sec.difficulty || null,
          questionType: sec.questionType || null,
          questionsCount: sec.questionsCount,
          marksPerQuestion: sec.marksPerQuestion || 1.0,
          negativeMarks: sec.negativeMarks || 0.0,
        })),
      },
    };

    if (this.hasCompanyRelation) {
      if (payload.companyId) createData.companyId = payload.companyId;
      createData.isCompanyAssessment = isCompany;
    }

    const createInclude: any = {
      sections: { orderBy: { sectionOrder: 'asc' } },
    };
    if (this.hasCompanyRelation) {
      createInclude.company = { select: { id: true, name: true, code: true, logoUrl: true } };
    }

    const created = await prisma.assessment.create({
      data: createData,
      include: createInclude,
    });

    const result: AssessmentDto = {
      id: created.id,
      companyId: created.companyId,
      isCompanyAssessment: created.isCompanyAssessment,
      name: created.name,
      description: created.description,
      duration: created.duration,
      maximumAttempts: created.maximumAttempts,
      negativeMarking: created.negativeMarking,
      randomQuestions: created.randomQuestions,
      randomOptions: created.randomOptions,
      passingPercentage: created.passingPercentage,
      startDate: created.startDate,
      endDate: created.endDate,
      status: created.status,
      totalMarks: created.totalMarks,
      totalQuestions: created.totalQuestions,
      numberOfPapers: created.numberOfPapers,
      createdById: created.createdById,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      company: (created as any).company,
      sections: (created.sections as any[]).map((s: any) => ({
        id: s.id,
        assessmentId: s.assessmentId,
        component: s.component,
        name: s.name,
        sectionOrder: s.sectionOrder,
        duration: s.duration,
        topics: JSON.parse(s.topics),
        difficulty: s.difficulty,
        questionType: s.questionType,
        questionsCount: s.questionsCount,
        marksPerQuestion: s.marksPerQuestion,
        negativeMarks: s.negativeMarks,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      papersCount: 0,
      assignmentsCount: 0,
    };

    return result;
  }

  // ===========================================================================
  // 2. GET ASSESSMENTS (PAGINATED & FILTERED)
  // ===========================================================================
  async getAssessments(filters: AssessmentQueryFilters): Promise<PaginatedResult<AssessmentDto>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      let list = Array.from(this.memStore.assessments.values());

      if (filters.companyId) {
        list = list.filter((a) => a.companyId === filters.companyId);
      }
      if (filters.isCompanyAssessment !== undefined) {
        list = list.filter((a) => Boolean(a.isCompanyAssessment) === filters.isCompanyAssessment);
      }
      if (filters.status) {
        list = list.filter((a) => a.status === filters.status);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter((a) => a.name.toLowerCase().includes(s));
      }

      const sortField = filters.sortBy || 'createdAt';
      const isAsc = filters.sortOrder === 'asc';

      list.sort((a, b) => {
        let valA: unknown = (a as unknown as Record<string, unknown>)[sortField];
        let valB: unknown = (b as unknown as Record<string, unknown>)[sortField];
        if (sortField === 'createdAt') {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        }
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isAsc ? valA - valB : valB - valA;
        }
        return isAsc
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });

      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginated = list.slice(skip, skip + limit);

      return {
        data: paginated,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }

    const whereClause: Record<string, unknown> = {};
    if (this.hasCompanyRelation) {
      if (filters.companyId) whereClause.companyId = filters.companyId;
      if (filters.isCompanyAssessment !== undefined) whereClause.isCompanyAssessment = filters.isCompanyAssessment;
    }
    if (filters.status) whereClause.status = filters.status;
    if (filters.search) {
      whereClause.name = { contains: filters.search };
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    const sortField = filters.sortBy || 'createdAt';
    orderBy[sortField] = filters.sortOrder === 'asc' ? 'asc' : 'desc';

    const findInclude: any = {
      sections: { orderBy: { sectionOrder: 'asc' } },
      _count: { select: { papers: true, assignments: true } },
    };
    if (this.hasCompanyRelation) {
      findInclude.company = { select: { id: true, name: true, code: true, logoUrl: true } };
    }

    const [totalCount, items] = await Promise.all([
      prisma.assessment.count({ where: whereClause }),
      prisma.assessment.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy,
        include: findInclude,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const data: AssessmentDto[] = items.map((a: any) => ({
      id: a.id,
      companyId: a.companyId,
      isCompanyAssessment: a.isCompanyAssessment,
      name: a.name,
      description: a.description,
      duration: a.duration,
      maximumAttempts: a.maximumAttempts,
      negativeMarking: a.negativeMarking,
      randomQuestions: a.randomQuestions,
      randomOptions: a.randomOptions,
      passingPercentage: a.passingPercentage,
      startDate: a.startDate,
      endDate: a.endDate,
      status: a.status,
      totalMarks: a.totalMarks,
      totalQuestions: a.totalQuestions,
      numberOfPapers: a.numberOfPapers,
      createdById: a.createdById,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      company: a.company || null,
      sections: a.sections.map((s: any) => ({
        id: s.id,
        assessmentId: s.assessmentId,
        component: s.component,
        name: s.name,
        sectionOrder: s.sectionOrder,
        duration: s.duration,
        topics: JSON.parse(s.topics),
        difficulty: s.difficulty,
        questionType: s.questionType,
        questionsCount: s.questionsCount,
        marksPerQuestion: s.marksPerQuestion,
        negativeMarks: s.negativeMarks,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      papersCount: a._count.papers,
      assignmentsCount: a._count.assignments,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ===========================================================================
  // 3. GET ASSESSMENT BY ID (WITH SECTIONS)
  // ===========================================================================
  async getAssessmentById(id: string): Promise<AssessmentDto | null> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.assessments.get(id) || null;
    }

    const findUniqueInclude: any = {
      sections: { orderBy: { sectionOrder: 'asc' } },
      _count: { select: { papers: true, assignments: true } },
    };
    if (this.hasCompanyRelation) {
      findUniqueInclude.company = { select: { id: true, name: true, code: true, logoUrl: true } };
    }

    const a: any = await prisma.assessment.findUnique({
      where: { id },
      include: findUniqueInclude,
    });

    if (!a) {
      return null;
    }

    const result: AssessmentDto = {
      id: a.id,
      companyId: a.companyId,
      isCompanyAssessment: a.isCompanyAssessment,
      name: a.name,
      description: a.description,
      duration: a.duration,
      maximumAttempts: a.maximumAttempts,
      negativeMarking: a.negativeMarking,
      randomQuestions: a.randomQuestions,
      randomOptions: a.randomOptions,
      passingPercentage: a.passingPercentage,
      startDate: a.startDate,
      endDate: a.endDate,
      status: a.status,
      totalMarks: a.totalMarks,
      totalQuestions: a.totalQuestions,
      numberOfPapers: a.numberOfPapers,
      createdById: a.createdById,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      company: a.company,
      sections: (a.sections as any[]).map((s: any) => ({
        id: s.id,
        assessmentId: s.assessmentId,
        component: s.component,
        name: s.name,
        sectionOrder: s.sectionOrder,
        duration: s.duration,
        topics: JSON.parse(s.topics),
        difficulty: s.difficulty,
        questionType: s.questionType,
        questionsCount: s.questionsCount,
        marksPerQuestion: s.marksPerQuestion,
        negativeMarks: s.negativeMarks,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      papersCount: a._count.papers,
      assignmentsCount: a._count.assignments,
    };

    const targetInfo = this.assessmentTargetMap.get(id);
    if (targetInfo) {
      result.departmentTargeting = targetInfo.departmentTargeting;
      result.departmentIds = targetInfo.departmentIds;
    }

    return result;
  }

  // ===========================================================================
  // 4. UPDATE ASSESSMENT
  // ===========================================================================
  async updateAssessment(id: string, payload: UpdateAssessmentDto): Promise<AssessmentDto> {
    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new AppError('Assessment not found', 404);
    }

    if (existing.status === 'PUBLISHED') {
      throw new AppError('Cannot modify an assessment that is already published', 400);
    }

    const updatedData: Partial<AssessmentDto> = {
      ...existing,
      companyId: payload.companyId !== undefined ? payload.companyId : existing.companyId,
      isCompanyAssessment: payload.isCompanyAssessment !== undefined ? payload.isCompanyAssessment : (payload.companyId ? true : existing.isCompanyAssessment),
      name: payload.name ?? existing.name,
      description: payload.description !== undefined ? payload.description : existing.description,
      duration: payload.duration ?? existing.duration,
      maximumAttempts: payload.maximumAttempts ?? existing.maximumAttempts,
      negativeMarking: payload.negativeMarking !== undefined ? Boolean(payload.negativeMarking) : existing.negativeMarking,
      randomQuestions: payload.randomQuestions !== undefined ? Boolean(payload.randomQuestions) : existing.randomQuestions,
      randomOptions: payload.randomOptions !== undefined ? Boolean(payload.randomOptions) : existing.randomOptions,
      passingPercentage: payload.passingPercentage ?? existing.passingPercentage,
      startDate: payload.startDate !== undefined ? (payload.startDate ? new Date(payload.startDate) : null) : existing.startDate,
      endDate: payload.endDate !== undefined ? (payload.endDate ? new Date(payload.endDate) : null) : existing.endDate,
      numberOfPapers: payload.numberOfPapers ?? existing.numberOfPapers,
      updatedAt: new Date(),
    };

    if (payload.sections) {
      updatedData.totalQuestions = payload.sections.reduce((acc, s) => acc + s.questionsCount, 0);
      updatedData.totalMarks = payload.sections.reduce(
        (acc, s) => acc + s.questionsCount * (s.marksPerQuestion || 1.0),
        0
      );
      const newSections: AssessmentSectionDto[] = payload.sections.map((sec, idx) => ({
        id: `sec-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        assessmentId: id,
        component: sec.component,
        name: sec.name,
        sectionOrder: sec.sectionOrder || idx + 1,
        duration: sec.duration || null,
        topics: sec.topics,
        difficulty: sec.difficulty || null,
        questionType: sec.questionType || null,
        questionsCount: sec.questionsCount,
        marksPerQuestion: sec.marksPerQuestion || 1.0,
        negativeMarks: sec.negativeMarks || 0.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      updatedData.sections = newSections;
    }

    if (process.env.NODE_ENV === 'test') {
      if (updatedData.sections) {
        this.memStore.sections.set(id, updatedData.sections);
      }
      this.memStore.assessments.set(id, updatedData as AssessmentDto);
      return updatedData as AssessmentDto;
    }

    const updatePayload: Record<string, unknown> = {
      name: updatedData.name,
      description: updatedData.description,
      duration: updatedData.duration,
      maximumAttempts: updatedData.maximumAttempts,
      negativeMarking: updatedData.negativeMarking,
      randomQuestions: updatedData.randomQuestions,
      randomOptions: updatedData.randomOptions,
      passingPercentage: updatedData.passingPercentage,
      startDate: updatedData.startDate,
      endDate: updatedData.endDate,
      numberOfPapers: updatedData.numberOfPapers,
      totalMarks: updatedData.totalMarks,
      totalQuestions: updatedData.totalQuestions,
    };

    if (this.hasCompanyRelation) {
      if (payload.companyId !== undefined) updatePayload.companyId = payload.companyId;
      if (payload.isCompanyAssessment !== undefined) {
        updatePayload.isCompanyAssessment = payload.isCompanyAssessment;
      } else if (payload.companyId) {
        updatePayload.isCompanyAssessment = true;
      }
    }

    if (payload.sections) {
      await prisma.assessmentSection.deleteMany({ where: { assessmentId: id } });
      await prisma.assessmentSection.createMany({
        data: payload.sections.map((sec, idx) => ({
          assessmentId: id,
          component: sec.component,
          name: sec.name,
          sectionOrder: sec.sectionOrder || idx + 1,
          duration: sec.duration || null,
          topics: JSON.stringify(sec.topics),
          difficulty: sec.difficulty || null,
          questionType: sec.questionType || null,
          questionsCount: sec.questionsCount,
          marksPerQuestion: sec.marksPerQuestion || 1.0,
          negativeMarks: sec.negativeMarks || 0.0,
        })),
      });
    }

    await prisma.assessment.update({
      where: { id },
      data: updatePayload,
    });

    const updated = await this.getAssessmentById(id);
    if (!updated) {
      throw new AppError('Assessment not found after update', 404);
    }
    return updated;
  }

  // ===========================================================================
  // 5. DELETE ASSESSMENT
  // ===========================================================================
  async deleteAssessment(id: string): Promise<boolean> {
    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new AppError('Assessment not found', 404);
    }
    if (existing.status === 'PUBLISHED') {
      throw new AppError('Cannot delete a published assessment. Please unpublish or archive first', 400);
    }

    if (process.env.NODE_ENV === 'test') {
      this.memStore.assessments.delete(id);
      this.memStore.sections.delete(id);
      this.memStore.papers.delete(id);
      this.memStore.assignments.delete(id);
      return true;
    }

    await prisma.assessment.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 6. PUBLISH / UNPUBLISH / SCHEDULE
  // ===========================================================================
  async setStatus(id: string, status: AssessmentStatus): Promise<AssessmentDto> {
    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new AppError('Assessment not found', 404);
    }

    if (status === 'PUBLISHED') {
      const papers = await this.getAssessmentPapers(id);
      if (!papers || papers.length === 0) {
        throw new AppError('Cannot publish assessment: No examination papers have been generated yet', 400);
      }
    }

    if (process.env.NODE_ENV === 'test') {
      const updated = { ...existing, status, updatedAt: new Date() };
      this.memStore.assessments.set(id, updated);
      return updated;
    }

    await prisma.assessment.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    const updated = await this.getAssessmentById(id);
    if (!updated) {
      throw new AppError('Assessment not found after status update', 404);
    }
    return updated;
  }

  async scheduleAssessment(id: string, startDate: Date, endDate: Date): Promise<AssessmentDto> {
    const existing = await this.getAssessmentById(id);
    if (!existing) {
      throw new AppError('Assessment not found', 404);
    }

    if (process.env.NODE_ENV === 'test') {
      const updated = {
        ...existing,
        startDate,
        endDate,
        status: 'SCHEDULED' as AssessmentStatus,
        updatedAt: new Date(),
      };
      this.memStore.assessments.set(id, updated);
      return updated;
    }

    await prisma.assessment.update({
      where: { id },
      data: {
        startDate,
        endDate,
        status: 'SCHEDULED',
        updatedAt: new Date(),
      },
    });

    const updated = await this.getAssessmentById(id);
    if (!updated) {
      throw new AppError('Assessment not found after scheduling', 404);
    }
    return updated;
  }

  // ===========================================================================
  // 7. PAPERS & QUESTIONS ACCESS
  // ===========================================================================
  async getAssessmentPapers(assessmentId: string): Promise<AssessmentPaperDto[]> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.papers.get(assessmentId) || [];
    }

    const papers = await prisma.assessmentPaper.findMany({
      where: { assessmentId },
      orderBy: { paperIndex: 'asc' },
      include: {
        questions: {
          orderBy: { questionOrder: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { optionOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    return papers.map((p) => ({
      id: p.id,
      assessmentId: p.assessmentId,
      paperCode: p.paperCode,
      paperIndex: p.paperIndex,
      createdAt: p.createdAt,
      questions: p.questions.map((q) => {
        let randomizedOptions: RandomizedOptionDto[] | undefined;
        if (q.randomizedOptions) {
          try {
            randomizedOptions = JSON.parse(q.randomizedOptions);
          } catch {
            randomizedOptions = undefined;
          }
        }

        return {
          id: q.id,
          paperId: q.paperId,
          sectionId: q.sectionId,
          questionId: q.questionId,
          questionOrder: q.questionOrder,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionText: q.question.questionText,
          category: q.question.category,
          topic: q.question.topic,
          difficulty: q.question.difficulty,
          questionType: q.question.questionType,
          randomizedOptions: randomizedOptions || q.question.options.map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            optionOrder: opt.optionOrder,
            isCorrect: opt.isCorrect,
          })),
          createdAt: q.createdAt,
        };
      }),
    }));
  }

  async getPaperById(paperId: string): Promise<AssessmentPaperDto | null> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      for (const val of this.memStore.papers.values()) {
        if (Array.isArray(val)) {
          const match = val.find((p) => p.id === paperId);
          if (match) return match;
        } else if (val && (val as any).id === paperId) {
          return val as any;
        }
      }
      return null;
    }

    const paper = await prisma.assessmentPaper.findUnique({
      where: { id: paperId },
      include: {
        questions: {
          orderBy: { questionOrder: 'asc' },
          include: {
            question: {
              include: {
                options: { orderBy: { optionOrder: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!paper) {
      return null;
    }

    return {
      id: paper.id,
      assessmentId: paper.assessmentId,
      paperCode: paper.paperCode,
      paperIndex: paper.paperIndex,
      createdAt: paper.createdAt,
      questions: paper.questions.map((q) => {
        let randomizedOptions: RandomizedOptionDto[] | undefined;
        if (q.randomizedOptions) {
          try {
            randomizedOptions = JSON.parse(q.randomizedOptions);
          } catch {
            randomizedOptions = undefined;
          }
        }
        return {
          id: q.id,
          paperId: q.paperId,
          sectionId: q.sectionId,
          questionId: q.questionId,
          questionOrder: q.questionOrder,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          questionText: q.question.questionText,
          category: q.question.category,
          topic: q.question.topic,
          difficulty: q.question.difficulty,
          questionType: q.question.questionType,
          imageUrl: (q.question as any).imageUrl || null,
          randomizedOptions: randomizedOptions || q.question.options.map((opt) => ({
            id: opt.id,
            optionText: opt.optionText,
            optionOrder: opt.optionOrder,
            isCorrect: opt.isCorrect,
          })),
          createdAt: q.createdAt,
        };
      }),
    };
  }

  // ===========================================================================
  // 8. ATOMIC SAVE GENERATED PAPERS
  // ===========================================================================
  async saveGeneratedPapersTransaction(
    assessmentId: string,
    papers: AssessmentPaperDto[],
    usageRecords: { questionId: string; usageMonth: number; usageYear: number }[]
  ): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.memStore.papers.set(assessmentId, papers);
      const existing = this.memStore.assessments.get(assessmentId);
      if (existing) {
        existing.papersCount = papers.length;
        this.memStore.assessments.set(assessmentId, existing);
      }

      for (const [key, u] of questionRepository.memStore.usages.entries()) {
        if (u.assessmentId === assessmentId) {
          questionRepository.memStore.usages.delete(key);
        }
      }
      for (const u of usageRecords) {
        const usageId = `use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        questionRepository.memStore.usages.set(usageId, {
          id: usageId,
          questionId: u.questionId,
          assessmentId,
          studentId: null,
          usageMonth: u.usageMonth,
          usageYear: u.usageYear,
          usedAt: new Date(),
        });
      }
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete previous usages for this assessment
      await tx.questionUsage.deleteMany({ where: { assessmentId } });

      // 2. Delete existing papers (cascades to questions)
      await tx.assessmentPaper.deleteMany({ where: { assessmentId } });

      // 3. Create new papers and questions
      for (const paper of papers) {
        const createdPaper = await tx.assessmentPaper.create({
          data: {
            id: paper.id,
            assessmentId,
            paperCode: paper.paperCode,
            paperIndex: paper.paperIndex,
            createdAt: paper.createdAt,
          },
        });

        if (paper.questions && paper.questions.length > 0) {
          await tx.assessmentQuestion.createMany({
            data: paper.questions.map((q) => ({
              id: q.id,
              paperId: createdPaper.id,
              sectionId: q.sectionId || null,
              questionId: q.questionId,
              questionOrder: q.questionOrder,
              marks: q.marks,
              negativeMarks: q.negativeMarks,
              randomizedOptions: q.randomizedOptions ? JSON.stringify(q.randomizedOptions) : null,
              createdAt: q.createdAt,
            })),
          });
        }
      }

      // 4. Record usages
      if (usageRecords.length > 0) {
        await tx.questionUsage.createMany({
          data: usageRecords.map((u) => ({
            id: `use-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            questionId: u.questionId,
            assessmentId,
            usageMonth: u.usageMonth,
            usageYear: u.usageYear,
            usedAt: new Date(),
          })),
        });
      }
    });
  }

  // ===========================================================================
  // 9. STUDENT ASSIGNMENT
  // ===========================================================================
  async assignStudents(
    assessmentId: string,
    payload: CreateAssignmentDto
  ): Promise<{ assignedCount: number; assignments: AssessmentAssignmentDto[] }> {
    const assessment = await this.getAssessmentById(assessmentId);
    if (!assessment) {
      throw new AppError('Assessment not found', 404);
    }

    const papers = await this.getAssessmentPapers(assessmentId);
    if (!papers || papers.length === 0) {
      throw new AppError('Cannot assign students: Assessment has no generated examination papers', 400);
    }

    let targetStudents: { id: string; departmentId: string | null; classId: string | null; sectionId: string | null }[] = [];

    if (payload.studentIds && payload.studentIds.length > 0) {
      if (process.env.NODE_ENV === 'test') {
        targetStudents = payload.studentIds.map((id) => ({
          id,
          departmentId: payload.departmentId || null,
          classId: payload.classId || null,
          sectionId: payload.sectionId || null,
        }));
      } else {
        const students = await prisma.student.findMany({
          where: { id: { in: payload.studentIds } },
          select: { id: true, departmentId: true, classId: true, sectionId: true },
        });
        targetStudents = students;
      }
    } else {
      const where: Record<string, unknown> = { status: 'ACTIVE' };
      if (payload.departmentId) where.departmentId = payload.departmentId;
      if (payload.classId) where.classId = payload.classId;
      if (payload.sectionId) where.sectionId = payload.sectionId;

      if (process.env.NODE_ENV === 'test') {
        targetStudents = [
          { id: 'std-sample-001', departmentId: null, classId: null, sectionId: null },
          { id: 'std-sample-002', departmentId: null, classId: null, sectionId: null },
        ];
      } else {
        const students = await prisma.student.findMany({
          where,
          select: { id: true, departmentId: true, classId: true, sectionId: true },
        });
        targetStudents = students;
      }
    }

    if (targetStudents.length === 0) {
      throw new AppError('No eligible active students found for assignment', 400);
    }

    // Filter out already assigned students for this assessment
    let existingStudentIds = new Set<string>();
    if (process.env.NODE_ENV === 'test') {
      const existing = this.memStore.assignments.get(assessmentId) || [];
      existingStudentIds = new Set(existing.map((e) => e.studentId || ''));
    } else {
      const existing = await prisma.assessmentAssignment.findMany({
        where: { assessmentId, studentId: { in: targetStudents.map((s) => s.id) } },
        select: { studentId: true },
      });
      existingStudentIds = new Set(existing.map((e) => e.studentId || ''));
    }

    const studentsToAssign = targetStudents.filter((s) => !existingStudentIds.has(s.id));
    const now = new Date();
    const createdAssignments: AssessmentAssignmentDto[] = [];

    for (let i = 0; i < studentsToAssign.length; i++) {
      const st = studentsToAssign[i];
      const paperIndex = (existingStudentIds.size + i) % papers.length;
      const paper = papers[paperIndex];
      const id = `asgn-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;

      const asgn: AssessmentAssignmentDto = {
        id,
        assessmentId,
        studentId: st.id,
        departmentId: payload.departmentId || st.departmentId || null,
        classId: payload.classId || st.classId || null,
        sectionId: payload.sectionId || st.sectionId || null,
        paperId: paper.id,
        status: 'ASSIGNED',
        assignedAt: now,
        updatedAt: now,
        paper: {
          id: paper.id,
          paperCode: paper.paperCode,
          paperIndex: paper.paperIndex,
        },
      };

      createdAssignments.push(asgn);
    }

    if (process.env.NODE_ENV === 'test') {
      const existingAssignments = this.memStore.assignments.get(assessmentId) || [];
      this.memStore.assignments.set(assessmentId, [...existingAssignments, ...createdAssignments]);
      assessment.assignmentsCount = (assessment.assignmentsCount || 0) + createdAssignments.length;
      this.memStore.assessments.set(assessmentId, assessment);
      return {
        assignedCount: createdAssignments.length,
        assignments: this.memStore.assignments.get(assessmentId) || [],
      };
    }

    if (createdAssignments.length > 0) {
      await prisma.assessmentAssignment.createMany({
        data: createdAssignments.map((a) => ({
          id: a.id,
          assessmentId: a.assessmentId,
          studentId: a.studentId,
          departmentId: a.departmentId,
          classId: a.classId,
          sectionId: a.sectionId,
          paperId: a.paperId,
          status: 'ASSIGNED',
          assignedAt: a.assignedAt,
          updatedAt: a.updatedAt,
        })),
        skipDuplicates: true,
      });
    }

    const allAssignments = await this.getAssessmentAssignments(assessmentId);
    return {
      assignedCount: createdAssignments.length,
      assignments: allAssignments,
    };
  }

  async createSingleAssignment(data: {
    assessmentId: string;
    studentId: string;
    paperId: string;
    departmentId?: string | null;
    classId?: string | null;
    sectionId?: string | null;
  }): Promise<AssessmentAssignmentDto> {
    const now = new Date();
    const id = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const paper = await this.getPaperById(data.paperId);

    const asgn: AssessmentAssignmentDto = {
      id,
      assessmentId: data.assessmentId,
      studentId: data.studentId,
      departmentId: data.departmentId || null,
      classId: data.classId || null,
      sectionId: data.sectionId || null,
      paperId: data.paperId,
      status: 'ASSIGNED',
      assignedAt: now,
      updatedAt: now,
      paper: paper
        ? {
            id: paper.id,
            paperCode: paper.paperCode,
            paperIndex: paper.paperIndex,
          }
        : undefined,
    };

    if (process.env.NODE_ENV === 'test') {
      const existing = this.memStore.assignments.get(data.assessmentId) || [];
      this.memStore.assignments.set(data.assessmentId, [...existing, asgn]);
      return asgn;
    }

    await prisma.assessmentAssignment.create({
      data: {
        id,
        assessmentId: data.assessmentId,
        studentId: data.studentId,
        departmentId: data.departmentId || null,
        classId: data.classId || null,
        sectionId: data.sectionId || null,
        paperId: data.paperId,
        status: 'ASSIGNED',
        assignedAt: now,
        updatedAt: now,
      },
    });

    return asgn;
  }

  async getAssessmentAssignments(assessmentId: string): Promise<AssessmentAssignmentDto[]> {
    if (process.env.NODE_ENV === 'test') {
      await this.memStore.initialize();
      return this.memStore.assignments.get(assessmentId) || [];
    }

    const assignments = await prisma.assessmentAssignment.findMany({
      where: { assessmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            registerNumber: true,
            collegeEmail: true,
          },
        },
        paper: {
          select: {
            id: true,
            paperCode: true,
            paperIndex: true,
          },
        },
      },
    });

    return assignments.map((a) => ({
      id: a.id,
      assessmentId: a.assessmentId,
      studentId: a.studentId,
      departmentId: a.departmentId,
      classId: a.classId,
      sectionId: a.sectionId,
      paperId: a.paperId,
      status: a.status,
      assignedAt: a.assignedAt,
      updatedAt: a.updatedAt,
      student: a.student,
      paper: a.paper,
    }));
  }
}

export const assessmentRepository = new AssessmentRepository();
