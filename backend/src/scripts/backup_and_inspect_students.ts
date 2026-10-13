import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';

async function main() {
  console.log('=== STEP 1: COMPREHENSIVE BACKUP OF DATABASE ===');

  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilePath = path.join(backupDir, `backup_before_fresh_start_${timestamp}.json`);

  // Extract all table data
  const backupData = {
    metadata: {
      createdAt: new Date().toISOString(),
      reason: 'Controlled fresh start student data clear',
    },
    colleges: await prisma.college.findMany(),
    departments: await prisma.department.findMany(),
    courses: await prisma.course.findMany(),
    classes: await prisma.class.findMany(),
    sections: await prisma.section.findMany(),
    users: await prisma.user.findMany(),
    students: await prisma.student.findMany(),
    refreshTokens: await prisma.refreshToken.findMany(),
    companies: await prisma.company.findMany(),
    questions: await prisma.question.findMany(),
    questionOptions: await prisma.questionOption.findMany(),
    questionAiClassifications: await prisma.questionAiClassification.findMany(),
    questionUsages: await prisma.questionUsage.findMany(),
    assessments: await prisma.assessment.findMany(),
    assessmentPapers: await prisma.assessmentPaper.findMany(),
    assessmentSections: await prisma.assessmentSection.findMany(),
    assessmentQuestions: await prisma.assessmentQuestion.findMany(),
    assessmentAssignments: await prisma.assessmentAssignment.findMany(),
    assessmentAttempts: await prisma.assessmentAttempt.findMany(),
    attemptAnswers: await prisma.attemptAnswer.findMany(),
    assessmentResults: await prisma.assessmentResult.findMany(),
    codingSubmissions: await prisma.codingSubmission.findMany(),
    codingExecutionResults: await prisma.codingExecutionResult.findMany(),
    gdRounds: await prisma.gdRound.findMany(),
    gdCriteria: await prisma.gdCriterion.findMany(),
    gdParticipants: await prisma.gdParticipant.findMany(),
    gdEvaluations: await prisma.gdEvaluation.findMany(),
    gdCriterionScores: await prisma.gdCriterionScore.findMany(),
    interviewRounds: await prisma.interviewRound.findMany(),
    interviewCriteria: await prisma.interviewCriterion.findMany(),
    interviewParticipants: await prisma.interviewParticipant.findMany(),
    interviewEvaluations: await prisma.interviewEvaluation.findMany(),
    interviewCriterionScores: await prisma.interviewCriterionScore.findMany(),
    attendanceNotifications: await prisma.attendanceNotification.findMany(),
    attendanceEmailLogs: await prisma.attendanceEmailLog.findMany(),
  };

  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');

  // Verify backup
  const stat = fs.statSync(backupFilePath);
  console.log(`✅ Backup successfully created and verified!`);
  console.log(`📁 File: ${backupFilePath}`);
  console.log(`📦 Size: ${(stat.size / 1024).toFixed(2)} KB`);

  // Verify backup integrity by reading back and checking student & user counts
  const parsed = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
  console.log(`🔍 Verification check:`);
  console.log(`   Colleges backed up: ${parsed.colleges.length}`);
  console.log(`   Departments backed up: ${parsed.departments.length}`);
  console.log(`   Users backed up: ${parsed.users.length}`);
  console.log(`   Students backed up: ${parsed.students.length}`);
  console.log(`   Assessments backed up: ${parsed.assessments.length}`);
  console.log(`   Questions backed up: ${parsed.questions.length}`);
  console.log(`   Attempts backed up: ${parsed.assessmentAttempts.length}`);

  console.log('\n=== STEP 2: PRE-DELETION IMPACT ANALYSIS ===');
  const allStudents = await prisma.student.findMany({ select: { id: true, userId: true, name: true, registerNumber: true } });
  const studentIds = allStudents.map((s) => s.id);

  const studentUsers = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, email: true },
  });

  const adminUsers = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'PLACEMENT_ADMIN'] } },
    select: { id: true, email: true, role: true },
  });

  const studentAttempts = await prisma.assessmentAttempt.findMany({
    where: { studentId: { in: studentIds } },
    select: { id: true },
  });
  const attemptIds = studentAttempts.map((a) => a.id);

  const attemptAnswersCount = await prisma.attemptAnswer.count({
    where: { attemptId: { in: attemptIds } },
  });

  const assessmentResultsCount = await prisma.assessmentResult.count({
    where: { studentId: { in: studentIds } },
  });

  const assessmentAssignmentsCount = await prisma.assessmentAssignment.count({
    where: { studentId: { in: studentIds } },
  });

  const codingSubmissionsCount = await prisma.codingSubmission.count({
    where: { studentId: { in: studentIds } },
  });

  const gdParticipants = await prisma.gdParticipant.findMany({
    where: { studentId: { in: studentIds } },
    select: { id: true },
  });
  const gdParticipantIds = gdParticipants.map((p) => p.id);

  const gdEvaluations = await prisma.gdEvaluation.findMany({
    where: { participantId: { in: gdParticipantIds } },
    select: { id: true },
  });
  const gdEvaluationIds = gdEvaluations.map((e) => e.id);

  const gdCriterionScoresCount = await prisma.gdCriterionScore.count({
    where: { evaluationId: { in: gdEvaluationIds } },
  });

  const interviewParticipants = await prisma.interviewParticipant.findMany({
    where: { studentId: { in: studentIds } },
    select: { id: true },
  });
  const interviewParticipantIds = interviewParticipants.map((p) => p.id);

  const interviewEvaluations = await prisma.interviewEvaluation.findMany({
    where: { participantId: { in: interviewParticipantIds } },
    select: { id: true },
  });
  const interviewEvaluationIds = interviewEvaluations.map((e) => e.id);

  const interviewCriterionScoresCount = await prisma.interviewCriterionScore.count({
    where: { evaluationId: { in: interviewEvaluationIds } },
  });

  const attendanceEmailLogsCount = await prisma.attendanceEmailLog.count({
    where: { studentId: { in: studentIds } },
  });

  const questionUsagesCount = await prisma.questionUsage.count({
    where: { studentId: { in: studentIds } },
  });

  console.log(`\nExact Records That Would Be Safely Cleared:`);
  console.log(`- Students (to be deleted): ${studentIds.length}`);
  console.log(`- Student Users (role=STUDENT to be deleted): ${studentUsers.length}`);
  console.log(`- Assessment Assignments (student-specific): ${assessmentAssignmentsCount}`);
  console.log(`- Assessment Attempts: ${studentAttempts.length}`);
  console.log(`- Attempt Answers: ${attemptAnswersCount}`);
  console.log(`- Assessment Results: ${assessmentResultsCount}`);
  console.log(`- Coding Submissions: ${codingSubmissionsCount}`);
  console.log(`- GD Participants: ${gdParticipants.length}`);
  console.log(`- GD Evaluations: ${gdEvaluations.length}`);
  console.log(`- GD Criterion Scores: ${gdCriterionScoresCount}`);
  console.log(`- Interview Participants: ${interviewParticipants.length}`);
  console.log(`- Interview Evaluations: ${interviewEvaluations.length}`);
  console.log(`- Interview Criterion Scores: ${interviewCriterionScoresCount}`);
  console.log(`- Attendance Email Logs: ${attendanceEmailLogsCount}`);
  console.log(`- Question Usages with studentId: ${questionUsagesCount}`);

  console.log(`\nProtected / Preserved Core Data (WILL NOT BE DELETED):`);
  console.log(`- Admin User Accounts preserved: ${adminUsers.length}`);
  adminUsers.forEach((admin) => console.log(`   🛡️ ${admin.role}: ${admin.email} (${admin.id})`));
  console.log(`- Question Bank questions preserved: ${parsed.questions.length}`);
  console.log(`- Assessments preserved: ${parsed.assessments.length}`);
  console.log(`- GD Rounds preserved: ${parsed.gdRounds.length}`);
  console.log(`- Interview Rounds preserved: ${parsed.interviewRounds.length}`);
  console.log(`- Colleges preserved: ${parsed.colleges.length}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error during backup and inspection:', err);
  process.exit(1);
});
