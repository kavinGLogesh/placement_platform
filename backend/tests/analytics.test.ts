import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { attemptRepository } from '../src/repositories/attempt.repository.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { codingRepository } from '../src/repositories/coding.repository.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;
let studentToken: string;
const studentId = 'stu-001';

const testAssessmentId = 'asmt-p8-test-1';
const testAttemptId = 'att-p8-test-1';
const testResultId = 'res-p8-test-1';

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

  // 1. Admin login
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
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

  // 3. Seed Assessment in memory
  assessmentRepository.memStore.assessments.set(testAssessmentId, {
    id: testAssessmentId,
    name: 'Placement Aptitude & Coding Test',
    description: 'Phase 8 Benchmark Assessment',
    duration: 60,
    maximumAttempts: 1,
    negativeMarking: false,
    randomQuestions: false,
    randomOptions: false,
    passingPercentage: 60.0,
    startDate: new Date('2026-09-01T10:00:00Z'),
    endDate: new Date('2026-09-30T10:00:00Z'),
    status: 'PUBLISHED',
    totalMarks: 50.0,
    totalQuestions: 5,
    numberOfPapers: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Seed Questions in memory
  questionRepository.memStore.questions.set('q-p8-1', {
    id: 'q-p8-1',
    category: 'QUANTITATIVE_APTITUDE',
    topic: 'Percentage',
    difficulty: 'EASY',
    questionType: 'SINGLE_CHOICE',
    questionText: 'What is 20% of 150?',
    marks: 10,
    negativeMarks: 0,
    status: 'ACTIVE',
    options: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  questionRepository.memStore.questions.set('q-p8-2', {
    id: 'q-p8-2',
    category: 'LOGICAL_REASONING',
    topic: 'Syllogism',
    difficulty: 'MEDIUM',
    questionType: 'SINGLE_CHOICE',
    questionText: 'All cats are mammals. All mammals are animals.',
    marks: 10,
    negativeMarks: 0,
    status: 'ACTIVE',
    options: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 5. Seed Attempt in memory
  attemptRepository.memStore.attempts.set(testAttemptId, {
    id: testAttemptId,
    studentId,
    assessmentId: testAssessmentId,
    paperId: 'paper-p8-1',
    attemptNumber: 1,
    startTime: new Date('2026-09-05T10:00:00Z'),
    expectedEndTime: new Date('2026-09-05T11:00:00Z'),
    status: 'SUBMITTED',
    currentQuestion: 1,
    submittedAt: new Date('2026-09-05T10:45:00Z'),
    createdAt: new Date('2026-09-05T10:00:00Z'),
    updatedAt: new Date('2026-09-05T10:45:00Z'),
  });

  // Seed Answers in memory
  const ansMap = new Map();
  ansMap.set('q-p8-1', {
    id: 'ans-p8-1',
    attemptId: testAttemptId,
    questionId: 'q-p8-1',
    isMarkedForReview: false,
    answeredAt: new Date(),
    version: 1,
    isCorrect: true,
    marksAwarded: 10,
  });
  ansMap.set('q-p8-2', {
    id: 'ans-p8-2',
    attemptId: testAttemptId,
    questionId: 'q-p8-2',
    isMarkedForReview: false,
    answeredAt: new Date(),
    version: 1,
    isCorrect: false,
    marksAwarded: 0,
  });
  attemptRepository.memStore.answers.set(testAttemptId, ansMap);

  // 6. Seed Result in memory
  attemptRepository.memStore.results.set(testResultId, {
    id: testResultId,
    attemptId: testAttemptId,
    assessmentId: testAssessmentId,
    studentId,
    totalMarks: 50.0,
    obtainedMarks: 40.0,
    percentage: 80.0,
    correctCount: 4,
    incorrectCount: 1,
    unansweredCount: 0,
    accuracy: 80.0,
    isPassed: true,
    createdAt: new Date('2026-09-05T10:45:00Z'),
    updatedAt: new Date('2026-09-05T10:45:00Z'),
    assessment: {
      id: testAssessmentId,
      name: 'Placement Aptitude & Coding Test',
      duration: 60,
      passingPercentage: 60.0,
    },
  });

  // 7. Seed Coding Submissions
  codingRepository.memStore.submissions.set('sub-p8-1', {
    id: 'sub-p8-1',
    attemptId: testAttemptId,
    questionId: 'q-p8-code',
    studentId,
    language: 'PYTHON' as any,
    sourceCode: 'def solve(): pass',
    submissionType: 'SUBMIT' as any,
    status: 'ACCEPTED' as any,
    compileError: null,
    runtimeError: null,
    passedTestCount: 5,
    totalTestCount: 5,
    executionTime: 0.12,
    memoryUsed: 12.4,
    judge0Token: null,
    judge0Status: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 8 — Results, Analytics & Dashboards Automated Verification', () => {
  // 1. RESULTS REGISTRY & PAGINATION
  it('GET /api/results - returns paginated results list with correct schema', async () => {
    const res = await fetch(`${baseUrl}/results?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.items));
    assert.ok(json.data.pagination);
    assert.equal(json.data.pagination.currentPage, 1);
    assert.equal(json.data.pagination.limit, 10);
    assert.ok(json.data.pagination.totalCount >= 1);
  });

  it('GET /api/results - filters by isPassed=true', async () => {
    const res = await fetch(`${baseUrl}/results?isPassed=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    for (const item of json.data.items) {
      assert.equal(item.isPassed, true);
    }
  });

  it('GET /api/results - searches by student name or assessment title', async () => {
    const res = await fetch(`${baseUrl}/results?search=Aptitude`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.items.length >= 1);
    assert.ok(json.data.items[0].assessmentTitle.includes('Aptitude'));
  });

  it('GET /api/results - sorts by percentage descending', async () => {
    const res = await fetch(`${baseUrl}/results?sortBy=percentage&sortOrder=desc`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.items.length >= 1);
  });

  // 2. ADMIN ANALYTICS SUMMARY
  it('GET /api/analytics - returns authoritative executive KPI metrics', async () => {
    const res = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    const summary = json.data;
    assert.ok(typeof summary.totalStudents === 'number');
    assert.ok(typeof summary.activeStudents === 'number');
    assert.ok(typeof summary.totalAssessments === 'number');
    assert.ok(typeof summary.averageScore === 'number');
    assert.ok(typeof summary.passPercentage === 'number');
    assert.ok(typeof summary.overallParticipationRate === 'number');
    assert.ok(Array.isArray(summary.recentResults));
  });

  // 3. DEPARTMENT COMPARISON
  it('GET /api/analytics/departments - returns department performance breakdown', async () => {
    const res = await fetch(`${baseUrl}/analytics/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 1);
    const dept = json.data[0];
    assert.ok(dept.departmentId);
    assert.ok(dept.departmentName);
    assert.ok(typeof dept.averageScore === 'number');
    assert.ok(typeof dept.participationRate === 'number');
    assert.ok(typeof dept.passPercentage === 'number');
  });

  // 4. TOPIC & CATEGORY ANALYTICS
  it('GET /api/analytics/topics - returns strengths/weaknesses by category and topic', async () => {
    const res = await fetch(`${baseUrl}/analytics/topics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(Array.isArray(json.data.categories));
    assert.ok(Array.isArray(json.data.topics));

    // Verify categories format
    const cat = json.data.categories.find((c: any) => c.category === 'QUANTITATIVE_APTITUDE');
    assert.ok(cat);
    assert.ok(typeof cat.accuracy === 'number');

    // Verify topics format
    if (json.data.topics.length > 0) {
      const top = json.data.topics[0];
      assert.ok(top.topic);
      assert.ok(['STRONG', 'AVERAGE', 'WEAK'].includes(top.strength));
    }
  });

  // 5. PLACEMENT FUNNEL
  it('GET /api/analytics/funnel - returns placement funnel stages with Interview=0 and Selected=0', async () => {
    const res = await fetch(`${baseUrl}/analytics/funnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(typeof json.data.totalEligible === 'number');
    assert.ok(Array.isArray(json.data.stages));

    const stageNames = json.data.stages.map((s: any) => s.stage);
    assert.deepEqual(stageNames, [
      'Registered',
      'Appeared',
      'Completed',
      'Passed',
      'Interview',
      'Selected',
    ]);

    const interviewStage = json.data.stages.find((s: any) => s.stage === 'Interview');
    const selectedStage = json.data.stages.find((s: any) => s.stage === 'Selected');
    assert.equal(interviewStage.count, 0);
    assert.equal(interviewStage.conversionRate, 0);
    assert.equal(interviewStage.isImplemented, false);
    assert.equal(selectedStage.count, 0);
    assert.equal(selectedStage.conversionRate, 0);
    assert.equal(selectedStage.isImplemented, false);
  });

  // 6. ADMIN STUDENT DRILLDOWN
  it('GET /api/analytics/students/:id - returns student profile, history, category and coding stats', async () => {
    const res = await fetch(`${baseUrl}/analytics/students/${studentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.student.id, studentId);
    assert.ok(json.data.student.name);
    assert.ok(json.data.summary);
    assert.ok(Array.isArray(json.data.assessmentHistory));
    assert.ok(Array.isArray(json.data.categoryPerformance));
    assert.ok(json.data.codingPerformance);
    assert.equal(json.data.codingPerformance.acceptedCount, 1);
  });

  // 7. STUDENT DASHBOARD API
  it('GET /api/student/dashboard - returns personalized KPIs, recent results, upcoming tests', async () => {
    const res = await fetch(`${baseUrl}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.summary);
    assert.ok(typeof json.data.summary.completedAssessments === 'number');
    assert.ok(typeof json.data.summary.averageScore === 'number');
    assert.ok(Array.isArray(json.data.recentResults));
    assert.ok(Array.isArray(json.data.upcomingAssessments));
  });

  // 8. STUDENT PERFORMANCE API
  it('GET /api/student/performance - returns score trends, category mastery, coding metrics', async () => {
    const res = await fetch(`${baseUrl}/student/performance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.summary);
    assert.ok(Array.isArray(json.data.trends));
    assert.ok(Array.isArray(json.data.categoryPerformance));
    assert.ok(Array.isArray(json.data.topicPerformance));
    assert.ok(json.data.codingPerformance);
    assert.ok(Array.isArray(json.data.assessmentHistory));
  });

  // 9. RBAC & IDOR GUARDS
  it('GET /api/results - student token is blocked with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('GET /api/analytics - student token is blocked with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('GET /api/analytics/departments - student token is blocked with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/analytics/departments`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('GET /api/analytics/students/:id - student token is blocked with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/analytics/students/${studentId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 403);
  });

  it('GET /api/results - unauthenticated request returns 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/results`);
    assert.equal(res.status, 401);
  });

  it('Zero Edge Case - safe calculation when no attempts or records exist', async () => {
    const res = await fetch(`${baseUrl}/analytics/departments?assessmentId=non-existent-id`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    for (const dept of json.data) {
      assert.equal(dept.participatingStudents, 0);
      assert.equal(dept.participationRate, 0);
      assert.equal(dept.averageScore, 0);
      assert.equal(dept.passPercentage, 0);
    }
  });
});
