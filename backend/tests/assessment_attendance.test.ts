import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { generateAccessToken } from '../src/utils/jwt.util.js';
import { Role } from '../src/types/auth.types.js';
import { attendanceRepository } from '../src/repositories/attendance.repository.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
let placementAdminToken: string;
let studentToken: string;
let student2Token: string;

let activeAssessmentId: string;
let closedAssessmentId: string;
let secondClosedAssessmentId: string;

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

  student2Token = generateAccessToken({
    sub: 'usr-student-other-002',
    email: 'otherstudent@placement.edu',
    role: Role.STUDENT,
  });

  // Setup test assessments via REST API:
  // 1. Active Assessment (future end date)
  const activeRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      name: 'Active Campus Assessment 2026',
      duration: 60,
      departmentTargeting: 'ALL',
      sections: [
        {
          component: 'APTITUDE',
          name: 'Quantitative Basics',
          topics: ['Percentage'],
          questionsCount: 1,
          marksPerQuestion: 2,
        },
      ],
    }),
  });
  const activeJson = await activeRes.json();
  activeAssessmentId = activeJson.data.id;
  await fetch(`${baseUrl}/assessments/${activeAssessmentId}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${activeAssessmentId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${activeAssessmentId}/schedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 3600000).toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  });

  // 2. Closed Assessment (past end date)
  const closedRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      name: 'TCS Placement Drive Assessment',
      duration: 90,
      departmentTargeting: 'ALL',
      sections: [
        {
          component: 'TECHNICAL_MCQ',
          name: 'Core CS Concepts',
          topics: ['Data Structures'],
          questionsCount: 1,
          marksPerQuestion: 2,
        },
      ],
    }),
  });
  const closedJson = await closedRes.json();
  closedAssessmentId = closedJson.data.id;
  await fetch(`${baseUrl}/assessments/${closedAssessmentId}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${closedAssessmentId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${closedAssessmentId}/schedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 172800000).toISOString(),
      endDate: new Date(Date.now() - 86400000).toISOString(),
    }),
  });

  // 3. Second Closed Assessment for repeated non-attendance testing
  const secondClosedRes = await fetch(`${baseUrl}/assessments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      name: 'Wipro Mock Technical Test',
      duration: 60,
      departmentTargeting: 'ALL',
      sections: [
        {
          component: 'VERBAL_ABILITY',
          name: 'Verbal Section',
          topics: ['Reading Comprehension'],
          questionsCount: 1,
          marksPerQuestion: 2,
        },
      ],
    }),
  });
  const secondClosedJson = await secondClosedRes.json();
  secondClosedAssessmentId = secondClosedJson.data.id;
  await fetch(`${baseUrl}/assessments/${secondClosedAssessmentId}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${secondClosedAssessmentId}/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${placementAdminToken}` },
  });
  await fetch(`${baseUrl}/assessments/${secondClosedAssessmentId}/schedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 259200000).toISOString(),
      endDate: new Date(Date.now() - 172800000).toISOString(),
    }),
  });

  // Assign students via REST API
  await fetch(`${baseUrl}/assessments/${activeAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      studentIds: ['std-sample-001', 'std-sample-002'],
    }),
  });
  await fetch(`${baseUrl}/assessments/${closedAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      studentIds: ['std-sample-001', 'std-sample-002', 'std-sample-003'],
    }),
  });
  await fetch(`${baseUrl}/assessments/${secondClosedAssessmentId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${placementAdminToken}`,
    },
    body: JSON.stringify({
      studentIds: ['std-sample-001', 'std-sample-002'],
    }),
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Phase 11: Assessment Attendance & Follow-up Automation Module', () => {
  // ===========================================================================
  // 1. ATTENDANCE DASHBOARD & OVERVIEW AGGREGATIONS
  // ===========================================================================
  describe('1. Attendance Dashboard & Aggregations', () => {
    it('should return real overview KPIs for an active assessment (not marked absent while active)', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${activeAssessmentId}/overview`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.assessmentId, activeAssessmentId);
      assert.strictEqual(json.data.isWindowClosed, false);
      // Active assessment: notAttended MUST be 0 while the testing window is still open
      assert.strictEqual(json.data.notAttended, 0);
      assert.ok(json.data.assignedStudents >= 2);
    });

    it('should return correct closed status and count non-attended students when window is closed', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/overview`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.assessmentId, closedAssessmentId);
      assert.strictEqual(json.data.isWindowClosed, true);
      assert.ok(json.data.assignedStudents >= 3);
      // In closed assessment with no attempts, all assigned students are marked notAttended
      assert.strictEqual(json.data.notAttended, json.data.assignedStudents);
    });

    it('should return all assessment attendance overviews for the administration hub', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/overview`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.ok(json.data.length >= 2);
      const found = json.data.find((a: any) => a.assessmentId === closedAssessmentId);
      assert.ok(found);
      assert.strictEqual(found.assessmentName, 'TCS Placement Drive Assessment');
    });
  });

  // ===========================================================================
  // 2. ATTENDANCE STATUS RULES & NOT-ATTENDED STUDENT DETECTION
  // ===========================================================================
  describe('2. Attendance Status Rules & Detection', () => {
    it('should NOT mark student as NOT_ATTENDED when assessment is still active', async () => {
      const res = await fetch(
        `${baseUrl}/attendance/records?assessmentId=${activeAssessmentId}&status=NOT_ATTENDED`,
        {
          headers: { Authorization: `Bearer ${placementAdminToken}` },
        }
      );
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      // Window is active, so zero students qualify as NOT_ATTENDED
      assert.strictEqual(json.data.records.length, 0);
    });

    it('should return 404 for an invalid or non-existent assessment ID', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/asmt-non-existent-9999/overview`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 404);
    });
  });

  // ===========================================================================
  // 3. ADMIN NOTIFICATIONS & IDEMPOTENT CLOSURE SWEEP
  // ===========================================================================
  describe('3. Admin Notifications & Idempotency', () => {
    it('should run assessment sync sweep and detect closed assessments', async () => {
      const res = await fetch(`${baseUrl}/attendance/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(typeof json.data.processedCount === 'number');
    });

    it('should fetch active attendance alerts', async () => {
      const res = await fetch(`${baseUrl}/attendance/alerts`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    it('should allow placement admin to resolve an attendance alert', async () => {
      // Put a test alert into memStore
      attendanceRepository.memStore.alerts.set('test-alert-1', {
        id: 'test-alert-1',
        assessmentId: closedAssessmentId,
        assessmentTitle: 'TCS Placement Drive Assessment',
        notAttendedCount: 30,
        assignedCount: 350,
        alertMessage: '⚠ TCS Placement Assessment Attendance Alert: 30 assigned students did not attend.',
        isResolved: false,
        reminderSentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await fetch(`${baseUrl}/attendance/alerts/test-alert-1/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.resolved, true);

      // Verify it is resolved
      const alert = attendanceRepository.memStore.alerts.get('test-alert-1');
      assert.strictEqual(alert?.isResolved, true);
    });
  });

  // ===========================================================================
  // 4. EXCEL EXPORT (NOT ATTENDED STUDENTS)
  // ===========================================================================
  describe('4. Excel Report Generation', () => {
    it('should export not-attended students report as valid XLSX spreadsheet buffer', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/export`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const contentType = res.headers.get('content-type');
      assert.ok(
        contentType?.includes('spreadsheetml') || contentType?.includes('octet-stream'),
        `Unexpected content-type: ${contentType}`
      );
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition?.includes('attachment; filename='));
      assert.ok(disposition?.includes('.xlsx'));

      const buffer = await res.arrayBuffer();
      assert.ok(buffer.byteLength > 100, 'Excel buffer should contain real spreadsheet data');
    });

    it('should support not-attended export via existing /api/reports/:type/export route', async () => {
      const res = await fetch(
        `${baseUrl}/reports/not-attended/export?assessmentId=${closedAssessmentId}&format=xlsx`,
        {
          headers: { Authorization: `Bearer ${placementAdminToken}` },
        }
      );
      assert.strictEqual(res.status, 200);
      const disposition = res.headers.get('content-disposition');
      assert.ok(disposition?.includes('attachment; filename='));
    });
  });

  // ===========================================================================
  // 5. EMAIL AUTOMATION, REMINDERS & DUPLICATE PREVENTION
  // ===========================================================================
  describe('5. Email Automation & Duplicate-Safe Follow-ups', () => {
    it('should read attendance automation configuration for an assessment', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/config`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.assessmentId, closedAssessmentId);
      assert.strictEqual(json.data.isEmailReminderEnabled, true);
    });

    it('should allow placement admin to update automation config', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${placementAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEmailReminderEnabled: true,
          autoClosureReminder: true,
          sendClosingSoonReminder: true,
          closingSoonHours: 3,
        }),
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.data.autoClosureReminder, true);
      assert.strictEqual(json.data.closingSoonHours, 3);
    });

    it('should dispatch follow-up reminders and prevent duplicate emails on retry', async () => {
      // 1. First dispatch
      const res1 = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${placementAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customMessage: 'Please report to the placement office with medical certificate if applicable.',
        }),
      });
      assert.strictEqual(res1.status, 200);
      const json1 = await res1.json();
      assert.strictEqual(json1.success, true);
      assert.strictEqual(json1.data.assessmentId, closedAssessmentId);

      // 2. Second dispatch (Immediate Retry)
      // Must NOT send duplicate emails to previously notified students
      const res2 = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${placementAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res2.status, 200);
      const json2 = await res2.json();
      assert.strictEqual(json2.success, true);
      // All students previously notified are skipped
      assert.strictEqual(json2.data.sentCount, 0);
    });

    it('should block email reminder dispatch when disabled in automation config', async () => {
      // Disable reminders
      await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${placementAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEmailReminderEnabled: false }),
      });

      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${placementAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.message.includes('disabled'));
    });
  });

  // ===========================================================================
  // 6. REPEATED NON-ATTENDANCE INSIGHTS
  // ===========================================================================
  describe('6. Repeated Non-Attendance Insights', () => {
    it('should return repeated non-attendance data without inventing reasons', async () => {
      const res = await fetch(`${baseUrl}/attendance/repeated-non-attendance`, {
        headers: { Authorization: `Bearer ${placementAdminToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
    });
  });

  // ===========================================================================
  // 7. SECURITY & RBAC ENFORCEMENT
  // ===========================================================================
  describe('7. Security, RBAC & IDOR Protection', () => {
    it('should deny unauthenticated requests with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/overview`);
      assert.strictEqual(res.status, 401);
    });

    it('should deny STUDENT from accessing admin attendance overview (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/overview`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('should deny STUDENT from accessing admin student records list (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/attendance/records`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('should deny STUDENT from exporting attendance reports (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/export`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 403);
    });

    it('should deny STUDENT from triggering reminder emails (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 403);
    });

    it('should allow SUPER_ADMIN to monitor overviews and alerts in read-only mode', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/overview`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.strictEqual(res.status, 200);

      const alertRes = await fetch(`${baseUrl}/attendance/alerts`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.strictEqual(alertRes.status, 200);
    });

    it('should deny SUPER_ADMIN from sending reminders (strictly PLACEMENT_ADMIN)', async () => {
      const res = await fetch(`${baseUrl}/attendance/assessments/${closedAssessmentId}/reminders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 403);
    });

    it('should allow STUDENT to access only their own attendance history via /student/me', async () => {
      const res = await fetch(`${baseUrl}/attendance/student/me`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    it('should prevent student from accessing other student attendance records (IDOR protection)', async () => {
      const res = await fetch(`${baseUrl}/attendance/records?studentId=stu-001`, {
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      assert.strictEqual(res.status, 403);
    });
  });
});
