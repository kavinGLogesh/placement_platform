import { prisma } from '../config/prisma.config.js';
import {
  CompanyDto,
  CreateCompanyDto,
  UpdateCompanyDto,
  CompanyQueryFilters,
  CompanyQuestionDto,
  QuestionDuplicateCandidateDto,
  CompanyQuestionIntelligenceDto,
  CompanyQuestionFilter,
} from '../types/company.types.js';
import { QuestionCategory, QuestionDifficulty, QuestionType } from '../types/question.types.js';
import { PaginatedResult } from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { questionRepository } from './question.repository.js';

class InMemoryCompanyStore {
  public companies: Map<string, CompanyDto> = new Map();
  public companyQuestions: Map<string, CompanyQuestionDto> = new Map();
  public duplicateCandidates: Map<string, QuestionDuplicateCandidateDto> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const initialCompanies: CreateCompanyDto[] = [
      {
        code: 'TCS',
        name: 'Tata Consultancy Services',
        description: 'Global leader in IT services, consulting & business solutions.',
        website: 'https://www.tcs.com',
        isActive: true,
      },
      {
        code: 'WIPRO',
        name: 'Wipro Limited',
        description: 'Leading technology services and consulting company.',
        website: 'https://www.wipro.com',
        isActive: true,
      },
      {
        code: 'CTS',
        name: 'Cognizant Technology Solutions',
        description: 'Multinational information technology services and consulting company.',
        website: 'https://www.cognizant.com',
        isActive: true,
      },
      {
        code: 'INFY',
        name: 'Infosys Limited',
        description: 'Global leader in next-generation digital services and consulting.',
        website: 'https://www.infosys.com',
        isActive: true,
      },
      {
        code: 'ACCN',
        name: 'Accenture',
        description: 'Global professional services company with leading capabilities in digital, cloud and security.',
        website: 'https://www.accenture.com',
        isActive: true,
      },
      {
        code: 'HCL',
        name: 'HCLTech',
        description: 'Global technology company home to 222,000+ people across 60 countries.',
        website: 'https://www.hcltech.com',
        isActive: true,
      },
    ];

    const now = new Date();
    for (let i = 0; i < initialCompanies.length; i++) {
      const c = initialCompanies[i];
      const id = `comp-${c.code.toLowerCase()}-${i + 1}`;
      this.companies.set(id, {
        id,
        code: c.code,
        name: c.name,
        description: c.description || null,
        logoUrl: null,
        website: c.website || null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        _count: { assessments: 0, questions: 0, companyQuestions: 0 },
      });
    }

    this.initialized = true;
  }
}

export class CompanyRepository {
  public memStore = new InMemoryCompanyStore();

  constructor() {
    this.memStore.initialize().catch((err) => console.error('Error init company memStore:', err));
  }

  private get isDbAvailable(): boolean {
    return (
      process.env.NODE_ENV !== 'test' &&
      Boolean((prisma as any).company) &&
      typeof (prisma as any).company?.findUnique === 'function'
    );
  }

  private get hasCompanyQuestionModel(): boolean {
    return (
      this.isDbAvailable &&
      Boolean((prisma as any).companyQuestion) &&
      typeof (prisma as any).companyQuestion?.findUnique === 'function'
    );
  }

  private get hasDuplicateCandidateModel(): boolean {
    return (
      this.isDbAvailable &&
      Boolean((prisma as any).questionDuplicateCandidate) &&
      typeof (prisma as any).questionDuplicateCandidate?.findMany === 'function'
    );
  }

  // ===========================================================================
  // 1. LIST COMPANIES (SEARCH, FILTER, PAGINATE)
  // ===========================================================================
  private async getCompaniesMemStore(
    filters: CompanyQueryFilters,
    page: number,
    limit: number,
    skip: number
  ): Promise<PaginatedResult<CompanyDto>> {
    await this.memStore.initialize();
    let list = Array.from(this.memStore.companies.values());

    if (filters.isActive !== undefined) {
      list = list.filter((c) => c.isActive === filters.isActive);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.code.toLowerCase().includes(s) ||
          (c.description && c.description.toLowerCase().includes(s))
      );
    }

    const sortField = filters.sortBy || 'name';
    const isAsc = filters.sortOrder === 'desc' ? false : true;

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

      return isAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    // Update question counts dynamically from memStore
    for (const comp of list) {
      let qCount = 0;
      for (const q of questionRepository.memStore.questions.values()) {
        if (q.companyId === comp.id || q.companyQuestions?.some((cq) => cq.companyId === comp.id)) {
          qCount++;
        }
      }
      comp._count = {
        assessments: comp._count?.assessments || 0,
        questions: qCount,
        companyQuestions: qCount,
      };
    }

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

  async getCompanies(filters: CompanyQueryFilters = {}): Promise<PaginatedResult<CompanyDto>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    if (!this.isDbAvailable) {
      return this.getCompaniesMemStore(filters, page, limit, skip);
    }

    try {
      // Prisma implementation
      const whereClause: Record<string, unknown> = {};
      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }
      if (filters.search) {
        whereClause.OR = [
          { name: { contains: filters.search } },
          { code: { contains: filters.search } },
          { description: { contains: filters.search } },
        ];
      }

      const orderBy: Record<string, 'asc' | 'desc'> = {};
      const sortField = filters.sortBy || 'name';
      orderBy[sortField] = filters.sortOrder === 'desc' ? 'desc' : 'asc';

      const [totalCount, items] = await Promise.all([
        prisma.company.count({ where: whereClause }),
        prisma.company.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy,
          include: {
            _count: {
              select: {
                assessments: true,
                questions: true,
                companyQuestions: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      const mappedItems: CompanyDto[] = items.map((c) => ({
        ...c,
        _count: {
          assessments: c._count.assessments,
          questions: Math.max(c._count.questions, c._count.companyQuestions),
          companyQuestions: c._count.companyQuestions,
        },
      }));

      return {
        data: mappedItems,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (err) {
      console.warn('Prisma company.findMany failed, falling back to memory store:', err);
      return this.getCompaniesMemStore(filters, page, limit, skip);
    }
  }

  // ===========================================================================
  // 2. GET BY ID & CODE
  // ===========================================================================
  private async getCompanyByIdMemStore(id: string): Promise<CompanyDto | null> {
    await this.memStore.initialize();
    const comp = this.memStore.companies.get(id);
    if (!comp) return null;
    let qCount = 0;
    for (const q of questionRepository.memStore.questions.values()) {
      if (q.companyId === comp.id || q.companyQuestions?.some((cq) => cq.companyId === comp.id)) {
        qCount++;
      }
    }
    comp._count = {
      assessments: comp._count?.assessments || 0,
      questions: qCount,
      companyQuestions: qCount,
    };
    return comp;
  }

  async getCompanyById(id: string): Promise<CompanyDto | null> {
    if (!this.isDbAvailable) {
      return this.getCompanyByIdMemStore(id);
    }

    try {
      const company = await prisma.company.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              assessments: true,
              questions: true,
              companyQuestions: true,
            },
          },
        },
      });

      if (!company) return null;

      return {
        ...company,
        _count: {
          assessments: company._count.assessments,
          questions: Math.max(company._count.questions, company._count.companyQuestions),
          companyQuestions: company._count.companyQuestions,
        },
      };
    } catch (err) {
      console.warn('Prisma company.findUnique failed, falling back to memory store:', err);
      return this.getCompanyByIdMemStore(id);
    }
  }

  private async getCompanyByCodeMemStore(normalized: string): Promise<CompanyDto | null> {
    await this.memStore.initialize();
    for (const comp of this.memStore.companies.values()) {
      if (comp.code.toUpperCase() === normalized) {
        return comp;
      }
    }
    return null;
  }

  async getCompanyByCode(code: string): Promise<CompanyDto | null> {
    const normalized = code.trim().toUpperCase();

    if (!this.isDbAvailable) {
      return this.getCompanyByCodeMemStore(normalized);
    }

    try {
      const company = await prisma.company.findUnique({
        where: { code: normalized },
        include: {
          _count: {
            select: {
              assessments: true,
              questions: true,
              companyQuestions: true,
            },
          },
        },
      });

      if (!company) return null;

      return {
        ...company,
        _count: {
          assessments: company._count.assessments,
          questions: Math.max(company._count.questions, company._count.companyQuestions),
          companyQuestions: company._count.companyQuestions,
        },
      };
    } catch (err) {
      console.warn('Prisma company.findUnique by code failed, falling back to memory store:', err);
      return this.getCompanyByCodeMemStore(normalized);
    }
  }

  // ===========================================================================
  // 3. CREATE & UPDATE COMPANY
  // ===========================================================================
  async createCompany(payload: CreateCompanyDto): Promise<CompanyDto> {
    const normalizedCode = payload.code.trim().toUpperCase();
    const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const memoryItem: CompanyDto = {
      id,
      code: normalizedCode,
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : null,
      logoUrl: payload.logoUrl ? payload.logoUrl.trim() : null,
      website: payload.website ? payload.website.trim() : null,
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdAt: now,
      updatedAt: now,
      _count: { assessments: 0, questions: 0, companyQuestions: 0 },
    };

    if (!this.isDbAvailable) {
      await this.memStore.initialize();
      this.memStore.companies.set(id, memoryItem);
      return memoryItem;
    }

    try {
      const created = await prisma.company.create({
        data: {
          id,
          code: normalizedCode,
          name: payload.name.trim(),
          description: payload.description ? payload.description.trim() : null,
          logoUrl: payload.logoUrl ? payload.logoUrl.trim() : null,
          website: payload.website ? payload.website.trim() : null,
          isActive: payload.isActive !== undefined ? payload.isActive : true,
        },
        include: {
          _count: {
            select: {
              assessments: true,
              questions: true,
              companyQuestions: true,
            },
          },
        },
      });

      return created as unknown as CompanyDto;
    } catch (err) {
      console.warn('Prisma company.create failed, falling back to memory store:', err);
      await this.memStore.initialize();
      this.memStore.companies.set(id, memoryItem);
      return memoryItem;
    }
  }

  async updateCompany(id: string, payload: UpdateCompanyDto): Promise<CompanyDto> {
    const existing = await this.getCompanyById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    const now = new Date();
    const normalizedCode = payload.code ? payload.code.trim().toUpperCase() : existing.code;

    const updatedMemory: CompanyDto = {
      ...existing,
      code: normalizedCode,
      name: payload.name !== undefined ? payload.name.trim() : existing.name,
      description:
        payload.description !== undefined
          ? payload.description
            ? payload.description.trim()
            : null
          : existing.description,
      logoUrl:
        payload.logoUrl !== undefined ? (payload.logoUrl ? payload.logoUrl.trim() : null) : existing.logoUrl,
      website:
        payload.website !== undefined ? (payload.website ? payload.website.trim() : null) : existing.website,
      isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
      updatedAt: now,
    };

    if (!this.isDbAvailable) {
      this.memStore.companies.set(id, updatedMemory);
      return updatedMemory;
    }

    try {
      const updated = await prisma.company.update({
        where: { id },
        data: {
          code: payload.code !== undefined ? normalizedCode : undefined,
          name: payload.name !== undefined ? payload.name.trim() : undefined,
          description:
            payload.description !== undefined
              ? payload.description
                ? payload.description.trim()
                : null
              : undefined,
          logoUrl:
            payload.logoUrl !== undefined ? (payload.logoUrl ? payload.logoUrl.trim() : null) : undefined,
          website:
            payload.website !== undefined ? (payload.website ? payload.website.trim() : null) : undefined,
          isActive: payload.isActive !== undefined ? payload.isActive : undefined,
        },
        include: {
          _count: {
            select: {
              assessments: true,
              questions: true,
              companyQuestions: true,
            },
          },
        },
      });

      return updated as unknown as CompanyDto;
    } catch (err) {
      console.warn('Prisma company.update failed, falling back to memory store:', err);
      this.memStore.companies.set(id, updatedMemory);
      return updatedMemory;
    }
  }

  // ===========================================================================
  // 4. SAFE REMOVAL / DEACTIVATION
  // ===========================================================================
  async deleteCompany(id: string): Promise<boolean> {
    const existing = await this.getCompanyById(id);
    if (!existing) {
      throw new AppError('Company not found', 404);
    }

    const assessmentCount = existing._count?.assessments ?? 0;
    const questionCount = (existing._count?.questions ?? 0) + (existing._count?.companyQuestions ?? 0);

    // If company has linked assessments or questions, block physical deletion to prevent breaking historical records
    if (assessmentCount > 0 || questionCount > 0) {
      throw new AppError(
        `Cannot permanently delete '${existing.name}'. It has ${assessmentCount} assessment(s) and ${questionCount} linked question(s). To protect historical student results and platform integrity, deactivate the company instead.`,
        409
      );
    }

    if (!this.isDbAvailable) {
      this.memStore.companies.delete(id);
      return true;
    }

    try {
      await prisma.company.delete({ where: { id } });
      return true;
    } catch (err) {
      console.warn('Prisma company.delete failed, falling back to memory store:', err);
      this.memStore.companies.delete(id);
      return true;
    }
  }

  // ===========================================================================
  // 5. COMPANY-QUESTION RELATIONSHIP & OCCURRENCE TRACKING
  // ===========================================================================
  private async recordCompanyQuestionMemStore(
    params: {
      companyId: string;
      questionId: string;
      source?: string | null;
      year?: number | null;
      label?: string;
      isReported?: boolean;
    },
    id: string,
    label: string,
    now: Date
  ): Promise<CompanyQuestionDto> {
    await this.memStore.initialize();
    // Check if link already exists
    for (const existingCQ of this.memStore.companyQuestions.values()) {
      if (existingCQ.companyId === params.companyId && existingCQ.questionId === params.questionId) {
        existingCQ.occurrenceCount += 1;
        if (params.year) existingCQ.year = params.year;
        if (params.source) existingCQ.source = params.source;
        if (existingCQ.occurrenceCount > 1) {
          existingCQ.label = 'Repeated Question';
        }
        existingCQ.updatedAt = now;
        return existingCQ;
      }
    }

    const newCQ: CompanyQuestionDto = {
      id,
      companyId: params.companyId,
      questionId: params.questionId,
      source: params.source || null,
      year: params.year || null,
      occurrenceCount: 1,
      label,
      isReported: Boolean(params.isReported),
      createdAt: now,
      updatedAt: now,
    };
    this.memStore.companyQuestions.set(id, newCQ);

    // Also mirror on memory question
    const q = questionRepository.memStore.questions.get(params.questionId);
    if (q) {
      if (!q.companyQuestions) q.companyQuestions = [];
      q.companyQuestions.push({
        id,
        companyId: params.companyId,
        source: params.source || null,
        year: params.year || null,
        occurrenceCount: 1,
        label,
      });
    }

    return newCQ;
  }

  async recordCompanyQuestion(params: {
    companyId: string;
    questionId: string;
    source?: string | null;
    year?: number | null;
    label?: string;
    isReported?: boolean;
  }): Promise<CompanyQuestionDto> {
    const now = new Date();
    const id = `cq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const label = params.label || (params.isReported ? 'Reported Question' : 'Company Tagged');

    if (!this.hasCompanyQuestionModel) {
      return this.recordCompanyQuestionMemStore(params, id, label, now);
    }

    try {
      const existing = await prisma.companyQuestion.findUnique({
        where: {
          companyId_questionId: {
            companyId: params.companyId,
            questionId: params.questionId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.companyQuestion.update({
          where: { id: existing.id },
          data: {
            occurrenceCount: existing.occurrenceCount + 1,
            source: params.source || existing.source,
            year: params.year || existing.year,
            label: existing.occurrenceCount + 1 > 1 ? 'Repeated Question' : existing.label,
          },
        });
        return updated as unknown as CompanyQuestionDto;
      }

      const created = await prisma.companyQuestion.create({
        data: {
          companyId: params.companyId,
          questionId: params.questionId,
          source: params.source || null,
          year: params.year || null,
          label,
          isReported: Boolean(params.isReported),
        },
      });

      return created as unknown as CompanyQuestionDto;
    } catch (err) {
      console.warn('Prisma companyQuestion operation failed, falling back to memory store:', err);
      return this.recordCompanyQuestionMemStore(params, id, label, now);
    }
  }

  // ===========================================================================
  // 6. COMPANY QUESTION INTELLIGENCE
  // ===========================================================================
  async getCompanyIntelligence(companyId: string): Promise<CompanyQuestionIntelligenceDto> {
    const company = await this.getCompanyById(companyId);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    let questions: Array<{
      id: string;
      category: QuestionCategory;
      topic: string;
      difficulty: QuestionDifficulty;
      questionType: QuestionType;
      cq?: {
        source?: string | null;
        year?: number | null;
        occurrenceCount: number;
        label: string;
      };
      usageCount: number;
    }> = [];

    let pendingDuplicatesCount = 0;

    const useMemStoreForIntelligence = async () => {
      await this.memStore.initialize();
      const allQuestions = Array.from(questionRepository.memStore.questions.values());
      const linkedQuestions = allQuestions.filter(
        (q) => q.companyId === companyId || q.companyQuestions?.some((cq) => cq.companyId === companyId)
      );

      questions = linkedQuestions.map((q) => {
        const cq = q.companyQuestions?.find((c) => c.companyId === companyId);
        return {
          id: q.id,
          category: q.category,
          topic: q.topic,
          difficulty: q.difficulty,
          questionType: q.questionType,
          cq: cq
            ? {
                source: cq.source,
                year: cq.year,
                occurrenceCount: cq.occurrenceCount,
                label: cq.label,
              }
            : undefined,
          usageCount: q._count?.usages || 0,
        };
      });

      for (const cand of this.memStore.duplicateCandidates.values()) {
        if (cand.companyId === companyId && cand.status === 'PENDING') {
          pendingDuplicatesCount++;
        }
      }
    };

    if (!this.hasCompanyQuestionModel || !this.hasDuplicateCandidateModel) {
      await useMemStoreForIntelligence();
    } else {
      try {
        // Prisma
        const dbQuestions = await prisma.question.findMany({
          where: {
            OR: [
              { companyId },
              { companyQuestions: { some: { companyId } } },
            ],
          },
          include: {
            companyQuestions: { where: { companyId } },
            _count: { select: { usages: true } },
          },
        });

        questions = dbQuestions.map((q) => ({
          id: q.id,
          category: q.category,
          topic: q.topic,
          difficulty: q.difficulty,
          questionType: q.questionType,
          cq: q.companyQuestions[0]
            ? {
                source: q.companyQuestions[0].source,
                year: q.companyQuestions[0].year,
                occurrenceCount: q.companyQuestions[0].occurrenceCount,
                label: q.companyQuestions[0].label,
              }
            : undefined,
          usageCount: q._count.usages,
        }));

        pendingDuplicatesCount = await prisma.questionDuplicateCandidate.count({
          where: { companyId, status: 'PENDING' },
        });
      } catch (err) {
        console.warn('Prisma getCompanyIntelligence failed, falling back to memStore:', err);
        await useMemStoreForIntelligence();
      }
    }

    // Category breakdown
    const categoryBreakdown = {
      quantitativeAptitude: 0,
      logicalReasoning: 0,
      verbalAbility: 0,
      technicalMcq: 0,
      coding: 0,
    };

    // Difficulty distribution
    const difficultyDistribution = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    // Topic map
    const topicMap: Record<string, { topic: string; category: QuestionCategory; count: number }> = {};
    const yearMap: Record<number, number> = {};

    let repeatedQuestionsCount = 0;
    let frequentlyUsedCount = 0;

    const evidenceLabels = {
      companyTagged: 0,
      reportedQuestion: 0,
      repeatedQuestion: 0,
      frequentlyUsed: 0,
      possibleDuplicate: 0,
    };

    for (const q of questions) {
      // Category
      if (q.category === 'QUANTITATIVE_APTITUDE') categoryBreakdown.quantitativeAptitude++;
      else if (q.category === 'LOGICAL_REASONING') categoryBreakdown.logicalReasoning++;
      else if (q.category === 'VERBAL_ABILITY') categoryBreakdown.verbalAbility++;
      else if (q.category === 'TECHNICAL_MCQ') categoryBreakdown.technicalMcq++;
      else if (q.category === 'CODING') categoryBreakdown.coding++;

      // Difficulty
      if (q.difficulty === 'EASY') difficultyDistribution.easy++;
      else if (q.difficulty === 'MEDIUM') difficultyDistribution.medium++;
      else if (q.difficulty === 'HARD') difficultyDistribution.hard++;

      // Topic
      const tKey = `${q.category}:${q.topic}`;
      if (!topicMap[tKey]) {
        topicMap[tKey] = { topic: q.topic, category: q.category, count: 0 };
      }
      topicMap[tKey].count++;

      // Repeated occurrence
      const occ = q.cq?.occurrenceCount ?? 1;
      if (occ > 1) {
        repeatedQuestionsCount++;
      }

      // Frequently used (used >= 3 times in assessments)
      if (q.usageCount >= 3) {
        frequentlyUsedCount++;
      }

      // Year distribution
      if (q.cq?.year) {
        yearMap[q.cq.year] = (yearMap[q.cq.year] || 0) + 1;
      }

      // Evidence Label
      const lbl = q.cq?.label;
      if (lbl === 'Repeated Question' || occ > 1) {
        evidenceLabels.repeatedQuestion++;
      } else if (lbl === 'Reported Question') {
        evidenceLabels.reportedQuestion++;
      } else if (q.usageCount >= 3) {
        evidenceLabels.frequentlyUsed++;
      } else if (lbl === 'Possible Duplicate') {
        evidenceLabels.possibleDuplicate++;
      } else {
        evidenceLabels.companyTagged++;
      }
    }

    const topicDistribution = Object.values(topicMap).sort((a, b) => b.count - a.count);
    const yearDistribution = Object.entries(yearMap)
      .map(([yr, count]) => ({ year: Number(yr), count }))
      .sort((a, b) => b.year - a.year);

    return {
      company: {
        id: company.id,
        code: company.code,
        name: company.name,
        isActive: company.isActive,
      },
      totalQuestions: questions.length,
      categoryBreakdown,
      difficultyDistribution,
      topicDistribution,
      repeatedQuestionsCount,
      frequentlyUsedCount,
      possibleDuplicatesCount: pendingDuplicatesCount,
      yearDistribution,
      evidenceLabels,
    };
  }

  // ===========================================================================
  // 7. GET COMPANY QUESTIONS WITH ADVANCED FILTERS
  // ===========================================================================
  private async getCompanyQuestionsMemStore(
    companyId: string,
    filters: CompanyQuestionFilter,
    page: number,
    limit: number,
    skip: number
  ): Promise<PaginatedResult<CompanyQuestionDto>> {
    await this.memStore.initialize();
    const allQuestions = Array.from(questionRepository.memStore.questions.values());
    let matched = allQuestions.filter(
      (q) => q.companyId === companyId || q.companyQuestions?.some((cq) => cq.companyId === companyId)
    );

    if (filters.category) matched = matched.filter((q) => q.category === filters.category);
    if (filters.topic) matched = matched.filter((q) => q.topic.toLowerCase().includes(filters.topic!.toLowerCase()));
    if (filters.difficulty) matched = matched.filter((q) => q.difficulty === filters.difficulty);
    if (filters.questionType) matched = matched.filter((q) => q.questionType === filters.questionType);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      matched = matched.filter(
        (q) => q.questionText.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s)
      );
    }

    if (filters.usageStatus === 'USED') {
      matched = matched.filter((q) => (q._count?.usages || 0) > 0);
    } else if (filters.usageStatus === 'UNUSED') {
      matched = matched.filter((q) => (q._count?.usages || 0) === 0);
    }

    const totalCount = matched.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginated = matched.slice(skip, skip + limit);

    const data: CompanyQuestionDto[] = paginated.map((q) => {
      const cq = q.companyQuestions?.find((c) => c.companyId === companyId);
      return {
        id: cq?.id || `cq-${q.id}-${companyId}`,
        companyId,
        questionId: q.id,
        source: cq?.source || null,
        year: cq?.year || null,
        occurrenceCount: cq?.occurrenceCount || 1,
        label: cq?.label || 'Company Tagged',
        isReported: cq?.label === 'Reported Question',
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        question: q,
      };
    });

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

  async getCompanyQuestions(
    companyId: string,
    filters: CompanyQuestionFilter = {}
  ): Promise<PaginatedResult<CompanyQuestionDto>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    if (!this.hasCompanyQuestionModel) {
      return this.getCompanyQuestionsMemStore(companyId, filters, page, limit, skip);
    }

    try {
      // Prisma query
      const whereClause: Record<string, unknown> = {
        OR: [
          { companyId },
          { companyQuestions: { some: { companyId } } },
        ],
      };

      if (filters.category) whereClause.category = filters.category;
      if (filters.topic) whereClause.topic = { contains: filters.topic };
      if (filters.difficulty) whereClause.difficulty = filters.difficulty;
      if (filters.questionType) whereClause.questionType = filters.questionType;

      if (filters.search) {
        whereClause.AND = [
          {
            OR: [
              { questionText: { contains: filters.search } },
              { topic: { contains: filters.search } },
            ],
          },
        ];
      }

      if (filters.usageStatus === 'USED') {
        whereClause.usages = { some: {} };
      } else if (filters.usageStatus === 'UNUSED') {
        whereClause.usages = { none: {} };
      }

      const [totalCount, questions] = await Promise.all([
        prisma.question.count({ where: whereClause }),
        prisma.question.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            options: { orderBy: { optionOrder: 'asc' } },
            companyQuestions: { where: { companyId } },
            _count: { select: { usages: true } },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / limit) || 1;

      const data: CompanyQuestionDto[] = questions.map((q) => {
        const cq = q.companyQuestions[0];
        return {
          id: cq?.id || `cq-${q.id}-${companyId}`,
          companyId,
          questionId: q.id,
          source: cq?.source || null,
          year: cq?.year || null,
          occurrenceCount: cq?.occurrenceCount || 1,
          label: cq?.label || 'Company Tagged',
          isReported: Boolean(cq?.isReported),
          createdAt: cq?.createdAt || q.createdAt,
          updatedAt: cq?.updatedAt || q.updatedAt,
          question: q as unknown as CompanyQuestionDto['question'],
        };
      });

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
    } catch (err) {
      console.warn('Prisma getCompanyQuestions failed, falling back to memStore:', err);
      return this.getCompanyQuestionsMemStore(companyId, filters, page, limit, skip);
    }
  }

  // ===========================================================================
  // 8. DUPLICATE CANDIDATE MANAGEMENT
  // ===========================================================================
  async createDuplicateCandidate(params: {
    companyId?: string | null;
    originalQuestionId: string;
    candidateQuestionId?: string | null;
    candidateText: string;
    similarityScore: number;
    reason: string;
    metadata?: string | null;
  }): Promise<QuestionDuplicateCandidateDto> {
    const id = `dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();

    const memCandidate: QuestionDuplicateCandidateDto = {
      id,
      companyId: params.companyId || null,
      originalQuestionId: params.originalQuestionId,
      candidateQuestionId: params.candidateQuestionId || null,
      candidateText: params.candidateText,
      similarityScore: params.similarityScore,
      reason: params.reason,
      status: 'PENDING',
      metadata: params.metadata || null,
      createdAt: now,
      updatedAt: now,
    };

    if (!this.hasDuplicateCandidateModel) {
      await this.memStore.initialize();
      this.memStore.duplicateCandidates.set(id, memCandidate);
      return memCandidate;
    }

    try {
      const created = await prisma.questionDuplicateCandidate.create({
        data: {
          companyId: params.companyId || undefined,
          originalQuestionId: params.originalQuestionId,
          candidateQuestionId: params.candidateQuestionId || undefined,
          candidateText: params.candidateText,
          similarityScore: params.similarityScore,
          reason: params.reason,
          status: 'PENDING',
          metadata: params.metadata || undefined,
        },
        include: {
          originalQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
          candidateQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
        },
      });

      return created as unknown as QuestionDuplicateCandidateDto;
    } catch (err) {
      console.warn('Prisma createDuplicateCandidate failed, falling back to memStore:', err);
      await this.memStore.initialize();
      this.memStore.duplicateCandidates.set(id, memCandidate);
      return memCandidate;
    }
  }

  async getDuplicateCandidates(companyId?: string): Promise<QuestionDuplicateCandidateDto[]> {
    if (!this.hasDuplicateCandidateModel) {
      await this.memStore.initialize();
      const list = Array.from(this.memStore.duplicateCandidates.values());
      if (companyId) {
        return list.filter((c) => c.companyId === companyId);
      }
      return list;
    }

    try {
      const where: Record<string, unknown> = {};
      if (companyId) where.companyId = companyId;

      const list = await prisma.questionDuplicateCandidate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          originalQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
          candidateQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
        },
      });

      return list as unknown as QuestionDuplicateCandidateDto[];
    } catch (err) {
      console.warn('Prisma getDuplicateCandidates failed, falling back to memStore:', err);
      await this.memStore.initialize();
      const list = Array.from(this.memStore.duplicateCandidates.values());
      if (companyId) {
        return list.filter((c) => c.companyId === companyId);
      }
      return list;
    }
  }

  async resolveDuplicateCandidate(
    id: string,
    status: 'CONFIRMED_DUPLICATE' | 'REJECTED'
  ): Promise<QuestionDuplicateCandidateDto> {
    if (!this.hasDuplicateCandidateModel) {
      await this.memStore.initialize();
      const item = this.memStore.duplicateCandidates.get(id);
      if (!item) throw new AppError('Duplicate candidate record not found', 404);
      item.status = status;
      item.updatedAt = new Date();
      return item;
    }

    try {
      const updated = await prisma.questionDuplicateCandidate.update({
        where: { id },
        data: { status },
        include: {
          originalQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
          candidateQuestion: {
            select: { id: true, questionText: true, category: true, topic: true },
          },
        },
      });

      return updated as unknown as QuestionDuplicateCandidateDto;
    } catch (err) {
      console.warn('Prisma resolveDuplicateCandidate failed, falling back to memStore:', err);
      await this.memStore.initialize();
      const item = this.memStore.duplicateCandidates.get(id);
      if (!item) throw new AppError('Duplicate candidate record not found', 404);
      item.status = status;
      item.updatedAt = new Date();
      return item;
    }
  }
}

export const companyRepository = new CompanyRepository();
