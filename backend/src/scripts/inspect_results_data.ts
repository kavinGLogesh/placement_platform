import { prisma } from '../config/prisma.config.js';

async function main() {
  const [
    studentsCount,
    assessmentsCount,
    attemptsCount,
    resultsCount,
    departmentsCount,
    assessments,
    results,
    attempts,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.assessment.count(),
    prisma.assessmentAttempt.count(),
    prisma.assessmentResult.count(),
    prisma.department.count(),
    prisma.assessment.findMany({
      select: { id: true, name: true, status: true, totalMarks: true, passingPercentage: true },
      take: 5,
    }),
    prisma.assessmentResult.findMany({
      select: {
        id: true,
        studentId: true,
        assessmentId: true,
        totalMarks: true,
        obtainedMarks: true,
        percentage: true,
        isPassed: true,
        student: { select: { name: true, registerNumber: true, department: { select: { code: true } } } },
        assessment: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.assessmentAttempt.findMany({
      select: { id: true, studentId: true, assessmentId: true, status: true },
      take: 5,
    }),
  ]);

  console.log('=== DATABASE DATA OVERVIEW ===');
  console.log({
    studentsCount,
    departmentsCount,
    assessmentsCount,
    attemptsCount,
    resultsCount,
  });
  console.log('Sample Assessments:', assessments);
  console.log('Sample Results:', results);
  console.log('Sample Attempts:', attempts);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
