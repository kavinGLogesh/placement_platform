import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

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

  // 2. Placement Admin Token (Question Bank Authoring)
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
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 4 — Category-Topic Matrix & Master Metadata', () => {
  it('1. GET /api/questions/categories returns authoritative category-topics map', async () => {
    const res = await fetch(`${baseUrl}/questions/categories`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.QUANTITATIVE_APTITUDE);
    assert.ok(body.data.QUANTITATIVE_APTITUDE.includes('Percentage'));
    assert.ok(body.data.LOGICAL_REASONING.includes('Blood Relations'));
    assert.ok(body.data.VERBAL_ABILITY.includes('Reading Comprehension'));
    assert.ok(body.data.TECHNICAL_MCQ.includes('Data Structures'));
    assert.ok(body.data.CODING.includes('Algorithms'));
  });

  it('2. Reject question creation with invalid Category -> Topic combination', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Blood Relations', // Belongs to LOGICAL_REASONING!
        questionType: 'SINGLE_CHOICE',
        questionText: 'Test question with mismatched category and topic',
        options: [
          { optionText: 'Option A', optionOrder: 1, isCorrect: true },
          { optionText: 'Option B', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Invalid topic'));
  });
});

describe('Phase 4 — Question Types & Option Validation', () => {
  it('3. SINGLE_CHOICE: Requires minimum 2 options and exactly 1 correct option', async () => {
    // 0 correct options
    const res0 = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        questionType: 'SINGLE_CHOICE',
        questionText: 'What is 20% of 80?',
        options: [
          { optionText: '14', optionOrder: 1, isCorrect: false },
          { optionText: '16', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res0.status, 400);

    // 2 correct options on SINGLE_CHOICE
    const res2 = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        questionType: 'SINGLE_CHOICE',
        questionText: 'What is 20% of 80?',
        options: [
          { optionText: '16', optionOrder: 1, isCorrect: true },
          { optionText: 'Sixteen', optionOrder: 2, isCorrect: true },
        ],
      }),
    });
    assert.strictEqual(res2.status, 400);
  });

  it('4. MULTIPLE_CHOICE: Accepts 1 or more correct options', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'TECHNICAL_MCQ',
        topic: 'OOP',
        questionType: 'MULTIPLE_CHOICE',
        questionText: 'Which of the following are core pillars of Object-Oriented Programming?',
        marks: 2.0,
        options: [
          { optionText: 'Encapsulation', optionOrder: 1, isCorrect: true },
          { optionText: 'Polymorphism', optionOrder: 2, isCorrect: true },
          { optionText: 'Compilation', optionOrder: 3, isCorrect: false },
          { optionText: 'Inheritance', optionOrder: 4, isCorrect: true },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.options.length, 4);
  });

  it('5. TRUE_FALSE: Enforces exactly 2 options ("True" and "False") with 1 correct', async () => {
    // Valid True/False
    const resValid = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'TECHNICAL_MCQ',
        topic: 'Operating Systems',
        questionType: 'TRUE_FALSE',
        questionText: 'A deadlock can occur if Mutual Exclusion is eliminated.',
        marks: 1.0,
        options: [
          { optionText: 'True', optionOrder: 1, isCorrect: false },
          { optionText: 'False', optionOrder: 2, isCorrect: true },
        ],
      }),
    });
    assert.strictEqual(resValid.status, 201);

    // Invalid True/False (random text)
    const resInvalid = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'TECHNICAL_MCQ',
        topic: 'Operating Systems',
        questionType: 'TRUE_FALSE',
        questionText: 'Test text',
        options: [
          { optionText: 'Yes', optionOrder: 1, isCorrect: true },
          { optionText: 'No', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(resInvalid.status, 400);
  });

  it('6. FILL_BLANK: Requires non-empty correctAnswer and prohibits options', async () => {
    // Reject when options provided
    const resWithOpt = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'VERBAL_ABILITY',
        topic: 'Fill in the Blanks',
        questionType: 'FILL_BLANK',
        questionText: 'The sun _____ in the east.',
        correctAnswer: 'rises',
        options: [{ optionText: 'rises', optionOrder: 1, isCorrect: true }],
      }),
    });
    assert.strictEqual(resWithOpt.status, 400);

    // Reject when correctAnswer is missing
    const resNoAns = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'VERBAL_ABILITY',
        topic: 'Fill in the Blanks',
        questionType: 'FILL_BLANK',
        questionText: 'The sun _____ in the east.',
      }),
    });
    assert.strictEqual(resNoAns.status, 400);

    // Accept valid FILL_BLANK
    const resValid = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'VERBAL_ABILITY',
        topic: 'Fill in the Blanks',
        questionType: 'FILL_BLANK',
        questionText: 'The sun _____ in the east.',
        correctAnswer: 'rises',
      }),
    });
    assert.strictEqual(resValid.status, 201);
  });

  it('7. DESCRIPTIVE: Disallows options and saves explanation criteria', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'TECHNICAL_MCQ',
        topic: 'DBMS',
        questionType: 'DESCRIPTIVE',
        questionText: 'Explain the ACID properties of a Database Transaction.',
        marks: 5.0,
        explanation: 'Atomicity, Consistency, Isolation, and Durability principles.',
      }),
    });
    assert.strictEqual(res.status, 201);
  });

  it('8. Marks & Negative marks validation: Rejects negative marks exceeding total marks', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Average',
        questionType: 'SINGLE_CHOICE',
        questionText: 'Find average of 10, 20, 30.',
        marks: 2.0,
        negativeMarks: 3.0, // Exceeds marks
        options: [
          { optionText: '20', optionOrder: 1, isCorrect: true },
          { optionText: '25', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 400);
  });
});

describe('Phase 4 — Question CRUD, Filters, Search & Sorting', () => {
  let createdQId: string;

  it('9. Create valid Question with complete metadata and options', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Profit & Loss',
        difficulty: 'HARD',
        questionType: 'SINGLE_CHOICE',
        questionText: 'A shopkeeper sells an article at 20% profit. If cost price was 10% less and selling price was Rs 18 less, he gains 30%. Find cost price.',
        marks: 4.0,
        negativeMarks: 1.0,
        correctAnswer: 'Rs. 600',
        explanation: 'Let CP = 100x. SP1 = 120x. New CP = 90x. New SP = 90x * 1.3 = 117x. 120x - 117x = 3x = 18 => x = 6 => CP = 600.',
        options: [
          { optionText: 'Rs. 500', optionOrder: 1, isCorrect: false },
          { optionText: 'Rs. 600', optionOrder: 2, isCorrect: true },
          { optionText: 'Rs. 700', optionOrder: 3, isCorrect: false },
          { optionText: 'Rs. 800', optionOrder: 4, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.topic, 'Profit & Loss');
    assert.strictEqual(body.data.marks, 4.0);
    assert.strictEqual(body.data.negativeMarks, 1.0);
    assert.strictEqual(body.data.options.length, 4);
    createdQId = body.data.id;
  });

  it('10. GET /api/questions/:id returns detailed question with options', async () => {
    const res = await fetch(`${baseUrl}/questions/${createdQId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.id, createdQId);
    assert.strictEqual(body.data.options.length, 4);
  });

  it('11. PUT /api/questions/:id updates question text, marks, and replaces options', async () => {
    const res = await fetch(`${baseUrl}/questions/${createdQId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        marks: 5.0,
        options: [
          { optionText: 'Rs. 550', optionOrder: 1, isCorrect: false },
          { optionText: 'Rs. 600', optionOrder: 2, isCorrect: true },
          { optionText: 'Rs. 650', optionOrder: 3, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.marks, 5.0);
    assert.strictEqual(body.data.options.length, 3);
  });

  it('12. PATCH /api/questions/:id/status updates activation status', async () => {
    const res = await fetch(`${baseUrl}/questions/${createdQId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'INACTIVE');
  });

  it('13. Server-side searching, filtering by category/difficulty, and pagination', async () => {
    const res = await fetch(
      `${baseUrl}/questions?category=QUANTITATIVE_APTITUDE&search=shopkeeper&page=1&limit=5&sortBy=marks&sortOrder=desc`,
      { headers: { Authorization: `Bearer ${placementAdminToken}` } }
    );
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.pagination);
    assert.ok(body.data.data.length >= 1);
    assert.strictEqual(body.data.data[0].id, createdQId);
  });
});

describe('Phase 4 — Question Usage & Deletion Rules', () => {
  let reusableQId: string;

  before(async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'LOGICAL_REASONING',
        topic: 'Letter Series',
        questionType: 'SINGLE_CHOICE',
        questionText: 'What comes next in series: B, D, F, H, ?',
        options: [
          { optionText: 'I', optionOrder: 1, isCorrect: false },
          { optionText: 'J', optionOrder: 2, isCorrect: true },
        ],
      }),
    });
    const body = await res.json();
    reusableQId = body.data.id;
  });

  it('14. Record question usage for Phase 5 preparation', async () => {
    const res = await fetch(`${baseUrl}/questions/${reusableQId}/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        assessmentId: 'asm-midterm-01',
        usageMonth: 9,
        usageYear: 2026,
      }),
    });
    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.questionId, reusableQId);
  });

  it('15. Reject deletion of question that has already been recorded in question_usage', async () => {
    const res = await fetch(`${baseUrl}/questions/${reusableQId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('already been used in assessments'));
  });

  it('16. Successfully delete unused question', async () => {
    // Create unused question
    const createRes = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'CODING',
        topic: 'Arrays',
        questionType: 'DESCRIPTIVE',
        questionText: 'Temporary coding question to delete',
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await fetch(`${baseUrl}/questions/${tempId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(delRes.status, 200);

    // Verify it is gone
    const verifyRes = await fetch(`${baseUrl}/questions/${tempId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(verifyRes.status, 404);
  });
});

describe('Phase 4 — Security, RBAC & Regression Verification', () => {
  it('17. Unauthenticated request to question bank returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/questions`);
    assert.strictEqual(res.status, 401);
  });

  it('18. Student token attempting question bank management returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('18b. SUPER_ADMIN token attempting question bank management returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Forbidden'));
  });

  it('19. IDOR protection: Non-existent question ID returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/questions/q-non-existent-uuid`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 404);
  });

  it('20. Regression check: Phases 1–3 endpoints remain fully functional', async () => {
    // Phase 1 Health check
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200);

    // Phase 2 Auth Me
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(meRes.status, 200);

    // Phase 3 Colleges
    const collegeRes = await fetch(`${baseUrl}/colleges`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.strictEqual(collegeRes.status, 200);
  });
});
