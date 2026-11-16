import * as XLSX from 'xlsx';
import { ExcelImportRowError } from '../types/management.types.js';

export const MANDATORY_COLUMNS = [
  'S.No',
  'Roll No',
  'Register No',
  'Student Name',
  'Gender',
  'Department',
  'Date of Birth',
  '10th Percentage',
  '12th Percentage',
  'UG CGPA',
  'UG Percentage',
  'PG CGPA',
  'PG Percentage',
  'Mobile Number',
  'WhatsApp Number',
  'College Email',
  'Personal Email',
  'School Name',
  'UG College Name',
  'Native Place',
  'Languages Known',
  'Correspondence Address',
  'Permanent Address',
  'Graduation Year',
  'Current Semester',
  'Arrear Status',
  'Student Status',
  'Placement Willingness',
  'Specialization',
  'UG Degree',
] as const;

export const OPTIONAL_COLUMNS = [
  'Skills',
  'Internship Experience',
] as const;

export interface RawStudentRow {
  rowNumber: number;
  sNo?: number;
  rollNo?: string;
  registerNumber: string;
  name: string;
  gender?: string;
  department?: string;
  departmentCode: string;
  dob?: string;
  tenthPercentage?: number;
  twelfthPercentage?: number;
  ugCgpa?: number;
  ugPercentage?: number;
  pgCgpa?: number;
  pgPercentage?: number;
  phone?: string;
  whatsappNumber?: string;
  collegeEmail: string;
  personalEmail?: string;
  schoolName?: string;
  ugCollegeName?: string;
  nativePlace?: string;
  languagesKnown?: string;
  correspondenceAddress?: string;
  permanentAddress?: string;
  graduationYear?: number;
  currentSemester?: number;
  arrearStatus?: string;
  studentStatus?: string;
  placementWillingness?: string;
  specialization?: string;
  ugDegree?: string;
  skills?: string;
  internshipExperience?: string;
  skillsList?: string[];
  customColumns?: Record<string, unknown>;

  // Legacy mappings for backward compatibility
  courseCode?: string;
  year?: number;
  sectionName?: string;
  cgpa?: number;
  degreeLevel?: string;
  activeBacklogs?: number;
  historyOfBacklogs?: number;
  tenthBoard?: string;
  tenthPassingYear?: number;
  tenthObtainedMarks?: number;
  tenthTotalMarks?: number;
  twelfthBoard?: string;
  twelfthPassingYear?: number;
  twelfthObtainedMarks?: number;
  twelfthTotalMarks?: number;
  ugBranch?: string;
  ugStatus?: string;
  pgDegree?: string;
  pgStatus?: string;
}

/**
 * Normalizes column header strings (e.g. "Register No" -> "registerno")
 */
export const normalizeKey = (key: string): string => {
  return (key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const parseNum = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'N/A' || trimmed === 'NA' || trimmed === '-' || trimmed === 'nil') {
      return undefined;
    }
    const num = Number(trimmed);
    return isNaN(num) ? undefined : num;
  }
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

/**
 * Parse Date of Birth supporting DD-MM-YYYY, YYYY-MM-DD, slashes, Excel date serials
 */
export function parseDateOfBirth(raw: unknown): { formatted: string; isValid: boolean } {
  if (raw === undefined || raw === null || raw === '') {
    return { formatted: '', isValid: false };
  }

  // Handle Excel numeric date serials (e.g. 38579)
  if (typeof raw === 'number' && !isNaN(raw) && raw > 1000 && raw < 100000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(raw);
      if (dateObj) {
        const d = String(dateObj.d).padStart(2, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const y = String(dateObj.y);
        return { formatted: `${d}-${m}-${y}`, isValid: true };
      }
    } catch {
      // Fallback
    }
  }

  const str = String(raw).trim();
  if (!str) return { formatted: '', isValid: false };

  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return { formatted: `${d}-${m}-${y}`, isValid: true };
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return { formatted: `${d}-${m}-${y}`, isValid: true };
  }

  // Date parsing fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1950 && parsed.getFullYear() < 2035) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = String(parsed.getFullYear());
    return { formatted: `${d}-${m}-${y}`, isValid: true };
  }

  return { formatted: str, isValid: str.length >= 4 };
}

/**
 * Extracts integer arrears count from text such as "NO ARREARS", "0", "1 Arrear", "2 Standing"
 */
export function parseArrearCount(raw: unknown): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  const str = String(raw).trim().toUpperCase();
  if (
    str === '0' ||
    str === 'NO' ||
    str === 'NONE' ||
    str === 'NIL' ||
    str === 'CLEARED' ||
    str.includes('NO ARREAR') ||
    str.includes('NIL') ||
    str.includes('CLEAR')
  ) {
    return 0;
  }
  const match = str.match(/\d+/);
  if (match) {
    const n = parseInt(match[0], 10);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Canonical alias map for matching column headers flexibly
 */
const CANONICAL_MAP: Record<string, string> = {
  // S.No
  sno: 'sNo',
  slno: 'sNo',
  serialno: 'sNo',
  serialnumber: 'sNo',
  s_no: 'sNo',

  // Roll No
  rollno: 'rollNo',
  rollnumber: 'rollNo',
  roll: 'rollNo',
  roll_no: 'rollNo',

  // Register No
  registerno: 'registerNumber',
  registernumber: 'registerNumber',
  regno: 'registerNumber',
  registrationnumber: 'registerNumber',
  register_no: 'registerNumber',
  regn: 'registerNumber',

  // Student Name
  studentname: 'name',
  name: 'name',
  student_name: 'name',
  fullname: 'name',
  candidatename: 'name',
  nameofstudent: 'name',

  // Gender
  gender: 'gender',
  sex: 'gender',

  // Department
  department: 'departmentCode',
  dept: 'departmentCode',
  deptcode: 'departmentCode',
  departmentcode: 'departmentCode',
  departmentname: 'departmentCode',

  // Date of Birth
  dateofbirth: 'dob',
  dob: 'dob',
  birthdate: 'dob',
  d_o_b: 'dob',

  // 10th Percentage
  '10thpercentage': 'tenthPercentage',
  tenthpercentage: 'tenthPercentage',
  '10thpercent': 'tenthPercentage',
  '10thpct': 'tenthPercentage',
  sslcpercentage: 'tenthPercentage',
  '10th%': 'tenthPercentage',

  // 12th Percentage
  '12thpercentage': 'twelfthPercentage',
  twelfthpercentage: 'twelfthPercentage',
  '12thpercent': 'twelfthPercentage',
  '12thpct': 'twelfthPercentage',
  hscpercentage: 'twelfthPercentage',
  '12th%': 'twelfthPercentage',
  diplomapercentage: 'twelfthPercentage',

  // UG CGPA
  ugcgpa: 'ugCgpa',
  cgpa: 'ugCgpa',
  undergraduatecgpa: 'ugCgpa',
  currentcgpa: 'ugCgpa',
  overallcgpa: 'ugCgpa',

  // UG Percentage
  ugpercentage: 'ugPercentage',
  undergraduatepercentage: 'ugPercentage',
  percentage: 'ugPercentage',
  overallpercentage: 'ugPercentage',

  // PG CGPA
  pgcgpa: 'pgCgpa',
  postgraduatecgpa: 'pgCgpa',

  // PG Percentage
  pgpercentage: 'pgPercentage',
  postgraduatepercentage: 'pgPercentage',

  // Mobile Number
  mobilenumber: 'phone',
  mobile: 'phone',
  phone: 'phone',
  phonenumber: 'phone',
  contact: 'phone',
  contactnumber: 'phone',
  cell: 'phone',

  // WhatsApp Number
  whatsappnumber: 'whatsappNumber',
  whatsapp: 'whatsappNumber',
  wanumber: 'whatsappNumber',
  wano: 'whatsappNumber',
  whatsappno: 'whatsappNumber',

  // College Email
  collegeemail: 'collegeEmail',
  email: 'collegeEmail',
  emailaddress: 'collegeEmail',
  officialemail: 'collegeEmail',
  studentemail: 'collegeEmail',

  // Personal Email
  personalemail: 'personalEmail',
  altemail: 'personalEmail',
  alternateemail: 'personalEmail',
  secondaryemail: 'personalEmail',

  // School Name
  schoolname: 'schoolName',
  school: 'schoolName',
  '10thschool': 'schoolName',
  '12thschool': 'schoolName',
  schoolcollegename: 'schoolName',

  // UG College Name
  ugcollegename: 'ugCollegeName',
  collegename: 'ugCollegeName',
  ugcollege: 'ugCollegeName',
  institution: 'ugCollegeName',
  college: 'ugCollegeName',

  // Native Place
  nativeplace: 'nativePlace',
  native: 'nativePlace',
  hometown: 'nativePlace',
  place: 'nativePlace',
  city: 'nativePlace',

  // Languages Known
  languagesknown: 'languagesKnown',
  languages: 'languagesKnown',
  language: 'languagesKnown',
  knownlanguages: 'languagesKnown',

  // Correspondence Address
  correspondenceaddress: 'correspondenceAddress',
  currentaddress: 'correspondenceAddress',
  address: 'correspondenceAddress',
  temporaryaddress: 'correspondenceAddress',
  communicationaddress: 'correspondenceAddress',

  // Permanent Address
  permanentaddress: 'permanentAddress',
  nativeaddress: 'permanentAddress',

  // Graduation Year
  graduationyear: 'graduationYear',
  passingyear: 'graduationYear',
  yearofpassing: 'graduationYear',
  batchyear: 'graduationYear',
  gradyear: 'graduationYear',

  // Current Semester
  currentsemester: 'currentSemester',
  semester: 'currentSemester',
  sem: 'currentSemester',
  currentsem: 'currentSemester',

  // Arrear Status
  arrearstatus: 'arrearStatus',
  arrears: 'arrearStatus',
  standingarrears: 'arrearStatus',
  backlogs: 'arrearStatus',
  activebacklogs: 'arrearStatus',

  // Student Status
  studentstatus: 'studentStatus',
  status: 'studentStatus',
  academicstatus: 'studentStatus',

  // Placement Willingness
  placementwillingness: 'placementWillingness',
  placement: 'placementWillingness',
  willingness: 'placementWillingness',
  optin: 'placementWillingness',

  // Specialization
  specialization: 'specialization',
  branch: 'specialization',
  stream: 'specialization',
  ugbranch: 'specialization',

  // UG Degree
  ugdegree: 'ugDegree',
  degree: 'ugDegree',
  degreelevel: 'degreeLevel',
  ugcourse: 'ugDegree',
  degreeprogram: 'ugDegree',

  // Skills (OPTIONAL)
  skills: 'skills',
  skillsoptional: 'skills',
  skill: 'skills',
  technicalskills: 'skills',

  // Internship Experience (OPTIONAL)
  internshipexperience: 'internshipExperience',
  internshipexperienceoptional: 'internshipExperience',
  internship: 'internshipExperience',
  internships: 'internshipExperience',
  experience: 'internshipExperience',

  // Legacy mappings
  course: 'courseCode',
  coursecode: 'courseCode',
  year: 'year',
  currentyear: 'year',
  section: 'sectionName',
  sectionname: 'sectionName',
  sec: 'sectionName',
};

/**
 * Parses uploaded Excel / CSV buffer into structured student rows.
 * Validates mandatory columns and allows optional columns (Skills, Internship Experience)
 * as well as custom columns without breaking the import.
 */
export const parseStudentExcel = (
  buffer: Buffer
): { rows: RawStudentRow[]; parseErrors: ExcelImportRowError[] } => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel workbook contains no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: RawStudentRow[] = [];
  const parseErrors: ExcelImportRowError[] = [];

  if (rawJson.length === 0) {
    parseErrors.push({
      row: 1,
      field: 'Workbook',
      message: 'The uploaded Excel sheet contains no student data rows.',
    });
    return { rows, parseErrors };
  }

  // 1. Mandatory Column Heading Validation
  const headerKeys = Object.keys(rawJson[0]);
  const mappedFieldKeys = new Set<string>();

  headerKeys.forEach((hk) => {
    const clean = normalizeKey(hk);
    const mapped = CANONICAL_MAP[clean];
    if (mapped) {
      mappedFieldKeys.add(mapped);
    }
  });

  // Check if file satisfies either the new 30-mandatory-column standard OR legacy format
  const isLegacyFormat =
    mappedFieldKeys.has('registerNumber') &&
    mappedFieldKeys.has('name') &&
    mappedFieldKeys.has('collegeEmail') &&
    mappedFieldKeys.has('departmentCode') &&
    mappedFieldKeys.has('courseCode') &&
    (mappedFieldKeys.has('year') || mappedFieldKeys.has('currentSemester')) &&
    mappedFieldKeys.has('sectionName');

  const requiredCanonicalFields: { field: string; label: string }[] = [
    { field: 'registerNumber', label: 'Register No' },
    { field: 'name', label: 'Student Name' },
    { field: 'collegeEmail', label: 'College Email' },
    { field: 'departmentCode', label: 'Department' },
    { field: 'phone', label: 'Mobile Number' },
    { field: 'tenthPercentage', label: '10th Percentage' },
    { field: 'twelfthPercentage', label: '12th Percentage' },
    { field: 'ugCgpa', label: 'UG CGPA' },
  ];

  if (!isLegacyFormat) {
    const missingHeaders: string[] = [];
    requiredCanonicalFields.forEach(({ field, label }) => {
      if (!mappedFieldKeys.has(field)) {
        missingHeaders.push(label);
      }
    });

    if (missingHeaders.length > 0) {
      parseErrors.push({
        row: 1,
        field: missingHeaders.join(', '),
        message: `Missing required column heading(s): ${missingHeaders.join(', ')}. Please use the updated 30-mandatory-column template.`,
      });
      return { rows, parseErrors };
    }
  }

  // 2. Row-by-Row Data Processing & Validation
  rawJson.forEach((rowObj, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const normalized: Record<string, unknown> = {};
    const customColumns: Record<string, unknown> = {};

    Object.entries(rowObj).forEach(([k, v]) => {
      const clean = normalizeKey(k);
      const mapped = CANONICAL_MAP[clean];
      if (mapped) {
        normalized[mapped] = v;
      } else {
        // Retain custom columns without breaking import
        customColumns[k] = v;
      }
    });

    // Mandatory identification fields
    const regNum = String(normalized['registerNumber'] || normalized['rollNo'] || '').trim().toUpperCase();
    const rollNo = normalized['rollNo'] ? String(normalized['rollNo']).trim().toUpperCase() : regNum;
    const name = String(normalized['name'] || '').trim();
    const email = String(normalized['collegeEmail'] || '').trim().toLowerCase();
    const personalEmail = normalized['personalEmail'] ? String(normalized['personalEmail']).trim().toLowerCase() : undefined;
    const gender = normalized['gender'] ? String(normalized['gender']).trim() : undefined;
    const deptCode = String(normalized['departmentCode'] || '').trim().toUpperCase();
    const phone = normalized['phone'] ? String(normalized['phone']).trim() : undefined;
    const whatsappNumber = normalized['whatsappNumber'] ? String(normalized['whatsappNumber']).trim() : phone;

    // Date of Birth
    const rawDob = normalized['dob'];
    const { formatted: dobFormatted } = parseDateOfBirth(rawDob);
    const dob = dobFormatted || (rawDob ? String(rawDob).trim() : undefined);

    // Academic Percentages & CGPA
    const tenthPercentage = parseNum(normalized['tenthPercentage']);
    const twelfthPercentage = parseNum(normalized['twelfthPercentage']);
    const ugCgpa = parseNum(normalized['ugCgpa']);
    let ugPercentage = parseNum(normalized['ugPercentage']);
    if (ugPercentage === undefined && ugCgpa !== undefined && ugCgpa >= 0 && ugCgpa <= 10) {
      ugPercentage = parseFloat((ugCgpa * 9.5).toFixed(2));
    }

    const pgCgpa = parseNum(normalized['pgCgpa']);
    let pgPercentage = parseNum(normalized['pgPercentage']);
    if (pgPercentage === undefined && pgCgpa !== undefined && pgCgpa > 0 && pgCgpa <= 10) {
      pgPercentage = parseFloat((pgCgpa * 9.5).toFixed(2));
    }

    // Additional profile and college credentials
    const schoolName = normalized['schoolName'] ? String(normalized['schoolName']).trim() : undefined;
    const ugCollegeName = normalized['ugCollegeName'] ? String(normalized['ugCollegeName']).trim() : undefined;
    const nativePlace = normalized['nativePlace'] ? String(normalized['nativePlace']).trim() : undefined;
    const languagesKnown = normalized['languagesKnown'] ? String(normalized['languagesKnown']).trim() : undefined;
    const correspondenceAddress = normalized['correspondenceAddress'] ? String(normalized['correspondenceAddress']).trim() : undefined;
    const permanentAddress = normalized['permanentAddress'] ? String(normalized['permanentAddress']).trim() : correspondenceAddress;

    const graduationYear = parseNum(normalized['graduationYear']);
    const rawSemester = parseNum(normalized['currentSemester']);
    const currentSemester = rawSemester !== undefined ? Math.max(1, Math.min(10, rawSemester)) : 1;

    // Derive year of study (1 to 5) from current semester or explicit year
    const rawYear = parseNum(normalized['year']);
    const parsedYear = rawYear !== undefined ? Math.max(1, Math.min(5, rawYear)) : Math.max(1, Math.min(5, Math.ceil(currentSemester / 2)));

    // Status & Placement Willingness
    const arrearStatusRaw = normalized['arrearStatus'] ? String(normalized['arrearStatus']).trim() : undefined;
    const activeBacklogs = parseArrearCount(arrearStatusRaw ?? normalized['activeBacklogs']);
    const studentStatus = normalized['studentStatus'] ? String(normalized['studentStatus']).trim().toUpperCase() : 'ACTIVE';
    const placementWillingness = normalized['placementWillingness'] ? String(normalized['placementWillingness']).trim().toUpperCase() : 'YES';

    const specialization = normalized['specialization'] ? String(normalized['specialization']).trim() : undefined;
    const ugDegree = normalized['ugDegree'] ? String(normalized['ugDegree']).trim() : undefined;
    const courseCode = normalized['courseCode'] ? String(normalized['courseCode']).trim().toUpperCase() : ugDegree?.toUpperCase();
    const sectionName = normalized['sectionName'] ? String(normalized['sectionName']).trim().toUpperCase() : 'A';

    // OPTIONAL COLUMNS (Skills & Internship Experience) - Never required!
    const skillsRaw = normalized['skills'] !== undefined && normalized['skills'] !== null ? String(normalized['skills']).trim() : '';
    const skillsList = skillsRaw
      ? skillsRaw
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const internshipExperience =
      normalized['internshipExperience'] !== undefined && normalized['internshipExperience'] !== null
        ? String(normalized['internshipExperience']).trim()
        : undefined;

    const sNo = parseNum(normalized['sNo']) ?? index + 1;

    // Mandatory Column Row-Level Validation
    const missing: string[] = [];
    if (!regNum) missing.push('Register No');
    if (!name) missing.push('Student Name');
    if (!email) missing.push('College Email');
    if (!deptCode) missing.push('Department');

    if (missing.length > 0) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum || undefined,
        field: missing.join(', '),
        message: `Missing mandatory value(s): ${missing.join(', ')}`,
      });
      return;
    }

    let hasRowError = false;

    // Email format validation
    if (!email.includes('@') || !email.includes('.')) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'College Email',
        message: `Invalid college email format: "${email}"`,
      });
      hasRowError = true;
    }

    if (personalEmail && (!personalEmail.includes('@') || !personalEmail.includes('.'))) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'Personal Email',
        message: `Invalid personal email format: "${personalEmail}"`,
      });
      hasRowError = true;
    }

    // Percentage validations
    if (tenthPercentage !== undefined && (tenthPercentage < 0 || tenthPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '10th Percentage',
        message: '10th Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    if (twelfthPercentage !== undefined && (twelfthPercentage < 0 || twelfthPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '12th Percentage',
        message: '12th Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    // UG CGPA validation
    if (ugCgpa !== undefined && (ugCgpa < 0 || ugCgpa > 10)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'UG CGPA',
        message: 'UG CGPA must be between 0.00 and 10.00',
      });
      hasRowError = true;
    }

    if (ugPercentage !== undefined && (ugPercentage < 0 || ugPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'UG Percentage',
        message: 'UG Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    // PG CGPA validation (optional for UG students)
    if (pgCgpa !== undefined && pgCgpa > 0 && (pgCgpa < 0 || pgCgpa > 10)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'PG CGPA',
        message: 'PG CGPA must be between 0.00 and 10.00',
      });
      hasRowError = true;
    }

    if (hasRowError) {
      return;
    }

    rows.push({
      rowNumber,
      sNo,
      rollNo: rollNo || regNum,
      registerNumber: regNum,
      name,
      gender,
      department: deptCode,
      departmentCode: deptCode,
      dob,
      tenthPercentage,
      twelfthPercentage,
      ugCgpa,
      ugPercentage,
      pgCgpa: pgCgpa && pgCgpa > 0 ? pgCgpa : undefined,
      pgPercentage: pgPercentage && pgPercentage > 0 ? pgPercentage : undefined,
      phone,
      whatsappNumber,
      collegeEmail: email,
      personalEmail,
      schoolName,
      ugCollegeName,
      nativePlace,
      languagesKnown,
      correspondenceAddress,
      permanentAddress,
      graduationYear,
      currentSemester,
      arrearStatus: arrearStatusRaw || (activeBacklogs === 0 ? 'NO ARREARS' : `${activeBacklogs} Arrear(s)`),
      studentStatus,
      placementWillingness,
      specialization,
      ugDegree,
      skills: skillsRaw || undefined,
      skillsList,
      internshipExperience: internshipExperience || undefined,
      customColumns,

      // Legacy compatibility mappings
      courseCode: courseCode || deptCode,
      year: parsedYear,
      sectionName: sectionName || 'A',
      cgpa: ugCgpa,
      degreeLevel: ugDegree?.toLowerCase().includes('m.') || ugDegree?.toLowerCase().includes('master') ? 'PG' : 'UG',
      activeBacklogs,
      historyOfBacklogs: activeBacklogs,
      ugBranch: specialization,
      ugStatus: studentStatus === 'COMPLETED' ? 'COMPLETED' : 'STUDYING',
    });
  });

  return { rows, parseErrors };
};

/**
 * Generates CSV error report
 */
export const generateErrorReportCsv = (errors: ExcelImportRowError[]): string => {
  const header = 'Row,RegisterNumber,Field,Error Description\n';
  const lines = errors.map((e) => {
    const reg = e.registerNumber ? `"${e.registerNumber.replace(/"/g, '""')}"` : '""';
    const fld = e.field ? `"${e.field.replace(/"/g, '""')}"` : '""';
    const msg = `"${e.message.replace(/"/g, '""')}"`;
    return `${e.row},${reg},${fld},${msg}`;
  });
  return header + lines.join('\n');
};

/**
 * Generates official Excel template with 30 mandatory columns first,
 * followed by 2 optional columns clearly identified, plus guidance sheet.
 */
export const generateTemplateExcelBuffer = (): Buffer => {
  // 30 Mandatory Columns + 2 Optional Columns (32 columns total)
  const sampleData = [
    {
      'S.No': 1,
      'Roll No': '23IT001',
      'Register No': '2026IT101',
      'Student Name': 'Aarav Sharma',
      Gender: 'Male',
      Department: 'BSCIT',
      'Date of Birth': '15-08-2003',
      '10th Percentage': 88.5,
      '12th Percentage': 85.0,
      'UG CGPA': 8.45,
      'UG Percentage': 80.28,
      'PG CGPA': 0.0,
      'PG Percentage': 0.0,
      'Mobile Number': '9876543210',
      'WhatsApp Number': '9876543210',
      'College Email': 'aarav.sharma@samplecollege.edu',
      'Personal Email': 'aarav.personal@gmail.com',
      'School Name': 'St. Joseph Higher Secondary School',
      'UG College Name': 'Sample College of Arts and Science',
      'Native Place': 'Chennai',
      'Languages Known': 'English, Tamil, Hindi',
      'Correspondence Address': '123 Anna Salai, Chennai, Tamil Nadu - 600002',
      'Permanent Address': '123 Anna Salai, Chennai, Tamil Nadu - 600002',
      'Graduation Year': 2026,
      'Current Semester': 6,
      'Arrear Status': 'NO ARREARS',
      'Student Status': 'ACTIVE',
      'Placement Willingness': 'YES',
      Specialization: 'Information Technology',
      'UG Degree': 'B.Sc IT',
      'Skills (Optional)': 'Python, JavaScript, React, SQL',
      'Internship Experience (Optional)': '3 months Web Development Intern at Tech Solutions',
    },
    {
      'S.No': 2,
      'Roll No': '23CO045',
      'Register No': '2026CO145',
      'Student Name': 'Divya Patel',
      Gender: 'Female',
      Department: 'BCOM',
      'Date of Birth': '22-11-2003',
      '10th Percentage': 92.4,
      '12th Percentage': 90.5,
      'UG CGPA': 8.9,
      'UG Percentage': 84.55,
      'PG CGPA': 0.0,
      'PG Percentage': 0.0,
      'Mobile Number': '9876543211',
      'WhatsApp Number': '9876543211',
      'College Email': 'divya.patel@samplecollege.edu',
      'Personal Email': 'divya.patel@gmail.com',
      'School Name': 'Kendriya Vidyalaya',
      'UG College Name': 'Sample College of Arts and Science',
      'Native Place': 'Coimbatore',
      'Languages Known': 'English, Tamil',
      'Correspondence Address': '45 Gandhipuram, Coimbatore, Tamil Nadu - 641012',
      'Permanent Address': '45 Gandhipuram, Coimbatore, Tamil Nadu - 641012',
      'Graduation Year': 2026,
      'Current Semester': 6,
      'Arrear Status': 'NO ARREARS',
      'Student Status': 'ACTIVE',
      'Placement Willingness': 'YES',
      Specialization: 'Finance & Accounting',
      'UG Degree': 'B.Com',
      'Skills (Optional)': 'Advanced Excel, Tally, Financial Modeling',
      'Internship Experience (Optional)': '2 months Accounting Intern at CA Associates',
    },
    {
      'S.No': 3,
      'Roll No': '24MB012',
      'Register No': '2026MB112',
      'Student Name': 'Karthik Raja',
      Gender: 'Male',
      Department: 'MBA',
      'Date of Birth': '10-04-2001',
      '10th Percentage': 85.0,
      '12th Percentage': 82.5,
      'UG CGPA': 8.1,
      'UG Percentage': 76.95,
      'PG CGPA': 8.6,
      'PG Percentage': 81.7,
      'Mobile Number': '9876543212',
      'WhatsApp Number': '9876543212',
      'College Email': 'karthik.raja@samplecollege.edu',
      'Personal Email': 'karthik.raja@gmail.com',
      'School Name': 'Government Higher Secondary School',
      'UG College Name': 'Sample College of Arts and Science',
      'Native Place': 'Madurai',
      'Languages Known': 'English, Tamil',
      'Correspondence Address': '78 West Tower Street, Madurai, Tamil Nadu - 625001',
      'Permanent Address': '78 West Tower Street, Madurai, Tamil Nadu - 625001',
      'Graduation Year': 2026,
      'Current Semester': 4,
      'Arrear Status': 'NO ARREARS',
      'Student Status': 'ACTIVE',
      'Placement Willingness': 'YES',
      Specialization: 'Marketing & Analytics',
      'UG Degree': 'BBA',
      'Skills (Optional)': 'Tableau, Python, Market Research',
      'Internship Experience (Optional)': '6 months Marketing Intern at Retail Brands',
    },
    {
      'S.No': 4,
      'Roll No': '23CS089',
      'Register No': '2026CS189',
      'Student Name': 'Ananya Thomas',
      Gender: 'Female',
      Department: 'BSCAIDS',
      'Date of Birth': '05-09-2004',
      '10th Percentage': 91.2,
      '12th Percentage': 89.0,
      'UG CGPA': 8.7,
      'UG Percentage': 82.65,
      'PG CGPA': 0.0,
      'PG Percentage': 0.0,
      'Mobile Number': '9876543213',
      'WhatsApp Number': '9876543213',
      'College Email': 'ananya.thomas@samplecollege.edu',
      'Personal Email': 'ananya.thomas@gmail.com',
      'School Name': "St. Mary's Convent",
      'UG College Name': 'Sample College of Arts and Science',
      'Native Place': 'Kochi',
      'Languages Known': 'English, Malayalam, Tamil',
      'Correspondence Address': '12 Lake View Road, Kochi, Kerala - 682001',
      'Permanent Address': '12 Lake View Road, Kochi, Kerala - 682001',
      'Graduation Year': 2026,
      'Current Semester': 6,
      'Arrear Status': 'NO ARREARS',
      'Student Status': 'ACTIVE',
      'Placement Willingness': 'YES',
      Specialization: 'Artificial Intelligence & Data Science',
      'UG Degree': 'B.Sc AI & DS',
      'Skills (Optional)': '',
      'Internship Experience (Optional)': '',
    },
  ];

  const guideData = [
    {
      Category: 'MANDATORY (30 Columns)',
      Columns:
        'S.No, Roll No, Register No, Student Name, Gender, Department, Date of Birth, 10th Percentage, 12th Percentage, UG CGPA, UG Percentage, PG CGPA, PG Percentage, Mobile Number, WhatsApp Number, College Email, Personal Email, School Name, UG College Name, Native Place, Languages Known, Correspondence Address, Permanent Address, Graduation Year, Current Semester, Arrear Status, Student Status, Placement Willingness, Specialization, UG Degree',
      Rules:
        'All 30 mandatory columns are required in Row 1. Data must be provided for each student record. PG CGPA/Percentage can be 0.0 for UG students.',
    },
    {
      Category: 'OPTIONAL (2 Columns)',
      Columns: 'Skills (Optional), Internship Experience (Optional)',
      Rules:
        'Optional columns can be left empty/blank or removed entirely from the sheet without failing the import.',
    },
    {
      Category: 'CUSTOM COLUMNS',
      Columns: 'Any additional columns (e.g. Father Name, Blood Group, Aadhar)',
      Rules: 'Additional custom columns are permitted at the end of the sheet and will not break the import.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);

  // Set friendly column widths for all 32 template columns
  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Roll No
    { wch: 16 }, // Register No
    { wch: 20 }, // Student Name
    { wch: 10 }, // Gender
    { wch: 14 }, // Department
    { wch: 14 }, // Date of Birth
    { wch: 16 }, // 10th Percentage
    { wch: 16 }, // 12th Percentage
    { wch: 12 }, // UG CGPA
    { wch: 16 }, // UG Percentage
    { wch: 12 }, // PG CGPA
    { wch: 16 }, // PG Percentage
    { wch: 16 }, // Mobile Number
    { wch: 18 }, // WhatsApp Number
    { wch: 30 }, // College Email
    { wch: 28 }, // Personal Email
    { wch: 32 }, // School Name
    { wch: 32 }, // UG College Name
    { wch: 16 }, // Native Place
    { wch: 22 }, // Languages Known
    { wch: 42 }, // Correspondence Address
    { wch: 42 }, // Permanent Address
    { wch: 16 }, // Graduation Year
    { wch: 16 }, // Current Semester
    { wch: 16 }, // Arrear Status
    { wch: 14 }, // Student Status
    { wch: 22 }, // Placement Willingness
    { wch: 30 }, // Specialization
    { wch: 16 }, // UG Degree
    { wch: 32 }, // Skills (Optional)
    { wch: 45 }, // Internship Experience (Optional)
  ];

  const wsGuide = XLSX.utils.json_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 26 }, { wch: 80 }, { wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Student_Template');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Template_Guide');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
