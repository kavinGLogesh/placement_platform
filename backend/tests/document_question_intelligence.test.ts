import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { createApp } from '../src/app.js';
import { questionRepository } from '../src/repositories/question.repository.js';
import { questionSelectionEngine } from '../src/services/selection-engine.service.js';
import { AssessmentDto, AssessmentSectionDto } from '../src/types/assessment.types.js';

let server: http.Server;
let baseUrl: string;
let placementAdminToken: string;
let studentToken: string;

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

  // Login Placement Admin
  const paRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.equal(paRes.status, 200);
  const paJson = await paRes.json();
  placementAdminToken = paJson.data.accessToken;

  // Login Student
  const stRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  assert.equal(stRes.status, 200);
  const stJson = await stRes.json();
  studentToken = stJson.data.accessToken;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('AI-Powered Document/Image Question Intelligence Suite', () => {
  it('1. File & Input Validation: Rejects requests with neither file nor text (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.message, /file.*or.*provide.*question.*text/i);
  });

  it('2. Deep Concept Intelligence: Identifies Profit & Loss (Example 1)', async () => {
    // "A man buys an article for ₹500 and sells it for ₹600. Find the profit percentage."
    const promptText = `1. A man buys an article for ₹500 and sells it for ₹600. Find the profit percentage.
A) 10%
B) 20%
C) 15%
D) 25%
Answer: B
Explanation: Profit = 600 - 500 = 100. Profit % = (100 / 500) * 100 = 20%.`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: promptText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.questions.length >= 1);

    const q = json.data.questions[0];
    assert.equal(q.category, 'QUANTITATIVE_APTITUDE');
    assert.equal(q.topic, 'Profit & Loss');
    assert.equal(q.difficulty, 'EASY');
    assert.equal(q.questionType, 'SINGLE_CHOICE');
    assert.ok(q.confidence.category >= 0.75);
    assert.ok(q.confidence.topic >= 0.75);
    assert.ok(q.options.length === 4);
    assert.equal(q.options.find((o: any) => o.optionText === '20%')?.isCorrect, true);
  });

  it('3. Deep Concept Intelligence: Identifies Percentage (Example 2: Net change)', async () => {
    // "If the price of an article is increased by 20% and then decreased by 20%, what is the net percentage change?"
    const promptText = `1. If the price of an article is increased by 20% and then decreased by 20%, what is the net percentage change?
A) 0% change
B) 4% decrease
C) 4% increase
D) 2% decrease
Answer: B
Explanation: Net change formula: a + b + (ab/100) = 20 - 20 - (400/100) = -4%.`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: promptText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.questions.length >= 1);

    const q = json.data.questions[0];
    assert.equal(q.category, 'QUANTITATIVE_APTITUDE');
    assert.equal(q.topic, 'Percentage');
    assert.equal(q.difficulty, 'MEDIUM');
    assert.equal(q.questionType, 'SINGLE_CHOICE');
  });

  it('4. Deep Concept Intelligence: Markup and discount identified as Profit & Loss (Example 3)', async () => {
    // "A shopkeeper marks an article 30% above cost price and gives a 10% discount. Find the profit percentage."
    const promptText = `1. A shopkeeper marks an article 30% above cost price and gives a 10% discount. Find the profit percentage.
A) 15%
B) 17%
C) 20%
D) 12%
Answer: B
Explanation: Let CP = 100, MP = 130. SP = 130 * 0.9 = 117. Profit = 17%.`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: promptText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.questions.length >= 1);

    const q = json.data.questions[0];
    assert.equal(q.category, 'QUANTITATIVE_APTITUDE');
    assert.equal(q.topic, 'Profit & Loss');
    assert.equal(q.difficulty, 'MEDIUM');
  });

  it('5. Logical Reasoning & Verbal Ability Intelligence', async () => {
    const promptText = `1. Find the next number in the series: 3, 7, 15, 31, 63, ?
A) 94
B) 127
C) 125
D) 120
Answer: B

2. Identify the error in the sentence: "Neither of the students were prepared for the exam."
A) Neither
B) of the students
C) were prepared
D) for the exam
Answer: C`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: promptText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.questions.length, 2);

    const q1 = json.data.questions[0];
    assert.equal(q1.category, 'LOGICAL_REASONING');
    assert.equal(q1.topic, 'Number Series');

    const q2 = json.data.questions[1];
    assert.equal(q2.category, 'VERBAL_ABILITY');
    assert.equal(q2.topic, 'Error Detection');
  });

  it('6. Multiple Questions from Spreadsheet (XLSX / CSV parsing and extraction)', async () => {
    // Generate a valid Excel workbook in memory
    const workbook = XLSX.utils.book_new();
    const rows = [
      {
        Question: 'A train 150m long is running at 54 km/hr. How many seconds will it take to pass a telegraph post?',
        'Option A': '8 sec',
        'Option B': '10 sec',
        'Option C': '12 sec',
        'Option D': '15 sec',
        Answer: 'B',
        Marks: 2,
        NegativeMarks: 0.5,
      },
      {
        Question: 'Pipe A can fill a tank in 6 hours and Pipe B in 8 hours. If both open together, how long to fill?',
        'Option A': '3.43 hours',
        'Option B': '4.2 hours',
        'Option C': '2.5 hours',
        'Option D': '5 hours',
        Answer: 'A',
        Marks: 2,
        NegativeMarks: 0.5,
      },
    ];
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Questions');
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const bodyParts: Buffer[] = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="questions.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`
      ),
      xlsxBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const fullBody = Buffer.concat(bodyParts);

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody,
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.totalParsed, 2);
    assert.equal(json.data.questions[0].topic, 'Time Speed Distance');
    assert.equal(json.data.questions[1].topic, 'Time & Work');
  });

  it('7. Duplicate Question Detection against active Question Bank', async () => {
    // 1. Create a question in active Question Bank
    const uniqueStatement = `Duplicate Detection Question: In how many ways can 5 boys and 4 girls be seated in a row such that no two girls are together? (${Date.now()})`;
    await questionRepository.createQuestion({
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Permutation & Combination',
      difficulty: 'HARD',
      questionType: 'SINGLE_CHOICE',
      questionText: uniqueStatement,
      marks: 2.0,
      negativeMarks: 0.5,
      options: [
        { optionText: '5! * 6P4', optionOrder: 1, isCorrect: true },
        { optionText: '5! * 4!', optionOrder: 2, isCorrect: false },
      ],
    });

    // 2. Upload document containing the exact same question statement
    const promptText = `1. ${uniqueStatement}
A) 5! * 6P4
B) 5! * 4!
Answer: A`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: promptText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.questions.length, 1);

    const extracted = json.data.questions[0];
    assert.equal(extracted.isDuplicate, true);
    assert.equal(extracted.status, 'DUPLICATE');
    assert.equal(extracted.isApproved, false);
    assert.ok(extracted.duplicateOfId);
    assert.ok(json.data.totalDuplicates >= 1);
  });

  it('8. Low-Confidence / Ambiguous Questions flagged as NEEDS_REVIEW', async () => {
    const ambiguousText = `1. Discuss the various philosophies and general notions regarding abstract thoughts and feelings.
Answer: General discussion`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: ambiguousText }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.questions.length >= 1);

    const q = json.data.questions[0];
    assert.equal(q.status, 'NEEDS_REVIEW');
    assert.equal(q.isApproved, false);
  });

  it('9. Admin Review & Bulk Approval: Only approved questions enter Question Bank', async () => {
    const timestamp = Date.now();
    const approvedQuestion = {
      category: 'QUANTITATIVE_APTITUDE' as const,
      topic: 'Simple Interest',
      difficulty: 'MEDIUM' as const,
      questionType: 'SINGLE_CHOICE' as const,
      questionText: `A sum of money doubles itself in 5 years at simple interest. What is the rate of interest per annum? (${timestamp})`,
      marks: 1.0,
      negativeMarks: 0.25,
      options: [
        { optionText: '20%', optionOrder: 1, isCorrect: true },
        { optionText: '10%', optionOrder: 2, isCorrect: false },
        { optionText: '15%', optionOrder: 3, isCorrect: false },
        { optionText: '25%', optionOrder: 4, isCorrect: false },
      ],
      aiClassification: {
        categoryConfidence: 0.95,
        topicConfidence: 0.92,
        difficultyConfidence: 0.88,
        typeConfidence: 0.98,
        overallConfidence: 0.93,
        reasoning: 'Direct SI rate formula application',
        status: 'CLASSIFIED' as const,
        isApproved: true,
      },
    };

    const res = await fetch(`${baseUrl}/questions/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questions: [approvedQuestion] }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.data.created.length, 1);

    const savedId = json.data.created[0].id;
    const verifyRes = await fetch(`${baseUrl}/questions/${savedId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(verifyRes.status, 200);
    const verifyJson = await verifyRes.json();
    assert.equal(verifyJson.data.topic, 'Simple Interest');
    assert.equal(verifyJson.data.aiClassification?.status, 'CLASSIFIED');
    assert.equal(verifyJson.data.aiClassification?.isApproved, true);
  });

  it('10. Assessment Builder Integration: Selection engine picks approved AI questions by Topic & Difficulty', async () => {
    // Populate questions for testing selection
    const testTopic = 'Compound Interest';
    for (let i = 1; i <= 3; i++) {
      await questionRepository.createQuestion({
        category: 'QUANTITATIVE_APTITUDE',
        topic: testTopic,
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: `Compound Interest Question ${i} (${Date.now()}): Calculate CI on ₹1000 for ${i} years.`,
        marks: 1.0,
        options: [
          { optionText: 'Ans A', optionOrder: 1, isCorrect: true },
          { optionText: 'Ans B', optionOrder: 2, isCorrect: false },
        ],
      });
    }

    const testAssessment: AssessmentDto = {
      id: `asmt-doc-test-${Date.now()}`,
      name: 'Document Intelligence Assessment',
      duration: 30,
      numberOfPapers: 1,
      passingPercentage: 50,
      status: 'DRAFT',
      totalMarks: 2,
      totalQuestions: 2,
      maximumAttempts: 1,
      negativeMarking: false,
      randomQuestions: false,
      randomOptions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testSection: AssessmentSectionDto = {
      id: `sec-ci-${Date.now()}`,
      assessmentId: testAssessment.id,
      name: 'Quantitative CI Section',
      component: 'APTITUDE',
      topics: [testTopic],
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      questionsCount: 2,
      marksPerQuestion: 1,
      negativeMarks: 0,
      sectionOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await questionSelectionEngine.generatePapers(testAssessment, [testSection]);
    assert.equal(result.papers.length, 1);
    assert.equal(result.papers[0].questions.length, 2);
    assert.equal(result.papers[0].questions[0].topic, testTopic);
    assert.equal(result.papers[0].questions[0].difficulty, 'EASY');
  });

  it('11. Security & RBAC: Students strictly forbidden (HTTP 403) from AI document analysis and bulk creation', async () => {
    // Test /questions/ai-analyze
    const analyzeRes = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Some question text' }),
    });
    assert.equal(analyzeRes.status, 403);

    // Test /questions/bulk
    const bulkRes = await fetch(`${baseUrl}/questions/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ questions: [] }),
    });
    assert.equal(bulkRes.status, 403);
  });

  it('12. DOCX Parser Bug Fix: Decompresses ZIP structure, extracts real question statement, and NEVER leaks PK or [Content_Types].xml', async () => {
    // Construct a genuine DOCX file archive in-memory using AdmZip
    const zip = new AdmZip();
    zip.addFile(
      '[Content_Types].xml',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'
      )
    );
    zip.addFile(
      '_rels/.rels',
      Buffer.from(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      )
    );
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Q1. A shopkeeper buys an article for ₹500 and sells it for ₹600. Calculate the profit percentage.</w:t></w:r></w:p>
    <w:p><w:r><w:t>A) 10%</w:t></w:r></w:p>
    <w:p><w:r><w:t>B) 20%</w:t></w:r></w:p>
    <w:p><w:r><w:t>C) 15%</w:t></w:r></w:p>
    <w:p><w:r><w:t>D) 25%</w:t></w:r></w:p>
    <w:p><w:r><w:t>Answer: B</w:t></w:r></w:p>
    <w:p><w:r><w:t>Explanation: Profit is ₹100, Profit % = 20%.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    zip.addFile('word/document.xml', Buffer.from(docXml, 'utf-8'));
    const docxBuffer = zip.toBuffer();

    const boundary = '----WebKitFormBoundaryDocx' + Math.random().toString(36).substring(2);
    const bodyParts: Buffer[] = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sample_exam.docx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`
      ),
      docxBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const fullBody = Buffer.concat(bodyParts);

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody,
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.questions.length, 1);

    const q = json.data.questions[0];
    // CRITICAL BUG VERIFICATION: Ensure NO ZIP headers or [Content_Types].xml exist in question statement!
    assert.equal(q.questionText.includes('PK'), false, 'Question statement must not contain ZIP PK header');
    assert.equal(q.questionText.includes('[Content_Types].xml'), false, 'Question statement must not contain Content_Types.xml');
    assert.match(q.questionText, /shopkeeper.*buys.*article.*500/i);
    assert.equal(q.topic, 'Profit & Loss');
    assert.equal(q.difficulty, 'EASY');
    assert.equal(q.documentAnswer, 'B');
    assert.equal(q.hasDocumentAnswer, true);
  });

  it('13. Bulk Question Extraction: Automatically segments 100 individual questions without grouping as one', async () => {
    let bulkDoc = '';
    for (let i = 1; i <= 100; i++) {
      bulkDoc += `Q${i}. Question statement number ${i} testing mathematical concept. What is the value of 2 + ${i}?\n`;
      bulkDoc += `A) ${i + 1}\nB) ${i + 2}\nC) ${i + 3}\nD) ${i + 4}\n`;
      bulkDoc += `Answer: B\n\n`;
    }

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: bulkDoc }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.totalParsed, 100, 'Should extract exactly 100 separate questions');
    assert.equal(json.data.questions[0].questionNumber, 1);
    assert.equal(json.data.questions[99].questionNumber, 100);
  });

  it('14. End-of-Document Answer Key Extraction: Maps question-to-answer table at the bottom of document', async () => {
    const textWithEndKey = `1. If a shirt costs ₹400 and is sold for ₹480, find profit percentage.
A) 10%
B) 20%
C) 15%
D) 25%

2. A car travels 120 km in 2 hours. What is its speed in km/hr?
A) 50 km/hr
B) 60 km/hr
C) 70 km/hr
D) 80 km/hr

3. Find the missing term: 2, 4, 8, 16, ?
A) 24
B) 32
C) 28
D) 30

ANSWER KEY:
1. B
2. B
3. B`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: textWithEndKey }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.totalParsed, 3);
    assert.equal(json.data.questions[0].documentAnswer, 'B');
    assert.equal(json.data.questions[0].hasDocumentAnswer, true);
    assert.equal(json.data.questions[1].documentAnswer, 'B');
    assert.equal(json.data.questions[2].documentAnswer, 'B');
  });

  it('15. Missing Answer Key: Sets documentAnswer: null, hasDocumentAnswer: false, and flags NEEDS_REVIEW (never invents answers)', async () => {
    const textWithoutKey = `Q1. Solve for x: 3x + 9 = 24.
A) 3
B) 5
C) 7
D) 9`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: textWithoutKey }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.questions.length, 1);
    const q = json.data.questions[0];

    assert.equal(q.documentAnswer, null, 'Must not invent document answer');
    assert.equal(q.hasDocumentAnswer, false);
    assert.equal(q.correctAnswer, null);
    assert.equal(q.status, 'NEEDS_REVIEW');
    assert.equal(q.isApproved, false);
  });

  it('16. XML Assessment File Parsing: Extracts structured questions, choices, and answers from XML', async () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<questions>
  <question id="1">
    <text>In a class of 60 students, 40% are girls. How many boys are in the class?</text>
    <options>
      <option label="A" correct="false">24</option>
      <option label="B" correct="true">36</option>
      <option label="C" correct="false">30</option>
      <option label="D" correct="false">20</option>
    </options>
    <answer>B</answer>
    <explanation>Girls = 24, Boys = 60 - 24 = 36.</explanation>
  </question>
</questions>`;

    const boundary = '----WebKitFormBoundaryXml' + Math.random().toString(36).substring(2);
    const bodyParts: Buffer[] = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="questions.xml"\r\nContent-Type: application/xml\r\n\r\n`
      ),
      Buffer.from(xmlContent, 'utf-8'),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];
    const fullBody = Buffer.concat(bodyParts);

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody,
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.totalParsed, 1);
    const q = json.data.questions[0];
    assert.equal(q.topic, 'Percentage');
    assert.equal(q.documentAnswer, 'B');
    assert.equal(q.hasDocumentAnswer, true);
    assert.equal(q.options.length, 4);
    assert.equal(q.options.find((o: any) => o.optionText === '36')?.isCorrect, true);
  });

  it('17. Formula, Equation & Special Character Preservation: Preserves mathematical symbols and Greek letters', async () => {
    const mathDoc = `Q1. Consider the quadratic curve: f(x) = x^2 - 5x + 6 = 0, where x ∈ ℝ. Find the roots α and β.
A) α = 2, β = 3
B) α = 1, β = 6
C) α = -2, β = -3
D) α = 0, β = 5
Answer: A`;

    const res = await fetch(`${baseUrl}/questions/ai-analyze`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${placementAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: mathDoc }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.data.questions.length, 1);
    const q = json.data.questions[0];
    assert.ok(q.questionText.includes('x^2 - 5x + 6 = 0'));
    assert.ok(q.questionText.includes('∈'));
    assert.ok(q.questionText.includes('ℝ'));
    assert.ok(q.questionText.includes('α'));
    assert.ok(q.questionText.includes('β'));
    assert.equal(q.documentAnswer, 'A');
  });
});
