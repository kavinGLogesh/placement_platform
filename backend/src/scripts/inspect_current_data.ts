import { prisma } from '../config/prisma.config.js';

async function main() {
  const colleges = await prisma.college.findMany();
  console.log('=== COLLEGES ===');
  for (const c of colleges) {
    console.log(`College: id="${c.id}", code="${c.code}", name="${c.name}"`);
  }

  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          students: true,
          courses: true,
          classes: true,
          gdRounds: true,
          interviewRounds: true,
        },
      },
    },
  });
  console.log(`=== DEPARTMENTS (${departments.length}) ===`);
  for (const d of departments) {
    console.log(`Dept: id="${d.id}", code="${d.code}", name="${d.name}", counts=${JSON.stringify(d._count)}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
