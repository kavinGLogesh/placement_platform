import { prisma } from '../config/prisma.config.js';

async function main() {
  const colleges = await prisma.college.findMany({
    include: {
      departments: {
        include: {
          _count: {
            select: { students: true, courses: true, classes: true },
          },
        },
      },
    },
  });

  console.log('=== COLLEGES & DEPARTMENTS DETAIL ===');
  for (const c of colleges) {
    console.log(`\nCollege: id="${c.id}", code="${c.code}", name="${c.name}"`);
    console.log(`Departments count: ${c.departments.length}`);
    for (const d of c.departments) {
      console.log(`  Dept: id="${d.id}", code="${d.code}", name="${d.name}", students=${d._count.students}`);
    }
  }

  const students = await prisma.student.findMany({
    select: {
      id: true,
      name: true,
      registerNumber: true,
      year: true,
      departmentId: true,
      department: {
        select: { id: true, code: true, name: true, collegeId: true },
      },
    },
  });

  console.log(`\n=== STUDENTS (${students.length}) ===`);
  const deptStudentCount: Record<string, number> = {};
  for (const s of students) {
    const key = `${s.department.code} - ${s.department.name} (${s.department.collegeId})`;
    deptStudentCount[key] = (deptStudentCount[key] || 0) + 1;
  }
  for (const [k, count] of Object.entries(deptStudentCount)) {
    console.log(`  ${k}: ${count} students`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
