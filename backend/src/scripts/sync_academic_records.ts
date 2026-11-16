import { PrismaClient } from '@prisma/client';
import { getAcademicStructure } from '../utils/academic-structure.util.js';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Starting Student Academic Records Synchronization Audit ===');

  const students = await prisma.student.findMany({
    include: {
      department: true,
      course: true,
      class: true,
      academicRecord: {
        include: {
          semesters: true,
        },
      },
    },
  });

  console.log(`Found ${students.length} students in the database to audit.`);

  let updatedCount = 0;
  let alreadyValidCount = 0;

  for (const student of students) {
    const structure = getAcademicStructure({
      degreeLevel: (student.course as any)?.durationYears === 2 ? 'PG' : 'UG',
      degreeName: student.course?.name,
      courseName: student.course?.name,
      courseCode: student.course?.code,
      departmentName: student.department?.name,
      departmentCode: student.department?.code,
      durationYears: (student.course as any)?.durationYears,
    });

    const existingRecord = student.academicRecord;
    const cgpa = existingRecord?.currentCgpa ?? existingRecord?.ugCgpa ?? student.cgpa ?? null;
    const pct = existingRecord?.overallPercentage ?? existingRecord?.ugPercentage ?? (cgpa ? parseFloat((cgpa * 9.5).toFixed(2)) : null);
    const currentSem = existingRecord?.currentSemester || Math.min((student.year || 1) * 2 - 1, structure.totalSemesters);

    const acadRecord = await prisma.studentAcademicRecord.upsert({
      where: { studentId: student.id },
      create: {
        studentId: student.id,
        degreeLevel: structure.degreeLevel,
        studyStatus: 'STUDYING',
        currentSemester: currentSem,
        ugDegree: student.course?.name || student.department?.name || 'UG',
        ugBranch: student.department?.name || null,
        ugStatus: 'STUDYING',
        ugCgpa: cgpa,
        ugPercentage: pct,
        currentCgpa: cgpa,
        overallPercentage: pct,
        activeBacklogs: 0,
        historyOfBacklogs: 0,
      },
      update: {
        degreeLevel: existingRecord?.degreeLevel || structure.degreeLevel,
        studyStatus: existingRecord?.studyStatus || existingRecord?.ugStatus || 'STUDYING',
        currentSemester: currentSem,
        ugDegree: existingRecord?.ugDegree || student.course?.name || student.department?.name,
        ugBranch: existingRecord?.ugBranch || student.department?.name,
        ugStatus: existingRecord?.ugStatus || 'STUDYING',
        ugCgpa: existingRecord?.ugCgpa ?? cgpa,
        ugPercentage: existingRecord?.ugPercentage ?? pct,
        currentCgpa: existingRecord?.currentCgpa ?? cgpa,
        overallPercentage: existingRecord?.overallPercentage ?? pct,
      },
    });

    // Ensure semester records match structure.totalSemesters
    const existingSemesters = existingRecord?.semesters || [];
    const existingSemMap = new Map(existingSemesters.map((s) => [s.semesterNumber, s]));

    for (let sem = 1; sem <= structure.totalSemesters; sem++) {
      if (!existingSemMap.has(sem)) {
        await prisma.studentSemesterRecord.create({
          data: {
            academicRecordId: acadRecord.id,
            semesterNumber: sem,
            sgpa: null,
            cgpa: null,
            totalCredits: 24,
            creditsEarned: 24,
            backlogsCount: 0,
          },
        });
      }
    }

    if (!existingRecord || existingSemesters.length < structure.totalSemesters) {
      updatedCount++;
    } else {
      alreadyValidCount++;
    }
  }

  console.log(`Synchronization Complete: ${updatedCount} students synchronized, ${alreadyValidCount} were already up to date.`);
}

main()
  .catch((err) => {
    console.error('Synchronization failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

