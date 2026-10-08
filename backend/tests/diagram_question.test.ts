import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { QuestionSegmenter } from '../src/services/question-segmenter.util.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let uploadedImageUrl: string;
let uploadedFilename: string;

// Sample 1x1 valid PNG (magic bytes: 89 50 4E 47 0D 0A 1A 0A)
const VALID_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Sample valid JPEG (magic bytes: FF D8 FF)
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x80, 0xff, 0xd9,
]);

// Fake PNG (text file with .png extension)
const FAKE_PNG_BUFFER = Buffer.from('This is a malicious text payload pretending to be an image', 'utf-8');

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

  // 1. Super Admin Token
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminJson = await adminRes.json();
  superAdminToken = adminJson.data.accessToken;

  // 2. Placement Admin Token
  const placementRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  const placementJson = await placementRes.json();
  placementAdminToken = placementJson.data.accessToken;

  // 3. Student Token
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
    server.close(() => resolve());
  });
});

describe('Diagram/Image-Based Question Support — Test Suite', () => {
  // Helper to build multipart/form-data request
  function createMultipartPayload(fieldName: string, fileName: string, mimeType: string, fileBuffer: Buffer) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const head = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;
    const body = Buffer.concat([Buffer.from(head, 'utf-8'), fileBuffer, Buffer.from(tail, 'utf-8')]);
    return {
      contentType: `multipart/form-data; boundary=${boundary}`,
      body,
    };
  }

  // --------------------------------------------------------------------------
  // SECTION 1: File Validation & Magic Byte Security
  // --------------------------------------------------------------------------
  it('1.1 Admin can successfully upload a valid PNG diagram', async () => {
    const { contentType, body } = createMultipartPayload('image', 'circuit_diagram.png', 'image/png', VALID_PNG_BUFFER);
    const res = await fetch(`${baseUrl}/questions/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body,
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.imageUrl);
    assert.ok(json.data.imageUrl.startsWith('/api/questions/images/'));
    assert.ok(json.data.filename.endsWith('.png'));

    uploadedImageUrl = json.data.imageUrl;
    uploadedFilename = json.data.filename;
  });

  it('1.2 Admin can successfully upload a valid JPEG figure', async () => {
    const { contentType, body } = createMultipartPayload('image', 'graph_chart.jpg', 'image/jpeg', VALID_JPEG_BUFFER);
    const res = await fetch(`${baseUrl}/questions/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body,
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.imageUrl.endsWith('.jpg') || json.data.imageUrl.endsWith('.jpeg'));
  });

  it('1.3 Magic byte mismatch: Reject spoofed text file named .png', async () => {
    const { contentType, body } = createMultipartPayload('image', 'exploit.png', 'image/png', FAKE_PNG_BUFFER);
    const res = await fetch(`${baseUrl}/questions/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body,
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Security check failed') || json.message.includes('valid PNG'));
  });

  it('1.4 Reject unauthenticated diagram upload', async () => {
    const { contentType, body } = createMultipartPayload('image', 'test.png', 'image/png', VALID_PNG_BUFFER);
    const res = await fetch(`${baseUrl}/questions/upload-image`, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });

    assert.strictEqual(res.status, 401);
  });

  it('1.5 Student cannot upload images to authoring bank (RBAC)', async () => {
    const { contentType, body } = createMultipartPayload('image', 'test.png', 'image/png', VALID_PNG_BUFFER);
    const res = await fetch(`${baseUrl}/questions/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${studentToken}`,
      },
      body,
    });

    assert.strictEqual(res.status, 403);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: Image Serving, Authorization & Path Traversal Security
  // --------------------------------------------------------------------------
  it('2.1 Authorized user can retrieve uploaded image via Authorization header', async () => {
    assert.ok(uploadedFilename, 'Filename must be available from upload test');
    const res = await fetch(`${baseUrl}/questions/images/${uploadedFilename}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    const bytes = await res.arrayBuffer();
    assert.strictEqual(bytes.byteLength, VALID_PNG_BUFFER.length);
  });

  it('2.2 Student can retrieve uploaded image via ?token= query parameter', async () => {
    const res = await fetch(`${baseUrl}/questions/images/${uploadedFilename}?token=${encodeURIComponent(studentToken)}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'image/png');
  });

  it('2.3 Unauthenticated request to question image is rejected (401)', async () => {
    const res = await fetch(`${baseUrl}/questions/images/${uploadedFilename}`);
    assert.strictEqual(res.status, 401);
  });

  it('2.4 Path traversal attempts are blocked', async () => {
    const res = await fetch(`${baseUrl}/questions/images/..%2f..%2fpackage.json`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    // Should be rejected by route validation or 400 invalid filename
    assert.ok(res.status === 400 || res.status === 404);
  });

  // --------------------------------------------------------------------------
  // SECTION 3: Question Bank CRUD with Diagram Association
  // --------------------------------------------------------------------------
  let diagramQuestionId: string;

  it('3.1 Create SINGLE_CHOICE question containing diagram', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
        questionText: 'What percentage of the shaded area is represented in the diagram below?',
        imageUrl: uploadedImageUrl,
        marks: 2.0,
        negativeMarks: 0.5,
        options: [
          { optionText: '25%', optionOrder: 1, isCorrect: false },
          { optionText: '50%', optionOrder: 2, isCorrect: true },
          { optionText: '75%', optionOrder: 3, isCorrect: false },
          { optionText: '100%', optionOrder: 4, isCorrect: false },
        ],
        explanation: 'The shaded area covers exactly half of the total geometry.',
      }),
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.imageUrl, uploadedImageUrl);
    assert.strictEqual(json.data.questionText, 'What percentage of the shaded area is represented in the diagram below?');
    diagramQuestionId = json.data.id;
  });

  it('3.2 Fetch question by ID preserves imageUrl', async () => {
    const res = await fetch(`${baseUrl}/questions/${diagramQuestionId}`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.imageUrl, uploadedImageUrl);
  });

  it('3.3 Update question preserves or modifies imageUrl', async () => {
    const res = await fetch(`${baseUrl}/questions/${diagramQuestionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        questionText: 'Updated: What percentage of the shaded area is shown in this figure?',
        imageUrl: uploadedImageUrl,
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.data.imageUrl, uploadedImageUrl);
    assert.ok(json.data.questionText.startsWith('Updated:'));
  });

  it('3.4 Support diagrams across MULTIPLE_CHOICE, TRUE_FALSE, and FILL_BLANK', async () => {
    // True/False with diagram
    const tfRes = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'LOGICAL_REASONING',
        topic: 'Blood Relations',
        difficulty: 'EASY',
        questionType: 'TRUE_FALSE',
        questionText: 'Based on the family tree diagram, person A is the grandfather of person D.',
        imageUrl: uploadedImageUrl,
        marks: 1.0,
        negativeMarks: 0.0,
        options: [
          { optionText: 'True', optionOrder: 1, isCorrect: true },
          { optionText: 'False', optionOrder: 2, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(tfRes.status, 201);
    const tfJson = await tfRes.json();
    assert.strictEqual(tfJson.data.imageUrl, uploadedImageUrl);

    // Fill Blank with diagram
    const fbRes = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'TECHNICAL_MCQ',
        topic: 'Data Structures',
        difficulty: 'HARD',
        questionType: 'FILL_BLANK',
        questionText: 'Identify the time complexity for searching in the binary tree diagram shown.',
        imageUrl: uploadedImageUrl,
        correctAnswer: 'O(log n)',
        marks: 3.0,
        negativeMarks: 0.5,
        options: [],
      }),
    });
    assert.strictEqual(fbRes.status, 201);
    const fbJson = await fbRes.json();
    assert.strictEqual(fbJson.data.imageUrl, uploadedImageUrl);
  });

  it('3.5 Text-only questions without diagrams work without regression', async () => {
    const res = await fetch(`${baseUrl}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        category: 'QUANTITATIVE_APTITUDE',
        topic: 'Percentage',
        difficulty: 'EASY',
        questionType: 'SINGLE_CHOICE',
        questionText: 'What is 20% of 250?',
        marks: 1.0,
        negativeMarks: 0.25,
        options: [
          { optionText: '25', optionOrder: 1, isCorrect: false },
          { optionText: '50', optionOrder: 2, isCorrect: true },
          { optionText: '75', optionOrder: 3, isCorrect: false },
          { optionText: '100', optionOrder: 4, isCorrect: false },
        ],
      }),
    });
    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.strictEqual(json.data.imageUrl, null);
  });

  // --------------------------------------------------------------------------
  // SECTION 4: Document Import Segmenter & Diagram Detection
  // --------------------------------------------------------------------------
  it('4.1 Segmenter detects inline diagram reference and flags unresolved diagram', () => {
    const rawBlock = `Question 15:
Refer to Figure 3.2 showing a Wheatstone bridge circuit.
What is the balanced resistance value across terminals AB?
A) 10 ohms
B) 20 ohms
C) 30 ohms
D) 40 ohms
Answer: B
Explanation: At balance R1/R2 = R3/R4.`;

    const parsed = QuestionSegmenter.parseIndividualBlock(rawBlock, 15);
    assert.strictEqual(parsed.hasUnresolvedDiagram, true);
    assert.ok(parsed.diagramReviewNote);
    assert.ok(parsed.diagramReviewNote.includes('Visual reference detected'));
  });

  it('4.2 Segmenter extracts markdown image tag if present in raw document text', () => {
    const rawBlock = `Question 22:
![Circuit Diagram](https://example.com/circuit.png)
What is the resonant frequency of the RLC circuit shown above?
A) 50 Hz
B) 100 Hz
Answer: A`;

    const parsed = QuestionSegmenter.parseIndividualBlock(rawBlock, 22);
    assert.strictEqual(parsed.imageUrl, 'https://example.com/circuit.png');
    assert.strictEqual(parsed.hasUnresolvedDiagram, false);
  });
});
