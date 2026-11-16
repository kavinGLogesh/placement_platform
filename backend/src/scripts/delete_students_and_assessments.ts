import { prisma } from '../config/prisma.config.js';

async function main() {
  console.log('================================================================');
  console.log('  STARTING CLEANUP: DELETE ALL STUDENT DETAILS & ASSESSMENTS    ');
  console.log('================================================================\n');

  const initialStudents = await prisma.student.count();
  const initialStudentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
  const initialAssessments = await prisma.assessment.count();
  const initialAttempts = await prisma.assessmentAttempt.count();
  const initialAdminUsers = await prisma.user.count({
    where: { role: { in: ['SUPER_ADMIN', 'PLACEMENT_ADMIN'] } },
  });

  console.log(`[Before Cleanup]`);
  console.log(`- Students: ${initialStudents}`);
  console.log(`- Student User Accounts: ${initialStudentUsers}`);
  console.log(`- Assessments: ${initialAssessments}`);
  console.log(`- Assessment Attempts: ${initialAttempts}`);
  console.log(`- Admin Accounts (Protected): ${initialAdminUsers}\n`);

  await prisma.$transaction(
    async (tx) => {
      // -------------------------------------------------------------
      // PART 1: GATHER STUDENT AND USER IDENTIFIERS
      // -------------------------------------------------------------
      const allStudents = await tx.student.findMany({
        select: { id: true, userId: true },
      });
      const studentIds = allStudents.map((s) => s.id);

      const studentUsers = await tx.user.findMany({
        where: {
          OR: [
            { role: 'STUDENT' },
            { id: { in: allStudents.map((s) => s.userId).filter((id): id is string => Boolean(id)) } },
          ],
        },
        select: { id: true },
      });
      const studentUserIds = studentUsers.map((u) => u.id);

      console.log(`Identified ${studentIds.length} student profile(s) and ${studentUserIds.length} student user account(s).`);

      // -------------------------------------------------------------
      // PART 2: DELETE ALL ASSESSMENT CHILD RECORDS & ASSESSMENTS
      // -------------------------------------------------------------
      console.log('\n--- 1. DELETING ASSESSMENT DATA ---');

      // 1. Coding Submissions & Execution Results
      const codingResults = await tx.codingExecutionResult.deleteMany({});
      console.log(`- Deleted ${codingResults.count} Coding Execution Results.`);

      const codingSubs = await tx.codingSubmission.deleteMany({});
      console.log(`- Deleted ${codingSubs.count} Coding Submissions.`);

      // 2. Assessment Results & Violations
      const violations = await tx.attemptViolation.deleteMany({});
      console.log(`- Deleted ${violations.count} Attempt Violations.`);

      const answers = await tx.attemptAnswer.deleteMany({});
      console.log(`- Deleted ${answers.count} Attempt Answers.`);

      const results = await tx.assessmentResult.deleteMany({});
      console.log(`- Deleted ${results.count} Assessment Results.`);

      // 3. Assessment Attempts
      const attempts = await tx.assessmentAttempt.deleteMany({});
      console.log(`- Deleted ${attempts.count} Assessment Attempts.`);

      // 4. Assessment Assignments
      const assignments = await tx.assessmentAssignment.deleteMany({});
      console.log(`- Deleted ${assignments.count} Assessment Assignments.`);

      // 5. Assessment Papers & Questions
      const asmtQuestions = await tx.assessmentQuestion.deleteMany({});
      console.log(`- Deleted ${asmtQuestions.count} Assessment Questions.`);

      const asmtPapers = await tx.assessmentPaper.deleteMany({});
      console.log(`- Deleted ${asmtPapers.count} Assessment Papers.`);

      // 6. Assessment Sections
      const asmtSections = await tx.assessmentSection.deleteMany({});
      console.log(`- Deleted ${asmtSections.count} Assessment Sections.`);

      // 7. Attendance Logs & Alerts
      const emailLogs = await tx.attendanceEmailLog.deleteMany({});
      console.log(`- Deleted ${emailLogs.count} Attendance Email Logs.`);

      const notifs = await tx.attendanceNotification.deleteMany({});
      console.log(`- Deleted ${notifs.count} Attendance Notifications.`);

      const autoConfigs = await tx.attendanceAutomationConfig.deleteMany({});
      console.log(`- Deleted ${autoConfigs.count} Attendance Automation Configs.`);

      // 8. Question Usage records
      const usages = await tx.questionUsage.deleteMany({});
      console.log(`- Deleted ${usages.count} Question Usage Records.`);

      // 9. Assessments Table
      const deletedAssessments = await tx.assessment.deleteMany({});
      console.log(`- Deleted ${deletedAssessments.count} Assessments.`);

      // -------------------------------------------------------------
      // PART 3: DELETE ALL STUDENT DETAILS & LINKED RECORDS
      // -------------------------------------------------------------
      console.log('\n--- 2. DELETING STUDENT DETAILS & ACADEMIC DATA ---');

      // 10. Placement Drive Candidate Audit Logs & Registrations
      const driveAudit = await tx.driveCandidateAuditLog.deleteMany({});
      console.log(`- Deleted ${driveAudit.count} Drive Candidate Audit Logs.`);

      const driveRegs = await tx.driveRegistration.deleteMany({});
      console.log(`- Deleted ${driveRegs.count} Placement Drive Registrations.`);

      // 11. Student Notifications
      const studentNotifs = await tx.studentNotification.deleteMany({});
      console.log(`- Deleted ${studentNotifs.count} Student Notifications.`);

      // 12. Student Skills
      const skills = await tx.studentSkill.deleteMany({});
      console.log(`- Deleted ${skills.count} Student Skills.`);

      // 13. Student Audit Logs
      const auditLogs = await tx.studentAuditLog.deleteMany({});
      console.log(`- Deleted ${auditLogs.count} Student Audit Logs.`);

      // 14. Student Academic & Semester Records
      const semesters = await tx.studentSemesterRecord.deleteMany({});
      console.log(`- Deleted ${semesters.count} Student Semester Records.`);

      const academicRecords = await tx.studentAcademicRecord.deleteMany({});
      console.log(`- Deleted ${academicRecords.count} Student Academic Records.`);

      // 15. GD Rounds & Evaluations
      const gdCriterionScores = await tx.gdCriterionScore.deleteMany({});
      console.log(`- Deleted ${gdCriterionScores.count} GD Criterion Scores.`);

      const gdEvals = await tx.gdEvaluation.deleteMany({});
      console.log(`- Deleted ${gdEvals.count} GD Evaluations.`);

      const gdParticipants = await tx.gdParticipant.deleteMany({});
      console.log(`- Deleted ${gdParticipants.count} GD Participants.`);

      // 16. Technical & HR Interviews
      const intCriterionScores = await tx.interviewCriterionScore.deleteMany({});
      console.log(`- Deleted ${intCriterionScores.count} Interview Criterion Scores.`);

      const intEvals = await tx.interviewEvaluation.deleteMany({});
      console.log(`- Deleted ${intEvals.count} Interview Evaluations.`);

      const intParticipants = await tx.interviewParticipant.deleteMany({});
      console.log(`- Deleted ${intParticipants.count} Interview Participants.`);

      // 17. Chat Messages & Memberships for Student Users
      if (studentUserIds.length > 0) {
        const receipts = await tx.chatMessageReceipt.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        console.log(`- Deleted ${receipts.count} Chat Receipts for student accounts.`);

        const chatMessages = await tx.chatMessage.deleteMany({
          where: { senderId: { in: studentUserIds } },
        });
        console.log(`- Deleted ${chatMessages.count} Chat Messages sent by student accounts.`);

        const groupMembers = await tx.chatGroupMember.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        console.log(`- Deleted ${groupMembers.count} Chat Group Memberships for student accounts.`);

        const refreshTokens = await tx.refreshToken.deleteMany({
          where: { userId: { in: studentUserIds } },
        });
        console.log(`- Deleted ${refreshTokens.count} Refresh Tokens for student accounts.`);
      }

      // 18. Student Profiles ("students" table)
      const deletedStudents = await tx.student.deleteMany({});
      console.log(`- Deleted ${deletedStudents.count} Students from "students" table.`);

      // 19. Student User Accounts ("users" table where role === 'STUDENT')
      const deletedStudentUsers = await tx.user.deleteMany({
        where: { role: 'STUDENT' },
      });
      console.log(`- Deleted ${deletedStudentUsers.count} Student User Accounts from "users" table.`);

      // 20. Student Import History
      const importHist = await tx.studentImportHistory.deleteMany({});
      console.log(`- Deleted ${importHist.count} Student Import History logs.`);
    },
    {
      timeout: 60000, // 60s transaction timeout for complete safety
    }
  );

  // -------------------------------------------------------------
  // PART 4: POST-DELETION VERIFICATION AUDIT
  // -------------------------------------------------------------
  const remainingStudents = await prisma.student.count();
  const remainingStudentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
  const remainingAssessments = await prisma.assessment.count();
  const remainingAttempts = await prisma.assessmentAttempt.count();
  const remainingAdminUsers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'PLACEMENT_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });

  console.log('\n================================================================');
  console.log('              POST-CLEANUP VERIFICATION AUDIT                   ');
  console.log('================================================================');
  console.log(`Remaining Students: ${remainingStudents} (Expected: 0)`);
  console.log(`Remaining Student Users: ${remainingStudentUsers} (Expected: 0)`);
  console.log(`Remaining Assessments: ${remainingAssessments} (Expected: 0)`);
  console.log(`Remaining Assessment Attempts: ${remainingAttempts} (Expected: 0)`);
  console.log(`Admin User Accounts Preserved: ${remainingAdminUsers.length} (Expected: >= 2)`);
  remainingAdminUsers.forEach((admin) => {
    console.log(`   - [${admin.role}] ${admin.email}`);
  });

  if (
    remainingStudents !== 0 ||
    remainingStudentUsers !== 0 ||
    remainingAssessments !== 0 ||
    remainingAttempts !== 0 ||
    remainingAdminUsers.length === 0
  ) {
    throw new Error('Verification failed! Database state is not clean or admin accounts were affected.');
  }

  console.log('\n>>> SUCCESS: All student details and all assessments have been cleanly and completely deleted! <<<');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\nFatal error during cleanup:', err);
  process.exit(1);
});

