import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as XLSX from 'xlsx';
import { createApp } from '../src/app.js';
import { parseStudentExcel } from '../src/utils/excel.util.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;

let collegeId: string;
let departmentId: string;
let courseId: string;
let classId: string;

before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}/api`;
      }
      resolve();
    });
  });

  // Authenticate as Super Admin
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminBody = await adminLoginRes.json();
  superAdminToken = adminBody.data.accessToken;

  // Query or create institutional hierarchy
  const deptsRes = await fetch(`${baseUrl}/departments`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const deptsData = await deptsRes.json();

  if (deptsData.data && deptsData.data.length > 0) {
    departmentId = deptsData.data[0].id;
    collegeId = deptsData.data[0].collegeId;
  } else {
    // Create college & department
    const colRes = await fetch(`${baseUrl}/colleges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ code: `COL-${Date.now()}`, name: 'Direct Acad Test College' }),
    });
    const colData = await colRes.json();
    collegeId = colData.data.id;

    const deptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ collegeId, code: `CSE-${Date.now()}`, name: 'Computer Science' }),
    });
    const deptData = await deptRes.json();
    departmentId = deptData.data.id;
  }

  // Course
  const coursesRes = await fetch(`${baseUrl}/courses`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const coursesData = await coursesRes.json();
  if (coursesData.data && coursesData.data.length > 0) {
    courseId = coursesData.data[0].id;
  } else {
    const courseRes = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ departmentId, code: `BTECH-${Date.now()}`, name: 'B.Tech CS', durationYears: 4 }),
    });
    const courseData = await courseRes.json();
    courseId = courseData.data.id;
  }

  // Class
  const classesRes = await fetch(`${baseUrl}/classes`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  const classesData = await classesRes.json();
  if (classesData.data && classesData.data.length > 0) {
    classId = classesData.data[0].id;
  } else {
    const classRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({ courseId, name: '2022-2026 Batch', batchYear: 2022, currentYear: 4 }),
    });
    const classData = await classRes.json();
    classId = classData.data.id;
  }
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Direct Academic Marks & Percentages Entry Test Suite', () => {
  it('1. Successfully creates a student with 10th, 12th, UG, and PG academic credentials directly without marksheets', async () => {
    const timestamp = Date.now();
    const payload = {
      registerNumber: `REG-ACAD-${timestamp}`,
      name: 'Aditya Raman',
      collegeEmail: `aditya.acad.${timestamp}@placement.edu`,
      personalEmail: `aditya.acad.${timestamp}@gmail.com`,
      phone: '9876543210',
      dob: '2002-05-15',
      departmentId,
      courseId,
      classId,
      year: 4,
      status: 'ACTIVE',

      // 10th Standard direct marks
      tenthBoard: 'CBSE',
      tenthPassingYear: 2018,
      tenthTotalMarks: 500,
      tenthObtainedMarks: 465,
      tenthPercentage: 93.0,

      // 12th Standard direct marks
      twelfthBoard: 'State Board',
      twelfthPassingYear: 2020,
      twelfthTotalMarks: 600,
      twelfthObtainedMarks: 552,
      twelfthPercentage: 92.0,

      // UG direct credentials
      ugDegree: 'B.Tech',
      ugBranch: 'Computer Science',
      ugStatus: 'COMPLETED',
      ugCgpa: 8.85,
      ugPercentage: 84.5,

      // PG direct credentials (student completed PG)
      pgDegree: 'M.Tech',
      pgStatus: 'STUDYING',
      pgCgpa: 9.1,
      pgPercentage: 87.2,
    };

    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201 Created but got ${res.status}: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.id);

    const studentId = data.data.id;

    // Fetch the created student's academic record
    const acadRes = await fetch(`${baseUrl}/students/${studentId}/academic-records`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const acadData = await acadRes.json();
    assert.strictEqual(acadRes.status, 200);
    assert.strictEqual(acadData.success, true);

    const record = acadData.data;
    // Verify 10th Standard
    assert.strictEqual(record.tenthTotalMarks, 500);
    assert.strictEqual(record.tenthObtainedMarks, 465);
    assert.strictEqual(record.tenthPercentage, 93.0);
    assert.strictEqual(record.hasTenthMarksheet, false, 'Marksheet should not be mandatory');

    // Verify 12th Standard
    assert.strictEqual(record.twelfthTotalMarks, 600);
    assert.strictEqual(record.twelfthObtainedMarks, 552);
    assert.strictEqual(record.twelfthPercentage, 92.0);
    assert.strictEqual(record.hasTwelfthMarksheet, false, 'Marksheet should not be mandatory');

    // Verify UG
    assert.strictEqual(record.ugDegree, 'B.Tech');
    assert.strictEqual(record.ugStatus, 'COMPLETED');
    assert.strictEqual(record.ugCgpa, 8.85);
    assert.strictEqual(record.ugPercentage, 84.5);

    // Verify PG
    assert.strictEqual(record.pgDegree, 'M.Tech');
    assert.strictEqual(record.pgStatus, 'STUDYING');
    assert.strictEqual(record.pgCgpa, 9.1);
    assert.strictEqual(record.pgPercentage, 87.2);
  });

  it('2. PG fields are strictly optional: student without PG succeeds without validation error', async () => {
    const timestamp = Date.now();
    const payload = {
      registerNumber: `REG-NOPG-${timestamp}`,
      name: 'Sneha Patel',
      collegeEmail: `sneha.nopg.${timestamp}@placement.edu`,
      departmentId,
      courseId,
      classId,
      year: 3,
      status: 'ACTIVE',

      // 10th Standard
      tenthTotalMarks: 500,
      tenthObtainedMarks: 440,
      tenthPercentage: 88.0,

      // 12th Standard
      twelfthTotalMarks: 500,
      twelfthObtainedMarks: 430,
      twelfthPercentage: 86.0,

      // UG
      ugDegree: 'B.E.',
      ugStatus: 'STUDYING',
      ugCgpa: 8.2,
      ugPercentage: 78.5,

      // PG completely omitted
    };

    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, `Failed to create student without PG: ${JSON.stringify(data)}`);
    assert.strictEqual(data.success, true);

    const studentId = data.data.id;
    const acadRes = await fetch(`${baseUrl}/students/${studentId}/academic-records`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const acadData = await acadRes.json();
    const record = acadData.data;

    // PG fields should cleanly be null
    assert.strictEqual(record.pgDegree, null);
    assert.strictEqual(record.pgStatus, null);
    assert.strictEqual(record.pgCgpa, null);
    assert.strictEqual(record.pgPercentage, null);
  });

  it('3. Rejects invalid 10th marks when obtained marks exceeds total marks', async () => {
    const timestamp = Date.now();
    const payload = {
      registerNumber: `REG-INV-${timestamp}`,
      name: 'Invalid Marks Student',
      collegeEmail: `inv.marks.${timestamp}@placement.edu`,
      departmentId,
      courseId,
      classId,
      year: 2,
      status: 'ACTIVE',

      tenthTotalMarks: 500,
      tenthObtainedMarks: 550, // Invalid: > total marks
      tenthPercentage: 90.0, // valid percentage so marks validation triggers
      ugDegree: 'B.Tech',
      ugStatus: 'STUDYING',
      ugCgpa: 8.0,
    };

    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.message, /10th Marks Obtained cannot exceed Total Marks/i);
  });

  it('4. Rejects invalid percentage greater than 100 or CGPA greater than 10', async () => {
    const timestamp = Date.now();
    const payload = {
      registerNumber: `REG-INVPCT-${timestamp}`,
      name: 'Invalid Pct Student',
      collegeEmail: `inv.pct.${timestamp}@placement.edu`,
      departmentId,
      courseId,
      classId,
      year: 2,
      status: 'ACTIVE',

      tenthTotalMarks: 500,
      tenthObtainedMarks: 400,
      tenthPercentage: 105.0, // Invalid: > 100
      ugDegree: 'B.Tech',
      ugStatus: 'STUDYING',
      ugCgpa: 11.5, // Invalid: > 10
    };

    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
  });

  it('5. Downloadable Excel template includes all 10th, 12th, UG, and PG academic columns', async () => {
    const res = await fetch(`${baseUrl}/students/import/template`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);

    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];

    const headers = rows[0];
    const expectedHeaders = [
      'Register Number',
      'Name',
      'College Email',
      '10th Marks Obtained',
      '10th Total Marks',
      '10th Percentage',
      '12th Marks Obtained',
      '12th Total Marks',
      '12th Percentage',
      'UG Degree',
      'UG Status',
      'UG CGPA',
      'UG Percentage',
      'PG Degree',
      'PG Status',
      'PG CGPA',
      'PG Percentage',
    ];

    for (const expected of expectedHeaders) {
      assert.ok(
        headers.some((h) => h && h.trim().toLowerCase() === expected.toLowerCase()),
        `Template Excel is missing expected header: "${expected}"`
      );
    }
  });

  it('6. Excel parser validates direct academic marks and flags row-level errors', async () => {
    // Generate an Excel sheet with 1 valid row and 1 invalid row
    const invalidRowData = [
      {
        'Register Number': 'REG-EXCEL-001',
        Name: 'Valid Student',
        'College Email': 'valid.excel@placement.edu',
        Department: 'CSE',
        Course: 'BTECH',
        Year: 4,
        Section: 'A',
        '10th Marks Obtained': 450,
        '10th Total Marks': 500,
        '10th Percentage': 90,
        '12th Marks Obtained': 540,
        '12th Total Marks': 600,
        '12th Percentage': 90,
        'UG Degree': 'B.Tech',
        'UG Status': 'COMPLETED',
        'UG CGPA': 8.5,
        'UG Percentage': 81.0,
      },
      {
        'Register Number': 'REG-EXCEL-002',
        Name: 'Invalid Student',
        'College Email': 'invalid.excel@placement.edu',
        Department: 'CSE',
        Course: 'BTECH',
        Year: 4,
        Section: 'A',
        '10th Marks Obtained': 600, // Invalid: > total marks (500)
        '10th Total Marks': 500,
        '10th Percentage': 120, // Invalid: > 100
        'UG CGPA': 12.0, // Invalid: > 10
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(invalidRowData);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parseResult = await parseStudentExcel(buf);
    assert.strictEqual(parseResult.rows.length, 1, 'Should have exactly 1 valid row');
    assert.ok(parseResult.parseErrors.length >= 1, 'Should have recorded parse errors');

    const errRow2 = parseResult.parseErrors.filter((e) => e.row === 3);
    assert.ok(errRow2.length >= 1, 'Should have errors for row 3 (second data row)');
    assert.ok(errRow2.some((e) => e.message.includes('cannot exceed Total Marks')));
    assert.ok(errRow2.some((e) => e.message.includes('10th Percentage must be between 0.00 and 100.00')));
    assert.ok(errRow2.some((e) => e.message.includes('UG CGPA must be between 0.00 and 10.00')));
  });
});
