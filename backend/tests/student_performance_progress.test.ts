import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { app } from '../src/app.js';
import { computePerformanceProgress } from '../src/utils/calculation.util.js';
import { resumeUploadDir } from '../src/utils/resume.util.js';

let server: any;
let baseUrl: string;

let adminToken: string;
let studentToken: string;
let testStudentId: string;

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

before(async () => {
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}/api`;

  // Placement Admin login
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'placementadmin@placement.edu',
      password: 'PlacementAdmin@123',
    }),
  });
  const adminJson = await adminRes.json();
  adminToken = adminJson.data.accessToken;

  // Student login
  const studentRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student@placement.edu',
      password: 'Student@123',
    }),
  });
  const studentJson = await studentRes.json();
  studentToken = studentJson.data.accessToken;

  // Resolve Student entity ID
  const profileRes = await fetch(`${baseUrl}/student/profile`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const profileJson = await profileRes.json();
  testStudentId = profileJson.data.id;
});

describe('Student Performance Progress & Verified Resume Suite', () => {
  describe('1. Pure Deterministic Calculation Formula Tests', () => {
    it('calculates improvement: Previous 60 -> Current 70 (+16.67%, Improved)', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Test',
          obtainedMarks: 70,
          totalMarks: 100,
          percentage: 70,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Test',
          obtainedMarks: 60,
          totalMarks: 100,
          percentage: 60,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.canCompare, true);
      assert.strictEqual(res.scoreChange, 10);
      assert.strictEqual(res.percentageChange, 16.67);
      assert.strictEqual(res.percentageChangeDisplay, '+16.67%');
      assert.strictEqual(res.status, 'Improved');
    });

    it('calculates decrease: Previous 70 -> Current 60 (-14.29%, Decreased)', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Test',
          obtainedMarks: 60,
          totalMarks: 100,
          percentage: 60,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Test',
          obtainedMarks: 70,
          totalMarks: 100,
          percentage: 70,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.canCompare, true);
      assert.strictEqual(res.scoreChange, -10);
      assert.strictEqual(res.percentageChange, -14.29);
      assert.strictEqual(res.percentageChangeDisplay, '-14.29%');
      assert.strictEqual(res.status, 'Decreased');
    });

    it('calculates equal score: Previous 70 -> Current 70 (0% Change, No Change)', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Test',
          obtainedMarks: 70,
          totalMarks: 100,
          percentage: 70,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Test',
          obtainedMarks: 70,
          totalMarks: 100,
          percentage: 70,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.canCompare, true);
      assert.strictEqual(res.scoreChange, 0);
      assert.strictEqual(res.percentageChange, 0);
      assert.strictEqual(res.percentageChangeDisplay, '0% Change');
      assert.strictEqual(res.status, 'No Change');
    });

    it('guards against division by zero: Previous 0 -> Current 70', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Test',
          obtainedMarks: 70,
          totalMarks: 100,
          percentage: 70,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Test',
          obtainedMarks: 0,
          totalMarks: 100,
          percentage: 0,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.canCompare, true);
      assert.strictEqual(res.scoreChange, 70);
      assert.strictEqual(res.percentageChange, null);
      assert.strictEqual(res.percentageChangeDisplay, 'Percentage change unavailable.');
      assert.strictEqual(res.status, 'Improved');
    });

    it('calculates specification example: Previous 62 -> Current 72 (+16.13%, Improved)', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Assessment',
          obtainedMarks: 72,
          totalMarks: 100,
          percentage: 72,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Assessment',
          obtainedMarks: 62,
          totalMarks: 100,
          percentage: 62,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.scoreChange, 10);
      assert.strictEqual(res.percentageChange, 16.13);
      assert.strictEqual(res.percentageChangeDisplay, '+16.13%');
      assert.strictEqual(res.status, 'Improved');
    });

    it('calculates specification decrease: Previous 72 -> Current 62 (-13.89%, Decreased)', () => {
      const results = [
        {
          assessmentId: 'a2',
          assessmentTitle: 'Current Assessment',
          obtainedMarks: 62,
          totalMarks: 100,
          percentage: 62,
          createdAt: new Date('2026-03-02').toISOString(),
        },
        {
          assessmentId: 'a1',
          assessmentTitle: 'Previous Assessment',
          obtainedMarks: 72,
          totalMarks: 100,
          percentage: 72,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.scoreChange, -10);
      assert.strictEqual(res.percentageChange, -13.89);
      assert.strictEqual(res.percentageChangeDisplay, '-13.89%');
      assert.strictEqual(res.status, 'Decreased');
    });

    it('handles 0 completed assessments gracefully', () => {
      const res = computePerformanceProgress([]);
      assert.strictEqual(res.hasCompletedAssessments, false);
      assert.strictEqual(res.canCompare, false);
      assert.strictEqual(res.statusMessage, 'No completed assessment data available.');
    });

    it('handles 1 completed assessment gracefully', () => {
      const results = [
        {
          assessmentId: 'a1',
          assessmentTitle: 'First Assessment',
          obtainedMarks: 85,
          totalMarks: 100,
          percentage: 85,
          createdAt: new Date('2026-03-01').toISOString(),
        },
      ];

      const res = computePerformanceProgress(results);
      assert.strictEqual(res.hasCompletedAssessments, true);
      assert.strictEqual(res.canCompare, false);
      assert.strictEqual(res.statusMessage, 'Previous assessment comparison is not available.');
      assert.strictEqual(res.currentTest?.score, 85);
      assert.strictEqual(res.previousTest, undefined);
    });
  });

  describe('2. Admin API Integration & RBAC Tests', () => {
    it('GET /api/analytics/students/:id includes performanceProgress and resume', async () => {
      const res = await fetch(`${baseUrl}/analytics/students/${testStudentId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data.performanceProgress, 'Must include performanceProgress');
      assert.ok(json.data.resume, 'Must include resume metadata');
      assert.strictEqual(typeof json.data.resume.exists, 'boolean');
    });

    it('GET /api/students/:id/resume allows SUPER_ADMIN and PLACEMENT_ADMIN', async () => {
      const res = await fetch(`${baseUrl}/students/${testStudentId}/resume`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.ok(json.data, 'Must return resume metadata');
      assert.strictEqual(typeof json.data.exists, 'boolean');
    });

    it('GET /api/students/:id/resume blocks STUDENT role with HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/students/${testStudentId}/resume`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403, 'Student cannot access admin resume metadata endpoint');
    });

    it('GET /api/students/:id/resume/download blocks STUDENT role with HTTP 403', async () => {
      const res = await fetch(`${baseUrl}/students/${testStudentId}/resume/download`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403, 'Student cannot access admin resume download endpoint');
    });

    it('GET /api/students/:id/resume returns 404 for nonexistent student', async () => {
      const res = await fetch(`${baseUrl}/students/nonexistent-student-999/resume`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 404);
    });

    it('GET /api/students/:id/resume/download streams resume when uploaded', async () => {
      // Create a test resume file and meta file
      const fakePdf = '%PDF-1.4 test resume stream';
      const resumeFile = path.join(resumeUploadDir, `${testStudentId}_resume.pdf`);
      const metaFile = path.join(resumeUploadDir, `${testStudentId}_meta.json`);
      fs.writeFileSync(resumeFile, fakePdf, 'utf-8');
      fs.writeFileSync(
        metaFile,
        JSON.stringify({
          studentId: testStudentId,
          fileName: 'Verified_Resume_Test.pdf',
          fileSize: '12 KB',
          mimeType: 'application/pdf',
          uploadedAt: new Date().toISOString(),
          status: 'VERIFIED',
        }),
        'utf-8'
      );

      const res = await fetch(`${baseUrl}/students/${testStudentId}/resume/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'application/pdf');
      const text = await res.text();
      assert.strictEqual(text, fakePdf);
    });
  });
});
