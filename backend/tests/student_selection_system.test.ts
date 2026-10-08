import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let placementAdminToken: string;
let studentToken: string;
let testStudentId1: string;
let testStudentId2: string;
let testStudentReg1: string;
let testStudentName1: string;

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
  assert.ok(saJson.data.accessToken);

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
  testStudentId1 = stJson.data.user.student?.id || 'stu-001';
  testStudentReg1 = stJson.data.user.student?.registerNumber || '2026CS101';

  // Get student name from management endpoint
  const stuDetailsRes = await fetch(`${baseUrl}/students/${testStudentId1}`, {
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  const stuDetailsJson = await stuDetailsRes.json();
  testStudentName1 = stuDetailsJson.data?.name || 'Aarav Sharma';

  // Login Student 2 (Priya / 2026CS102)
  const st2Res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@placement.edu', password: 'Student@123' }),
  });
  assert.equal(st2Res.status, 200);
  const st2Json = await st2Res.json();
  testStudentId2 = st2Json.data.user.student?.id || 'stu-002';
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 10: Dynamic Student Selection & Assignment System Verification', () => {
  let deptId: string;
  let courseId: string;
  let classId: string;
  let sectionId: string;
  let createdGdRoundId: string;
  let createdInterviewRoundId: string;

  // ===========================================================================
  // 1. DYNAMIC CASCADING HIERARCHY FILTERING
  // ===========================================================================
  it('1. Department -> Course -> Class -> Section cascading hierarchy works', async () => {
    // 1. Fetch departments
    const deptRes = await fetch(`${baseUrl}/departments`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(deptRes.status, 200);
    const deptJson = await deptRes.json();
    assert.ok(Array.isArray(deptJson.data));
    assert.ok(deptJson.data.length > 0);
    deptId = deptJson.data[0].id;

    // 2. Fetch courses for selected department
    const courseRes = await fetch(`${baseUrl}/courses?departmentId=${deptId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(courseRes.status, 200);
    const courseJson = await courseRes.json();
    assert.ok(Array.isArray(courseJson.data));
    assert.ok(courseJson.data.length > 0);
    courseId = courseJson.data[0].id;

    // 3. Fetch classes for selected course & department
    const classRes = await fetch(`${baseUrl}/classes?departmentId=${deptId}&courseId=${courseId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(classRes.status, 200);
    const classJson = await classRes.json();
    assert.ok(Array.isArray(classJson.data));
    assert.ok(classJson.data.length > 0);
    classId = classJson.data[0].id;

    // 4. Fetch sections for selected class
    const sectionRes = await fetch(`${baseUrl}/sections?classId=${classId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(sectionRes.status, 200);
    const sectionJson = await sectionRes.json();
    assert.ok(Array.isArray(sectionJson.data));
    assert.ok(sectionJson.data.length > 0);
    sectionId = sectionJson.data[0].id;
  });

  // ===========================================================================
  // 2. STUDENT QUERYING & DISPLAY BY HIERARCHY
  // ===========================================================================
  it('2. Fetch students filtering by Section loads correct students', async () => {
    const res = await fetch(`${baseUrl}/students?sectionId=${sectionId}&limit=10`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    const list = json.data?.data || json.data || [];
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);
    // Student fields verification
    const st = list[0];
    assert.ok(st.id);
    assert.ok(st.name);
    assert.ok(st.registerNumber);
  });

  // ===========================================================================
  // 3. SEARCH BY STUDENT NAME AND REGISTER NUMBER
  // ===========================================================================
  it('3. Search by student name and register number returns matching candidates', async () => {
    // Search by Register Number
    const regRes = await fetch(`${baseUrl}/students?search=${encodeURIComponent(testStudentReg1)}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(regRes.status, 200);
    const regJson = await regRes.json();
    const regList = regJson.data?.data || regJson.data || [];
    assert.ok(regList.length > 0);
    assert.equal(regList[0].registerNumber, testStudentReg1);

    // Search by Name
    const namePrefix = testStudentName1.slice(0, 4);
    const nameRes = await fetch(`${baseUrl}/students?search=${encodeURIComponent(namePrefix)}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(nameRes.status, 200);
    const nameJson = await nameRes.json();
    const nameList = nameJson.data?.data || nameJson.data || [];
    assert.ok(nameList.length > 0);
    const found = nameList.some((s: any) => s.registerNumber === testStudentReg1);
    assert.ok(found);
  });

  // ===========================================================================
  // 4. GD ROUND CREATION WITH DIRECT STUDENT SELECTION
  // ===========================================================================
  it('4. Placement Admin creates GD round with pre-selected students directly', async () => {
    const res = await fetch(`${baseUrl}/gd`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: 'TCS Selection GD - Batch 2026',
        topic: 'Cloud Computing vs Edge Computing in Automotive Tech',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 40,
        departmentId: deptId,
        courseId: courseId,
        studentIds: [testStudentId1], // Explicit direct selection
      }),
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.id);
    createdGdRoundId = json.data.id;
    assert.equal(json.data.totalParticipants, 1);
  });

  // ===========================================================================
  // 5. INTERVIEW ROUND CREATION WITH DIRECT STUDENT SELECTION
  // ===========================================================================
  it('5. Placement Admin creates Interview round with pre-selected candidates directly', async () => {
    const res = await fetch(`${baseUrl}/interviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        title: 'TCS Technical Interview Round 1',
        interviewType: 'TECHNICAL',
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        durationMinutes: 45,
        departmentId: deptId,
        courseId: courseId,
        studentIds: [testStudentId1], // Explicit direct selection
      }),
    });
    assert.equal(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.id);
    createdInterviewRoundId = json.data.id;
    assert.equal(json.data.totalParticipants, 1);
  });

  // ===========================================================================
  // 6. ASSIGN ADDITIONAL STUDENTS TO EXISTING GD ROUND
  // ===========================================================================
  it('6. Assign additional student to existing GD round', async () => {
    const res = await fetch(`${baseUrl}/gd/${createdGdRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: [testStudentId2],
      }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.assignedCount, 1);
  });

  // ===========================================================================
  // 7. ASSIGN ADDITIONAL CANDIDATES TO EXISTING INTERVIEW ROUND
  // ===========================================================================
  it('7. Assign additional candidate to existing Interview round', async () => {
    const res = await fetch(`${baseUrl}/interviews/${createdInterviewRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: [testStudentId2],
      }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.assignedCount, 1);
  });

  // ===========================================================================
  // 8. REOPEN ROUND: VERIFY PREVIOUS ASSIGNMENTS
  // ===========================================================================
  it('8. Reopen GD and Interview rounds verifies all assigned students are present', async () => {
    // GD Round
    const gdRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(gdRes.status, 200);
    const gdJson = await gdRes.json();
    assert.equal(gdJson.data.participants.length, 2);
    const gdStudentIds = gdJson.data.participants.map((p: any) => p.studentId);
    assert.ok(gdStudentIds.includes(testStudentId1));
    assert.ok(gdStudentIds.includes(testStudentId2));

    // Interview Round
    const intRes = await fetch(`${baseUrl}/interviews/${createdInterviewRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(intRes.status, 200);
    const intJson = await intRes.json();
    assert.equal(intJson.data.participants.length, 2);
    const intStudentIds = intJson.data.participants.map((p: any) => p.studentId);
    assert.ok(intStudentIds.includes(testStudentId1));
    assert.ok(intStudentIds.includes(testStudentId2));
  });

  // ===========================================================================
  // 9. DUPLICATE ASSIGNMENT PREVENTION
  // ===========================================================================
  it('9. Prevent duplicate assignment of already assigned students', async () => {
    // Assigning testStudentId1 and testStudentId2 again
    const res = await fetch(`${baseUrl}/gd/${createdGdRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: [testStudentId1, testStudentId2],
      }),
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    // 0 newly assigned because both were already participants
    assert.equal(json.data.assignedCount, 0);

    // Verify total participants remains 2
    const verifyRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const verifyJson = await verifyRes.json();
    assert.equal(verifyJson.data.participants.length, 2);
  });

  // ===========================================================================
  // 10. SERVER-SIDE VALIDATION & IDOR PROTECTION
  // ===========================================================================
  it('10. Reject nonexistent or malicious student IDs (IDOR protection)', async () => {
    const res = await fetch(`${baseUrl}/gd/${createdGdRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: ['non-existent-student-id-999'],
      }),
    });
    assert.equal(res.status, 404);
  });

  // ===========================================================================
  // 11. RBAC PROTECTION: STUDENT ROLE CANNOT ASSIGN STUDENTS
  // ===========================================================================
  it('11. Student role cannot access student assignment endpoints (HTTP 403)', async () => {
    // GD Assignment
    const gdRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        studentIds: [testStudentId1],
      }),
    });
    assert.equal(gdRes.status, 403);

    // Interview Assignment
    const intRes = await fetch(`${baseUrl}/interviews/${createdInterviewRoundId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        studentIds: [testStudentId1],
      }),
    });
    assert.equal(intRes.status, 403);
  });

  // ===========================================================================
  // 12. EXISTING EVALUATION STILL WORKS UNTOUCHED
  // ===========================================================================
  it('12. Existing GD/Interview evaluation and attendance still works perfectly', async () => {
    // 1. Fetch round to get participant ID
    const roundRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const roundJson = await roundRes.json();
    const participant = roundJson.data.participants[0];

    // 2. Mark attendance
    const attRes = await fetch(`${baseUrl}/gd/participants/${participant.id}/attendance`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ attendance: 'PRESENT' }),
    });
    assert.equal(attRes.status, 200);

    // 3. Human evaluation submission
    const criterionScores = roundJson.data.criteria.map((c: any) => ({
      criterionId: c.id,
      score: Math.min(8, c.maxMarks),
      comment: 'Good performance.',
    }));

    const evalRes = await fetch(`${baseUrl}/gd/${createdGdRoundId}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        participantId: participant.id,
        feedback: 'Good problem formulation and active listening during the discussion.',
        criterionScores,
      }),
    });
    assert.equal(evalRes.status, 201);
    const evalJson = await evalRes.json();
    assert.ok(evalJson.data.totalScore > 0);
    assert.ok(evalJson.data.percentage > 0);
  });
});
