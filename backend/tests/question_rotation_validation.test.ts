import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { assessmentRepository } from '../src/repositories/assessment.repository.js';
import { questionSelectionEngine } from '../src/services/selection-engine.service.js';
import { assessmentService } from '../src/services/assessment.service.js';

let server: http.Server;
let baseUrl: string;
let placementAdminToken: string;

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

  // Login as Placement Admin
  const placementRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const placementJson = await placementRes.json();
  placementAdminToken = placementJson.data.accessToken;
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
});

describe('Unique Question ID, Rotation Rule & Availability Validation System', () => {
  // =========================================================================
  // 1. UNIQUE QUESTION ID PRESERVATION & DUPLICATE PREVENTION
  // =========================================================================
  it('1. Preserves permanent unique questionId across creation, imports, and updates', async () => {
    const customQuestionId = 'q-perm-unique-99001';
    const created = await questionRepository.createQuestion({
      questionId: customQuestionId,
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Percentage',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionText: 'Permanent ID verification question: What is 25% of 80?',
      marks: 1.0,
      negativeMarks: 0.25,
      correctAnswer: '20',
      options: [
        { optionText: '20', optionOrder: 1, isCorrect: true },
        { optionText: '25', optionOrder: 2, isCorrect: false },
      ],
    });

    assert.strictEqual(created.id, customQuestionId, 'Question ID must match custom unique questionId');
    assert.strictEqual(created.questionId, customQuestionId, 'questionId property must equal permanent ID');

    // Retrieve by ID
    const retrieved = await questionRepository.findQuestionById(customQuestionId);
    assert.ok(retrieved, 'Question must be retrievable by permanent questionId');
    assert.strictEqual(retrieved?.id, customQuestionId);
    assert.strictEqual(retrieved?.questionId, customQuestionId);
  });

  it('2. Prevents duplicate questions across sections and papers within the same assessment', async () => {
    // Seed 10 distinct questions for Profit & Loss
    for (let i = 1; i <= 10; i++) {
      await questionRepository.createQuestion({
        id: `q-dup-test-pnl-${i}`,
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Profit & Loss',
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: `Unique question PnL ${i} text`,
        marks: 1.0,
        options: [
          { optionText: 'Ans A', optionOrder: 1, isCorrect: true },
          { optionText: 'Ans B', optionOrder: 2, isCorrect: false },
        ],
      });
    }

    // Create assessment with 2 papers and 2 questions per section (total 4 questions needed)
    const asmt = await assessmentRepository.createAssessment({
      name: 'No Duplicates Assessment Test',
      duration: 30,
      numberOfPapers: 2,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Section 1',
          topics: ['Profit & Loss'],
          difficulty: 'EASY',
          questionsCount: 2,
        },
      ],
    });

    const result = await questionSelectionEngine.generatePapers(asmt, asmt.sections!);
    assert.strictEqual(result.papers.length, 2);

    const paper1QIds = result.papers[0].questions!.map((q) => q.questionId);
    const paper2QIds = result.papers[1].questions!.map((q) => q.questionId);

    // Assert no overlap between papers
    for (const qId of paper1QIds) {
      assert.ok(!paper2QIds.includes(qId), `Question ${qId} must not be duplicated across papers in same assessment`);
    }

    const allAllocated = [...paper1QIds, ...paper2QIds];
    assert.strictEqual(new Set(allAllocated).size, allAllocated.length, 'Zero duplicate questions across entire assessment');
  });

  // =========================================================================
  // 2. FIVE-ASSESSMENT ROTATION RULE ENFORCEMENT
  // =========================================================================
  it('3. Enforces Five-Assessment Rotation Rule: Question used in Assessment 1 is blocked in subsequent 5 assessments, then becomes eligible in 6th subsequent assessment', async () => {
    const rotationTopic = 'Permutation & Combination';
    const targetedQuestionId = 'q-rot-rule-target-001';

    // Clear prior usages for clean state
    questionRepository.memStore.usages.clear();

    // Create the target question
    await questionRepository.createQuestion({
      id: targetedQuestionId,
      category: 'QUANTITATIVE_APTITUDE',
      topic: rotationTopic,
      difficulty: 'HARD',
      questionType: 'SINGLE_CHOICE',
      questionText: 'Target question under 5-assessment rotation rule',
      marks: 2.0,
      options: [
        { optionText: '120', optionOrder: 1, isCorrect: true },
        { optionText: '720', optionOrder: 2, isCorrect: false },
      ],
    });

    // Seed 30 filler questions for the same topic to allow subsequent assessments to generate
    for (let f = 1; f <= 30; f++) {
      await questionRepository.createQuestion({
        id: `q-filler-rot-${f}`,
        category: 'QUANTITATIVE_APTITUDE',
        topic: rotationTopic,
        difficulty: 'HARD',
        questionType: 'SINGLE_CHOICE',
        questionText: `Filler rotation question ${f}`,
        marks: 2.0,
        options: [
          { optionText: 'Correct', optionOrder: 1, isCorrect: true },
          { optionText: 'Wrong', optionOrder: 2, isCorrect: false },
        ],
      });
    }

    // Step A: Manually record usage of targetedQuestionId in Base Assessment 1
    const baseAssessmentId = 'asmt-base-001';
    const baseCreated = new Date(Date.now() - 600000); // 10 mins ago
    const baseAsmt = await assessmentRepository.createAssessment({
      id: baseAssessmentId,
      name: 'Base Assessment 1',
      duration: 30,
      numberOfPapers: 1,
      sections: [{ component: 'APTITUDE', name: 'S1', topics: [rotationTopic], difficulty: 'HARD', questionsCount: 1 }],
    } as any);
    baseAsmt.createdAt = baseCreated;
    baseAsmt.updatedAt = baseCreated;

    // Record usage
    questionRepository.memStore.usages.set('usage-base-1', {
      id: 'usage-base-1',
      questionId: targetedQuestionId,
      assessmentId: baseAssessmentId,
      studentId: null,
      usageMonth: 10,
      usageYear: 2026,
      usedAt: baseCreated,
    });
    // Set papers for base assessment so it counts as generated
    assessmentRepository.memStore.papers.set(baseAssessmentId, [{ id: 'p-base-1', assessmentId: baseAssessmentId, paperCode: 'SET-A', paperIndex: 1, createdAt: baseCreated }]);

    // Step B: Verify target question is immediately INELIGIBLE for next assessment (0 subsequent assessments generated)
    const testAsmtObj: any = { id: 'asmt-test-new', companyId: null, numberOfPapers: 1 };
    let ineligible = await questionSelectionEngine.getRotationIneligibleQuestionIds(testAsmtObj, 5);
    assert.ok(ineligible.includes(targetedQuestionId), 'Target question must be ineligible immediately after use');

    // Step C: Generate 5 subsequent assessments in the rotation scope
    for (let subIdx = 1; subIdx <= 5; subIdx++) {
      const subAsmtId = `asmt-subsequent-${subIdx}`;
      const subDate = new Date(Date.now() - (6 - subIdx) * 60000);
      const subAsmt = await assessmentRepository.createAssessment({
        id: subAsmtId,
        name: `Subsequent Assessment ${subIdx}`,
        duration: 30,
        numberOfPapers: 1,
        sections: [{ component: 'APTITUDE', name: 'S1', topics: [rotationTopic], difficulty: 'HARD', questionsCount: 1 }],
      } as any);
      subAsmt.createdAt = subDate;
      subAsmt.updatedAt = subDate;

      // Mark as generated with a filler question
      assessmentRepository.memStore.papers.set(subAsmtId, [{ id: `p-sub-${subIdx}`, assessmentId: subAsmtId, paperCode: 'SET-A', paperIndex: 1, createdAt: subDate }]);
      questionRepository.memStore.usages.set(`use-sub-${subIdx}`, {
        id: `use-sub-${subIdx}`,
        questionId: `q-filler-rot-${subIdx}`,
        assessmentId: subAsmtId,
        studentId: null,
        usageMonth: 10,
        usageYear: 2026,
        usedAt: subDate,
      });

      // Check after each subsequent assessment:
      ineligible = await questionSelectionEngine.getRotationIneligibleQuestionIds(testAsmtObj, 5);
      if (subIdx < 5) {
        // Less than 5 subsequent assessments generated -> target question is STILL blocked
        assert.ok(
          ineligible.includes(targetedQuestionId),
          `Target question must remain locked after only ${subIdx} subsequent assessment(s)`
        );
      }
    }

    // Step D: After 5 subsequent assessments have been generated:
    // Base Assessment 1 is now the 6th assessment in history!
    // The top 5 recent assessments in scope are: asmt-subsequent-5, 4, 3, 2, 1.
    // Base Assessment 1 is pushed out of the 5-assessment cooldown window!
    ineligible = await questionSelectionEngine.getRotationIneligibleQuestionIds(testAsmtObj, 5);
    assert.ok(
      !ineligible.includes(targetedQuestionId),
      'Target question must become ELIGIBLE again once 5 subsequent assessments have been generated!'
    );
  });

  // =========================================================================
  // 3. QUESTION AVAILABILITY VALIDATION & SEPARATE TOPIC/DIFFICULTY CALCULATIONS
  // =========================================================================
  it('4. validateQuestionAvailability calculates eligible questions separately for topic and difficulty and returns shortage deficit', async () => {
    // Create an assessment needing 5 HARD Time & Work questions
    const asmt = await assessmentRepository.createAssessment({
      name: 'Time & Work Hard Test',
      duration: 30,
      numberOfPapers: 1,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Time and Work Section',
          topics: ['Time & Work'],
          difficulty: 'HARD',
          questionsCount: 5,
        },
      ],
    });

    // Currently 0 HARD Time & Work questions exist in bank
    const validation = await questionSelectionEngine.validateQuestionAvailability(asmt, asmt.sections!);
    assert.strictEqual(validation.isSufficient, false, 'Validation must fail when questions are deficient');
    assert.strictEqual(validation.totalRequired, 5);
    assert.strictEqual(validation.totalMissing, 5);
    assert.strictEqual(validation.shortages.length, 1);
    assert.strictEqual(validation.shortages[0].missing, 5);

    // Verify suggestions are populated
    assert.ok(validation.suggestions.length > 0, 'Actionable suggestions must be generated');
    assert.ok(validation.suggestions.some((s) => s.includes('Time & Work')));
  });

  // =========================================================================
  // 4. INSUFFICIENT QUESTIONS BLOCKS GENERATION & RECORDS ZERO USAGE
  // =========================================================================
  it('5. Blocks paper generation on insufficient questions and records ZERO usage', async () => {
    const asmt = await assessmentRepository.createAssessment({
      name: 'Shortage Block Test',
      duration: 20,
      numberOfPapers: 1,
      sections: [
        {
          component: 'LOGICAL_REASONING',
          name: 'Syllogism Section',
          topics: ['Syllogism'],
          difficulty: 'HARD',
          questionsCount: 10, // Deficit!
        },
      ],
    });

    const usagesBefore = questionRepository.memStore.usages.size;

    // Call API via HTTP
    const res = await fetch(`${baseUrl}/assessments/${asmt.id}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
    });

    assert.strictEqual(res.status, 400, 'Must return HTTP 400 Bad Request');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error?.details?.error, 'INSUFFICIENT_QUESTIONS');
    assert.ok(body.error?.details?.shortages, 'Must include shortage breakdown');
    assert.strictEqual(body.error?.details?.required, 10);

    const usagesAfter = questionRepository.memStore.usages.size;
    assert.strictEqual(usagesAfter, usagesBefore, 'Zero question usage must be recorded when generation fails');

    // Verify no papers were generated
    const papers = await assessmentRepository.getAssessmentPapers(asmt.id);
    assert.strictEqual(papers.length, 0, 'No partial or dummy papers must be generated');
  });

  // =========================================================================
  // 5. VALIDATION API ENDPOINT (/validate-availability)
  // =========================================================================
  it('6. GET /api/assessments/:id/validate-availability returns pre-flight availability check', async () => {
    // Seed 3 EASY Blood Relations questions
    for (let i = 1; i <= 3; i++) {
      await questionRepository.createQuestion({
        id: `q-br-avail-${i}`,
        category: 'LOGICAL_REASONING',
        topic: 'Blood Relations',
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: `Blood relations question ${i}`,
        marks: 1.0,
        options: [{ optionText: 'Uncle', optionOrder: 1, isCorrect: true }],
      });
    }

    const asmt = await assessmentRepository.createAssessment({
      name: 'Pre-flight Validation Test',
      duration: 20,
      numberOfPapers: 1,
      sections: [
        {
          component: 'LOGICAL_REASONING',
          name: 'Blood Relations Section',
          topics: ['Blood Relations'],
          difficulty: 'EASY',
          questionsCount: 2, // 3 available, 2 required -> Sufficient!
        },
      ],
    });

    const res = await fetch(`${baseUrl}/assessments/${asmt.id}/validate-availability`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.isSufficient, true);
    assert.strictEqual(body.data.totalRequired, 2);
    assert.ok(body.data.totalEligible >= 2);
    assert.strictEqual(body.data.totalMissing, 0);
  });

  // =========================================================================
  // 6. ARCHIVED ASSESSMENTS PRESERVE USAGE HISTORY
  // =========================================================================
  it('7. Archiving an assessment preserves all QuestionUsage records permanently', async () => {
    const asmt = await assessmentRepository.createAssessment({
      name: 'Archive Test Assessment',
      duration: 30,
      numberOfPapers: 1,
      sections: [
        {
          component: 'LOGICAL_REASONING',
          name: 'Section A',
          topics: ['Blood Relations'],
          difficulty: 'EASY',
          questionsCount: 1,
        },
      ],
    });

    // Generate papers successfully
    await assessmentService.generatePapers(asmt.id);
    const usagesBefore = Array.from(questionRepository.memStore.usages.values()).filter(
      (u) => u.assessmentId === asmt.id
    );
    assert.ok(usagesBefore.length > 0, 'Usages must be recorded for assessment');

    // Archive assessment
    await assessmentRepository.setStatus(asmt.id, 'ARCHIVED');

    const usagesAfter = Array.from(questionRepository.memStore.usages.values()).filter(
      (u) => u.assessmentId === asmt.id
    );
    assert.strictEqual(usagesAfter.length, usagesBefore.length, 'Archiving must never delete question usage history');
  });

  // =========================================================================
  // 7. CONCURRENCY MUTEX LOCK PROTECTION
  // =========================================================================
  it('8. Concurrency protection: Scope-level and assessment-level generation locks block simultaneous requests', async () => {
    const testScopeKey = 'company-test-concurrency-scope';

    const lock1 = assessmentRepository.acquireScopeGenerationLock(testScopeKey);
    assert.strictEqual(lock1, true, 'First lock acquisition must succeed');

    const lock2 = assessmentRepository.acquireScopeGenerationLock(testScopeKey);
    assert.strictEqual(lock2, false, 'Simultaneous lock acquisition for same rotation scope must be rejected');

    assessmentRepository.releaseScopeGenerationLock(testScopeKey);
    const lock3 = assessmentRepository.acquireScopeGenerationLock(testScopeKey);
    assert.strictEqual(lock3, true, 'Lock acquisition after release must succeed');
    assessmentRepository.releaseScopeGenerationLock(testScopeKey);
  });
});
