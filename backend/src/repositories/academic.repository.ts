import { prisma } from '../config/prisma.config.js';
import {
  StudentAcademicRecordDto,
  StudentSemesterRecordDto,
  UpsertAcademicRecordDto,
  StudentAuditLogDto,
} from '../types/academic.types.js';
import { calculateUniversityCgpa } from '../utils/cgpa-calculator.util.js';

export class AcademicRepository {
  // In-memory test cache for isolated test environments
  private memAcademic = new Map<string, StudentAcademicRecordDto>();
  private memAudit = new Map<string, StudentAuditLogDto[]>();

  async getAcademicRecord(studentId: string): Promise<StudentAcademicRecordDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const mem = this.memAcademic.get(studentId) || null;
      if (mem) {
        mem.calculatedCgpa = calculateUniversityCgpa(mem.semesters);
      }
      return mem;
    }

    const record = await prisma.studentAcademicRecord.findUnique({
      where: { studentId },
      include: {
        semesters: {
          orderBy: { semesterNumber: 'asc' },
        },
      },
    });

    if (!record) return null;

    const calculatedCgpa = calculateUniversityCgpa(record.semesters);

    return {
      ...record,
      calculatedCgpa,
      hasTenthMarksheet: Boolean(record.tenthMarksheetPath),
      hasTwelfthMarksheet: Boolean(record.twelfthMarksheetPath),
      semesters: record.semesters.map((s) => ({
        ...s,
        hasMarksheet: Boolean(s.marksheetPath),
      })),
    };
  }

  async upsertAcademicRecord(
    studentId: string,
    dto: UpsertAcademicRecordDto
  ): Promise<StudentAcademicRecordDto> {
    if (process.env.NODE_ENV === 'test') {
      let existing = this.memAcademic.get(studentId);
      const now = new Date();

      if (!existing) {
        existing = {
          id: `acad-${studentId}`,
          studentId,
          tenthBoard: null,
          tenthPassingYear: null,
          tenthTotalMarks: null,
          tenthObtainedMarks: null,
          tenthPercentage: null,
          tenthMarksheetPath: null,
          tenthMarksheetName: null,
          tenthMarksheetMime: null,
          hasTenthMarksheet: false,
          twelfthBoard: null,
          twelfthPassingYear: null,
          twelfthTotalMarks: null,
          twelfthObtainedMarks: null,
          twelfthPercentage: null,
          twelfthMarksheetPath: null,
          twelfthMarksheetName: null,
          twelfthMarksheetMime: null,
          hasTwelfthMarksheet: false,
          degreeLevel: 'UG',
          studyStatus: 'STUDYING',
          currentSemester: 1,
          ugDegree: null,
          ugBranch: null,
          currentCgpa: null,
          overallPercentage: null,
          activeBacklogs: 0,
          historyOfBacklogs: 0,
          semesters: [],
          createdAt: now,
          updatedAt: now,
        };
      }

      const updated: StudentAcademicRecordDto = {
        ...existing,
        tenthBoard: dto.tenthBoard !== undefined ? dto.tenthBoard : existing.tenthBoard,
        tenthPassingYear: dto.tenthPassingYear !== undefined ? dto.tenthPassingYear : existing.tenthPassingYear,
        tenthTotalMarks: dto.tenthTotalMarks !== undefined ? dto.tenthTotalMarks : existing.tenthTotalMarks,
        tenthObtainedMarks: dto.tenthObtainedMarks !== undefined ? dto.tenthObtainedMarks : existing.tenthObtainedMarks,
        tenthPercentage: dto.tenthPercentage !== undefined ? dto.tenthPercentage : existing.tenthPercentage,
        twelfthBoard: dto.twelfthBoard !== undefined ? dto.twelfthBoard : existing.twelfthBoard,
        twelfthPassingYear: dto.twelfthPassingYear !== undefined ? dto.twelfthPassingYear : existing.twelfthPassingYear,
        twelfthTotalMarks: dto.twelfthTotalMarks !== undefined ? dto.twelfthTotalMarks : existing.twelfthTotalMarks,
        twelfthObtainedMarks: dto.twelfthObtainedMarks !== undefined ? dto.twelfthObtainedMarks : existing.twelfthObtainedMarks,
        twelfthPercentage: dto.twelfthPercentage !== undefined ? dto.twelfthPercentage : existing.twelfthPercentage,
        degreeLevel: dto.degreeLevel !== undefined ? dto.degreeLevel : existing.degreeLevel,
        studyStatus: dto.studyStatus !== undefined ? dto.studyStatus : existing.studyStatus,
        currentSemester: dto.currentSemester !== undefined ? dto.currentSemester : existing.currentSemester,
        ugDegree: dto.ugDegree !== undefined ? dto.ugDegree : existing.ugDegree,
        ugBranch: dto.ugBranch !== undefined ? dto.ugBranch : existing.ugBranch,
        currentCgpa: dto.currentCgpa !== undefined ? dto.currentCgpa : existing.currentCgpa,
        overallPercentage: dto.overallPercentage !== undefined ? dto.overallPercentage : existing.overallPercentage,
        activeBacklogs: dto.activeBacklogs !== undefined ? dto.activeBacklogs : existing.activeBacklogs,
        historyOfBacklogs: dto.historyOfBacklogs !== undefined ? dto.historyOfBacklogs : existing.historyOfBacklogs,
        updatedAt: now,
      };

      if (dto.semesters && dto.semesters.length > 0) {
        const semesterMap = new Map(updated.semesters.map((s) => [s.semesterNumber, s]));
        dto.semesters.forEach((input) => {
          const prev = semesterMap.get(input.semesterNumber);
          const semDto: StudentSemesterRecordDto = {
            id: prev?.id || `sem-${studentId}-${input.semesterNumber}`,
            academicRecordId: updated.id,
            semesterNumber: input.semesterNumber,
            sgpa: input.sgpa !== undefined ? input.sgpa : prev?.sgpa || null,
            cgpa: input.cgpa !== undefined ? input.cgpa : prev?.cgpa || null,
            totalCredits: input.totalCredits !== undefined ? input.totalCredits : prev?.totalCredits || null,
            creditsEarned: input.creditsEarned !== undefined ? input.creditsEarned : prev?.creditsEarned || null,
            backlogsCount: input.backlogsCount !== undefined ? input.backlogsCount : prev?.backlogsCount || 0,
            marksheetPath: prev?.marksheetPath || null,
            marksheetName: prev?.marksheetName || null,
            marksheetMime: prev?.marksheetMime || null,
            hasMarksheet: Boolean(prev?.marksheetPath),
            createdAt: prev?.createdAt || now,
            updatedAt: now,
          };
          semesterMap.set(input.semesterNumber, semDto);
        });
        updated.semesters = Array.from(semesterMap.values()).sort((a, b) => a.semesterNumber - b.semesterNumber);
      }

      this.memAcademic.set(studentId, updated);
      return updated;
    }

    // Prisma Upsert
    const record = await prisma.studentAcademicRecord.upsert({
      where: { studentId },
      create: {
        studentId,
        tenthBoard: dto.tenthBoard,
        tenthPassingYear: dto.tenthPassingYear,
        tenthTotalMarks: dto.tenthTotalMarks,
        tenthObtainedMarks: dto.tenthObtainedMarks,
        tenthPercentage: dto.tenthPercentage,
        twelfthBoard: dto.twelfthBoard,
        twelfthPassingYear: dto.twelfthPassingYear,
        twelfthTotalMarks: dto.twelfthTotalMarks,
        twelfthObtainedMarks: dto.twelfthObtainedMarks,
        twelfthPercentage: dto.twelfthPercentage,
        degreeLevel: dto.degreeLevel || 'UG',
        studyStatus: dto.studyStatus || 'STUDYING',
        currentSemester: dto.currentSemester || 1,
        ugDegree: dto.ugDegree,
        ugBranch: dto.ugBranch,
        currentCgpa: dto.currentCgpa,
        overallPercentage: dto.overallPercentage,
        activeBacklogs: dto.activeBacklogs ?? 0,
        historyOfBacklogs: dto.historyOfBacklogs ?? 0,
      },
      update: {
        ...(dto.tenthBoard !== undefined ? { tenthBoard: dto.tenthBoard } : {}),
        ...(dto.tenthPassingYear !== undefined ? { tenthPassingYear: dto.tenthPassingYear } : {}),
        ...(dto.tenthTotalMarks !== undefined ? { tenthTotalMarks: dto.tenthTotalMarks } : {}),
        ...(dto.tenthObtainedMarks !== undefined ? { tenthObtainedMarks: dto.tenthObtainedMarks } : {}),
        ...(dto.tenthPercentage !== undefined ? { tenthPercentage: dto.tenthPercentage } : {}),
        ...(dto.twelfthBoard !== undefined ? { twelfthBoard: dto.twelfthBoard } : {}),
        ...(dto.twelfthPassingYear !== undefined ? { twelfthPassingYear: dto.twelfthPassingYear } : {}),
        ...(dto.twelfthTotalMarks !== undefined ? { twelfthTotalMarks: dto.twelfthTotalMarks } : {}),
        ...(dto.twelfthObtainedMarks !== undefined ? { twelfthObtainedMarks: dto.twelfthObtainedMarks } : {}),
        ...(dto.twelfthPercentage !== undefined ? { twelfthPercentage: dto.twelfthPercentage } : {}),
        ...(dto.degreeLevel !== undefined ? { degreeLevel: dto.degreeLevel } : {}),
        ...(dto.studyStatus !== undefined ? { studyStatus: dto.studyStatus } : {}),
        ...(dto.currentSemester !== undefined ? { currentSemester: dto.currentSemester } : {}),
        ...(dto.ugDegree !== undefined ? { ugDegree: dto.ugDegree } : {}),
        ...(dto.ugBranch !== undefined ? { ugBranch: dto.ugBranch } : {}),
        ...(dto.currentCgpa !== undefined ? { currentCgpa: dto.currentCgpa } : {}),
        ...(dto.overallPercentage !== undefined ? { overallPercentage: dto.overallPercentage } : {}),
        ...(dto.activeBacklogs !== undefined ? { activeBacklogs: dto.activeBacklogs } : {}),
        ...(dto.historyOfBacklogs !== undefined ? { historyOfBacklogs: dto.historyOfBacklogs } : {}),
      },
      include: {
        semesters: {
          orderBy: { semesterNumber: 'asc' },
        },
      },
    });

    // If semesters array is provided, upsert each semester
    if (dto.semesters && dto.semesters.length > 0) {
      for (const sem of dto.semesters) {
        await prisma.studentSemesterRecord.upsert({
          where: {
            academicRecordId_semesterNumber: {
              academicRecordId: record.id,
              semesterNumber: sem.semesterNumber,
            },
          },
          create: {
            academicRecordId: record.id,
            semesterNumber: sem.semesterNumber,
            sgpa: sem.sgpa,
            cgpa: sem.cgpa,
            totalCredits: sem.totalCredits,
            creditsEarned: sem.creditsEarned,
            backlogsCount: sem.backlogsCount ?? 0,
          },
          update: {
            ...(sem.sgpa !== undefined ? { sgpa: sem.sgpa } : {}),
            ...(sem.cgpa !== undefined ? { cgpa: sem.cgpa } : {}),
            ...(sem.totalCredits !== undefined ? { totalCredits: sem.totalCredits } : {}),
            ...(sem.creditsEarned !== undefined ? { creditsEarned: sem.creditsEarned } : {}),
            ...(sem.backlogsCount !== undefined ? { backlogsCount: sem.backlogsCount } : {}),
          },
        });
      }
    }

    // Synchronize Student.cgpa if currentCgpa was updated
    if (dto.currentCgpa !== undefined && dto.currentCgpa !== null) {
      await prisma.student.update({
        where: { id: studentId },
        data: { cgpa: dto.currentCgpa },
      });
    }

    const reloaded = await prisma.studentAcademicRecord.findUnique({
      where: { studentId },
      include: {
        semesters: {
          orderBy: { semesterNumber: 'asc' },
        },
      },
    });

    return {
      ...reloaded!,
      calculatedCgpa: calculateUniversityCgpa(reloaded!.semesters),
      hasTenthMarksheet: Boolean(reloaded!.tenthMarksheetPath),
      hasTwelfthMarksheet: Boolean(reloaded!.twelfthMarksheetPath),
      semesters: reloaded!.semesters.map((s) => ({
        ...s,
        hasMarksheet: Boolean(s.marksheetPath),
      })),
    };
  }

  async updateMarksheet(
    studentId: string,
    docType: 'tenth' | 'twelfth' | 'semester',
    fileInfo: { path: string; name: string; mime: string },
    semesterNumber?: number
  ): Promise<StudentAcademicRecordDto> {
    if (process.env.NODE_ENV === 'test') {
      let record = this.memAcademic.get(studentId);
      if (!record) {
        record = await this.upsertAcademicRecord(studentId, {});
      }
      if (docType === 'tenth') {
        record.tenthMarksheetPath = fileInfo.path;
        record.tenthMarksheetName = fileInfo.name;
        record.tenthMarksheetMime = fileInfo.mime;
        record.hasTenthMarksheet = true;
      } else if (docType === 'twelfth') {
        record.twelfthMarksheetPath = fileInfo.path;
        record.twelfthMarksheetName = fileInfo.name;
        record.twelfthMarksheetMime = fileInfo.mime;
        record.hasTwelfthMarksheet = true;
      } else if (docType === 'semester' && semesterNumber) {
        let sem = record.semesters.find((s) => s.semesterNumber === semesterNumber);
        if (!sem) {
          sem = {
            id: `sem-${studentId}-${semesterNumber}`,
            academicRecordId: record.id,
            semesterNumber,
            sgpa: null,
            cgpa: null,
            totalCredits: null,
            creditsEarned: null,
            backlogsCount: 0,
            marksheetPath: fileInfo.path,
            marksheetName: fileInfo.name,
            marksheetMime: fileInfo.mime,
            hasMarksheet: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          record.semesters.push(sem);
          record.semesters.sort((a, b) => a.semesterNumber - b.semesterNumber);
        } else {
          sem.marksheetPath = fileInfo.path;
          sem.marksheetName = fileInfo.name;
          sem.marksheetMime = fileInfo.mime;
          sem.hasMarksheet = true;
        }
      }
      this.memAcademic.set(studentId, record);
      return record;
    }

    // Ensure academic record exists
    let record = await prisma.studentAcademicRecord.findUnique({ where: { studentId } });
    if (!record) {
      record = await prisma.studentAcademicRecord.create({ data: { studentId } });
    }

    if (docType === 'tenth') {
      await prisma.studentAcademicRecord.update({
        where: { id: record.id },
        data: {
          tenthMarksheetPath: fileInfo.path,
          tenthMarksheetName: fileInfo.name,
          tenthMarksheetMime: fileInfo.mime,
        },
      });
    } else if (docType === 'twelfth') {
      await prisma.studentAcademicRecord.update({
        where: { id: record.id },
        data: {
          twelfthMarksheetPath: fileInfo.path,
          twelfthMarksheetName: fileInfo.name,
          twelfthMarksheetMime: fileInfo.mime,
        },
      });
    } else if (docType === 'semester' && semesterNumber) {
      await prisma.studentSemesterRecord.upsert({
        where: {
          academicRecordId_semesterNumber: {
            academicRecordId: record.id,
            semesterNumber,
          },
        },
        create: {
          academicRecordId: record.id,
          semesterNumber,
          marksheetPath: fileInfo.path,
          marksheetName: fileInfo.name,
          marksheetMime: fileInfo.mime,
        },
        update: {
          marksheetPath: fileInfo.path,
          marksheetName: fileInfo.name,
          marksheetMime: fileInfo.mime,
        },
      });
    }

    const reloaded = await prisma.studentAcademicRecord.findUnique({
      where: { studentId },
      include: {
        semesters: {
          orderBy: { semesterNumber: 'asc' },
        },
      },
    });

    return {
      ...reloaded!,
      hasTenthMarksheet: Boolean(reloaded!.tenthMarksheetPath),
      hasTwelfthMarksheet: Boolean(reloaded!.twelfthMarksheetPath),
      semesters: reloaded!.semesters.map((s) => ({
        ...s,
        hasMarksheet: Boolean(s.marksheetPath),
      })),
    };
  }

  async createAuditLog(data: {
    studentId: string;
    performedBy: string;
    action: string;
    fieldChanged?: string;
    oldValue?: string;
    newValue?: string;
    details?: string;
  }): Promise<StudentAuditLogDto> {
    if (process.env.NODE_ENV === 'test') {
      const logDto: StudentAuditLogDto = {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: data.studentId,
        performedBy: data.performedBy,
        action: data.action,
        fieldChanged: data.fieldChanged || null,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        details: data.details || null,
        createdAt: new Date(),
      };
      const list = this.memAudit.get(data.studentId) || [];
      list.unshift(logDto);
      this.memAudit.set(data.studentId, list);
      return logDto;
    }

    const created = await prisma.studentAuditLog.create({
      data: {
        studentId: data.studentId,
        performedBy: data.performedBy,
        action: data.action,
        fieldChanged: data.fieldChanged,
        oldValue: data.oldValue,
        newValue: data.newValue,
        details: data.details,
      },
    });

    return created;
  }

  async getAuditLogs(studentId: string): Promise<StudentAuditLogDto[]> {
    if (process.env.NODE_ENV === 'test') {
      return this.memAudit.get(studentId) || [];
    }

    return prisma.studentAuditLog.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findStudentByPersonalEmail(personalEmail: string, excludeStudentId?: string): Promise<{ id: string; name: string } | null> {
    const lower = personalEmail.trim().toLowerCase();

    if (process.env.NODE_ENV === 'test') {
      for (const [id] of this.memAcademic.entries()) {
        if (excludeStudentId && id === excludeStudentId) continue;
        // In test env, also checked in service
      }
      return null;
    }

    const student = await prisma.student.findFirst({
      where: {
        personalEmail: lower,
        ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
      },
      select: { id: true, name: true },
    });

    return student;
  }
}

export const academicRepository = new AcademicRepository();
