import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { generateAccessToken } from '../src/utils/jwt.util.js';
import { Role } from '../src/types/auth.types.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let student2Token: string;

let createdCompanyId: string;
let companyAssessmentId: string;
let attemptId: string;

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

  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  superAdminToken = adminJson.data.accessToken;

  const placementRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const placementJson = await placementRes.json();
  placementAdminToken = placementJson.data.accessToken;

  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  student2Token = generateAccessToken({
    sub: 'usr-student-other-002',
    email: 'otherstudent@placement.edu',
    role: Role.STUDENT,
  });
});

after(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

describe('Company-wise Assessment End-to-End Test Suite', () => {
  // ===========================================================================
  // 1. DYNAMIC COMPANY MANAGEMENT
  // ===========================================================================
  it('1. Placement Admin can dynamically create a company (e.g. TCS)', async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'TCS_TEST',
        name: 'Tata Consultancy Services Test',
        description: 'Global IT consulting leader - campus preparation track',
        website: 'https://www.tcs.com',
        isActive: true,
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.code, 'TCS_TEST');
    assert.equal(json.data.name, 'Tata Consultancy Services Test');
    createdCompanyId = json.data.id;
    assert.ok(createdCompanyId);
  });

  it('2. Creating duplicate company code is rejected (HTTP 409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'TCS_TEST',
        name: 'Duplicate TCS',
      }),
    });

    assert.equal(res.status, 409);
  });

  it('3. Admin and Student can list companies and retrieve company by ID', async () => {
    // Super Admin list
    const superAdminRes = await fetch(`${baseUrl}/companies`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(superAdminRes.status, 200);

    // Placement Admin list
    const adminRes = await fetch(`${baseUrl}/companies`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(adminRes.status, 200);
    const adminJson = await adminRes.json();
    assert.ok(Array.isArray(adminJson.data));

    // Student list (to filter company assessments)
    const studentRes = await fetch(`${baseUrl}/companies`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentRes.status, 200);

    // Get company by ID
    const singleRes = await fetch(`${baseUrl}/companies/${createdCompanyId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(singleRes.status, 200);
    const singleJson = await singleRes.json();
    assert.equal(singleJson.data.code, 'TCS_TEST');
  });

  it('4. Admin can update company details', async () => {
    const res = await fetch(`${baseUrl}/companies/${createdCompanyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated campus recruitment preparation path',
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.description, 'Updated campus recruitment preparation path');
  });

  // ===========================================================================
  // 2. QUESTION BANK INTEGRATION WITH COMPANY METADATA
  // ===========================================================================
  it('5. Question Bank supports company metadata and filtering by companyId', async () => {
    // Create question tagged with companyId
    const createQRes = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        companyId: createdCompanyId,
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        questionText: 'TCS Special: In an office, 70% of employees drink coffee and 30% drink tea. What is the ratio?',
        marks: 2.0,
        negativeMarks: 0.5,
        options: [
          { optionText: '7:3', optionOrder: 1, isCorrect: true },
          { optionText: '3:7', optionOrder: 2, isCorrect: false },
          { optionText: '2:1', optionOrder: 3, isCorrect: false },
          { optionText: '1:1', optionOrder: 4, isCorrect: false },
        ],
      }),
    });

    const createQJson = await createQRes.json();
    assert.equal(createQRes.status, 201);
    assert.equal(createQJson.data.companyId, createdCompanyId);
    const questionId = createQJson.data.id;

    // Query questions filtered by companyId
    const filterRes = await fetch(`${baseUrl}/questions?companyId=${createdCompanyId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const filterJson = await filterRes.json();
    assert.equal(filterRes.status, 200);
    const questionsList = filterJson.data?.data || filterJson.data;
    assert.ok(Array.isArray(questionsList) && questionsList.length >= 1);
    assert.ok(questionsList.some((q: any) => q.id === questionId));
  });

  // ===========================================================================
  // 3. FLEXIBLE COMPANY ASSESSMENT CONFIGURATION
  // ===========================================================================
  it('6. Placement Admin can create reusable company-specific preparation assessment', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'TCS National Qualifier Preparation Assessment',
        description: 'Practice assessment matching TCS placement pattern (Preparation only - not official exam)',
        companyId: createdCompanyId,
        isCompanyAssessment: true,
        duration: 45,
        maximumAttempts: 2,
        negativeMarking: true,
        randomQuestions: true,
        randomOptions: true,
        passingPercentage: 60.0,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'TCS Numerical Ability',
            topics: ['Percentage'],
            difficulty: 'MEDIUM',
            questionType: 'SINGLE_CHOICE',
            questionsCount: 1,
            marksPerQuestion: 2.0,
            negativeMarks: 0.5,
          },
        ],
      }),
    });

    const json = await res.json();
    assert.equal(res.status, 201);
    assert.equal(json.success, true);
    assert.equal(json.data.companyId, createdCompanyId);
    assert.equal(json.data.isCompanyAssessment, true);
    companyAssessmentId = json.data.id;
    assert.ok(companyAssessmentId);
  });

  it('7. Admin can generate test paper and publish the company assessment', async () => {
    // Generate paper
    const genRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/generate-papers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.ok(genRes.status === 200 || genRes.status === 201);

    // Publish
    const pubRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const pubJson = await pubRes.json();
    assert.equal(pubRes.status, 200);
    assert.equal(pubJson.data.status, 'PUBLISHED');
  });

  it('8. Placement Admin can assign candidates to the company assessment', async () => {
    const assignRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: ['stu-001'],
      }),
    });

    const assignJson = await assignRes.json();
    assert.equal(assignRes.status, 200);
    assert.equal(assignJson.data.assignedCount, 1);
  });

  // ===========================================================================
  // 4. STUDENT WORKFLOW & ENGINE REUSE
  // ===========================================================================
  it('9. Assigned student sees company preparation assessment in their test list', async () => {
    const res = await fetch(`${baseUrl}/student/tests`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    const assignedTest = json.data.find((t: any) => t.id === companyAssessmentId);
    assert.ok(assignedTest, 'Student should see assigned company assessment');
    assert.equal(assignedTest.isCompanyAssessment, true);
    assert.equal(assignedTest.companyId, createdCompanyId);
    assert.equal(assignedTest.status, 'AVAILABLE');
  });

  it('10. Student attends company assessment using existing Student Assessment Engine', async () => {
    // Start attempt
    const startRes = await fetch(`${baseUrl}/student/assessments/${companyAssessmentId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });

    const startJson = await startRes.json();
    assert.equal(startRes.status, 201);
    assert.ok(startJson.data);
    attemptId = startJson.data.id;
    assert.ok(attemptId);

    // Get attempt questions
    const getAttemptRes = await fetch(`${baseUrl}/student/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(getAttemptRes.status, 200);
    const getAttemptJson = await getAttemptRes.json();
    const questions = getAttemptJson.data.questions || [];
    assert.ok(questions.length > 0);
    const firstQ = questions[0];

    // Save answer
    const correctOpt = firstQ.options?.[0];
    const saveRes = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: firstQ.questionId,
        selectedOptionIds: correctOpt ? [correctOpt.id] : [],
        currentQuestion: 1,
      }),
    });

    assert.equal(saveRes.status, 200);

    // Submit attempt
    const submitRes = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({}),
    });

    const submitJson = await submitRes.json();
    assert.equal(submitRes.status, 200);
    assert.ok(submitJson.data.id);
  });

  it('11. Company assessment results are computed using existing scoring and results engine', async () => {
    const resultsRes = await fetch(`${baseUrl}/student/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    const resultsJson = await resultsRes.json();
    assert.equal(resultsRes.status, 200);
    assert.ok(Array.isArray(resultsJson.data));
    const matched = resultsJson.data.find((r: any) => r.attemptId === attemptId || r.assessmentId === companyAssessmentId);
    assert.ok(matched, 'Company assessment result must be recorded in student results');
    assert.ok(matched.obtainedMarks !== undefined);
    assert.ok(matched.percentage !== undefined);
  });

  // ===========================================================================
  // 5. SECURITY & RBAC ENFORCEMENT
  // ===========================================================================
  it('12. Security: Student cannot create companies (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        code: 'HACK',
        name: 'Hacked Company',
      }),
    });

    assert.equal(res.status, 403);
  });

  it('13. Security: Student cannot create assessments (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Illegal Assessment',
        duration: 30,
        sections: [],
      }),
    });

    assert.equal(res.status, 403);
  });

  it('14. Security: Unassigned student cannot start company assessment (HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/student/assessments/${companyAssessmentId}/start`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${student2Token}`,
      },
    });

    assert.equal(res.status, 403);
  });

  it('15. Security: Student cannot access another student attempt (IDOR HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });

    assert.equal(res.status, 403);
  });
});
