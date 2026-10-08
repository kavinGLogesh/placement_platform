import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as XLSX from 'xlsx';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let studentToken: string;

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

  // Obtain Super Admin token
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminBody = await adminLoginRes.json();
  superAdminToken = adminBody.data.accessToken;

  // Obtain Student token
  const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentBody = await studentLoginRes.json();
  studentToken = studentBody.data.accessToken;
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 3 — Institutional Hierarchy CRUD & Relationships', () => {
  let createdCollegeId: string;
  let createdDeptId: string;
  let createdCourseId: string;
  let createdClassId: string;

  it('1. College CRUD: Create College and verify duplicate code rejection', async () => {
    const res = await fetch(`${baseUrl}/colleges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_COL',
        name: 'Test Engineering College',
        address: '123 Campus Road',
        website: 'https://testcol.edu',
        contactEmail: 'info@testcol.edu',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.code, 'TEST_COL');
    createdCollegeId = body.data.id;

    // Attempt duplicate college code
    const dupRes = await fetch(`${baseUrl}/colleges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        code: 'TEST_COL',
        name: 'Another College with Same Code',
      }),
    });
    assert.equal(dupRes.status, 409);
  });

  it('2. Department CRUD: Create Department under College', async () => {
    const res = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        collegeId: createdCollegeId,
        code: 'MECH',
        name: 'Mechanical Engineering',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.code, 'MECH');
    createdDeptId = body.data.id;

    // Duplicate department in same college rejected
    const dupRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        collegeId: createdCollegeId,
        code: 'MECH',
        name: 'Duplicate Dept',
      }),
    });
    assert.equal(dupRes.status, 409);

    // Duplicate department name in same college rejected (different code)
    const dupNameRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        collegeId: createdCollegeId,
        code: 'MECH2',
        name: 'Mechanical Engineering',
      }),
    });
    assert.equal(dupNameRes.status, 409);
  });

  it('3. Course CRUD: Create Course under Department', async () => {
    const res = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        departmentId: createdDeptId,
        code: 'BE-MECH',
        name: 'B.E. Mechanical Engineering',
        durationYears: 4,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.code, 'BE-MECH');
    createdCourseId = body.data.id;

    // Duplicate course code in same department rejected
    const dupCourseCodeRes = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        departmentId: createdDeptId,
        code: 'BE-MECH',
        name: 'Different Name',
        durationYears: 4,
      }),
    });
    assert.equal(dupCourseCodeRes.status, 409);

    // Duplicate course name in same department rejected
    const dupCourseNameRes = await fetch(`${baseUrl}/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        departmentId: createdDeptId,
        code: 'MECH-NEW',
        name: 'B.E. Mechanical Engineering',
        durationYears: 4,
      }),
    });
    assert.equal(dupCourseNameRes.status, 409);
  });

  it('4. Class CRUD: Create Class under Course with batch & current year', async () => {
    const res = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        departmentId: createdDeptId,
        courseId: createdCourseId,
        batchYear: 2026,
        currentYear: 3,
        name: 'MECH 2022-2026 - Year 3',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.currentYear, 3);
    createdClassId = body.data.id;
  });

  it('5. Section CRUD: Create Section under Class', async () => {
    const res = await fetch(`${baseUrl}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        classId: createdClassId,
        name: 'A',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'A');
    assert.ok(body.data.id);
  });

  it('6. Relational Integrity: Reject Class with mismatched Department and Course', async () => {
    const res = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        departmentId: 'dept-001', // CSE department
        courseId: createdCourseId, // MECH course
        batchYear: 2027,
        currentYear: 2,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /Relational mismatch/i);
  });

  it('6b. Dependency Protection: Reject deletion of Department or Course with active dependents', async () => {
    // Attempt deleting department with active courses
    const delDeptRes = await fetch(`${baseUrl}/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(delDeptRes.status, 400);
    const deptBody = await delDeptRes.json();
    assert.match(deptBody.message, /Cannot delete department/i);

    // Attempt deleting course with active classes
    const delCourseRes = await fetch(`${baseUrl}/courses/${createdCourseId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(delCourseRes.status, 400);
    const courseBody = await delCourseRes.json();
    assert.match(courseBody.message, /Cannot delete course/i);
  });
});

describe('Phase 3 — Student Management & Server-side Operations', () => {
  it('7. Create Student with valid hierarchy', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: '2026CS999',
        name: 'Suresh Kumar',
        collegeEmail: 'suresh.cs999@placement.edu',
        phone: '9123456780',
        departmentId: 'dept-001',
        courseId: 'crs-001',
        classId: 'cls-001',
        sectionId: 'sec-001',
        year: 3,
        cgpa: 8.45,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.registerNumber, '2026CS999');
    assert.equal(body.data.cgpa, 8.45);
  });

  it('8. Reject Student with duplicate register number', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: '2026CS999', // duplicate
        name: 'Another Student',
        collegeEmail: 'another.unique@placement.edu',
        departmentId: 'dept-001',
        courseId: 'crs-001',
        classId: 'cls-001',
        sectionId: 'sec-001',
        year: 3,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /already exists/i);
  });

  it('9. Reject Student with duplicate college email', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: '2026CS888',
        name: 'Different Student',
        collegeEmail: 'suresh.cs999@placement.edu', // duplicate
        departmentId: 'dept-001',
        courseId: 'crs-001',
        classId: 'cls-001',
        sectionId: 'sec-001',
        year: 3,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.match(body.message, /already exists/i);
  });

  it('10. Server-side Student Search by register number and name', async () => {
    const res = await fetch(`${baseUrl}/students?search=2026CS999`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.pagination.totalCount, 1);
    assert.equal(body.data.data[0].registerNumber, '2026CS999');
  });

  it('11. Server-side Student Filtering by department and year', async () => {
    const res = await fetch(`${baseUrl}/students?departmentId=dept-001&year=3`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.data.length >= 2);
    body.data.data.forEach((s: any) => {
      assert.equal(s.departmentId, 'dept-001');
      assert.equal(s.year, 3);
    });
  });

  it('12. Server-side Student Sorting and Pagination', async () => {
    const res = await fetch(`${baseUrl}/students?page=1&limit=2&sortBy=name&sortOrder=asc`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.pagination.page, 1);
    assert.equal(body.data.pagination.limit, 2);
    assert.equal(body.data.data.length, 2);
    // Verify ascending name order
    assert.ok(body.data.data[0].name <= body.data.data[1].name);
  });
});

describe('Phase 3 — Excel Bulk Import & Error Handling', () => {
  it('13. Bulk Import: Successfully import valid student rows', async () => {
    const validRows = [
      {
        'Register Number': '2026CS701',
        Name: 'Import Candidate 1',
        'College Email': 'cand1.import@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
        CGPA: 8.5,
      },
      {
        'Register Number': '2026CS702',
        Name: 'Import Candidate 2',
        'College Email': 'cand2.import@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'B',
        CGPA: 9.0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(validRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send multipart/form-data
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formData = new FormData();
    formData.append('file', blob, 'students_valid.xlsx');

    const res = await fetch(`${baseUrl}/students/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: formData,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.importedCount, 2);
    assert.equal(body.data.failedCount, 0);
  });

  it('14. Bulk Import: Detect invalid data types, missing fields, and generate errors', async () => {
    const invalidRows = [
      {
        'Register Number': '', // missing
        Name: 'Incomplete Student',
        'College Email': 'incomplete@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
      },
      {
        'Register Number': '2026CS703',
        Name: 'Wrong CGPA Student',
        'College Email': 'wrongcgpa@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
        CGPA: 12.5, // invalid CGPA (> 10)
      },
    ];

    const ws = XLSX.utils.json_to_sheet(invalidRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const blob = new Blob([buffer]);
    const formData = new FormData();
    formData.append('file', blob, 'students_invalid.xlsx');

    const res = await fetch(`${baseUrl}/students/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: formData,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.failedCount, 2);
    assert.ok(body.data.errors.length >= 2);
    assert.equal(body.data.errors[0].row, 2);
  });

  it('15. Bulk Import: Detect intra-file duplicates and database duplicates', async () => {
    const dupRows = [
      {
        'Register Number': '2026CS701', // already exists in DB from test 13
        Name: 'DB Duplicate',
        'College Email': 'unique1@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
      },
      {
        'Register Number': '2026CS710',
        Name: 'File Duplicate 1',
        'College Email': 'same.email@placement.edu',
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
      },
      {
        'Register Number': '2026CS711',
        Name: 'File Duplicate 2 (Same Email)',
        'College Email': 'same.email@placement.edu', // duplicate in same sheet
        Department: 'CSE',
        Course: 'BTECH-CSE',
        Year: 3,
        Section: 'A',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dupRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const blob = new Blob([buffer]);
    const formData = new FormData();
    formData.append('file', blob, 'students_dups.xlsx');

    const res = await fetch(`${baseUrl}/students/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: formData,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.duplicateCount >= 2);
  });

  it('16. Download error report as CSV', async () => {
    const testErrors = [
      { row: 2, registerNumber: '2026CS999', field: 'Register Number', message: 'Already exists' },
      { row: 3, registerNumber: '2026CS888', field: 'CGPA', message: 'Must be between 0 and 10' },
    ];

    const res = await fetch(`${baseUrl}/students/import/error-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({ errors: testErrors }),
    });

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/);
    const text = await res.text();
    assert.match(text, /Row,RegisterNumber,Field,Error Description/);
    assert.match(text, /2026CS999/);
  });
});

describe('Phase 3 — Security, Authorization & Regression', () => {
  it('17. Unauthenticated request to management endpoints returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/students`);
    assert.equal(res.status, 401);
  });

  it('18. Student role attempting management endpoints returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.message, /Forbidden/i);
  });

  it('19. IDOR & Invalid ID Protection: Accessing non-existent entity returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/students/invalid-non-existent-uuid`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(res.status, 404);
  });

  it('20. Phase 1 & Phase 2 Regression: Health check and Auth endpoints remain operational', async () => {
    // Phase 1 Health
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    const healthBody = await healthRes.json();
    assert.equal(healthBody.message, 'API is running');

    // Phase 2 Current User
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.data.user.email, 'superadmin@placement.edu');
  });
});
