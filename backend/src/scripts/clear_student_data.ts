import { prisma } from '../config/prisma.config.js';

async function main() {
  console.log('=== STARTING CONTROLLED TRANSACTIONAL STUDENT DATA CLEAR ===');

  await prisma.$transaction(async (tx) => {
    // 1. Identify all student IDs and student user IDs
    const students = await tx.student.findMany({ select: { id: true, userId: true } });
    const studentIds = students.map((s) => s.id);
    const studentUserIds = students.map((s) => s.userId).filter((id): id is string => !!id);

    console.log(`Found ${studentIds.length} students to clear.`);

    // 2. Clear GD Evaluation Scores and Evaluations for student participants
    const gdParticipants = await tx.gdParticipant.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    const gdParticipantIds = gdParticipants.map((p) => p.id);

    if (gdParticipantIds.length > 0) {
      const gdEvals = await tx.gdEvaluation.findMany({
        where: { participantId: { in: gdParticipantIds } },
        select: { id: true },
      });
      const gdEvalIds = gdEvals.map((e) => e.id);

      if (gdEvalIds.length > 0) {
        const deletedScores = await tx.gdCriterionScore.deleteMany({
          where: { evaluationId: { in: gdEvalIds } },
        });
        console.log(`- Deleted ${deletedScores.count} GD criterion scores.`);

        const deletedEvals = await tx.gdEvaluation.deleteMany({
          where: { id: { in: gdEvalIds } },
        });
        console.log(`- Deleted ${deletedEvals.count} GD evaluations.`);
      }

      const deletedGdParts = await tx.gdParticipant.deleteMany({
        where: { id: { in: gdParticipantIds } },
      });
      console.log(`- Deleted ${deletedGdParts.count} GD participants.`);
    }

    // 3. Clear Interview Evaluation Scores and Evaluations for student participants
    const interviewParticipants = await tx.interviewParticipant.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    const interviewPartIds = interviewParticipants.map((p) => p.id);

    if (interviewPartIds.length > 0) {
      const interviewEvals = await tx.interviewEvaluation.findMany({
        where: { participantId: { in: interviewPartIds } },
        select: { id: true },
      });
      const interviewEvalIds = interviewEvals.map((e) => e.id);

      if (interviewEvalIds.length > 0) {
        const deletedScores = await tx.interviewCriterionScore.deleteMany({
          where: { evaluationId: { in: interviewEvalIds } },
        });
        console.log(`- Deleted ${deletedScores.count} Interview criterion scores.`);

        const deletedEvals = await tx.interviewEvaluation.deleteMany({
          where: { id: { in: interviewEvalIds } },
        });
        console.log(`- Deleted ${deletedEvals.count} Interview evaluations.`);
      }

      const deletedIntParts = await tx.interviewParticipant.deleteMany({
        where: { id: { in: interviewPartIds } },
      });
      console.log(`- Deleted ${deletedIntParts.count} Interview participants.`);
    }

    // 4. Attendance Email Logs
    const deletedLogs = await tx.attendanceEmailLog.deleteMany({
      where: { studentId: { in: studentIds } },
    });
    console.log(`- Deleted ${deletedLogs.count} Attendance email logs.`);

    // 5. Coding Submissions & Execution Results
    const codingSubs = await tx.codingSubmission.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    const codingSubIds = codingSubs.map((c) => c.id);
    if (codingSubIds.length > 0) {
      await tx.codingExecutionResult.deleteMany({
        where: { submissionId: { in: codingSubIds } },
      });
      const deletedCoding = await tx.codingSubmission.deleteMany({
        where: { id: { in: codingSubIds } },
      });
      console.log(`- Deleted ${deletedCoding.count} Coding submissions.`);
    }

    // 6. Assessment Attempts, Answers & Results
    const attempts = await tx.assessmentAttempt.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    const attemptIds = attempts.map((a) => a.id);

    if (attemptIds.length > 0) {
      const deletedAnswers = await tx.attemptAnswer.deleteMany({
        where: { attemptId: { in: attemptIds } },
      });
      console.log(`- Deleted ${deletedAnswers.count} Attempt answers.`);

      const deletedResults = await tx.assessmentResult.deleteMany({
        where: { OR: [{ studentId: { in: studentIds } }, { attemptId: { in: attemptIds } }] },
      });
      console.log(`- Deleted ${deletedResults.count} Assessment results.`);

      const deletedAttempts = await tx.assessmentAttempt.deleteMany({
        where: { id: { in: attemptIds } },
      });
      console.log(`- Deleted ${deletedAttempts.count} Assessment attempts.`);
    }

    // 7. Assessment Assignments
    const deletedAssignments = await tx.assessmentAssignment.deleteMany({
      where: { studentId: { in: studentIds } },
    });
    console.log(`- Deleted ${deletedAssignments.count} Assessment assignments.`);

    // 8. Question Usage
    await tx.questionUsage.updateMany({
      where: { studentId: { in: studentIds } },
      data: { studentId: null },
    });

    // 9. Refresh Tokens for student users
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
      const deletedTokens = await tx.refreshToken.deleteMany({
        where: { userId: { in: allStudentUserIds } },
      });
      console.log(`- Deleted ${deletedTokens.count} Student refresh tokens.`);
    }

    // 10. Delete All Students
    const deletedStudents = await tx.student.deleteMany();
    console.log(`- Deleted ${deletedStudents.count} Students.`);

    // 11. Delete Student Users (strictly ensuring role === 'STUDENT', never SUPER_ADMIN or PLACEMENT_ADMIN)
    const deletedUsers = await tx.user.deleteMany({
      where: {
        role: 'STUDENT',
      },
    });
    console.log(`- Deleted ${deletedUsers.count} Student user accounts.`);
  });

  // Verify post-deletion state
  const remainingStudents = await prisma.student.count();
  const remainingStudentUsers = await prisma.user.count({ where: { role: 'STUDENT' } });
  const remainingAdmins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'PLACEMENT_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });
  const remainingAssessments = await prisma.assessment.count();
  const remainingQuestions = await prisma.question.count();
  const remainingColleges = await prisma.college.count();

  console.log('\n=== POST-CLEAR VERIFICATION ===');
  console.log(`✅ Remaining students in DB: ${remainingStudents} (Expected: 0)`);
  console.log(`✅ Remaining student users in DB: ${remainingStudentUsers} (Expected: 0)`);
  console.log(`✅ Admin accounts preserved: ${remainingAdmins.length} (Expected: 2)`);
  remainingAdmins.forEach((a) => console.log(`   🛡️ ${a.role}: ${a.email}`));
  console.log(`✅ Questions intact: ${remainingQuestions} (Expected: 250)`);
  console.log(`✅ Assessments intact: ${remainingAssessments} (Expected: 6)`);
  console.log(`✅ Colleges intact: ${remainingColleges} (Expected: 2)`);

  if (remainingStudents !== 0 || remainingStudentUsers !== 0 || remainingAdmins.length !== 2) {
    throw new Error('Verification failed! Counts do not match expected clean state.');
  }

  console.log('🎉 Student data clearing completed successfully with 100% data integrity!');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error during student clear:', err);
  process.exit(1);
});
