import { prisma } from '../config/prisma.config.js';

async function main() {
  const attemptId = 'att-1791793564904-r0i1v';

  // 1. Delete any results for this attempt
  await prisma.assessmentResult.deleteMany({
    where: { attemptId },
  });

  // 2. Delete any recorded violations in MySQL
  await prisma.attemptViolation.deleteMany({
    where: { attemptId },
  });

  const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);

  // 3. Reset attempt status, violation count, and termination reason
  const updated = await prisma.assessmentAttempt.update({
    where: { id: attemptId },
    data: {
      status: 'IN_PROGRESS',
      submittedAt: null,
      violationCount: 0,
      terminationReason: null,
      expectedEndTime: twoHoursFromNow,
    },
  });

  console.log(`Attempt ${updated.id} reset cleanly: status=${updated.status}, violationCount=${updated.violationCount}, expectedEndTime=${updated.expectedEndTime.toISOString()}`);
  await prisma.$disconnect();
}

main().catch(console.error);
