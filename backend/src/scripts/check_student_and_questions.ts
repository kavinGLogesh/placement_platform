import { prisma } from '../config/prisma.config.js';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log('Users in DB:');
  console.log(users);

  const attempts = await prisma.assessmentAttempt.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      assessmentId: true,
      paperId: true,
      studentId: true,
      status: true,
    },
  });
  console.log('Recent attempts:');
  console.log(attempts);

  await prisma.$disconnect();
}

main().catch(console.error);
