import { prisma } from '../config/prisma.config.js';
import { attemptService } from '../services/attempt.service.js';
import { assessmentService } from '../services/assessment.service.js';
import assert from 'node:assert/strict';

async function runVerification() {
  console.log('=== MULTI-STUDENT ASSESSMENT ACCESS VERIFICATION ===\n');

  // 1. Fetch two distinct students from the database
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, registerNumber: true, collegeEmail: true, departmentId: true },
    take: 3,
  });

  if (students.length < 2) {
    throw new Error('Need at least 2 active students in DB for verification');
  }

  const studentA = students[0];
  const studentB = students[1];
  console.log(`Student A: ${studentA.name} (${studentA.registerNumber}, id=${studentA.id})`);
  console.log(`Student B: ${studentB.name} (${studentB.registerNumber}, id=${studentB.id})`);

  // Clean up any stale draft test assessments first
  await prisma.assessment.deleteMany({
    where: { name: { startsWith: 'Multi-Student Test Exam' } }
  });

  // 2. Create a clean dedicated test assessment open to ALL
  console.log('Creating a clean test published assessment open to ALL...');
  const created = await assessmentService.createAssessment({
    name: `Multi-Student Test Exam [${Date.now()}]`,
    duration: 60,
    departmentTargeting: 'ALL',
    maximumAttempts: 2,
    sections: [
      {
        component: 'APTITUDE',
        name: 'Quant Section',
        topics: ['Compound Interest'],
        questionsCount: 1,
        marksPerQuestion: 1,
      },
    ],
  });
  // Generate papers and publish
  await assessmentService.generatePapers(created.id);
  await assessmentService.publishAssessment(created.id);
  const testAsmt = await prisma.assessment.findUnique({
    where: { id: created.id },
    include: { papers: true },
  });

  assert.ok(testAsmt, 'Published assessment must exist');
  console.log(`\nTesting Assessment: "${testAsmt.name}" (id=${testAsmt.id})`);

  // 3. Check student tests visibility for both students
  console.log('\n--- Step 1: Checking assessment visibility for both students ---');
  const testsA = await attemptService.getStudentTests(studentA.id);
  const itemA = testsA.find((t) => t.id === testAsmt.id);
  assert.ok(itemA, 'Student A must see assessment in available tests');
  assert.strictEqual(itemA.status, 'AVAILABLE', 'Student A status must be AVAILABLE');
  console.log(`✔ Student A sees test "${itemA.name}", status: ${itemA.status}`);

  const testsB = await attemptService.getStudentTests(studentB.id);
  const itemB = testsB.find((t) => t.id === testAsmt.id);
  assert.ok(itemB, 'Student B must see assessment in available tests');
  assert.strictEqual(itemB.status, 'AVAILABLE', 'Student B status must be AVAILABLE');
  console.log(`✔ Student B sees test "${itemB.name}", status: ${itemB.status}`);

  // 4. Student A starts the assessment
  console.log('\n--- Step 2: Student A starts the assessment ---');
  const attemptA = await attemptService.startAssessment(studentA.id, testAsmt.id);
  assert.ok(attemptA.id, 'Student A must receive an attempt ID');
  assert.strictEqual(attemptA.studentId, studentA.id, 'Attempt must be linked to Student A');
  assert.strictEqual(attemptA.status, 'IN_PROGRESS', 'Student A attempt must be IN_PROGRESS');
  console.log(`✔ Student A successfully started attempt: ${attemptA.id}`);

  // 5. Student B starts the SAME assessment independently
  console.log('\n--- Step 3: Student B starts the SAME assessment independently ---');
  let attemptB: any;
  try {
    attemptB = await attemptService.startAssessment(studentB.id, testAsmt.id);
    assert.ok(attemptB.id, 'Student B must receive an attempt ID');
    assert.strictEqual(attemptB.studentId, studentB.id, 'Attempt must be linked to Student B');
    assert.strictEqual(attemptB.status, 'IN_PROGRESS', 'Student B attempt must be IN_PROGRESS');
    console.log(`✔ Student B successfully started attempt: ${attemptB.id}`);
  } catch (err: any) {
    console.error(`❌ Student B failed to start assessment:`, err.message);
    throw err;
  }

  // 6. Verify absolute attempt isolation
  console.log('\n--- Step 4: Verifying attempt isolation between Student A and Student B ---');
  assert.notStrictEqual(attemptA.id, attemptB.id, 'Student A and B must have completely distinct attempt IDs');
  console.log(`✔ Independent Attempt IDs: A=${attemptA.id} !== B=${attemptB.id}`);

  // 7. Verify IDOR protection: Student A cannot access Student B's attempt
  try {
    await attemptService.getAttempt(studentA.id, attemptB.id);
    assert.fail('Student A should NOT be able to access Student B attempt');
  } catch (err: any) {
    assert.strictEqual(err.statusCode, 403);
    console.log(`✔ IDOR Protection confirmed: Student A rejected when requesting Student B attempt (403)`);
  }

  // 8. Submit Student A's attempt and verify Student B's attempt is completely unaffected
  console.log('\n--- Step 5: Submitting Student A attempt and verifying Student B is unaffected ---');
  const submitResultA = await attemptService.submitAttempt(studentA.id, attemptA.id);
  assert.ok(submitResultA.id, 'Result must be generated for Student A');
  console.log(`✔ Student A attempt submitted successfully, result id: ${submitResultA.id}, obtainedMarks: ${submitResultA.obtainedMarks}`);

  const studentAAttemptCheck = await attemptService.getAttempt(studentA.id, attemptA.id);
  assert.strictEqual(studentAAttemptCheck.status, 'SUBMITTED', 'Student A attempt status must be SUBMITTED');

  const studentBAttemptCheck = await attemptService.getAttempt(studentB.id, attemptB.id);
  assert.strictEqual(studentBAttemptCheck.status, 'IN_PROGRESS', 'Student B attempt must remain IN_PROGRESS');
  console.log(`✔ Student B attempt is still active (status: ${studentBAttemptCheck.status}) and completely unaffected by Student A submission!`);

  // 9. Verify Specific Department targeting restriction
  console.log('\n--- Step 6: Verifying Department-Specific Restriction ---');
  const depts = await prisma.department.findMany({ select: { id: true, name: true }, take: 2 });
  if (depts.length >= 2) {
    const targetDept = depts[0].id;
    const restrictedAsmt = await prisma.assessment.create({
      data: {
        name: `Restricted Dept Exam [${Date.now()}]`,
        duration: 30,
        status: 'PUBLISHED',
      },
    });
    // set targetInfo to targetDept only
    (attemptService as any).assessmentRepo.assessmentTargetMap.set(restrictedAsmt.id, {
      departmentTargeting: 'SPECIFIC',
      departmentIds: [targetDept],
    });

    // Check student in different department
    const studentDiffDept = await prisma.student.findFirst({
      where: { departmentId: { not: targetDept } },
    });

    if (studentDiffDept) {
      try {
        await attemptService.startAssessment(studentDiffDept.id, restrictedAsmt.id);
        assert.fail('Student from different department must be rejected');
      } catch (err: any) {
        assert.strictEqual(err.statusCode, 403);
        console.log(`✔ Ineligible student from different department correctly rejected with 403: "${err.message}"`);
      }
    }

    // Clean up restricted test asmt
    await prisma.assessment.delete({ where: { id: restrictedAsmt.id } });
  }

  // Clean up main test asmt
  await prisma.assessmentAttempt.deleteMany({ where: { assessmentId: testAsmt.id } });
  await prisma.assessmentAssignment.deleteMany({ where: { assessmentId: testAsmt.id } });
  await prisma.assessment.delete({ where: { id: testAsmt.id } });

  console.log('\n🎉 ALL MULTI-STUDENT ASSESSMENT ACCESS TESTS PASSED CONFIDENTLY! 🎉\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
  });
