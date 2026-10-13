import { prisma } from '../config/prisma.config.js';
import assert from 'node:assert/strict';

async function runVerification() {
  console.log('================================================================');
  console.log('   FULL ANTI-CHEATING & ASSESSMENT ENGINE VERIFICATION SUITE    ');
  console.log('================================================================\n');

  const baseUrl = 'http://localhost:5000/api';

  // 1. Authenticate Admin and Student
  console.log('[1/9] Authenticating Admin and Student...');
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.equal(adminLoginRes.status, 200, 'Admin login should succeed');
  const adminData = (await adminLoginRes.json()) as any;
  const adminToken = adminData.data?.accessToken;

  const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student002@example.edu', password: 'Student@123' }),
  });
  assert.equal(studentLoginRes.status, 200, 'Student login should succeed');
  const studentData = (await studentLoginRes.json()) as any;
  const studentToken = studentData.data?.accessToken;
  console.log('      ✓ Placement Admin and Student authenticated successfully');

  const studentUser = await prisma.user.findUnique({
    where: { email: 'student002@example.edu' },
    include: { student: true },
  });
  const studentProfileId = studentUser?.student?.id;
  assert.ok(studentProfileId, 'Student profile ID must exist');

  // 2. Create and publish a fresh test assessment
  console.log('\n[2/9] Creating a fresh assessment and generating papers...');
  const qRes = await fetch(`${baseUrl}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Percentage',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionText: `Anti-Cheating Test Question ${Date.now()}`,
      marks: 5,
      negativeMarks: 0,
      options: [
        { optionText: 'Option A (Correct)', optionOrder: 1, isCorrect: true },
        { optionText: 'Option B', optionOrder: 2, isCorrect: false },
      ],
    }),
  });
  assert.equal(qRes.status, 201, 'Question creation should succeed');

  const asmtRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Anti-Cheating Verification Assessment ${Date.now()}`,
      duration: 30,
      passingPercentage: 50,
      negativeMarking: false,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Section A',
          sectionOrder: 1,
          topics: ['Percentage'],
          questionsCount: 1,
          marksPerQuestion: 5,
        },
      ],
    }),
  });
  assert.equal(asmtRes.status, 201, 'Assessment creation should succeed');
  const asmtData = (await asmtRes.json()) as any;
  const testAssessmentId = asmtData.data.id;

  // Generate papers
  const genRes = await fetch(`${baseUrl}/assessments/${testAssessmentId}/generate-papers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(genRes.status, 201, 'Paper generation should succeed');

  // Publish
  const pubRes = await fetch(`${baseUrl}/assessments/${testAssessmentId}/publish`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
  });
  assert.equal(pubRes.status, 200, 'Publishing should succeed');

  // Assign to Student
  const assignRes = await fetch(`${baseUrl}/assessments/${testAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      studentIds: [studentProfileId],
    }),
  });
  assert.equal(assignRes.status, 200, 'Assigning assessment should succeed');
  console.log(`      ✓ Assessment created, published & assigned: ${testAssessmentId}`);

  // 3. Start assessment attempt
  console.log('\n[3/9] Starting assessment attempt as student...');
  const startRes = await fetch(`${baseUrl}/student/assessments/${testAssessmentId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(startRes.status, 201, 'Start assessment should return 201');
  const startData = (await startRes.json()) as any;
  const attemptId = startData.data?.id;
  assert.ok(attemptId, 'Attempt ID must be returned');
  console.log(`      ✓ Attempt active: ${attemptId}`);
  console.log(`      ✓ Authoritative expectedEndTime: ${startData.data?.expectedEndTime}`);

  // 4. Test TAB_SWITCH violation
  console.log('\n[4/9] Testing Violation Recording: TAB_SWITCH...');
  const tabViolationRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      violationType: 'TAB_SWITCH',
      details: 'Tab switched away / document hidden',
    }),
  });
  assert.equal(tabViolationRes.status, 201, 'TAB_SWITCH violation should be accepted');
  const tabData = (await tabViolationRes.json()) as any;
  assert.equal(tabData.data.violation.violationType, 'TAB_SWITCH');
  console.log(`      ✓ TAB_SWITCH recorded. Current violation count: ${tabData.data.violationCount}`);

  // 5. Test rapid duplicate deduplication (cooldown)
  console.log('\n[5/9] Testing Rapid Duplicate Suppression (Anti-Spam / Cooldown)...');
  const dupViolationRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      violationType: 'TAB_SWITCH',
      details: 'Duplicate immediate tab switch within cooldown',
    }),
  });
  assert.equal(dupViolationRes.status, 201, 'Duplicate should return 201');
  const dupData = (await dupViolationRes.json()) as any;
  assert.equal(dupData.data.violationCount, tabData.data.violationCount, 'Violation count should NOT increment for rapid duplicate');
  console.log(`      ✓ Cooldown deduplication confirmed: violation count remained ${dupData.data.violationCount}`);

  // 6. Test CLIPBOARD_COPY violation
  console.log('\n[6/9] Testing Violation Recording: CLIPBOARD_COPY & SCREENSHOT_ATTEMPT...');
  await new Promise((r) => setTimeout(r, 1100)); // wait cooldown
  const clipViolationRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      violationType: 'CLIPBOARD_COPY',
      details: 'Unauthorized copy attempt intercepted on question text',
    }),
  });
  assert.equal(clipViolationRes.status, 201, 'CLIPBOARD_COPY violation should be accepted');
  const clipData = (await clipViolationRes.json()) as any;
  assert.equal(clipData.data.violation.violationType, 'CLIPBOARD_COPY');
  console.log(`      ✓ CLIPBOARD_COPY recorded. Violation count: ${clipData.data.violationCount}`);

  await new Promise((r) => setTimeout(r, 1100)); // wait cooldown
  const shotViolationRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/violations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({
      violationType: 'SCREENSHOT_ATTEMPT',
      details: 'PrintScreen / Meta+Shift+S keyboard shortcut intercepted',
    }),
  });
  assert.equal(shotViolationRes.status, 201, 'SCREENSHOT_ATTEMPT violation should be accepted');
  const shotData = (await shotViolationRes.json()) as any;
  assert.equal(shotData.data.violation.violationType, 'SCREENSHOT_ATTEMPT');
  console.log(`      ✓ SCREENSHOT_ATTEMPT recorded. Violation count: ${shotData.data.violationCount}`);

  // 7. Verify attempt is NOT terminated automatically (Student remains in progress)
  console.log('\n[7/9] Verifying Non-Termination (Student remains in progress after warnings)...');
  const attemptDetailRes = await fetch(`${baseUrl}/student/attempts/${attemptId}`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(attemptDetailRes.status, 200, 'Attempt detail should load');
  const attemptDetailData = (await attemptDetailRes.json()) as any;
  assert.equal(attemptDetailData.data.status, 'IN_PROGRESS', 'Attempt must remain IN_PROGRESS');
  console.log(`      ✓ Attempt status verified: ${attemptDetailData.data.status} (student is NOT prematurely terminated)`);

  // 8. Answer autosave and submission
  console.log('\n[8/9] Testing Answer Autosave and Clean Submission...');
  const questions = attemptDetailData.data.questions || [];
  if (questions.length > 0) {
    const q = questions[0];
    const targetQId = q.questionId || q.id;
    const opt = q.options?.[0];
    const answerRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: targetQId,
        selectedOptionIds: opt ? [opt.id] : [],
        isMarkedForReview: false,
      }),
    });
    if (answerRes.status !== 200) {
      const errJson = await answerRes.json();
      console.error('Answer save failed details:', errJson);
    }
    assert.equal(answerRes.status, 200, 'Answer save should succeed');
    console.log(`      ✓ Answer autosaved for question ${targetQId}`);
  }

  const submitRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert.equal(submitRes.status, 200, 'Submission should succeed');
  const submitData = (await submitRes.json()) as any;
  assert.ok(submitData.data.id, 'Result ID must exist');
  assert.equal(submitData.data.attemptId, attemptId, 'Result attemptId must match');
  console.log(`      ✓ Assessment submitted successfully. Obtained Marks: ${submitData.data.obtainedMarks}/${submitData.data.totalMarks}`);

  const finalizedAttempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  assert.equal(finalizedAttempt?.status, 'SUBMITTED', 'Attempt status in DB must be SUBMITTED');
  console.log(`      ✓ Database attempt status verified: ${finalizedAttempt?.status}`);

  // Verify attempt is now closed to answer mutations
  const postSubmitAnswerRes = await fetch(`${baseUrl}/student/attempts/${attemptId}/answers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentToken}`,
    },
    body: JSON.stringify({ questionId: 'any', answer: 'B' }),
  });
  assert.equal(postSubmitAnswerRes.status, 400, 'Closed attempt must reject answer updates');
  console.log('      ✓ Closed attempt properly rejects further modifications (HTTP 400)');

  // 9. Verify Admin audit visibility of violation history
  console.log('\n[9/9] Verifying Admin Results Audit Log of Violations...');
  const adminResultsRes = await fetch(`${baseUrl}/results?assessmentId=${testAssessmentId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminResultsRes.status, 200, 'Admin results should succeed');
  const adminResultsData = (await adminResultsRes.json()) as any;
  const candidateResult = adminResultsData.data?.items?.find((item: any) => item.attemptId === attemptId);
  assert.ok(candidateResult, 'Candidate result should be in admin list');
  assert.equal(candidateResult.violationCount, 3, 'Violation count should match recorded violations');
  console.log(`      ✓ Admin audit verified: candidate violationCount = ${candidateResult.violationCount}`);
  console.log(`      ✓ Admin audit violation types: ${candidateResult.violations.map((v: any) => v.violationType).join(', ')}`);

  console.log('\n================================================================');
  console.log('   ALL ANTI-CHEATING & ENGINE VERIFICATIONS PASSED (9/9)       ');
  console.log('================================================================\n');
}

runVerification()
  .catch((err) => {
    console.error('\n❌ VERIFICATION FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
