

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let student1Id: string;
let student2Id: string;

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
  student1Id = stJson.data.user.student?.id || 'stu-001';

  // Login Student 2
  const st2Res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@placement.edu', password: 'Student@123' }),
  });
  assert.equal(st2Res.status, 200);
  const st2Json = await st2Res.json();
  student2Id = st2Json.data.user.student?.id || 'stu-002';
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Bulk GD & Interview Evaluation Test Suite', () => {
  let gdRoundId: string;
  let gdCriteria: Array<{ id: string; name: string; maxMarks: number }>;
  let interviewRoundId: string;
  let interviewCriteria: Array<{ id: string; name: string; maxMarks: number }>;

  // -------------------------------------------------------------------------
  // Setup GD and Interview rounds for testing
  // -------------------------------------------------------------------------
  it('Setup: Create GD round with students', async () => {
    const res = await fetch(`${baseUrl}/gd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: `Bulk Test GD ${Date.now()}`,
        topic: 'AI and Distributed Systems Architecture',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 45,
        criteria: [
          { name: 'Communication', maxMarks: 10, order: 1 },
          { name: 'Technical Depth', maxMarks: 10, order: 2 },
          { name: 'Teamwork', maxMarks: 10, order: 3 },
        ],
        studentIds: [student1Id, student2Id],
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    gdRoundId = json.data.id;
    gdCriteria = json.data.criteria;
    assert.equal(gdCriteria.length, 3);
  });

  it('Setup: Create Interview round with students', async () => {
    const res = await fetch(`${baseUrl}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: `Bulk Test Interview ${Date.now()}`,
        interviewType: 'TECHNICAL',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 30,
        criteria: [
          { name: 'Problem Solving', maxMarks: 10, order: 1 },
          { name: 'System Design', maxMarks: 10, order: 2 },
        ],
        studentIds: [student1Id, student2Id],
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    interviewRoundId = json.data.id;
    interviewCriteria = json.data.criteria;
    assert.equal(interviewCriteria.length, 2);
  });

  // -------------------------------------------------------------------------
  // 1. SAVE DRAFT (GD)
  // -------------------------------------------------------------------------
  it('1. Placement Admin can save GD evaluation as DRAFT with partial scores', async () => {
    const payload = {
      isDraft: true,
      evaluations: [
        {
          studentId: student1Id,
          scores: [
            { criterionId: gdCriteria[0].id, score: 8, comment: 'Good opening statement' },
            // Second and third criteria omitted intentionally to test partial draft
          ],
          feedback: 'Promising candidate, partial draft recorded',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.isDraft, true);
    assert.equal(json.data.totalProcessed, 1);
    assert.equal(json.data.results[0].studentId, student1Id);
    assert.equal(json.data.results[0].totalScore, 8);
    assert.equal(json.data.results[0].status, 'DRAFT');

    // Verify round participants reflects draft
    const roundRes = await fetch(`${baseUrl}/gd/${gdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const roundJson = await roundRes.json();
    const p1 = roundJson.data.participants.find((p: any) => p.studentId === student1Id);
    assert.ok(p1);
    assert.equal(p1.evaluation.status, 'DRAFT');
    assert.equal(p1.evaluation.totalScore, 8);
  });

  // -------------------------------------------------------------------------
  // 2. SUBMIT FINAL EVALUATION (GD)
  // -------------------------------------------------------------------------
  it('2. Placement Admin can bulk submit final evaluations for multiple students', async () => {
    // Both students with all criteria scored
    const payload = {
      isDraft: false,
      evaluations: [
        {
          studentId: student1Id,
          scores: [
            { criterionId: gdCriteria[0].id, score: 9 },
            { criterionId: gdCriteria[1].id, score: 8 },
            { criterionId: gdCriteria[2].id, score: 8 },
          ],
          feedback: 'Excellent communication and teamwork',
        },
        {
          studentId: student2Id,
          scores: [
            { criterionId: gdCriteria[0].id, score: 7 },
            { criterionId: gdCriteria[1].id, score: 9 },
            { criterionId: gdCriteria[2].id, score: 8 },
          ],
          feedback: 'Strong technical understanding',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify(payload),
    });

    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.isDraft, false);
    assert.equal(json.data.totalProcessed, 2);

    // Student 1: 9 + 8 + 8 = 25 out of 30 => 83.33%
    const r1 = json.data.results.find((r: any) => r.studentId === student1Id);
    assert.equal(r1.totalScore, 25);
    assert.equal(r1.maxPossibleMarks, 30);
    assert.equal(r1.percentage, 83.33);
    assert.equal(r1.status, 'EVALUATED');

    // Student 2: 7 + 9 + 8 = 24 out of 30 => 80.00%
    const r2 = json.data.results.find((r: any) => r.studentId === student2Id);
    assert.equal(r2.totalScore, 24);
    assert.equal(r2.maxPossibleMarks, 30);
    assert.equal(r2.percentage, 80);
    assert.equal(r2.status, 'EVALUATED');
  });

  // -------------------------------------------------------------------------
  // 3. BULK INTERVIEW EVALUATION & DRAFT
  // -------------------------------------------------------------------------
  it('3. Placement Admin can save Interview evaluation as DRAFT and SUBMIT final', async () => {
    // 3a. Save draft for student 1
    const draftPayload = {
      isDraft: true,
      evaluations: [
        {
          studentId: student1Id,
          scores: [{ criterionId: interviewCriteria[0].id, score: 7 }],
          strengths: 'Quick thinker',
        },
      ],
    };

    const draftRes = await fetch(`${baseUrl}/interviews/${interviewRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify(draftPayload),
    });

    assert.equal(draftRes.status, 200);
    const draftJson = await draftRes.json();
    assert.equal(draftJson.data.isDraft, true);
    assert.equal(draftJson.data.results[0].status, 'DRAFT');

    // 3b. Final submit for both students
    const submitPayload = {
      isDraft: false,
      evaluations: [
        {
          studentId: student1Id,
          scores: [
            { criterionId: interviewCriteria[0].id, score: 9 },
            { criterionId: interviewCriteria[1].id, score: 8 },
          ],
          strengths: 'Algorithms, Data Structures',
          areasForImprovement: 'System scaling edge cases',
          overallFeedback: 'Strong candidate for Tier-1 role',
        },
        {
          studentId: student2Id,
          scores: [
            { criterionId: interviewCriteria[0].id, score: 10 },
            { criterionId: interviewCriteria[1].id, score: 9 },
          ],
          strengths: 'High level system architecture',
          areasForImprovement: 'Minor syntax checks',
          overallFeedback: 'Exceptional performance',
        },
      ],
    };

    const submitRes = await fetch(`${baseUrl}/interviews/${interviewRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify(submitPayload),
    });

    assert.ok([200, 201].includes(submitRes.status));
    const submitJson = await submitRes.json();
    assert.equal(submitJson.data.isDraft, false);
    assert.equal(submitJson.data.totalProcessed, 2);

    const s1 = submitJson.data.results.find((r: any) => r.studentId === student1Id);
    assert.equal(s1.totalScore, 17);
    assert.equal(s1.maxPossibleMarks, 20);
    assert.equal(s1.percentage, 85);
    assert.equal(s1.status, 'EVALUATED');

    const s2 = submitJson.data.results.find((r: any) => r.studentId === student2Id);
    assert.equal(s2.totalScore, 19);
    assert.equal(s2.maxPossibleMarks, 20);
    assert.equal(s2.percentage, 95);
    assert.equal(s2.status, 'EVALUATED');
  });

  // -------------------------------------------------------------------------
  // 4. VALIDATION: BOUNDS & MISSING CRITERIA
  // -------------------------------------------------------------------------
  it('4. Rejects negative score, score exceeding maxMarks, and missing criteria on submit', async () => {
    // 4a. Negative score
    const negRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: [
              { criterionId: gdCriteria[0].id, score: -2 },
              { criterionId: gdCriteria[1].id, score: 5 },
              { criterionId: gdCriteria[2].id, score: 5 },
            ],
          },
        ],
      }),
    });
    assert.equal(negRes.status, 400);
    const negJson = await negRes.json();
    assert.match(negJson.message, /cannot be negative/i);

    // 4b. Score exceeding maxMarks (max is 10, passing 15)
    const exceedRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: [
              { criterionId: gdCriteria[0].id, score: 15 },
              { criterionId: gdCriteria[1].id, score: 5 },
              { criterionId: gdCriteria[2].id, score: 5 },
            ],
          },
        ],
      }),
    });
    assert.equal(exceedRes.status, 400);
    const exceedJson = await exceedRes.json();
    assert.match(exceedJson.message, /exceed maximum allowed/i);

    // 4c. Missing criteria on final submission (isDraft: false)
    const missingRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: [
              { criterionId: gdCriteria[0].id, score: 8 },
              // criteria 1 and 2 omitted
            ],
          },
        ],
      }),
    });
    assert.equal(missingRes.status, 400);
    const missingJson = await missingRes.json();
    assert.match(missingJson.message, /Missing required score/i);
  });

  // -------------------------------------------------------------------------
  // 5. VALIDATION: DUPLICATE STUDENT IDS IN BULK PAYLOAD
  // -------------------------------------------------------------------------
  it('5. Rejects bulk evaluation request with duplicate student IDs', async () => {
    const dupRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: gdCriteria.map((c) => ({ criterionId: c.id, score: 8 })),
          },
          {
            studentId: student1Id, // Duplicate!
            scores: gdCriteria.map((c) => ({ criterionId: c.id, score: 9 })),
          },
        ],
      }),
    });

    assert.equal(dupRes.status, 400);
    const dupJson = await dupRes.json();
    assert.match(dupJson.message, /Duplicate student/i);
  });

  // -------------------------------------------------------------------------
  // 6. SECURITY & RBAC: STUDENT & SUPER_ADMIN MUTATION DENIED
  // -------------------------------------------------------------------------
  it('6. Student receives 403 Forbidden; Super Admin cannot mutate evaluations', async () => {
    // 6a. Student attempt
    const stRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: gdCriteria.map((c) => ({ criterionId: c.id, score: 10 })),
          },
        ],
      }),
    });
    assert.equal(stRes.status, 403);

    // 6b. Super Admin attempt (Evaluator authoring is strictly restricted to PLACEMENT_ADMIN)
    const saRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`,
      },
      body: JSON.stringify({
        isDraft: false,
        evaluations: [
          {
            studentId: student1Id,
            scores: gdCriteria.map((c) => ({ criterionId: c.id, score: 10 })),
          },
        ],
      }),
    });
    assert.equal(saRes.status, 403);

    // 6c. Unauthenticated attempt
    const unauthRes = await fetch(`${baseUrl}/gd/${gdRoundId}/evaluations/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDraft: false, evaluations: [] }),
    });
    assert.equal(unauthRes.status, 401);
  });
});
