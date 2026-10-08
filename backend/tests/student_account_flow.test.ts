import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { managementRepository } from '../src/repositories/management.repository.js';

let server: http.Server;
let baseUrl: string;
let placementAdminToken: string;
let testDeptId: string;
let testCourseId: string;
let testClassId: string;
let testSectionId: string;

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

  // Login as Placement Admin
  const adminRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
  });
  assert.strictEqual(adminRes.status, 200);
  const adminData = await adminRes.json();
  placementAdminToken = adminData.data.accessToken;

  // Retrieve or create academic hierarchy for test student
  const depts = await managementRepository.findDepartments();
  testDeptId = depts[0].id;
  const courses = await managementRepository.findCourses();
  const matchedCourse = courses.find((c) => c.departmentId === testDeptId) || courses[0];
  testCourseId = matchedCourse.id;
  const classes = await managementRepository.findClasses();
  const matchedClass = classes.find((cl) => cl.courseId === testCourseId) || classes[0];
  testClassId = matchedClass.id;
  const sections = await managementRepository.findSections();
  const matchedSection = sections.find((s) => s.classId === testClassId) || sections[0];
  testSectionId = matchedSection.id;
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Student Account Creation & First Login Flow', () => {
  let createdStudentId: string;
  let tempPassword: string;
  const testEmail = 'karthik.test@placement.edu';
  const testRegNo = '2026CS999';

  it('1. Admin registers new student -> creates Student record and linked User account', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: testRegNo,
        name: 'Karthik Raman',
        collegeEmail: testEmail,
        phone: '9876543210',
        departmentId: testDeptId,
        courseId: testCourseId,
        classId: testClassId,
        sectionId: testSectionId,
        year: 3,
        cgpa: 8.85,
      }),
    });

    assert.strictEqual(res.status, 201, 'Student creation must return 201 Created');
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.data.id, 'Must return created student id');
    assert.ok(body.data.userId, 'Must return linked userId');
    assert.ok(body.data.temporaryPassword, 'Must return temporary password to admin');
    assert.strictEqual(body.data.status, 'INACTIVE', 'New student must start with INACTIVE status (Pending Activation)');

    createdStudentId = body.data.id;
    tempPassword = body.data.temporaryPassword;
  });

  it('2. Duplicate register number is rejected with HTTP 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: testRegNo,
        name: 'Another Name',
        collegeEmail: 'another.email@placement.edu',
        departmentId: testDeptId,
        courseId: testCourseId,
        classId: testClassId,
        sectionId: testSectionId,
        year: 3,
      }),
    });

    assert.strictEqual(res.status, 409, 'Duplicate register number must return 409 Conflict');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  it('3. Duplicate college email is rejected with HTTP 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${placementAdminToken}`,
      },
      body: JSON.stringify({
        registerNumber: '2026CS998',
        name: 'Duplicate Email Test',
        collegeEmail: testEmail,
        departmentId: testDeptId,
        courseId: testCourseId,
        classId: testClassId,
        sectionId: testSectionId,
        year: 3,
      }),
    });

    assert.strictEqual(res.status, 409, 'Duplicate email must return 409 Conflict');
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  let studentAccessToken: string;

  it('4. Student logs in with temporary password -> flagged with mustChangePassword: true', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: tempPassword,
      }),
    });

    assert.strictEqual(res.status, 200, 'Login with temporary password must succeed');
    const body = await res.json();
    assert.strictEqual(body.data.user.role, 'STUDENT', 'User role must be STUDENT');
    assert.strictEqual(body.data.user.mustChangePassword, true, 'First-login user must have mustChangePassword=true');
    studentAccessToken = body.data.accessToken;
  });

  it('5. First-login: Setting identical password to temporary password is rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAccessToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: tempPassword,
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /same as current|temporary/i);
  });

  it('6. First-login: Setting weak password is rejected (HTTP 400)', async () => {
    const res = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAccessToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'weak',
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.match(body.message, /at least 8 characters/i);
  });

  const permanentPassword = 'Karthik#Secure2026!';

  it('7. First-login: Successfully sets valid permanent password (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAccessToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: permanentPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.match(body.message, /Password changed successfully/i);
  });

  it('8. Old temporary password is invalidated -> returns HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: tempPassword,
      }),
    });

    assert.strictEqual(res.status, 401, 'Old temporary password must no longer work');
  });

  it('9. Subsequent login with new password succeeds and mustChangePassword is false', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: permanentPassword,
      }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.user.mustChangePassword, false, 'mustChangePassword must now be false');
    assert.strictEqual(body.data.user.role, 'STUDENT');
    studentAccessToken = body.data.accessToken;
  });

  it('10. Activated student has access to own profile and dashboard', async () => {
    const profileRes = await fetch(`${baseUrl}/student/profile`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    assert.strictEqual(profileRes.status, 200);

    const ownRecordRes = await fetch(`${baseUrl}/students/${createdStudentId}`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    assert.strictEqual(ownRecordRes.status, 200);
  });

  it('11. Activated student is blocked from another student record (IDOR HTTP 403)', async () => {
    const res = await fetch(`${baseUrl}/students/stu-001`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  it('12. Activated student is blocked from admin modules (HTTP 403)', async () => {
    const qRes = await fetch(`${baseUrl}/questions`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    assert.strictEqual(qRes.status, 403);

    const aRes = await fetch(`${baseUrl}/assessments`, {
      headers: { Authorization: `Bearer ${studentAccessToken}` },
    });
    assert.strictEqual(aRes.status, 403);
  });

  it('13. Admin can reset student password -> issues new temporary password & resets mustChangePassword', async () => {
    const resetRes = await fetch(`${baseUrl}/students/${createdStudentId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });

    assert.strictEqual(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.ok(resetBody.data.temporaryPassword);
    const newTempPassword = resetBody.data.temporaryPassword;

    // Login with new temp password
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: newTempPassword }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginBody = await loginRes.json();
    assert.strictEqual(loginBody.data.user.mustChangePassword, true, 'Reset student must require password change again');
  });

  it('14. Unauthenticated change-password request returns HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'any', newPassword: 'any' }),
    });
    assert.strictEqual(res.status, 401);
  });
});
