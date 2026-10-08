import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5000/api';

async function main() {
  console.log('Testing live AI Question Classification endpoints against port 5000...');

  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const { data: { accessToken: token } } = await loginRes.json();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 2. Create a test question
  const createRes = await fetch(`${BASE_URL}/questions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      questionText: 'A car travels at 60 km/h for 2 hours and 80 km/h for 3 hours. Find the average speed.',
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Time Speed Distance',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      marks: 2,
      negativeMarks: 0.5,
      options: [
        { optionText: '72 km/h', isCorrect: true, optionOrder: 1 },
        { optionText: '70 km/h', isCorrect: false, optionOrder: 2 },
        { optionText: '74 km/h', isCorrect: false, optionOrder: 3 },
        { optionText: '75 km/h', isCorrect: false, optionOrder: 4 },
      ],
      explanation: 'Total distance = 120 + 240 = 360 km. Total time = 5 h. Avg speed = 360 / 5 = 72 km/h.',
    }),
  });
  if (createRes.status !== 201) {
    const errBody = await createRes.text();
    console.error('Create question error:', createRes.status, errBody);
  }
  assert.equal(createRes.status, 201);
  const { data: createdQ } = await createRes.json();
  const qId = createdQ.id;
  console.log(`✓ Created test question ${qId}`);

  // 3. Classify question via POST /questions/:id/classify
  const classifyRes = await fetch(`${BASE_URL}/questions/${qId}/classify`, {
    method: 'POST',
    headers,
  });
  assert.equal(classifyRes.status, 200);
  const { data: classifyResult } = await classifyRes.json();
  console.log(`✓ Classify endpoint returned: Category=${classifyResult.category}, Topic=${classifyResult.topic}, Diff=${classifyResult.difficulty}, AI Status=${classifyResult.aiClassification?.status}`);
  assert.equal(classifyResult.category, 'QUANTITATIVE_APTITUDE');
  assert.ok(classifyResult.aiClassification?.overallConfidence >= 0.70);

  // 4. Review classification via POST /questions/:id/review-classification (Accept AI)
  const reviewRes = await fetch(`${BASE_URL}/questions/${qId}/review-classification`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'ACCEPT_AI' }),
  });
  assert.equal(reviewRes.status, 200);
  const { data: reviewedQ } = await reviewRes.json();
  assert.equal(reviewedQ.aiClassification.status, 'CLASSIFIED');
  assert.equal(reviewedQ.aiClassification.isApproved, true);
  console.log('✓ Successfully accepted AI classification and verified approved status in DB');

  // 5. Query questions with filter ?aiStatus=CLASSIFIED
  const filterRes = await fetch(`${BASE_URL}/questions?aiStatus=CLASSIFIED`, { headers });
  assert.equal(filterRes.status, 200);
  const { data: filteredData } = await filterRes.json();
  assert.ok(filteredData.data.length > 0);
  console.log(`✓ Filter ?aiStatus=CLASSIFIED returned ${filteredData.data.length} questions`);

  // 6. Query questions needing review via GET /questions/ai/needs-review
  const needsReviewRes = await fetch(`${BASE_URL}/questions/ai/needs-review`, { headers });
  assert.equal(needsReviewRes.status, 200);
  const { data: needsReviewData } = await needsReviewRes.json();
  console.log(`✓ GET /questions/ai/needs-review returned ${needsReviewData.data.length} questions`);

  // 7. Test Batch Classification via POST /questions/ai/batch-classify
  const batchRes = await fetch(`${BASE_URL}/questions/ai/batch-classify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ questionIds: [qId] }),
  });
  assert.equal(batchRes.status, 200);
  const { data: batchData } = await batchRes.json();
  assert.equal(batchData.totalRequested, 1);
  assert.equal(batchData.classified, 1);
  console.log('✓ Batch classification endpoint processed question successfully');

  console.log('\nAll 5 AI Classification endpoints successfully verified on live MySQL!');
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
