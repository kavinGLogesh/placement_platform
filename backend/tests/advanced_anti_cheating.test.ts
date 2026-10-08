
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

import { generateAccessToken } from '../src/utils/jwt.util.js';
import { Role } from '../src/types/auth.types.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;
let otherStudentToken: string;

let testAssessmentId: string;
let testAttemptId: string;

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

  // 3. Student 2 token (stu-002) for IDOR check
  otherStudentToken = generateAccessToken({
    sub: 'stu-002',
    email: 'student2@placement.edu',
    role: Role.STUDENT,
  });

  // 4. Create Question for Assessment
  const qRes = await fetch(`${baseUrl}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Percentage',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionText: 'What is 10% of 200?',
      marks: 5,
      negativeMarks: 0,
      options: [
        { optionText: '20', optionOrder: 1, isCorrect: true },
        { optionText: '25', optionOrder: 2, isCorrect: false },
      ],
    }),
  });
  const qData = await qRes.json();
  assert.ok(qData.data.id);

  // 5. Create Assessment
  const asmtRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Anti-Cheating Verification Assessment',
      duration: 30,
      passingPercentage: 50,
      negativeMarking: false,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Section A',
          sectionOrder: 1,
          topics: ['Percentage'],
          questionsCount: 1,
          marksPerQuestion: 5,
        },
      ],
    }),
  });
  const asmtData = await asmtRes.json();
  testAssessmentId = asmtData.data.id;

  // 6. Generate Papers & Publish
  const genRes = await fetch(`${baseUrl}/assessments/${testAssessmentId}/generate-papers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const genData = await genRes.json();
  assert.ok(genData.data.papers.length > 0);

  await fetch(`${baseUrl}/assessments/${testAssessmentId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Assign to Student 1
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      studentIds: ['stu-001'],
    }),
  });

  // 7. Student 1 starts assessment attempt
  const startRes = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const startData = await startRes.json();
  testAttemptId = startData.data.id;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 10: Advanced Anti-Cheating Controls', () => {
  it('1. Records a TAB_SWITCH violation via Page Visibility API (HTTP 201)', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'TAB_SWITCH',
        details: 'Candidate switched away from assessment browser tab',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'TAB_SWITCH');
    assert.equal(body.data.violationCount, 1);
    assert.ok(body.data.violation.timestamp);
  });

  it('2. Records a WINDOW_BLUR violation when browser window loses focus (HTTP 201)', async () => {
    // Small delay to bypass identical-timestamp dedup
    await new Promise((r) => setTimeout(r, 1100));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'WINDOW_BLUR',
        details: 'Browser window lost focus / candidate navigated to another window',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'WINDOW_BLUR');
    assert.equal(body.data.violationCount, 2);
  });

  it('3. Records a FULLSCREEN_EXIT violation when student leaves fullscreen mode (HTTP 201)', async () => {
    await new Promise((r) => setTimeout(r, 1100));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'FULLSCREEN_EXIT',
        details: 'Candidate exited fullscreen mode',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'FULLSCREEN_EXIT');
    assert.equal(body.data.violationCount, 3);
  });

  it('4. Records a SCREENSHOT_ATTEMPT violation upon PrintScreen / Ctrl+P keypress (HTTP 201)', async () => {
    await new Promise((r) => setTimeout(r, 1100));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'SCREENSHOT_ATTEMPT',
        details: 'PrintScreen key pressed during assessment',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'SCREENSHOT_ATTEMPT');
    assert.equal(body.data.violationCount, 4);
  });

  it('5. Deduplicates rapid duplicate event spam within cooldown without inflating count', async () => {
    // Send immediate duplicate of SCREENSHOT_ATTEMPT without delay
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'SCREENSHOT_ATTEMPT',
        details: 'Duplicate rapid keypress event',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    // Count remains 4 because duplicate was suppressed
    assert.equal(body.data.violationCount, 4);
  });

  it('6. Authenticated student can retrieve their violation history via GET /violations', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.length, 4);
    assert.deepEqual(
      body.data.map((v: any) => v.violationType),
      ['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'SCREENSHOT_ATTEMPT']
    );
  });

  it('7. IDOR Protection: Another student cannot record violations for another student attempt (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherStudentToken}`, // Priya trying to modify Logeshwaran's attempt
      },
      body: JSON.stringify({
        violationType: 'TAB_SWITCH',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /do not own this attempt/i);
  });

  it('8. Unauthenticated violation request returns HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ violationType: 'TAB_SWITCH' }),
    });

    assert.equal(res.status, 401);
  });

  it('9. Invalid violation type is rejected with HTTP 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'INVALID_TYPE',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /violationType must be one of/i);
  });

  it('10. Admin Results list returns violationCount and violation details for placement admins', async () => {
    // Submit the attempt
    await fetch(`${baseUrl}/student/attempts/${testAttemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    // Fetch results as admin
    const res = await fetch(`${baseUrl}/results?assessmentId=${testAssessmentId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.items.length > 0);

    const candidateResult = body.data.items.find((item: any) => item.attemptId === testAttemptId);
    assert.ok(candidateResult, 'Candidate result should exist in results list');
    assert.equal(candidateResult.violationCount, 4);
    assert.equal(candidateResult.violations.length, 4);
  });
});
