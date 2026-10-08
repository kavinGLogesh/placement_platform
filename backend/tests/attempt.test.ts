import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';
import { attemptRepository } from '../src/repositories/attempt.repository.js';
import { scoringService } from '../src/services/scoring.service.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;

let testAssessmentId: string;
let testPaperId: string;
let question1Id: string;
let question1CorrectOptId: string;
let question1WrongOptId: string;
let question2Id: string;
let question2CorrectOptId: string;

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

  // 1. Admin login (Placement Admin has assessment authoring permissions)
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  adminToken = adminJson.data.accessToken;

  // 2. Student login (stu-001)
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  // 3. Seed Question Bank questions
  question1Id = 'q-p6-perc-1';
  question1CorrectOptId = 'opt-p6-1-correct';
  question1WrongOptId = 'opt-p6-1-wrong';
  await questionRepository.createQuestion({
    id: question1Id,
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Percentage',
    difficulty: 'EASY',
    questionType: 'SINGLE_CHOICE',
    questionText: 'What is 15% of 200?',
    marks: 2.0,
    negativeMarks: 0.5,
    status: 'ACTIVE',
    options: [
      { id: question1CorrectOptId, optionText: '30', optionOrder: 1, isCorrect: true },
      { id: question1WrongOptId, optionText: '25', optionOrder: 2, isCorrect: false },
    ],
  });

  question2Id = 'q-p6-pnl-1';
  question2CorrectOptId = 'opt-p6-2-correct';
  await questionRepository.createQuestion({
    id: question2Id,
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Profit & Loss',
    difficulty: 'EASY',
    questionType: 'SINGLE_CHOICE',
    questionText: 'If CP is 100 and SP is 120, what is profit percentage?',
    marks: 3.0,
    negativeMarks: 1.0,
    status: 'ACTIVE',
    options: [
      { id: question2CorrectOptId, optionText: '20%', optionOrder: 1, isCorrect: true },
      { id: 'opt-p6-2-wrong', optionText: '10%', optionOrder: 2, isCorrect: false },
    ],
  });

  // 4. Create an Assessment for testing
  const createAsmtRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: 'Phase 6 Integration Exam',
      duration: 30,
      maximumAttempts: 2,
      negativeMarking: true,
      passingPercentage: 50,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Quant Section',
          topics: ['Percentage', 'Profit & Loss'],
          questionsCount: 2,
          marksPerQuestion: 2.5,
        },
      ],
    }),
  });
  const asmtJson = await createAsmtRes.json();
  testAssessmentId = asmtJson.data.id;

  // 5. Generate Papers
  const genRes = await fetch(`${baseUrl}/assessments/${testAssessmentId}/generate-papers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const genJson = await genRes.json();
  testPaperId = genJson.data.papers[0].id;

  // Retrieve actual questions assigned to the generated paper
  const paper = await assessmentRepository.getPaperById(testPaperId);
  if (paper && paper.questions && paper.questions.length >= 2) {
    const q1 = paper.questions[0];
    const q2 = paper.questions[1];
    question1Id = q1.questionId;
    question1CorrectOptId = (q1.randomizedOptions || []).find((o) => o.isCorrect)?.id || '';
    question1WrongOptId = (q1.randomizedOptions || []).find((o) => !o.isCorrect)?.id || '';
    question2Id = q2.questionId;
    question2CorrectOptId = (q2.randomizedOptions || []).find((o) => o.isCorrect)?.id || '';
  }

  // 6. Assign student (stu-001)
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

  // 7. Publish assessment
  await fetch(`${baseUrl}/assessments/${testAssessmentId}/publish`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Phase 6 — Student Assessment Engine', () => {
  let createdAttemptId: string;

  it('1. GET /api/student/tests — returns assigned available assessments', async () => {
    const res = await fetch(`${baseUrl}/student/tests`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    const item = json.data.find((t: { id: string }) => t.id === testAssessmentId);
    assert.ok(item, 'Expected test to be listed for student');
    assert.strictEqual(item.status, 'AVAILABLE');
    assert.strictEqual(item.maximumAttempts, 2);
  });

  it('2. POST /api/student/assessments/:id/start — starts assessment attempt server-side', async () => {
    const res = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.id);
    createdAttemptId = json.data.id;
    assert.strictEqual(json.data.status, 'IN_PROGRESS');
    assert.ok(json.data.expectedEndTime);
    assert.strictEqual(json.data.attemptNumber, 1);
  });

  it('3. Question sanitization — questions & options do NOT expose isCorrect or correctAnswer', async () => {
    const res = await fetch(`${baseUrl}/student/attempts/${createdAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const questions = json.data.questions;
    assert.ok(questions && questions.length > 0);

    for (const q of questions) {
      assert.strictEqual(q.correctAnswer, undefined, 'correctAnswer must be omitted');
      assert.strictEqual(q.explanation, undefined, 'explanation must be omitted');
      for (const opt of q.options) {
        assert.strictEqual(opt.isCorrect, undefined, 'option.isCorrect must be stripped');
        assert.ok(opt.id);
        assert.ok(opt.optionText);
      }
    }
  });

  it('4. POST /api/student/assessments/:id/start — resumes active in-progress attempt (idempotent)', async () => {
    const res = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.strictEqual(json.data.id, createdAttemptId, 'Should resume identical active attempt');
    assert.strictEqual(json.data.status, 'IN_PROGRESS');
  });

  it('5. Start assessment rejection — rejects unassigned student', async () => {
    // Attempt with non-assigned assessment ID
    const res = await fetch(`${baseUrl}/student/assessments/unassigned-asmt-999/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 404);
  });

  it('6. Start assessment rejection — rejects unpublished assessment', async () => {
    // Create draft assessment
    const draftRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Draft Assessment',
        duration: 10,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Draft Section',
            topics: ['Percentage'],
            questionsCount: 1,
            marksPerQuestion: 1.0,
          },
        ],
      }),
    });
    const draftJson = await draftRes.json();
    const draftId = draftJson.data.id;

    const res = await fetch(`${baseUrl}/student/assessments/${draftId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('7. POST /api/attempts/:id/answers — auto-saves single answer', async () => {
    const res = await fetch(`${baseUrl}/attempts/${createdAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: question1Id,
        selectedOptionIds: [question1CorrectOptId],
        isMarkedForReview: true,
        currentQuestion: 1,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.questionId, question1Id);
    assert.strictEqual(json.data.isMarkedForReview, true);
  });

  it('8. POST /api/attempts/:id/answers — batch syncs offline answers', async () => {
    const res = await fetch(`${baseUrl}/attempts/${createdAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        answers: [
          {
            questionId: question2Id,
            selectedOptionIds: [question2CorrectOptId],
            isMarkedForReview: false,
            version: 1,
          },
        ],
        currentQuestion: 2,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.syncedCount, 1);
  });

  it('9. Conflict handling — stale version answer does not overwrite newer answer', async () => {
    // Current answer for question1 has version 1
    // Sending a payload with version 0 should NOT overwrite
    await fetch(`${baseUrl}/attempts/${createdAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: question1Id,
        selectedOptionIds: [question1WrongOptId],
        version: 0, // Stale version
      }),
    });

    const getRes = await fetch(`${baseUrl}/student/attempts/${createdAttemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const getJson = await getRes.json();
    const ans1 = getJson.data.answers.find((a: { questionId: string }) => a.questionId === question1Id);
    assert.deepStrictEqual(ans1.selectedOptionIds, [question1CorrectOptId], 'Stale version must not overwrite');
  });

  it('10. POST /api/attempts/:id/submit — submits attempt and calculates objective score', async () => {
    const res = await fetch(`${baseUrl}/attempts/${createdAttemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.id);
    assert.strictEqual(json.data.attemptId, createdAttemptId);
    assert.strictEqual(json.data.correctCount, 2, 'Both questions were answered correctly');
    assert.strictEqual(json.data.incorrectCount, 0);
    assert.strictEqual(json.data.unansweredCount, 0);
    assert.strictEqual(json.data.percentage, 100);
    assert.strictEqual(json.data.isPassed, true);
  });

  it('11. Idempotent submission — multiple submissions return identical final state safely', async () => {
    const res2 = await fetch(`${baseUrl}/attempts/${createdAttemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res2.status, 200);
    const json2 = await res2.json();
    assert.strictEqual(json2.data.attemptId, createdAttemptId);
  });

  it('12. Closed attempt protection — rejects answer updates after submission', async () => {
    const res = await fetch(`${baseUrl}/attempts/${createdAttemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: question1Id,
        selectedOptionIds: [question1WrongOptId],
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  it('13. Scoring unit test — verifies negative marking and accuracy', () => {
    const mockAssessment = {
      id: 'asmt-mock',
      name: 'Test',
      duration: 30,
      passingPercentage: 60,
      negativeMarking: true,
    } as any;

    const mockPaper = {
      id: 'paper-mock',
      questions: [
        {
          questionId: 'q1',
          marks: 2.0,
          negativeMarks: 0.5,
          questionType: 'SINGLE_CHOICE',
          randomizedOptions: [{ id: 'opt1', isCorrect: true }, { id: 'opt2', isCorrect: false }],
        },
        {
          questionId: 'q2',
          marks: 2.0,
          negativeMarks: 0.5,
          questionType: 'SINGLE_CHOICE',
          randomizedOptions: [{ id: 'opt3', isCorrect: true }, { id: 'opt4', isCorrect: false }],
        },
        {
          questionId: 'q3',
          marks: 1.0,
          negativeMarks: 0.25,
          questionType: 'SINGLE_CHOICE',
          randomizedOptions: [{ id: 'opt5', isCorrect: true }, { id: 'opt6', isCorrect: false }],
        },
      ],
    } as any;

    // Student answers: Q1 correct (+2.0), Q2 incorrect (-0.5), Q3 unanswered (0)
    const mockAnswers = [
      { questionId: 'q1', selectedOptionIds: ['opt1'] },
      { questionId: 'q2', selectedOptionIds: ['opt4'] },
    ] as any[];

    const score = scoringService.calculateScore(mockAssessment, mockPaper, mockAnswers);
    assert.strictEqual(score.totalMarks, 5.0);
    assert.strictEqual(score.obtainedMarks, 1.5); // 2.0 - 0.5 = 1.5
    assert.strictEqual(score.percentage, 30); // 1.5 / 5.0 = 30%
    assert.strictEqual(score.correctCount, 1);
    assert.strictEqual(score.incorrectCount, 1);
    assert.strictEqual(score.unansweredCount, 1);
    assert.strictEqual(score.accuracy, 50); // 1 / (1 + 1) = 50%
    assert.strictEqual(score.isPassed, false); // 30% < 60%
  });

  it('14. Authoritative timer expiration — auto-finalizes when expectedEndTime passes', async () => {
    // Create an expired attempt directly in repo
    const expiredAttempt = await attemptRepository.createAttempt({
      studentId: 'stu-001',
      assessmentId: testAssessmentId,
      paperId: testPaperId,
      attemptNumber: 2,
      startTime: new Date(Date.now() - 60000),
      expectedEndTime: new Date(Date.now() - 1000), // Expired 1 sec ago
    });

    // Calling getAttempt should trigger authoritative expiration
    const res = await fetch(`${baseUrl}/student/attempts/${expiredAttempt.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.status, 'EXPIRED');

    // Trying to save answers on expired attempt must be rejected
    const saveRes = await fetch(`${baseUrl}/attempts/${expiredAttempt.id}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: question1Id,
        selectedOptionIds: [question1CorrectOptId],
      }),
    });
    assert.strictEqual(saveRes.status, 400);
  });

  it('15. Maximum attempt limit enforcement — rejects start after exhausting attempts', async () => {
    // Both attempt 1 (submitted) and attempt 2 (expired) are completed
    const res = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.message, 'Maximum attempts limit reached for this assessment');
  });

  it('16. GET /api/student/results — lists completed results for student', async () => {
    const res = await fetch(`${baseUrl}/student/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 1);
  });

  it('17. GET /api/student/results/:id — returns result detail with IDOR protection', async () => {
    const resultsRes = await fetch(`${baseUrl}/student/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const resultsJson = await resultsRes.json();
    const resultId = resultsJson.data[0].id;

    const res = await fetch(`${baseUrl}/student/results/${resultId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.id, resultId);
  });

  it('18. IDOR protection — rejects unauthorized result access', async () => {
    // Attempt accessing result as student who does not own it
    const otherStudentRes = await fetch(`${baseUrl}/student/results/res-unauthorized-999`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(otherStudentRes.status, 404);
  });

  it('19. Concurrent submission mutex guard — prevents duplicate race-condition scoring', async () => {
    // Mutex lock test: acquireSubmitLock returns false on locked attempt
    const lock1 = attemptRepository.acquireSubmitLock('test-concurrent-att');
    assert.strictEqual(lock1, true);
    const lock2 = attemptRepository.acquireSubmitLock('test-concurrent-att');
    assert.strictEqual(lock2, false, 'Second lock acquire must fail');
    attemptRepository.releaseSubmitLock('test-concurrent-att');
    const lock3 = attemptRepository.acquireSubmitLock('test-concurrent-att');
    assert.strictEqual(lock3, true);
    attemptRepository.releaseSubmitLock('test-concurrent-att');
  });

  it('20. RBAC security — rejects student accessing admin assessment routes', async () => {
    const res = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 403);
  });
});
