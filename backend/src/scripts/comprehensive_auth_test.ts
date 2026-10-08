const BASE_URL = 'http://localhost:5000/api';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, details: string) {
  results.push({
    suite,
    test,
    passed: condition,
    details,
  });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol} [${suite}] ${test}: ${details}`);
}

async function postJson(endpoint: string, data: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json: any = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function getJson(endpoint: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers,
  });
  const json: any = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING COMPREHENSIVE CAREER OS AUTHENTICATION TEST SUITE');
  console.log('================================================================\n');

  // 1. Health check
  const health = await getJson('/health');
  assert(health.status === 200, 'Health', 'API Server Health', `Status ${health.status}`);

  // 2. Student Login via Email
  const studentEmailRes = await postJson('/auth/login', {
    email: 'student@placement.edu',
    password: 'Student@123',
  });
  assert(
    studentEmailRes.status === 200 && studentEmailRes.json?.data?.user?.role === 'STUDENT',
    'Student Auth',
    'Login via Email',
    `Role: ${studentEmailRes.json?.data?.user?.role}`
  );
  const studentToken = studentEmailRes.json?.data?.accessToken;
  const studentRefreshToken = studentEmailRes.json?.data?.refreshToken;

  // 3. Student Login via Register Number
  const studentRegRes = await postJson('/auth/login', {
    email: '2026CS101',
    password: 'Student@123',
  });
  assert(
    studentRegRes.status === 200 && studentRegRes.json?.data?.user?.role === 'STUDENT',
    'Student Auth',
    'Login via Register Number (2026CS101)',
    `User: ${studentRegRes.json?.data?.user?.email}`
  );

  // 4. Student Protected Route Access
  const studentPortal = await getJson('/student/portal', studentToken);
  assert(
    studentPortal.status === 200,
    'Student RBAC',
    'Access /api/student/portal',
    `Status ${studentPortal.status}`
  );

  // 5. Student Access to Admin Route (Must be Forbidden 403)
  const studentAdminAccess = await getJson('/admin/overview', studentToken);
  assert(
    studentAdminAccess.status === 403,
    'Student RBAC',
    'Block /api/admin/overview for Student (403 Forbidden)',
    `Status ${studentAdminAccess.status} - Correctly Denied`
  );

  // 6. Placement Admin Login
  const placementRes = await postJson('/auth/login', {
    email: 'placementadmin@placement.edu',
    password: 'PlacementAdmin@123',
  });
  assert(
    placementRes.status === 200 && placementRes.json?.data?.user?.role === 'PLACEMENT_ADMIN',
    'Placement Admin Auth',
    'Login via Email',
    `Role: ${placementRes.json?.data?.user?.role}`
  );
  const placementToken = placementRes.json?.data?.accessToken;

  // 7. Placement Admin Access to Admin Overview
  const placementAdminOverview = await getJson('/admin/overview', placementToken);
  assert(
    placementAdminOverview.status === 200,
    'Placement Admin RBAC',
    'Access /api/admin/overview',
    `Status ${placementAdminOverview.status} - Authorized`
  );

  // 8. Placement Admin Access to Super Admin Route (Must be Forbidden 403)
  const placementSuperAdminAccess = await getJson('/admin/system', placementToken);
  assert(
    placementSuperAdminAccess.status === 403,
    'Placement Admin RBAC',
    'Block /api/admin/system for Placement Admin (403 Forbidden)',
    `Status ${placementSuperAdminAccess.status} - Correctly Denied`
  );

  // 9. Placement Admin Access to Student Route (Must be Forbidden 403)
  const placementStudentAccess = await getJson('/student/portal', placementToken);
  assert(
    placementStudentAccess.status === 403,
    'Placement Admin RBAC',
    'Block /api/student/portal for Placement Admin (403 Forbidden)',
    `Status ${placementStudentAccess.status} - Correctly Denied`
  );

  // 10. Super Admin Login
  const superAdminRes = await postJson('/auth/login', {
    email: 'superadmin@placement.edu',
    password: 'SuperAdmin@123',
  });
  assert(
    superAdminRes.status === 200 && superAdminRes.json?.data?.user?.role === 'SUPER_ADMIN',
    'Super Admin Auth',
    'Login via Email',
    `Role: ${superAdminRes.json?.data?.user?.role}`
  );
  const superAdminToken = superAdminRes.json?.data?.accessToken;

  // 11. Super Admin Access to Admin Overview
  const superAdminOverview = await getJson('/admin/overview', superAdminToken);
  assert(
    superAdminOverview.status === 200,
    'Super Admin RBAC',
    'Access /api/admin/overview',
    `Status ${superAdminOverview.status} - Authorized`
  );

  // 12. Super Admin Access to System Audit (/admin/system)
  const superAdminSystem = await getJson('/admin/system', superAdminToken);
  assert(
    superAdminSystem.status === 200,
    'Super Admin RBAC',
    'Access /api/admin/system',
    `Status ${superAdminSystem.status} - Authorized`
  );

  // 13. Invalid Password Handling
  const wrongPass = await postJson('/auth/login', {
    email: 'student@placement.edu',
    password: 'WrongPassword@123',
  });
  assert(
    wrongPass.status === 401 && wrongPass.json?.message?.includes('Invalid email or password'),
    'Error Handling',
    'Incorrect Password rejection',
    `Status ${wrongPass.status}: "${wrongPass.json?.message}"`
  );

  // 14. Unknown Account Handling
  const unknownUser = await postJson('/auth/login', {
    email: 'unknown.user@placement.edu',
    password: 'AnyPassword@123',
  });
  assert(
    unknownUser.status === 401 && unknownUser.json?.message?.includes('Invalid email or password'),
    'Error Handling',
    'Unknown Account rejection',
    `Status ${unknownUser.status}: "${unknownUser.json?.message}"`
  );

  // 15. Token Refresh Endpoint
  const refreshRes = await postJson('/auth/refresh', {
    refreshToken: studentRefreshToken,
  });
  assert(
    refreshRes.status === 200 && !!refreshRes.json?.data?.accessToken,
    'Session Token',
    'Refresh Access Token',
    `New token issued: ${!!refreshRes.json?.data?.accessToken}`
  );

  // 16. Logout & Token Revocation
  const logoutRes = await postJson('/auth/logout', {
    refreshToken: studentRefreshToken,
  });
  assert(
    logoutRes.status === 200,
    'Session Token',
    'Logout and Token Revocation',
    `Status ${logoutRes.status} - Revoked`
  );

  console.log('\n================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
