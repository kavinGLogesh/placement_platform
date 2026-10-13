import { prisma } from '../config/prisma.config.js';

interface DeptDefinition {
  code: string;
  name: string;
  durationYears: number;
}

const EXACT_DEPARTMENTS: DeptDefinition[] = [
  { code: 'BSCIT', name: 'B.Sc IT', durationYears: 3 },
  { code: 'BSCCS', name: 'B.Sc CS', durationYears: 3 },
  { code: 'BSCCT', name: 'B.Sc CT', durationYears: 3 },
  { code: 'BSCAIDS', name: 'B.Sc AI & DS', durationYears: 3 },
  { code: 'BSCCSA', name: 'B.Sc CSA', durationYears: 3 },
  { code: 'BSCCDF', name: 'B.Sc CDF', durationYears: 3 },
  { code: 'BASOC', name: 'B.A Sociology', durationYears: 3 },
  { code: 'BAENG', name: 'B.A English', durationYears: 3 },
  { code: 'BCOM', name: 'B.Com', durationYears: 3 },
  { code: 'BCOMCA', name: 'B.Com CA', durationYears: 3 },
  { code: 'BCOMPA', name: 'B.Com PA', durationYears: 3 },
  { code: 'BCOMAF', name: 'B.Com AF', durationYears: 3 },
  { code: 'BCOMIT', name: 'B.Com IT', durationYears: 3 },
  { code: 'BBA', name: 'BBA', durationYears: 3 },
  { code: 'MBA', name: 'MBA', durationYears: 2 },
  { code: 'MSC', name: 'M.Sc', durationYears: 2 },
  { code: 'MCOM', name: 'M.Com', durationYears: 2 },
  { code: 'LIBRARY', name: 'LIBRARY', durationYears: 3 },
  { code: 'BSCMATH', name: 'B.Sc Mathematics', durationYears: 3 },
  { code: 'BATAMIL', name: 'B.A Tamil', durationYears: 3 },
  { code: 'BCA', name: 'BCA', durationYears: 3 },
];

async function main() {
  console.log('=== CONFIGURING EXACT 21 DEPARTMENTS ===');
  console.log(`Configuring exactly ${EXACT_DEPARTMENTS.length} departments.`);

  // Find or verify main college
  let college = await prisma.college.findUnique({ where: { id: 'col-001' } });
  if (!college) {
    college = await prisma.college.findFirst();
  }
  if (!college) {
    throw new Error('No college found in database!');
  }
  console.log(`Target College: ${college.name} (Code: ${college.code}, ID: ${college.id})`);

  // Unlink GD Rounds and Interview Rounds from obsolete departments
  await prisma.gdRound.updateMany({
    data: { departmentId: null, courseId: null },
  });
  await prisma.interviewRound.updateMany({
    data: { departmentId: null, courseId: null },
  });
  await prisma.assessmentAssignment.updateMany({
    data: { departmentId: null, classId: null, sectionId: null },
  });

  // Delete all existing sections, classes, courses, and departments
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.course.deleteMany();
  await prisma.department.deleteMany();

  console.log('Cleared all obsolete departments, courses, classes, and sections.');

  // Create the exact 21 departments along with course, class, section hierarchy
  for (let i = 0; i < EXACT_DEPARTMENTS.length; i++) {
    const item = EXACT_DEPARTMENTS[i];
    const deptId = `dept-${item.code.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;
    const courseId = `crs-${item.code.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;
    const classId = `cls-${item.code.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;
    const sectionId = `sec-${item.code.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;

    // 1. Create Department
    const dept = await prisma.department.create({
      data: {
        id: deptId,
        collegeId: college.id,
        code: item.code,
        name: item.name,
      },
    });

    // 2. Create Course for Department
    const course = await prisma.course.create({
      data: {
        id: courseId,
        departmentId: dept.id,
        code: item.code,
        name: `${item.name} Program`,
        durationYears: item.durationYears,
      },
    });

    // 3. Create Class
    const cls = await prisma.class.create({
      data: {
        id: classId,
        departmentId: dept.id,
        courseId: course.id,
        batchYear: 2026,
        currentYear: 1,
        name: `${item.name} 2026 - Year 1`,
      },
    });

    // 4. Create Section
    await prisma.section.create({
      data: {
        id: sectionId,
        classId: cls.id,
        name: 'A',
      },
    });

    console.log(`[${i + 1}/21] Created Department: "${dept.name}" (Code: ${dept.code}, ID: ${dept.id})`);
  }

  // Verification
  const count = await prisma.department.count();
  const allDepts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  console.log(`\n=== VERIFICATION ===`);
  console.log(`Total departments in DB: ${count} (Expected: 21)`);
  allDepts.forEach((d, idx) => {
    console.log(`  ${idx + 1}. [${d.code}] ${d.name} (id: ${d.id})`);
  });

  if (count !== 21) {
    throw new Error(`Department count mismatch! Expected 21, found ${count}`);
  }

  console.log('\n✅ All 21 exact departments configured successfully with complete hierarchy!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during department configuration:', err);
  process.exit(1);
});
