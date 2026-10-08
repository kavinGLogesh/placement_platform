import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000/api';

async function runLiveE2ETests() {
  console.log('🚀 Starting Live Runtime E2E Verification for AI Question Classification...');

  // 1. Authenticate Placement Admin
  console.log('Step 1: Authenticating Placement Admin...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'placementadmin@placement.edu',
      password: 'PlacementAdmin@123',
    }),
  });
  assert.equal(loginRes.status, 200, 'Placement Admin login should return 200');
  const loginBody = await loginRes.json() as any;
  const adminToken = loginBody.data.accessToken;
  assert.ok(adminToken, 'Admin token should be present');

  // Authenticate Student for RBAC check
  console.log('Step 1b: Authenticating Student for RBAC check...');
  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@placement.edu',
      password: 'Student@123',
    }),
  });
  assert.equal(studentLoginRes.status, 200, 'Student login should return 200');
  const studentBody = await studentLoginRes.json() as any;
  const studentToken = studentBody.data.accessToken;
  assert.ok(studentToken, 'Student token should be present');

  // 2. Test AI Auto-Detect Endpoint (/api/questions/ai/detect)
  console.log('Step 2: Testing /api/questions/ai/detect with User Example Statement...');
  const detectPayload = {
    statement: 'If the cost price is ₹500 and selling price is ₹600, calculate the profit percentage.',
    options: [
      { text: '16.66%', isCorrect: false },
      { text: '20%', isCorrect: true },
      { text: '25%', isCorrect: false },
      { text: '18%', isCorrect: false },
    ],
    explanation: 'Profit = 600 - 500 = 100. Profit % = (100 / 500) * 100 = 20%.',
  };

  const detectRes = await fetch(`${BASE_URL}/questions/ai/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(detectPayload),
  });
  assert.equal(detectRes.status, 200, 'Auto-detect should return 200');
  const detectResult = (await detectRes.json() as any).data;
  console.log('AI Detected Classification:', JSON.stringify(detectResult, null, 2));

  assert.equal(detectResult.category, 'QUANTITATIVE_APTITUDE');
  assert.equal(detectResult.topic, 'Profit & Loss');
  assert.equal(detectResult.difficulty, 'EASY');
  assert.equal(detectResult.questionType, 'SINGLE_CHOICE');
  assert.ok(detectResult.confidence.category >= 0.75, 'Category confidence should be >= 0.75');
  assert.ok(detectResult.confidence.topic >= 0.75, 'Topic confidence should be >= 0.75');
  assert.ok(detectResult.confidence.difficulty >= 0.60, 'Difficulty confidence should be >= 0.60');
  assert.ok(detectResult.status === 'CLASSIFIED' || detectResult.status === 'NEEDS_REVIEW');
  console.log('✔ Auto-detect correctly identified Category, Topic, Difficulty, and Confidence!');

  // 3. Create a question in MySQL without classification
  console.log('Step 3: Creating question in Question Bank MySQL...');
  const createQRes = await fetch(`${BASE_URL}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      statement: 'A train 120m long passes a pole in 6 seconds. Find the speed of the train in km/h.',
      category: 'LOGICAL_REASONING', // deliberately placeholder
      topic: 'Blood Relations', // deliberately placeholder
      difficulty: 'HARD', // deliberately placeholder
      questionType: 'SINGLE_CHOICE',
      marks: 2,
      penaltyMarks: 0.5,
      explanation: 'Speed = 120 / 6 = 20 m/s. In km/h = 20 * (18 / 5) = 72 km/h.',
      options: [
        { text: '60 km/h', isCorrect: false },
        { text: '72 km/h', isCorrect: true },
        { text: '80 km/h', isCorrect: false },
        { text: '90 km/h', isCorrect: false },
      ],
    }),
  });
  assert.equal(createQRes.status, 201, 'Question creation should return 201');
  const createdQuestion = (await createQRes.json() as any).data;
  const questionId = createdQuestion.id;
  console.log(`Created question with ID: ${questionId}`);

  // 4. Classify existing Question in DB via /api/questions/:id/classify
  console.log('Step 4: Classifying existing question via /api/questions/:id/classify...');
  const classifyRes = await fetch(`${BASE_URL}/questions/${questionId}/classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(classifyRes.status, 200, 'Classify endpoint should return 200');
  const classifiedQ = (await classifyRes.json() as any).data;
  assert.ok(classifiedQ.aiClassification, 'Question should have aiClassification relation');
  console.log('AI Classification result:', classifiedQ.aiClassification);
  assert.equal(classifiedQ.aiClassification.suggestedCategory, 'QUANTITATIVE_APTITUDE');
  assert.equal(classifiedQ.aiClassification.suggestedTopic, 'Speed, Time & Distance');
  assert.equal(classifiedQ.aiClassification.suggestedDifficulty, 'EASY');

  // Verify that until reviewed, original question metadata remains untouched
  assert.equal(classifiedQ.category, 'LOGICAL_REASONING', 'Original category remains untouched until approved');

  // 5. Admin Review: Accept AI
  console.log('Step 5: Admin Review: Accept AI Classification...');
  const acceptRes = await fetch(`${BASE_URL}/questions/${questionId}/review-classification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'ACCEPT_AI',
    }),
  });
  assert.equal(acceptRes.status, 200, 'Accept AI should return 200');
  const acceptedQ = (await acceptRes.json() as any).data;
  assert.equal(acceptedQ.category, 'QUANTITATIVE_APTITUDE', 'Category updated to AI suggested');
  assert.equal(acceptedQ.topic, 'Speed, Time & Distance', 'Topic updated to AI suggested');
  assert.equal(acceptedQ.difficulty, 'EASY', 'Difficulty updated to AI suggested');
  assert.equal(acceptedQ.aiClassification.status, 'CLASSIFIED');
  assert.ok(acceptedQ.aiClassification.approvedBy, 'Approved by admin ID should be set');
  console.log('✔ Question successfully accepted and updated in MySQL database!');

  // 6. Admin Review: Edit & Override
  console.log('Step 6: Admin Review: Edit & Override...');
  const overrideRes = await fetch(`${BASE_URL}/questions/${questionId}/review-classification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      action: 'OVERRIDE',
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Speed, Time & Distance',
      difficulty: 'MEDIUM',
      reviewNotes: 'Contains conversion from m/s to km/h, which students often stumble on.',
    }),
  });
  assert.equal(overrideRes.status, 200, 'Override should return 200');
  const overridenQ = (await overrideRes.json() as any).data;
  assert.equal(overridenQ.difficulty, 'MEDIUM', 'Difficulty updated to Admin override');
  assert.equal(overridenQ.aiClassification.isOverridden, true, 'isOverridden should be true');
  assert.equal(overridenQ.aiClassification.reviewNotes, 'Contains conversion from m/s to km/h, which students often stumble on.');
  console.log('✔ Override correctly audited and applied!');

  // 7. Test Batch Classification (/api/questions/ai/batch-classify)
  console.log('Step 7: Testing Batch Classification...');
  // Create another question
  const createQ2Res = await fetch(`${BASE_URL}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      statement: 'What is the worst-case time complexity of inserting an element into a Binary Search Tree of height h?',
      category: 'TECHNICAL',
      topic: 'Data Structures & Algorithms',
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      marks: 1,
      options: [
        { text: 'O(1)', isCorrect: false },
        { text: 'O(h)', isCorrect: true },
        { text: 'O(n log n)', isCorrect: false },
        { text: 'O(h^2)', isCorrect: false },
      ],
    }),
  });
  const q2Id = (await createQ2Res.json() as any).data.id;

  const batchRes = await fetch(`${BASE_URL}/questions/ai/batch-classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      questionIds: [questionId, q2Id],
    }),
  });
  assert.equal(batchRes.status, 200, 'Batch classify should return 200');
  const batchData = (await batchRes.json() as any).data;
  assert.equal(batchData.total, 2);
  assert.equal(batchData.processed, 2);
  assert.equal(batchData.failed, 0);
  console.log('✔ Batch classification completed successfully without blocking!');

  // 8. Test Needs-Review Queue (/api/questions/ai/needs-review)
  console.log('Step 8: Testing Needs-Review Queue...');
  const needsReviewRes = await fetch(`${BASE_URL}/questions/ai/needs-review?page=1&limit=10`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(needsReviewRes.status, 200, 'Needs review should return 200');
  const needsReviewData = (await needsReviewRes.json() as any).data;
  console.log(`Needs review total questions: ${needsReviewData.total}`);

  // 9. Security & RBAC: Student access is forbidden (403)
  console.log('Step 9: Testing Security & RBAC: Student forbidden (403)...');
  const forbiddenDetect = await fetch(`${BASE_URL}/questions/ai/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify(detectPayload),
  });
  assert.equal(forbiddenDetect.status, 403, 'Student should be forbidden from AI detect');

  const forbiddenClassify = await fetch(`${BASE_URL}/questions/${questionId}/classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
  });
  assert.equal(forbiddenClassify.status, 403, 'Student should be forbidden from question classify');

  const forbiddenBatch = await fetch(`${BASE_URL}/questions/ai/batch-classify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ questionIds: [questionId] }),
  });
  assert.equal(forbiddenBatch.status, 403, 'Student should be forbidden from batch classify');

  console.log('✔ RBAC verified: Student token cannot access AI classification endpoints!');

  console.log('🎉 ALL LIVE RUNTIME E2E VERIFICATIONS PASSED SUCCESSFULLY!');
}

runLiveE2ETests().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
