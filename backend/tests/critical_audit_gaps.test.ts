import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { scoringService } from '../src/services/scoring.service.js';
import { AssessmentDto, AssessmentPaperDto } from '../src/types/assessment.types.js';
import { AttemptAnswerDto } from '../src/types/attempt.types.js';

let server: http.Server;
let baseUrl: string;

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
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Critical Audit Gaps: 1. Dual Login (Register Number & Email)', () => {
  it('1. Student can log in using Register Number (e.g. 2026CS102) -> HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '2026CS102',
        password: 'Student@123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, 'STUDENT');
    assert.equal(body.data.user.email, 'priya@placement.edu');
    assert.ok(body.data.accessToken);
  });

  it('2. Student can log in using Register Number case-insensitively (e.g. 2026cs102) -> HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '2026cs102',
        password: 'Student@123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, 'STUDENT');
    assert.equal(body.data.user.email, 'priya@placement.edu');
  });

  it('3. Unknown register number returns HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'NON_EXISTENT_ROLL_9999',
        password: 'AnyPassword@123',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Invalid email or password/i);
  });

  it('4. Admin email login continues to work seamlessly -> HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'placementadmin@placement.edu',
        password: 'PlacementAdmin@123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.user.role, 'PLACEMENT_ADMIN');
  });
});

describe('Critical Audit Gaps: 2. Coding Question Assessment Scoring Pipeline', () => {
  const dummyAssessment: AssessmentDto = {
    id: 'asmt-audit-01',
    name: 'Full-Stack & Coding Assessment',
    duration: 60,
    maximumAttempts: 1,
    negativeMarking: false,
    randomQuestions: false,
    randomOptions: false,
    passingPercentage: 60.0,
    status: 'PUBLISHED',
    totalMarks: 15.0,
    totalQuestions: 2,
    numberOfPapers: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const dummyPaper: AssessmentPaperDto = {
    id: 'paper-audit-01',
    assessmentId: 'asmt-audit-01',
    paperCode: 'SET-A',
    paperIndex: 1,
    createdAt: new Date(),
    questions: [
      {
        id: 'aq-mcq-1',
        paperId: 'paper-audit-01',
        questionId: 'q-mcq-1',
        questionOrder: 1,
        marks: 5.0,
        negativeMarks: 0.0,
        category: 'TECHNICAL_MCQ',
        questionType: 'SINGLE_CHOICE',
        randomizedOptions: [
          { id: 'opt-1', optionText: 'Wrong', optionOrder: 1, isCorrect: false },
          { id: 'opt-2', optionText: 'Correct Option', optionOrder: 2, isCorrect: true },
        ],
        createdAt: new Date(),
      },
      {
        id: 'aq-code-1',
        paperId: 'paper-audit-01',
        questionId: 'q-code-1',
        questionOrder: 2,
        marks: 10.0,
        negativeMarks: 0.0,
        category: 'CODING',
        createdAt: new Date(),
      },
    ],
  };

  it('1. Coding question with 100% passed test cases receives full marks', () => {
    const answers: AttemptAnswerDto[] = [
      {
        id: 'ans-1',
        attemptId: 'att-1',
        questionId: 'q-mcq-1',
        selectedOptionIds: ['opt-2'], // Correct (+5)
        isMarkedForReview: false,
        answeredAt: new Date(),
        version: 1,
      },
    ];

    const codingSubs = new Map([
      ['q-code-1', { passedTestCount: 4, totalTestCount: 4, status: 'ACCEPTED' }],
    ]);

    const result = scoringService.calculateScore(dummyAssessment, dummyPaper, answers, codingSubs);

    assert.equal(result.totalMarks, 15.0);
    assert.equal(result.obtainedMarks, 15.0);
    assert.equal(result.percentage, 100.0);
    assert.equal(result.correctCount, 2);
    assert.equal(result.incorrectCount, 0);
    assert.equal(result.unansweredCount, 0);
    assert.equal(result.isPassed, true);
  });

  it('2. Coding question with 50% passed test cases receives proportional marks', () => {
    const answers: AttemptAnswerDto[] = [
      {
        id: 'ans-1',
        attemptId: 'att-1',
        questionId: 'q-mcq-1',
        selectedOptionIds: ['opt-2'], // Correct (+5)
        isMarkedForReview: false,
        answeredAt: new Date(),
        version: 1,
      },
    ];

    const codingSubs = new Map([
      ['q-code-1', { passedTestCount: 2, totalTestCount: 4, status: 'WRONG_ANSWER' }], // 50% of 10 marks = +5
    ]);

    const result = scoringService.calculateScore(dummyAssessment, dummyPaper, answers, codingSubs);

    assert.equal(result.totalMarks, 15.0);
    assert.equal(result.obtainedMarks, 10.0); // 5 MCQ + 5 Code
    assert.equal(result.percentage, 66.67);
    assert.equal(result.isPassed, true);
  });

  it('3. Coding question with 0 passed test cases receives 0 marks', () => {
    const answers: AttemptAnswerDto[] = [
      {
        id: 'ans-1',
        attemptId: 'att-1',
        questionId: 'q-mcq-1',
        selectedOptionIds: ['opt-2'], // Correct (+5)
        isMarkedForReview: false,
        answeredAt: new Date(),
        version: 1,
      },
    ];

    const codingSubs = new Map([
      ['q-code-1', { passedTestCount: 0, totalTestCount: 4, status: 'EXECUTION_FAILED' }],
    ]);

    const result = scoringService.calculateScore(dummyAssessment, dummyPaper, answers, codingSubs);

    assert.equal(result.totalMarks, 15.0);
    assert.equal(result.obtainedMarks, 5.0);
    assert.equal(result.incorrectCount, 1);
    assert.equal(result.isPassed, false); // 33.33% < 60% passing mark
  });

  it('4. Unanswered coding question is counted as unanswered with 0 marks', () => {
    const answers: AttemptAnswerDto[] = [
      {
        id: 'ans-1',
        attemptId: 'att-1',
        questionId: 'q-mcq-1',
        selectedOptionIds: ['opt-2'], // Correct (+5)
        isMarkedForReview: false,
        answeredAt: new Date(),
        version: 1,
      },
    ];

    // No coding submission
    const result = scoringService.calculateScore(dummyAssessment, dummyPaper, answers, new Map());

    assert.equal(result.totalMarks, 15.0);
    assert.equal(result.obtainedMarks, 5.0);
    assert.equal(result.unansweredCount, 1);
  });
});
