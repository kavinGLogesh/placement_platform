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
}

/**
 * Normalizes column header strings (e.g. "Register Number" -> "registernumber")
 */
const normalizeKey = (key: string): string => {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
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

    const rawCgpa = normalized['cgpa'];
    let parsedCgpa: number | undefined = undefined;
    if (rawCgpa !== '' && rawCgpa !== undefined && rawCgpa !== null) {
      const num = Number(rawCgpa);
      if (!isNaN(num)) {
        parsedCgpa = num;
      }
    }

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
      cgpa: parsedCgpa,
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
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};
