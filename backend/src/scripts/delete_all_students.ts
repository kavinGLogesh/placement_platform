import { prisma } from '../config/prisma.config.js';

async function main() {
  console.log('====================================================');
  console.log('   STARTING COMPLETE STUDENT DATA CLEANUP SCRIPT    ');
  console.log('====================================================\n');

  const preStudents = await prisma.student.count();
  const preStudentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
  console.log(`Initial Student Records: ${preStudents}`);
  console.log(`Initial Student User Accounts: ${preStudentUsers}\n`);

  await prisma.$transaction(async (tx) => {
    // 1. Gather all student IDs and user IDs
    const students = await tx.student.findMany({ select: { id: true, userId: true } });
    const studentIds = students.map((s) => s.id);
    const studentUserIds = students.map((s) => s.userId).filter((id): id is string => !!id);

    console.log(`Found ${studentIds.length} students to remove.`);

    if (studentIds.length > 0) {
      // 2. Student Notifications
      const notifs = await tx.studentNotification.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${notifs.count} Student Notifications.`);

      // 3. Drive Candidate Audit Logs
      const driveAudit = await tx.driveCandidateAuditLog.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${driveAudit.count} Drive Candidate Audit Logs.`);

      // 4. Placement Drive Registrations
      const driveRegs = await tx.driveRegistration.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${driveRegs.count} Placement Drive Registrations.`);

      // 5. Student Skills
      const skills = await tx.studentSkill.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${skills.count} Student Skills.`);

      // 6. Student Audit Logs
      const auditLogs = await tx.studentAuditLog.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${auditLogs.count} Student Audit Logs.`);

      // 7. Academic Records & Semester Records
      const academicRecords = await tx.studentAcademicRecord.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const academicIds = academicRecords.map((a) => a.id);
      if (academicIds.length > 0) {
        const semesters = await tx.studentSemesterRecord.deleteMany({
          where: { academicRecordId: { in: academicIds } },
        });
        console.log(`- Deleted ${semesters.count} Student Semester Records.`);

        const deletedAcademic = await tx.studentAcademicRecord.deleteMany({
          where: { id: { in: academicIds } },
        });
        console.log(`- Deleted ${deletedAcademic.count} Student Academic Records.`);
      }

      // 8. Attempt Violations
      const violations = await tx.attemptViolation.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${violations.count} Attempt Violations.`);

      // 9. GD Evaluations & Participants
      const gdParticipants = await tx.gdParticipant.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const gdPartIds = gdParticipants.map((p) => p.id);
      if (gdPartIds.length > 0) {
        const gdEvals = await tx.gdEvaluation.findMany({
          where: { participantId: { in: gdPartIds } },
          select: { id: true },
        });
        const gdEvalIds = gdEvals.map((e) => e.id);
        if (gdEvalIds.length > 0) {
          await tx.gdCriterionScore.deleteMany({ where: { evaluationId: { in: gdEvalIds } } });
          await tx.gdEvaluation.deleteMany({ where: { id: { in: gdEvalIds } } });
        }
        await tx.gdParticipant.deleteMany({ where: { id: { in: gdPartIds } } });
        console.log(`- Deleted ${gdPartIds.length} GD Participants & associated evaluations.`);
      }

      // 10. Interview Evaluations & Participants
      const intParticipants = await tx.interviewParticipant.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const intPartIds = intParticipants.map((p) => p.id);
      if (intPartIds.length > 0) {
        const intEvals = await tx.interviewEvaluation.findMany({
          where: { participantId: { in: intPartIds } },
          select: { id: true },
        });
        const intEvalIds = intEvals.map((e) => e.id);
        if (intEvalIds.length > 0) {
          await tx.interviewCriterionScore.deleteMany({ where: { evaluationId: { in: intEvalIds } } });
          await tx.interviewEvaluation.deleteMany({ where: { id: { in: intEvalIds } } });
        }
        await tx.interviewParticipant.deleteMany({ where: { id: { in: intPartIds } } });
        console.log(`- Deleted ${intPartIds.length} Interview Participants & associated evaluations.`);
      }

      // 11. Attendance Email Logs
      const logs = await tx.attendanceEmailLog.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${logs.count} Attendance Email Logs.`);

      // 12. Coding Submissions & Executions
      const codingSubs = await tx.codingSubmission.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const codingSubIds = codingSubs.map((c) => c.id);
      if (codingSubIds.length > 0) {
        await tx.codingExecutionResult.deleteMany({
          where: { submissionId: { in: codingSubIds } },
        });
        await tx.codingSubmission.deleteMany({
          where: { id: { in: codingSubIds } },
        });
        console.log(`- Deleted ${codingSubIds.length} Coding Submissions & Executions.`);
      }

      // 13. Assessment Attempts, Answers & Results
      const attempts = await tx.assessmentAttempt.findMany({
        where: { studentId: { in: studentIds } },
        select: { id: true },
      });
      const attemptIds = attempts.map((a) => a.id);
      if (attemptIds.length > 0) {
        await tx.attemptAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } });
        await tx.assessmentResult.deleteMany({
          where: { OR: [{ studentId: { in: studentIds } }, { attemptId: { in: attemptIds } }] },
        });
        await tx.assessmentAttempt.deleteMany({ where: { id: { in: attemptIds } } });
        console.log(`- Deleted ${attemptIds.length} Assessment Attempts & Answers.`);
      }

      // 14. Assessment Assignments
      const assignments = await tx.assessmentAssignment.deleteMany({
        where: { studentId: { in: studentIds } },
      });
      console.log(`- Deleted ${assignments.count} Assessment Assignments.`);

      // 15. Unlink Question Usage
      await tx.questionUsage.updateMany({
        where: { studentId: { in: studentIds } },
        data: { studentId: null },
      });

      // 16. Refresh Tokens for Student Users
      const allStudentUsers = await tx.user.findMany({
        where: {
          OR: [
            { role: 'STUDENT' },
            { id: { in: studentUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStudentUserIds = allStudentUsers.map((u) => u.id);
      if (allStudentUserIds.length > 0) {
        const tokens = await tx.refreshToken.deleteMany({
          where: { userId: { in: allStudentUserIds } },
        });
        console.log(`- Deleted ${tokens.count} Refresh Tokens for student accounts.`);
      }

      // 17. Delete Student Records
      const deletedStudents = await tx.student.deleteMany();
      console.log(`- Deleted ${deletedStudents.count} Students from "students" table.`);

      // 18. Delete Student Users (strictly role === 'STUDENT')
      const deletedUsers = await tx.user.deleteMany({
        where: { role: 'STUDENT' },
      });
      console.log(`- Deleted ${deletedUsers.count} Student User Accounts from "users" table.`);

      // 19. Clean student import history if any
      const importHist = await tx.studentImportHistory.deleteMany();
      console.log(`- Cleared ${importHist.count} Student Import History logs.`);
    }
  });

  // Post-deletion verification
  const postStudents = await prisma.student.count();
  const postStudentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
  const postAdmins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'PLACEMENT_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });

  console.log('\n====================================================');
  console.log('            POST-DELETION VERIFICATION             ');
  console.log('====================================================');
  console.log(`Remaining Students in DB: ${postStudents} (Expected: 0)`);
  console.log(`Remaining Student User Accounts in DB: ${postStudentUsers} (Expected: 0)`);
  console.log(`Admin Accounts Preserved: ${postAdmins.length} (Expected: 2)`);
  postAdmins.forEach((a) => console.log(`   🛡️ ${a.role}: ${a.email}`));

  if (postStudents !== 0 || postStudentUsers !== 0 || postAdmins.length !== 2) {
    throw new Error('Verification failed! Database state did not match expected clean state.');
  }

  console.log('\nSUCCESS: All student records and details have been completely and cleanly deleted!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during student deletion:', err);
  process.exit(1);
});

