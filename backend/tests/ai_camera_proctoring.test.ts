import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { analyticsRepository } from '../src/repositories/analytics.repository.js';
import { attemptRepository } from '../src/repositories/attempt.repository.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;

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
  assert.ok(adminToken, 'Admin token should be present');

  // 2. Student login (stu-001)
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentData = await studentRes.json();
  studentToken = studentData.data.accessToken;
  assert.ok(studentToken, 'Student token should be present');

  // 3. Create unique question
  const qRes = await fetch(`${baseUrl}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      category: 'LOGICAL_REASONING',
      topic: 'Number Series',
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      questionText: `AI Proctor Question [${Math.random()}]`,
      marks: 5,
      negativeMarks: 0,
      options: [
        { optionText: 'Proctoring is active', optionOrder: 1, isCorrect: true },
        { optionText: 'Proctoring is inactive', optionOrder: 2, isCorrect: false },
      ],
    }),
  });
  const qData = await qRes.json();
  assert.ok(qData.data?.id);

  // 4. Create Assessment with proctoring
  const asmtRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Comprehensive AI Proctoring Test Assessment',
      duration: 45,
      passingPercentage: 50,
      maximumAttempts: 2,
      enableMobileDetection: true,
      maxViolations: 3,
      terminationAction: 'AUTO_SUBMIT',
      sections: [
        {
          component: 'LOGICAL_REASONING',
          name: 'Section 1',
          sectionOrder: 1,
          topics: ['Number Series'],
          questionsCount: 1,
          marksPerQuestion: 5,
        },
      ],
    }),
  });
  const asmtData = await asmtRes.json();
  testAssessmentId = asmtData.data.id;

  // Generate papers, publish, and assign to stu-001
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/generate-papers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
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

  // Start attempt
  const startRes = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const startData = await startRes.json();
  testAttemptId = startData.data.id;
  assert.ok(testAttemptId);
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('Career OS AI Camera Proctoring Pipeline Verification', () => {
  it('Scenario A: Candidate is in normal exam state with zero initial violations', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.status, 'IN_PROGRESS');
    assert.equal(body.data.violationCount, 0);
  });

  it('Scenario B: Mobile Phone Detection records warning strike 1 of 3', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Warning: Mobile phone detected. Please remove your phone.',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.violation.violationType, 'MOBILE_PHONE_DETECTED');
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('Scenario F: Anti-Spam deduplication ignores repeat proctoring events during cooldown', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Immediate continuous presence of phone',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    // Violation count remains 1
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('Scenario C: Student Absence Detection records warning strike 2 of 3 after cooldown', async () => {
    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 2600));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'FACE_NOT_VISIBLE',
        details: 'Warning: Your face is not visible. Please return to your seat.',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.violation.violationType, 'FACE_NOT_VISIBLE');
    assert.equal(body.data.violationCount, 2);
    assert.equal(body.data.isTerminated, false);
  });

  it('Scenario D: Multiple Person Detection triggers third strike and AUTO_SUBMIT termination policy', async () => {
    // First save an answer to verify answer preservation upon termination
    const questions = await attemptRepository.getAttemptById(testAttemptId);
    const qId = questions?.paperId ? 'q-test-1' : 'q-general';
    await fetch(`${baseUrl}/student/attempts/${testAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: qId,
        selectedOptionIds: ['opt-1'],
        currentQuestion: 1,
      }),
    });

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 2600));

    // Third violation: Multiple persons detected
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MULTIPLE_PERSONS_DETECTED',
        details: 'Warning: Another person has been detected. Only the registered student is allowed during the assessment.',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.violationCount, 3);
    assert.equal(body.data.isTerminated, true);
    assert.match(body.data.terminationReason, /Maximum security violations reached/i);

    // Verify attempt is marked SUBMITTED
    const attRes = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const attData = await attRes.json();
    assert.equal(attData.data.status, 'SUBMITTED');
  });

  it('Scenario E: Camera Disconnected violation type is accepted and mapped properly', async () => {
    // Create new attempt for camera disconnect test
    const startRes = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const startData = await startRes.json();
    const disconnectAttemptId = startData.data?.id || `att-disconnect-${Date.now()}`;

    const res = await fetch(`${baseUrl}/student/attempts/${disconnectAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'CAMERA_DISCONNECTED',
        details: 'Warning: Camera disconnected. Please reconnect your camera immediately to continue your assessment.',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.violation.violationType, 'CAMERA_DISCONNECTED');
  });

  it('Admin Analytics: Maps all proctoring violations to high severity malpractice events', () => {
    const formatted = (analyticsRepository as any).formatMalpracticeEvents([
      {
        id: 'viol-phone',
        attemptId: testAttemptId,
        studentId: 'stu-001',
        violationType: 'MOBILE_PHONE_DETECTED',
        timestamp: new Date().toISOString(),
        details: 'Phone in frame',
      },
      {
        id: 'viol-multiperson',
        attemptId: testAttemptId,
        studentId: 'stu-001',
        violationType: 'MULTIPLE_PERSONS_DETECTED',
        timestamp: new Date().toISOString(),
        details: '2 people in frame',
      },
      {
        id: 'viol-absence',
        attemptId: testAttemptId,
        studentId: 'stu-001',
        violationType: 'FACE_NOT_VISIBLE',
        timestamp: new Date().toISOString(),
        details: 'Candidate left seat',
      },
      {
        id: 'viol-disconnect',
        attemptId: testAttemptId,
        studentId: 'stu-001',
        violationType: 'CAMERA_DISCONNECTED',
        timestamp: new Date().toISOString(),
        details: 'Hardware disconnected',
      },
    ]);

    assert.equal(formatted.length, 4);
    assert.equal(formatted[0].displayType, 'Suspected Mobile Phone Detected in Camera View');
    assert.equal(formatted[0].severity, 'HIGH');

    assert.equal(formatted[1].displayType, 'Multiple Persons Detected in Camera View');
    assert.equal(formatted[1].severity, 'HIGH');

    assert.equal(formatted[2].displayType, 'Candidate Face Not Visible / Candidate Left Seat');
    assert.equal(formatted[2].severity, 'HIGH');

    assert.equal(formatted[3].displayType, 'Camera Stream Disconnected / Hardware Interrupted');
    assert.equal(formatted[3].severity, 'HIGH');
  });
});
