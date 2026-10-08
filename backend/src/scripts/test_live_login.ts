async function testLogin(identifier: string, pass: string) {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: identifier, password: pass }),
    });
    const data = (await res.json()) as any;
    console.log(`[TEST] User: ${identifier} | Status: ${res.status} | Success: ${data.success} | Role: ${data.data?.user?.role || 'N/A'} | Msg: ${data.message || ''}`);
  } catch (err: any) {
    console.error(`[ERROR] User: ${identifier} ->`, err.message);
  }
}

async function main() {
  console.log('--- TESTING LIVE BACKEND AUTHENTICATION ---');
  await testLogin('student@placement.edu', 'Student@123');
  await testLogin('placementadmin@placement.edu', 'PlacementAdmin@123');
  await testLogin('superadmin@placement.edu', 'SuperAdmin@123');
  await testLogin('2026CS101', 'Student@123');
  await testLogin('student@placement.edu', 'WrongPass@123');
  await testLogin('notfound@placement.edu', 'SomePass@123');
}

main();
