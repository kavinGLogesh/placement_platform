import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { analyticsRepository } from '../src/repositories/analytics.repository.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;

let testAssessmentId: string;
let testAttemptId: string;
let warnOnlyAttemptId: string;
let disabledAttemptId: string;

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

  // 3. Create question
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
      questionText: 'Select true statement regarding AI Proctoring',
      marks: 5,
      negativeMarks: 0,
      options: [
        { optionText: 'Mobile phones are detected locally on webcam', optionOrder: 1, isCorrect: true },
        { optionText: 'Phones are allowed', optionOrder: 2, isCorrect: false },
      ],
    }),
  });
  const qData = await qRes.json();
  const questionId = qData.data.id;
  assert.ok(questionId);

  // Helper to setup test assessment
  const setupAssessment = async (name: string, enableMobile: boolean, maxV: number, termAction: 'AUTO_SUBMIT' | 'WARN_ONLY') => {
    // 1. Create a dedicated unique question for this assessment to satisfy rotation rules
    const uniqueQRes = await fetch(`${baseUrl}/questions`, {
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
        questionText: `Unique question for ${name} [${Math.random()}]`,
        marks: 5,
        negativeMarks: 0,
        options: [
          { optionText: 'Option A', optionOrder: 1, isCorrect: true },
          { optionText: 'Option B', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    const uniqueQData = await uniqueQRes.json();
    assert.ok(uniqueQData.data?.id, 'Unique question should be created');

    const asmtRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name,
        duration: 30,
        passingPercentage: 50,
        enableMobileDetection: enableMobile,
        maxViolations: maxV,
        terminationAction: termAction,
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
    const asmtId = asmtData.data.id;

    // Generate papers, publish, and assign to stu-001
    await fetch(`${baseUrl}/assessments/${asmtId}/generate-papers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${baseUrl}/assessments/${asmtId}/publish`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${baseUrl}/assessments/${asmtId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        assessmentId: asmtId,
        studentIds: ['stu-001'],
      }),
    });

    // Start attempt
    const startRes = await fetch(`${baseUrl}/student/assessments/${asmtId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const startData = await startRes.json();
    return { asmtId, attemptId: startData.data.id };
  };

  // Setup Standard 3-Warning Auto-Submit Assessment
  const standard = await setupAssessment('Standard Phone Detection Assessment', true, 3, 'AUTO_SUBMIT');
  testAssessmentId = standard.asmtId;
  testAttemptId = standard.attemptId;

  // Setup Warn-Only Assessment
  const warnOnly = await setupAssessment('Warn Only Phone Detection Assessment', true, 2, 'WARN_ONLY');
  warnOnlyAttemptId = warnOnly.attemptId;

  // Setup Mobile Detection Disabled Assessment
  const disabled = await setupAssessment('Mobile Detection Disabled Assessment', false, 3, 'AUTO_SUBMIT');
  disabledAttemptId = disabled.attemptId;
});

after(() => {
  if (server) {
    server.close();
  }
});

describe('AI Mobile Phone Detection & Exam Proctoring Tests', () => {
  it('1. Assessment settings correctly persist enableMobileDetection, maxViolations, and terminationAction', async () => {
    const res = await fetch(`${baseUrl}/assessments/${testAssessmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.enableMobileDetection, true);
    assert.equal(body.data.maxViolations, 3);
    assert.equal(body.data.terminationAction, 'AUTO_SUBMIT');
  });

  it('2. Student attempt includes proctoring configuration fields on attempt.assessment', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.assessment.enableMobileDetection, true);
    assert.equal(body.data.assessment.maxViolations, 3);
    assert.equal(body.data.assessment.terminationAction, 'AUTO_SUBMIT');
  });

  it('3. Warning 1 of 3: Successfully records MOBILE_PHONE_DETECTED violation without terminating', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Suspected mobile phone visible in webcam frame (confidence: 88%)',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'MOBILE_PHONE_DETECTED');
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('4. Duplicate Suppression: Immediate repeat MOBILE_PHONE_DETECTED within 2500ms cooldown is deduplicated', async () => {
    // Send immediate repeat
    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Immediate duplicate event during hold',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    // Strike count should NOT increment (remains 1)
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.isTerminated, false);
  });

  it('5. Warning 2 of 3: Records second confirmed MOBILE_PHONE_DETECTED after cooldown window', async () => {
    // Wait for cooldown window to elapse
    await new Promise((resolve) => setTimeout(resolve, 2600));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Suspected mobile phone visible in webcam frame (confidence: 91%) [Repeat]',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violation.violationType, 'MOBILE_PHONE_DETECTED');
    assert.equal(body.data.violationCount, 2);
    assert.equal(body.data.isTerminated, false);
  });

  it('6. Warning 3 of 3: Third confirmed violation triggers AUTO_SUBMIT termination policy', async () => {
    // Wait for cooldown window to elapse
    await new Promise((resolve) => setTimeout(resolve, 2600));

    const res = await fetch(`${baseUrl}/student/attempts/${testAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Suspected mobile phone visible in webcam frame [3RD CONFIRMED WARNING]',
        clientTimestamp: new Date().toISOString(),
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.violationCount, 3);
    assert.equal(body.data.isTerminated, true);
    assert.match(body.data.terminationReason, /Maximum security violations reached/i);

    // Verify attempt is now SUBMITTED in repository
    const getRes = await fetch(`${baseUrl}/student/attempts/${testAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getData = await getRes.json();
    assert.equal(getData.data.status, 'SUBMITTED');
  });

  it('7. Policy WARN_ONLY: Reaching max warnings logs violation but does NOT terminate attempt', async () => {
    // First violation on warn-only attempt
    const res1 = await fetch(`${baseUrl}/student/attempts/${warnOnlyAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Warning 1 on warn-only assessment',
      }),
    });
    const body1 = await res1.json();
    assert.equal(body1.data.violationCount, 1);
    assert.equal(body1.data.isTerminated, false);

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 2800));

    // Second violation (maxViolations = 2 reached on this assessment)
    const res2 = await fetch(`${baseUrl}/student/attempts/${warnOnlyAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Warning 2 on warn-only assessment (limit reached)',
      }),
    });
    const body2 = await res2.json();
    assert.equal(body2.data.violationCount, 2);
    // Crucial check: Because terminationAction is WARN_ONLY, isTerminated remains false!
    assert.equal(body2.data.isTerminated, false);

    // Attempt should remain IN_PROGRESS
    const getRes = await fetch(`${baseUrl}/student/attempts/${warnOnlyAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getData = await getRes.json();
    assert.equal(getData.data.status, 'IN_PROGRESS');
  });

  it('8. Disabled Mobile Detection: Assessment with enableMobileDetection=false ignores phone violations', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${disabledAttemptId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        violationType: 'MOBILE_PHONE_DETECTED',
        details: 'Phone reported when detection is disabled',
      }),
    });

    const body = await res.json();
    assert.equal(body.success, true);
    // Strike count should NOT increment (remains 0)
    assert.equal(body.data.violationCount, 0);
    assert.equal(body.data.isTerminated, false);
  });

  it('9. Admin Analytics & Malpractice History: Maps MOBILE_PHONE_DETECTED to Suspected Mobile Phone in Camera View', () => {
    const formatted = (analyticsRepository as any).formatMalpracticeEvents([
      {
        id: 'viol-test-1',
        attemptId: testAttemptId,
        studentId: 'stu-001',
        violationType: 'MOBILE_PHONE_DETECTED',
        timestamp: new Date().toISOString(),
        details: 'Suspected mobile phone visible in webcam frame (confidence: 88%)',
        assessmentName: 'Standard Phone Detection Assessment',
      },
    ]);

    assert.equal(formatted.length, 1);
    assert.equal(formatted[0].violationType, 'MOBILE_PHONE_DETECTED');
    assert.equal(formatted[0].displayType, 'Suspected Mobile Phone Detected in Camera View');
    assert.equal(formatted[0].severity, 'HIGH');
  });
});
