import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { DriveStatus, SelectionStage } from '../src/types/placement-drive.types.js';

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

  // 1. Super Admin login
  const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
  });
  const adminBody = await adminLoginRes.json();
  superAdminToken = adminBody.data.accessToken;

  // 2. Student 1 login (stu-001, Aarav Sharma)
  const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
  });
  const studentBody = await studentLoginRes.json();
  studentToken = studentBody.data.accessToken;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Placement Drive Management & Student Skills Test Suite', () => {
  let createdDriveId: string;
  let addedSkillId: string;
  let testRegistrationId: string;

  // ===========================================================================
  // 1. STUDENT SELF-SERVICE SKILLS MANAGEMENT & ADMIN VIEWING
  // ===========================================================================
  describe('1. Student Skills Management', () => {
    it('1.1. Student can view their own skills in profile', async () => {
      const res = await fetch(`${baseUrl}/student/profile`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data.skills));
      assert.ok(body.data.skills.length > 0);
    });

    it('1.2. Student can retrieve their skills list via /api/student/skills', async () => {
      const res = await fetch(`${baseUrl}/student/skills`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
    });

    it('1.3. Student can add a new skill to their profile', async () => {
      const res = await fetch(`${baseUrl}/student/skills`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'TypeScript & Node.js',
          category: 'TECHNICAL',
          level: 'INTERMEDIATE',
        }),
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.name, 'TypeScript & Node.js');
      assert.equal(body.data.level, 'INTERMEDIATE');
      addedSkillId = body.data.id;
    });

    it('1.4. Rejects adding duplicate skill for the same student (HTTP 409)', async () => {
      const res = await fetch(`${baseUrl}/student/skills`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'TypeScript & Node.js',
          category: 'TECHNICAL',
          level: 'BEGINNER',
        }),
      });
      assert.equal(res.status, 409);
    });

    it('1.5. Student can edit an existing skill proficiency level', async () => {
      const res = await fetch(`${baseUrl}/student/skills/${addedSkillId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'TypeScript & Node.js',
          category: 'TECHNICAL',
          level: 'ADVANCED',
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.level, 'ADVANCED');
    });

    it('1.6. Admin can view student skills via admin student directory', async () => {
      const res = await fetch(`${baseUrl}/students/stu-001/skills`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
      const hasAdded = body.data.some((s: any) => s.id === addedSkillId);
      assert.ok(hasAdded);
    });

    it('1.7. Student can delete a skill from their profile', async () => {
      const res = await fetch(`${baseUrl}/student/skills/${addedSkillId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 200);

      // Verify deletion
      const checkRes = await fetch(`${baseUrl}/student/skills`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const checkBody = await checkRes.json();
      const stillExists = checkBody.data.some((s: any) => s.id === addedSkillId);
      assert.equal(stillExists, false);
    });
  });

  // ===========================================================================
  // 2. ADMIN PLACEMENT DRIVE CRUD & CONFIGURATION
  // ===========================================================================
  describe('2. Admin Placement Drive CRUD', () => {
    it('2.1. Admin creates a company-specific placement drive with eligibility criteria', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Amazon Development Centre',
          jobRole: 'Software Development Engineer I',
          jobDescription: 'Full-time software engineering role working on scalable cloud architectures.',
          location: 'Bengaluru / Hyderabad',
          packageDetails: '28 LPA CTC',
          vacancies: 15,
          driveDate: '2026-11-20T09:00:00Z',
          registrationDeadline: '2026-11-15T23:59:59Z',
          status: DriveStatus.UPCOMING,
          minTenthPercentage: 75.0,
          minTwelfthPercentage: 75.0,
          minCgpa: 8.0,
          maxActiveBacklogs: 0,
          eligibleDepartments: ['CSE', 'dept-001'],
          eligibleBatchYears: [2026],
          requiredSkills: [
            { name: 'Python Programming', minLevel: 'INTERMEDIATE' },
            { name: 'Data Structures & Algorithms', minLevel: 'INTERMEDIATE' },
          ],
          selectionProcess: [
            'Online Coding Assessment',
            'Technical Interview Round 1',
            'Technical Interview Round 2',
            'Bar Raiser & HR Round',
          ],
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.ok(body.data.id);
      assert.equal(body.data.companyName, 'Amazon Development Centre');
      assert.equal(body.data.minCgpa, 8.0);
      assert.equal(body.data.minTenthPercentage, 75.0);
      createdDriveId = body.data.id;
    });

    it('2.2. Validates registration deadline cannot be after drive date (HTTP 400)', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Test Tech',
          jobRole: 'Analyst',
          driveDate: '2026-11-10T09:00:00Z',
          registrationDeadline: '2026-11-15T23:59:59Z', // After drive date
        }),
      });
      assert.equal(res.status, 400);
    });

    it('2.3. Admin lists placement drives with filters', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives?status=UPCOMING`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
      const found = body.data.some((d: any) => d.id === createdDriveId);
      assert.ok(found);
    });

    it('2.4. Admin retrieves drive details by ID', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.id, createdDriveId);
      assert.equal(body.data.companyName, 'Amazon Development Centre');
    });

    it('2.5. Admin edits drive criteria', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageDetails: '32 LPA CTC',
          vacancies: 20,
        }),
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.packageDetails, '32 LPA CTC');
      assert.equal(body.data.vacancies, 20);
    });
  });

  // ===========================================================================
  // 3. AUTOMATIC STUDENT ELIGIBILITY CHECKING & MISSING DATA HANDLING
  // ===========================================================================
  describe('3. Automatic Student Eligibility Checking', () => {
    before(async () => {
      // Configure student 1 (Aarav, stu-001) with full academic record meeting Amazon criteria
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
          tenthObtainedMarks: 450, // 90% (>= 75%)
          tenthPercentage: 90.0,
          twelfthBoard: 'State Board',
          twelfthPassingYear: 2022,
          twelfthTotalMarks: 600,
          twelfthObtainedMarks: 540, // 90% (>= 75%)
          twelfthPercentage: 90.0,
          currentCgpa: 8.92, // (>= 8.0)
          activeBacklogs: 0, // (<= 0)
          ugDegree: 'B.E.',
          ugBranch: 'Computer Science and Engineering',
        }),
      });
    });

    it('3.1. Accurately evaluates eligible student meeting all academic, department, and skill criteria', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/eligibility`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();

      assert.ok(body.data.totalStudentsEvaluated >= 2);
      const aarav = body.data.students.find((s: any) => s.studentId === 'stu-001');
      assert.ok(aarav);
      assert.equal(aarav.category, 'ELIGIBLE');
      assert.equal(aarav.isEligible, true);
      assert.equal(aarav.failureReasons.length, 0);
      assert.equal(aarav.missingDetails.length, 0);
    });

    it('3.2. Student with missing academic details is marked MISSING_DATA and NEVER marked ELIGIBLE', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/eligibility`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      assert.equal(res.status, 200);
      const body = await res.json();

      // stu-002 has no academic record configured
      const stu2 = body.data.students.find((s: any) => s.studentId === 'stu-002');
      assert.ok(stu2);
      assert.equal(stu2.category, 'MISSING_DATA');
      assert.equal(stu2.isEligible, false);
      assert.ok(stu2.missingDetails.length > 0);
      assert.ok(
        stu2.missingDetails.some((d: string) => d.includes('10th') || d.includes('12th'))
      );
    });

    it('3.3. Student failing specific criteria (e.g. higher CGPA requirement) is marked NOT_ELIGIBLE with clear failure reason', async () => {
      // Create a high-threshold drive requiring 9.5 CGPA
      const driveRes = await fetch(`${baseUrl}/admin/placement-drives`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Google Research',
          jobRole: 'AI Research Scientist',
          driveDate: '2026-12-01T09:00:00Z',
          registrationDeadline: '2026-11-28T23:59:59Z',
          minCgpa: 9.5, // Aarav has 8.92, so fails this
          minTenthPercentage: 75.0,
          minTwelfthPercentage: 75.0,
          eligibleDepartments: ['CSE'],
        }),
      });
      const driveBody = await driveRes.json();
      const highCgpaDriveId = driveBody.data.id;

      const evalRes = await fetch(`${baseUrl}/admin/placement-drives/${highCgpaDriveId}/eligibility`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const evalBody = await evalRes.json();

      const aarav = evalBody.data.students.find((s: any) => s.studentId === 'stu-001');
      assert.ok(aarav);
      assert.equal(aarav.category, 'NOT_ELIGIBLE');
      assert.equal(aarav.isEligible, false);
      assert.ok(
        aarav.failureReasons.some((r: string) => r.includes('CGPA') && r.includes('below minimum'))
      );
    });

    it('3.4. Student failing required skills or proficiency level is marked NOT_ELIGIBLE with skill reason', async () => {
      // Create a drive requiring a specialized skill that student does not possess
      const skillDriveRes = await fetch(`${baseUrl}/admin/placement-drives`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: 'Rust Embedded Labs',
          jobRole: 'Systems Engineer',
          driveDate: '2026-12-05T09:00:00Z',
          registrationDeadline: '2026-12-01T23:59:59Z',
          minCgpa: 7.0,
          minTenthPercentage: 70.0,
          minTwelfthPercentage: 70.0,
          eligibleDepartments: ['CSE'],
          requiredSkills: [
            { name: 'Rust Embedded Programming', minLevel: 'PROFICIENT' },
          ],
        }),
      });
      const skillDriveBody = await skillDriveRes.json();
      const rustDriveId = skillDriveBody.data.id;

      const evalRes = await fetch(`${baseUrl}/admin/placement-drives/${rustDriveId}/eligibility`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });
      const evalBody = await evalRes.json();

      const aarav = evalBody.data.students.find((s: any) => s.studentId === 'stu-001');
      assert.ok(aarav);
      assert.equal(aarav.category, 'NOT_ELIGIBLE');
      assert.ok(
        aarav.failureReasons.some(
          (r: string) => r.includes('Missing required skill') && r.includes('Rust')
        )
      );
    });
  });

  // ===========================================================================
  // 4. ADMIN STUDENT SELECTION & STAGE TRACKING
  // ===========================================================================
  describe('4. Admin Student Selection & Recruitment Stages', () => {
    it('4.1. Admin can register eligible student for the placement drive', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: ['stu-001'],
          remarks: 'Shortlisted based on CGPA and advanced Python skills',
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.registeredCount, 1);
      assert.ok(body.data.registrations.length === 1);
      testRegistrationId = body.data.registrations[0].id;
      assert.equal(body.data.registrations[0].currentStage, SelectionStage.REGISTERED);
    });

    it('4.2. Prevents duplicate registration for the same student on the same drive', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${superAdminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: ['stu-001'],
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.data.registeredCount, 0);
      assert.equal(body.data.duplicateCount, 1);
    });

    it('4.3. Admin lists registered candidates for the drive', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/registrations`, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
      assert.equal(body.data[0].studentId, 'stu-001');
    });

    it('4.4. Admin tracks and updates candidate recruitment stage', async () => {
      const res = await fetch(
        `${baseUrl}/admin/placement-drives/${createdDriveId}/registrations/${testRegistrationId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${superAdminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stage: SelectionStage.SELECTED,
            remarks: 'Cleared all 4 rounds with outstanding performance. Selected for SDE-1.',
          }),
        }
      );

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.data.currentStage, SelectionStage.SELECTED);
      assert.ok(body.data.stageRemarks.includes('Selected for SDE-1'));
    });

    it('4.5. Admin views drive-wise student selection history', async () => {
      const res = await fetch(
        `${baseUrl}/admin/placement-drives/students/stu-001/history`,
        {
          headers: { Authorization: `Bearer ${superAdminToken}` },
        }
      );

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.ok(Array.isArray(body.data));
      assert.ok(body.data.length >= 1);
      const found = body.data.some(
        (r: any) => r.driveId === createdDriveId && r.currentStage === SelectionStage.SELECTED
      );
      assert.ok(found);
    });
  });

  // ===========================================================================
  // 5. STRICT STUDENT PORTAL RESTRICTION (RBAC SECURITY)
  // ===========================================================================
  describe('5. Strict Student Portal Restriction (RBAC Security)', () => {
    it('5.1. Non-admin student is strictly forbidden from listing placement drives (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('5.2. Non-admin student is strictly forbidden from viewing drive eligibility details (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/eligibility`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      assert.equal(res.status, 403);
    });

    it('5.3. Non-admin student is strictly forbidden from registering students for drives (HTTP 403)', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives/${createdDriveId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${studentToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentIds: ['stu-001'] }),
      });
      assert.equal(res.status, 403);
    });

    it('5.4. Unauthenticated request is rejected (HTTP 401)', async () => {
      const res = await fetch(`${baseUrl}/admin/placement-drives`);
      assert.equal(res.status, 401);
    });
  });
});
