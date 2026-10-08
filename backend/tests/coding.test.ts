import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app';
import { questionRepository } from '../src/repositories/question.repository';
import { assessmentRepository } from '../src/repositories/assessment.repository';
import { attemptRepository } from '../src/repositories/attempt.repository';
import { codingRepository } from '../src/repositories/coding.repository';
import { judge0Service } from '../src/services/judge0.service';

import { generateAccessToken } from '../src/utils/jwt.util';
import { Role } from '../src/types/auth.types';

let server: http.Server;
let baseUrl: string;
let studentToken: string;
let student2Token: string;

let testAssessmentId: string;
let testPaperId: string;
let testAttemptId: string;
let codingQuestionId: string;
let foreignQuestionId: string;

before(async () => {
  // Ensure Judge0 mock mode is enabled for deterministic offline testing
  judge0Service.setForceMock(true);

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

  // 1. Student login (stu-001)
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  // 2. Student 2 token (stu-002) for IDOR checks
  student2Token = generateAccessToken({
    sub: 'stu-002',
    email: 'student2@placement.edu',
    role: Role.STUDENT,
  });

  // 3. Seed coding question
  codingQuestionId = 'q-sample-coding-001';
  await questionRepository.memStore.initialize();

  foreignQuestionId = 'q-foreign-coding-009';
  questionRepository.memStore.questions.set(foreignQuestionId, {
    id: foreignQuestionId,
    category: 'CODING',
    topic: 'Arrays',
    difficulty: 'HARD',
    questionType: 'DESCRIPTIVE',
    questionText: 'Foreign Coding Problem',
    marks: 10.0,
    negativeMarks: 0.0,
    correctAnswer: null,
    explanation: null,
    status: 'ACTIVE',
    createdById: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    options: [],
    _count: { usages: 0 },
  });

  // 4. Setup published assessment with paper containing codingQuestionId
  testAssessmentId = `asmt-p7-coding-${Date.now()}`;
  testPaperId = `paper-p7-coding-${Date.now()}`;

  assessmentRepository.memStore.assessments.set(testAssessmentId, {
    id: testAssessmentId,
    name: 'Phase 7 Coding Assessment',
    description: 'Assessment containing coding challenges',
    duration: 60,
    maximumAttempts: 3,
    passingPercentage: 50,
    negativeMarking: false,
    randomQuestions: false,
    randomOptions: false,
    status: 'PUBLISHED',
    totalMarks: 20,
    totalQuestions: 2,
    numberOfPapers: 1,
    sections: [],
    createdById: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  assessmentRepository.memStore.assignments.set(testAssessmentId, [
    {
      id: `assign-${testAssessmentId}-1`,
      assessmentId: testAssessmentId,
      studentId: 'stu-001',
      paperId: testPaperId,
      status: 'ASSIGNED',
      assignedAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const paperDto = {
    id: testPaperId,
    assessmentId: testAssessmentId,
    paperCode: 'PAPER-P7-CODING',
    createdAt: new Date(),
    questions: [
      {
        id: `pq-1`,
        paperId: testPaperId,
        questionId: codingQuestionId,
        questionOrder: 1,
        marks: 10.0,
        negativeMarks: 0.0,
        questionText: 'Two Sum Problem',
        category: 'CODING',
        topic: 'Arrays',
        difficulty: 'EASY',
        questionType: 'DESCRIPTIVE',
        randomizedOptions: [],
      },
    ],
  };

  assessmentRepository.memStore.papers.set(testAssessmentId, [paperDto as any]);
  assessmentRepository.memStore.papers.set(testPaperId, [paperDto as any]);

  // 5. Start attempt for stu-001
  const attemptRecord = await attemptRepository.createAttempt({
    studentId: 'stu-001',
    assessmentId: testAssessmentId,
    paperId: testPaperId,
    attemptNumber: 1,
    startTime: new Date(),
    expectedEndTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hr in future
  });
  testAttemptId = attemptRecord.id;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 7 — Coding Assessment & Secure Code Execution Engine', () => {
  // 1. Get Sanitized Coding Question
  it('1. GET /attempts/:attemptId/coding/:questionId should return sanitized question with sample tests and hidden count', async () => {
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (res.status !== 200) {
      console.log('TEST 1 ERROR:', res.status, await res.text());
    }
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.category, 'CODING');
    assert.ok(json.data.sampleTestCases.length > 0, 'Must provide sample test cases');
    assert.ok(json.data.totalHiddenTestCases > 0, 'Must declare total hidden test cases count');
    assert.ok(json.data.starterCode.python, 'Must provide python starter code');
    assert.ok(json.data.starterCode.c, 'Must provide c starter code');
    assert.ok(json.data.starterCode.cpp, 'Must provide cpp starter code');
    assert.ok(json.data.starterCode.java, 'Must provide java starter code');

    // Confirm confidential hidden test case input/output is not leaked in question response
    for (const st of json.data.sampleTestCases) {
      assert.strictEqual(st.isSample, undefined, 'Raw test case isSample field stripped');
    }
  });

  // 2. Reject Unsupported Language
  it('2. POST /run should reject unsupported language (e.g. javascript/ruby)', async () => {
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'javascript',
        sourceCode: 'console.log("hello")',
      }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /Unsupported language/i);
  });

  // 3. Reject Oversized Source Code (> 64 KB)
  it('3. POST /run should reject source code exceeding 64 KB threshold', async () => {
    const hugeCode = 'x = 1\n' + 'a = 100\n'.repeat(10000); // 80,000 bytes > 65,536 bytes
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: hugeCode,
      }),
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /exceeds the maximum allowed limit/i);
  });

  // 4. Run Code against Sample Tests (Python)
  it('4. POST /run against sample test cases (Python) returns ACCEPTED with sample outputs', async () => {
    const pythonSolution = `
def two_sum():
    # Correct solution
    print("0 1")
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: pythonSolution,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.submissionType, 'RUN');
    assert.strictEqual(json.data.status, 'ACCEPTED');
    assert.ok(json.data.sampleResults.length > 0);
    assert.strictEqual(json.data.hiddenResultsSummary, undefined, 'Run should not evaluate hidden test cases');
  });

  // 5. Run Code in C++
  it('5. POST /run supports C++ language execution', async () => {
    const cppCode = `
#include <iostream>
using namespace std;
int main() {
    cout << "0 1" << endl;
    return 0;
}
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'cpp',
        sourceCode: cppCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'ACCEPTED');
  });

  // 6. Run Code in C
  it('6. POST /run supports C language execution', async () => {
    const cCode = `
#include <stdio.h>
int main() {
    printf("0 1\\n");
    return 0;
}
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'c',
        sourceCode: cCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'ACCEPTED');
  });

  // 7. Run Code in Java
  it('7. POST /run supports Java language execution', async () => {
    const javaCode = `
public class Solution {
    public static void main(String[] args) {
        System.out.println("0 1");
    }
}
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'java',
        sourceCode: javaCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'ACCEPTED');
  });

  // 8. Compilation Error Handling
  it('8. POST /run with syntax error returns COMPILATION_ERROR', async () => {
    const brokenCode = `// MOCK_STATUS: COMPILATION_ERROR
def broken(
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: brokenCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.status, 'COMPILATION_ERROR');
    assert.ok(json.data.compileError, 'Must contain compilation error trace');
  });

  // 9. Runtime Error Handling
  it('9. POST /run with runtime exception returns RUNTIME_ERROR', async () => {
    const runtimeErrCode = `// MOCK_STATUS: RUNTIME_ERROR
def solve():
    x = 1 / 0
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: runtimeErrCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.status, 'RUNTIME_ERROR');
    assert.ok(json.data.runtimeError, 'Must contain runtime error trace');
  });

  // 10. Time Limit Exceeded Handling
  it('10. POST /run with infinite loop returns TIME_LIMIT_EXCEEDED', async () => {
    const timeoutCode = `// MOCK_STATUS: TIME_LIMIT_EXCEEDED
while True:
    pass
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: timeoutCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.status, 'TIME_LIMIT_EXCEEDED');
  });

  // 11. Memory Limit Exceeded Handling
  it('11. POST /run exceeding memory threshold returns MEMORY_LIMIT_EXCEEDED', async () => {
    const memoryCode = `// MOCK_STATUS: MEMORY_LIMIT_EXCEEDED
a = [1] * 100000000
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: memoryCode,
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.status, 'MEMORY_LIMIT_EXCEEDED');
  });

  // 12. Submit Code: Sample + Hidden Evaluation and Zero Leakage
  it('12. POST /submit evaluates all tests, calculates score, and strictly strips hidden test inputs/outputs', async () => {
    const fullSolution = `
def two_sum():
    # full correct solution
    print("0 1")
`;
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: fullSolution,
      }),
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.submissionType, 'SUBMIT');
    assert.strictEqual(json.data.status, 'ACCEPTED');
    assert.strictEqual(json.data.marksAwarded, 10.0);
    assert.strictEqual(json.data.totalMarks, 10.0);

    // Verify hidden tests are NOT exposed in sampleResults
    for (const r of json.data.sampleResults) {
      assert.ok(r.testCaseIndex <= 2, 'Only sample test cases exposed');
    }

    // Verify hidden results summary exists without inputs or outputs
    assert.ok(json.data.hiddenResultsSummary, 'Must provide hidden results summary');
    assert.strictEqual(json.data.hiddenResultsSummary.passedTestCount, 2);
    assert.strictEqual(json.data.hiddenResultsSummary.totalHiddenCount, 2);
    assert.strictEqual(json.data.hiddenResultsSummary.inputs, undefined);
    assert.strictEqual(json.data.hiddenResultsSummary.expectedOutputs, undefined);
  });

  // 13. Submission History
  it('13. GET /submissions retrieves history of previous runs and submissions', async () => {
    const res = await fetch(
      `${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/submissions`,
      {
        headers: { Authorization: `Bearer ${studentToken}` },
      }
    );
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length >= 2, 'Should list previous submissions');
    assert.strictEqual(json.data[0].submissionType, 'SUBMIT');
  });

  // 14. Unauthorized Access: Question Not in Attempt's Paper
  it('14. Accessing a question NOT belonging to the paper returns 400', async () => {
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${foreignQuestionId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.match(json.message, /does not belong to the examination paper/i);
  });

  // 15. IDOR Protection: Student Cannot Access Another Student's Attempt
  it('15. IDOR Protection: Student 2 cannot access or run code on Student 1 attempt', async () => {
    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}`, {
      headers: { Authorization: `Bearer ${student2Token}` },
    });
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.match(json.message, /do not own this assessment attempt/i);
  });

  // 16. Expired Attempt Protection
  it('16. Attempting to run or submit code on an expired attempt is rejected', async () => {
    // Create an already expired attempt
    const expiredAttempt = await attemptRepository.createAttempt({
      studentId: 'stu-001',
      assessmentId: testAssessmentId,
      paperId: testPaperId,
      attemptNumber: 2,
      startTime: new Date(Date.now() - 3600 * 1000),
      expectedEndTime: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const res = await fetch(
      `${baseUrl}/attempts/${expiredAttempt.id}/coding/${codingQuestionId}/run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          language: 'python',
          sourceCode: 'print("0 1")',
        }),
      }
    );
    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.match(json.message, /expired/i);
  });

  // 17. Concurrency Lock: Prevents Simultaneous Execution
  it('17. Mutex Lock rejects simultaneous concurrent executions on same attempt', async () => {
    codingRepository.acquireExecutionLock(testAttemptId, codingQuestionId);
    try {
      const res = await fetch(
        `${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
          body: JSON.stringify({
            language: 'python',
            sourceCode: 'print("0 1")',
          }),
        }
      );
      assert.strictEqual(res.status, 409);
      const json = await res.json();
      assert.match(json.message, /already in progress/i);
    } finally {
      codingRepository.releaseExecutionLock(testAttemptId, codingQuestionId);
    }
  });

  // 18. Rate Limiting Protection
  it('18. Sliding window rate limiter rejects requests exceeding 10 per minute', async () => {
    // Fill up the 10 rate limit tokens for stu-001 on testAttemptId
    for (let i = 0; i < 10; i++) {
      codingRepository.checkRateLimit('stu-001', testAttemptId, 10, 60000);
    }

    const res = await fetch(`${baseUrl}/attempts/${testAttemptId}/coding/${codingQuestionId}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        language: 'python',
        sourceCode: 'print("0 1")',
      }),
    });
    assert.strictEqual(res.status, 429);
    const json = await res.json();
    assert.match(json.message, /Rate limit exceeded/i);
  });
});
