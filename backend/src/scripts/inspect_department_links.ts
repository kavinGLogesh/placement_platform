import { prisma } from '../config/prisma.config.js';

async function main() {
  const depts = await prisma.department.findMany({
    include: {
      college: true,
      courses: {
        include: {
          classes: {
            include: {
              sections: true,
            },
          },
        },
      },
      gdRounds: true,
      interviewRounds: true,
    },
  });

  console.log('=== DEPARTMENT LINK INSPECTION ===');
  for (const d of depts) {
    console.log(`Dept ID: ${d.id} | Code: ${d.code} | Name: "${d.name}" | College: ${d.college.code} (${d.collegeId})`);
    console.log(`  Courses (${d.courses.length}):`, d.courses.map(c => `${c.code} (${c.name})`).join(', '));
    console.log(`  GD Rounds (${d.gdRounds.length}):`, d.gdRounds.map(g => `${g.id} (${g.title})`).join(', '));
    console.log(`  Interview Rounds (${d.interviewRounds.length}):`, d.interviewRounds.map(i => `${i.id} (${i.title})`).join(', '));
  }

  const assessmentTargeting = await prisma.assessmentAssignment.findMany({
    where: { departmentId: { not: null } },
  });
  console.log(`\nAssessmentAssignments targeting departmentId: ${assessmentTargeting.length}`);

  await prisma.$disconnect();
}

main().catch(console.error);
