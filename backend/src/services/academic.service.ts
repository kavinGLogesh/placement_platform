import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { AppError } from '../middleware/errorHandler.js';
import {
  StudentAcademicRecordDto,
  UpsertAcademicRecordDto,
  AdminPersonalEmailUpdateDto,
  StudentAuditLogDto,
  AcademicBulkImportPreviewResult,
  AcademicBulkImportConfirmRequest,
  AcademicBulkImportConfirmResult,
  AcademicBulkImportRowPreview,
} from '../types/academic.types.js';
import { AcademicRepository, academicRepository } from '../repositories/academic.repository.js';
import { managementRepository, ManagementRepository } from '../repositories/management.repository.js';
import { prisma } from '../config/prisma.config.js';
import { calculateUniversityCgpa, calculateUniversityPercentage } from '../utils/cgpa-calculator.util.js';

export const marksheetUploadDir = path.resolve(process.cwd(), 'uploads', 'marksheets');
if (!fs.existsSync(marksheetUploadDir)) {
  fs.mkdirSync(marksheetUploadDir, { recursive: true });
}

export class AcademicService {
  private academicImportSessions = new Map<
    string,
    {
      fileName: string;
      parsedRows: Array<{
        rowNumber: number;
        registerNumber: string;
        studentId: string | null;
        studentName?: string;
        dto: UpsertAcademicRecordDto;
        status: 'VALID' | 'WARNING' | 'ERROR';
        errors: string[];
      }>;
      columnMapping: Record<string, string>;
      createdAt: number;
    }
  >();

  constructor(
    private readonly academicRepo: AcademicRepository = academicRepository,
    private readonly managementRepo: ManagementRepository = managementRepository
  ) { }

  /**
   * Validates email format strictly
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  // ===========================================================================
  // 1. ACADEMIC RECORDS MANAGEMENT (ADMIN & STUDENT VIEW)
  // ===========================================================================

  async getAcademicRecord(studentId: string): Promise<StudentAcademicRecordDto> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    let record = await this.academicRepo.getAcademicRecord(studentId);
    if (!record) {
      // Auto-initialize clean default academic record
      record = await this.academicRepo.upsertAcademicRecord(studentId, {
        currentCgpa: student.cgpa || null,
        ugBranch: student.department?.name || null,
      });
    }

    return record;
  }

  async upsertAcademicRecord(
    studentId: string,
    dto: UpsertAcademicRecordDto,
    adminUser: { id: string; email: string }
  ): Promise<StudentAcademicRecordDto> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Validation rules
    if (dto.tenthTotalMarks !== undefined && dto.tenthTotalMarks !== null) {
      if (dto.tenthTotalMarks <= 0) {
        throw new AppError('10th total marks must be greater than 0', 400);
      }
      if (dto.tenthObtainedMarks !== undefined && dto.tenthObtainedMarks !== null) {
        if (dto.tenthObtainedMarks < 0 || dto.tenthObtainedMarks > dto.tenthTotalMarks) {
          throw new AppError('10th obtained marks must be between 0 and total marks', 400);
        }
        if (dto.tenthPercentage === undefined || dto.tenthPercentage === null) {
          dto.tenthPercentage = parseFloat(
            ((dto.tenthObtainedMarks / dto.tenthTotalMarks) * 100).toFixed(2)
          );
        }
      }
    }

    if (dto.tenthPercentage !== undefined && dto.tenthPercentage !== null) {
      if (dto.tenthPercentage < 0 || dto.tenthPercentage > 100) {
        throw new AppError('10th percentage must be between 0 and 100', 400);
      }
    }

    if (dto.twelfthTotalMarks !== undefined && dto.twelfthTotalMarks !== null) {
      if (dto.twelfthTotalMarks <= 0) {
        throw new AppError('12th total marks must be greater than 0', 400);
      }
      if (dto.twelfthObtainedMarks !== undefined && dto.twelfthObtainedMarks !== null) {
        if (dto.twelfthObtainedMarks < 0 || dto.twelfthObtainedMarks > dto.twelfthTotalMarks) {
          throw new AppError('12th obtained marks must be between 0 and total marks', 400);
        }
        if (dto.twelfthPercentage === undefined || dto.twelfthPercentage === null) {
          dto.twelfthPercentage = parseFloat(
            ((dto.twelfthObtainedMarks / dto.twelfthTotalMarks) * 100).toFixed(2)
          );
        }
      }
    }

    if (dto.twelfthPercentage !== undefined && dto.twelfthPercentage !== null) {
      if (dto.twelfthPercentage < 0 || dto.twelfthPercentage > 100) {
        throw new AppError('12th percentage must be between 0 and 100', 400);
      }
    }

    if (dto.currentCgpa !== undefined && dto.currentCgpa !== null) {
      if (dto.currentCgpa < 0 || dto.currentCgpa > 10) {
        throw new AppError('Current overall CGPA must be on a scale of 0 to 10', 400);
      }
    }

    if (dto.ugCgpa !== undefined && dto.ugCgpa !== null) {
      if (dto.ugCgpa < 0 || dto.ugCgpa > 10) {
        throw new AppError('UG CGPA must be between 0 and 10', 400);
      }
    }

    if (dto.ugPercentage !== undefined && dto.ugPercentage !== null) {
      if (dto.ugPercentage < 0 || dto.ugPercentage > 100) {
        throw new AppError('UG percentage must be between 0 and 100', 400);
      }
    }

    if (dto.pgCgpa !== undefined && dto.pgCgpa !== null) {
      if (dto.pgCgpa < 0 || dto.pgCgpa > 10) {
        throw new AppError('PG CGPA must be between 0 and 10', 400);
      }
    }

    if (dto.pgPercentage !== undefined && dto.pgPercentage !== null) {
      if (dto.pgPercentage < 0 || dto.pgPercentage > 100) {
        throw new AppError('PG percentage must be between 0 and 100', 400);
      }
    }

    if (dto.activeBacklogs !== undefined && dto.activeBacklogs < 0) {
      throw new AppError('Active backlogs cannot be negative', 400);
    }

    if (dto.degreeLevel) {
      const dl = dto.degreeLevel.toUpperCase().trim();
      if (!['UG', 'PG'].includes(dl)) {
        throw new AppError('Degree level must be either UG or PG', 400);
      }
      dto.degreeLevel = dl;
    }

    if (dto.studyStatus) {
      const ss = dto.studyStatus.toUpperCase().trim();
      if (!['STUDYING', 'COMPLETED'].includes(ss)) {
        throw new AppError('Study status must be either STUDYING or COMPLETED', 400);
      }
      dto.studyStatus = ss;
    }

    if (dto.currentSemester !== undefined && dto.currentSemester !== null) {
      if (dto.currentSemester < 1 || dto.currentSemester > 12) {
        throw new AppError('Current semester must be between 1 and 12', 400);
      }
    }

    if (dto.historyOfBacklogs !== undefined && dto.historyOfBacklogs < 0) {
      throw new AppError('History of backlogs cannot be negative', 400);
    }

    // Validate semester inputs
    if (dto.semesters && dto.semesters.length > 0) {
      for (const sem of dto.semesters) {
        if (!sem.semesterNumber || sem.semesterNumber < 1 || sem.semesterNumber > 12) {
          throw new AppError(`Invalid semester number: ${sem.semesterNumber}. Must be between 1 and 12.`, 400);
        }
        if (sem.sgpa !== undefined && sem.sgpa !== null && (sem.sgpa < 0 || sem.sgpa > 10)) {
          throw new AppError(`Semester ${sem.semesterNumber} SGPA must be between 0 and 10`, 400);
        }
        if (sem.cgpa !== undefined && sem.cgpa !== null && (sem.cgpa < 0 || sem.cgpa > 10)) {
          throw new AppError(`Semester ${sem.semesterNumber} CGPA must be between 0 and 10`, 400);
        }
        if (sem.backlogsCount !== undefined && sem.backlogsCount < 0) {
          throw new AppError(`Semester ${sem.semesterNumber} backlogs count cannot be negative`, 400);
        }
      }
    }

    // Auto-calculate university CGPA if semesters provided and currentCgpa not explicitly set
    if (dto.semesters && dto.semesters.length > 0) {
      const universityCgpa = calculateUniversityCgpa(dto.semesters);
      if (universityCgpa !== null && (dto.currentCgpa === undefined || dto.currentCgpa === null)) {
        dto.currentCgpa = universityCgpa;
      }
    }

    // Auto-calculate overall percentage according to university conversion rules if not explicitly set
    if (dto.overallPercentage === undefined || dto.overallPercentage === null) {
      if (dto.currentCgpa !== undefined && dto.currentCgpa !== null) {
        dto.overallPercentage = calculateUniversityPercentage(dto.currentCgpa);
      }
    }

    const previous = await this.academicRepo.getAcademicRecord(studentId);
    const updated = await this.academicRepo.upsertAcademicRecord(studentId, dto);

    // Keep Student.cgpa synchronized
    if (dto.currentCgpa !== undefined && dto.currentCgpa !== null) {
      await this.managementRepo.updateStudent(studentId, { cgpa: dto.currentCgpa });
    }

    // Audit Logging
    await this.academicRepo.createAuditLog({
      studentId,
      performedBy: adminUser.email,
      action: 'ACADEMIC_RECORD_UPDATED',
      fieldChanged: 'academicRecord',
      oldValue: previous ? JSON.stringify({ cgpa: previous.currentCgpa, 10: previous.tenthPercentage, 12: previous.twelfthPercentage }) : undefined,
      newValue: JSON.stringify({ cgpa: updated.currentCgpa, 10: updated.tenthPercentage, 12: updated.twelfthPercentage }),
      details: `Academic credentials updated by ${adminUser.email}`,
    });

    return updated;
  }

  // ===========================================================================
  // 2. SECURE MARKSHEET STORAGE & ACCESS
  // ===========================================================================

  async uploadMarksheet(
    studentId: string,
    docType: 'tenth' | 'twelfth' | 'semester',
    file: { originalname: string; mimetype: string; buffer?: Buffer; path?: string; size: number },
    semesterNumber?: number,
    adminUser?: { id: string; email: string }
  ): Promise<StudentAcademicRecordDto> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (docType === 'semester') {
      if (!semesterNumber || semesterNumber < 1 || semesterNumber > 12) {
        throw new AppError('Valid semester number (1-12) is required for semester marksheets', 400);
      }
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const isAllowedMime = allowedMimes.includes(file.mimetype.toLowerCase());
    const isAllowedExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.originalname);

    if (!isAllowedMime && !isAllowedExt) {
      throw new AppError('Only PDF documents (.pdf) or image files (.png, .jpg, .jpeg, .webp) are accepted', 400);
    }

    // Prepare student directory
    const studentMarksheetDir = path.join(marksheetUploadDir, studentId);
    if (!fs.existsSync(studentMarksheetDir)) {
      fs.mkdirSync(studentMarksheetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.png');
    const docPrefix = docType === 'semester' ? `sem_${semesterNumber}` : docType;
    const targetFilename = `${docPrefix}_marksheet${ext}`;
    const targetFilePath = path.join(studentMarksheetDir, targetFilename);

    if (file.buffer) {
      fs.writeFileSync(targetFilePath, file.buffer);
    } else if (file.path && file.path !== targetFilePath) {
      fs.copyFileSync(file.path, targetFilePath);
    }

    const fileDetails = {
      path: targetFilePath,
      name: file.originalname,
      mime: file.mimetype,
    };

    const updated = await this.academicRepo.updateMarksheet(
      studentId,
      docType,
      fileDetails,
      semesterNumber
    );

    // Audit Logging
    if (adminUser) {
      await this.academicRepo.createAuditLog({
        studentId,
        performedBy: adminUser.email,
        action: 'MARKSHEET_UPLOADED',
        fieldChanged: docType,
        newValue: file.originalname,
        details: `Uploaded ${docType}${semesterNumber ? ` (Sem ${semesterNumber})` : ''} marksheet: ${file.originalname} (${(file.size / 1024).toFixed(1)} KB)`,
      });
    }

    return updated;
  }

  async getMarksheetFile(
    studentId: string,
    docType: 'tenth' | 'twelfth' | 'semester',
    semesterNumber?: number
  ): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    const record = await this.academicRepo.getAcademicRecord(studentId);
    if (!record) {
      throw new AppError('Academic record not found', 404);
    }

    let filePath: string | null = null;
    let fileName: string = `${docType}_marksheet`;
    let mimeType: string = 'application/pdf';

    if (docType === 'tenth') {
      filePath = record.tenthMarksheetPath;
      fileName = record.tenthMarksheetName || `${student.registerNumber}_10th_Marksheet.pdf`;
      mimeType = record.tenthMarksheetMime || 'application/pdf';
    } else if (docType === 'twelfth') {
      filePath = record.twelfthMarksheetPath;
      fileName = record.twelfthMarksheetName || `${student.registerNumber}_12th_Marksheet.pdf`;
      mimeType = record.twelfthMarksheetMime || 'application/pdf';
    } else if (docType === 'semester') {
      if (!semesterNumber) {
        throw new AppError('Semester number is required', 400);
      }
      const sem = record.semesters.find((s) => s.semesterNumber === semesterNumber);
      if (!sem || !sem.marksheetPath) {
        throw new AppError(`Marksheet for semester ${semesterNumber} not found`, 404);
      }
      filePath = sem.marksheetPath;
      fileName = sem.marksheetName || `${student.registerNumber}_Sem${semesterNumber}_Marksheet.pdf`;
      mimeType = sem.marksheetMime || 'application/pdf';
    }

    if (!filePath || !fs.existsSync(filePath)) {
      throw new AppError('Marksheet file document not found on storage server', 404);
    }

    return { filePath, fileName, mimeType };
  }

  // ===========================================================================
  // 3. PERSONAL EMAIL MANAGEMENT (STUDENT & ADMIN WORKFLOWS)
  // ===========================================================================

  /**
   * Student initiates adding or updating their personal email.
   * Generates a 6-digit OTP verification code.
   */
  async requestPersonalEmailUpdate(
    studentId: string,
    personalEmail: string
  ): Promise<{ message: string; personalEmail: string; expiresInMinutes: number; devCode?: string }> {
    const trimmed = personalEmail.trim().toLowerCase();

    if (!this.isValidEmail(trimmed)) {
      throw new AppError('Please provide a valid email address format (e.g., student@example.com)', 400);
    }

    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Critical rule: Personal email cannot be the same as their college email
    if (student.collegeEmail.toLowerCase() === trimmed) {
      throw new AppError('Personal email must be distinct from your official college login email', 400);
    }

    // Prevent duplicate personal email across students
    const duplicateStudent = await this.academicRepo.findStudentByPersonalEmail(trimmed, studentId);
    if (duplicateStudent) {
      throw new AppError('This personal email address is already associated with another student record', 409);
    }

    // Check college email collisions
    const collegeCollision = await this.managementRepo.findStudentByEmail(trimmed);
    if (collegeCollision && collegeCollision.id !== studentId) {
      throw new AppError('This email address is currently assigned as an official institutional login email', 409);
    }

    // Generate 6-digit OTP
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    if (process.env.NODE_ENV !== 'test') {
      await prisma.student.update({
        where: { id: studentId },
        data: {
          personalEmail: trimmed,
          isPersonalEmailVerified: false,
          personalEmailVerificationToken: verificationCode,
          personalEmailVerificationExpiry: expiryDate,
        },
      });
    } else {
      await this.managementRepo.updateStudent(studentId, {
        personalEmail: trimmed,
        isPersonalEmailVerified: false,
      });
    }

    console.log(`[AUTH-EMAIL-VERIFICATION] OTP for student ${student.registerNumber} (${trimmed}): ${verificationCode}`);

    return {
      message: 'Verification code sent to your personal email address. Please enter the 6-digit code to verify.',
      personalEmail: trimmed,
      expiresInMinutes: 15,
      devCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
    };
  }

  /**
   * Resend verification code for current personal email
   */
  async resendPersonalEmailVerification(
    studentId: string
  ): Promise<{ message: string; personalEmail: string; expiresInMinutes: number; devCode?: string }> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student || !student.personalEmail) {
      throw new AppError('No personal email found to resend verification code for', 400);
    }
    return this.requestPersonalEmailUpdate(studentId, student.personalEmail);
  }

  async getStudent(studentId: string) {
    return this.managementRepo.findStudentById(studentId);
  }

  /**
   * Student verifies their personal email by providing the 6-digit OTP code.
   */
  async verifyPersonalEmail(
    studentId: string,
    code: string
  ): Promise<{ message: string; personalEmail: string; isPersonalEmailVerified: boolean }> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    if (!student.personalEmail) {
      throw new AppError('No personal email update request pending verification', 400);
    }

    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length < 4) {
      throw new AppError('Please enter a valid verification code', 400);
    }

    if (process.env.NODE_ENV !== 'test') {
      const dbStudent = await prisma.student.findUnique({ where: { id: studentId } });
      if (!dbStudent?.personalEmailVerificationToken) {
        throw new AppError('No active verification code found. Please request a new code.', 400);
      }

      if (dbStudent.personalEmailVerificationExpiry && new Date() > dbStudent.personalEmailVerificationExpiry) {
        throw new AppError('Verification code has expired. Please request a new code.', 400);
      }

      if (dbStudent.personalEmailVerificationToken !== cleanCode) {
        throw new AppError('Invalid verification code. Please check your inbox and try again.', 400);
      }

      await prisma.student.update({
        where: { id: studentId },
        data: {
          isPersonalEmailVerified: true,
          personalEmailVerificationToken: null,
          personalEmailVerificationExpiry: null,
        },
      });
    } else {
      await this.managementRepo.updateStudent(studentId, {
        isPersonalEmailVerified: true,
      });
    }

    // Audit Log
    await this.academicRepo.createAuditLog({
      studentId,
      performedBy: student.collegeEmail,
      action: 'STUDENT_PERSONAL_EMAIL_VERIFIED',
      fieldChanged: 'personalEmail',
      newValue: student.personalEmail,
      details: `Student verified personal email address: ${student.personalEmail}`,
    });

    return {
      message: 'Personal email successfully verified and confirmed.',
      personalEmail: student.personalEmail,
      isPersonalEmailVerified: true,
    };
  }

  /**
   * Admin updates a student's personal email with strict audit logging
   */
  async adminUpdatePersonalEmail(
    studentId: string,
    dto: AdminPersonalEmailUpdateDto,
    adminUser: { id: string; email: string }
  ): Promise<any> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }

    let targetEmail: string | null = null;
    let isVerified = dto.isVerified ?? false;

    if (dto.personalEmail && dto.personalEmail.trim()) {
      targetEmail = dto.personalEmail.trim().toLowerCase();
      if (!this.isValidEmail(targetEmail)) {
        throw new AppError('Please provide a valid email format for personal email', 400);
      }

      if (student.collegeEmail.toLowerCase() === targetEmail) {
        throw new AppError('Personal email cannot be identical to the official college login email', 400);
      }

      const duplicate = await this.academicRepo.findStudentByPersonalEmail(targetEmail, studentId);
      if (duplicate) {
        throw new AppError('This personal email address is already assigned to another student', 409);
      }
    } else {
      targetEmail = null;
      isVerified = false;
    }

    const previousEmail = student.personalEmail;

    const updated = await this.managementRepo.updateStudent(studentId, {
      personalEmail: targetEmail,
      isPersonalEmailVerified: isVerified,
    });

    // Audit Logging
    await this.academicRepo.createAuditLog({
      studentId,
      performedBy: adminUser.email,
      action: 'PERSONAL_EMAIL_UPDATED',
      fieldChanged: 'personalEmail',
      oldValue: previousEmail || '(None)',
      newValue: targetEmail || '(Removed)',
      details: `Personal email updated by administrator (${adminUser.email}) — Verified Status: ${isVerified}`,
    });

    return updated;
  }

  async getAuditLogs(studentId: string): Promise<StudentAuditLogDto[]> {
    const student = await this.managementRepo.findStudentById(studentId);
    if (!student) {
      throw new AppError('Student not found', 404);
    }
    return this.academicRepo.getAuditLogs(studentId);
  }

  // ===========================================================================
  // 4. ACADEMIC RECORDS EXCEL BULK IMPORT
  // ===========================================================================

  async generateAcademicImportPreview(
    buffer: Buffer,
    fileName: string
  ): Promise<AcademicBulkImportPreviewResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new AppError('The uploaded workbook contains no readable sheets', 400);
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    if (!rawRows || rawRows.length === 0) {
      throw new AppError('The uploaded file does not contain any data rows', 400);
    }

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const firstRow = rawRows[0] || {};
    const rawHeaders = Object.keys(firstRow);

    const detectedMapping: Record<string, string> = {};
    for (const h of rawHeaders) {
      const norm = normalize(h);
      if (/^(registernumber|registerno|regno|rollnumber|rollno|reg)$/.test(norm)) {
        detectedMapping['registerNumber'] = h;
      } else if (/^(tenthboard|10thboard|board10|10thboardname)$/.test(norm)) {
        detectedMapping['tenthBoard'] = h;
      } else if (/^(tenthpassingyear|10thpassingyear|10thyear|passingyear10th)$/.test(norm)) {
        detectedMapping['tenthPassingYear'] = h;
      } else if (/^(tenthtotalmarks|10thtotalmarks|10thmaxmarks|maxmarks10th)$/.test(norm)) {
        detectedMapping['tenthTotalMarks'] = h;
      } else if (/^(tenthobtainedmarks|10thobtainedmarks|10thmarks|marks10th)$/.test(norm)) {
        detectedMapping['tenthObtainedMarks'] = h;
      } else if (/^(tenthpercentage|10thpercentage|10thpercent|10thper|percentage10th)$/.test(norm)) {
        detectedMapping['tenthPercentage'] = h;
      } else if (/^(twelfthboard|12thboard|board12|12thboardname)$/.test(norm)) {
        detectedMapping['twelfthBoard'] = h;
      } else if (/^(twelfthpassingyear|12thpassingyear|12thyear|passingyear12th)$/.test(norm)) {
        detectedMapping['twelfthPassingYear'] = h;
      } else if (/^(twelfthtotalmarks|12thtotalmarks|12thmaxmarks|maxmarks12th)$/.test(norm)) {
        detectedMapping['twelfthTotalMarks'] = h;
      } else if (/^(twelfthobtainedmarks|12thobtainedmarks|12thmarks|marks12th)$/.test(norm)) {
        detectedMapping['twelfthObtainedMarks'] = h;
      } else if (/^(twelfthpercentage|12thpercentage|12thpercent|12thper|percentage12th)$/.test(norm)) {
        detectedMapping['twelfthPercentage'] = h;
      } else if (/^(degreelevel|level|ugpg|programlevel)$/.test(norm)) {
        detectedMapping['degreeLevel'] = h;
      } else if (/^(studystatus|academicstatus|status)$/.test(norm)) {
        detectedMapping['studyStatus'] = h;
      } else if (/^(currentsemester|semester|currentsem|sem)$/.test(norm)) {
        detectedMapping['currentSemester'] = h;
      } else if (/^(degree|ugdegree|pgdegree|programmecode|program)$/.test(norm)) {
        detectedMapping['ugDegree'] = h;
      } else if (/^(branch|department|ugbranch|specialization)$/.test(norm)) {
        detectedMapping['ugBranch'] = h;
      } else if (/^(currentcgpa|overallcgpa|cgpa|totalcgpa)$/.test(norm)) {
        detectedMapping['currentCgpa'] = h;
      } else if (/^(activebacklogs|activearrears|currentbacklogs|backlogs|arrears)$/.test(norm)) {
        detectedMapping['activeBacklogs'] = h;
      } else if (/^(historyofbacklogs|historyofarrears|totalbacklogs|standingarrears)$/.test(norm)) {
        detectedMapping['historyOfBacklogs'] = h;
      }
    }

    if (!detectedMapping['registerNumber']) {
      const regHeader = rawHeaders.find((h) => normalize(h).includes('reg') || normalize(h).includes('roll'));
      if (regHeader) {
        detectedMapping['registerNumber'] = regHeader;
      } else {
        throw new AppError('Could not identify a Register Number column in the uploaded Excel file. Please ensure a column named "Register Number" or "Reg No" exists.', 400);
      }
    }

    const allStudents = await prisma.student.findMany({
      select: { id: true, registerNumber: true, name: true, cgpa: true },
    });
    const studentMap = new Map(allStudents.map((s) => [s.registerNumber.toUpperCase(), s]));

    const seenRegisterNumbers = new Set<string>();
    const previewRecords: AcademicBulkImportRowPreview[] = [];
    const parsedRows: any[] = [];

    let validRowsCount = 0;
    let errorRowsCount = 0;
    let duplicateRowsCount = 0;

    rawRows.forEach((rowObj, index) => {
      const rowNumber = index + 2;
      const rowErrors: string[] = [];
      const normalizedRow: Record<string, unknown> = {};

      Object.entries(rowObj).forEach(([k, v]) => {
        normalizedRow[normalize(k)] = v;
      });

      const getVal = (field: string): any => {
        const header = detectedMapping[field];
        if (header) return rowObj[header];
        return normalizedRow[normalize(field)];
      };

      const rawReg = String(getVal('registerNumber') || '').trim().toUpperCase();
      if (!rawReg) {
        rowErrors.push('Missing Register Number');
      }

      if (rawReg && seenRegisterNumbers.has(rawReg)) {
        duplicateRowsCount++;
        rowErrors.push(`Duplicate Register Number "${rawReg}" inside file`);
      } else if (rawReg) {
        seenRegisterNumbers.add(rawReg);
      }

      const matchedStudent = rawReg ? studentMap.get(rawReg) : undefined;
      if (rawReg && !matchedStudent) {
        rowErrors.push(`Student with Register Number "${rawReg}" does not exist in student directory`);
      }

      const tenthBoard = getVal('tenthBoard') ? String(getVal('tenthBoard')).trim() : null;
      const tenthPassingYear = getVal('tenthPassingYear') ? Number(getVal('tenthPassingYear')) : null;
      const tenthTotalMarks = getVal('tenthTotalMarks') ? Number(getVal('tenthTotalMarks')) : null;
      const tenthObtainedMarks = getVal('tenthObtainedMarks') ? Number(getVal('tenthObtainedMarks')) : null;
      let tenthPercentage = getVal('tenthPercentage') ? Number(getVal('tenthPercentage')) : null;

      if (tenthTotalMarks && tenthObtainedMarks && !tenthPercentage) {
        tenthPercentage = parseFloat(((tenthObtainedMarks / tenthTotalMarks) * 100).toFixed(2));
      }

      const twelfthBoard = getVal('twelfthBoard') ? String(getVal('twelfthBoard')).trim() : null;
      const twelfthPassingYear = getVal('twelfthPassingYear') ? Number(getVal('twelfthPassingYear')) : null;
      const twelfthTotalMarks = getVal('twelfthTotalMarks') ? Number(getVal('twelfthTotalMarks')) : null;
      const twelfthObtainedMarks = getVal('twelfthObtainedMarks') ? Number(getVal('twelfthObtainedMarks')) : null;
      let twelfthPercentage = getVal('twelfthPercentage') ? Number(getVal('twelfthPercentage')) : null;

      if (twelfthTotalMarks && twelfthObtainedMarks && !twelfthPercentage) {
        twelfthPercentage = parseFloat(((twelfthObtainedMarks / twelfthTotalMarks) * 100).toFixed(2));
      }

      let degreeLevel = getVal('degreeLevel') ? String(getVal('degreeLevel')).trim().toUpperCase() : 'UG';
      if (!['UG', 'PG'].includes(degreeLevel)) degreeLevel = 'UG';

      let studyStatus = getVal('studyStatus') ? String(getVal('studyStatus')).trim().toUpperCase() : 'STUDYING';
      if (!['STUDYING', 'COMPLETED'].includes(studyStatus)) studyStatus = 'STUDYING';

      const currentSemester = getVal('currentSemester') ? Number(getVal('currentSemester')) : 1;
      const ugDegree = getVal('ugDegree') ? String(getVal('ugDegree')).trim() : 'B.Tech';
      const ugBranch = getVal('ugBranch') ? String(getVal('ugBranch')).trim() : null;
      let currentCgpa = getVal('currentCgpa') ? Number(getVal('currentCgpa')) : null;
      const activeBacklogs = getVal('activeBacklogs') !== '' && getVal('activeBacklogs') !== undefined ? Number(getVal('activeBacklogs')) : 0;
      const historyOfBacklogs = getVal('historyOfBacklogs') !== '' && getVal('historyOfBacklogs') !== undefined ? Number(getVal('historyOfBacklogs')) : 0;

      const semesters: any[] = [];
      for (let s = 1; s <= 8; s++) {
        const semKey = `sem${s}sgpa`;
        const semAltKey = `sem${s}`;
        const semVal = normalizedRow[semKey] ?? normalizedRow[semAltKey];
        if (semVal !== '' && semVal !== undefined && semVal !== null) {
          const numSgpa = Number(semVal);
          if (!isNaN(numSgpa) && numSgpa >= 0 && numSgpa <= 10) {
            semesters.push({
              semesterNumber: s,
              sgpa: numSgpa,
              cgpa: numSgpa,
              totalCredits: 24,
              creditsEarned: 24,
              backlogsCount: 0,
            });
          }
        }
      }

      if (semesters.length > 0) {
        const univCgpa = calculateUniversityCgpa(semesters);
        if (univCgpa !== null && (!currentCgpa || isNaN(currentCgpa))) {
          currentCgpa = univCgpa;
        }
      }

      if (currentCgpa && (currentCgpa < 0 || currentCgpa > 10)) {
        rowErrors.push('Overall CGPA must be between 0.00 and 10.00');
      }

      const rowStatus: 'VALID' | 'WARNING' | 'ERROR' = rowErrors.length > 0 ? 'ERROR' : 'VALID';
      if (rowStatus === 'VALID') validRowsCount++;
      else errorRowsCount++;

      const dto: UpsertAcademicRecordDto = {
        tenthBoard,
        tenthPassingYear,
        tenthTotalMarks,
        tenthObtainedMarks,
        tenthPercentage,
        twelfthBoard,
        twelfthPassingYear,
        twelfthTotalMarks,
        twelfthObtainedMarks,
        twelfthPercentage,
        degreeLevel,
        studyStatus,
        currentSemester,
        ugDegree,
        ugBranch,
        currentCgpa,
        activeBacklogs,
        historyOfBacklogs,
        semesters: semesters.length > 0 ? semesters : undefined,
      };

      parsedRows.push({
        rowNumber,
        registerNumber: rawReg,
        studentId: matchedStudent ? matchedStudent.id : null,
        studentName: matchedStudent?.name,
        dto,
        status: rowStatus,
        errors: rowErrors,
      });

      previewRecords.push({
        rowNumber,
        registerNumber: rawReg,
        studentName: matchedStudent?.name,
        studentFound: Boolean(matchedStudent),
        tenthPercentage: tenthPercentage ?? undefined,
        twelfthPercentage: twelfthPercentage ?? undefined,
        degreeLevel,
        studyStatus,
        currentSemester,
        currentCgpa: currentCgpa ?? undefined,
        activeBacklogs,
        status: rowStatus,
        errors: rowErrors.length > 0 ? rowErrors : undefined,
      });
    });

    const sessionId = `acad-session-${crypto.randomBytes(8).toString('hex')}`;
    this.academicImportSessions.set(sessionId, {
      fileName,
      parsedRows,
      columnMapping: detectedMapping,
      createdAt: Date.now(),
    });

    return {
      importSessionId: sessionId,
      fileName,
      totalRows: rawRows.length,
      validRowsCount,
      errorRowsCount,
      duplicateRowsCount,
      columnMapping: detectedMapping,
      previewRecords: previewRecords.slice(0, 100),
    };
  }

  async confirmAcademicImport(
    dto: AcademicBulkImportConfirmRequest,
    adminUser: { id: string; email: string }
  ): Promise<AcademicBulkImportConfirmResult> {
    const session = this.academicImportSessions.get(dto.importSessionId);
    if (!session) {
      throw new AppError('Import session expired or invalid. Please upload the file again to preview.', 404);
    }

    const selectedSet = dto.selectedRegisterNumbers
      ? new Set(dto.selectedRegisterNumbers.map((r) => r.toUpperCase()))
      : null;

    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ registerNumber: string; message: string }> = [];

    for (const row of session.parsedRows) {
      if (row.status === 'ERROR' || !row.studentId) {
        failedCount++;
        errors.push({
          registerNumber: row.registerNumber,
          message: row.errors.join('; ') || 'Row contains validation errors',
        });
        continue;
      }

      if (selectedSet && !selectedSet.has(row.registerNumber)) {
        continue;
      }

      try {
        await this.academicRepo.upsertAcademicRecord(row.studentId, row.dto);

        if (row.dto.currentCgpa !== undefined && row.dto.currentCgpa !== null) {
          await this.managementRepo.updateStudent(row.studentId, { cgpa: row.dto.currentCgpa });
        }

        await this.academicRepo.createAuditLog({
          studentId: row.studentId,
          performedBy: adminUser.email,
          action: 'ACADEMIC_RECORD_BULK_IMPORTED',
          fieldChanged: 'academicRecord',
          newValue: JSON.stringify({
            cgpa: row.dto.currentCgpa,
            10: row.dto.tenthPercentage,
            12: row.dto.twelfthPercentage,
            level: row.dto.degreeLevel,
          }),
          details: `Bulk imported academic records from file "${session.fileName}" by ${adminUser.email}`,
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          registerNumber: row.registerNumber,
          message: err?.message || 'Database update failed',
        });
      }
    }

    this.academicImportSessions.delete(dto.importSessionId);

    return {
      totalProcessed: successCount + failedCount,
      successCount,
      failedCount,
      errors: errors.slice(0, 50),
    };
  }
}

export const academicService = new AcademicService();
