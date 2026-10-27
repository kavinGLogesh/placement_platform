import * as XLSX from 'xlsx';
import { ExcelImportRowError } from '../types/management.types.js';

export interface RawStudentRow {
  rowNumber: number;
  registerNumber: string;
  name: string;
  collegeEmail: string;
  phone?: string;
  departmentCode: string;
  courseCode: string;
  year: number;
  sectionName: string;
  cgpa?: number;

  // 10th Standard Academic Marks
  tenthObtainedMarks?: number;
  tenthTotalMarks?: number;
  tenthPercentage?: number;

  // 12th Standard Academic Marks
  twelfthObtainedMarks?: number;
  twelfthTotalMarks?: number;
  twelfthPercentage?: number;

  // Undergraduate (UG) Credentials
  ugDegree?: string;
  ugStatus?: string;
  ugCgpa?: number;
  ugPercentage?: number;

  // Postgraduate (PG) Credentials (Optional)
  pgDegree?: string;
  pgStatus?: string;
  pgCgpa?: number;
  pgPercentage?: number;
}

/**
 * Normalizes column header strings (e.g. "Register Number" -> "registernumber")
 */
const normalizeKey = (key: string): string => {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
};

const parseNum = (val: unknown): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
};

/**
 * Parses uploaded Excel / CSV buffer into structured rows
 */
export const parseStudentExcel = (buffer: Buffer): { rows: RawStudentRow[]; parseErrors: ExcelImportRowError[] } => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('Excel workbook contains no sheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  const rows: RawStudentRow[] = [];
  const parseErrors: ExcelImportRowError[] = [];

  rawJson.forEach((rowObj, index) => {
    const rowNumber = index + 2; // Row 1 is header
    const normalized: Record<string, unknown> = {};

    Object.entries(rowObj).forEach(([k, v]) => {
      normalized[normalizeKey(k)] = v;
    });

    const regNum = String(
      normalized['registernumber'] || normalized['registerno'] || normalized['regno'] || ''
    ).trim();
    const name = String(normalized['name'] || normalized['studentname'] || '').trim();
    const email = String(
      normalized['collegeemail'] || normalized['email'] || normalized['emailaddress'] || ''
    ).trim();
    const phone = String(normalized['phone'] || normalized['phonenumber'] || normalized['mobile'] || '').trim();
    const deptCode = String(
      normalized['department'] || normalized['departmentcode'] || normalized['dept'] || ''
    ).trim().toUpperCase();
    const courseCode = String(
      normalized['course'] || normalized['coursecode'] || ''
    ).trim().toUpperCase();
    const secName = String(
      normalized['section'] || normalized['sectionname'] || ''
    ).trim().toUpperCase();

    const rawYear = normalized['year'] || normalized['currentyear'];
    const parsedYear = Number(rawYear);

    // Basic CGPA (overall / legacy column)
    const parsedCgpa = parseNum(normalized['cgpa'] || normalized['overallcgpa']);

    // 10th Standard
    const rawTenthTotal = normalized['10thtotalmarks'] || normalized['tenthtotalmarks'] || normalized['10thmaxmarks'];
    const tenthTotal = parseNum(rawTenthTotal);
    const rawTenthObtained = normalized['10thmarksobtained'] || normalized['10thobtainedmarks'] || normalized['tenthabtainedmarks'] || normalized['tenthmarksobtained'] || normalized['10thmarks'];
    const tenthObtained = parseNum(rawTenthObtained);
    const rawTenthPercentage = normalized['10thpercentage'] || normalized['tenthpercentage'] || normalized['10thpercent'];
    const tenthPercentage = parseNum(rawTenthPercentage);

    // 12th Standard
    const rawTwelfthTotal = normalized['12thtotalmarks'] || normalized['twelfthtotalmarks'] || normalized['12thmaxmarks'];
    const twelfthTotal = parseNum(rawTwelfthTotal);
    const rawTwelfthObtained = normalized['12thmarksobtained'] || normalized['12thobtainedmarks'] || normalized['twelfthobtainedmarks'] || normalized['twelfthmarksobtained'] || normalized['12thmarks'];
    const twelfthObtained = parseNum(rawTwelfthObtained);
    const rawTwelfthPercentage = normalized['12thpercentage'] || normalized['twelfthpercentage'] || normalized['12thpercent'];
    const twelfthPercentage = parseNum(rawTwelfthPercentage);

    // UG Credentials
    const rawUgDegree = normalized['ugdegree'] || normalized['undergraduatedegree'] || normalized['degreeprogram'];
    const ugDegree = rawUgDegree ? String(rawUgDegree).trim() : undefined;
    const rawUgStatus = normalized['ugstatus'] || normalized['undergraduatestatus'] || normalized['educationstatus'];
    const ugStatus = rawUgStatus ? String(rawUgStatus).trim().toUpperCase() : undefined;
    const rawUgCgpa = normalized['ugcgpa'] || normalized['undergraduatecgpa'] || normalized['currentcgpa'] || normalized['finalcgpa'];
    const ugCgpa = parseNum(rawUgCgpa);
    const rawUgPercentage = normalized['ugpercentage'] || normalized['undergraduatepercentage'] || normalized['currentpercentage'] || normalized['finalpercentage'];
    const ugPercentage = parseNum(rawUgPercentage);

    // PG Credentials (Optional)
    const rawPgDegree = normalized['pgdegree'] || normalized['postgraduatedegree'];
    const pgDegree = rawPgDegree ? String(rawPgDegree).trim() : undefined;
    const rawPgStatus = normalized['pgstatus'] || normalized['postgraduatestatus'];
    const pgStatus = rawPgStatus ? String(rawPgStatus).trim().toUpperCase() : undefined;
    const rawPgCgpa = normalized['pgcgpa'] || normalized['postgraduatecgpa'];
    const pgCgpa = parseNum(rawPgCgpa);
    const rawPgPercentage = normalized['pgpercentage'] || normalized['postgraduatepercentage'];
    const pgPercentage = parseNum(rawPgPercentage);

    // Required column check
    const missing: string[] = [];
    if (!regNum) missing.push('Register Number');
    if (!name) missing.push('Name');
    if (!email) missing.push('College Email');
    if (!deptCode) missing.push('Department');
    if (!courseCode) missing.push('Course');
    if (!secName) missing.push('Section');
    if (isNaN(parsedYear) || parsedYear <= 0) missing.push('Valid Year (1-5)');

    if (missing.length > 0) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum || undefined,
        field: missing.join(', '),
        message: `Missing or invalid required fields: ${missing.join(', ')}`,
      });
      return;
    }

    // Row-level academic validations
    let hasRowError = false;

    // 10th Validations
    if (rawTenthTotal !== undefined && rawTenthTotal !== '' && (tenthTotal === undefined || tenthTotal <= 0)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '10th Total Marks',
        message: '10th Total Marks must be a number greater than 0',
      });
      hasRowError = true;
    }

    if (rawTenthObtained !== undefined && rawTenthObtained !== '' && (tenthObtained === undefined || tenthObtained < 0)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '10th Marks Obtained',
        message: '10th Marks Obtained must be 0 or greater',
      });
      hasRowError = true;
    }

    if (tenthObtained !== undefined && tenthTotal !== undefined && tenthObtained > tenthTotal) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '10th Marks Obtained',
        message: `10th Marks Obtained (${tenthObtained}) cannot exceed Total Marks (${tenthTotal})`,
      });
      hasRowError = true;
    }

    if (rawTenthPercentage !== undefined && rawTenthPercentage !== '' && (tenthPercentage === undefined || tenthPercentage < 0 || tenthPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '10th Percentage',
        message: '10th Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    // 12th Validations
    if (rawTwelfthTotal !== undefined && rawTwelfthTotal !== '' && (twelfthTotal === undefined || twelfthTotal <= 0)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '12th Total Marks',
        message: '12th Total Marks must be a number greater than 0',
      });
      hasRowError = true;
    }

    if (rawTwelfthObtained !== undefined && rawTwelfthObtained !== '' && (twelfthObtained === undefined || twelfthObtained < 0)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '12th Marks Obtained',
        message: '12th Marks Obtained must be 0 or greater',
      });
      hasRowError = true;
    }

    if (twelfthObtained !== undefined && twelfthTotal !== undefined && twelfthObtained > twelfthTotal) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '12th Marks Obtained',
        message: `12th Marks Obtained (${twelfthObtained}) cannot exceed Total Marks (${twelfthTotal})`,
      });
      hasRowError = true;
    }

    if (rawTwelfthPercentage !== undefined && rawTwelfthPercentage !== '' && (twelfthPercentage === undefined || twelfthPercentage < 0 || twelfthPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: '12th Percentage',
        message: '12th Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    // UG Validations
    if (rawUgCgpa !== undefined && rawUgCgpa !== '' && (ugCgpa === undefined || ugCgpa < 0 || ugCgpa > 10)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'UG CGPA',
        message: 'UG CGPA must be between 0.00 and 10.00',
      });
      hasRowError = true;
    }

    if (rawUgPercentage !== undefined && rawUgPercentage !== '' && (ugPercentage === undefined || ugPercentage < 0 || ugPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'UG Percentage',
        message: 'UG Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    // PG Validations (Optional)
    if (rawPgCgpa !== undefined && rawPgCgpa !== '' && (pgCgpa === undefined || pgCgpa < 0 || pgCgpa > 10)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'PG CGPA',
        message: 'PG CGPA must be between 0.00 and 10.00',
      });
      hasRowError = true;
    }

    if (rawPgPercentage !== undefined && rawPgPercentage !== '' && (pgPercentage === undefined || pgPercentage < 0 || pgPercentage > 100)) {
      parseErrors.push({
        row: rowNumber,
        registerNumber: regNum,
        field: 'PG Percentage',
        message: 'PG Percentage must be between 0.00 and 100.00',
      });
      hasRowError = true;
    }

    if (hasRowError) {
      return;
    }

    rows.push({
      rowNumber,
      registerNumber: regNum,
      name,
      collegeEmail: email,
      phone: phone || undefined,
      departmentCode: deptCode,
      courseCode: courseCode,
      year: parsedYear,
      sectionName: secName,
      cgpa: parsedCgpa ?? ugCgpa,
      tenthObtainedMarks: tenthObtained,
      tenthTotalMarks: tenthTotal,
      tenthPercentage: tenthPercentage,
      twelfthObtainedMarks: twelfthObtained,
      twelfthTotalMarks: twelfthTotal,
      twelfthPercentage: twelfthPercentage,
      ugDegree,
      ugStatus: ugStatus === 'COMPLETED' ? 'COMPLETED' : 'STUDYING',
      ugCgpa,
      ugPercentage,
      pgDegree,
      pgStatus: pgStatus === 'COMPLETED' ? 'COMPLETED' : (pgDegree || pgCgpa || pgPercentage ? 'STUDYING' : undefined),
      pgCgpa,
      pgPercentage,
    });
  });

  return { rows, parseErrors };
};

/**
 * Generates CSV string from row-level error array
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
 * Generates downloadable Excel template buffer for student imports
 */
export const generateTemplateExcelBuffer = (): Buffer => {
  const sampleData = [
    {
      'Register Number': '2026CS101',
      Name: 'Aarav Sharma',
      'College Email': 'aarav.cs26@placement.edu',
      Phone: '9876543210',
      Department: 'CSE',
      Course: 'BTECH-CSE',
      Year: 3,
      Section: 'A',
      CGPA: 8.75,
      '10th Marks Obtained': 465,
      '10th Total Marks': 500,
      '10th Percentage': 93.0,
      '12th Marks Obtained': 558,
      '12th Total Marks': 600,
      '12th Percentage': 93.0,
      'UG Degree': 'B.Tech',
      'UG Status': 'STUDYING',
      'UG CGPA': 8.75,
      'UG Percentage': 87.5,
      'PG Degree': '',
      'PG Status': '',
      'PG CGPA': '',
      'PG Percentage': '',
    },
    {
      'Register Number': '2026CS102',
      Name: 'Divya Patel',
      'College Email': 'divya.cs26@placement.edu',
      Phone: '9876543211',
      Department: 'CSE',
      Course: 'BTECH-CSE',
      Year: 3,
      Section: 'B',
      CGPA: 9.1,
      '10th Marks Obtained': 480,
      '10th Total Marks': 500,
      '10th Percentage': 96.0,
      '12th Marks Obtained': 570,
      '12th Total Marks': 600,
      '12th Percentage': 95.0,
      'UG Degree': 'B.Tech',
      'UG Status': 'STUDYING',
      'UG CGPA': 9.1,
      'UG Percentage': 91.0,
      'PG Degree': '',
      'PG Status': '',
      'PG CGPA': '',
      'PG Percentage': '',
    },
    {
      'Register Number': '2026EC101',
      Name: 'Karthik Raja',
      'College Email': 'karthik.ec26@placement.edu',
      Phone: '9876543212',
      Department: 'ECE',
      Course: 'BE-ECE',
      Year: 3,
      Section: 'A',
      CGPA: 8.4,
      '10th Marks Obtained': 440,
      '10th Total Marks': 500,
      '10th Percentage': 88.0,
      '12th Marks Obtained': 510,
      '12th Total Marks': 600,
      '12th Percentage': 85.0,
      'UG Degree': 'B.E.',
      'UG Status': 'STUDYING',
      'UG CGPA': 8.4,
      'UG Percentage': 84.0,
      'PG Degree': '',
      'PG Status': '',
      'PG CGPA': '',
      'PG Percentage': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
