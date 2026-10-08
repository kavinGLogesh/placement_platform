import { prisma } from '../config/prisma.config.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  CreateGdRoundDto,
  UpdateGdRoundDto,
  CreateInterviewRoundDto,
  UpdateInterviewRoundDto,
  AttendanceStatus,
  GdRoundDto,
  GdParticipantDto,
  GdEvaluationDto,
  InterviewRoundDto,
  InterviewParticipantDto,
  InterviewEvaluationDto,
  BulkEvaluationResultDto,
} from '../types/evaluation.types.js';
import { managementRepository } from './management.repository.js';
import { userRepository } from './user.repository.js';

export class InMemoryEvaluationStore {
  public gdRounds = new Map<string, any>();
  public gdCriteria = new Map<string, any[]>(); // roundId -> criteria[]
  public gdParticipants = new Map<string, any>(); // participantId -> participant
  public gdEvaluations = new Map<string, any>(); // participantId -> evaluation
  public gdCriterionScores = new Map<string, any[]>(); // evaluationId -> scores[]

  public interviewRounds = new Map<string, any>();
  public interviewCriteria = new Map<string, any[]>(); // roundId -> criteria[]
  public interviewParticipants = new Map<string, any>(); // participantId -> participant
  public interviewEvaluations = new Map<string, any>(); // participantId -> evaluation
  public interviewCriterionScores = new Map<string, any[]>(); // evaluationId -> scores[]

  clear() {
    this.gdRounds.clear();
    this.gdCriteria.clear();
    this.gdParticipants.clear();
    this.gdEvaluations.clear();
    this.gdCriterionScores.clear();

    this.interviewRounds.clear();
    this.interviewCriteria.clear();
    this.interviewParticipants.clear();
    this.interviewEvaluations.clear();
    this.interviewCriterionScores.clear();
  }
}

export class EvaluationRepository {
  public memStore = new InMemoryEvaluationStore();

  private isTest(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      !Boolean((prisma as any).gdRound) ||
      typeof (prisma as any).gdRound?.findUnique !== 'function'
    );
  }

  // ===========================================================================
  // 1. GD ROUNDS
  // ===========================================================================

  async createGdRound(dto: CreateGdRoundDto, createdById?: string): Promise<GdRoundDto> {
    const roundId = `gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const criteriaRecords = (dto.criteria || []).map((c, idx) => ({
      id: `crit-gd-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      roundId,
      name: c.name,
      maxMarks: c.maxMarks || 10,
      order: c.order || idx + 1,
      createdAt: new Date(),
    }));

    if (this.isTest()) {
      const record: any = {
        id: roundId,
        title: dto.title,
        topic: dto.topic,
        instructions: dto.instructions || null,
        scheduledDate: new Date(dto.scheduledDate),
        durationMinutes: dto.durationMinutes || 30,
        status: 'SCHEDULED',
        evaluatorId: dto.evaluatorId || null,
        departmentId: dto.departmentId || null,
        courseId: dto.courseId || null,
        batchYear: dto.batchYear || null,
        createdById: createdById || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memStore.gdRounds.set(roundId, record);
      this.memStore.gdCriteria.set(roundId, criteriaRecords);

      // Handle student assignments if provided
      if (dto.studentIds && dto.studentIds.length > 0) {
        for (const sid of dto.studentIds) {
          const partId = `part-gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          this.memStore.gdParticipants.set(partId, {
            id: partId,
            roundId,
            studentId: sid,
            attendance: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return this.formatGdRoundInMemory(roundId);
    }

    // Prisma DB execution
    const created = await prisma.gdRound.create({
      data: {
        id: roundId,
        title: dto.title,
        topic: dto.topic,
        instructions: dto.instructions,
        scheduledDate: new Date(dto.scheduledDate),
        durationMinutes: dto.durationMinutes || 30,
        status: 'SCHEDULED',
        evaluatorId: dto.evaluatorId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        batchYear: dto.batchYear,
        createdById,
        criteria: {
          create: criteriaRecords.map((c) => ({
            id: c.id,
            name: c.name,
            maxMarks: c.maxMarks,
            order: c.order,
          })),
        },
      },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });

    if (dto.studentIds && dto.studentIds.length > 0) {
      await prisma.gdParticipant.createMany({
        data: dto.studentIds.map((sid) => ({
          roundId: created.id,
          studentId: sid,
          attendance: 'PENDING',
        })),
        skipDuplicates: true,
      });
    }

    return (await this.getGdRoundById(created.id))!;
  }

  async getGdRounds(filters?: {
    status?: string;
    evaluatorId?: string;
    departmentId?: string;
    studentId?: string;
  }): Promise<GdRoundDto[]> {
    if (this.isTest()) {
      let list = Array.from(this.memStore.gdRounds.values());

      if (filters?.status) {
        list = list.filter((r) => r.status === filters.status);
      }
      if (filters?.evaluatorId) {
        list = list.filter((r) => r.evaluatorId === filters.evaluatorId);
      }
      if (filters?.departmentId) {
        list = list.filter((r) => r.departmentId === filters.departmentId);
      }
      if (filters?.studentId) {
        const matchingRoundIds = new Set<string>();
        for (const p of this.memStore.gdParticipants.values()) {
          if (p.studentId === filters.studentId) {
            matchingRoundIds.add(p.roundId);
          }
        }
        list = list.filter((r) => matchingRoundIds.has(r.id));
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.map((r) => this.formatGdRoundInMemory(r.id));
    }

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.evaluatorId) where.evaluatorId = filters.evaluatorId;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.studentId) {
      where.participants = { some: { studentId: filters.studentId } };
    }

    const rows = await prisma.gdRound.findMany({
      where,
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                registerNumber: true,
                collegeEmail: true,
                departmentId: true,
                courseId: true,
                classId: true,
                sectionId: true,
                department: { select: { name: true, code: true } },
                course: { select: { name: true, code: true } },
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
            evaluation: {
              include: {
                evaluator: { select: { id: true, email: true } },
                criterionScores: {
                  include: { criterion: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.mapPrismaGdRound(r));
  }

  async getGdRoundById(id: string): Promise<GdRoundDto | null> {
    if (this.isTest()) {
      if (!this.memStore.gdRounds.has(id)) return null;
      return this.formatGdRoundInMemory(id);
    }

    const r = await prisma.gdRound.findUnique({
      where: { id },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                registerNumber: true,
                collegeEmail: true,
                departmentId: true,
                courseId: true,
                classId: true,
                sectionId: true,
                department: { select: { name: true, code: true } },
                course: { select: { name: true, code: true } },
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
            evaluation: {
              include: {
                evaluator: { select: { id: true, email: true } },
                criterionScores: {
                  include: { criterion: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!r) return null;
    return this.mapPrismaGdRound(r);
  }

  async updateGdRound(id: string, dto: UpdateGdRoundDto): Promise<GdRoundDto> {
    if (this.isTest()) {
      const existing = this.memStore.gdRounds.get(id);
      if (!existing) throw new Error('GD round not found');

      const updated = {
        ...existing,
        ...dto,
        updatedAt: new Date(),
      };
      this.memStore.gdRounds.set(id, updated);

      if (dto.criteria && Array.isArray(dto.criteria)) {
        const existingCriteria = this.memStore.gdCriteria.get(id) || [];
        const existingMap = new Map(existingCriteria.map((c: any) => [c.id, c]));
        const incomingIds = new Set<string>();
        const updatedList: any[] = [];

        for (const crit of dto.criteria) {
          if (crit.id && existingMap.has(crit.id)) {
            incomingIds.add(crit.id);
            updatedList.push({
              id: crit.id,
              roundId: id,
              name: crit.name,
              maxMarks: crit.maxMarks,
              order: crit.order,
              createdAt: existingMap.get(crit.id)!.createdAt,
            });
          } else {
            const newId = crit.id || `crit-gd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            incomingIds.add(newId);
            updatedList.push({
              id: newId,
              roundId: id,
              name: crit.name,
              maxMarks: crit.maxMarks,
              order: crit.order,
              createdAt: new Date(),
            });
          }
        }

        // Check if any deleted criterion has scores
        for (const existingCrit of existingCriteria) {
          if (!incomingIds.has(existingCrit.id)) {
            let hasScores = false;
            for (const scores of this.memStore.gdCriterionScores.values()) {
              if (scores.some((s) => s.criterionId === existingCrit.id)) {
                hasScores = true;
                break;
              }
            }
            if (hasScores) {
              throw new AppError(
                `Cannot remove category '${existingCrit.name}' because it already has submitted evaluations`,
                400
              );
            }
          }
        }

        this.memStore.gdCriteria.set(id, updatedList);
      }

      return this.formatGdRoundInMemory(id);
    }

    await prisma.$transaction(async (tx) => {
      await tx.gdRound.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.topic !== undefined && { topic: dto.topic }),
          ...(dto.instructions !== undefined && { instructions: dto.instructions }),
          ...(dto.scheduledDate !== undefined && { scheduledDate: new Date(dto.scheduledDate) }),
          ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.evaluatorId !== undefined && { evaluatorId: dto.evaluatorId }),
          ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
          ...(dto.courseId !== undefined && { courseId: dto.courseId }),
          ...(dto.batchYear !== undefined && { batchYear: dto.batchYear }),
        },
      });

      if (dto.criteria && Array.isArray(dto.criteria)) {
        const existingCriteria = await tx.gdCriterion.findMany({
          where: { roundId: id },
        });
        const existingMap = new Map(existingCriteria.map((c) => [c.id, c]));
        const incomingIds = new Set<string>();

        for (const crit of dto.criteria) {
          if (crit.id && existingMap.has(crit.id)) {
            incomingIds.add(crit.id);
            await tx.gdCriterion.update({
              where: { id: crit.id },
              data: {
                name: crit.name,
                maxMarks: crit.maxMarks,
                order: crit.order,
              },
            });
          } else {
            const created = await tx.gdCriterion.create({
              data: {
                roundId: id,
                name: crit.name,
                maxMarks: crit.maxMarks,
                order: crit.order,
              },
            });
            incomingIds.add(created.id);
          }
        }

        // Handle criteria removal
        for (const existingCrit of existingCriteria) {
          if (!incomingIds.has(existingCrit.id)) {
            const scoreCount = await tx.gdCriterionScore.count({
              where: { criterionId: existingCrit.id },
            });
            if (scoreCount > 0) {
              throw new AppError(
                `Cannot remove category '${existingCrit.name}' because it already has submitted evaluations`,
                400
              );
            }
            await tx.gdCriterion.delete({
              where: { id: existingCrit.id },
            });
          }
        }
      }
    });

    return (await this.getGdRoundById(id))!;
  }

  async deleteGdRound(id: string): Promise<void> {
    if (this.isTest()) {
      this.memStore.gdRounds.delete(id);
      this.memStore.gdCriteria.delete(id);
      for (const [pid, p] of this.memStore.gdParticipants.entries()) {
        if (p.roundId === id) {
          this.memStore.gdParticipants.delete(pid);
          this.memStore.gdEvaluations.delete(pid);
        }
      }
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.gdCriterionScore.deleteMany({
        where: { evaluation: { participant: { roundId: id } } },
      });
      await tx.gdEvaluation.deleteMany({
        where: { participant: { roundId: id } },
      });
      await tx.gdParticipant.deleteMany({
        where: { roundId: id },
      });
      await tx.gdCriterion.deleteMany({
        where: { roundId: id },
      });
      await tx.gdRound.delete({ where: { id } });
    });
  }

  async assignStudentsToGdRound(roundId: string, studentIds: string[]): Promise<number> {
    if (this.isTest()) {
      let count = 0;
      for (const sid of studentIds) {
        // check duplicate
        const exists = Array.from(this.memStore.gdParticipants.values()).some(
          (p) => p.roundId === roundId && p.studentId === sid
        );
        if (!exists) {
          const partId = `part-gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          this.memStore.gdParticipants.set(partId, {
            id: partId,
            roundId,
            studentId: sid,
            attendance: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          count++;
        }
      }
      return count;
    }

    const res = await prisma.gdParticipant.createMany({
      data: studentIds.map((sid) => ({
        roundId,
        studentId: sid,
        attendance: 'PENDING',
      })),
      skipDuplicates: true,
    });
    return res.count;
  }

  async removeParticipantFromGd(participantId: string): Promise<void> {
    if (this.isTest()) {
      this.memStore.gdParticipants.delete(participantId);
      this.memStore.gdEvaluations.delete(participantId);
      return;
    }

    await prisma.gdParticipant.delete({ where: { id: participantId } });
  }

  async updateGdAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    if (this.isTest()) {
      const part = this.memStore.gdParticipants.get(participantId);
      if (!part) throw new Error('Participant not found');
      part.attendance = attendance;
      part.updatedAt = new Date();
      return;
    }

    await prisma.gdParticipant.update({
      where: { id: participantId },
      data: { attendance },
    });
  }

  async batchUpdateGdAttendance(
    records: Array<{ participantId: string; attendance: AttendanceStatus }>
  ): Promise<void> {
    if (this.isTest()) {
      for (const r of records) {
        const part = this.memStore.gdParticipants.get(r.participantId);
        if (part) {
          part.attendance = r.attendance;
          part.updatedAt = new Date();
        }
      }
      return;
    }

    await prisma.$transaction(
      records.map((r) =>
        prisma.gdParticipant.update({
          where: { id: r.participantId },
          data: { attendance: r.attendance },
        })
      )
    );
  }

  async getGdParticipantById(participantId: string): Promise<any> {
    if (this.isTest()) {
      const p = this.memStore.gdParticipants.get(participantId);
      if (!p) return null;
      const rawRound = this.memStore.gdRounds.get(p.roundId);
      const criteria = rawRound ? this.memStore.gdCriteria.get(p.roundId) || [] : [];
      const round = rawRound ? { ...rawRound, criteria } : null;
      const student = managementRepository.memStore.students.get(p.studentId);
      const evaluation = this.memStore.gdEvaluations.get(p.id) || null;
      return {
        ...p,
        round,
        student,
        evaluation,
      };
    }

    return prisma.gdParticipant.findUnique({
      where: { id: participantId },
      include: {
        round: {
          include: {
            criteria: { orderBy: { order: 'asc' } },
            evaluator: true,
          },
        },
        student: {
          include: {
            department: true,
            course: true,
          },
        },
        evaluation: {
          include: {
            criterionScores: {
              include: { criterion: true },
            },
          },
        },
      },
    });
  }

  async saveGdEvaluation(params: {
    participantId: string;
    evaluatorId: string;
    feedback?: string;
    criterionScores: Array<{
      criterionId: string;
      score: number;
      maxMarks: number;
      comment?: string;
    }>;
    totalScore: number;
    maxPossibleMarks: number;
    percentage: number;
  }): Promise<GdEvaluationDto> {
    const evalId = `eval-gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (this.isTest()) {
      // Mark attendance PRESENT if pending
      const part = this.memStore.gdParticipants.get(params.participantId);
      if (part && part.attendance === 'PENDING') {
        part.attendance = 'PRESENT';
      }

      const evalRecord = {
        id: evalId,
        participantId: params.participantId,
        evaluatorId: params.evaluatorId,
        totalScore: params.totalScore,
        maxPossibleMarks: params.maxPossibleMarks,
        percentage: params.percentage,
        feedback: params.feedback || null,
        status: 'EVALUATED',
        evaluatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memStore.gdEvaluations.set(params.participantId, evalRecord);

      const scoreRecords = params.criterionScores.map((cs, idx) => ({
        id: `cs-gd-${Date.now()}-${idx}`,
        evaluationId: evalId,
        criterionId: cs.criterionId,
        score: cs.score,
        maxMarks: cs.maxMarks,
        comment: cs.comment || null,
      }));
      this.memStore.gdCriterionScores.set(evalId, scoreRecords);

      return this.formatGdEvaluationInMemory(params.participantId);
    }

    // Prisma DB execution
    await prisma.$transaction(async (tx) => {
      // Auto-mark present if pending
      await tx.gdParticipant.update({
        where: { id: params.participantId },
        data: { attendance: 'PRESENT' },
      });

      // Upsert evaluation
      const createdEval = await tx.gdEvaluation.upsert({
        where: { participantId: params.participantId },
        update: {
          evaluatorId: params.evaluatorId,
          totalScore: params.totalScore,
          maxPossibleMarks: params.maxPossibleMarks,
          percentage: params.percentage,
          feedback: params.feedback,
          status: 'EVALUATED',
          evaluatedAt: new Date(),
        },
        create: {
          id: evalId,
          participantId: params.participantId,
          evaluatorId: params.evaluatorId,
          totalScore: params.totalScore,
          maxPossibleMarks: params.maxPossibleMarks,
          percentage: params.percentage,
          feedback: params.feedback,
          status: 'EVALUATED',
        },
      });

      // Clear existing criterion scores if updating
      await tx.gdCriterionScore.deleteMany({
        where: { evaluationId: createdEval.id },
      });

      // Insert fresh scores
      await tx.gdCriterionScore.createMany({
        data: params.criterionScores.map((cs) => ({
          evaluationId: createdEval.id,
          criterionId: cs.criterionId,
          score: cs.score,
          maxMarks: cs.maxMarks,
          comment: cs.comment,
        })),
      });
    });

    return (await this.getGdEvaluationByParticipantId(params.participantId))!;
  }

  async bulkSaveGdEvaluations(params: {
    roundId: string;
    evaluatorId: string;
    isDraft: boolean;
    evaluations: Array<{
      studentId: string;
      participantId?: string;
      feedback?: string;
      criterionScores: Array<{
        criterionId: string;
        score: number;
        maxMarks: number;
        comment?: string;
      }>;
      totalScore: number;
      maxPossibleMarks: number;
      percentage: number;
    }>;
  }): Promise<BulkEvaluationResultDto> {
    const status = params.isDraft ? 'DRAFT' : 'EVALUATED';

    if (this.isTest()) {
      const results: any[] = [];
      const round = this.memStore.gdRounds.get(params.roundId);
      if (round && !params.isDraft && round.status === 'SCHEDULED') {
        round.status = 'IN_PROGRESS';
        round.updatedAt = new Date();
      }

      for (const item of params.evaluations) {
        let part = Array.from(this.memStore.gdParticipants.values()).find(
          (p: any) => p.roundId === params.roundId && p.studentId === item.studentId
        );

        if (!part) {
          const partId = `part-gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          part = {
            id: partId,
            roundId: params.roundId,
            studentId: item.studentId,
            attendance: params.isDraft ? 'PENDING' : 'PRESENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.memStore.gdParticipants.set(partId, part);
        } else if (!params.isDraft) {
          part.attendance = 'PRESENT';
          part.updatedAt = new Date();
        }

        const existingEval = this.memStore.gdEvaluations.get(part.id);
        const evalId = existingEval?.id || `eval-gd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const evalRecord = {
          id: evalId,
          participantId: part.id,
          evaluatorId: params.evaluatorId,
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          feedback: item.feedback || null,
          status,
          evaluatedAt: new Date(),
          createdAt: existingEval?.createdAt || new Date(),
          updatedAt: new Date(),
        };
        this.memStore.gdEvaluations.set(part.id, evalRecord);

        const scoreRecords = item.criterionScores.map((cs, idx) => ({
          id: `cs-gd-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          evaluationId: evalId,
          criterionId: cs.criterionId,
          score: cs.score,
          maxMarks: cs.maxMarks,
          comment: cs.comment || null,
        }));
        this.memStore.gdCriterionScores.set(evalId, scoreRecords);

        const student = managementRepository.memStore.students.get(item.studentId);
        results.push({
          studentId: item.studentId,
          participantId: part.id,
          studentName: student?.name || 'Student',
          registerNumber: student?.registerNumber || '',
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          status,
          criterionScoresCount: item.criterionScores.length,
        });
      }

      return {
        roundId: params.roundId,
        roundType: 'GD',
        status,
        evaluatedCount: results.length,
        totalProcessed: results.length,
        isDraft: params.isDraft,
        results,
      };
    }

    // Prisma DB Transaction
    const results = await prisma.$transaction(async (tx) => {
      if (!params.isDraft) {
        const round = await tx.gdRound.findUnique({ where: { id: params.roundId } });
        if (round && round.status === 'SCHEDULED') {
          await tx.gdRound.update({
            where: { id: params.roundId },
            data: { status: 'IN_PROGRESS' },
          });
        }
      }

      const batchResults: any[] = [];

      for (const item of params.evaluations) {
        let participant = await tx.gdParticipant.findUnique({
          where: {
            roundId_studentId: {
              roundId: params.roundId,
              studentId: item.studentId,
            },
          },
          include: {
            student: { select: { id: true, name: true, registerNumber: true } },
          },
        });

        if (!participant) {
          participant = await tx.gdParticipant.create({
            data: {
              roundId: params.roundId,
              studentId: item.studentId,
              attendance: params.isDraft ? 'PENDING' : 'PRESENT',
            },
            include: {
              student: { select: { id: true, name: true, registerNumber: true } },
            },
          });
        } else if (!params.isDraft && participant.attendance === 'PENDING') {
          await tx.gdParticipant.update({
            where: { id: participant.id },
            data: { attendance: 'PRESENT' },
          });
        }

        const evalRecord = await tx.gdEvaluation.upsert({
          where: { participantId: participant.id },
          update: {
            evaluatorId: params.evaluatorId,
            totalScore: item.totalScore,
            maxPossibleMarks: item.maxPossibleMarks,
            percentage: item.percentage,
            feedback: item.feedback,
            status,
            evaluatedAt: new Date(),
          },
          create: {
            participantId: participant.id,
            evaluatorId: params.evaluatorId,
            totalScore: item.totalScore,
            maxPossibleMarks: item.maxPossibleMarks,
            percentage: item.percentage,
            feedback: item.feedback,
            status,
          },
        });

        await tx.gdCriterionScore.deleteMany({
          where: { evaluationId: evalRecord.id },
        });

        if (item.criterionScores.length > 0) {
          await tx.gdCriterionScore.createMany({
            data: item.criterionScores.map((cs) => ({
              evaluationId: evalRecord.id,
              criterionId: cs.criterionId,
              score: cs.score,
              maxMarks: cs.maxMarks,
              comment: cs.comment,
            })),
          });
        }

        batchResults.push({
          studentId: item.studentId,
          participantId: participant.id,
          studentName: participant.student?.name || 'Student',
          registerNumber: participant.student?.registerNumber || '',
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          status,
          criterionScoresCount: item.criterionScores.length,
        });
      }

      return batchResults;
    });

    return {
      roundId: params.roundId,
      roundType: 'GD',
      status,
      evaluatedCount: results.length,
      totalProcessed: results.length,
      isDraft: params.isDraft,
      results,
    };
  }

  async getGdEvaluationByParticipantId(participantId: string): Promise<GdEvaluationDto | null> {
    if (this.isTest()) {
      return this.formatGdEvaluationInMemory(participantId);
    }

    const row = await prisma.gdEvaluation.findUnique({
      where: { participantId },
      include: {
        evaluator: { select: { id: true, email: true } },
        criterionScores: {
          include: { criterion: { select: { name: true } } },
        },
      },
    });

    if (!row) return null;
    return this.mapPrismaGdEvaluation(row);
  }

  async getGdEvaluationsForStudent(studentId: string): Promise<any[]> {
    if (this.isTest()) {
      const results: any[] = [];
      for (const p of this.memStore.gdParticipants.values()) {
        if (p.studentId === studentId) {
          const evalObj = this.memStore.gdEvaluations.get(p.id);
          const round = this.memStore.gdRounds.get(p.roundId);
          results.push({
            participantId: p.id,
            roundId: p.roundId,
            title: round?.title || 'GD Round',
            topic: round?.topic || '',
            scheduledDate: round?.scheduledDate || new Date(),
            attendance: p.attendance,
            evaluation: evalObj ? this.formatGdEvaluationInMemory(p.id) : null,
          });
        }
      }
      results.sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      return results;
    }

    const participations = await prisma.gdParticipant.findMany({
      where: { studentId },
      include: {
        round: {
          include: {
            criteria: { orderBy: { order: 'asc' } },
            evaluator: { select: { id: true, email: true } },
          },
        },
        evaluation: {
          include: {
            evaluator: { select: { id: true, email: true } },
            criterionScores: {
              include: { criterion: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { round: { scheduledDate: 'asc' } },
    });

    return participations.map((p) => ({
      participantId: p.id,
      roundId: p.roundId,
      title: p.round.title,
      topic: p.round.topic,
      scheduledDate: p.round.scheduledDate,
      attendance: p.attendance,
      evaluation: p.evaluation ? this.mapPrismaGdEvaluation(p.evaluation) : null,
    }));
  }

  // ===========================================================================
  // 2. INTERVIEW ROUNDS
  // ===========================================================================

  async createInterviewRound(dto: CreateInterviewRoundDto, createdById?: string): Promise<InterviewRoundDto> {
    const roundId = `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const criteriaRecords = (dto.criteria || []).map((c, idx) => ({
      id: `crit-int-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      roundId,
      name: c.name,
      maxMarks: c.maxMarks || 10,
      order: c.order || idx + 1,
      createdAt: new Date(),
    }));

    if (this.isTest()) {
      const record: any = {
        id: roundId,
        title: dto.title,
        interviewType: dto.interviewType,
        instructions: dto.instructions || null,
        scheduledDate: new Date(dto.scheduledDate),
        durationMinutes: dto.durationMinutes || 30,
        status: 'SCHEDULED',
        evaluatorId: dto.evaluatorId || null,
        departmentId: dto.departmentId || null,
        courseId: dto.courseId || null,
        batchYear: dto.batchYear || null,
        createdById: createdById || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memStore.interviewRounds.set(roundId, record);
      this.memStore.interviewCriteria.set(roundId, criteriaRecords);

      if (dto.studentIds && dto.studentIds.length > 0) {
        for (const sid of dto.studentIds) {
          const partId = `part-int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          this.memStore.interviewParticipants.set(partId, {
            id: partId,
            roundId,
            studentId: sid,
            attendance: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      return this.formatInterviewRoundInMemory(roundId);
    }

    const created = await prisma.interviewRound.create({
      data: {
        id: roundId,
        title: dto.title,
        interviewType: dto.interviewType,
        instructions: dto.instructions,
        scheduledDate: new Date(dto.scheduledDate),
        durationMinutes: dto.durationMinutes || 30,
        status: 'SCHEDULED',
        evaluatorId: dto.evaluatorId,
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        batchYear: dto.batchYear,
        createdById,
        criteria: {
          create: criteriaRecords.map((c) => ({
            id: c.id,
            name: c.name,
            maxMarks: c.maxMarks,
            order: c.order,
          })),
        },
      },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
      },
    });

    if (dto.studentIds && dto.studentIds.length > 0) {
      await prisma.interviewParticipant.createMany({
        data: dto.studentIds.map((sid) => ({
          roundId: created.id,
          studentId: sid,
          attendance: 'PENDING',
        })),
        skipDuplicates: true,
      });
    }

    return (await this.getInterviewRoundById(created.id))!;
  }

  async getInterviewRounds(filters?: {
    status?: string;
    interviewType?: string;
    evaluatorId?: string;
    departmentId?: string;
    studentId?: string;
  }): Promise<InterviewRoundDto[]> {
    if (this.isTest()) {
      let list = Array.from(this.memStore.interviewRounds.values());

      if (filters?.status) {
        list = list.filter((r) => r.status === filters.status);
      }
      if (filters?.interviewType) {
        list = list.filter((r) => r.interviewType === filters.interviewType);
      }
      if (filters?.evaluatorId) {
        list = list.filter((r) => r.evaluatorId === filters.evaluatorId);
      }
      if (filters?.departmentId) {
        list = list.filter((r) => r.departmentId === filters.departmentId);
      }
      if (filters?.studentId) {
        const matchingRoundIds = new Set<string>();
        for (const p of this.memStore.interviewParticipants.values()) {
          if (p.studentId === filters.studentId) {
            matchingRoundIds.add(p.roundId);
          }
        }
        list = list.filter((r) => matchingRoundIds.has(r.id));
      }

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list.map((r) => this.formatInterviewRoundInMemory(r.id));
    }

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.interviewType) where.interviewType = filters.interviewType;
    if (filters?.evaluatorId) where.evaluatorId = filters.evaluatorId;
    if (filters?.departmentId) where.departmentId = filters.departmentId;
    if (filters?.studentId) {
      where.participants = { some: { studentId: filters.studentId } };
    }

    const rows = await prisma.interviewRound.findMany({
      where,
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                registerNumber: true,
                collegeEmail: true,
                department: { select: { name: true } },
                course: { select: { name: true } },
              },
            },
            evaluation: {
              include: {
                evaluator: { select: { id: true, email: true } },
                criterionScores: {
                  include: { criterion: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((r) => this.mapPrismaInterviewRound(r));
  }

  async getInterviewRoundById(id: string): Promise<InterviewRoundDto | null> {
    if (this.isTest()) {
      if (!this.memStore.interviewRounds.has(id)) return null;
      return this.formatInterviewRoundInMemory(id);
    }

    const r = await prisma.interviewRound.findUnique({
      where: { id },
      include: {
        criteria: { orderBy: { order: 'asc' } },
        evaluator: { select: { id: true, email: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        participants: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                registerNumber: true,
                collegeEmail: true,
                department: { select: { name: true } },
                course: { select: { name: true } },
              },
            },
            evaluation: {
              include: {
                evaluator: { select: { id: true, email: true } },
                criterionScores: {
                  include: { criterion: { select: { name: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!r) return null;
    return this.mapPrismaInterviewRound(r);
  }

  async updateInterviewRound(id: string, dto: UpdateInterviewRoundDto): Promise<InterviewRoundDto> {
    if (this.isTest()) {
      const existing = this.memStore.interviewRounds.get(id);
      if (!existing) throw new Error('Interview round not found');

      const updated = {
        ...existing,
        ...dto,
        updatedAt: new Date(),
      };
      this.memStore.interviewRounds.set(id, updated);
      return this.formatInterviewRoundInMemory(id);
    }

    await prisma.interviewRound.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.interviewType !== undefined && { interviewType: dto.interviewType }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.scheduledDate !== undefined && { scheduledDate: new Date(dto.scheduledDate) }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.evaluatorId !== undefined && { evaluatorId: dto.evaluatorId }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.courseId !== undefined && { courseId: dto.courseId }),
        ...(dto.batchYear !== undefined && { batchYear: dto.batchYear }),
      },
    });

    return (await this.getInterviewRoundById(id))!;
  }

  async deleteInterviewRound(id: string): Promise<void> {
    if (this.isTest()) {
      this.memStore.interviewRounds.delete(id);
      this.memStore.interviewCriteria.delete(id);
      for (const [pid, p] of this.memStore.interviewParticipants.entries()) {
        if (p.roundId === id) {
          this.memStore.interviewParticipants.delete(pid);
          this.memStore.interviewEvaluations.delete(pid);
        }
      }
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.interviewCriterionScore.deleteMany({
        where: { evaluation: { participant: { roundId: id } } },
      });
      await tx.interviewEvaluation.deleteMany({
        where: { participant: { roundId: id } },
      });
      await tx.interviewParticipant.deleteMany({
        where: { roundId: id },
      });
      await tx.interviewCriterion.deleteMany({
        where: { roundId: id },
      });
      await tx.interviewRound.delete({ where: { id } });
    });
  }

  async assignStudentsToInterviewRound(roundId: string, studentIds: string[]): Promise<number> {
    if (this.isTest()) {
      let count = 0;
      for (const sid of studentIds) {
        const exists = Array.from(this.memStore.interviewParticipants.values()).some(
          (p) => p.roundId === roundId && p.studentId === sid
        );
        if (!exists) {
          const partId = `part-int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          this.memStore.interviewParticipants.set(partId, {
            id: partId,
            roundId,
            studentId: sid,
            attendance: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          count++;
        }
      }
      return count;
    }

    const res = await prisma.interviewParticipant.createMany({
      data: studentIds.map((sid) => ({
        roundId,
        studentId: sid,
        attendance: 'PENDING',
      })),
      skipDuplicates: true,
    });
    return res.count;
  }

  async removeParticipantFromInterview(participantId: string): Promise<void> {
    if (this.isTest()) {
      this.memStore.interviewParticipants.delete(participantId);
      this.memStore.interviewEvaluations.delete(participantId);
      return;
    }

    await prisma.interviewParticipant.delete({ where: { id: participantId } });
  }

  async updateInterviewAttendance(participantId: string, attendance: AttendanceStatus): Promise<void> {
    if (this.isTest()) {
      const part = this.memStore.interviewParticipants.get(participantId);
      if (!part) throw new Error('Participant not found');
      part.attendance = attendance;
      part.updatedAt = new Date();
      return;
    }

    await prisma.interviewParticipant.update({
      where: { id: participantId },
      data: { attendance },
    });
  }

  async batchUpdateInterviewAttendance(
    records: Array<{ participantId: string; attendance: AttendanceStatus }>
  ): Promise<void> {
    if (this.isTest()) {
      for (const r of records) {
        const part = this.memStore.interviewParticipants.get(r.participantId);
        if (part) {
          part.attendance = r.attendance;
          part.updatedAt = new Date();
        }
      }
      return;
    }

    await prisma.$transaction(
      records.map((r) =>
        prisma.interviewParticipant.update({
          where: { id: r.participantId },
          data: { attendance: r.attendance },
        })
      )
    );
  }

  async getInterviewParticipantById(participantId: string): Promise<any> {
    if (this.isTest()) {
      const p = this.memStore.interviewParticipants.get(participantId);
      if (!p) return null;
      const rawRound = this.memStore.interviewRounds.get(p.roundId);
      const criteria = rawRound ? this.memStore.interviewCriteria.get(p.roundId) || [] : [];
      const round = rawRound ? { ...rawRound, criteria } : null;
      const student = managementRepository.memStore.students.get(p.studentId);
      const evaluation = this.memStore.interviewEvaluations.get(p.id) || null;
      return {
        ...p,
        round,
        student,
        evaluation,
      };
    }

    return prisma.interviewParticipant.findUnique({
      where: { id: participantId },
      include: {
        round: {
          include: {
            criteria: { orderBy: { order: 'asc' } },
            evaluator: true,
          },
        },
        student: {
          include: {
            department: true,
            course: true,
          },
        },
        evaluation: {
          include: {
            criterionScores: {
              include: { criterion: true },
            },
          },
        },
      },
    });
  }

  async saveInterviewEvaluation(params: {
    participantId: string;
    evaluatorId: string;
    strengths?: string;
    areasForImprovement?: string;
    overallFeedback?: string;
    criterionScores: Array<{
      criterionId: string;
      score: number;
      maxMarks: number;
      comment?: string;
    }>;
    totalScore: number;
    maxPossibleMarks: number;
    percentage: number;
  }): Promise<InterviewEvaluationDto> {
    const evalId = `eval-int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (this.isTest()) {
      const part = this.memStore.interviewParticipants.get(params.participantId);
      if (part && part.attendance === 'PENDING') {
        part.attendance = 'PRESENT';
      }

      const evalRecord = {
        id: evalId,
        participantId: params.participantId,
        evaluatorId: params.evaluatorId,
        totalScore: params.totalScore,
        maxPossibleMarks: params.maxPossibleMarks,
        percentage: params.percentage,
        strengths: params.strengths || null,
        areasForImprovement: params.areasForImprovement || null,
        overallFeedback: params.overallFeedback || null,
        status: 'EVALUATED',
        evaluatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.memStore.interviewEvaluations.set(params.participantId, evalRecord);

      const scoreRecords = params.criterionScores.map((cs, idx) => ({
        id: `cs-int-${Date.now()}-${idx}`,
        evaluationId: evalId,
        criterionId: cs.criterionId,
        score: cs.score,
        maxMarks: cs.maxMarks,
        comment: cs.comment || null,
      }));
      this.memStore.interviewCriterionScores.set(evalId, scoreRecords);

      return this.formatInterviewEvaluationInMemory(params.participantId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.interviewParticipant.update({
        where: { id: params.participantId },
        data: { attendance: 'PRESENT' },
      });

      const createdEval = await tx.interviewEvaluation.upsert({
        where: { participantId: params.participantId },
        update: {
          evaluatorId: params.evaluatorId,
          totalScore: params.totalScore,
          maxPossibleMarks: params.maxPossibleMarks,
          percentage: params.percentage,
          strengths: params.strengths,
          areasForImprovement: params.areasForImprovement,
          overallFeedback: params.overallFeedback,
          status: 'EVALUATED',
          evaluatedAt: new Date(),
        },
        create: {
          id: evalId,
          participantId: params.participantId,
          evaluatorId: params.evaluatorId,
          totalScore: params.totalScore,
          maxPossibleMarks: params.maxPossibleMarks,
          percentage: params.percentage,
          strengths: params.strengths,
          areasForImprovement: params.areasForImprovement,
          overallFeedback: params.overallFeedback,
          status: 'EVALUATED',
        },
      });

      await tx.interviewCriterionScore.deleteMany({
        where: { evaluationId: createdEval.id },
      });

      await tx.interviewCriterionScore.createMany({
        data: params.criterionScores.map((cs) => ({
          evaluationId: createdEval.id,
          criterionId: cs.criterionId,
          score: cs.score,
          maxMarks: cs.maxMarks,
          comment: cs.comment,
        })),
      });
    });

    return (await this.getInterviewEvaluationByParticipantId(params.participantId))!;
  }

  async bulkSaveInterviewEvaluations(params: {
    roundId: string;
    evaluatorId: string;
    isDraft: boolean;
    evaluations: Array<{
      studentId: string;
      participantId?: string;
      strengths?: string;
      areasForImprovement?: string;
      overallFeedback?: string;
      criterionScores: Array<{
        criterionId: string;
        score: number;
        maxMarks: number;
        comment?: string;
      }>;
      totalScore: number;
      maxPossibleMarks: number;
      percentage: number;
    }>;
  }): Promise<BulkEvaluationResultDto> {
    const status = params.isDraft ? 'DRAFT' : 'EVALUATED';

    if (this.isTest()) {
      const results: any[] = [];
      const round = this.memStore.interviewRounds.get(params.roundId);
      if (round && !params.isDraft && round.status === 'SCHEDULED') {
        round.status = 'IN_PROGRESS';
        round.updatedAt = new Date();
      }

      for (const item of params.evaluations) {
        let part = Array.from(this.memStore.interviewParticipants.values()).find(
          (p: any) => p.roundId === params.roundId && p.studentId === item.studentId
        );

        if (!part) {
          const partId = `part-int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          part = {
            id: partId,
            roundId: params.roundId,
            studentId: item.studentId,
            attendance: params.isDraft ? 'PENDING' : 'PRESENT',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.memStore.interviewParticipants.set(partId, part);
        } else if (!params.isDraft) {
          part.attendance = 'PRESENT';
          part.updatedAt = new Date();
        }

        const existingEval = this.memStore.interviewEvaluations.get(part.id);
        const evalId = existingEval?.id || `eval-int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const evalRecord = {
          id: evalId,
          participantId: part.id,
          evaluatorId: params.evaluatorId,
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          strengths: item.strengths || null,
          areasForImprovement: item.areasForImprovement || null,
          overallFeedback: item.overallFeedback || null,
          status,
          evaluatedAt: new Date(),
          createdAt: existingEval?.createdAt || new Date(),
          updatedAt: new Date(),
        };
        this.memStore.interviewEvaluations.set(part.id, evalRecord);

        const scoreRecords = item.criterionScores.map((cs, idx) => ({
          id: `cs-int-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          evaluationId: evalId,
          criterionId: cs.criterionId,
          score: cs.score,
          maxMarks: cs.maxMarks,
          comment: cs.comment || null,
        }));
        this.memStore.interviewCriterionScores.set(evalId, scoreRecords);

        const student = managementRepository.memStore.students.get(item.studentId);
        results.push({
          studentId: item.studentId,
          participantId: part.id,
          studentName: student?.name || 'Student',
          registerNumber: student?.registerNumber || '',
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          status,
          criterionScoresCount: item.criterionScores.length,
        });
      }

      return {
        roundId: params.roundId,
        roundType: 'INTERVIEW',
        status,
        evaluatedCount: results.length,
        totalProcessed: results.length,
        isDraft: params.isDraft,
        results,
      };
    }

    // Prisma DB Transaction
    const results = await prisma.$transaction(async (tx) => {
      if (!params.isDraft) {
        const round = await tx.interviewRound.findUnique({ where: { id: params.roundId } });
        if (round && round.status === 'SCHEDULED') {
          await tx.interviewRound.update({
            where: { id: params.roundId },
            data: { status: 'IN_PROGRESS' },
          });
        }
      }

      const batchResults: any[] = [];

      for (const item of params.evaluations) {
        let participant = await tx.interviewParticipant.findUnique({
          where: {
            roundId_studentId: {
              roundId: params.roundId,
              studentId: item.studentId,
            },
          },
          include: {
            student: { select: { id: true, name: true, registerNumber: true } },
          },
        });

        if (!participant) {
          participant = await tx.interviewParticipant.create({
            data: {
              roundId: params.roundId,
              studentId: item.studentId,
              attendance: params.isDraft ? 'PENDING' : 'PRESENT',
            },
            include: {
              student: { select: { id: true, name: true, registerNumber: true } },
            },
          });
        } else if (!params.isDraft && participant.attendance === 'PENDING') {
          await tx.interviewParticipant.update({
            where: { id: participant.id },
            data: { attendance: 'PRESENT' },
          });
        }

        const evalRecord = await tx.interviewEvaluation.upsert({
          where: { participantId: participant.id },
          update: {
            evaluatorId: params.evaluatorId,
            totalScore: item.totalScore,
            maxPossibleMarks: item.maxPossibleMarks,
            percentage: item.percentage,
            strengths: item.strengths,
            areasForImprovement: item.areasForImprovement,
            overallFeedback: item.overallFeedback,
            status,
            evaluatedAt: new Date(),
          },
          create: {
            participantId: participant.id,
            evaluatorId: params.evaluatorId,
            totalScore: item.totalScore,
            maxPossibleMarks: item.maxPossibleMarks,
            percentage: item.percentage,
            strengths: item.strengths,
            areasForImprovement: item.areasForImprovement,
            overallFeedback: item.overallFeedback,
            status,
          },
        });

        await tx.interviewCriterionScore.deleteMany({
          where: { evaluationId: evalRecord.id },
        });

        if (item.criterionScores.length > 0) {
          await tx.interviewCriterionScore.createMany({
            data: item.criterionScores.map((cs) => ({
              evaluationId: evalRecord.id,
              criterionId: cs.criterionId,
              score: cs.score,
              maxMarks: cs.maxMarks,
              comment: cs.comment,
            })),
          });
        }

        batchResults.push({
          studentId: item.studentId,
          participantId: participant.id,
          studentName: participant.student?.name || 'Student',
          registerNumber: participant.student?.registerNumber || '',
          totalScore: item.totalScore,
          maxPossibleMarks: item.maxPossibleMarks,
          percentage: item.percentage,
          status,
          criterionScoresCount: item.criterionScores.length,
        });
      }

      return batchResults;
    });

    return {
      roundId: params.roundId,
      roundType: 'INTERVIEW',
      status,
      evaluatedCount: results.length,
      totalProcessed: results.length,
      isDraft: params.isDraft,
      results,
    };
  }

  async getInterviewEvaluationByParticipantId(participantId: string): Promise<InterviewEvaluationDto | null> {
    if (this.isTest()) {
      return this.formatInterviewEvaluationInMemory(participantId);
    }

    const row = await prisma.interviewEvaluation.findUnique({
      where: { participantId },
      include: {
        evaluator: { select: { id: true, email: true } },
        criterionScores: {
          include: { criterion: { select: { name: true } } },
        },
      },
    });

    if (!row) return null;
    return this.mapPrismaInterviewEvaluation(row);
  }

  async getInterviewEvaluationsForStudent(studentId: string): Promise<any[]> {
    if (this.isTest()) {
      const results: any[] = [];
      for (const p of this.memStore.interviewParticipants.values()) {
        if (p.studentId === studentId) {
          const evalObj = this.memStore.interviewEvaluations.get(p.id);
          const round = this.memStore.interviewRounds.get(p.roundId);
          results.push({
            participantId: p.id,
            roundId: p.roundId,
            title: round?.title || 'Interview Round',
            interviewType: round?.interviewType || 'TECHNICAL',
            scheduledDate: round?.scheduledDate || new Date(),
            attendance: p.attendance,
            evaluation: evalObj ? this.formatInterviewEvaluationInMemory(p.id) : null,
          });
        }
      }
      results.sort(
        (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      return results;
    }

    const participations = await prisma.interviewParticipant.findMany({
      where: { studentId },
      include: {
        round: {
          include: {
            criteria: { orderBy: { order: 'asc' } },
            evaluator: { select: { id: true, email: true } },
          },
        },
        evaluation: {
          include: {
            evaluator: { select: { id: true, email: true } },
            criterionScores: {
              include: { criterion: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { round: { scheduledDate: 'asc' } },
    });

    return participations.map((p) => ({
      participantId: p.id,
      roundId: p.roundId,
      title: p.round.title,
      interviewType: p.round.interviewType,
      scheduledDate: p.round.scheduledDate,
      attendance: p.attendance,
      evaluation: p.evaluation ? this.mapPrismaInterviewEvaluation(p.evaluation) : null,
    }));
  }

  // ===========================================================================
  // 3. IN-MEMORY FORMATTERS (FOR FAST TESTS)
  // ===========================================================================

  private formatGdRoundInMemory(roundId: string): GdRoundDto {
    const round = this.memStore.gdRounds.get(roundId)!;
    const criteria = this.memStore.gdCriteria.get(roundId) || [];
    const participants: GdParticipantDto[] = [];

    let totalScoreSum = 0;
    let evaluatedCount = 0;

    for (const p of this.memStore.gdParticipants.values()) {
      if (p.roundId === roundId) {
        const student = managementRepository.memStore.students.get(p.studentId);
        const evalObj = this.memStore.gdEvaluations.get(p.id);
        const formattedEval = evalObj ? this.formatGdEvaluationInMemory(p.id) : null;

        if (formattedEval) {
          evaluatedCount++;
          totalScoreSum += formattedEval.percentage;
        }

        const dept = student?.departmentId ? managementRepository.memStore.departments.get(student.departmentId) : null;
        const course = student?.courseId ? managementRepository.memStore.courses.get(student.courseId) : null;
        const cls = student?.classId ? managementRepository.memStore.classes.get(student.classId) : null;
        const sec = student?.sectionId ? managementRepository.memStore.sections.get(student.sectionId) : null;

        participants.push({
          id: p.id,
          roundId: p.roundId,
          studentId: p.studentId,
          studentName: student?.name || 'Unknown Student',
          registerNumber: student?.registerNumber || '',
          collegeEmail: student?.collegeEmail || '',
          departmentId: student?.departmentId,
          departmentName: dept?.name || student?.department?.name,
          courseId: student?.courseId,
          courseName: course?.name || student?.course?.name,
          classId: student?.classId,
          className: cls?.name || student?.class?.name,
          sectionId: student?.sectionId,
          sectionName: sec?.name || student?.section?.name,
          attendance: p.attendance,
          evaluation: formattedEval,
          createdAt: p.createdAt,
        });
      }
    }

    const evaluator = round.evaluatorId ? userRepository.memStore.findById(round.evaluatorId) : null;
    const dept = round.departmentId ? managementRepository.memStore.departments.get(round.departmentId) : null;
    const course = round.courseId ? managementRepository.memStore.courses.get(round.courseId) : null;

    return {
      id: round.id,
      title: round.title,
      topic: round.topic,
      instructions: round.instructions,
      scheduledDate: round.scheduledDate,
      durationMinutes: round.durationMinutes,
      status: round.status,
      evaluatorId: round.evaluatorId,
      evaluatorName: evaluator ? evaluator.email.split('@')[0] : null,
      evaluatorEmail: evaluator ? evaluator.email : null,
      departmentId: round.departmentId,
      departmentName: dept?.name || null,
      courseId: round.courseId,
      courseName: course?.name || null,
      batchYear: round.batchYear,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        order: c.order,
      })),
      totalParticipants: participants.length,
      evaluatedCount,
      averageScore: evaluatedCount > 0 ? Math.round((totalScoreSum / evaluatedCount) * 100) / 100 : null,
      participants,
      createdAt: round.createdAt,
      updatedAt: round.updatedAt,
    };
  }

  private formatGdEvaluationInMemory(participantId: string): GdEvaluationDto {
    const ev = this.memStore.gdEvaluations.get(participantId);
    if (!ev) throw new Error('GD evaluation not found');

    const scoreRecords = this.memStore.gdCriterionScores.get(ev.id) || [];
    const participant = this.memStore.gdParticipants.get(participantId);
    const roundCriteria = participant ? this.memStore.gdCriteria.get(participant.roundId) || [] : [];
    const critMap = new Map(roundCriteria.map((c: any) => [c.id, c.name]));

    const criterionScores = scoreRecords.map((s) => ({
      id: s.id,
      criterionId: s.criterionId,
      criterionName: critMap.get(s.criterionId) || 'Criterion',
      score: s.score,
      maxMarks: s.maxMarks,
      comment: s.comment,
    }));

    const evaluator = userRepository.memStore.findById(ev.evaluatorId);

    return {
      id: ev.id,
      participantId: ev.participantId,
      evaluatorId: ev.evaluatorId,
      evaluatorName: evaluator ? evaluator.email.split('@')[0] : 'Evaluator',
      evaluatorEmail: evaluator ? evaluator.email : undefined,
      totalScore: ev.totalScore,
      maxPossibleMarks: ev.maxPossibleMarks,
      percentage: ev.percentage,
      feedback: ev.feedback,
      status: ev.status,
      evaluatedAt: ev.evaluatedAt,
      criterionScores,
    };
  }

  private formatInterviewRoundInMemory(roundId: string): InterviewRoundDto {
    const round = this.memStore.interviewRounds.get(roundId)!;
    const criteria = this.memStore.interviewCriteria.get(roundId) || [];
    const participants: InterviewParticipantDto[] = [];

    let totalScoreSum = 0;
    let evaluatedCount = 0;

    for (const p of this.memStore.interviewParticipants.values()) {
      if (p.roundId === roundId) {
        const student = managementRepository.memStore.students.get(p.studentId);
        const evalObj = this.memStore.interviewEvaluations.get(p.id);
        const formattedEval = evalObj ? this.formatInterviewEvaluationInMemory(p.id) : null;

        if (formattedEval) {
          evaluatedCount++;
          totalScoreSum += formattedEval.percentage;
        }

        participants.push({
          id: p.id,
          roundId: p.roundId,
          studentId: p.studentId,
          studentName: student?.name || 'Unknown Student',
          registerNumber: student?.registerNumber || '',
          collegeEmail: student?.collegeEmail || '',
          departmentName: student?.department?.name,
          courseName: student?.course?.name,
          attendance: p.attendance,
          evaluation: formattedEval,
          createdAt: p.createdAt,
        });
      }
    }

    const evaluator = round.evaluatorId ? userRepository.memStore.findById(round.evaluatorId) : null;
    const dept = round.departmentId ? managementRepository.memStore.departments.get(round.departmentId) : null;
    const course = round.courseId ? managementRepository.memStore.courses.get(round.courseId) : null;

    return {
      id: round.id,
      title: round.title,
      interviewType: round.interviewType,
      instructions: round.instructions,
      scheduledDate: round.scheduledDate,
      durationMinutes: round.durationMinutes,
      status: round.status,
      evaluatorId: round.evaluatorId,
      evaluatorName: evaluator ? evaluator.email.split('@')[0] : null,
      evaluatorEmail: evaluator ? evaluator.email : null,
      departmentId: round.departmentId,
      departmentName: dept?.name || null,
      courseId: round.courseId,
      courseName: course?.name || null,
      batchYear: round.batchYear,
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        order: c.order,
      })),
      totalParticipants: participants.length,
      evaluatedCount,
      averageScore: evaluatedCount > 0 ? Math.round((totalScoreSum / evaluatedCount) * 100) / 100 : null,
      participants,
      createdAt: round.createdAt,
      updatedAt: round.updatedAt,
    };
  }

  private formatInterviewEvaluationInMemory(participantId: string): InterviewEvaluationDto {
    const ev = this.memStore.interviewEvaluations.get(participantId);
    if (!ev) throw new Error('Interview evaluation not found');

    const scoreRecords = this.memStore.interviewCriterionScores.get(ev.id) || [];
    const participant = this.memStore.interviewParticipants.get(participantId);
    const roundCriteria = participant ? this.memStore.interviewCriteria.get(participant.roundId) || [] : [];
    const critMap = new Map(roundCriteria.map((c: any) => [c.id, c.name]));

    const criterionScores = scoreRecords.map((s) => ({
      id: s.id,
      criterionId: s.criterionId,
      criterionName: critMap.get(s.criterionId) || 'Criterion',
      score: s.score,
      maxMarks: s.maxMarks,
      comment: s.comment,
    }));

    const evaluator = userRepository.memStore.findById(ev.evaluatorId);

    return {
      id: ev.id,
      participantId: ev.participantId,
      evaluatorId: ev.evaluatorId,
      evaluatorName: evaluator ? evaluator.email.split('@')[0] : 'Interviewer',
      evaluatorEmail: evaluator ? evaluator.email : undefined,
      totalScore: ev.totalScore,
      maxPossibleMarks: ev.maxPossibleMarks,
      percentage: ev.percentage,
      strengths: ev.strengths,
      areasForImprovement: ev.areasForImprovement,
      overallFeedback: ev.overallFeedback,
      status: ev.status,
      evaluatedAt: ev.evaluatedAt,
      criterionScores,
    };
  }

  // ===========================================================================
  // 4. PRISMA RESULT MAPPERS (FOR REAL MYSQL)
  // ===========================================================================

  private mapPrismaGdRound(r: any): GdRoundDto {
    const participants = (r.participants || []).map((p: any) => {
      const evaluation = p.evaluation ? this.mapPrismaGdEvaluation(p.evaluation) : null;
      return {
        id: p.id,
        roundId: p.roundId,
        studentId: p.studentId,
        studentName: p.student?.name || '',
        registerNumber: p.student?.registerNumber || '',
        collegeEmail: p.student?.collegeEmail || '',
        departmentId: p.student?.departmentId,
        departmentName: p.student?.department?.name || p.student?.department?.code,
        courseId: p.student?.courseId,
        courseName: p.student?.course?.name || p.student?.course?.code,
        classId: p.student?.classId,
        className: p.student?.class?.name,
        sectionId: p.student?.sectionId,
        sectionName: p.student?.section?.name,
        attendance: p.attendance,
        evaluation,
        createdAt: p.createdAt,
      };
    });

    const evaluated = participants.filter((p: any) => p.evaluation !== null);
    const totalScoreSum = evaluated.reduce((sum: number, p: any) => sum + (p.evaluation?.percentage || 0), 0);

    return {
      id: r.id,
      title: r.title,
      topic: r.topic,
      instructions: r.instructions,
      scheduledDate: r.scheduledDate,
      durationMinutes: r.durationMinutes,
      status: r.status,
      evaluatorId: r.evaluatorId,
      evaluatorName: r.evaluator?.email ? r.evaluator.email.split('@')[0] : null,
      evaluatorEmail: r.evaluator?.email || null,
      departmentId: r.departmentId,
      departmentName: r.department?.name || null,
      courseId: r.courseId,
      courseName: r.course?.name || null,
      batchYear: r.batchYear,
      criteria: (r.criteria || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        order: c.order,
      })),
      totalParticipants: participants.length,
      evaluatedCount: evaluated.length,
      averageScore: evaluated.length > 0 ? Math.round((totalScoreSum / evaluated.length) * 100) / 100 : null,
      participants,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapPrismaGdEvaluation(e: any): GdEvaluationDto {
    return {
      id: e.id,
      participantId: e.participantId,
      evaluatorId: e.evaluatorId,
      evaluatorName: e.evaluator?.email ? e.evaluator.email.split('@')[0] : 'Evaluator',
      evaluatorEmail: e.evaluator?.email,
      totalScore: e.totalScore,
      maxPossibleMarks: e.maxPossibleMarks,
      percentage: e.percentage,
      feedback: e.feedback,
      status: e.status,
      evaluatedAt: e.evaluatedAt,
      criterionScores: (e.criterionScores || []).map((cs: any) => ({
        id: cs.id,
        criterionId: cs.criterionId,
        criterionName: cs.criterion?.name || 'Criterion',
        score: cs.score,
        maxMarks: cs.maxMarks,
        comment: cs.comment,
      })),
    };
  }

  private mapPrismaInterviewRound(r: any): InterviewRoundDto {
    const participants = (r.participants || []).map((p: any) => {
      const evaluation = p.evaluation ? this.mapPrismaInterviewEvaluation(p.evaluation) : null;
      return {
        id: p.id,
        roundId: p.roundId,
        studentId: p.studentId,
        studentName: p.student?.name || '',
        registerNumber: p.student?.registerNumber || '',
        collegeEmail: p.student?.collegeEmail || '',
        departmentName: p.student?.department?.name,
        courseName: p.student?.course?.name,
        attendance: p.attendance,
        evaluation,
        createdAt: p.createdAt,
      };
    });

    const evaluated = participants.filter((p: any) => p.evaluation !== null);
    const totalScoreSum = evaluated.reduce((sum: number, p: any) => sum + (p.evaluation?.percentage || 0), 0);

    return {
      id: r.id,
      title: r.title,
      interviewType: r.interviewType,
      instructions: r.instructions,
      scheduledDate: r.scheduledDate,
      durationMinutes: r.durationMinutes,
      status: r.status,
      evaluatorId: r.evaluatorId,
      evaluatorName: r.evaluator?.email ? r.evaluator.email.split('@')[0] : null,
      evaluatorEmail: r.evaluator?.email || null,
      departmentId: r.departmentId,
      departmentName: r.department?.name || null,
      courseId: r.courseId,
      courseName: r.course?.name || null,
      batchYear: r.batchYear,
      criteria: (r.criteria || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        order: c.order,
      })),
      totalParticipants: participants.length,
      evaluatedCount: evaluated.length,
      averageScore: evaluated.length > 0 ? Math.round((totalScoreSum / evaluated.length) * 100) / 100 : null,
      participants,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapPrismaInterviewEvaluation(e: any): InterviewEvaluationDto {
    return {
      id: e.id,
      participantId: e.participantId,
      evaluatorId: e.evaluatorId,
      evaluatorName: e.evaluator?.email ? e.evaluator.email.split('@')[0] : 'Interviewer',
      evaluatorEmail: e.evaluator?.email,
      totalScore: e.totalScore,
      maxPossibleMarks: e.maxPossibleMarks,
      percentage: e.percentage,
      strengths: e.strengths,
      areasForImprovement: e.areasForImprovement,
      overallFeedback: e.overallFeedback,
      status: e.status,
      evaluatedAt: e.evaluatedAt,
      criterionScores: (e.criterionScores || []).map((cs: any) => ({
        id: cs.id,
        criterionId: cs.criterionId,
        criterionName: cs.criterion?.name || 'Criterion',
        score: cs.score,
        maxMarks: cs.maxMarks,
        comment: cs.comment,
      })),
    };
  }
}

export const evaluationRepository = new EvaluationRepository();
