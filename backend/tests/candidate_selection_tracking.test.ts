import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { SelectionStage } from '../src/types/placement-drive.types.js';

let server: http.Server;
let baseUrl: string;
let superAdminToken: string;
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

  // Admin login
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminBody = await adminLoginRes.json();
  superAdminToken = adminBody.data.accessToken;

  // 2. Student login (Aarav Sharma, stu-001)
  const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentBody = await studentLoginRes.json();
  studentToken = studentBody.data.accessToken;

  // 3. Configure student 1 (Aarav, stu-001) with verified academic records
  await fetch(`${baseUrl}/students/stu-001/academic-records`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenthBoard: 'CBSE',
      tenthPassingYear: 2020,
      tenthTotalMarks: 500,
      tenthObtainedMarks: 450,
      tenthPercentage: 90.0,
      twelfthBoard: 'State Board',
      twelfthPassingYear: 2022,
      twelfthTotalMarks: 600,
      twelfthObtainedMarks: 540,
      twelfthPercentage: 90.0,
      currentCgpa: 8.92,
      activeBacklogs: 0,
      ugDegree: 'B.E.',
      ugBranch: 'Computer Science and Engineering',
    }),
  });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Candidate Selection, Notification, and Tracking Test Suite', () => {
  let driveId: string;
  let testRegId: string;

  it('1. Admin creates a placement drive and eligible student receives notification', async () => {
    const driveRes = await fetch(`${baseUrl}/admin/placement-drives`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName: 'Microsoft Corporation',
        jobRole: 'Software Development Engineer',
        driveDate: '2026-12-10T10:00:00Z',
        registrationDeadline: '2026-12-05T23:59:59Z',
        packageDetails: '22 LPA CTC',
        location: 'Hyderabad / Bengaluru',
        vacancies: 15,
        minCgpa: 7.5,
        minTenthPercentage: 70.0,
        minTwelfthPercentage: 70.0,
        maxActiveBacklogs: 0,
        eligibleDepartments: ['CSE'],
      }),
    });
    assert.equal(driveRes.status, 201);
    const driveBody = await driveRes.json();
    driveId = driveBody.data.id;
    assert.ok(driveId);

    // Explicit notification trigger
    const notifyRes = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/notify-eligible`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(notifyRes.status, 200);
    const notifyBody = await notifyRes.json();
    assert.ok(notifyBody.data.notifiedCount >= 1);
  });

  it('2. Student views placement drives with personal eligibility and applied status', async () => {
    const res = await fetch(`${baseUrl}/student/placement-drives`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));

    const msftDrive = body.data.find((d: any) => d.drive.id === driveId);
    assert.ok(msftDrive);
    assert.equal(msftDrive.isEligible, true);
    assert.equal(msftDrive.isApplied, false);
  });

  it('3. Student applies directly to eligible drive through Student Portal', async () => {
    const res = await fetch(`${baseUrl}/student/placement-drives/${driveId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.currentStage, SelectionStage.REGISTERED);
    testRegId = body.data.id;
    assert.ok(testRegId);

    // Re-applying fails with 409 Conflict
    const dupRes = await fetch(`${baseUrl}/student/placement-drives/${driveId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(dupRes.status, 409);
  });

  it('4. Student checks notifications and confirms receipt of drive updates', async () => {
    const res = await fetch(`${baseUrl}/student/notifications`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.notifications.length > 0);
    assert.ok(body.data.unreadCount > 0);

    const firstNotif = body.data.notifications[0];

    // Mark single notification as read
    const readRes = await fetch(`${baseUrl}/student/notifications/${firstNotif.id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(readRes.status, 200);

    // Mark all as read
    const allReadRes = await fetch(`${baseUrl}/student/notifications/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert.equal(allReadRes.status, 200);
  });

  it('5. Admin views real-time drive statistics (Eligible, Applied, Selected, Rejected, Pending)', async () => {
    const res = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/stats`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.data.totalEligible >= 1);
    assert.equal(body.data.applied, 1);
    assert.equal(body.data.pending, 1);
    assert.equal(body.data.selected, 0);
    assert.equal(body.data.rejected, 0);
  });

  it('6. Admin updates candidate stage to SHORTLISTED and schedules interview', async () => {
    // Bulk stage update to ASSESSMENT_SHORTLISTED
    const bulkRes = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/bulk-stage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registrationIds: [testRegId],
        stage: SelectionStage.ASSESSMENT_SHORTLISTED,
        remarks: 'Cleared coding assessment with 95%',
      }),
    });
    assert.equal(bulkRes.status, 200);

    // Individual stage update to TECHNICAL_ROUND
    const indRes = await fetch(
      `${baseUrl}/admin/placement-drives/${driveId}/registrations/${testRegId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage: SelectionStage.TECHNICAL_ROUND,
          remarks: 'Technical interview scheduled for Dec 8 at 11:00 AM',
        }),
      }
    );
    assert.equal(indRes.status, 200);
    const indBody = await indRes.json();
    assert.equal(indBody.data.currentStage, SelectionStage.TECHNICAL_ROUND);
  });

  it('7. Admin finalizes selection process: unselected candidates are classified as REJECTED', async () => {
    // Candidate currently in TECHNICAL_ROUND, not SELECTED
    const finRes = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/finalize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(finRes.status, 200);
    const finBody = await finRes.json();
    assert.equal(finBody.data.rejectedCount, 1);
    assert.equal(finBody.data.selectedCount, 0);

    // Verify candidate is now REJECTED
    const regRes = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/registrations`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const regBody = await regRes.json();
    const candidate = regBody.data.find((r: any) => r.id === testRegId);
    assert.equal(candidate.currentStage, SelectionStage.REJECTED);
  });

  it('8. Candidate audit trail logs are retrieved with timestamps and remarks', async () => {
    const res = await fetch(`${baseUrl}/admin/placement-drives/${driveId}/audit-logs`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3); // REGISTERED -> SHORTLISTED -> TECHNICAL_ROUND -> REJECTED
    assert.ok(body.data[0].createdAt);
  });
});
