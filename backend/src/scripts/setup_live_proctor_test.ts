import { prisma } from '../config/prisma.config.js';

async function main() {
  console.log('Setting up live AI proctoring demo assessment...');

  const student = await prisma.student.findFirst({
    where: { collegeEmail: 'student@placement.edu' },
  });

  if (!student) {
    console.error('Student student@placement.edu not found');
    return;
  }

  // 1. Find or create an assessment
  let asmt = await prisma.assessment.findFirst({
    where: { name: 'Full-Stack & Quantitative Career Assessment 2026' },
  });

  if (!asmt) {
    asmt = await prisma.assessment.findFirst({
      where: { status: 'PUBLISHED' },
    });
  }

  if (!asmt) {
    console.error('No published assessment found');
    return;
  }

  // Ensure proctoring settings are enabled on the assessment
  await prisma.assessment.update({
    where: { id: asmt.id },
    data: {
      enableMobileDetection: true,
      maxViolations: 3,
      terminationAction: 'AUTO_SUBMIT',
      status: 'PUBLISHED',
      maximumAttempts: 10,
    },
  });

  // 2. Find any active paper for this assessment
  const paper = await prisma.assessmentPaper.findFirst({
    where: { assessmentId: asmt.id },
  });

  // 3. Find or create an active attempt
  let attempt = await prisma.assessmentAttempt.findFirst({
    where: {
      studentId: student.id,
      assessmentId: asmt.id,
    },
    orderBy: { createdAt: 'desc' },
  });

  const twoHours = new Date(Date.now() + 2 * 60 * 60 * 1000);

  if (attempt) {
    await prisma.assessmentResult.deleteMany({
      where: { attemptId: attempt.id },
    });
    await prisma.attemptViolation.deleteMany({
      where: { attemptId: attempt.id },
    });

    attempt = await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: 'IN_PROGRESS',
        submittedAt: null,
        violationCount: 0,
        terminationReason: null,
        expectedEndTime: twoHours,
        currentQuestion: 1,
      },
    });
  } else {
    attempt = await prisma.assessmentAttempt.create({
      data: {
        id: `att-${Date.now()}-proctor`,
        studentId: student.id,
        assessmentId: asmt.id,
        paperId: paper?.id,
        attemptNumber: 1,
        startTime: new Date(),
        expectedEndTime: twoHours,
        status: 'IN_PROGRESS',
        currentQuestion: 1,
        violationCount: 0,
      },
    });
  }

  console.log('Successfully prepared live attempt:');
  console.log(`- Assessment ID: ${asmt.id} (${asmt.name})`);
  console.log(`- Attempt ID: ${attempt.id}`);
  console.log(`- Student: ${student.name} (${student.collegeEmail})`);
  console.log(`- Direct URL: http://localhost:5173/student/attempt/${attempt.id}`);

  await prisma.$disconnect();
}

main().catch(console.error);
