import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { prisma } from '../../config/prisma.config.js';
import { env } from '../../config/env.config.js';
import { Role } from '../../types/auth.types.js';
import { hashPassword } from '../../utils/password.util.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  StudentImportRecordStatus,
  ColumnMappingResult,
  StudentImportItem,
  CourseGroupPreview,
  DepartmentGroupPreview,
  AiStudentImportPreviewResponse,
  AiStudentImportConfirmRequest,
  AiStudentImportConfirmResponse,
  StudentImportHistoryRecord,
  ExcelImportCredential,
} from '../../types/management.types.js';

/**
 * Natural Register Number Comparator
 * Parses alphanumeric strings into alphanumeric & numeric chunks for natural ordering.
 * E.g., '23CSE001', '23CSE003', '23CSE008', '23CSE011', '23CSE015'
 */
export function naturalRegisterNumberCompare(a: string, b: string): number {
  const normA = (a || '').trim().toUpperCase();
  const normB = (b || '').trim().toUpperCase();

  if (normA === normB) return 0;

  // Split into tokens of alternating letters, digits, and punctuation
  const regex = /(\d+|\D+)/g;
  const chunksA = normA.match(regex) || [normA];
  const chunksB = normB.match(regex) || [normB];

  const minLen = Math.min(chunksA.length, chunksB.length);
  for (let i = 0; i < minLen; i++) {
    const chunkA = chunksA[i];
    const chunkB = chunksB[i];

    const isNumA = /^\d+$/.test(chunkA);
    const isNumB = /^\d+$/.test(chunkB);

    if (isNumA && isNumB) {
      try {
        const numA = BigInt(chunkA);
        const numB = BigInt(chunkB);
        if (numA !== numB) {
          return numA < numB ? -1 : 1;
        }
      } catch {
        const numA = parseInt(chunkA, 10);
        const numB = parseInt(chunkB, 10);
        if (numA !== numB) {
          return numA - numB;
        }
      }
    } else {
      const cmp = chunkA.localeCompare(chunkB, undefined, { sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
  }

  return chunksA.length - chunksB.length;
}

/**
 * Checks if a register number appears to follow common college formats.
 * Returns false if it's completely empty or suspicious.
 */
export function isStandardRegisterNumber(reg: string): boolean {
  if (!reg || reg.trim().length < 2) return false;
  const cleaned = reg.trim().replace(/[\s\-_]/g, '');
  // At least contains alphanumeric characters and at least one digit
  return /^[A-Za-z0-9]+$/.test(cleaned) && /\d/.test(cleaned);
}

/**
 * Formats a Date or raw string or Excel serial number into DD-MM-YYYY and temporary password DDMMYYYY
 */
export function parseDateOfBirth(raw: unknown): { formatted: string; passwordSeed: string; isValid: boolean } {
  if (raw === undefined || raw === null || raw === '') {
    return { formatted: '', passwordSeed: '', isValid: false };
  }

  // Handle Excel numeric date serials (e.g. 38579)
  if (typeof raw === 'number' && !isNaN(raw) && raw > 1000 && raw < 100000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(raw);
      if (dateObj) {
        const d = String(dateObj.d).padStart(2, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const y = String(dateObj.y);
        return {
          formatted: `${d}-${m}-${y}`,
          passwordSeed: `${d}${m}${y}`,
          isValid: true,
        };
      }
    } catch {
      // Fallback
    }
  }

  const str = String(raw).trim();
  if (!str) return { formatted: '', passwordSeed: '', isValid: false };

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return {
      formatted: `${d}-${m}-${y}`,
      passwordSeed: `${d}${m}${y}`,
      isValid: true,
    };
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return {
      formatted: `${d}-${m}-${y}`,
      passwordSeed: `${d}${m}${y}`,
      isValid: true,
    };
  }

  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950 && parsed.getFullYear() < 2030) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = String(parsed.getFullYear());
    return {
      formatted: `${d}-${m}-${y}`,
      passwordSeed: `${d}${m}${y}`,
      isValid: true,
    };
  }

  // Raw digits string of 8 characters (e.g. 15082005)
  if (/^\d{8}$/.test(str)) {
    const d = str.slice(0, 2);
    const m = str.slice(2, 4);
    const y = str.slice(4, 8);
    return {
      formatted: `${d}-${m}-${y}`,
      passwordSeed: str,
      isValid: true,
    };
  }

  return { formatted: str, passwordSeed: str.replace(/[^A-Za-z0-9]/g, ''), isValid: false };
}

/**
 * In-memory preview session cache with TTL (1 hour)
 */
interface PreviewSession {
  sessionId: string;
  fileName: string;
  items: StudentImportItem[];
  columnMapping: ColumnMappingResult;
  createdAt: number;
}

const previewCache = new Map<string, PreviewSession>();

// Cleanup stale sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of previewCache.entries()) {
    if (now - session.createdAt > 60 * 60 * 1000) {
      previewCache.delete(key);
    }
  }
}, 30 * 60 * 1000);

export class AiStudentImportService {
  /**
   * Deterministic semantic heuristic mapping fallback
   */
  private matchColumnsHeuristically(headers: string[]): ColumnMappingResult {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const normalizedHeaders = headers.map((h) => ({
      original: h,
      clean: norm(h),
    }));

    const findMatch = (aliases: string[]): string | null => {
      for (const alias of aliases) {
        const exact = normalizedHeaders.find((h) => h.clean === alias);
        if (exact) return exact.original;
      }
      for (const alias of aliases) {
        const partial = normalizedHeaders.find((h) => h.clean.includes(alias));
        if (partial) return partial.original;
      }
      return null;
    };

    const department = findMatch(['dept', 'department', 'departmentname', 'branch', 'stream', 'deptcode']);
    const course = findMatch(['course', 'programme', 'program', 'degree', 'coursecode', 'major']);
    const className = findMatch(['class', 'batch', 'batchyear', 'classname', 'yearofstudy']);
    const section = findMatch(['section', 'sec', 'division', 'div', 'sectionname']);
    const studentName = findMatch(['studentname', 'name', 'student', 'candidatename', 'fullname', 'nameofstudent']);
    const registerNumber = findMatch(['registernumber', 'regno', 'registerno', 'registrationnumber', 'rollno', 'rollnumber', 'regn', 'register']);
    const mobileNumber = findMatch(['mobilenumber', 'mobile', 'phone', 'phonenumber', 'contact', 'contactnumber', 'cell']);
    const dateOfBirth = findMatch(['dateofbirth', 'dob', 'birthdate', 'd_o_b', 'birth_date']);
    const collegeEmail = findMatch(['collegeemail', 'email', 'mail', 'emailid', 'studentemail', 'officialemail', 'emailaddress']);
    const year = findMatch(['year', 'currentyear', 'academicyear', 'studyyear']);
    const cgpa = findMatch(['cgpa', 'gpa', 'score', 'percentage', 'mark']);

    let score = 0;
    if (department) score++;
    if (course) score++;
    if (studentName) score++;
    if (registerNumber) score++;
    if (collegeEmail) score++;

    return {
      department,
      course,
      className,
      section,
      studentName,
      registerNumber,
      mobileNumber,
      dateOfBirth,
      collegeEmail,
      year,
      cgpa,
      rawHeaders: headers,
      aiAssisted: false,
      confidence: Math.round((score / 5) * 100),
    };
  }

  /**
   * Gemini AI Column Understanding
   * Sends headers and sample rows to Gemini REST API to map unpredictable headers.
   * Gracefully falls back to heuristic matching on timeout, rate-limit, or network error.
   */
  async understandColumnsWithGemini(
    headers: string[],
    sampleRows: Record<string, unknown>[]
  ): Promise<{ mapping: ColumnMappingResult; aiNotes?: string }> {
    const heuristic = this.matchColumnsHeuristically(headers);

    const apiKey = process.env.GEMINI_API_KEY?.trim() || env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return { mapping: heuristic, aiNotes: 'Deterministic semantic header analysis applied (Gemini API key not configured).' };
    }

    const prompt = `You are an intelligent data-understanding assistant for an enterprise College Placement Assessment Platform.
Analyze the following Excel/CSV table headers and sample data rows.
Map each column header to one of the canonical schema fields:
- Department: College academic department (e.g. CSE, ECE, Information Technology)
- Course: Degree/Programme (e.g. B.E CSE, B.Sc Computer Science, B.Tech IT, M.E ECE)
- Class: Class/Batch (e.g. CSE 2022-2026, Year 3)
- Section: Section name (e.g. A, B, C)
- StudentName: Full name of student
- RegisterNumber: Unique college register or roll number (e.g. 23CSE001, 2026CS101)
- MobileNumber: Student phone/contact number
- DateOfBirth: Date of birth (DOB)
- CollegeEmail: Student college email login address (e.g. student@college.edu.in)
- Year: Current study year (e.g. 1, 2, 3, 4)
- CGPA: Grade point average (e.g. 8.45)

Uploaded Column Headers:
${JSON.stringify(headers, null, 2)}

Sample Data Rows:
${JSON.stringify(sampleRows.slice(0, 3), null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "Department": string or null,
  "Course": string or null,
  "Class": string or null,
  "Section": string or null,
  "StudentName": string or null,
  "RegisterNumber": string or null,
  "MobileNumber": string or null,
  "DateOfBirth": string or null,
  "CollegeEmail": string or null,
  "Year": string or null,
  "CGPA": string or null,
  "reasoning": string
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const model = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 600,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Gemini HTTP ${response.status}: ${response.statusText}`);
      }

      const resJson: any = await response.json();
      const textContent = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textContent) {
        throw new Error('Empty Gemini response content');
      }

      const parsedAi = JSON.parse(textContent);

      const mapping: ColumnMappingResult = {
        department: headers.includes(parsedAi.Department) ? parsedAi.Department : heuristic.department,
        course: headers.includes(parsedAi.Course) ? parsedAi.Course : heuristic.course,
        className: headers.includes(parsedAi.Class) ? parsedAi.Class : heuristic.className,
        section: headers.includes(parsedAi.Section) ? parsedAi.Section : heuristic.section,
        studentName: headers.includes(parsedAi.StudentName) ? parsedAi.StudentName : heuristic.studentName,
        registerNumber: headers.includes(parsedAi.RegisterNumber) ? parsedAi.RegisterNumber : heuristic.registerNumber,
        mobileNumber: headers.includes(parsedAi.MobileNumber) ? parsedAi.MobileNumber : heuristic.mobileNumber,
        dateOfBirth: headers.includes(parsedAi.DateOfBirth) ? parsedAi.DateOfBirth : heuristic.dateOfBirth,
        collegeEmail: headers.includes(parsedAi.CollegeEmail) ? parsedAi.CollegeEmail : heuristic.collegeEmail,
        year: headers.includes(parsedAi.Year) ? parsedAi.Year : heuristic.year,
        cgpa: headers.includes(parsedAi.CGPA) ? parsedAi.CGPA : heuristic.cgpa,
        rawHeaders: headers,
        aiAssisted: true,
        confidence: 96,
      };

      return {
        mapping,
        aiNotes: parsedAi.reasoning || 'Gemini AI successfully mapped column headers with high semantic confidence.',
      };
    } catch (err: any) {
      console.warn(`[AiStudentImportService] Gemini API column understanding skipped (${err.message}). Using deterministic fallback.`);
      return {
        mapping: heuristic,
        aiNotes: 'Analyzed using built-in deterministic academic schema matcher.',
      };
    }
  }

  /**
   * Generates AI Import Preview from uploaded Excel/CSV file buffer
   */
  async generateImportPreview(buffer: Buffer, fileName: string): Promise<AiStudentImportPreviewResponse> {
    if (!buffer || buffer.length === 0) {
      throw new AppError('Uploaded file is empty or corrupted', 400);
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch (e: any) {
      throw new AppError(`Failed to parse file: ${e.message}. Please upload a valid .xlsx, .xls, or .csv file.`, 400);
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new AppError('The uploaded workbook contains no sheets', 400);
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });

    if (rawRows.length === 0) {
      throw new AppError('The uploaded file does not contain any data rows', 400);
    }

    // Extract headers from the sheet
    const rawHeaders: string[] = [];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
      if (cell && cell.v) {
        rawHeaders.push(String(cell.v).trim());
      }
    }

    // If headers couldn't be read from range, extract from row keys
    if (rawHeaders.length === 0 && rawRows.length > 0) {
      Object.keys(rawRows[0]).forEach((k) => rawHeaders.push(k.trim()));
    }

    // 1. Column understanding (Gemini with deterministic fallback)
    const { mapping, aiNotes } = await this.understandColumnsWithGemini(rawHeaders, rawRows.slice(0, 5));

    // 2. Fetch existing students and users for deterministic duplicate detection
    const existingStudents = await prisma.student.findMany({
      select: {
        id: true,
        registerNumber: true,
        collegeEmail: true,
        name: true,
        department: { select: { code: true, name: true } },
      },
    });

    const existingUsers = await prisma.user.findMany({
      select: { id: true, email: true },
    });

    const dbRegMap = new Map<string, (typeof existingStudents)[0]>();
    const dbEmailMap = new Map<string, (typeof existingStudents)[0]>();
    existingStudents.forEach((s) => {
      dbRegMap.set(s.registerNumber.toUpperCase(), s);
      dbEmailMap.set(s.collegeEmail.toLowerCase(), s);
    });

    const dbUserEmailSet = new Set<string>();
    existingUsers.forEach((u) => dbUserEmailSet.add(u.email.toLowerCase()));

    // Track in-file duplicates
    const fileSeenRegs = new Map<string, number>();
    const fileSeenEmails = new Map<string, number>();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const items: StudentImportItem[] = [];

    rawRows.forEach((row, index) => {
      const rowNum = index + 2;

      const rawDept = mapping.department ? String(row[mapping.department] || '').trim() : '';
      const rawCourse = mapping.course ? String(row[mapping.course] || '').trim() : '';
      const rawClass = mapping.className ? String(row[mapping.className] || '').trim() : '';
      const rawSec = mapping.section ? String(row[mapping.section] || '').trim().toUpperCase() : 'A';
      const rawName = mapping.studentName ? String(row[mapping.studentName] || '').trim() : '';
      const rawReg = mapping.registerNumber ? String(row[mapping.registerNumber] || '').trim().toUpperCase() : '';
      const rawMobile = mapping.mobileNumber ? String(row[mapping.mobileNumber] || '').trim() : '';
      const rawDob = mapping.dateOfBirth ? row[mapping.dateOfBirth] : '';
      const rawEmail = mapping.collegeEmail ? String(row[mapping.collegeEmail] || '').trim().toLowerCase() : '';

      const { formatted: dobFormatted, isValid: isDobValid } = parseDateOfBirth(rawDob);

      let parsedYear = 1;
      if (mapping.year && row[mapping.year]) {
        const yNum = Number(row[mapping.year]);
        if (!isNaN(yNum) && yNum >= 1 && yNum <= 5) parsedYear = yNum;
      }

      let parsedCgpa: number | undefined = undefined;
      if (mapping.cgpa && row[mapping.cgpa]) {
        const cNum = Number(row[mapping.cgpa]);
        if (!isNaN(cNum) && cNum >= 0 && cNum <= 10) parsedCgpa = cNum;
      }

      const statusReasons: string[] = [];
      let isDuplicate = false;
      let duplicateReason: string | undefined = undefined;
      let existingInfo: any = undefined;

      // Check required fields
      if (!rawName) statusReasons.push('Missing Student Name');
      if (!rawReg) statusReasons.push('Missing Register Number');
      if (!rawDept) statusReasons.push('Missing Department');
      if (!rawCourse) statusReasons.push('Missing Course');
      if (!rawEmail) statusReasons.push('Missing College Email');

      // Email format check
      if (rawEmail && !emailRegex.test(rawEmail)) {
        statusReasons.push(`Invalid email format: "${rawEmail}"`);
      }

      // Mobile format check (if provided, should be 10-15 digits)
      if (rawMobile) {
        const cleanMobile = rawMobile.replace(/[\s\-+()]/g, '');
        if (!/^\d{10,15}$/.test(cleanMobile)) {
          statusReasons.push(`Suspicious mobile number format: "${rawMobile}"`);
        }
      }

      // In-file duplicate checks
      if (rawReg) {
        if (fileSeenRegs.has(rawReg)) {
          isDuplicate = true;
          duplicateReason = `Duplicate register number within file (first seen at row ${fileSeenRegs.get(rawReg)})`;
          statusReasons.push(duplicateReason);
        } else {
          fileSeenRegs.set(rawReg, rowNum);
        }
      }

      if (rawEmail) {
        if (fileSeenEmails.has(rawEmail)) {
          isDuplicate = true;
          const msg = `Duplicate college email within file (first seen at row ${fileSeenEmails.get(rawEmail)})`;
          duplicateReason = duplicateReason ? `${duplicateReason}; ${msg}` : msg;
          statusReasons.push(msg);
        } else {
          fileSeenEmails.set(rawEmail, rowNum);
        }
      }

      // Database duplicate checks
      if (rawReg && dbRegMap.has(rawReg)) {
        isDuplicate = true;
        const exist = dbRegMap.get(rawReg)!;
        existingInfo = {
          id: exist.id,
          name: exist.name,
          registerNumber: exist.registerNumber,
          collegeEmail: exist.collegeEmail,
        };
        const msg = `Register number "${rawReg}" already exists in database (Student: ${exist.name})`;
        duplicateReason = duplicateReason ? `${duplicateReason}; ${msg}` : msg;
        statusReasons.push(msg);
      }

      if (rawEmail && (dbEmailMap.has(rawEmail) || dbUserEmailSet.has(rawEmail))) {
        isDuplicate = true;
        const exist = dbEmailMap.get(rawEmail);
        if (exist && !existingInfo) {
          existingInfo = {
            id: exist.id,
            name: exist.name,
            registerNumber: exist.registerNumber,
            collegeEmail: exist.collegeEmail,
          };
        }
        const msg = `College email "${rawEmail}" is already registered in database`;
        duplicateReason = duplicateReason ? `${duplicateReason}; ${msg}` : msg;
        statusReasons.push(msg);
      }

      // Register Number Format Warning
      let isWarning = false;
      if (rawReg && !isStandardRegisterNumber(rawReg)) {
        isWarning = true;
        statusReasons.push(`Non-standard register number format "${rawReg}" flagged for review`);
      }
      if (rawDob && !isDobValid) {
        isWarning = true;
        statusReasons.push(`DOB "${String(rawDob)}" could not be parsed to standard format`);
      }

      // Determine final status
      let status: StudentImportRecordStatus = 'VALID';
      if (isDuplicate) {
        status = 'DUPLICATE';
      } else if (
        !rawName ||
        !rawReg ||
        !rawDept ||
        !rawCourse ||
        !rawEmail ||
        (rawEmail && !emailRegex.test(rawEmail))
      ) {
        status = 'INVALID';
      } else if (isWarning || statusReasons.length > 0) {
        status = 'WARNING';
      }

      items.push({
        id: `import-row-${rowNum}-${crypto.randomBytes(3).toString('hex')}`,
        rowNumber: rowNum,
        department: rawDept || 'Unspecified Department',
        course: rawCourse || 'Unspecified Course',
        className: rawClass || undefined,
        section: rawSec || 'A',
        studentName: rawName,
        registerNumber: rawReg,
        mobileNumber: rawMobile || undefined,
        dateOfBirth: dobFormatted || (rawDob ? String(rawDob) : undefined),
        collegeEmail: rawEmail,
        year: parsedYear,
        cgpa: parsedCgpa,
        status,
        statusReasons,
        isDuplicate,
        duplicateReason,
        existingStudentInfo: existingInfo,
      });
    });

    // 3. Hierarchical Organization: Department -> Course -> Register Number (Natural Sort)
    const deptMap = new Map<string, Map<string, StudentImportItem[]>>();

    items.forEach((item) => {
      const deptKey = item.department.trim();
      const courseKey = item.course.trim();

      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, new Map());
      }
      const courseMap = deptMap.get(deptKey)!;
      if (!courseMap.has(courseKey)) {
        courseMap.set(courseKey, []);
      }
      courseMap.get(courseKey)!.push(item);
    });

    const hierarchicalData: DepartmentGroupPreview[] = [];

    // Sort departments alphabetically
    const sortedDeptKeys = Array.from(deptMap.keys()).sort((a, b) => a.localeCompare(b));

    for (const dKey of sortedDeptKeys) {
      const courseMap = deptMap.get(dKey)!;
      const sortedCourseKeys = Array.from(courseMap.keys()).sort((a, b) => a.localeCompare(b));
      const courses: CourseGroupPreview[] = [];
      let deptTotalCount = 0;

      for (const cKey of sortedCourseKeys) {
        const studentList = courseMap.get(cKey)!;
        // Natural register-number sort within course
        studentList.sort((a, b) => naturalRegisterNumberCompare(a.registerNumber, b.registerNumber));

        courses.push({
          courseName: cKey,
          courseCode: cKey.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 20),
          studentCount: studentList.length,
          students: studentList,
        });

        deptTotalCount += studentList.length;
      }

      hierarchicalData.push({
        departmentName: dKey,
        departmentCode: dKey.toUpperCase().replace(/[^A-Z0-9]/g, '-').slice(0, 15),
        studentCount: deptTotalCount,
        courses,
      });
    }

    // 4. Counts
    const totalRecords = items.length;
    const validRecords = items.filter((i) => i.status === 'VALID').length;
    const warningRecords = items.filter((i) => i.status === 'WARNING').length;
    const duplicateRecords = items.filter((i) => i.status === 'DUPLICATE').length;
    const invalidRecords = items.filter((i) => i.status === 'INVALID').length;
    const departmentsFound = hierarchicalData.length;
    let coursesFound = 0;
    hierarchicalData.forEach((d) => (coursesFound += d.courses.length));

    // 5. Store session in cache
    const importSessionId = `session-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    previewCache.set(importSessionId, {
      sessionId: importSessionId,
      fileName,
      items,
      columnMapping: mapping,
      createdAt: Date.now(),
    });

    return {
      importSessionId,
      fileName,
      totalRecords,
      validRecords: validRecords + warningRecords, // Warnings are valid to import
      warningRecords,
      duplicateRecords,
      invalidRecords,
      departmentsFound,
      coursesFound,
      columnMapping: mapping,
      aiAssisted: mapping.aiAssisted,
      aiNotes,
      hierarchicalData,
      flatRecords: items,
    };
  }

  /**
   * Confirms import and commits students in a safe database transaction.
   * Derives temporary passwords from DOB, bcrypt-hashes them, forces first-login password change.
   */
  async confirmImport(
    req: AiStudentImportConfirmRequest,
    adminUserEmail: string
  ): Promise<AiStudentImportConfirmResponse> {
    const session = previewCache.get(req.importSessionId);
    if (!session) {
      throw new AppError('Import session has expired or is invalid. Please upload the file again.', 400);
    }

    const { items, fileName } = session;
    const skipDuplicates = req.skipDuplicates !== false; // default true
    const selectedIds = req.selectedStudentIds ? new Set(req.selectedStudentIds) : null;

    // Filter items to import: only VALID or WARNING (or unselected filtered)
    const candidates = items.filter((item) => {
      if (selectedIds && !selectedIds.has(item.id)) return false;
      if (skipDuplicates && item.isDuplicate) return false;
      if (item.status === 'INVALID') return false;
      return true;
    });

    if (candidates.length === 0) {
      throw new AppError('No eligible student records selected to import.', 400);
    }

    // Resolve or find default college
    const college = await prisma.college.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!college) {
      throw new AppError('No College entity found in the database. Please configure college settings first.', 400);
    }
    const collegeId = college.id;

    // Pre-load all departments, courses, classes, sections
    const existingDepts = await prisma.department.findMany({ where: { collegeId } });
    const existingCourses = await prisma.course.findMany();
    const existingClasses = await prisma.class.findMany();
    const existingSections = await prisma.section.findMany();

    const deptMap = new Map<string, (typeof existingDepts)[0]>();
    existingDepts.forEach((d) => {
      deptMap.set(d.code.toUpperCase(), d);
      deptMap.set(d.name.toLowerCase(), d);
    });

    const courseMap = new Map<string, (typeof existingCourses)[0]>();
    existingCourses.forEach((c) => {
      courseMap.set(`${c.departmentId}:${c.code.toUpperCase()}`, c);
      courseMap.set(`${c.departmentId}:${c.name.toLowerCase()}`, c);
    });

    const classMap = new Map<string, (typeof existingClasses)[0]>();
    existingClasses.forEach((cl) => {
      classMap.set(`${cl.courseId}:${cl.currentYear}`, cl);
    });

    const sectionMap = new Map<string, (typeof existingSections)[0]>();
    existingSections.forEach((s) => {
      sectionMap.set(`${s.classId}:${s.name.toUpperCase()}`, s);
    });

    // Helper to resolve or create hierarchy
    const resolveDepartment = async (deptNameOrCode: string) => {
      const codeClean = deptNameOrCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'DEPT';
      const nameClean = deptNameOrCode.trim();

      const existing = deptMap.get(codeClean) || deptMap.get(nameClean.toLowerCase());
      if (existing) return existing;

      const created = await prisma.department.create({
        data: {
          collegeId,
          code: codeClean,
          name: nameClean,
        },
      });
      deptMap.set(created.code.toUpperCase(), created);
      deptMap.set(created.name.toLowerCase(), created);
      return created;
    };

    const resolveCourse = async (departmentId: string, courseNameOrCode: string) => {
      const codeClean = courseNameOrCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15) || 'CRS';
      const nameClean = courseNameOrCode.trim();

      const existing =
        courseMap.get(`${departmentId}:${codeClean}`) ||
        courseMap.get(`${departmentId}:${nameClean.toLowerCase()}`);
      if (existing) return existing;

      const created = await prisma.course.create({
        data: {
          departmentId,
          code: codeClean,
          name: nameClean,
          durationYears: 4,
        },
      });
      courseMap.set(`${departmentId}:${created.code.toUpperCase()}`, created);
      courseMap.set(`${departmentId}:${created.name.toLowerCase()}`, created);
      return created;
    };

    const resolveClass = async (departmentId: string, courseId: string, currentYear: number) => {
      const key = `${courseId}:${currentYear}`;
      const existing = classMap.get(key);
      if (existing) return existing;

      const batchYear = new Date().getFullYear() + (4 - currentYear);
      const created = await prisma.class.create({
        data: {
          departmentId,
          courseId,
          batchYear,
          currentYear,
          name: `Batch ${batchYear} - Year ${currentYear}`,
        },
      });
      classMap.set(key, created);
      return created;
    };

    const resolveSection = async (classId: string, sectionName: string) => {
      const secClean = (sectionName || 'A').trim().toUpperCase().slice(0, 5);
      const key = `${classId}:${secClean}`;
      const existing = sectionMap.get(key);
      if (existing) return existing;

      const created = await prisma.section.create({
        data: {
          classId,
          name: secClean,
        },
      });
      sectionMap.set(key, created);
      return created;
    };

    const createdCredentials: ExcelImportCredential[] = [];
    let importedCount = 0;
    let failedCount = 0;

    // Use common temporary password for all imported students (default 'Student@123')
    const commonTempPassword = (req.commonTemporaryPassword || 'Student@123').trim();
    const commonPasswordHash = await hashPassword(commonTempPassword);

    for (const item of candidates) {
      try {
        const dept = await resolveDepartment(item.department);
        const crs = await resolveCourse(dept.id, item.course);
        const cls = await resolveClass(dept.id, crs.id, item.year || 1);
        const sec = await resolveSection(cls.id, item.section || 'A');

        // Execute safe per-student creation
        await prisma.$transaction(async (tx) => {
          // 1. Create User account with role STUDENT, common temporary password, and mustChangePassword=true
          const user = await tx.user.create({
            data: {
              email: item.collegeEmail.toLowerCase().trim(),
              passwordHash: commonPasswordHash,
              role: Role.STUDENT,
              isActive: true,
              mustChangePassword: true,
            },
          });

          // 2. Create Student profile (DOB stored as student metadata, not password)
          await tx.student.create({
            data: {
              userId: user.id,
              registerNumber: item.registerNumber.toUpperCase().trim(),
              name: item.studentName.trim(),
              collegeEmail: item.collegeEmail.toLowerCase().trim(),
              phone: item.mobileNumber?.trim() || null,
              dob: item.dateOfBirth?.trim() || null,
              departmentId: dept.id,
              courseId: crs.id,
              classId: cls.id,
              sectionId: sec.id,
              year: item.year || 1,
              cgpa: item.cgpa !== undefined ? item.cgpa : null,
              status: 'ACTIVE',
            },
          });
        });

        createdCredentials.push({
          registerNumber: item.registerNumber,
          name: item.studentName,
          email: item.collegeEmail,
          temporaryPassword: commonTempPassword,
        });

        importedCount++;
      } catch (err: any) {
        console.error(`[AiStudentImportService] Failed to import student ${item.registerNumber}:`, err.message);
        failedCount++;
      }
    }

    const duplicateCount = items.filter((i) => i.isDuplicate).length;
    const invalidCount = items.filter((i) => i.status === 'INVALID').length;

    // Record in StudentImportHistory table
    const history = await prisma.studentImportHistory.create({
      data: {
        fileName,
        uploadedByEmail: adminUserEmail,
        totalRecords: items.length,
        importedCount,
        duplicateCount,
        invalidCount: invalidCount + failedCount,
        status: failedCount > 0 ? (importedCount > 0 ? 'PARTIAL' : 'FAILED') : 'COMPLETED',
        detailsJson: JSON.stringify({
          importSessionId: req.importSessionId,
          importedAt: new Date().toISOString(),
          importedCount,
          failedCount,
          duplicateCount,
          invalidCount,
          commonTemporaryPassword: commonTempPassword,
          sampleCredentialsCount: createdCredentials.length,
        }),
      },
    });

    // Invalidate session cache
    previewCache.delete(req.importSessionId);

    return {
      historyId: history.id,
      totalProcessed: items.length,
      importedCount,
      duplicateCount,
      invalidCount: invalidCount + failedCount,
      status: history.status,
      commonTemporaryPassword: commonTempPassword,
      credentials: createdCredentials,
      message: `Successfully imported ${importedCount} student accounts out of ${items.length} records. Common temporary password: "${commonTempPassword}".`,
    };
  }

  /**
   * Retrieves past import history
   */
  async getImportHistory(): Promise<StudentImportHistoryRecord[]> {
    const list = await prisma.studentImportHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return list;
  }

  /**
   * Retrieves single import history record with full details
   */
  async getImportHistoryById(id: string): Promise<StudentImportHistoryRecord | null> {
    return prisma.studentImportHistory.findUnique({
      where: { id },
    });
  }
}

export const aiStudentImportService = new AiStudentImportService();
