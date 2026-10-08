import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { attemptRepository } from '../src/repositories/attempt.repository.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { codingRepository } from '../src/repositories/coding.repository.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;
const studentId = 'stu-001';

const testAssessmentId = 'asmt-p9-test-1';
const testAttemptId = 'att-p9-test-1';
const testResultId = 'res-p9-test-1';

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

  // 1. Admin login
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  adminToken = adminJson.data.accessToken;

  // 2. Student login (stu-001)
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  // 3. Seed Assessment in memory
  assessmentRepository.memStore.assessments.set(testAssessmentId, {
    id: testAssessmentId,
    name: 'Phase 9 Mock Placement Test',
    description: 'Phase 9 Audit Benchmark Assessment',
    duration: 45,
    maximumAttempts: 1,
    negativeMarking: false,
    randomQuestions: false,
    randomOptions: false,
    passingPercentage: 50.0,
    startDate: null,
    endDate: null,
    status: 'PUBLISHED' as any,
    totalMarks: 10.0,
    totalQuestions: 5,
    numberOfPapers: 1,
    createdById: 'admin-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Seed Questions
  questionRepository.memStore.questions.set('q-p9-1', {
    id: 'q-p9-1',
    category: 'QUANTITATIVE_APTITUDE' as any,
    topic: 'Percentage',
    difficulty: 'MEDIUM' as any,
    questionType: 'SINGLE_CHOICE' as any,
    questionText: 'What is 20 percent of 150?',
    marks: 2.0,
    negativeMarks: 0.0,
    correctAnswer: '30',
    explanation: 'Secret Explanation',
    status: 'ACTIVE' as any,
    options: [],
    createdById: 'admin-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 5. Seed Attempt & Result
  attemptRepository.memStore.attempts.set(testAttemptId, {
    id: testAttemptId,
    studentId,
    assessmentId: testAssessmentId,
    paperId: 'paper-p9-1',
    attemptNumber: 1,
    startTime: new Date(Date.now() - 3600000),
    expectedEndTime: new Date(Date.now() - 900000),
    status: 'SUBMITTED' as any,
    currentQuestion: 1,
    submittedAt: new Date(Date.now() - 900000),
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(Date.now() - 900000),
  });

  attemptRepository.memStore.results.set(testResultId, {
    id: testResultId,
    attemptId: testAttemptId,
    assessmentId: testAssessmentId,
    studentId,
    totalMarks: 10.0,
    obtainedMarks: 8.0,
    percentage: 80.0,
    correctCount: 4,
    incorrectCount: 1,
    unansweredCount: 0,
    accuracy: 80.0,
    isPassed: true,
    createdAt: new Date(Date.now() - 900000),
    updatedAt: new Date(Date.now() - 900000),
  });

  // 6. Seed Coding submission
  codingRepository.memStore.submissions.set('sub-p9-1', {
    id: 'sub-p9-1',
    attemptId: testAttemptId,
    questionId: 'q-p9-1',
    studentId,
    language: 'PYTHON' as any,
    sourceCode: 'print("hello")',
    submissionType: 'SUBMIT' as any,
    status: 'ACCEPTED' as any,
    compileError: null,
    runtimeError: null,
    passedTestCount: 5,
    totalTestCount: 5,
    executionTime: 0.08,
    memoryUsed: 12.4,
    judge0Token: null,
    judge0Status: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('Phase 9 — Reports, Export & Printing Module', () => {
  // ===========================================================================
  // 1. ADMIN REPORTS SUITE
  // ===========================================================================
  describe('1. Admin Reports Endpoints', () => {
    it('GET /api/reports/students — should return student performance report with KPIs & rows', async () => {
      const res = await fetch(`${baseUrl}/reports/students`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary, 'Must contain summary');
      assert.ok(Array.isArray(json.data.rows), 'Rows must be an array');
      assert.ok(json.data.pagination, 'Must contain pagination meta');
    });

    it('GET /api/reports/assessments — should return assessment result report with metrics', async () => {
      const res = await fetch(`${baseUrl}/reports/assessments`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary, 'Must contain summary');
      assert.ok(Array.isArray(json.data.rows), 'Rows must be an array');
    });

    it('GET /api/reports/departments — should return department comparative report', async () => {
      const res = await fetch(`${baseUrl}/reports/departments`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary, 'Must contain summary');
      assert.ok(Array.isArray(json.data.rows), 'Rows must be an array');
    });

    it('GET /api/reports/topics — should return topic competency report', async () => {
      const res = await fetch(`${baseUrl}/reports/topics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary, 'Must contain summary');
      assert.ok(Array.isArray(json.data.rows), 'Rows must be an array');
    });

    it('GET /api/reports/questions — should return question analysis without answer key leak', async () => {
      const res = await fetch(`${baseUrl}/reports/questions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary);
      assert.ok(Array.isArray(json.data.rows));

      // Security check: ensure no question row exposes correctAnswer or explanation
      json.data.rows.forEach((row: any) => {
        assert.equal(row.correctAnswer, undefined, 'Must not expose correctAnswer');
        assert.equal(row.explanation, undefined, 'Must not expose explanation');
      });
    });

    it('GET /api/reports/coding — should return coding report without hidden test cases leak', async () => {
      const res = await fetch(`${baseUrl}/reports/coding`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data.summary);
      assert.ok(Array.isArray(json.data.rows));

      // Security check: ensure no hidden test case input/output exposed
      json.data.rows.forEach((row: any) => {
        assert.equal(row.input, undefined, 'Must not expose test case input');
        assert.equal(row.expectedOutput, undefined, 'Must not expose expected output');
      });
    });

    it('GET /api/reports/funnel — should return funnel report with Interview and Selected as 0', async () => {
      const res = await fetch(`${baseUrl}/reports/funnel`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data.stages));

      const interviewStage = json.data.stages.find((s: any) => s.stage === 'Interview');
      const selectedStage = json.data.stages.find((s: any) => s.stage === 'Selected');
      assert.ok(interviewStage);
      assert.equal(interviewStage.count, 0, 'Interview stage count must be 0');
      assert.equal(interviewStage.isImplemented, false, 'Interview stage must have isImplemented: false');
      assert.ok(selectedStage);
      assert.equal(selectedStage.count, 0, 'Selected stage count must be 0');
      assert.equal(selectedStage.isImplemented, false, 'Selected stage must have isImplemented: false');
    });
  });

  // ===========================================================================
  // 2. EXPORT FORMATS SUITE
  // ===========================================================================
  describe('2. Multi-Format Export Capabilities', () => {
    it('GET /api/reports/students/export?format=xlsx — should generate valid Excel spreadsheet buffer', async () => {
      const res = await fetch(`${baseUrl}/reports/students/export?format=xlsx`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      assert.match(res.headers.get('content-disposition') || '', /attachment; filename="students-.*\.xlsx"/);
      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 100, 'Excel buffer must not be empty');
    });

    it('GET /api/reports/students/export?format=csv — should generate valid CSV file buffer', async () => {
      const res = await fetch(`${baseUrl}/reports/students/export?format=csv`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'text/csv; charset=utf-8');
      const text = await res.text();
      assert.ok(text.includes('College Placement Assessment Platform'));
      assert.ok(text.includes('Register No'));
    });

    it('GET /api/reports/students/export?format=pdf — should generate valid PDF document with %PDF- header', async () => {
      const res = await fetch(`${baseUrl}/reports/students/export?format=pdf`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      const buffer = await res.arrayBuffer();
      const header = Buffer.from(buffer.slice(0, 5)).toString('utf-8');
      assert.equal(header, '%PDF-', 'Must contain valid PDF header');
    });

    it('GET /api/reports/students/export?format=html — should generate clean print-friendly HTML', async () => {
      const res = await fetch(`${baseUrl}/reports/students/export?format=html`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'text/html; charset=utf-8');
      const html = await res.text();
      assert.ok(html.includes('<!DOCTYPE html>'));
      assert.ok(html.includes('@media print'));
      assert.ok(html.includes('window.print()'));
    });
  });

  // ===========================================================================
  // 3. STUDENT OWN REPORT SUITE
  // ===========================================================================
  describe('3. Student Own Report Endpoints', () => {
    it('GET /api/reports/student/me — should return candidate own transcript and topic profile', async () => {
      const res = await fetch(`${baseUrl}/reports/student/me`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.student.id, studentId);
      assert.ok(json.data.summary);
      assert.ok(Array.isArray(json.data.assessments));
      assert.ok(Array.isArray(json.data.topicProficiency));
    });

    it('GET /api/reports/student/me/export?format=pdf — should generate student transcript PDF', async () => {
      const res = await fetch(`${baseUrl}/reports/student/me/export?format=pdf`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      const buffer = await res.arrayBuffer();
      const header = Buffer.from(buffer.slice(0, 5)).toString('utf-8');
      assert.equal(header, '%PDF-');
    });

    it('GET /api/reports/student/me/export?format=xlsx — should generate student transcript Excel', async () => {
      const res = await fetch(`${baseUrl}/reports/student/me/export?format=xlsx`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(
        res.headers.get('content-type'),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 100);
    });
  });

  // ===========================================================================
  // 4. SECURITY, RBAC & IDOR PROTECTION SUITE
  // ===========================================================================
  describe('4. Security & RBAC Enforcements', () => {
    it('Student cannot access /api/reports/students — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/students`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403, 'Student must be blocked from admin students report');
    });

    it('Student cannot access /api/reports/assessments — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/assessments`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/departments — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/departments`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/topics — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/topics`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/questions — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/questions`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/coding — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/coding`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/funnel — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/funnel`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Student cannot access /api/reports/students/export — should return 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/reports/students/export?format=xlsx`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('Unauthenticated request — should return 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/reports/students`);
      assert.equal(res.status, 401);
    });
  });
});
