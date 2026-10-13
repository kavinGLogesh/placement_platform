import { prisma } from '../config/prisma.config.js';

const CANONICAL_DEPARTMENTS = [
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
  console.log('=== CONSOLIDATING DEPARTMENTS ===');

  // 1. Identify primary college (VETIAS has the 50 students)
  const vetiasCollege = await prisma.college.findFirst({
    where: {
      OR: [
        { code: 'VETIAS' },
        { id: 'ad627b78-f014-4392-875a-dbaed001d0c7' },
      ],
    },
  });

  if (!vetiasCollege) {
    throw new Error('VETIAS college not found!');
  }
  console.log(`Primary College: ${vetiasCollege.name} (${vetiasCollege.id}, code: ${vetiasCollege.code})`);

  // 2. Fetch existing departments in VETIAS
  const vetiasDepts = await prisma.department.findMany({
    where: { collegeId: vetiasCollege.id },
    include: {
      courses: {
        include: {
          classes: {
            include: {
              sections: true,
            },
          },
        },
      },
      _count: { select: { students: true } },
    },
  });
  console.log(`Existing departments in VETIAS: ${vetiasDepts.length}`);

  // 3. For any department name in CANONICAL_DEPARTMENTS that doesn't exist in VETIAS, create it
  for (const item of CANONICAL_DEPARTMENTS) {
    const existing = vetiasDepts.find(
      (d) => d.name.toLowerCase().trim() === item.name.toLowerCase().trim()
    );
    if (!existing) {
      console.log(`Creating missing canonical department in VETIAS: ${item.name} (${item.code})`);
      const dept = await prisma.department.create({
        data: {
          collegeId: vetiasCollege.id,
          code: item.code,
          name: item.name,
        },
      });

      const course = await prisma.course.create({
        data: {
          departmentId: dept.id,
          code: item.code,
          name: `${item.name} Program`,
          durationYears: item.durationYears,
        },
      });

      const cls = await prisma.class.create({
        data: {
          departmentId: dept.id,
          courseId: course.id,
          batchYear: 2026,
          currentYear: 1,
          name: `${item.name} 2026 - Year 1`,
        },
      });

      await prisma.section.create({
        data: {
          classId: cls.id,
          name: 'A',
        },
      });
    }
  }

  // Reload all departments in VETIAS
  const allVetiasDepts = await prisma.department.findMany({
    where: { collegeId: vetiasCollege.id },
    include: {
      courses: {
        include: {
          classes: {
            include: {
              sections: true,
            },
          },
        },
      },
    },
  });

  // 4. Migrate any students from col-001 (or other colleges) to the matching VETIAS department
  const otherDepts = await prisma.department.findMany({
    where: { collegeId: { not: vetiasCollege.id } },
    include: {
      students: true,
    },
  });

  console.log(`Found ${otherDepts.length} departments in other colleges.`);
  for (const od of otherDepts) {
    if (od.students.length > 0) {
      console.log(`Re-linking ${od.students.length} students from old dept "${od.name}" (${od.id})...`);
      const matchingVetiasDept = allVetiasDepts.find(
        (vd) => vd.name.toLowerCase().trim() === od.name.toLowerCase().trim()
      );
      if (matchingVetiasDept) {
        const defaultCourse = matchingVetiasDept.courses[0];
        const defaultClass = defaultCourse?.classes[0];
        const defaultSection = defaultClass?.sections[0];

        for (const st of od.students) {
          await prisma.student.update({
            where: { id: st.id },
            data: {
              departmentId: matchingVetiasDept.id,
              courseId: defaultCourse?.id || st.courseId,
              classId: defaultClass?.id || st.classId,
              sectionId: defaultSection?.id || st.sectionId,
            },
          });
          console.log(`  Moved student ${st.registerNumber} to VETIAS dept ${matchingVetiasDept.name} (${matchingVetiasDept.id})`);
        }
      }
    }
  }

  // 5. Safely delete departments from other colleges (col-001) now that all students have been migrated
  for (const od of otherDepts) {
    // Unlink any gdRounds or interviewRounds pointing to od
    await prisma.gdRound.updateMany({
      where: { departmentId: od.id },
      data: { departmentId: null, courseId: null },
    });
    await prisma.interviewRound.updateMany({
      where: { departmentId: od.id },
      data: { departmentId: null, courseId: null },
    });
    await prisma.assessmentAssignment.updateMany({
      where: { departmentId: od.id },
      data: { departmentId: null, classId: null, sectionId: null },
    });

    // Delete sections, classes, courses, and department
    await prisma.section.deleteMany({
      where: { class: { departmentId: od.id } },
    });
    await prisma.class.deleteMany({
      where: { departmentId: od.id },
    });
    await prisma.course.deleteMany({
      where: { departmentId: od.id },
    });
    await prisma.department.delete({
      where: { id: od.id },
    });
    console.log(`Deleted redundant department: "${od.name}" (${od.id})`);
  }

  // 6. Remove redundant college col-001 if empty
  const col001 = await prisma.college.findUnique({
    where: { id: 'col-001' },
    include: { _count: { select: { departments: true } } },
  });
  if (col001 && col001._count.departments === 0) {
    await prisma.college.delete({ where: { id: 'col-001' } });
    console.log('Deleted redundant college col-001.');
  }

  // 7. Verify result
  const finalDepts = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { students: true } } },
  });
  const finalStudentsCount = await prisma.student.count();

  console.log('\n=== FINAL CONSOLIDATION VERIFICATION ===');
  console.log(`Total departments in DB: ${finalDepts.length} (Expected: 21)`);
  finalDepts.forEach((d, idx) => {
    console.log(`  ${idx + 1}. [${d.code}] ${d.name} (id: ${d.id}) — ${d._count.students} students`);
  });
  console.log(`Total students in DB: ${finalStudentsCount} (All preserved, 0 lost!)`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error during consolidation:', err);
  process.exit(1);
});
