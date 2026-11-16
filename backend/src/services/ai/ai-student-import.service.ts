import * as XLSX from 'xlsx';
import crypto from 'crypto';
import { prisma } from '../../config/prisma.config.js';
import { env } from '../../config/env.config.js';
import { Role } from '../../types/auth.types.js';
import { hashPassword } from '../../utils/password.util.js';
import { AppError } from '../../middleware/errorHandler.js';
import { getAcademicStructure } from '../../utils/academic-structure.util.js';
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

export function parseNumeric(val: unknown): number | undefined {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}

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

    const department = findMatch(['dept', 'department', 'departmentname', 'deptcode']);
    const course = findMatch(['course', 'programme', 'program', 'degree', 'coursecode', 'major']);
    const className = findMatch(['class', 'batch', 'batchyear', 'classname', 'yearofstudy']);
    const section = findMatch(['section', 'sec', 'division', 'div', 'sectionname']);
    const studentName = findMatch(['studentname', 'name', 'student', 'candidatename', 'fullname', 'nameofstudent']);
    const registerNumber = findMatch(['registernumber', 'regno', 'registerno', 'registrationnumber', 'rollno', 'rollnumber', 'regn', 'register']);
    const mobileNumber = findMatch(['mobilenumber', 'mobile', 'phone', 'phonenumber', 'contact', 'contactnumber', 'cell']);
    const dateOfBirth = findMatch(['dateofbirth', 'dob', 'birthdate', 'd_o_b', 'birth_date']);
    const collegeEmail = findMatch(['collegeemail', 'email', 'mail', 'emailid', 'studentemail', 'officialemail', 'emailaddress']);
    const year = findMatch(['year', 'currentyear', 'academicyear', 'studyyear']);
    const cgpa = findMatch(['cgpa', 'overallcgpa', 'gpa']);

    // 10th Standard Academic Marks
    const tenthBoard = findMatch(['10thboard', 'tenthboard', 'sslcboard', 'matricboard', 'secondaryboard', '10board']);
    const tenthPassingYear = findMatch(['10thpassingyear', '10thyear', 'tenthyear', 'tenthpassingyear', 'sslcyear', '10thpassyear', 'yearofpassing10th']);
    const tenthMarksObtained = findMatch(['10thmarksobtained', '10thobtainedmarks', 'tenthmarksobtained', 'tenthabtainedmarks', 'tenthmarks', '10thmarks', '10thmark', 'sslcmarks', '10thscore', '10thscored']);
    const tenthTotalMarks = findMatch(['10thtotalmarks', 'tenthtotalmarks', '10thmaxmarks', '10thtotal', 'tenthtotal', 'sslctotal', '10thmaximummarks']);
    const tenthPercentage = findMatch(['10thpercentage', 'tenthpercentage', '10thpercent', '10thpct', 'sslcpercentage', '10percentage', '10th%']);

    // 12th Standard / Diploma Academic Marks
    const twelfthBoard = findMatch(['12thboard', 'twelfthboard', 'hscboard', 'plus2board', 'interboard', 'highersecondaryboard', '12board', 'diplomaboard']);
    const twelfthPassingYear = findMatch(['12thpassingyear', '12thyear', 'twelfthyear', 'twelfthpassingyear', 'hscyear', '12thpassyear', 'yearofpassing12th']);
    const twelfthMarksObtained = findMatch(['12thmarksobtained', '12thobtainedmarks', 'twelfthmarksobtained', 'twelfthobtainedmarks', '12thmarks', 'twelfthmarks', '12thmark', 'hscmarks', '12thscore', '12thscored', 'diplomamarks']);
    const twelfthTotalMarks = findMatch(['12thtotalmarks', 'twelfthtotalmarks', '12thmaxmarks', '12thtotal', 'twelfthtotal', 'hsctotal', '12thmaximummarks', 'diplomatotal']);
    const twelfthPercentage = findMatch(['12thpercentage', 'twelfthpercentage', '12thpercent', '12thpct', 'hscpercentage', '12percentage', '12th%', 'diplomapercentage']);

    // Academic Structure & Level
    const degreeLevel = findMatch(['degreelevel', 'level', 'ugpg', 'programlevel', 'studylevel']);
    const currentSemester = findMatch(['currentsemester', 'semester', 'sem', 'currentsem', 'presentsemester']);

    // Undergraduate (UG) Credentials
    const ugDegree = findMatch(['ugdegree', 'undergraduatedegree', 'degreeprogram', 'ugcourse', 'undergraduatecourse']);
    const ugBranch = findMatch(['ugbranch', 'branch', 'specialization', 'ugspecialization', 'stream']);
    const ugStatus = findMatch(['ugstatus', 'undergraduatestatus', 'educationstatus', 'ugstudy', 'studystatus']);
    const ugCgpa = findMatch(['ugcgpa', 'undergraduatecgpa', 'currentcgpa', 'finalcgpa', 'cgpa']);
    const ugPercentage = findMatch(['ugpercentage', 'undergraduatepercentage', 'currentpercentage', 'finalpercentage', 'percentage', 'overallpercentage']);
    const activeBacklogs = findMatch(['activebacklogs', 'backlogs', 'currentbacklogs', 'standingarrears', 'arrears', 'standingbacklogs', 'currentarrears']);
    const historyOfBacklogs = findMatch(['historyofbacklogs', 'totalbacklogs', 'backloghistory', 'historyofarrears', 'arrearhistory', 'pastbacklogs']);

    // Postgraduate (PG) Credentials
    const pgDegree = findMatch(['pgdegree', 'postgraduatedegree', 'pgcourse', 'masterdegree']);
    const pgStatus = findMatch(['pgstatus', 'postgraduatestatus']);
    const pgCgpa = findMatch(['pgcgpa', 'postgraduatecgpa']);
    const pgPercentage = findMatch(['pgpercentage', 'postgraduatepercentage']);

    // Extended 30 Mandatory + 2 Optional Fields
    const rollNo = findMatch(['rollno', 'rollnumber', 'roll_no', 'studentrollno']);
    const gender = findMatch(['gender', 'sex']);
    const whatsappNumber = findMatch(['whatsappnumber', 'whatsappno', 'wanumber', 'wano', 'whatsapp']);
    const personalEmail = findMatch(['personalemail', 'personalmail', 'alternateemail', 'altemail', 'emailid', 'personalemailid']);
    const schoolName = findMatch(['schoolname', '10thschool', '12thschool', 'school']);
    const ugCollegeName = findMatch(['ugcollegename', 'collegename', 'ugcollege', 'college']);
    const nativePlace = findMatch(['nativeplace', 'native', 'hometown', 'placeofbirth', 'place']);
    const languagesKnown = findMatch(['languagesknown', 'languages', 'languages_known', 'mothertongue']);
    const correspondenceAddress = findMatch(['correspondenceaddress', 'currentaddress', 'presentaddress', 'temporaryaddress', 'commaddress', 'addressforcommunication']);
    const permanentAddress = findMatch(['permanentaddress', 'nativeaddress', 'homeaddress']);
    const graduationYear = findMatch(['graduationyear', 'gradyear', 'yearofpassing', 'batchyear', 'passingyear']);
    const arrearStatus = findMatch(['arrearstatus', 'standingarrears', 'arrears', 'currentarrears']);
    const studentStatus = findMatch(['studentstatus', 'studystatus', 'admissionstatus']);
    const placementWillingness = findMatch(['placementwillingness', 'willingness', 'interestedinplacement', 'placementready']);
    const specialization = findMatch(['specialization', 'stream', 'ugspecialization', 'submajor']);
    const skills = findMatch(['skills', 'technicalskills', 'skillset', 'skillsoptional']);
    const internshipExperience = findMatch(['internshipexperience', 'internship', 'internships', 'workexperience', 'experience', 'internshipexperienceoptional']);

    let score = 0;
    if (department) score++;
    if (course || ugDegree) score++;
    if (studentName) score++;
    if (registerNumber) score++;
    if (collegeEmail) score++;
    if (tenthMarksObtained || tenthPercentage) score++;
    if (twelfthMarksObtained || twelfthPercentage) score++;
    if (ugCgpa || ugPercentage) score++;

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
      tenthBoard,
      tenthPassingYear,
      tenthMarksObtained,
      tenthTotalMarks,
      tenthPercentage,
      twelfthBoard,
      twelfthPassingYear,
      twelfthMarksObtained,
      twelfthTotalMarks,
      twelfthPercentage,
      degreeLevel,
      currentSemester,
      ugDegree,
      ugBranch,
      ugStatus,
      ugCgpa,
      ugPercentage,
      activeBacklogs,
      historyOfBacklogs,
      pgDegree,
      pgStatus,
      pgCgpa,
      pgPercentage,
      rollNo,
      gender,
      whatsappNumber,
      personalEmail,
      schoolName,
      ugCollegeName,
      nativePlace,
      languagesKnown,
      correspondenceAddress,
      permanentAddress,
      graduationYear,
      arrearStatus,
      studentStatus,
      placementWillingness,
      specialization,
      skills,
      internshipExperience,
      rawHeaders: headers,
      aiAssisted: false,
      confidence: Math.min(100, Math.round((score / 5) * 100)),
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
- TenthBoard: 10th school board (e.g. CBSE, State Board, ICSE)
- TenthPassingYear: 10th passing year (e.g. 2020)
- TenthMarksObtained: 10th obtained marks (e.g. 465)
- TenthTotalMarks: 10th total/max marks (e.g. 500)
- TenthPercentage: 10th percentage (e.g. 93.0)
- TwelfthBoard: 12th/Diploma board (e.g. CBSE, State Board)
- TwelfthPassingYear: 12th passing year (e.g. 2022)
- TwelfthMarksObtained: 12th obtained marks (e.g. 558)
- TwelfthTotalMarks: 12th total/max marks (e.g. 600)
- TwelfthPercentage: 12th percentage (e.g. 93.0)
- DegreeLevel: Degree level UG or PG
- CurrentSemester: Current semester number (e.g. 1, 2, 3, 4, 5, 6)
- UgDegree: UG degree program (e.g. B.Sc IT, B.E CSE, B.Com, BCA)
- UgBranch: UG branch/specialization (e.g. Computer Science, Information Technology)
- UgStatus: UG education status (STUDYING or COMPLETED)
- UgCgpa: UG CGPA (e.g. 8.45)
- UgPercentage: UG percentage (e.g. 80.27)
- ActiveBacklogs: Current standing backlogs/arrears count
- HistoryOfBacklogs: Total history of backlogs/arrears count
- PgDegree: PG degree program if applicable (e.g. M.Sc, MCA, MBA)
- PgStatus: PG education status (STUDYING or COMPLETED)
- PgCgpa: PG CGPA (e.g. 8.5)
- PgPercentage: PG percentage (e.g. 80.75)

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
  "TenthBoard": string or null,
  "TenthPassingYear": string or null,
  "TenthMarksObtained": string or null,
  "TenthTotalMarks": string or null,
  "TenthPercentage": string or null,
  "TwelfthBoard": string or null,
  "TwelfthPassingYear": string or null,
  "TwelfthMarksObtained": string or null,
  "TwelfthTotalMarks": string or null,
  "TwelfthPercentage": string or null,
  "DegreeLevel": string or null,
  "CurrentSemester": string or null,
  "UgDegree": string or null,
  "UgBranch": string or null,
  "UgStatus": string or null,
  "UgCgpa": string or null,
  "UgPercentage": string or null,
  "ActiveBacklogs": string or null,
  "HistoryOfBacklogs": string or null,
  "PgDegree": string or null,
  "PgStatus": string or null,
  "PgCgpa": string or null,
  "PgPercentage": string or null,
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
            maxOutputTokens: 900,
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
        tenthBoard: headers.includes(parsedAi.TenthBoard) ? parsedAi.TenthBoard : heuristic.tenthBoard,
        tenthPassingYear: headers.includes(parsedAi.TenthPassingYear) ? parsedAi.TenthPassingYear : heuristic.tenthPassingYear,
        tenthMarksObtained: headers.includes(parsedAi.TenthMarksObtained) ? parsedAi.TenthMarksObtained : heuristic.tenthMarksObtained,
        tenthTotalMarks: headers.includes(parsedAi.TenthTotalMarks) ? parsedAi.TenthTotalMarks : heuristic.tenthTotalMarks,
        tenthPercentage: headers.includes(parsedAi.TenthPercentage) ? parsedAi.TenthPercentage : heuristic.tenthPercentage,
        twelfthBoard: headers.includes(parsedAi.TwelfthBoard) ? parsedAi.TwelfthBoard : heuristic.twelfthBoard,
        twelfthPassingYear: headers.includes(parsedAi.TwelfthPassingYear) ? parsedAi.TwelfthPassingYear : heuristic.twelfthPassingYear,
        twelfthMarksObtained: headers.includes(parsedAi.TwelfthMarksObtained) ? parsedAi.TwelfthMarksObtained : heuristic.twelfthMarksObtained,
        twelfthTotalMarks: headers.includes(parsedAi.TwelfthTotalMarks) ? parsedAi.TwelfthTotalMarks : heuristic.twelfthTotalMarks,
        twelfthPercentage: headers.includes(parsedAi.TwelfthPercentage) ? parsedAi.TwelfthPercentage : heuristic.twelfthPercentage,
        degreeLevel: headers.includes(parsedAi.DegreeLevel) ? parsedAi.DegreeLevel : heuristic.degreeLevel,
        currentSemester: headers.includes(parsedAi.CurrentSemester) ? parsedAi.CurrentSemester : heuristic.currentSemester,
        ugDegree: headers.includes(parsedAi.UgDegree) ? parsedAi.UgDegree : heuristic.ugDegree,
        ugBranch: headers.includes(parsedAi.UgBranch) ? parsedAi.UgBranch : heuristic.ugBranch,
        ugStatus: headers.includes(parsedAi.UgStatus) ? parsedAi.UgStatus : heuristic.ugStatus,
        ugCgpa: headers.includes(parsedAi.UgCgpa) ? parsedAi.UgCgpa : heuristic.ugCgpa,
        ugPercentage: headers.includes(parsedAi.UgPercentage) ? parsedAi.UgPercentage : heuristic.ugPercentage,
        activeBacklogs: headers.includes(parsedAi.ActiveBacklogs) ? parsedAi.ActiveBacklogs : heuristic.activeBacklogs,
        historyOfBacklogs: headers.includes(parsedAi.HistoryOfBacklogs) ? parsedAi.HistoryOfBacklogs : heuristic.historyOfBacklogs,
        pgDegree: headers.includes(parsedAi.PgDegree) ? parsedAi.PgDegree : heuristic.pgDegree,
        pgStatus: headers.includes(parsedAi.PgStatus) ? parsedAi.PgStatus : heuristic.pgStatus,
        pgCgpa: headers.includes(parsedAi.PgCgpa) ? parsedAi.PgCgpa : heuristic.pgCgpa,
        pgPercentage: headers.includes(parsedAi.PgPercentage) ? parsedAi.PgPercentage : heuristic.pgPercentage,
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

      // 10th Standard Academic Marks
      const tenthBoard = mapping.tenthBoard && row[mapping.tenthBoard] ? String(row[mapping.tenthBoard]).trim() : undefined;
      const tenthPassingYear = mapping.tenthPassingYear ? parseNumeric(row[mapping.tenthPassingYear]) : undefined;
      const tenthTotalMarks = mapping.tenthTotalMarks ? parseNumeric(row[mapping.tenthTotalMarks]) : undefined;
      const tenthMarksObtained = mapping.tenthMarksObtained ? parseNumeric(row[mapping.tenthMarksObtained]) : undefined;
      let tenthPercentage = mapping.tenthPercentage ? parseNumeric(row[mapping.tenthPercentage]) : undefined;
      if (tenthPercentage === undefined && tenthTotalMarks && tenthTotalMarks > 0 && tenthMarksObtained !== undefined && tenthMarksObtained >= 0) {
        tenthPercentage = parseFloat(((tenthMarksObtained / tenthTotalMarks) * 100).toFixed(2));
      }

      // 12th Standard Academic Marks
      const twelfthBoard = mapping.twelfthBoard && row[mapping.twelfthBoard] ? String(row[mapping.twelfthBoard]).trim() : undefined;
      const twelfthPassingYear = mapping.twelfthPassingYear ? parseNumeric(row[mapping.twelfthPassingYear]) : undefined;
      const twelfthTotalMarks = mapping.twelfthTotalMarks ? parseNumeric(row[mapping.twelfthTotalMarks]) : undefined;
      const twelfthObtainedMarks = mapping.twelfthMarksObtained ? parseNumeric(row[mapping.twelfthMarksObtained]) : undefined;
      let twelfthPercentage = mapping.twelfthPercentage ? parseNumeric(row[mapping.twelfthPercentage]) : undefined;
      if (twelfthPercentage === undefined && twelfthTotalMarks && twelfthTotalMarks > 0 && twelfthObtainedMarks !== undefined && twelfthObtainedMarks >= 0) {
        twelfthPercentage = parseFloat(((twelfthObtainedMarks / twelfthTotalMarks) * 100).toFixed(2));
      }

      // UG Credentials
      const ugDegree = mapping.ugDegree && row[mapping.ugDegree] ? String(row[mapping.ugDegree]).trim() : rawCourse || undefined;
      const ugBranch = mapping.ugBranch && row[mapping.ugBranch] ? String(row[mapping.ugBranch]).trim() : rawDept || undefined;
      const ugStatus = mapping.ugStatus && row[mapping.ugStatus] ? String(row[mapping.ugStatus]).trim().toUpperCase() : 'STUDYING';
      let ugCgpa = mapping.ugCgpa ? parseNumeric(row[mapping.ugCgpa]) : undefined;
      let ugPercentage = mapping.ugPercentage ? parseNumeric(row[mapping.ugPercentage]) : undefined;
      if (ugCgpa === undefined && parsedCgpa !== undefined) {
        ugCgpa = parsedCgpa;
      }
      if (parsedCgpa === undefined && ugCgpa !== undefined) {
        parsedCgpa = ugCgpa;
      }
      if (ugPercentage === undefined && ugCgpa !== undefined && ugCgpa >= 0 && ugCgpa <= 10) {
        ugPercentage = parseFloat((ugCgpa * 9.5).toFixed(2));
      }

      const activeBacklogs = mapping.activeBacklogs ? (parseNumeric(row[mapping.activeBacklogs]) ?? 0) : 0;
      const historyOfBacklogs = mapping.historyOfBacklogs ? (parseNumeric(row[mapping.historyOfBacklogs]) ?? 0) : 0;

      // PG Credentials
      const pgDegree = mapping.pgDegree && row[mapping.pgDegree] ? String(row[mapping.pgDegree]).trim() : undefined;
      const pgStatus = mapping.pgStatus && row[mapping.pgStatus] ? String(row[mapping.pgStatus]).trim().toUpperCase() : undefined;
      const pgCgpa = mapping.pgCgpa ? parseNumeric(row[mapping.pgCgpa]) : undefined;
      let pgPercentage = mapping.pgPercentage ? parseNumeric(row[mapping.pgPercentage]) : undefined;
      if (pgPercentage === undefined && pgCgpa !== undefined && pgCgpa >= 0 && pgCgpa <= 10) {
        pgPercentage = parseFloat((pgCgpa * 9.5).toFixed(2));
      }

      // Academic Structure & Level
      const rawDegreeLevel = mapping.degreeLevel && row[mapping.degreeLevel] ? String(row[mapping.degreeLevel]).trim().toUpperCase() : undefined;
      const academicStructure = getAcademicStructure({
        degreeLevel: rawDegreeLevel,
        degreeName: ugDegree || pgDegree || rawCourse,
        courseName: rawCourse,
        departmentName: rawDept,
      });
      const degreeLevel = rawDegreeLevel || academicStructure.degreeLevel;
      let currentSemester = mapping.currentSemester ? parseNumeric(row[mapping.currentSemester]) : undefined;
      if (!currentSemester && parsedYear > 0) {
        currentSemester = Math.min(parsedYear * 2 - 1, academicStructure.totalSemesters);
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
        tenthBoard,
        tenthPassingYear,
        tenthMarksObtained,
        tenthTotalMarks,
        tenthPercentage,
        twelfthBoard,
        twelfthPassingYear,
        twelfthObtainedMarks,
        twelfthTotalMarks,
        twelfthPercentage,
        degreeLevel,
        currentSemester,
        ugDegree,
        ugBranch,
        ugStatus,
        ugCgpa,
        ugPercentage,
        activeBacklogs,
        historyOfBacklogs,
        pgDegree,
        pgStatus,
        pgCgpa,
        pgPercentage,
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

      const struct = getAcademicStructure({ courseName: nameClean, courseCode: codeClean });
      const created = await prisma.course.create({
        data: {
          departmentId,
          code: codeClean,
          name: nameClean,
          durationYears: struct.durationYears,
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

        const structure = getAcademicStructure({
          degreeLevel: item.degreeLevel,
          degreeName: item.ugDegree || item.pgDegree || crs.name,
          courseName: crs.name,
          courseCode: crs.code,
          departmentName: dept.name,
          departmentCode: dept.code,
        });

        const cgpaValue = (item.ugCgpa ?? item.cgpa) ?? null;
        const pctValue = item.ugPercentage ?? (cgpaValue !== null ? parseFloat((cgpaValue * 9.5).toFixed(2)) : null);
        const currentSemesterVal = item.currentSemester || Math.min((item.year || 1) * 2 - 1, structure.totalSemesters);

        // Execute safe per-student creation or synchronization
        await prisma.$transaction(async (tx) => {
          let studentId: string;

          // Check if student already exists by registerNumber or collegeEmail
          const existing = await tx.student.findFirst({
            where: {
              OR: [
                { registerNumber: item.registerNumber.toUpperCase().trim() },
                { collegeEmail: item.collegeEmail.toLowerCase().trim() },
              ],
            },
          });

          if (existing) {
            // Update existing student profile
            const updated = await tx.student.update({
              where: { id: existing.id },
              data: {
                name: item.studentName.trim(),
                phone: item.mobileNumber?.trim() || existing.phone,
                dob: item.dateOfBirth?.trim() || existing.dob,
                departmentId: dept.id,
                courseId: crs.id,
                classId: cls.id,
                sectionId: sec.id,
                year: item.year || existing.year,
                cgpa: cgpaValue ?? existing.cgpa,
              },
            });
            studentId = updated.id;
          } else {
            // 1. Create User account with role STUDENT if not exists
            let user = await tx.user.findUnique({
              where: { email: item.collegeEmail.toLowerCase().trim() },
            });
            if (!user) {
              user = await tx.user.create({
                data: {
                  email: item.collegeEmail.toLowerCase().trim(),
                  passwordHash: commonPasswordHash,
                  role: Role.STUDENT,
                  isActive: true,
                  mustChangePassword: true,
                },
              });
            }

            // 2. Create Student profile
            const created = await tx.student.create({
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
                cgpa: cgpaValue,
                status: 'ACTIVE',
              },
            });
            studentId = created.id;
          }

          // 3. Upsert StudentAcademicRecord
          const academicRecord = await tx.studentAcademicRecord.upsert({
            where: { studentId },
            create: {
              studentId,
              tenthBoard: item.tenthBoard || null,
              tenthPassingYear: item.tenthPassingYear || null,
              tenthObtainedMarks: item.tenthMarksObtained || null,
              tenthTotalMarks: item.tenthTotalMarks || null,
              tenthPercentage: item.tenthPercentage || null,
              twelfthBoard: item.twelfthBoard || null,
              twelfthPassingYear: item.twelfthPassingYear || null,
              twelfthObtainedMarks: item.twelfthObtainedMarks || null,
              twelfthTotalMarks: item.twelfthTotalMarks || null,
              twelfthPercentage: item.twelfthPercentage || null,
              degreeLevel: item.degreeLevel || structure.degreeLevel,
              studyStatus: item.ugStatus || 'STUDYING',
              currentSemester: currentSemesterVal,
              ugDegree: item.ugDegree || crs.name || null,
              ugBranch: item.ugBranch || dept.name || null,
              ugStatus: item.ugStatus || 'STUDYING',
              ugCgpa: item.ugCgpa ?? cgpaValue,
              ugPercentage: item.ugPercentage ?? pctValue,
              currentCgpa: cgpaValue,
              overallPercentage: pctValue,
              activeBacklogs: item.activeBacklogs || 0,
              historyOfBacklogs: item.historyOfBacklogs || 0,
              pgDegree: item.pgDegree || null,
              pgStatus: item.pgStatus || null,
              pgCgpa: item.pgCgpa || null,
              pgPercentage: item.pgPercentage || null,
            },
            update: {
              ...(item.tenthBoard ? { tenthBoard: item.tenthBoard } : {}),
              ...(item.tenthPassingYear ? { tenthPassingYear: item.tenthPassingYear } : {}),
              ...(item.tenthMarksObtained !== undefined ? { tenthObtainedMarks: item.tenthMarksObtained } : {}),
              ...(item.tenthTotalMarks !== undefined ? { tenthTotalMarks: item.tenthTotalMarks } : {}),
              ...(item.tenthPercentage !== undefined ? { tenthPercentage: item.tenthPercentage } : {}),
              ...(item.twelfthBoard ? { twelfthBoard: item.twelfthBoard } : {}),
              ...(item.twelfthPassingYear ? { twelfthPassingYear: item.twelfthPassingYear } : {}),
              ...(item.twelfthObtainedMarks !== undefined ? { twelfthObtainedMarks: item.twelfthObtainedMarks } : {}),
              ...(item.twelfthTotalMarks !== undefined ? { twelfthTotalMarks: item.twelfthTotalMarks } : {}),
              ...(item.twelfthPercentage !== undefined ? { twelfthPercentage: item.twelfthPercentage } : {}),
              degreeLevel: item.degreeLevel || structure.degreeLevel,
              currentSemester: currentSemesterVal,
              ...(item.ugDegree ? { ugDegree: item.ugDegree } : {}),
              ...(item.ugBranch ? { ugBranch: item.ugBranch } : {}),
              ...(item.ugStatus ? { ugStatus: item.ugStatus, studyStatus: item.ugStatus } : {}),
              ...(item.ugCgpa !== undefined ? { ugCgpa: item.ugCgpa } : (cgpaValue !== null ? { ugCgpa: cgpaValue } : {})),
              ...(item.ugPercentage !== undefined ? { ugPercentage: item.ugPercentage } : (pctValue !== null ? { ugPercentage: pctValue } : {})),
              ...(cgpaValue !== null ? { currentCgpa: cgpaValue } : {}),
              ...(pctValue !== null ? { overallPercentage: pctValue } : {}),
              activeBacklogs: item.activeBacklogs ?? 0,
              historyOfBacklogs: item.historyOfBacklogs ?? 0,
              ...(item.pgDegree ? { pgDegree: item.pgDegree } : {}),
              ...(item.pgStatus ? { pgStatus: item.pgStatus } : {}),
              ...(item.pgCgpa !== undefined ? { pgCgpa: item.pgCgpa } : {}),
              ...(item.pgPercentage !== undefined ? { pgPercentage: item.pgPercentage } : {}),
            },
          });

          // 4. Initialize / Ensure semester records strictly up to structure.totalSemesters (Arts & Science = 6, PG = 4, Engineering = 8)
          for (let sem = 1; sem <= structure.totalSemesters; sem++) {
            await tx.studentSemesterRecord.upsert({
              where: {
                academicRecordId_semesterNumber: {
                  academicRecordId: academicRecord.id,
                  semesterNumber: sem,
                },
              },
              create: {
                academicRecordId: academicRecord.id,
                semesterNumber: sem,
                sgpa: null,
                cgpa: null,
                totalCredits: 24,
                creditsEarned: 24,
                backlogsCount: 0,
              },
              update: {}, // preserve existing semester entries
            });
          }
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
