const fs = require('fs');
const file = 'backend/src/services/management.service.ts';
let content = fs.readFileSync(file, 'utf8');

// Ensure getAcademicStructure is imported
if (!content.includes('getAcademicStructure')) {
  content = content.replace(
    "import { parseStudentExcel } from '../utils/excel.util.js';",
    "import { parseStudentExcel } from '../utils/excel.util.js';\nimport { getAcademicStructure } from '../utils/academic-structure.util.js';\nimport { prisma } from '../config/prisma.config.js';"
  );
}

// Target the duplicate check block in importStudentsFromExcel
const targetDuplicateBlock = `      // 2. Database duplicate check
      const existingStudent = await this.repo.findStudentByRegisterNumber(regUpper);
      if (existingStudent) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Register Number',
          message: \`Register number "\${regUpper}" already exists in database\`,
        });
        continue;
      }`;

const replacementDuplicateBlock = `      // 2. Check if student already exists -> Synchronize personal and academic details
      const existingStudent = await this.repo.findStudentByRegisterNumber(regUpper);
      if (existingStudent) {
        const dept = allDepts.find((d) => d.code === row.departmentCode) || (existingStudent as any).department;
        const crs = dept ? allCourses.find((c) => c.code === row.courseCode && c.departmentId === dept.id) || (existingStudent as any).course : (existingStudent as any).course;
        const cls = crs && dept ? allClasses.find((cl) => cl.courseId === crs.id && cl.departmentId === dept.id && cl.currentYear === row.year) || (existingStudent as any).class : (existingStudent as any).class;
        const sec = cls ? allSections.find((s) => s.classId === cls.id && s.name === row.sectionName) || (existingStudent as any).section : (existingStudent as any).section;

        const cgpaVal = row.cgpa ?? row.ugCgpa ?? (existingStudent as any).cgpa;

        // Synchronize Student entity
        await this.repo.updateStudent(existingStudent.id, {
          ...(row.name ? { name: row.name } : {}),
          ...(row.phone ? { phone: row.phone } : {}),
          ...(dept ? { departmentId: dept.id } : {}),
          ...(crs ? { courseId: crs.id } : {}),
          ...(cls ? { classId: cls.id } : {}),
          ...(sec ? { sectionId: sec.id } : {}),
          ...(row.year ? { year: row.year } : {}),
          ...(cgpaVal !== undefined && cgpaVal !== null ? { cgpa: cgpaVal } : {}),
        });

        // Resolve academic structure
        const structure = getAcademicStructure({
          degreeLevel: row.degreeLevel,
          degreeName: row.ugDegree || row.pgDegree || crs?.name,
          courseCode: row.courseCode,
          departmentCode: row.departmentCode,
        });

        const currentSem = row.currentSemester || Math.min((row.year || (existingStudent as any).year || 1) * 2 - 1, structure.totalSemesters);
        const overallPct = row.ugPercentage ?? (cgpaVal ? parseFloat((cgpaVal * 9.5).toFixed(2)) : null);

        const syncAcadData = {
          tenthBoard: row.tenthBoard ?? null,
          tenthPassingYear: row.tenthPassingYear ?? null,
          tenthObtainedMarks: row.tenthObtainedMarks ?? null,
          tenthTotalMarks: row.tenthTotalMarks ?? null,
          tenthPercentage: row.tenthPercentage ?? null,
          twelfthBoard: row.twelfthBoard ?? null,
          twelfthPassingYear: row.twelfthPassingYear ?? null,
          twelfthObtainedMarks: row.twelfthObtainedMarks ?? null,
          twelfthTotalMarks: row.twelfthTotalMarks ?? null,
          twelfthPercentage: row.twelfthPercentage ?? null,
          degreeLevel: row.degreeLevel || structure.degreeLevel,
          ugDegree: row.ugDegree || crs?.name || 'UG',
          ugBranch: row.ugBranch || dept?.name || null,
          ugStatus: row.ugStatus || 'STUDYING',
          ugCgpa: row.ugCgpa ?? cgpaVal,
          ugPercentage: row.ugPercentage ?? overallPct,
          currentSemester: currentSem,
          activeBacklogs: row.activeBacklogs ?? 0,
          historyOfBacklogs: row.historyOfBacklogs ?? 0,
          pgDegree: row.pgDegree ?? null,
          pgStatus: row.pgStatus ?? null,
          pgCgpa: row.pgCgpa ?? null,
          pgPercentage: row.pgPercentage ?? null,
          currentCgpa: cgpaVal,
          overallPercentage: overallPct,
        };

        await prisma.studentAcademicRecord.upsert({
          where: { studentId: existingStudent.id },
          create: {
            studentId: existingStudent.id,
            ...syncAcadData,
          },
          update: {
            ...syncAcadData,
          },
        });

        synchronizedCount++;
        continue;
      }`;

// Target validStudentsToInsert.push
const targetInsertPush = `      validStudentsToInsert.push({
        userId: user.id,
        registerNumber: regUpper,
        name: row.name,
        collegeEmail: emailLower,
        phone: row.phone,
        departmentId: dept.id,
        courseId: crs.id,
        classId: cls.id,
        sectionId: sec.id,
        year: row.year,
        cgpa: row.cgpa ?? row.ugCgpa,
        status: StudentStatus.INACTIVE,
        tenthObtainedMarks: row.tenthObtainedMarks,
        tenthTotalMarks: row.tenthTotalMarks,
        tenthPercentage: row.tenthPercentage,
        twelfthObtainedMarks: row.twelfthObtainedMarks,
        twelfthTotalMarks: row.twelfthTotalMarks,
        twelfthPercentage: row.twelfthPercentage,
        ugDegree: row.ugDegree || crs.name,
        ugStatus: row.ugStatus || 'STUDYING',
        ugCgpa: row.ugCgpa ?? row.cgpa,
        ugPercentage: row.ugPercentage,
        pgDegree: row.pgDegree,
        pgStatus: row.pgStatus,
        pgCgpa: row.pgCgpa,
        pgPercentage: row.pgPercentage,
      });`;

const replacementInsertPush = `      const structure = getAcademicStructure({
        degreeLevel: row.degreeLevel,
        degreeName: row.ugDegree || row.pgDegree || crs.name,
        courseCode: row.courseCode,
        departmentCode: row.departmentCode,
      });
      const currentSem = row.currentSemester || Math.min(row.year * 2 - 1, structure.totalSemesters);
      const overallPct = row.ugPercentage ?? ((row.cgpa ?? row.ugCgpa) ? parseFloat(((row.cgpa ?? row.ugCgpa) * 9.5).toFixed(2)) : undefined);

      validStudentsToInsert.push({
        userId: user.id,
        registerNumber: regUpper,
        name: row.name,
        collegeEmail: emailLower,
        phone: row.phone,
        departmentId: dept.id,
        courseId: crs.id,
        classId: cls.id,
        sectionId: sec.id,
        year: row.year,
        cgpa: row.cgpa ?? row.ugCgpa,
        status: StudentStatus.INACTIVE,
        tenthBoard: row.tenthBoard,
        tenthPassingYear: row.tenthPassingYear,
        tenthObtainedMarks: row.tenthObtainedMarks,
        tenthTotalMarks: row.tenthTotalMarks,
        tenthPercentage: row.tenthPercentage,
        twelfthBoard: row.twelfthBoard,
        twelfthPassingYear: row.twelfthPassingYear,
        twelfthObtainedMarks: row.twelfthObtainedMarks,
        twelfthTotalMarks: row.twelfthTotalMarks,
        twelfthPercentage: row.twelfthPercentage,
        degreeLevel: row.degreeLevel || structure.degreeLevel,
        currentSemester: currentSem,
        ugDegree: row.ugDegree || crs.name,
        ugBranch: row.ugBranch || dept.name,
        ugStatus: row.ugStatus || 'STUDYING',
        ugCgpa: row.ugCgpa ?? row.cgpa,
        ugPercentage: overallPct,
        activeBacklogs: row.activeBacklogs ?? 0,
        historyOfBacklogs: row.historyOfBacklogs ?? 0,
        pgDegree: row.pgDegree,
        pgStatus: row.pgStatus,
        pgCgpa: row.pgCgpa,
        pgPercentage: row.pgPercentage,
      });`;

// Add synchronizedCount variable declaration
if (!content.includes('let synchronizedCount = 0;')) {
  content = content.replace('let duplicateCount = 0;', 'let duplicateCount = 0;\n    let synchronizedCount = 0;');
}

const targetDupCRLF = targetDuplicateBlock.replace(/\r?\n/g, '\r\n');
const replacementDupCRLF = replacementDuplicateBlock.replace(/\r?\n/g, '\r\n');
if (content.includes(targetDupCRLF)) {
  content = content.replace(targetDupCRLF, replacementDupCRLF);
} else {
  const targetDupLF = targetDuplicateBlock.replace(/\r?\n/g, '\n');
  const replacementDupLF = replacementDuplicateBlock.replace(/\r?\n/g, '\n');
  content = content.replace(targetDupLF, replacementDupLF);
}

const targetInsertCRLF = targetInsertPush.replace(/\r?\n/g, '\r\n');
const replacementInsertCRLF = replacementInsertPush.replace(/\r?\n/g, '\r\n');
if (content.includes(targetInsertCRLF)) {
  content = content.replace(targetInsertCRLF, replacementInsertCRLF);
} else {
  const targetInsertLF = targetInsertPush.replace(/\r?\n/g, '\n');
  const replacementInsertLF = replacementInsertPush.replace(/\r?\n/g, '\n');
  content = content.replace(targetInsertLF, replacementInsertLF);
}

// Update return statement to add synchronizedCount to importedCount
content = content.replace(
  'importedCount,',
  'importedCount: importedCount + synchronizedCount,'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated management.service.ts!');

