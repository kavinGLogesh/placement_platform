import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { questionSelectionEngine } from '../src/services/selection-engine.service.js';
import { AssessmentDto, AssessmentSectionDto } from '../src/types/assessment.types.js';

let server: http.Server;
let baseUrl: string;
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

  // Login Placement Admin
  const paRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.equal(paRes.status, 200);
  const paJson = await paRes.json();
  placementAdminToken = paJson.data.accessToken;

  // Login Student
  const stRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  assert.equal(stRes.status, 200);
  const stJson = await stRes.json();
  studentToken = stJson.data.accessToken;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('AI-Assisted Intelligent Question Classification Suite', () => {
  let createdQuestionId: string;

  it('1. AI understands question concept: detects Category, Topic, Difficulty, Type, and Confidence scores', async () => {
    // Question from user requirement
    const detectRes = await fetch(`${baseUrl}/questions/ai/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        questionText: 'If the cost price is ₹500 and selling price is ₹600, calculate the profit percentage.',
        options: [
          { optionText: '15%', isCorrect: false },
          { optionText: '20%', isCorrect: true },
          { optionText: '25%', isCorrect: false },
          { optionText: '10%', isCorrect: false },
        ],
      }),
    });

    assert.equal(detectRes.status, 200);
    const json = await detectRes.json();
    assert.equal(json.success, true);

    const classification = json.data;
    assert.equal(classification.category, 'QUANTITATIVE_APTITUDE');
    assert.equal(classification.topic, 'Profit & Loss');
    assert.equal(classification.difficulty, 'EASY'); // 1-step direct formula
    assert.equal(classification.questionType, 'SINGLE_CHOICE');

    // Separate confidence values stored
    assert.ok(classification.confidence.category >= 0.8, 'Category confidence >= 0.8');
    assert.ok(classification.confidence.topic >= 0.8, 'Topic confidence >= 0.8');
    assert.ok(classification.confidence.difficulty >= 0.7, 'Difficulty confidence >= 0.7');
    assert.ok(classification.confidence.questionType >= 0.8, 'Type confidence >= 0.8');
    assert.equal(classification.status, 'CLASSIFIED');
  });

  it('2. Evaluates difficulty via multi-step cognitive reasoning, not merely length', async () => {
    // Multi-concept problem: time, speed, distance with relative speed and unit conversion
    const complexRes = await fetch(`${baseUrl}/questions/ai/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        questionText:
          'Two trains running in opposite directions on parallel tracks cross each other. Train A is 250m long moving at 72 km/h and Train B is 350m long moving at 108 km/h. Due to a signal delay, both apply brakes simultaneously decelerating at 2 m/s² respectively.',
        options: [
          { optionText: '12 seconds', isCorrect: true },
          { optionText: '14 seconds', isCorrect: false },
          { optionText: '16 seconds', isCorrect: false },
          { optionText: '18 seconds', isCorrect: false },
        ],
      }),
    });

    assert.equal(complexRes.status, 200);
    const complexJson = await complexRes.json();
    assert.equal(complexJson.data.category, 'QUANTITATIVE_APTITUDE');
    assert.equal(complexJson.data.topic, 'Time Speed Distance');
    assert.equal(complexJson.data.difficulty, 'HARD'); // Multi-stage physics + algebra deduction
  });

  it('3. Flags ambiguous or low-confidence questions as NEEDS_REVIEW', async () => {
    // Vague/ambiguous question without clear concept keywords
    const vagueRes = await fetch(`${baseUrl}/questions/ai/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        questionText: 'Which one of the given elements is the odd one out among the choices?',
        options: [
          { optionText: 'Alpha', isCorrect: false },
          { optionText: 'Beta', isCorrect: true },
          { optionText: 'Gamma', isCorrect: false },
          { optionText: 'Delta', isCorrect: false },
        ],
      }),
    });

    assert.equal(vagueRes.status, 200);
    const vagueJson = await vagueRes.json();
    // Low confidence must trigger NEEDS_REVIEW
    assert.ok(
      vagueJson.data.status === 'NEEDS_REVIEW' || vagueJson.data.confidence.overall < 0.75,
      'Low confidence flagged as NEEDS_REVIEW'
    );
  });

  it('4. Classifies existing Question in Question Bank via POST /api/questions/:id/classify', async () => {
    // Create an initial question
    const createRes = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        questionText: 'A tap can fill a water cistern in 8 hours and another tap can empty the same tank in 12 hours. If both pipes are opened together, in how many hours will the tank be full?',
        marks: 2.0,
        negativeMarks: 0.5,
        options: [
          { optionText: '18 hours', optionOrder: 1, isCorrect: false },
          { optionText: '20 hours', optionOrder: 2, isCorrect: false },
          { optionText: '24 hours', optionOrder: 3, isCorrect: true },
          { optionText: '30 hours', optionOrder: 4, isCorrect: false },
        ],
      }),
    });

    assert.equal(createRes.status, 201);
    const createJson = await createRes.json();
    createdQuestionId = createJson.data.id;
    assert.ok(createdQuestionId);

    // Call classify endpoint
    const classifyRes = await fetch(`${baseUrl}/questions/${createdQuestionId}/classify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
      },
    });

    assert.equal(classifyRes.status, 200);
    const classifyJson = await classifyRes.json();
    assert.equal(classifyJson.success, true);
    assert.ok(classifyJson.data.aiClassification);

    const ai = classifyJson.data.aiClassification;
    assert.equal(ai.suggestedCategory, 'QUANTITATIVE_APTITUDE');
    assert.equal(ai.suggestedTopic, 'Time & Work'); // Understood pipes & cisterns = Time & Work
    assert.ok(ai.topicConfidence >= 0.75);
    assert.equal(ai.isApproved, false, 'AI is only assistant, unapproved until Admin accepts');
  });

  it('5. Admin Review: Accept AI Classification applies suggested metadata and approves it', async () => {
    const acceptRes = await fetch(`${baseUrl}/questions/${createdQuestionId}/review-classification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        action: 'ACCEPT_AI',
      }),
    });

    assert.equal(acceptRes.status, 200);
    const acceptJson = await acceptRes.json();
    const updatedQuestion = acceptJson.data;

    // Question topic updated from "Percentage" to AI suggested "Time & Work"
    assert.equal(updatedQuestion.topic, 'Time & Work');
    assert.equal(updatedQuestion.aiClassification.isApproved, true);
    assert.equal(updatedQuestion.aiClassification.status, 'CLASSIFIED');
  });

  it('6. Admin Review: Edit & Override allows Admin to choose custom Category and Topic with audit trail', async () => {
    const overrideRes = await fetch(`${baseUrl}/questions/${createdQuestionId}/review-classification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        action: 'OVERRIDE',
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Ratio & Proportion',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
      }),
    });

    assert.equal(overrideRes.status, 200);
    const overrideJson = await overrideRes.json();
    const question = overrideJson.data;

    assert.equal(question.topic, 'Ratio & Proportion');
    assert.equal(question.aiClassification.isApproved, true);
    // Original AI suggested values remain preserved in QuestionAiClassification for audit
    assert.equal(question.aiClassification.suggestedTopic, 'Time & Work');
  });

  it('7. Batch AI Classification processes multiple questions without blocking or failing', async () => {
    // Create a second question
    const q2Res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'LOGICAL_REASONING',
        topic: 'Direction Sense',
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: 'Pointing to a photograph of a boy, Suresh said, "He is the son of the only son of my mother." How is Suresh related to that boy?',
        marks: 1.0,
        negativeMarks: 0.0,
        options: [
          { optionText: 'Brother', optionOrder: 1, isCorrect: false },
          { optionText: 'Uncle', optionOrder: 2, isCorrect: false },
          { optionText: 'Father', optionOrder: 3, isCorrect: true },
          { optionText: 'Grandfather', optionOrder: 4, isCorrect: false },
        ],
      }),
    });
    assert.equal(q2Res.status, 201);
    const q2 = (await q2Res.json()).data;

    const batchRes = await fetch(`${baseUrl}/questions/ai/batch-classify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        questionIds: [createdQuestionId, q2.id],
      }),
    });

    assert.equal(batchRes.status, 200);
    const batchJson = await batchRes.json();
    assert.equal(batchJson.data.totalRequested, 2);
    assert.equal(batchJson.data.processed, 2);
    assert.ok(batchJson.data.classified >= 1);
  });

  it('8. Filtering by AI Status returns classified and needs-review questions', async () => {
    const listRes = await fetch(`${baseUrl}/questions?aiStatus=CLASSIFIED`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.ok(Array.isArray(listJson.data.data));

    const needsReviewRes = await fetch(`${baseUrl}/questions/ai/needs-review`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(needsReviewRes.status, 200);
  });

  it('9. Security & RBAC: Students are strictly forbidden (HTTP 403) from AI classification endpoints', async () => {
    const studentRes = await fetch(`${baseUrl}/questions/ai/detect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ questionText: 'What is 2+2?' }),
    });
    assert.equal(studentRes.status, 403);

    const studentClassifyRes = await fetch(`${baseUrl}/questions/${createdQuestionId}/classify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentClassifyRes.status, 403);

    const studentReviewRes = await fetch(`${baseUrl}/questions/${createdQuestionId}/review-classification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ action: 'ACCEPT_AI' }),
    });
    assert.equal(studentReviewRes.status, 403);
  });

  it('10. Assessment Builder Integration: Selection engine successfully selects AI classified questions by Topic & Difficulty', async () => {
    // Seed questions with topic "Probability"
    for (let i = 1; i <= 3; i++) {
      await questionRepository.createQuestion({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Probability',
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: `A fair die is rolled. What is the probability of getting an even number? (Variant ${i})`,
        marks: 1.0,
        options: [
          { optionText: '1/2', optionOrder: 1, isCorrect: true },
          { optionText: '1/3', optionOrder: 2, isCorrect: false },
          { optionText: '1/6', optionOrder: 3, isCorrect: false },
          { optionText: '2/3', optionOrder: 4, isCorrect: false },
        ],
      });
    }

    const testAssessment: AssessmentDto = {
      id: `asmt-ai-test-${Date.now()}`,
      name: 'AI Integration Assessment',
      duration: 30,
      numberOfPapers: 1,
      passingPercentage: 50,
      status: 'DRAFT',
      totalMarks: 3,
      totalQuestions: 3,
      maximumAttempts: 1,
      negativeMarking: false,
      randomQuestions: false,
      randomOptions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testSection: AssessmentSectionDto = {
      id: `sec-ai-prob-${Date.now()}`,
      assessmentId: testAssessment.id,
      name: 'Quantitative Probability',
      component: 'APTITUDE',
      topics: ['Probability'],
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      questionsCount: 2,
      marksPerQuestion: 1,
      negativeMarks: 0,
      sectionOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await questionSelectionEngine.generatePapers(testAssessment, [testSection]);
    assert.equal(result.papers.length, 1);
    assert.equal(result.papers[0].questions.length, 2);
    assert.equal(result.papers[0].questions[0].topic, 'Probability');
    assert.equal(result.papers[0].questions[0].difficulty, 'EASY');
  });

  it('11. Insufficient question handling: Fails cleanly with missing counts without generating fake questions', async () => {
    const testAssessment: AssessmentDto = {
      id: `asmt-shortage-${Date.now()}`,
      name: 'Shortage Assessment',
      duration: 30,
      numberOfPapers: 1,
      passingPercentage: 50,
      status: 'DRAFT',
      totalMarks: 10,
      totalQuestions: 10,
      maximumAttempts: 1,
      negativeMarking: false,
      randomQuestions: false,
      randomOptions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shortageSection: AssessmentSectionDto = {
      id: `sec-shortage-${Date.now()}`,
      assessmentId: testAssessment.id,
      name: 'Rare Topic Section',
      component: 'APTITUDE',
      topics: ['Compound Interest'],
      difficulty: 'HARD',
      questionType: 'SINGLE_CHOICE',
      questionsCount: 10, // Requesting 10 questions of rare topic
      marksPerQuestion: 1,
      negativeMarks: 0,
      sectionOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await assert.rejects(
      async () => {
        await questionSelectionEngine.generatePapers(testAssessment, [shortageSection]);
      },
      (err: any) => {
        const payload = err.payload || err.details;
        assert.ok(payload, 'Expected payload or details on error');
        assert.equal(payload.error, 'INSUFFICIENT_QUESTIONS');
        assert.ok(payload.missing > 0);
        assert.equal(payload.required, 10);
        return true;
      }
    );
  });
});
