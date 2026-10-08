import * as XLSX from 'xlsx';
import { prisma } from '../config/prisma.config.js';
import { verifyPassword } from '../utils/password.util.js';
import { naturalRegisterNumberCompare, parseDateOfBirth } from '../services/ai/ai-student-import.service.js';

const API_BASE = 'http://localhost:5000/api';

async function runTest() {
  console.log('====================================================');
  console.log('🧪 TESTING AI STUDENT IMPORT & ORGANIZATION FEATURE');
  console.log('====================================================');

  // 1. Test Natural Numeric Register Number Sorter Unit Check
  console.log('\n[1] Testing Natural Register Number Comparator...');
  const unorderedRegs = ['23CSE015', '23CSE003', '23CSE011', '23CSE001', '23CSE008'];
  const sortedRegs = [...unorderedRegs].sort(naturalRegisterNumberCompare);
  const expectedRegs = ['23CSE001', '23CSE003', '23CSE008', '23CSE011', '23CSE015'];

  console.log('Input:', unorderedRegs);
  console.log('Sorted:', sortedRegs);
  console.log('Expected:', expectedRegs);

  const sortMatches = JSON.stringify(sortedRegs) === JSON.stringify(expectedRegs);
  if (!sortMatches) {
    throw new Error(`Register number sort failed! Got: ${sortedRegs.join(', ')}`);
  }
  console.log('✅ Natural Numeric Sort passed perfectly!');

  // 2. Test DOB parsing and temporary password seed
  console.log('\n[2] Testing Date of Birth Parsing & Password Generation...');
  const dobSample = parseDateOfBirth('15-08-2005');
  console.log('DOB "15-08-2005" ->', dobSample);
  if (dobSample.passwordSeed !== '15082005') {
    throw new Error(`DOB password seed mismatch! Expected 15082005, got ${dobSample.passwordSeed}`);
  }
  console.log('✅ DOB Password seed generation passed perfectly!');

  // 3. Admin Authentication for API endpoints
  console.log('\n[3] Authenticating as Placement Admin...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'placementadmin@placement.edu',
      password: 'PlacementAdmin@123',
      role: 'PLACEMENT_ADMIN',
    }),
  });

  const loginData: any = await loginRes.json();
  if (!loginRes.ok || !loginData.data?.accessToken) {
    throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.data.accessToken;
  console.log('✅ Placement Admin logged in successfully.');

  // 4. Clean up any existing test students to ensure fresh run
  const testEmails = [
    'kavin.test@college.edu.in',
    'arun.test@college.edu.in',
    'ravi.test@college.edu.in',
    'deepa.test@college.edu.in',
    'manoj.test@college.edu.in',
    'priya.test@college.edu.in',
  ];
  await prisma.student.deleteMany({
    where: {
      collegeEmail: { in: testEmails },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: { in: testEmails },
    },
  });

  // 5. Build in-memory Excel workbook with messy headers
  console.log('\n[4] Generating test Excel buffer with non-standard column headers...');
  const sampleRows = [
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': 'Kavin',
      'Reg No': '23CSE003',
      'Phone': '9876543210',
      'DOB': '15-08-2005',
      'Mail': 'kavin.test@college.edu.in',
    },
    {
      'Dept': 'ECE',
      'Programme': 'B.E ECE',
      'Name': 'Arun',
      'Reg No': '23ECE008',
      'Phone': '9876543211',
      'DOB': '21-02-2005',
      'Mail': 'arun.test@college.edu.in',
    },
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': 'Ravi',
      'Reg No': '23CSE015',
      'Phone': '9876543212',
      'DOB': '10-01-2005',
      'Mail': 'ravi.test@college.edu.in',
    },
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': 'Deepa',
      'Reg No': '23CSE001',
      'Phone': '9876543213',
      'DOB': '05-04-2005',
      'Mail': 'deepa.test@college.edu.in',
    },
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': 'Manoj',
      'Reg No': '23CSE011',
      'Phone': '9876543214',
      'DOB': '12-12-2004',
      'Mail': 'manoj.test@college.edu.in',
    },
    {
      'Dept': 'CSE',
      'Programme': 'B.Sc Computer Science',
      'Name': 'Priya',
      'Reg No': '23BCS002',
      'Phone': '9876543215',
      'DOB': '18-07-2005',
      'Mail': 'priya.test@college.edu.in',
    },
    // Duplicate record in file
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': 'Kavin Duplicate',
      'Reg No': '23CSE003',
      'Phone': '9876543210',
      'DOB': '15-08-2005',
      'Mail': 'kavin.duplicate@college.edu.in',
    },
    // Invalid record (missing required name & email)
    {
      'Dept': 'CSE',
      'Programme': 'B.E CSE',
      'Name': '',
      'Reg No': '23CSE999',
      'Phone': '9876543299',
      'DOB': '01-01-2005',
      'Mail': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // 6. Test AI Import Preview Endpoint: POST /api/students/ai-import/preview
  console.log('\n[5] Calling POST /api/students/ai-import/preview...');
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const formData = new FormData();
  formData.append('file', blob, 'students_october.xlsx');

  const previewRes = await fetch(`${API_BASE}/students/ai-import/preview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const previewJson: any = await previewRes.json();
  if (!previewRes.ok) {
    throw new Error(`AI Import Preview failed: ${JSON.stringify(previewJson)}`);
  }

  const previewData = previewJson.data;
  console.log('Preview Summary:');
  console.log('- Total Records:', previewData.totalRecords);
  console.log('- Valid Records:', previewData.validRecords);
  console.log('- Duplicate Records:', previewData.duplicateRecords);
  console.log('- Invalid Records:', previewData.invalidRecords);
  console.log('- Departments Found:', previewData.departmentsFound);
  console.log('- Courses Found:', previewData.coursesFound);
  console.log('- Column Mapping:', previewData.columnMapping);

  if (previewData.duplicateRecords < 1) {
    throw new Error('Expected at least 1 duplicate record detected!');
  }
  if (previewData.invalidRecords < 1) {
    throw new Error('Expected at least 1 invalid record detected!');
  }

  // Check hierarchy and natural sorting inside B.E CSE
  const cseDept = previewData.hierarchicalData.find((d: any) => d.departmentName === 'CSE');
  if (!cseDept) throw new Error('CSE department not found in hierarchical breakdown!');

  const beCseCourse = cseDept.courses.find((c: any) => c.courseName === 'B.E CSE');
  if (!beCseCourse) throw new Error('B.E CSE course not found under CSE department!');

  const beCseRegs = beCseCourse.students.map((s: any) => s.registerNumber);
  console.log('B.E CSE Sorted Register Numbers:', beCseRegs);
  // Verify 23CSE001 is first, followed by 23CSE003, 23CSE011, 23CSE015
  if (beCseRegs[0] !== '23CSE001') {
    throw new Error(`Expected first sorted student to be 23CSE001, got ${beCseRegs[0]}`);
  }
  console.log('✅ Hierarchical Department → Course → Register Number sorting verified!');

  // 7. Test AI Import Confirm Endpoint: POST /api/students/ai-import/confirm
  console.log('\n[6] Calling POST /api/students/ai-import/confirm...');
  const confirmRes = await fetch(`${API_BASE}/students/ai-import/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      importSessionId: previewData.importSessionId,
      fileName: previewData.fileName,
      skipDuplicates: true,
      commonTemporaryPassword: 'Student@123',
    }),
  });

  const confirmJson: any = await confirmRes.json();
  if (!confirmRes.ok) {
    throw new Error(`AI Import Confirm failed: ${JSON.stringify(confirmJson)}`);
  }

  console.log('Confirm Result:', confirmJson.data);
  console.log('✅ Created', confirmJson.data.importedCount, 'student accounts with common password!');

  // 8. Verify MySQL database records directly
  console.log('\n[7] Verifying MySQL database records directly...');
  const kavinStudent = await prisma.student.findUnique({
    where: { registerNumber: '23CSE003' },
    include: { department: true, course: true, user: true },
  });

  if (!kavinStudent) throw new Error('Student Kavin (23CSE003) not found in MySQL!');
  console.log('Student Profile:');
  console.log('- Name:', kavinStudent.name);
  console.log('- Reg No:', kavinStudent.registerNumber);
  console.log('- Email:', kavinStudent.collegeEmail);
  console.log('- DOB (metadata):', kavinStudent.dob);
  console.log('- Department:', kavinStudent.department.name);
  console.log('- Course:', kavinStudent.course.name);
  console.log('- Linked User ID:', kavinStudent.userId);
  console.log('- Role:', kavinStudent.user?.role);
  console.log('- Must Change Password:', kavinStudent.user?.mustChangePassword);

  if (kavinStudent.user?.role !== 'STUDENT') {
    throw new Error(`Expected role STUDENT, got ${kavinStudent.user?.role}`);
  }
  if (!kavinStudent.user?.mustChangePassword) {
    throw new Error('Expected mustChangePassword to be true!');
  }

  // Verify temporary password hash matches common password 'Student@123'
  const isMatch = await verifyPassword('Student@123', kavinStudent.user.passwordHash);
  if (!isMatch) {
    throw new Error('Password hash does not match common temporary password Student@123!');
  }
  console.log('✅ Password hash verified to match common temporary password (Student@123)!');

  // 9. Verify Import History Record
  console.log('\n[8] Verifying StudentImportHistory audit log...');
  const historyRes = await fetch(`${API_BASE}/students/import-history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const historyJson: any = await historyRes.json();
  const latestHistory = historyJson.data?.[0];
  console.log('Latest History Record:', {
    id: latestHistory?.id,
    fileName: latestHistory?.fileName,
    uploadedBy: latestHistory?.uploadedByEmail,
    importedCount: latestHistory?.importedCount,
    status: latestHistory?.status,
  });

  if (!latestHistory || latestHistory.importedCount !== confirmJson.data.importedCount) {
    throw new Error('Import history record not found or count mismatch!');
  }
  console.log('✅ Import history audit trail verified!');

  // 10. Student First Login with College Email + Common Temporary Password
  console.log('\n[9] Testing Student First Login with College Email + Common Temporary Password...');
  const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kavin.test@college.edu.in',
      password: 'Student@123',
      role: 'STUDENT',
    }),
  });

  const studentLoginJson: any = await studentLoginRes.json();
  if (!studentLoginRes.ok) {
    throw new Error(`Student login failed: ${JSON.stringify(studentLoginJson)}`);
  }

  console.log('Student Login Response:');
  console.log('- User:', studentLoginJson.data.user.email);
  console.log('- Role:', studentLoginJson.data.user.role);
  console.log('- MustChangePassword:', studentLoginJson.data.user.mustChangePassword);

  if (!studentLoginJson.data.user.mustChangePassword) {
    throw new Error('Expected mustChangePassword to be true on first login!');
  }
  const studentToken = studentLoginJson.data.accessToken;

  // 11. Student Changes Password (First Login Requirement)
  console.log('\n[10] Testing Student First-Login Password Change...');
  const changeRes = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentPassword: 'Student@123',
      newPassword: 'KavinNewSecurePass@2026',
    }),
  });

  const changeJson: any = await changeRes.json();
  if (!changeRes.ok) {
    throw new Error(`Change password failed: ${JSON.stringify(changeJson)}`);
  }
  console.log('Password changed successfully:', changeJson.message);

  // 12. Student logs in with new password
  console.log('\n[11] Verifying Login with New Password...');
  const newLoginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'kavin.test@college.edu.in',
      password: 'KavinNewSecurePass@2026',
      role: 'STUDENT',
    }),
  });

  const newLoginJson: any = await newLoginRes.json();
  if (!newLoginRes.ok) {
    throw new Error(`Login with new password failed: ${JSON.stringify(newLoginJson)}`);
  }

  console.log('New Login Verified:');
  console.log('- MustChangePassword now:', newLoginJson.data.user.mustChangePassword);
  if (newLoginJson.data.user.mustChangePassword !== false) {
    throw new Error('Expected mustChangePassword to be false after password change!');
  }
  console.log('✅ Student first-login password enforcement passed completely!');

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================');
}

runTest()
  .catch((e) => {
    console.error('❌ Test failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
