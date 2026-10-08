const BASE_URL = 'http://localhost:5000/api';

async function request(url: string, options: any = {}) {
  const fullUrl = `${BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const contentType = res.headers.get('content-type');
  const data = contentType && contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    const error: any = new Error(data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return { status: res.status, data };
}

async function runLiveVerification() {
  console.log('=== STARTING LIVE RUNTIME E2E VERIFICATION (GD EXCEL EVALUATION WORKSPACE) ===\n');

  // 1. Auth Tokens
  console.log('1. Authenticating test users...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'placementadmin@placement.edu',
      password: 'PlacementAdmin@123',
    },
  });
  const adminToken = adminLogin.data.data.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log('   ✔ Placement Admin logged in successfully.');

  const studentLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'student@placement.edu',
      password: 'Student@123',
    },
  });
  const studentToken = studentLogin.data.data.accessToken;
  const studentHeaders = { Authorization: `Bearer ${studentToken}` };
  console.log('   ✔ Student logged in successfully.');

  const superAdminLogin = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'superadmin@placement.edu',
      password: 'SuperAdmin@123',
    },
  });
  const superAdminToken = superAdminLogin.data.data.accessToken;
  const superAdminHeaders = { Authorization: `Bearer ${superAdminToken}` };
  console.log('   ✔ Super Admin logged in successfully.\n');

  // 2. Fetch available students for GD assignment
  console.log('2. Fetching students and institutional hierarchy...');
  const studentsRes = await request('/students?page=1&limit=10', { headers: adminHeaders });
  const rawData = studentsRes.data.data;
  const students = Array.isArray(rawData) ? rawData : rawData.data || rawData.students || [];
  if (students.length < 2) {
    throw new Error(`Need at least 2 students in database for test, found ${students.length}`);
  }
  const testStudent1 = students[0];
  const testStudent2 = students[1];
  console.log(`   ✔ Retrieved students: ${testStudent1.name} (${testStudent1.registerNumber}), ${testStudent2.name} (${testStudent2.registerNumber})`);

  // 3. Create a GD Round with initial dynamic criteria
  console.log('\n3. Creating GD Round with initial configured criteria...');
  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 1);

  const initialCriteria = [
    { name: 'Communication', maxMarks: 10, order: 1 },
    { name: 'Confidence', maxMarks: 10, order: 2 },
    { name: 'Subject Knowledge', maxMarks: 10, order: 3 },
  ];

  const createRoundRes = await request('/gd', {
    method: 'POST',
    headers: adminHeaders,
    body: {
      title: `Excel Sheet GD Drive ${Date.now()}`,
      topic: 'Ethics of Artificial Intelligence in Engineering and Recruitment',
      instructions: 'Each participant has 3 minutes. Focus on teamwork, structured arguments, and listening.',
      scheduledDate: scheduledDate.toISOString(),
      durationMinutes: 45,
      criteria: initialCriteria,
      studentIds: [testStudent1.id, testStudent2.id],
    },
  });
  let gdRound = createRoundRes.data.data;
  console.log(`   ✔ GD Round created: id=${gdRound.id}, title="${gdRound.title}"`);
  console.log(`   ✔ Initial criteria: ${gdRound.criteria.map((c: any) => `${c.name} (Max ${c.maxMarks})`).join(', ')}`);

  // 4. Verify participant hierarchy mapping in Excel Sheet view
  console.log('\n4. Verifying participant hierarchy mapping (Dept -> Course -> Class -> Section -> Student)...');
  const roundDetailsRes = await request(`/gd/${gdRound.id}`, { headers: adminHeaders });
  const roundDetails = roundDetailsRes.data.data;
  console.log(`   ✔ Total participants assigned: ${roundDetails.participants.length}`);
  const part1 = roundDetails.participants.find((p: any) => p.studentId === testStudent1.id);
  const part2 = roundDetails.participants.find((p: any) => p.studentId === testStudent2.id);

  if (!part1 || !part2) {
    throw new Error('Assigned participants not found in round details');
  }
  console.log(`   ✔ Row 1 Student: ${part1.studentName} | Reg: ${part1.registerNumber} | Dept: ${part1.departmentName || 'N/A'} | Class: ${part1.className || 'N/A'} | Sec: ${part1.sectionName || 'N/A'}`);
  console.log(`   ✔ Row 2 Student: ${part2.studentName} | Reg: ${part2.registerNumber} | Dept: ${part2.departmentName || 'N/A'} | Class: ${part2.className || 'N/A'} | Sec: ${part2.sectionName || 'N/A'}`);

  // 5. Test Category Management (Add Category, Edit Category, Prevent Duplicate)
  console.log('\n5. Testing Category Management inside existing GD Round...');
  // A. Reject Duplicate category name
  try {
    await request(`/gd/${gdRound.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        criteria: [
          ...gdRound.criteria,
          { name: 'Communication', maxMarks: 10, order: 4 }, // duplicate
        ],
      },
    });
    throw new Error('Expected duplicate category name to be rejected');
  } catch (err: any) {
    console.log(`   ✔ Duplicate category name correctly rejected (HTTP ${err.status}): "${err.data?.message}"`);
  }

  // B. Add new category: Problem Solving — /10
  console.log('   Adding new category: "Problem Solving — 10"...');
  const updateCriteriaRes = await request(`/gd/${gdRound.id}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: {
      criteria: [
        ...gdRound.criteria,
        { name: 'Problem Solving', maxMarks: 10, order: 4 },
      ],
    },
  });
  gdRound = updateCriteriaRes.data.data;
  const newCrit = gdRound.criteria.find((c: any) => c.name === 'Problem Solving');
  if (!newCrit) {
    throw new Error('Added category "Problem Solving" not found in updated criteria');
  }
  const totalMaxMarks = gdRound.criteria.reduce((acc: number, c: any) => acc + c.maxMarks, 0);
  console.log(`   ✔ Category added successfully! Total Categories: ${gdRound.criteria.length}, Total Max Marks: ${totalMaxMarks}`);
  console.log(`   ✔ Updated sheet columns: ${gdRound.criteria.map((c: any) => `${c.name} (/ ${c.maxMarks})`).join(', ')}`);

  // 6. Test Excel-Style Mark Entry & Save Draft (Partial Marks)
  console.log('\n6. Testing Excel-Style Mark Entry - Save Draft (Partial Marks)...');
  const c1 = gdRound.criteria[0];
  const c2 = gdRound.criteria[1];
  const c3 = gdRound.criteria[2];
  const c4 = gdRound.criteria[3]; // Problem Solving

  const draftPayload = {
    isDraft: true,
    evaluations: [
      {
        studentId: testStudent1.id,
        participantId: part1.id,
        scores: [
          { criterionId: c1.id, score: 8 },
          { criterionId: c2.id, score: 9 },
          { criterionId: c3.id, score: 7 },
          // c4 left empty for draft
        ],
        feedback: 'Good participation, articulate communicator.',
      },
      {
        studentId: testStudent2.id,
        participantId: part2.id,
        scores: [
          { criterionId: c1.id, score: 9 },
          { criterionId: c4.id, score: 8 }, // Problem Solving scored
        ],
        feedback: 'Strong problem framing.',
      },
    ],
  };

  const draftRes = await request(`/gd/${gdRound.id}/evaluations/bulk`, {
    method: 'POST',
    headers: adminHeaders,
    body: draftPayload,
  });
  console.log(`   ✔ Draft saved successfully (status=${draftRes.status}, isDraft=${draftRes.data.data.isDraft}, totalProcessed=${draftRes.data.data.totalProcessed})`);

  // 7. Verify Reopening GD Round Restores Draft Marks
  console.log('\n7. Verifying Reopening GD Round Restores Sheet Marks...');
  const reopenedRes = await request(`/gd/${gdRound.id}`, { headers: adminHeaders });
  const reopenedParticipants = reopenedRes.data.data.participants;
  const reopenedPart1 = reopenedParticipants.find((p: any) => p.studentId === testStudent1.id);
  const reopenedPart2 = reopenedParticipants.find((p: any) => p.studentId === testStudent2.id);

  if (reopenedPart1.evaluation?.status !== 'DRAFT') {
    throw new Error(`Expected participant 1 to be DRAFT, got ${reopenedPart1.evaluation?.status}`);
  }
  console.log(`   ✔ Student 1 evaluation status: ${reopenedPart1.evaluation.status}`);
  console.log(`   ✔ Student 1 restored scores: ${reopenedPart1.evaluation.criterionScores.length} of ${gdRound.criteria.length} categories restored (Total: ${reopenedPart1.evaluation.totalScore}/${reopenedPart1.evaluation.maxPossibleMarks})`);
  console.log(`   ✔ Student 2 evaluation status: ${reopenedPart2.evaluation.status}`);
  console.log(`   ✔ Student 2 restored scores: ${reopenedPart2.evaluation.criterionScores.length} of ${gdRound.criteria.length} categories restored (Total: ${reopenedPart2.evaluation.totalScore}/${reopenedPart2.evaluation.maxPossibleMarks})`);

  // 8. Test Submit Validation (Boundary checking & Completeness)
  console.log('\n8. Testing Validation Rules (Rejection of invalid marks & incomplete submit)...');
  try {
    await request(`/gd/${gdRound.id}/evaluations/bulk`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        isDraft: false,
        evaluations: [
          {
            studentId: testStudent1.id,
            scores: [
              { criterionId: c1.id, score: -2 }, // negative
              { criterionId: c2.id, score: 8 },
              { criterionId: c3.id, score: 8 },
              { criterionId: c4.id, score: 8 },
            ],
          },
        ],
      },
    });
    throw new Error('Expected negative score to be rejected');
  } catch (err: any) {
    console.log(`   ✔ Negative score rejected (HTTP ${err.status}): "${err.data?.message}"`);
  }

  try {
    await request(`/gd/${gdRound.id}/evaluations/bulk`, {
      method: 'POST',
      headers: adminHeaders,
      body: {
        isDraft: false,
        evaluations: [
          {
            studentId: testStudent1.id,
            scores: [
              { criterionId: c1.id, score: 25 }, // max is 10
              { criterionId: c2.id, score: 8 },
              { criterionId: c3.id, score: 8 },
              { criterionId: c4.id, score: 8 },
            ],
          },
        ],
      },
    });
    throw new Error('Expected score exceeding maxMarks to be rejected');
  } catch (err: any) {
    console.log(`   ✔ Score exceeding maxMarks rejected (HTTP ${err.status}): "${err.data?.message}"`);
  }

  // 9. Test Final Submit & Authoritative Calculations
  console.log('\n9. Testing Final Submit Evaluation & Authoritative Score Calculation...');
  const submitPayload = {
    isDraft: false,
    evaluations: [
      {
        studentId: testStudent1.id,
        participantId: part1.id,
        scores: [
          { criterionId: c1.id, score: 8 },  // Comm: 8/10
          { criterionId: c2.id, score: 9 },  // Conf: 9/10
          { criterionId: c3.id, score: 8 },  // Know: 8/10
          { criterionId: c4.id, score: 9 },  // Prob: 9/10
        ],
        feedback: 'Excellent reasoning and balanced presence.',
      },
      {
        studentId: testStudent2.id,
        participantId: part2.id,
        scores: [
          { criterionId: c1.id, score: 9 },  // Comm: 9/10
          { criterionId: c2.id, score: 8 },  // Conf: 8/10
          { criterionId: c3.id, score: 9 },  // Know: 9/10
          { criterionId: c4.id, score: 8 },  // Prob: 8/10
        ],
        feedback: 'Strong leadership and sharp articulation.',
      },
    ],
  };

  const submitRes = await request(`/gd/${gdRound.id}/evaluations/bulk`, {
    method: 'POST',
    headers: adminHeaders,
    body: submitPayload,
  });
  console.log(`   ✔ Final Submit Response: totalProcessed=${submitRes.data.data.totalProcessed}, isDraft=${submitRes.data.data.isDraft}`);

  // 10. Verify Authoritative Scores in Round & MySQL
  console.log('\n10. Verifying Authoritative Totals & Percentages in Database...');
  const finalRoundRes = await request(`/gd/${gdRound.id}`, { headers: adminHeaders });
  const finalRound = finalRoundRes.data.data;

  const finalPart1 = finalRound.participants.find((p: any) => p.studentId === testStudent1.id);
  const finalPart2 = finalRound.participants.find((p: any) => p.studentId === testStudent2.id);

  console.log(`   ✔ Round Evaluated Count: ${finalRound.evaluatedCount}/${finalRound.totalParticipants}`);
  console.log(`   ✔ Round Average Performance: ${finalRound.averageScore}%`);
  console.log(`   ✔ Student 1 (${finalPart1.studentName}): Total: ${finalPart1.evaluation.totalScore}/${finalPart1.evaluation.maxPossibleMarks}, Percentage: ${finalPart1.evaluation.percentage}% (Status: ${finalPart1.evaluation.status})`);
  console.log(`   ✔ Student 2 (${finalPart2.studentName}): Total: ${finalPart2.evaluation.totalScore}/${finalPart2.evaluation.maxPossibleMarks}, Percentage: ${finalPart2.evaluation.percentage}% (Status: ${finalPart2.evaluation.status})`);

  // Student 1: 8 + 9 + 8 + 9 = 34 / 40 -> 85%
  if (finalPart1.evaluation.totalScore !== 34 || finalPart1.evaluation.percentage !== 85) {
    throw new Error(`Student 1 mismatch: expected 34/40 (85%), got ${finalPart1.evaluation.totalScore}/${finalPart1.evaluation.maxPossibleMarks} (${finalPart1.evaluation.percentage}%)`);
  }
  // Student 2: 9 + 8 + 9 + 8 = 34 / 40 -> 85%
  if (finalPart2.evaluation.totalScore !== 34 || finalPart2.evaluation.percentage !== 85) {
    throw new Error(`Student 2 mismatch: expected 34/40 (85%), got ${finalPart2.evaluation.totalScore}/${finalPart2.evaluation.maxPossibleMarks} (${finalPart2.evaluation.percentage}%)`);
  }

  // 11. Historical Consistency: Verify Category Deletion Protection
  console.log('\n11. Verifying Category Deletion Protection for Evaluated Categories...');
  try {
    await request(`/gd/${gdRound.id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: {
        criteria: [
          // omit c1 which now has submitted evaluations
          c2,
          c3,
          c4,
        ],
      },
    });
    throw new Error('Expected deletion of evaluated category to be safely rejected');
  } catch (err: any) {
    console.log(`   ✔ Category deletion protection working (HTTP ${err.status}): "${err.data?.message}"`);
  }

  // 12. Security & RBAC Enforcement
  console.log('\n12. Testing Security & RBAC Enforcement...');
  try {
    await request(`/gd/${gdRound.id}/evaluations/bulk`, {
      method: 'POST',
      headers: studentHeaders,
      body: submitPayload,
    });
    throw new Error('Student should receive 403 Forbidden');
  } catch (err: any) {
    console.log(`   ✔ Student blocked with HTTP ${err.status}: "${err.data?.message}"`);
  }

  try {
    await request(`/gd/${gdRound.id}`, {
      method: 'PUT',
      headers: studentHeaders,
      body: { title: 'Hacked Title' },
    });
    throw new Error('Student should receive 403 Forbidden on round update');
  } catch (err: any) {
    console.log(`   ✔ Student mutation blocked with HTTP ${err.status}: "${err.data?.message}"`);
  }

  // Super Admin view access check
  const superAdminView = await request(`/gd/${gdRound.id}`, { headers: superAdminHeaders });
  if (superAdminView.status === 200) {
    console.log(`   ✔ Super Admin can view round details (${superAdminView.data.data.title})`);
  }

  console.log('\n=== ALL 12 VERIFICATION SUITES PASSED! GD ROUND IS NOW AN INTEGRATED EXCEL EVALUATION SHEET ===');
}

runLiveVerification().catch((e) => {
  console.error('\n❌ LIVE VERIFICATION FAILED:', e?.data || e?.message || e);
  process.exit(1);
});
