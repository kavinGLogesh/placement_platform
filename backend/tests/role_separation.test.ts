import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let studentId: string;

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

  // 1. Super Admin Token (Governance & Monitoring)
  const superAdminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  assert.strictEqual(superAdminRes.status, 200, 'Super admin login must succeed');
  const superAdminJson = await superAdminRes.json();
  superAdminToken = superAdminJson.data.accessToken;

  // 2. Placement Admin Token (Operational Assessment Management)
  const placementAdminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.strictEqual(placementAdminRes.status, 200, 'Placement admin login must succeed');
  const placementAdminJson = await placementAdminRes.json();
  placementAdminToken = placementAdminJson.data.accessToken;

  // 3. Student Token
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  assert.strictEqual(studentRes.status, 200, 'Student login must succeed');
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;
  studentId = studentJson.data.user.student?.id || 'stu-001';
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('RBAC Role Separation — SUPER_ADMIN (Governance & Monitoring Role)', () => {
  it('SUPER_ADMIN is blocked (HTTP 403 Forbidden) from Question Bank listing', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Forbidden'));
  });

  it('SUPER_ADMIN is blocked (HTTP 403 Forbidden) from Question Categories dictionary', async () => {
    const res = await fetch(`${baseUrl}/questions/categories`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Forbidden'));
  });

  it('SUPER_ADMIN is blocked (HTTP 403 Forbidden) from creating Questions', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        questionType: 'SINGLE_CHOICE',
        questionText: 'Unauthorized question attempt by Super Admin',
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  it('SUPER_ADMIN is blocked (HTTP 403 Forbidden) from Assessment Builder listing', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Forbidden'));
  });

  it('SUPER_ADMIN is blocked (HTTP 403 Forbidden) from creating Assessments', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized assessment attempt by Super Admin',
        duration: 60,
      }),
    });
    assert.strictEqual(res.status, 403);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Institutional Dashboard & Analytics Overview', async () => {
    const res = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.totalStudents !== undefined);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Department Benchmarking Analytics', async () => {
    const res = await fetch(`${baseUrl}/analytics/departments`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Topic & Skill Analytics', async () => {
    const res = await fetch(`${baseUrl}/analytics/topics`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Placement Funnel', async () => {
    const res = await fetch(`${baseUrl}/analytics/funnel`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Institutional Assessment Results', async () => {
    const res = await fetch(`${baseUrl}/results`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Student Reports & Governance Data', async () => {
    const res = await fetch(`${baseUrl}/reports/students`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Academic Hierarchy (Colleges, Departments, Courses, Classes, Sections)', async () => {
    const res = await fetch(`${baseUrl}/colleges`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to Student Profiles & Details', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('SUPER_ADMIN has full access (HTTP 200) to System Health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
  });
});

describe('RBAC Role Separation — PLACEMENT_ADMIN (Operational Management Role)', () => {
  it('PLACEMENT_ADMIN has full operational access (HTTP 200) to Question Bank', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('PLACEMENT_ADMIN has full operational access (HTTP 200) to Question Categories', async () => {
    const res = await fetch(`${baseUrl}/questions/categories`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('PLACEMENT_ADMIN has full operational access (HTTP 200) to Assessment Management', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('PLACEMENT_ADMIN has access (HTTP 200) to Results and Analytics', async () => {
    const res = await fetch(`${baseUrl}/results`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);

    const anaRes = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(anaRes.status, 200);
  });

  it('PLACEMENT_ADMIN has access (HTTP 200) to Reports', async () => {
    const res = await fetch(`${baseUrl}/reports/students`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
  });
});

describe('RBAC Role Separation — STUDENT (Test Candidate Role)', () => {
  it('STUDENT is blocked (HTTP 403) from Question Bank APIs', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT is blocked (HTTP 403) from Assessment Management APIs', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT is blocked (HTTP 403) from Admin Results APIs', async () => {
    const res = await fetch(`${baseUrl}/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT is blocked (HTTP 403) from Analytics APIs', async () => {
    const res = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT is blocked (HTTP 403) from Admin Student Reports APIs', async () => {
    const res = await fetch(`${baseUrl}/reports/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT is blocked (HTTP 403) from Academic Management APIs', async () => {
    const res = await fetch(`${baseUrl}/colleges`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT has access (HTTP 200) to their own student endpoints', async () => {
    const res = await fetch(`${baseUrl}/student/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);

    const rptRes = await fetch(`${baseUrl}/reports/student/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(rptRes.status, 200);
  });

  it('STUDENT has access (HTTP 200) to their own profile via GET /api/student/profile', async () => {
    const res = await fetch(`${baseUrl}/student/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.department, 'Must include department info');
    assert.ok(Array.isArray(body.data.skills), 'Must include skills array');
    assert.ok(Array.isArray(body.data.certifications), 'Must include certifications array');
    assert.ok(body.data.resume, 'Must include resume details');
    assert.ok(Array.isArray(body.data.recommendations), 'Must include placement recommendations');
  });

  it('STUDENT has access (HTTP 200) to their own student record via GET /api/students/:id', async () => {
    const res = await fetch(`${baseUrl}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.id, studentId);
  });

  it('STUDENT is BLOCKED (HTTP 403 Forbidden) from accessing another student record via GET /api/students/:otherId', async () => {
    const res = await fetch(`${baseUrl}/students/stu-002`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /Forbidden.*other student/i);
  });

  it('STUDENT is BLOCKED (HTTP 403 Forbidden) from student directory listing via GET /api/students', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('STUDENT with non-"student" email (priya@placement.edu) logs in as Role.STUDENT and accesses own data', async () => {
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@placement.edu', password: 'Student@123' }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.data.user.role, 'STUDENT', 'User role in token must be STUDENT');
    const priyaToken = loginData.data.accessToken;
    const priyaStudentId = loginData.data.user.student?.id || 'stu-002';

    // Priya can access own profile
    const profileRes = await fetch(`${baseUrl}/student/profile`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert.strictEqual(profileRes.status, 200);

    // Priya can access own record
    const ownRecordRes = await fetch(`${baseUrl}/students/${priyaStudentId}`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert.strictEqual(ownRecordRes.status, 200);

    // Priya cannot access student 1's record
    const idorRes = await fetch(`${baseUrl}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${priyaToken}` },
    });
    assert.strictEqual(idorRes.status, 403);
  });
});

describe('Security & Authentication — Unauthenticated Requests (HTTP 401)', () => {
  it('Unauthenticated request to /student/profile returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/student/profile`);
    assert.strictEqual(res.status, 401);
  });

  it('Unauthenticated request to /student/dashboard returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/student/dashboard`);
    assert.strictEqual(res.status, 401);
  });

  it('Unauthenticated request to /student/results returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/student/results`);
    assert.strictEqual(res.status, 401);
  });

  it('Unauthenticated request to /questions returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/questions`);
    assert.strictEqual(res.status, 401);
  });

  it('Unauthenticated request to /assessments returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/assessments`);
    assert.strictEqual(res.status, 401);
  });

  it('Unauthenticated request to /analytics returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/analytics`);
    assert.strictEqual(res.status, 401);
  });
});

