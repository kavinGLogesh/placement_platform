import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.config.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;

let testAssessmentId: string;
let testAttemptId: string;
let questionId: string;
let correctOptionId: string;

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

  // 1. Placement Admin login
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const adminData = await adminRes.json();
  adminToken = adminData.data.accessToken;

  // 2. Student 1 login (Logeshwaran - stu-001)
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentData = await studentRes.json();
  studentToken = studentData.data.accessToken;

  // 3. Create Question for Assessment
  const qRes = await fetch(`${baseUrl}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      category: 'LOGICAL_REASONING',
      topic: 'Number Series',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionText: 'What comes next in sequence: 2, 4, 8, 16, ?',
      marks: 10,
      negativeMarks: 0,
      options: [
        { optionText: '32', optionOrder: 1, isCorrect: true },
        { optionText: '24', optionOrder: 2, isCorrect: false },
        { optionText: '30', optionOrder: 3, isCorrect: false },
      ],
    }),
  });
  const qData = await qRes.json();
  questionId = qData.data.id;
  assert.ok(questionId);

  // 4. Create Assessment
  const asmtRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Career OS Three-Warning Security Verification',
      duration: 30,
      passingPercentage: 50,
      negativeMarking: false,
      sections: [
        {
          component: 'LOGICAL_REASONING',
          name: 'Security Section',
          sectionOrder: 1,
          topics: ['Number Series'],
          questionsCount: 1,
          marksPerQuestion: 10,
        },
      ],
    }),
  });
  const asmtData = await asmtRes.json();
  testAssessmentId = asmtData.data.id;
  assert.ok(testAssessmentId);

  // Set 3 maximum violations on assessment
  const memAsmt = assessmentRepository.memStore.assessments.get(testAssessmentId);
  if (memAsmt) {
    (memAsmt as any).maxViolations = 3;
  }

  // 5. Generate examination papers
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/generate-papers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // 6. Publish assessment
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // 7. Assign assessment to student
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      studentIds: ['stu-001'],
    }),
  });

  // 8. Student starts assessment attempt
  const startRes = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const startData = await startRes.json();
  testAttemptId = startData.data.id;
  assert.ok(testAttemptId);

  // Load paper question sanitized option id
  const attemptRes = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const attemptData = await attemptRes.json();
  const q0 = attemptData.data.questions[0];
  const correctOpt = q0.options.find((o: any) => o.optionText === '32');
  correctOptionId = correctOpt ? correctOpt.id : q0.options[0].id;
});

describe('Phase 11: Three-Warning Security System & Auto-Termination', () => {
  it('1. Securely saves an initial answer prior to any violations', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId,
        selectedOptionIds: [correctOptionId],
        currentQuestion: 1,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.questionId, questionId);
  });

  it('2. Warning 1 of 3: Records first violation (TAB_SWITCH) without terminating', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'TAB_SWITCH',
        details: 'Candidate navigated away to external tab (Warning 1/3)',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'TAB_SWITCH');
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('3. Deduplication: Immediate duplicate event within 1000ms cooldown is suppressed', async () => {
    // Send immediate duplicate TAB_SWITCH
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'TAB_SWITCH',
        details: 'Rapid duplicate event within cooldown',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    // Count remains 1 because rapid duplicate event was deduplicated
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('4. Refresh Persistence: GET /student/attempts/:id returns persisted violationCount 1', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'IN_PROGRESS');
    assert.equal(body.data.violationCount, 1);
    assert.ok(Array.isArray(body.data.violations));
    assert.equal(body.data.violations.length, 1);
    assert.equal(body.data.violations[0].violationType, 'TAB_SWITCH');
  });

  it('5. Warning 2 of 3: Records second violation (FULLSCREEN_EXIT) without terminating', async () => {
    await new Promise((r) => setTimeout(r, 1100));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'FULLSCREEN_EXIT',
        details: 'Candidate exited full-screen lockdown (Warning 2/3)',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'FULLSCREEN_EXIT');
    assert.equal(body.data.violationCount, 2);
    assert.equal(body.data.isTerminated, false);
  });

  it('6. Refresh Persistence: Refreshing after Warning 2 does not reset count', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'IN_PROGRESS');
    assert.equal(body.data.violationCount, 2);
    assert.equal(body.data.violations.length, 2);
  });

  it('7. Warning 3 of 3: Third confirmed violation (RIGHT_CLICK) immediately auto-terminates attempt', async () => {
    await new Promise((r) => setTimeout(r, 1100));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'RIGHT_CLICK',
        details: 'Right-click context menu intercepted outside editor (Warning 3/3)',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'RIGHT_CLICK');
    assert.equal(body.data.violationCount, 3);
    assert.equal(body.data.isTerminated, true);
    assert.ok(body.data.terminationReason);
    assert.match(body.data.terminationReason, /maximum security violations reached/i);
  });

  it('8. On Termination: Attempt status is SUBMITTED, termination reason is persisted, and answers are scored', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.status, 'SUBMITTED');
    assert.equal(body.data.violationCount, 3);
    assert.ok(body.data.terminationReason);

    // Verify result exists and answers saved prior to termination were scored
    const resultRes = await fetch(`${baseUrl}/student/results`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(resultRes.status, 200);
    const resultBody = await resultRes.json();
    const myResult = resultBody.data.find((r: any) => r.attemptId === testAttemptId);
    assert.ok(myResult, 'Assessment result should exist for terminated attempt');
    assert.equal(myResult.totalMarks, 10);
    assert.equal(myResult.obtainedMarks, 10);
    assert.equal(myResult.isPassed, true);
  });

  it('9. Security Lockdown: Further answer submissions are blocked with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId,
        selectedOptionIds: ['opt-2'],
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /no longer active/i);
  });

  it('10. Security Lockdown: Further violation logs on terminated attempt are rejected with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'CLIPBOARD_PASTE',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /no longer active/i);
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await prisma.$disconnect();
});
