import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;

let zohoCompanyId: string;
let infosysCompanyId: string;
let safeDeleteCompanyId: string;
let companyAssessmentId: string;
let sharedQuestionId: string;
let pendingCandidateId: string;

before(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://localhost:${address.port}/api`;
      }
      resolve();
    });
  });

  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  superAdminToken = adminJson.data.accessToken;

  const placementRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const placementJson = await placementRes.json();
  placementAdminToken = placementJson.data.accessToken;

  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;
});

after(async () => {
  await new Promise<void>((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
});

describe('Production Company Assessment & Question Intelligence Test Suite', () => {
  // ===========================================================================
  // 1. DYNAMIC COMPANY MANAGEMENT
  // ===========================================================================
  it('1. Placement Admin can dynamically add new companies (Zoho and Infosys)', async () => {
    const resZoho = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'ZOHO_E2E',
        name: 'Zoho Corporation',
        description: 'Product-based hiring track focusing on problem solving, DSA, and coding.',
        website: 'https://www.zoho.com',
        isActive: true,
      }),
    });
    const jsonZoho = await resZoho.json();
    assert.equal(resZoho.status, 201);
    assert.equal(jsonZoho.success, true);
    assert.equal(jsonZoho.data.code, 'ZOHO_E2E');
    zohoCompanyId = jsonZoho.data.id;
    assert.ok(zohoCompanyId);

    const resInfy = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'INFY_E2E',
        name: 'Infosys Limited',
        description: 'InfyTQ and campus hiring track.',
        website: 'https://www.infosys.com',
        isActive: true,
      }),
    });
    const jsonInfy = await resInfy.json();
    assert.equal(resInfy.status, 201);
    infosysCompanyId = jsonInfy.data.id;
    assert.ok(infosysCompanyId);

    // Company for safe deletion test
    const resSafe = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'TEMP_CORP',
        name: 'Temporary Clean Corp',
        isActive: true,
      }),
    });
    const jsonSafe = await resSafe.json();
    safeDeleteCompanyId = jsonSafe.data.id;
  });

  it('2. Creating duplicate company code is rejected with HTTP 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        code: 'ZOHO_E2E',
        name: 'Duplicate Zoho',
      }),
    });
    assert.equal(res.status, 409);
  });

  it('3. Placement Admin can edit company details and toggle active status', async () => {
    // Edit details
    const editRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated Zoho Advanced Problem Solving Track',
      }),
    });
    const editJson = await editRes.json();
    assert.equal(editRes.status, 200);
    assert.equal(editJson.data.description, 'Updated Zoho Advanced Problem Solving Track');

    // Deactivate status via PATCH /:id/status
    const deactRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const deactJson = await deactRes.json();
    assert.equal(deactRes.status, 200);
    assert.equal(deactJson.data.isActive, false);

    // Re-activate status
    const reactRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    const reactJson = await reactRes.json();
    assert.equal(reactRes.status, 200);
    assert.equal(reactJson.data.isActive, true);
  });

  it('4. Safe Removal: Unlinked company can be cleanly deleted, but linked company is safely protected', async () => {
    // Clean company without dependent records -> succeeds
    const deleteRes = await fetch(`${baseUrl}/companies/${safeDeleteCompanyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(deleteRes.status, 200);
  });

  // ===========================================================================
  // 2. COMPANY QUESTION UPLOAD & DUPLICATE DETECTION PIPELINE
  // ===========================================================================
  it('5. Uploading valid question batch associates all questions with the target company', async () => {
    const questionPayload = [
      {
        questionText: 'What is 20% of 500?',
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        marks: 2.0,
        negativeMarks: 0.5,
        source: 'Zoho Campus Drive 2024',
        year: 2024,
        options: [
          { optionText: '100', optionOrder: 1, isCorrect: true },
          { optionText: '50', optionOrder: 2, isCorrect: false },
          { optionText: '200', optionOrder: 3, isCorrect: false },
          { optionText: '150', optionOrder: 4, isCorrect: false },
        ],
        correctAnswer: '100',
        explanation: '20% of 500 = (20/100) * 500 = 100.',
      },
      {
        questionText: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
        category: 'CODING',
        topic: 'Dynamic Programming',
        difficulty: 'HARD',
        questionType: 'DESCRIPTIVE',
        marks: 10.0,
        negativeMarks: 0.0,
        source: 'Zoho Advanced Round',
        year: 2024,
      },
    ];

    const fileContent = Buffer.from(JSON.stringify(questionPayload));
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'application/json' });
    formData.append('file', blob, 'zoho_questions.json');

    const uploadRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
      body: formData,
    });

    const uploadJson = await uploadRes.json();
    assert.equal(uploadRes.status, 200);
    assert.equal(uploadJson.success, true);
    assert.equal(uploadJson.data.acceptedCount, 2);
    assert.equal(uploadJson.data.exactDuplicatesCount, 0);
    assert.equal(uploadJson.data.invalidCount, 0);
  });

  it('6. Duplicate Protection: Exact duplicate question is automatically skipped from DB insertion and linked to company', async () => {
    // Attempting to upload the exact same question again
    const duplicatePayload = [
      {
        questionText: 'What is 20% of 500?', // Exact match
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        source: 'Zoho Drive 2025 Retest',
        year: 2025,
        options: [
          // Even with different option ordering, exact SHA-256 fingerprint matches
          { optionText: '50', optionOrder: 1, isCorrect: false },
          { optionText: '100', optionOrder: 2, isCorrect: true },
          { optionText: '150', optionOrder: 3, isCorrect: false },
          { optionText: '200', optionOrder: 4, isCorrect: false },
        ],
        correctAnswer: '100',
      },
    ];

    const fileContent = Buffer.from(JSON.stringify(duplicatePayload));
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'application/json' });
    formData.append('file', blob, 'duplicate.json');

    const res = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
      body: formData,
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.acceptedCount, 0); // No new question record created
    assert.equal(json.data.exactDuplicatesCount, 1); // Exactly caught as duplicate
    assert.ok(json.data.exactDuplicates[0].existingQuestionId);
    sharedQuestionId = json.data.exactDuplicates[0].existingQuestionId;
  });

  it('7. Duplicate Protection: Semantic / Possible duplicate is flagged for Admin review without auto-deletion', async () => {
    // Different wording of the same percentage problem
    const semanticPayload = [
      {
        questionText: 'Calculate 20 percent of 500.', // Semantic duplicate of "What is 20% of 500?"
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        options: [
          { optionText: '100', optionOrder: 1, isCorrect: true },
          { optionText: '200', optionOrder: 2, isCorrect: false },
        ],
        correctAnswer: '100',
      },
    ];

    const fileContent = Buffer.from(JSON.stringify(semanticPayload));
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'application/json' });
    formData.append('file', blob, 'semantic.json');

    const res = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
      body: formData,
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.possibleDuplicatesCount, 1);
    assert.ok(json.data.possibleDuplicates[0].similarityScore >= 0.75);
    assert.ok(json.data.possibleDuplicates[0].reason.includes('token overlap'));
  });

  it('8. Question Reuse: Associating same question with multiple companies creates zero duplicate Question records', async () => {
    // Link the existing question to Infosys as well
    const infyPayload = [
      {
        questionText: 'What is 20% of 500?',
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        source: 'Infosys InfyTQ 2024',
        year: 2024,
        options: [
          { optionText: '100', optionOrder: 1, isCorrect: true },
          { optionText: '50', optionOrder: 2, isCorrect: false },
        ],
        correctAnswer: '100',
      },
    ];

    const fileContent = Buffer.from(JSON.stringify(infyPayload));
    const formData = new FormData();
    const blob = new Blob([fileContent], { type: 'application/json' });
    formData.append('file', blob, 'infy_link.json');

    const res = await fetch(`${baseUrl}/companies/${infosysCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
      body: formData,
    });

    const json = await res.json();
    assert.equal(res.status, 200);
    assert.equal(json.data.exactDuplicatesCount, 1);
    // Linked existing Question to Infosys without creating duplicate question record
    assert.equal(json.data.exactDuplicates[0].existingQuestionId, sharedQuestionId);

    // Verify both Zoho and Infosys query endpoints see this question
    const zohoQRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const zohoQJson = await zohoQRes.json();
    assert.ok(zohoQJson.data.some((q: any) => q.questionId === sharedQuestionId));

    const infyQRes = await fetch(`${baseUrl}/companies/${infosysCompanyId}/questions`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    const infyQJson = await infyQRes.json();
    assert.ok(infyQJson.data.some((q: any) => q.questionId === sharedQuestionId));
  });

  it('9. Safe Removal Protection: Company with existing questions cannot be permanently deleted', async () => {
    const deleteRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(deleteRes.status, 409);
    const deleteJson = await deleteRes.json();
    assert.ok(deleteJson.message.includes('Cannot permanently delete'));
  });

  // ===========================================================================
  // 3. COMPANY QUESTION INTELLIGENCE
  // ===========================================================================
  it('10. Intelligence API returns comprehensive corporate questions breakdown', async () => {
    const res = await fetch(`${baseUrl}/companies/${zohoCompanyId}/intelligence`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.totalQuestions >= 2);
    assert.ok(json.data.categoryBreakdown.quantitativeAptitude >= 1);
    assert.ok(json.data.categoryBreakdown.coding >= 1);
    assert.ok(Array.isArray(json.data.topicDistribution));
    assert.ok(Array.isArray(json.data.yearDistribution));
    assert.ok(json.data.evidenceLabels);
  });

  it('11. Duplicate Candidates can be retrieved and resolved by Placement Admin', async () => {
    const listRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/duplicates`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(listRes.status, 200);
    const listJson = await listRes.json();
    assert.ok(Array.isArray(listJson.data));
    assert.ok(listJson.data.length >= 1);
    pendingCandidateId = listJson.data[0].id;

    // Resolve as REJECTED (keep as separate question)
    const resolveRes = await fetch(`${baseUrl}/companies/duplicates/${pendingCandidateId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({ status: 'REJECTED' }),
    });
    assert.equal(resolveRes.status, 200);
    const resolveJson = await resolveRes.json();
    assert.equal(resolveJson.data.status, 'REJECTED');
  });

  // ===========================================================================
  // 4. COMPANY ASSESSMENT CREATION & STUDENT EXECUTION INTEGRATION
  // ===========================================================================
  it('12. Placement Admin can create and generate assessment using Company questions pool', async () => {
    const createRes = await fetch(`${baseUrl}/assessments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        name: 'Zoho Corporate Placement Qualifier',
        description: 'Zoho selection test pattern (Aptitude & Coding)',
        companyId: zohoCompanyId,
        isCompanyAssessment: true,
        duration: 30,
        maximumAttempts: 1,
        passingPercentage: 50.0,
        numberOfPapers: 1,
        sections: [
          {
            component: 'APTITUDE',
            name: 'Zoho Quantitative Aptitude',
            topics: ['Percentage'],
            difficulty: 'MEDIUM',
            questionType: 'SINGLE_CHOICE',
            questionsCount: 1,
            marksPerQuestion: 2.0,
            negativeMarks: 0.5,
          },
        ],
      }),
    });

    const createJson = await createRes.json();
    assert.equal(createRes.status, 201);
    companyAssessmentId = createJson.data.id;
    assert.ok(companyAssessmentId);

    // Generate papers using selection engine
    const genRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/generate-papers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(genRes.status, 201);

    // Publish
    const pubRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(pubRes.status, 200);

    // Assign student
    const assignRes = await fetch(`${baseUrl}/assessments/${companyAssessmentId}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        studentIds: ['stu-001'],
      }),
    });
    assert.equal(assignRes.status, 200);
  });

  it('13. Student executes Company Assessment and receives computed score', async () => {
    // Student starts assessment
    const startRes = await fetch(`${baseUrl}/student/assessments/${companyAssessmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(startRes.status, 201);
    const startJson = await startRes.json();
    const attemptId = startJson.data.id;
    assert.ok(attemptId);

    // Get attempt questions
    const attemptRes = await fetch(`${baseUrl}/student/attempts/${attemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(attemptRes.status, 200);
    const attemptJson = await attemptRes.json();
    const questions = attemptJson.data.questions || [];
    assert.ok(questions.length >= 1);
    const testQ = questions[0];

    // Submit answer
    const correctOpt = testQ.options?.[0];
    const answerRes = await fetch(`${baseUrl}/attempts/${attemptId}/answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        questionId: testQ.questionId,
        selectedOptionIds: correctOpt ? [correctOpt.id] : [],
        currentQuestion: 1,
      }),
    });
    assert.equal(answerRes.status, 200);

    // Submit attempt
    const submitRes = await fetch(`${baseUrl}/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ isAutoSubmitted: false }),
    });
    assert.equal(submitRes.status, 200);
  });

  // ===========================================================================
  // 5. SECURITY & STRICT RBAC
  // ===========================================================================
  it('14. Security: Student cannot create, upload, or modify company entities (HTTP 403 Forbidden)', async () => {
    // Student cannot create company
    const createRes = await fetch(`${baseUrl}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ code: 'STUDENT_CO', name: 'Unauthorized Corp' }),
    });
    assert.equal(createRes.status, 403);

    // Student cannot upload questions
    const uploadRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: new FormData(),
    });
    assert.equal(uploadRes.status, 403);

    // Student cannot resolve duplicate candidates
    const resolveRes = await fetch(`${baseUrl}/companies/duplicates/any-id`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ status: 'CONFIRMED_DUPLICATE' }),
    });
    assert.equal(resolveRes.status, 403);
  });

  it('15. Security: Super Admin cannot author question uploads (strictly PLACEMENT_ADMIN authoring)', async () => {
    const uploadRes = await fetch(`${baseUrl}/companies/${zohoCompanyId}/questions/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: new FormData(),
    });
    assert.equal(uploadRes.status, 403);
  });
});
