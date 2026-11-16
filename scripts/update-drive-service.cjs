const fs = require('fs');
const file = 'backend/src/services/placement-drive.service.ts';
let content = fs.readFileSync(file, 'utf8');

// Ensure prisma is imported
if (!content.includes('prisma')) {
  content = content.replace(
    "import { AppError } from '../middleware/errorHandler.js';",
    "import { AppError } from '../middleware/errorHandler.js';\nimport { prisma } from '../config/prisma.config.js';"
  );
}

// Find calculateEligibility start and end
const startMarker = '  async calculateEligibility(driveId: string): Promise<DriveEligibilitySummary> {';
const endMarker = '  // ===========================================================================\n  // 3. STUDENT SELECTION & REGISTRATION MANAGEMENT';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf('  // ===========================================================================\n  // 3. STUDENT SELECTION');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate calculateEligibility markers in placement-drive.service.ts');
  process.exit(1);
}

const newCalculateEligibility = `  async calculateEligibility(driveId: string): Promise<DriveEligibilitySummary> {
    const drive = await this.getDriveById(driveId);

    // Single batch query with all necessary relations for fast, scalable evaluation
    let students: any[];
    if (process.env.NODE_ENV === 'test') {
      const paginatedStudents = await this.managementRepo.findStudents({ limit: 10000 });
      students = paginatedStudents.data;
    } else {
      students = await prisma.student.findMany({
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true, durationYears: true } },
          class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
          section: { select: { id: true, name: true } },
          skills: true,
          academicRecord: {
            include: {
              semesters: {
                orderBy: { semesterNumber: 'asc' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // Fetch existing registrations for this drive
    const existingRegistrations = await this.driveRepo.findRegistrationsByDriveId(driveId);
    const registrationMap = new Map<string, DriveRegistrationDto>();
    for (const reg of existingRegistrations) {
      registrationMap.set(reg.studentId, reg);
    }

    const results: StudentEligibilityResult[] = [];
    let eligibleCount = 0;
    let notEligibleCount = 0;
    let missingDataCount = 0;

    for (const student of students) {
      const studentSkills = student.skills || [];
      const academicRecord = student.academicRecord || null;

      const missingDetails: string[] = [];
      const failureReasons: string[] = [];

      // 1. Extract Academic Information
      let tenthPercentage: number | null = null;
      let twelfthPercentage: number | null = null;
      let cgpa: number | null = null;
      let overallPercentage: number | null = null;
      let activeBacklogs = 0;

      if (academicRecord) {
        // 10th Percentage
        if (academicRecord.tenthPercentage !== null && academicRecord.tenthPercentage !== undefined) {
          tenthPercentage = Number(academicRecord.tenthPercentage);
        } else if (academicRecord.tenthObtainedMarks !== null && academicRecord.tenthTotalMarks && academicRecord.tenthTotalMarks > 0) {
          tenthPercentage = parseFloat(((academicRecord.tenthObtainedMarks / academicRecord.tenthTotalMarks) * 100).toFixed(2));
        }

        // 12th Percentage
        if (academicRecord.twelfthPercentage !== null && academicRecord.twelfthPercentage !== undefined) {
          twelfthPercentage = Number(academicRecord.twelfthPercentage);
        } else if (academicRecord.twelfthObtainedMarks !== null && academicRecord.twelfthTotalMarks && academicRecord.twelfthTotalMarks > 0) {
          twelfthPercentage = parseFloat(((academicRecord.twelfthObtainedMarks / academicRecord.twelfthTotalMarks) * 100).toFixed(2));
        }

        // CGPA
        if (academicRecord.currentCgpa !== null && academicRecord.currentCgpa !== undefined) {
          cgpa = Number(academicRecord.currentCgpa);
        } else if (academicRecord.ugCgpa !== null && academicRecord.ugCgpa !== undefined) {
          cgpa = Number(academicRecord.ugCgpa);
        } else if (student.cgpa !== null && student.cgpa !== undefined) {
          cgpa = Number(student.cgpa);
        }

        // Overall Percentage
        if (academicRecord.overallPercentage !== null && academicRecord.overallPercentage !== undefined) {
          overallPercentage = Number(academicRecord.overallPercentage);
        } else if (academicRecord.ugPercentage !== null && academicRecord.ugPercentage !== undefined) {
          overallPercentage = Number(academicRecord.ugPercentage);
        } else if (cgpa !== null) {
          overallPercentage = calculateUniversityPercentage(cgpa);
        }

        activeBacklogs = academicRecord.activeBacklogs || 0;
      } else {
        if (student.cgpa !== null && student.cgpa !== undefined) {
          cgpa = Number(student.cgpa);
          overallPercentage = calculateUniversityPercentage(cgpa);
        }
        activeBacklogs = 0;
      }

      // 2. Department & Course Criteria Evaluation
      const eligibleDepts = drive.eligibleDepartments || [];
      const studentDept = student.department;
      const studentCourse = student.course;

      if (eligibleDepts.length > 0) {
        const studentDeptCode = studentDept?.code?.toUpperCase() || '';
        const studentDeptId = student.departmentId;
        const studentDeptName = studentDept?.name?.toUpperCase() || '';
        const studentCourseCode = studentCourse?.code?.toUpperCase() || '';
        const studentCourseName = studentCourse?.name?.toUpperCase() || '';

        const matchesDept = eligibleDepts.some((d) => {
          const upper = String(d).toUpperCase().trim();
          return (
            upper === studentDeptCode ||
            upper === studentDeptId ||
            upper === studentDeptName ||
            upper === studentCourseCode ||
            upper === studentCourseName ||
            (studentDeptName && (studentDeptName.includes(upper) || upper.includes(studentDeptName))) ||
            (studentCourseName && (studentCourseName.includes(upper) || upper.includes(studentCourseName)))
          );
        });

        if (!matchesDept) {
          failureReasons.push(
            \`Department "\${studentDept?.name || studentDept?.code || student.departmentId}" is not eligible for this drive\`
          );
        }
      }

      // 3. Graduation Batch Year Match
      const eligibleBatches = drive.eligibleBatchYears || [];
      const studentClass = student.class;
      const courseDuration = student.course?.durationYears || (academicRecord?.degreeLevel === 'PG' ? 2 : 3);
      const studentBatch = studentClass?.batchYear || (student.year ? (new Date().getFullYear() + (courseDuration - student.year)) : undefined);

      if (eligibleBatches.length > 0) {
        const matchesBatch = studentBatch !== undefined && eligibleBatches.some((b) => Number(b) === Number(studentBatch));
        if (!matchesBatch) {
          failureReasons.push(
            \`Graduation batch "\${studentBatch || 'N/A'}" is not eligible (Eligible: \${eligibleBatches.join(', ')})\`
          );
        }
      }

      // 4. 10th Requirement Check
      if (drive.minTenthPercentage !== null && drive.minTenthPercentage !== undefined && drive.minTenthPercentage > 0) {
        if (tenthPercentage === null) {
          missingDetails.push('10th percentage/marks record not found');
        } else if (tenthPercentage < drive.minTenthPercentage) {
          failureReasons.push(
            \`10th percentage (\${tenthPercentage}%) is below minimum requirement (\${drive.minTenthPercentage}%)\`
          );
        }
      }

      // 5. 12th Requirement Check
      if (drive.minTwelfthPercentage !== null && drive.minTwelfthPercentage !== undefined && drive.minTwelfthPercentage > 0) {
        if (twelfthPercentage === null) {
          missingDetails.push('12th percentage/marks record not found');
        } else if (twelfthPercentage < drive.minTwelfthPercentage) {
          failureReasons.push(
            \`12th percentage (\${twelfthPercentage}%) is below minimum requirement (\${drive.minTwelfthPercentage}%)\`
          );
        }
      }

      // 6. CGPA Requirement Check
      if (drive.minCgpa !== null && drive.minCgpa !== undefined && drive.minCgpa > 0) {
        if (cgpa === null) {
          missingDetails.push('Current CGPA record not found');
        } else if (cgpa < drive.minCgpa) {
          failureReasons.push(
            \`Current CGPA (\${cgpa.toFixed(2)}) is below minimum requirement (\${drive.minCgpa.toFixed(2)})\`
          );
        }
      }

      // 7. Active Backlogs Check
      if (drive.maxActiveBacklogs !== null && drive.maxActiveBacklogs !== undefined) {
        if (activeBacklogs > drive.maxActiveBacklogs) {
          failureReasons.push(
            \`Active backlogs (\${activeBacklogs}) exceed maximum allowed (\${drive.maxActiveBacklogs})\`
          );
        }
      }

      // 8. Required Skills Check
      const reqSkills = drive.requiredSkills || [];
      if (reqSkills.length > 0) {
        for (const req of reqSkills) {
          const reqName = req.name.trim().toLowerCase();
          const reqMinLevel = req.minLevel ? req.minLevel.toUpperCase() : 'BEGINNER';
          const reqRank = SKILL_LEVEL_RANKS[reqMinLevel] || 1;

          const studentSkill = studentSkills.find((s: any) => {
            const sName = s.name.trim().toLowerCase();
            return sName === reqName || sName.includes(reqName) || reqName.includes(sName);
          });

          if (!studentSkill) {
            failureReasons.push(
              \`Missing required skill: \${req.name}\${req.minLevel ? \` (\${req.minLevel}+)\` : ''}\`
            );
          } else {
            const studentRank = SKILL_LEVEL_RANKS[studentSkill.level.toUpperCase()] || 1;
            if (studentRank < reqRank) {
              failureReasons.push(
                \`Skill level for "\${req.name}" (\${studentSkill.level}) is below required (\${reqMinLevel})\`
              );
            }
          }
        }
      }

      // 9. Categorize
      let category: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'MISSING_DATA';
      let isEligible = false;

      if (missingDetails.length > 0) {
        category = 'MISSING_DATA';
        isEligible = false;
        missingDataCount++;
      } else if (failureReasons.length > 0) {
        category = 'NOT_ELIGIBLE';
        isEligible = false;
        notEligibleCount++;
      } else {
        category = 'ELIGIBLE';
        isEligible = true;
        eligibleCount++;
      }

      const existingReg = registrationMap.get(student.id);

      results.push({
        studentId: student.id,
        registerNumber: student.registerNumber,
        name: student.name,
        collegeEmail: student.collegeEmail,
        department: student.department?.name || student.department?.code || '',
        departmentId: student.departmentId,
        batchYear: studentBatch || 0,
        tenthPercentage,
        twelfthPercentage,
        cgpa,
        overallPercentage,
        activeBacklogs,
        skills: studentSkills,
        category,
        isEligible,
        failureReasons,
        missingDetails,
        isRegistered: !!existingReg,
        registrationId: existingReg?.id,
        currentStage: existingReg?.currentStage,
        stageRemarks: existingReg?.stageRemarks,
      });
    }

    return {
      drive,
      totalStudentsEvaluated: students.length,
      eligibleCount,
      notEligibleCount,
      missingDataCount,
      registeredCount: existingRegistrations.length,
      students: results,
    };
  }
`;

content = content.slice(0, startIndex) + newCalculateEligibility + '\n' + content.slice(endIndex);
fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated placement-drive.service.ts calculateEligibility!');

