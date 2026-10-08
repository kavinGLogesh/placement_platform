import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;

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

  // 1. Super Admin Token
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  superAdminToken = adminJson.data.accessToken;

  // 2. Placement Admin Token (Assessment Authoring)
  const placementRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const placementJson = await placementRes.json();
  placementAdminToken = placementJson.data.accessToken;

  // 3. Student Token
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  // Seed question bank with varied questions for selection testing
  const now = new Date();
  const seedQuestions = [
    // 5 Percentage Questions
    { id: 'q-seed-pct-1', category: 'QUANTITATIVE_APTITUDE', topic: 'Percentage', difficulty: 'EASY', questionType: 'SINGLE_CHOICE', questionText: 'Q1 Pct', marks: 1.0, negativeMarks: 0.25, status: 'ACTIVE' },
    { id: 'q-seed-pct-2', category: 'QUANTITATIVE_APTITUDE', topic: 'Percentage', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q2 Pct', marks: 1.0, negativeMarks: 0.25, status: 'ACTIVE' },
    { id: 'q-seed-pct-3', category: 'QUANTITATIVE_APTITUDE', topic: 'Percentage', difficulty: 'HARD', questionType: 'SINGLE_CHOICE', questionText: 'Q3 Pct', marks: 1.0, negativeMarks: 0.25, status: 'ACTIVE' },
    { id: 'q-seed-pct-4', category: 'QUANTITATIVE_APTITUDE', topic: 'Percentage', difficulty: 'EASY', questionType: 'SINGLE_CHOICE', questionText: 'Q4 Pct', marks: 1.0, negativeMarks: 0.25, status: 'ACTIVE' },
    { id: 'q-seed-pct-5', category: 'QUANTITATIVE_APTITUDE', topic: 'Percentage', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q5 Pct', marks: 1.0, negativeMarks: 0.25, status: 'ACTIVE' },
    // 5 Profit & Loss Questions
    { id: 'q-seed-pnl-1', category: 'QUANTITATIVE_APTITUDE', topic: 'Profit & Loss', difficulty: 'EASY', questionType: 'SINGLE_CHOICE', questionText: 'Q1 PnL', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    { id: 'q-seed-pnl-2', category: 'QUANTITATIVE_APTITUDE', topic: 'Profit & Loss', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q2 PnL', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    { id: 'q-seed-pnl-3', category: 'QUANTITATIVE_APTITUDE', topic: 'Profit & Loss', difficulty: 'HARD', questionType: 'SINGLE_CHOICE', questionText: 'Q3 PnL', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    // 4 Logical Reasoning Blood Relations
    { id: 'q-seed-br-1', category: 'LOGICAL_REASONING', topic: 'Blood Relations', difficulty: 'EASY', questionType: 'SINGLE_CHOICE', questionText: 'Q1 BR', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    { id: 'q-seed-br-2', category: 'LOGICAL_REASONING', topic: 'Blood Relations', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q2 BR', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    { id: 'q-seed-br-3', category: 'LOGICAL_REASONING', topic: 'Blood Relations', difficulty: 'HARD', questionType: 'SINGLE_CHOICE', questionText: 'Q3 BR', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    // 4 Verbal Ability Reading Comprehension
    { id: 'q-seed-rc-1', category: 'VERBAL_ABILITY', topic: 'Reading Comprehension', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q1 RC', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    { id: 'q-seed-rc-2', category: 'VERBAL_ABILITY', topic: 'Reading Comprehension', difficulty: 'HARD', questionType: 'SINGLE_CHOICE', questionText: 'Q2 RC', marks: 1.0, negativeMarks: 0.0, status: 'ACTIVE' },
    // 3 Technical MCQ Data Structures
    { id: 'q-seed-ds-1', category: 'TECHNICAL_MCQ', topic: 'Data Structures', difficulty: 'MEDIUM', questionType: 'SINGLE_CHOICE', questionText: 'Q1 DS', marks: 2.0, negativeMarks: 0.5, status: 'ACTIVE' },
    { id: 'q-seed-ds-2', category: 'TECHNICAL_MCQ', topic: 'Data Structures', difficulty: 'HARD', questionType: 'SINGLE_CHOICE', questionText: 'Q2 DS', marks: 2.0, negativeMarks: 0.5, status: 'ACTIVE' },
  ];

  for (const q of seedQuestions) {
    questionRepository.memStore.questions.set(q.id, {
      ...q,
      createdAt: now,
      updatedAt: now,
      options: [
        { id: `opt-${q.id}-1`, questionId: q.id, optionText: 'Option A (Correct)', optionOrder: 1, isCorrect: true, createdAt: now, updatedAt: now },
        { id: `opt-${q.id}-2`, questionId: q.id, optionText: 'Option B', optionOrder: 2, isCorrect: false, createdAt: now, updatedAt: now },
        { id: `opt-${q.id}-3`, questionId: q.id, optionText: 'Option C', optionOrder: 3, isCorrect: false, createdAt: now, updatedAt: now },
        { id: `opt-${q.id}-4`, questionId: q.id, optionText: 'Option D', optionOrder: 4, isCorrect: false, createdAt: now, updatedAt: now },
      ],
      _count: { usages: 0 },
    } as never);
  }
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 5 — Assessment Configuration & Server-Side Validation', () => {
  it('1. Reject assessment creation with invalid duration, attempts, or empty sections', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Test',
        duration: -10,
        maximumAttempts: 0,
        sections: [],
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.error?.details?.duration);
    assert.ok(body.error?.details?.sections);
  });

  it('2. Reject section with unsupported component or invalid topic', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Invalid Component Assessment',
        duration: 60,
        sections: [
          {
            component: 'UNSUPPORTED_COMPONENT',
            name: 'Invalid Sec',
            topics: ['Percentage'],
            questionsCount: 5,
          },
        ],
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  });

  it('3. Successfully create assessment with Aptitude and Logical Reasoning sections', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Campus Placement Drive 2026',
        description: 'Comprehensive evaluation for final year engineering students',
        duration: 90,
        maximumAttempts: 1,
        negativeMarking: true,
        randomQuestions: true,
        randomOptions: true,
        passingPercentage: 60.0,
        numberOfPapers: 2,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Quantitative Aptitude Section',
            topics: ['Percentage', 'Profit & Loss'],
            difficulty: 'EASY',
            questionType: 'SINGLE_CHOICE',
            questionsCount: 2,
            marksPerQuestion: 1.0,
            negativeMarks: 0.25,
          },
          {
            component: 'LOGICAL_REASONING',
            name: 'Logical Reasoning Section',
            topics: ['Blood Relations'],
            difficulty: 'MEDIUM',
            questionsCount: 1,
            marksPerQuestion: 2.0,
            negativeMarks: 0.5,
          },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id);
    assert.strictEqual(body.data.name, 'Campus Placement Drive 2026');
    assert.strictEqual(body.data.status, 'DRAFT');
    assert.strictEqual(body.data.sections.length, 2);
    assert.strictEqual(body.data.totalQuestions, 3);
    assert.strictEqual(body.data.totalMarks, 4.0);
  });

  it('4. GET /api/assessments returns paginated assessments list', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.data.length >= 1);
    assert.ok(body.data.pagination);
  });

  it('5. PUT /api/assessments/:id updates assessment details and section configuration', async () => {
    // Create assessment first
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'To Be Updated Assessment',
        duration: 45,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Aptitude Section',
            topics: ['Percentage'],
            questionsCount: 2,
          },
        ],
      }),
    });
    const created = (await createRes.json()).data;

    const updateRes = await fetch(`${baseUrl}/assessments/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Assessment Name',
        duration: 75,
        passingPercentage: 70.0,
      }),
    });
    assert.strictEqual(updateRes.status, 200);
    const updated = (await updateRes.json()).data;
    assert.strictEqual(updated.name, 'Updated Assessment Name');
    assert.strictEqual(updated.duration, 75);
    assert.strictEqual(updated.passingPercentage, 70.0);
  });
});

describe('Phase 5 — Question Selection Engine & Shortage Failure', () => {
  it('6. Shortage rejection: fail generation completely when required > available with structured counts', async () => {
    // Create assessment demanding 50 questions where only ~5 exist
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Shortage Assessment Test',
        duration: 60,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'High Demand Section',
            topics: ['Percentage'],
            questionsCount: 50, // Available is only 5
          },
        ],
      }),
    });
    const created = (await createRes.json()).data;

    const genRes = await fetch(`${baseUrl}/assessments/${created.id}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(genRes.status, 400);
    const body = await genRes.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Insufficient eligible questions'));
    const details = body.error.details;
    assert.strictEqual(details.error, 'INSUFFICIENT_QUESTIONS');
    assert.strictEqual(details.required, 50);
    assert.ok(details.available < 50);
    assert.strictEqual(details.missing, details.required - details.available);
    assert.ok(details.shortages.length > 0);

    // Verify NO papers were created (atomic safety)
    const papersRes = await fetch(`${baseUrl}/assessments/${created.id}/papers`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const papers = (await papersRes.json()).data;
    assert.strictEqual(papers.length, 0);
  });

  it('7. Multi-paper generation: atomically generate 2 sets with distinct unique questions', async () => {
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Multi-Paper Generator Test',
        duration: 60,
        numberOfPapers: 2,
        randomQuestions: true,
        randomOptions: true,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Quant Section',
            topics: ['Percentage'], // We have 5 questions
            questionsCount: 2, // 2 papers x 2 questions = 4 questions required
          },
        ],
      }),
    });
    const created = (await createRes.json()).data;

    const genRes = await fetch(`${baseUrl}/assessments/${created.id}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(genRes.status, 201);
    const genBody = await genRes.json();
    assert.strictEqual(genBody.success, true);
    assert.strictEqual(genBody.data.numberOfPapers, 2);
    assert.strictEqual(genBody.data.totalQuestionsAllocated, 4);

    // Inspect papers and verify zero duplicate questions across sets
    const papersRes = await fetch(`${baseUrl}/assessments/${created.id}/papers`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const papers = (await papersRes.json()).data;
    assert.strictEqual(papers.length, 2);
    assert.strictEqual(papers[0].paperCode, 'SET-A');
    assert.strictEqual(papers[1].paperCode, 'SET-B');

    const paper1QuestionIds = papers[0].questions.map((q: { questionId: string }) => q.questionId);
    const paper2QuestionIds = papers[1].questions.map((q: { questionId: string }) => q.questionId);

    // Verify each paper has 2 questions
    assert.strictEqual(paper1QuestionIds.length, 2);
    assert.strictEqual(paper2QuestionIds.length, 2);

    // Verify NO question overlap between Paper 1 and Paper 2
    for (const id of paper1QuestionIds) {
      assert.ok(!paper2QuestionIds.includes(id), `Duplicate question ${id} found between Paper 1 and Paper 2`);
    }

    // Verify options are randomized and isCorrect answer is preserved
    for (const q of papers[0].questions) {
      assert.ok(q.randomizedOptions.length > 0);
      const correctOpts = q.randomizedOptions.filter((opt: { isCorrect: boolean }) => opt.isCorrect);
      assert.strictEqual(correctOpts.length, 1, 'Exactly one correct option must be preserved');
      assert.ok(correctOpts[0].optionText.length > 0);
    }
  });

  it('8. Deterministic reproducibility: paper reload returns identical question and option order', async () => {
    // Fetch the papers generated in test 7 again
    const allAssessmentsRes = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const assessments = (await allAssessmentsRes.json()).data.data;
    const multiPaperAsmt = assessments.find((a: { name: string }) => a.name === 'Multi-Paper Generator Test');

    const fetch1 = await fetch(`${baseUrl}/assessments/${multiPaperAsmt.id}/papers`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const papers1 = (await fetch1.json()).data;

    const fetch2 = await fetch(`${baseUrl}/assessments/${multiPaperAsmt.id}/papers`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const papers2 = (await fetch2.json()).data;

    // Deep equality check: Questions and randomized options must be 100% deterministic
    assert.strictEqual(papers1[0].questions[0].id, papers2[0].questions[0].id);
    assert.strictEqual(papers1[0].questions[0].questionId, papers2[0].questions[0].questionId);
    assert.deepStrictEqual(
      papers1[0].questions[0].randomizedOptions,
      papers2[0].questions[0].randomizedOptions
    );
  });

  it('9. Monthly no-repeat rule: questions used in current cycle are excluded from new papers', async () => {
    // In previous test, 4 out of 6 Percentage questions were allocated and recorded in QuestionUsage
    // So only 2 Percentage questions remain unused in this monthly cycle
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Monthly Exclusion Test Assessment',
        duration: 40,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Percentage Section',
            topics: ['Percentage'],
            questionsCount: 3, // Only 2 unused remain!
          },
        ],
      }),
    });
    const created = (await createRes.json()).data;

    const genRes = await fetch(`${baseUrl}/assessments/${created.id}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(genRes.status, 400);
    const body = await genRes.json();
    assert.strictEqual(body.success, false);
    // Insufficient error because 4 were excluded by monthly usage!
    const details = body.error.details;
    assert.strictEqual(details.required, 3);
    assert.strictEqual(details.available, 2);
    assert.strictEqual(details.missing, 1);
  });

  it('10. Concurrency safety: simultaneous generation calls on same assessment are protected by mutex', async () => {
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Concurrency Lock Test Assessment',
        duration: 30,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'PnL Section',
            topics: ['Profit & Loss'], // 3 questions available
            questionsCount: 1,
          },
        ],
      }),
    });
    const created = (await createRes.json()).data;

    // Simulate lock acquisition
    assessmentRepository.acquireGenerationLock(created.id);

    // Call generate while lock is active
    const genRes = await fetch(`${baseUrl}/assessments/${created.id}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(genRes.status, 409);
    const body = await genRes.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('already in progress'));

    // Release lock
    assessmentRepository.releaseGenerationLock(created.id);
  });
});

describe('Phase 5 — Lifecycle, Scheduling & Student Assignments', () => {
  let assessmentId: string;

  before(async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Lifecycle & Assignment Assessment',
        duration: 60,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'PnL Section',
            topics: ['Profit & Loss'],
            questionsCount: 1,
          },
        ],
      }),
    });
    const data = (await res.json()).data;
    assessmentId = data.id;
  });

  it('11. Cannot publish an assessment before examination papers are generated', async () => {
    const res = await fetch(`${baseUrl}/assessments/${assessmentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('No examination papers have been generated'));
  });

  it('12. Generate paper and successfully publish assessment', async () => {
    // Generate paper first
    const genRes = await fetch(`${baseUrl}/assessments/${assessmentId}/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(genRes.status, 201);

    // Now publish
    const pubRes = await fetch(`${baseUrl}/assessments/${assessmentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(pubRes.status, 200);
    const pubBody = await pubRes.json();
    assert.strictEqual(pubBody.data.status, 'PUBLISHED');

    // Unpublish to revert to DRAFT
    const unpubRes = await fetch(`${baseUrl}/assessments/${assessmentId}/unpublish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(unpubRes.status, 200);
    const unpubBody = await unpubRes.json();
    assert.strictEqual(unpubBody.data.status, 'DRAFT');
  });

  it('13. Schedule assessment with start and end dates', async () => {
    const startDate = new Date(Date.now() + 86400000).toISOString(); // +1 day
    const endDate = new Date(Date.now() + 172800000).toISOString();   // +2 days

    const res = await fetch(`${baseUrl}/assessments/${assessmentId}/schedule`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ startDate, endDate }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'SCHEDULED');
    assert.ok(body.data.startDate);
    assert.ok(body.data.endDate);
  });

  it('14. Assign candidates to assessment and distribute papers', async () => {
    const res = await fetch(`${baseUrl}/assessments/${assessmentId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: ['std-test-001', 'std-test-002', 'std-test-003'],
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.assignedCount, 3);
    assert.strictEqual(body.data.assignments.length, 3);

    // Verify retrieval of assignments
    const listRes = await fetch(`${baseUrl}/assessments/${assessmentId}/assignments`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.strictEqual(listBody.data.length, 3);
  });
});

describe('Phase 5 — Security, RBAC & Phases 1–4 Regression', () => {
  it('15. Student token is denied access to assessment management APIs (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('15b. SUPER_ADMIN token is denied access to assessment management APIs (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Forbidden'));
  });

  it('16. Unauthenticated requests are denied access (HTTP 401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/assessments`);
    assert.strictEqual(res.status, 401);
  });

  it('17. Phase 1 Health check regression: /api/health returns HEALTHY', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.message, 'API is running');
  });

  it('18. Phase 2 Auth & Tokens regression: login generates valid JWT', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.accessToken);
  });

  it('19. Phase 3 Institutional Hierarchy regression: /api/colleges returns colleges list', async () => {
    const res = await fetch(`${baseUrl}/colleges`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
  });

  it('20. Phase 4 Question Bank regression: /api/questions/categories and question CRUD work', async () => {
    // SUPER_ADMIN is 403 on question bank
    const saRes = await fetch(`${baseUrl}/questions/categories`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(saRes.status, 403);

    // PLACEMENT_ADMIN has 200 on question bank
    const res = await fetch(`${baseUrl}/questions/categories`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.QUANTITATIVE_APTITUDE);
  });
});
