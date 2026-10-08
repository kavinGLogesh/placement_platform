import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let secondStudentToken: string;
let testStudentId: string;
let secondStudentId: string;

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

  // Login Super Admin
  const saRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  assert.equal(saRes.status, 200);
  const saJson = await saRes.json();
  superAdminToken = saJson.data.accessToken;

  // Login Placement Admin
  const paRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.equal(paRes.status, 200);
  const paJson = await paRes.json();
  placementAdminToken = paJson.data.accessToken;

  // Login Student 1
  const stRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  assert.equal(stRes.status, 200);
  const stJson = await stRes.json();
  studentToken = stJson.data.accessToken;
  testStudentId = stJson.data.user.student?.id || 'stu-001';

  // Login Student 2 (Priya / 2026CS102)
  const st2Res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@placement.edu', password: 'Student@123' }),
  });
  assert.equal(st2Res.status, 200);
  const st2Json = await st2Res.json();
  secondStudentToken = st2Json.data.accessToken;
  secondStudentId = st2Json.data.user.student?.id || 'stu-002';
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 10: Structured GD + Interview Evaluation Suite', () => {
  let createdGdRoundId: string;
  let gdParticipantId1: string;
  let gdParticipantId2: string;
  let createdInterviewRoundId: string;
  let interviewParticipantId: string;

  // ===========================================================================
  // 1. GD ROUND CREATION & CONFIGURABLE CRITERIA
  // ===========================================================================
  it('1. Placement Admin can create GD round with customizable criteria and students', async () => {
    const res = await fetch(`${baseUrl}/gd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Mock GD Round 1 - AI in Workplace',
        topic: 'Impact of Generative AI on Modern Software Engineering Roles',
        instructions: 'Speak clearly and respect team members.',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 45,
        criteria: [
          { name: 'Communication', maxMarks: 10, order: 1 },
          { name: 'Confidence', maxMarks: 10, order: 2 },
          { name: 'Subject Knowledge', maxMarks: 15, order: 3 }, // Configurable max marks
          { name: 'Teamwork', maxMarks: 15, order: 4 },
        ],
        studentIds: [testStudentId],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.id);
    assert.equal(body.data.title, 'Mock GD Round 1 - AI in Workplace');
    assert.equal(body.data.criteria.length, 4);
    assert.equal(body.data.criteria[2].maxMarks, 15);
    createdGdRoundId = body.data.id;
  });

  it('2. Placement Admin can dynamically assign additional students to GD round', async () => {
    const res = await fetch(`${baseUrl}/gd/${createdGdRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: [secondStudentId],
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verify round participants
    const roundRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const roundBody = await roundRes.json();
    assert.equal(roundBody.data.participants.length, 2);

    const p1 = roundBody.data.participants.find((p: any) => p.studentId === testStudentId);
    const p2 = roundBody.data.participants.find((p: any) => p.studentId === secondStudentId);
    assert.ok(p1);
    assert.ok(p2);
    gdParticipantId1 = p1.id;
    gdParticipantId2 = p2.id;
  });

  // ===========================================================================
  // 2. ATTENDANCE RECORDING
  // ===========================================================================
  it('3. Placement Admin can record individual and batch attendance for GD round', async () => {
    // Individual attendance update
    const indRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/participants/${gdParticipantId1}/attendance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ attendance: 'PRESENT' }),
    });
    assert.equal(indRes.status, 200);

    // Batch attendance update
    const batchRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/attendance/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        records: [
          { participantId: gdParticipantId1, attendance: 'PRESENT' },
          { participantId: gdParticipantId2, attendance: 'PRESENT' },
        ],
      }),
    });
    assert.equal(batchRes.status, 200);
  });

  // ===========================================================================
  // 3. BACKEND AUTHORITATIVE GD SCORING & TAMPER PROTECTION
  // ===========================================================================
  it('4. Backend calculates Total Score and Percentage (source of truth; rejects missing/invalid criteria)', async () => {
    const roundRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const roundData = (await roundRes.json()).data;
    const crit = roundData.criteria;

    // A. Missing required criteria should be rejected with HTTP 400
    const invalidRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: gdParticipantId1,
        criterionScores: [
          { criterionId: crit[0].id, score: 8 },
          // Missing remaining criteria
        ],
      }),
    });
    assert.equal(invalidRes.status, 400);

    // B. Exceeding criterion maxMarks should be rejected with HTTP 400
    const overScoreRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: gdParticipantId1,
        criterionScores: [
          { criterionId: crit[0].id, score: 999 }, // Max is 10
          { criterionId: crit[1].id, score: 8 },
          { criterionId: crit[2].id, score: 10 },
          { criterionId: crit[3].id, score: 10 },
        ],
      }),
    });
    assert.equal(overScoreRes.status, 400);

    // C. Valid evaluation submission
    // Criteria:
    // 0: max 10 -> score 8
    // 1: max 10 -> score 9
    // 2: max 15 -> score 12
    // 3: max 15 -> score 13
    // Total marks = 50. Total scored = 42. Percentage = (42 / 50) * 100 = 84%
    const validRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: gdParticipantId1,
        feedback: 'Excellent analytical articulation and respectful turn-taking.',
        criterionScores: [
          { criterionId: crit[0].id, score: 8, comment: 'Clear articulation' },
          { criterionId: crit[1].id, score: 9, comment: 'Calm and steady' },
          { criterionId: crit[2].id, score: 12, comment: 'Great depth of knowledge' },
          { criterionId: crit[3].id, score: 13, comment: 'Encouraged peers to participate' },
        ],
        // Even if client attempts to pass a fake totalScore or percentage, backend overrides it!
        totalScore: 10,
        percentage: 20,
      }),
    });

    assert.equal(validRes.status, 201);
    const body = await validRes.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalScore, 42);
    assert.equal(body.data.maxPossibleMarks, 50);
    assert.equal(body.data.percentage, 84);
    assert.equal(body.data.comparison.displayText, 'No previous evaluation available.');
  });

  // ===========================================================================
  // 4. INTERVIEW EVALUATION: TYPES, CONFIGURABLE CRITERIA & SCORING
  // ===========================================================================
  it('5. Placement Admin can create Interview Round (TECHNICAL) with configurable criteria', async () => {
    const res = await fetch(`${baseUrl}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Tier-1 Core Technical Interview',
        interviewType: 'TECHNICAL',
        instructions: 'Assess data structures, algorithm design and clean code practices.',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 45,
        criteria: [
          { name: 'Technical Knowledge', maxMarks: 10, order: 1 },
          { name: 'Problem Solving', maxMarks: 10, order: 2 },
          { name: 'Communication Skills', maxMarks: 10, order: 3 },
          { name: 'Professional Behaviour', maxMarks: 10, order: 4 },
        ],
        studentIds: [testStudentId],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.interviewType, 'TECHNICAL');
    assert.equal(body.data.criteria.length, 4);
    createdInterviewRoundId = body.data.id;
    interviewParticipantId = body.data.participants[0].id;
  });

  it('6. Placement Admin can record Interview Evaluation with strengths, areas for improvement, and overall feedback', async () => {
    const roundRes = await fetch(`${baseUrl}/interviews/${createdInterviewRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const roundData = (await roundRes.json()).data;
    const crit = roundData.criteria;

    // Technical Knowledge: 8/10
    // Problem Solving: 9/10
    // Communication Skills: 8/10
    // Professional Behaviour: 9/10
    // Total: 34 / 40 = 85.0%
    const res = await fetch(`${baseUrl}/interviews/${createdInterviewRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: interviewParticipantId,
        strengths: 'Strong grasp of binary tree traversals and dynamic programming fundamentals.',
        areasForImprovement: 'Could optimize space complexity from O(N) to O(1) in pointer problems.',
        overallFeedback: 'Highly recommended for Tier-1 engineering drive.',
        criterionScores: [
          { criterionId: crit[0].id, score: 8, comment: 'Good explanation of hash maps' },
          { criterionId: crit[1].id, score: 9, comment: 'Solved graph problem cleanly' },
          { criterionId: crit[2].id, score: 8, comment: 'Clear thought progression' },
          { criterionId: crit[3].id, score: 9, comment: 'Punctual and courteous' },
        ],
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.totalScore, 34);
    assert.equal(body.data.maxPossibleMarks, 40);
    assert.equal(body.data.percentage, 85);
    assert.equal(body.data.strengths, 'Strong grasp of binary tree traversals and dynamic programming fundamentals.');
    assert.equal(body.data.comparison.displayText, 'No previous evaluation available.');
  });

  // ===========================================================================
  // 5. REPEATED EVALUATION & IMPROVEMENT COMPARISON (68 -> 76 = +8 points)
  // ===========================================================================
  it('7. Repeated evaluation demonstrates Previous -> Current -> Improvement calculation', async () => {
    // Create Round 2 of GD
    const round2Res = await fetch(`${baseUrl}/gd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: 'Mock GD Round 2 - Green Energy',
        topic: 'Renewable Energy Transition in Emerging Markets',
        scheduledDate: new Date(Date.now() + 172800000).toISOString(),
        criteria: [
          { name: 'Communication', maxMarks: 10, order: 1 },
          { name: 'Confidence', maxMarks: 10, order: 2 },
          { name: 'Subject Knowledge', maxMarks: 10, order: 3 },
          { name: 'Teamwork', maxMarks: 10, order: 4 },
        ],
        studentIds: [testStudentId],
      }),
    });
    assert.equal(round2Res.status, 201);
    const round2Body = await round2Res.json();
    const round2Id = round2Body.data.id;
    const p2Id = round2Body.data.participants[0].id;
    const crit2 = round2Body.data.criteria;

    // Previous GD was 84%.
    // Evaluate Round 2 with 36 / 40 = 90.0%.
    // Expected improvement: 84 -> 90 = +6 points
    const eval2Res = await fetch(`${baseUrl}/gd/${round2Id}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: p2Id,
        feedback: 'Substantial improvement in subject leadership.',
        criterionScores: [
          { criterionId: crit2[0].id, score: 9 },
          { criterionId: crit2[1].id, score: 9 },
          { criterionId: crit2[2].id, score: 9 },
          { criterionId: crit2[3].id, score: 9 },
        ],
      }),
    });

    assert.equal(eval2Res.status, 201);
    const eval2Body = await eval2Res.json();
    assert.equal(eval2Body.data.percentage, 90);
    assert.equal(eval2Body.data.comparison.previousScore, 84);
    assert.equal(eval2Body.data.comparison.currentScore, 90);
    assert.equal(eval2Body.data.comparison.improvement, 6);
    assert.equal(eval2Body.data.comparison.displayText, '84 → 90 = +6 points');
  });

  // ===========================================================================
  // 6. STUDENT PORTAL ACCESS & STRICT OWNERSHIP (IDOR PROTECTION)
  // ===========================================================================
  it('8. Student can view only own GD rounds, interview rounds and human evaluation summary', async () => {
    // Student 1 view own GD rounds
    const gdRes = await fetch(`${baseUrl}/student/evaluations/gd`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(gdRes.status, 200);
    const gdBody = await gdRes.json();
    assert.ok(Array.isArray(gdBody.data));
    assert.equal(gdBody.data.length, 2);
    // Student sees score, criteria, feedback, and progression
    assert.equal(gdBody.data[0].evaluation.percentage, 84);
    assert.equal(gdBody.data[1].evaluation.percentage, 90);

    // Student 1 view own Interview rounds
    const intRes = await fetch(`${baseUrl}/student/evaluations/interviews`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(intRes.status, 200);
    const intBody = await intRes.json();
    assert.equal(intBody.data.length, 1);
    assert.equal(intBody.data[0].evaluation.percentage, 85);
    assert.equal(intBody.data[0].evaluation.strengths, 'Strong grasp of binary tree traversals and dynamic programming fundamentals.');

    // Student 1 view combined human evaluation summary
    const sumRes = await fetch(`${baseUrl}/student/evaluations/summary`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(sumRes.status, 200);
    const sumBody = await sumRes.json();
    assert.equal(sumBody.data.gd.totalEvaluated, 2);
    assert.equal(sumBody.data.gd.averagePercentage, 87);
    assert.equal(sumBody.data.interview.totalEvaluated, 1);
    assert.equal(sumBody.data.interview.averagePercentage, 85);
  });

  it('9. Security & RBAC: Student cannot access admin endpoints, create rounds or modify marks (HTTP 403)', async () => {
    // Student attempts to create GD round -> 403 Forbidden
    const createRes = await fetch(`${baseUrl}/gd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        title: 'Hacked Round',
        topic: 'Hacked Topic',
        scheduledDate: new Date().toISOString(),
      }),
    });
    assert.equal(createRes.status, 403);

    // Student attempts to evaluate -> 403 Forbidden
    const evalRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        participantId: gdParticipantId2,
        criterionScores: [],
      }),
    });
    assert.equal(evalRes.status, 403);

    // Student attempts to alter attendance -> 403 Forbidden
    const attRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/participants/${gdParticipantId2}/attendance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ attendance: 'ABSENT' }),
    });
    assert.equal(attRes.status, 403);

    // IDOR protection: second student only sees their own assigned evaluations, not student 1's evaluations
    const secondStudentSummary = await fetch(`${baseUrl}/student/evaluations/summary`, {
      headers: { Authorization: `Bearer ${secondStudentToken}` },
    });
    assert.equal(secondStudentSummary.status, 200);
    const summaryData = (await secondStudentSummary.json()).data;
    // Second student has 0 completed evaluations so far
    assert.equal(summaryData.gd.totalEvaluated, 0);
  });

  // ===========================================================================
  // 7. SUPER ADMIN VIEW-ONLY PERMISSION & ACCESS
  // ===========================================================================
  it('10. Super Admin can VIEW GD and Interview rounds and reports, but cannot evaluate or modify', async () => {
    // Super Admin view GD rounds -> 200 OK
    const viewGdRes = await fetch(`${baseUrl}/gd`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(viewGdRes.status, 200);

    // Super Admin view Interview rounds -> 200 OK
    const viewIntRes = await fetch(`${baseUrl}/interviews`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(viewIntRes.status, 200);

    // Super Admin attempt to evaluate GD -> 403 Forbidden (view-only governance)
    const superEvalRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        participantId: gdParticipantId2,
        criterionScores: [],
      }),
    });
    assert.equal(superEvalRes.status, 403);
  });

  // ===========================================================================
  // 8. STUDENT PERFORMANCE & REPORTS INTEGRATION
  // ===========================================================================
  it('11. Student Performance endpoint (/api/student/performance) integrates human evaluations alongside online assessments', async () => {
    const perfRes = await fetch(`${baseUrl}/student/performance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(perfRes.status, 200);
    const body = await perfRes.json();
    assert.equal(body.success, true);
    // Human evaluation summary is present separately from online assessments
    assert.ok(body.data.humanEvaluation);
    assert.equal(body.data.humanEvaluation.gd.totalEvaluated, 2);
    assert.equal(body.data.humanEvaluation.gd.averagePercentage, 87);
    assert.equal(body.data.humanEvaluation.interview.totalEvaluated, 1);
    assert.equal(body.data.humanEvaluation.interview.averagePercentage, 85);
  });

  it('12. Reports module (/api/reports/gd, /api/reports/interviews, and exports) supports GD and Interview reports', async () => {
    // GD Report
    const gdRepRes = await fetch(`${baseUrl}/reports/gd`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(gdRepRes.status, 200);
    const gdRepBody = await gdRepRes.json();
    assert.equal(gdRepBody.success, true);
    assert.ok(gdRepBody.data.rows.length >= 1);

    // Interview Report
    const intRepRes = await fetch(`${baseUrl}/reports/interviews`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(intRepRes.status, 200);
    const intRepBody = await intRepRes.json();
    assert.equal(intRepBody.success, true);
    assert.ok(intRepBody.data.rows.length >= 1);

    // Export GD Report as CSV
    const exportCsvRes = await fetch(`${baseUrl}/reports/gd/export?format=csv`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(exportCsvRes.status, 200);
    assert.ok(exportCsvRes.headers.get('content-type')?.includes('text/csv'));

    // Export Interview Report as XLSX
    const exportXlsxRes = await fetch(`${baseUrl}/reports/interviews/export?format=xlsx`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(exportXlsxRes.status, 200);
    assert.ok(
      exportXlsxRes.headers.get('content-type')?.includes('spreadsheetml') ||
      exportXlsxRes.headers.get('content-type')?.includes('application/octet-stream')
    );
  });
});
