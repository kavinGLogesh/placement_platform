import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server: http.Server;
let baseUrl: string;
let studentToken: string;
let adminToken: string;

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

  // Login as student
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  assert.strictEqual(studentRes.status, 200, 'Student login should succeed');
  const studentData = await studentRes.json();
  studentToken = studentData.data.accessToken;

  // Login as admin
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.strictEqual(adminRes.status, 200, 'Admin login should succeed');
  const adminData = await adminRes.json();
  adminToken = adminData.data.accessToken;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Student Verified Placement Resume Suite', () => {
  it('1. GET /api/student/profile includes resume metadata', async () => {
    const res = await fetch(`${baseUrl}/student/profile`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.resume, 'Resume info must exist');
    assert.ok(json.data.resume.fileName, 'Resume fileName must exist');
  });

  it('2. POST /api/student/resume uploads a valid PDF resume successfully', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const pdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Test Resume) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="resume"; filename="2026CS101_Official_Resume.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `${pdfContent}\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetch(`${baseUrl}/student/resume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(body, 'utf-8'),
    });

    assert.strictEqual(res.status, 200, 'Upload should return 200');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.fileName, '2026CS101_Official_Resume.pdf');
    assert.strictEqual(json.data.status, 'VERIFIED');
  });

  it('3. GET /api/student/resume/download streams the uploaded resume correctly', async () => {
    const res = await fetch(`${baseUrl}/student/resume/download`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.strictEqual(res.status, 200, 'Download should succeed with 200');
    assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
    assert.ok(res.headers.get('content-disposition')?.includes('attachment'));
    const text = await res.text();
    assert.ok(text.includes('%PDF-1.4'), 'Downloaded stream must match PDF format');
  });

  it('4. POST /api/student/resume rejects non-PDF file upload with HTTP 400', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const txtContent = 'This is a text file not a PDF';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="resume"; filename="malicious.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `${txtContent}\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetch(`${baseUrl}/student/resume`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(body, 'utf-8'),
    });

    assert.strictEqual(res.status, 400, 'Non-PDF upload must be rejected with 400');
  });

  it('5. Unauthenticated access to /api/student/resume is blocked with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/student/resume`, { method: 'POST' });
    assert.strictEqual(res.status, 401);

    const downloadRes = await fetch(`${baseUrl}/student/resume/download`);
    assert.strictEqual(downloadRes.status, 401);
  });

  it('6. Admin role accessing /api/student/resume is blocked with HTTP 403', async () => {
    const res = await fetch(`${baseUrl}/student/resume/download`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 403, 'Admin cannot access student resume download');
  });
});
