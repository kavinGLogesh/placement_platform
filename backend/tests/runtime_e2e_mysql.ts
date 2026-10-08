import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.config.js';

// Explicitly ensure NODE_ENV is development (NOT test) to verify MySQL runtime!
process.env.NODE_ENV = 'development';

async function runE2E() {
  console.log('--- STARTING RUNTIME E2E VERIFICATION AGAINST REAL MYSQL 8.x ---');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // 0. Verify MySQL connection & clean up previous test run artifacts
  await prisma.$connect();
  await prisma.questionUsage.deleteMany({});
  await prisma.assessment.deleteMany({ where: { name: { startsWith: 'MySQL E2E Assessment' } } });
  const dbUserCount = await prisma.user.count();
  console.log('Connected to MySQL database. Users count in DB:', dbUserCount);
  assert(dbUserCount > 0, 'Database must have seeded users');

  // Start Express server
  const app = createApp();
  let server: http.Server;
  let baseUrl: string;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}/api`;
      }
      resolve();
    });
  });

  console.log('Test server listening at:', baseUrl);

  try {
    // =========================================================================
    // =========================================================================
    // STEP 1: ADMIN LOGINS & RBAC ROLE SEPARATION
    // =========================================================================
    console.log('\n[Step 1] Admin logins...');
    const superAdminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@placement.edu',
        password: 'SuperAdmin@123',
      }),
    });
    assert.equal(superAdminLoginRes.status, 200, 'Super admin login must succeed');
    const superAdminLoginData = await superAdminLoginRes.json();
    const superAdminToken = superAdminLoginData.data.accessToken;
    assert(superAdminToken, 'Super admin access token must exist');

    const placementAdminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'placementadmin@placement.edu',
        password: 'PlacementAdmin@123',
      }),
    });
    assert.equal(placementAdminLoginRes.status, 200, 'Placement admin login must succeed');
    const placementAdminLoginData = await placementAdminLoginRes.json();
    const placementAdminToken = placementAdminLoginData.data.accessToken;
    assert(placementAdminToken, 'Placement admin access token must exist');
    console.log('Admin logins successful. Tokens acquired.');

    // Step 1.5: Verify RBAC Role Separation
    console.log('\n[Step 1.5] Verifying RBAC role separation...');
    const saQuestionRes = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(saQuestionRes.status, 403, 'Super admin must be blocked from /questions with 403');

    const saAssessmentRes = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(saAssessmentRes.status, 403, 'Super admin must be blocked from /assessments with 403');

    const paQuestionRes = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(paQuestionRes.status, 200, 'Placement admin must access /questions with 200');
    console.log('RBAC verified: SUPER_ADMIN blocked from questions & assessments; PLACEMENT_ADMIN allowed.');

    // Use superAdminToken for institutional monitoring, analytics & reports
    const adminToken = superAdminToken;

    // =========================================================================
    // STEP 2: CREATE ASSESSMENT (PLACEMENT_ADMIN OPERATIONAL ROLE)
    // =========================================================================
    console.log('\n[Step 2] Creating assessment in MySQL...');
    const assessmentPayload = {
      name: `MySQL E2E Assessment ${Date.now()}`,
      description: 'End-to-End verified MySQL assessment',
      duration: 60,
      maximumAttempts: 1,
      negativeMarking: true,
      randomQuestions: false,
      randomOptions: false,
      passingPercentage: 50.0,
      numberOfPapers: 1,
      sections: [
        {
          component: 'APTITUDE',
          name: 'Quantitative Section',
          sectionOrder: 1,
          questionsCount: 1,
          marksPerQuestion: 2.0,
          negativeMarks: 0.5,
          topics: ['Percentage'],
        },
        {
          component: 'LOGICAL_REASONING',
          name: 'Logical Reasoning Section',
          sectionOrder: 2,
          questionsCount: 1,
          marksPerQuestion: 2.0,
          negativeMarks: 0.5,
          topics: ['Blood Relations'],
        },
      ],
    };

    const createAsmtRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify(assessmentPayload),
    });
    assert.equal(createAsmtRes.status, 201, 'Create assessment must return 201');
    const createAsmtData = await createAsmtRes.json();
    const assessmentId = createAsmtData.data.id;
    console.log('Assessment created in MySQL. ID:', assessmentId);

    // Verify in MySQL
    const dbAsmt = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    assert(dbAsmt, 'Assessment must exist in MySQL assessment table');
    console.log('Verified assessment directly in MySQL database.');

    // =========================================================================
    // STEP 3: GENERATE PAPERS (PLACEMENT_ADMIN OPERATIONAL ROLE)
    // =========================================================================
    console.log('\n[Step 3] Generating examination paper from MySQL question bank...');
    const generateRes = await fetch(`${baseUrl}/assessments/${assessmentId}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ numberOfPapers: 1 }),
    });
    assert.equal(generateRes.status, 201, 'Generate papers must return 201');
    const generateData = await generateRes.json();
    console.log('Generated papers count:', generateData.data.papers.length);
    assert.equal(generateData.data.papers.length, 1, 'Should generate 1 paper');
    const paperId = generateData.data.papers[0].id;

    // Verify in MySQL
    const dbPaper = await prisma.assessmentPaper.findUnique({
      where: { id: paperId },
      include: { questions: true },
    });
    assert(dbPaper, 'Paper must exist in MySQL assessment_paper table');
    assert.equal(dbPaper.questions.length, 2, 'Paper must have 2 questions in MySQL');
    console.log('Verified paper and questions directly in MySQL database.');

    // =========================================================================
    // STEP 4: PUBLISH ASSESSMENT (PLACEMENT_ADMIN OPERATIONAL ROLE)
    // =========================================================================
    console.log('\n[Step 4] Publishing assessment...');
    const publishRes = await fetch(`${baseUrl}/assessments/${assessmentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(publishRes.status, 200, 'Publish must return 200');

    // Verify in MySQL
    const dbPublished = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    assert.equal(dbPublished?.status, 'PUBLISHED', 'MySQL status must be PUBLISHED');
    console.log('Verified assessment status is PUBLISHED in MySQL.');

    // =========================================================================
    // STEP 5: ASSIGN ASSESSMENT TO STUDENT (PLACEMENT_ADMIN OPERATIONAL ROLE)
    // =========================================================================
    console.log('\n[Step 5] Assigning assessment to student stu-001...');
    const assignRes = await fetch(`${baseUrl}/assessments/${assessmentId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ studentIds: ['stu-001'] }),
    });
    assert.equal(assignRes.status, 200, 'Assign must return 200');
    const assignData = await assignRes.json();
    assert.equal(assignData.data.assignedCount, 1, 'Assigned count must be 1');

    // Verify in MySQL
    const dbAssignment = await prisma.assessmentAssignment.findFirst({
      where: { assessmentId, studentId: 'stu-001' },
    });
    assert(dbAssignment, 'Assignment must exist in MySQL assessment_assignment table');
    console.log('Verified assignment record directly in MySQL.');

    // =========================================================================
    // STEP 6: STUDENT LOGIN
    // =========================================================================
    console.log('\n[Step 6] Student login...');
    const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@placement.edu',
        password: 'Student@123',
      }),
    });
    assert.equal(studentLoginRes.status, 200, 'Student login must succeed');
    const studentLoginData = await studentLoginRes.json();
    const studentToken = studentLoginData.data.accessToken;
    console.log('Student login successful. Token acquired.');

    // =========================================================================
    // STEP 7: STUDENT TESTS LISTING
    // =========================================================================
    console.log('\n[Step 7] Fetching student tests listing...');
    const studentTestsRes = await fetch(`${baseUrl}/student/tests`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentTestsRes.status, 200, 'Student tests must return 200');
    const studentTestsData = await studentTestsRes.json();
    const assignedTest = studentTestsData.data.find((t: any) => t.id === assessmentId);
    assert(assignedTest, 'Assigned test must appear in student test listing');
    assert.equal(assignedTest.status, 'AVAILABLE', 'Test status must be AVAILABLE');
    console.log('Assigned test discovered by student with status AVAILABLE.');

    // =========================================================================
    // STEP 8: STUDENT ATTEMPT START
    // =========================================================================
    console.log('\n[Step 8] Student starting assessment attempt...');
    const startRes = await fetch(`${baseUrl}/student/assessments/${assessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert([200, 201].includes(startRes.status), 'Start assessment must return 200 or 201');
    const startData = await startRes.json();
    const attemptId = startData.data.id;
    const questions = startData.data.questions;
    console.log('Attempt started. ID:', attemptId);
    console.log('Questions delivered to student:', questions.length);

    // SECURITY CHECK: Confirm NO answer keys or explanations leaked to student!
    for (const q of questions) {
      assert.equal(q.correctAnswer, undefined, 'correctAnswer MUST NOT leak to student');
      assert.equal(q.explanation, undefined, 'explanation MUST NOT leak to student');
      for (const opt of q.options) {
        assert.equal(opt.isCorrect, undefined, 'option.isCorrect MUST NOT leak to student');
      }
    }
    console.log('SECURITY PASS: Verified zero question answers/explanations leak to student.');

    // Verify in MySQL
    const dbAttempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    assert.equal(dbAttempt?.status, 'IN_PROGRESS', 'MySQL attempt status must be IN_PROGRESS');
    console.log('Verified attempt record is IN_PROGRESS in MySQL database.');

    // =========================================================================
    // STEP 9: SAVE ANSWERS
    // =========================================================================
    console.log('\n[Step 9] Student saving answers...');
    const q1 = questions[0];
    const q2 = questions[1];

    // Pick first option for q1 and first option for q2
    const saveQ1Res = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: q1.questionId,
        selectedOptionIds: [q1.options[0].id],
        isMarkedForReview: false,
        version: 1,
      }),
    });
    assert.equal(saveQ1Res.status, 200, 'Save answer 1 must return 200');

    const saveQ2Res = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: q2.questionId,
        selectedOptionIds: [q2.options[0].id],
        isMarkedForReview: false,
        version: 1,
      }),
    });
    assert.equal(saveQ2Res.status, 200, 'Save answer 2 must return 200');

    // Verify in MySQL
    const dbAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId } });
    assert.equal(dbAnswers.length, 2, '2 answers must be persisted in MySQL attempt_answer table');
    console.log('Verified answers stored in MySQL database.');

    // =========================================================================
    // STEP 10: SUBMIT ATTEMPT
    // =========================================================================
    console.log('\n[Step 10] Submitting assessment attempt...');
    const submitRes = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(submitRes.status, 200, 'Submit attempt must return 200');
    const submitData = await submitRes.json();
    const result = submitData.data.result || submitData.data;
    console.log('Attempt submitted. Result ID:', result.id);
    console.log('Result Summary:', {
      totalMarks: result.totalMarks,
      obtainedMarks: result.obtainedMarks,
      percentage: result.percentage,
      accuracy: result.accuracy,
      isPassed: result.isPassed,
    });

    // Verify in MySQL
    const dbAttemptSubmitted = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
    assert.equal(dbAttemptSubmitted?.status, 'SUBMITTED', 'MySQL attempt status must be SUBMITTED');
    const dbResult = await prisma.assessmentResult.findUnique({ where: { id: result.id } });
    assert(dbResult, 'Result must exist in MySQL assessment_result table');
    assert.equal(dbResult.obtainedMarks, result.obtainedMarks, 'Obtained marks must match');
    console.log('Verified atomic submission and result in MySQL database.');

    // =========================================================================
    // STEP 11: STUDENT RESULT DETAIL
    // =========================================================================
    console.log('\n[Step 11] Student fetching result detail...');
    const resultDetailRes = await fetch(`${baseUrl}/student/results/${result.id}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(resultDetailRes.status, 200, 'Student result detail must return 200');
    const resultDetail = await resultDetailRes.json();
    assert.equal(resultDetail.data.id, result.id, 'Result ID must match');
    console.log('Student result detail verified.');

    // =========================================================================
    // STEP 12: STUDENT PERFORMANCE DASHBOARD
    // =========================================================================
    console.log('\n[Step 12] Student fetching performance dashboard...');
    const perfRes = await fetch(`${baseUrl}/student/performance`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(perfRes.status, 200, 'Student performance must return 200');
    const perfData = await perfRes.json();
    console.log('Student Performance Metrics:', perfData.data.summary);
    assert(perfData.data.summary.totalAssessmentsTaken >= 1, 'Total assessments taken must be at least 1');
    console.log('Student performance metrics verified.');

    // =========================================================================
    // STEP 13: ADMIN RESULTS & ANALYTICS
    // =========================================================================
    console.log('\n[Step 13] Admin fetching results and analytics from MySQL...');

    // 13a. Admin Results Listing
    const adminResultsRes = await fetch(`${baseUrl}/results?assessmentId=${assessmentId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminResultsRes.status, 200, 'Admin results must return 200');
    const adminResultsData = await adminResultsRes.json();
    const resultItems = adminResultsData.data.items || adminResultsData.data;
    assert(resultItems.length >= 1, 'Results must contain student attempt');
    console.log('Admin results listing verified. Records count:', resultItems.length);

    // 13b. Admin Overview Analytics
    const overviewRes = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(overviewRes.status, 200, 'Overview analytics must return 200');
    const overviewData = await overviewRes.json();
    const overview = overviewData.data;
    console.log('Overview Analytics:', {
      totalStudents: overview.totalStudents,
      totalAssessments: overview.totalAssessments,
      totalAttempts: overview.totalAttempts,
      averageScore: overview.averageScore,
      passPercentage: overview.passPercentage,
    });
    assert(overview.totalAttempts >= 1, 'Overview total attempts must be at least 1');

    // 13c. Placement Funnel Verification: Interview & Selected must be 0 and isImplemented: false!
    const funnelRes = await fetch(`${baseUrl}/analytics/funnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(funnelRes.status, 200, 'Placement funnel must return 200');
    const funnelData = await funnelRes.json();
    const funnel = funnelData.data;
    console.log('Placement Funnel Stages:', funnel.stages.map((f: any) => `${f.stage}: ${f.count} (isImplemented: ${f.isImplemented})`));
    const interviewStage = funnel.stages.find((f: any) => f.stage === 'Interview');
    const selectedStage = funnel.stages.find((f: any) => f.stage === 'Selected');
    assert.equal(interviewStage.count, 0, 'Interview funnel stage count must be 0');
    assert.equal(interviewStage.isImplemented, false, 'Interview stage isImplemented must be false');
    assert.equal(selectedStage.count, 0, 'Selected funnel stage count must be 0');
    assert.equal(selectedStage.isImplemented, false, 'Selected stage isImplemented must be false');
    console.log('ANALYTICS PASS: Verified Interview and Selected funnel stages remain 0 and unimplemented.');

    // 13c. Department Analytics
    const deptAnalyticsRes = await fetch(`${baseUrl}/analytics/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(deptAnalyticsRes.status, 200, 'Department analytics must return 200');
    const deptAnalyticsData = await deptAnalyticsRes.json();
    console.log('Department analytics count:', deptAnalyticsData.data.length);
    assert(deptAnalyticsData.data.length >= 1, 'Must return department analytics');

    // 13d. Student Individual Performance (Admin view)
    const adminStudentPerfRes = await fetch(`${baseUrl}/analytics/students/stu-001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminStudentPerfRes.status, 200, 'Admin student performance must return 200');
    const adminStudentPerf = await adminStudentPerfRes.json();
    assert.equal(adminStudentPerf.data.student.id, 'stu-001');
    console.log('Admin student performance view verified.');

    // =========================================================================
    // STEP 14: SECURITY & IDOR PROTECTION VERIFICATION
    // =========================================================================
    console.log('\n[Step 14] Verifying RBAC and IDOR protection...');

    // Student trying to access Admin Results
    const studentBlockedResults = await fetch(`${baseUrl}/results`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentBlockedResults.status, 403, 'Student must be blocked from /api/results with 403');

    // Student trying to access Admin Analytics
    const studentBlockedAnalytics = await fetch(`${baseUrl}/analytics`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentBlockedAnalytics.status, 403, 'Student must be blocked from /api/analytics with 403');

    // Student trying to access another student's analytics
    const studentBlockedOtherStudent = await fetch(`${baseUrl}/analytics/students/stu-002`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentBlockedOtherStudent.status, 403, 'Student must be blocked from /api/analytics/students/:id with 403');

    console.log('SECURITY PASS: RBAC and IDOR protection verified for all Phase 8 endpoints.');

    // =========================================================================
    // STEP 15: PHASE 9 REPORTS, MULTI-FORMAT EXPORTS & STUDENT TRANSCRIPT (REAL MYSQL)
    // =========================================================================
    console.log('\n[Step 15] Verifying Phase 9 Reports & Multi-Format Exports against MySQL...');

    // 15a. Admin Student Performance Report
    const rptStudentRes = await fetch(`${baseUrl}/reports/students`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptStudentRes.status, 200, 'Student report must return 200');
    const rptStudentData = await rptStudentRes.json();
    assert.ok(rptStudentData.data.summary.totalStudents >= 1);
    assert.ok(rptStudentData.data.rows.length >= 1);
    const stuRow = rptStudentData.data.rows.find((r: any) => r.studentId === 'stu-001');
    assert.ok(stuRow, 'Student stu-001 must appear in performance report');
    assert.equal(stuRow.assessmentsCompleted, 1, 'Completed assessments must be 1');
    assert.equal(stuRow.totalMarksObtained, 1.5, 'Authoritative marks must be 1.5');
    console.log('Admin Student Performance Report verified against MySQL.');

    // 15b. Admin Assessment Result Report
    const rptAsmtRes = await fetch(`${baseUrl}/reports/assessments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptAsmtRes.status, 200, 'Assessment report must return 200');
    const rptAsmtData = await rptAsmtRes.json();
    assert.ok(rptAsmtData.data.rows.length >= 1);
    console.log('Admin Assessment Result Report verified against MySQL.');

    // 15c. Admin Department Performance Report
    const rptDeptRes = await fetch(`${baseUrl}/reports/departments`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptDeptRes.status, 200, 'Department report must return 200');
    const rptDeptData = await rptDeptRes.json();
    assert.ok(rptDeptData.data.rows.length >= 1);
    console.log('Admin Department Performance Report verified against MySQL.');

    // 15d. Admin Topic Performance Report
    const rptTopicRes = await fetch(`${baseUrl}/reports/topics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptTopicRes.status, 200, 'Topic report must return 200');
    const rptTopicData = await rptTopicRes.json();
    assert.ok(rptTopicData.data.rows.length >= 1);
    console.log('Admin Topic Performance Report verified against MySQL.');

    // 15e. Admin Question Analysis Report (Zero answer key / explanation leak)
    const rptQuesRes = await fetch(`${baseUrl}/reports/questions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptQuesRes.status, 200, 'Question report must return 200');
    const rptQuesData = await rptQuesRes.json();
    assert.ok(rptQuesData.data.rows.length >= 1);
    rptQuesData.data.rows.forEach((q: any) => {
      assert.equal(q.correctAnswer, undefined, 'Must never leak correctAnswer');
      assert.equal(q.explanation, undefined, 'Must never leak explanation');
    });
    console.log('Admin Question Analysis Report verified (Zero secrets leak).');

    // 15f. Admin Coding Assessment Report
    const rptCodingRes = await fetch(`${baseUrl}/reports/coding`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptCodingRes.status, 200, 'Coding report must return 200');
    console.log('Admin Coding Assessment Report verified against MySQL.');

    // 15g. Admin Placement Funnel Report (Interview & Selected remain 0)
    const rptFunnelRes = await fetch(`${baseUrl}/reports/funnel`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(rptFunnelRes.status, 200, 'Funnel report must return 200');
    const rptFunnelData = await rptFunnelRes.json();
    const intStage = rptFunnelData.data.stages.find((s: any) => s.stage === 'Interview');
    const selStage = rptFunnelData.data.stages.find((s: any) => s.stage === 'Selected');
    assert.equal(intStage.count, 0, 'Interview stage must remain 0');
    assert.equal(intStage.isImplemented, false, 'Interview stage isImplemented must be false');
    assert.equal(selStage.count, 0, 'Selected stage must remain 0');
    assert.equal(selStage.isImplemented, false, 'Selected stage isImplemented must be false');
    console.log('Admin Placement Funnel Report verified (Interview & Selected stages strictly 0).');

    // 15h. Multi-Format Exports (Excel, CSV, PDF, Print HTML)
    // Excel export
    const excelRes = await fetch(`${baseUrl}/reports/students/export?format=xlsx`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(excelRes.status, 200);
    assert.equal(excelRes.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const excelBuf = await excelRes.arrayBuffer();
    assert.ok(excelBuf.byteLength > 100, 'Excel file must not be empty');

    // CSV export
    const csvRes = await fetch(`${baseUrl}/reports/students/export?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(csvRes.status, 200);
    assert.equal(csvRes.headers.get('content-type'), 'text/csv; charset=utf-8');
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('stu-001') || csvText.includes('Student') || csvText.includes('College Placement'));

    // PDF export
    const pdfRes = await fetch(`${baseUrl}/reports/students/export?format=pdf`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(pdfRes.status, 200);
    assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
    const pdfBuf = await pdfRes.arrayBuffer();
    const pdfHeader = Buffer.from(pdfBuf.slice(0, 5)).toString('utf-8');
    assert.equal(pdfHeader, '%PDF-', 'PDF file must start with %PDF-');

    // HTML Print export
    const htmlRes = await fetch(`${baseUrl}/reports/students/export?format=html`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(htmlRes.status, 200);
    assert.equal(htmlRes.headers.get('content-type'), 'text/html; charset=utf-8');
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('@media print') && htmlText.includes('window.print()'));
    console.log('Multi-format export verification PASS: Excel (.xlsx), CSV, PDF, Print HTML.');

    // 15i. Student Own Performance Report & Transcript
    const stuOwnRes = await fetch(`${baseUrl}/reports/student/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(stuOwnRes.status, 200, 'Student own report must return 200');
    const stuOwnData = await stuOwnRes.json();
    assert.equal(stuOwnData.data.student.id, 'stu-001');
    assert.equal(stuOwnData.data.summary.totalAssessmentsCompleted, 1);
    assert.equal(stuOwnData.data.summary.averageScore, 1.5);
    assert.equal(stuOwnData.data.summary.averagePercentage, 37.5);
    console.log('Student Own Performance Transcript verified against MySQL.');

    // Student transcript PDF export
    const stuPdfRes = await fetch(`${baseUrl}/reports/student/me/export?format=pdf`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(stuPdfRes.status, 200);
    assert.equal(stuPdfRes.headers.get('content-type'), 'application/pdf');
    console.log('Student PDF transcript export verified.');

    // 15j. Phase 9 Security, RBAC & IDOR protection
    const studentBlockedRptStudents = await fetch(`${baseUrl}/reports/students`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentBlockedRptStudents.status, 403, 'Student must be blocked from /api/reports/students with 403');

    const studentBlockedExport = await fetch(`${baseUrl}/reports/students/export?format=xlsx`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(studentBlockedExport.status, 403, 'Student must be blocked from /api/reports/:type/export with 403');
    console.log('SECURITY PASS: Phase 9 RBAC and student own-data restriction verified.');

    console.log('\n=============================================================');
    console.log('--- ALL RUNTIME E2E STEPS AGAINST MYSQL 8.x COMPLETED SUCCESSFULLY! ---');
    console.log('=============================================================');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }
}

runE2E().catch((err) => {
  console.error('RUNTIME E2E FAILED:', err);
  process.exit(1);
});
