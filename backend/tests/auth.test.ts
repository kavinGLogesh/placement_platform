import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { hashPassword, verifyPassword } from '../src/utils/password.util.js';
import { env } from '../src/config/env.config.js';

let server: http.Server;
let baseUrl: string;

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
});

after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe('Phase 2 — Password Hashing & Security Verification', () => {
  it('should securely hash password with bcrypt and verify correctly', async () => {
    const raw = 'SecurePassword123!';
    const hash = await hashPassword(raw);

    assert.notEqual(raw, hash, 'Password must never be plaintext');
    assert.match(hash, /^\$2[abxy]?\$\d+\$/, 'Hash must follow bcrypt structure');

    const isValid = await verifyPassword(raw, hash);
    assert.equal(isValid, true, 'Verification of correct password must pass');

    const isWrong = await verifyPassword('WrongPassword', hash);
    assert.equal(isWrong, false, 'Verification of incorrect password must fail');
  });
});

describe('Phase 2 — Authentication API (/api/auth)', () => {
  let superAdminRefreshToken: string;

  it('1. Valid login with correct credentials returns 200 and tokens', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@placement.edu',
        password: 'SuperAdmin@123',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.message, 'Login successful');
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.equal(body.data.user.email, 'superadmin@placement.edu');
    assert.equal(body.data.user.role, 'SUPER_ADMIN');

    superAdminRefreshToken = body.data.refreshToken;
  });

  it('2. Invalid password returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@placement.edu',
        password: 'IncorrectPassword999!',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Invalid email or password/i);
  });

  it('3. Unknown user email returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_user_9999@placement.edu',
        password: 'AnyPassword@123',
      }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Invalid email or password/i);
  });

  it('4. Missing credentials returns HTTP 400 Bad Request', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: '',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /required/i);
  });

  it('5. Expired access token returns HTTP 401', async () => {
    // Manually sign a token that expired 1 hour ago
    const expiredToken = jwt.sign(
      { sub: 'usr-super-admin-001', email: 'superadmin@placement.edu', role: 'SUPER_ADMIN' },
      env.JWT_SECRET,
      { expiresIn: '-1h' }
    );

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /expired/i);
  });

  it('6. Invalid token format or signature returns HTTP 401', async () => {
    const invalidSignatureToken = jwt.sign(
      { sub: 'usr-fake-001', email: 'hacker@placement.edu', role: 'SUPER_ADMIN' },
      'forged_secret_key_123'
    );

    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${invalidSignatureToken}` },
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /invalid/i);
  });

  it('7. Refresh token generates new access token and rotates', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: superAdminRefreshToken }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.refreshToken);
    assert.notEqual(body.data.refreshToken, superAdminRefreshToken, 'Token must rotate');

    // Update active refresh token
    superAdminRefreshToken = body.data.refreshToken;
  });

  it('8. Logout revokes refresh token so reuse returns 401', async () => {
    // Logout with current token
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: superAdminRefreshToken }),
    });

    assert.equal(logoutRes.status, 200);
    const logoutBody = await logoutRes.json();
    assert.equal(logoutBody.success, true);

    // Attempt to refresh with now-revoked token
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: superAdminRefreshToken }),
    });

    assert.equal(refreshRes.status, 401);
    const refreshBody = await refreshRes.json();
    assert.match(refreshBody.message, /revoked|invalid/i);
  });

  it('9. GET /api/auth/me returns current authenticated user profile', async () => {
    // Re-login to get fresh token
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@placement.edu',
        password: 'SuperAdmin@123',
      }),
    });
    const { data } = await loginRes.json();

    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });

    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.success, true);
    assert.equal(meBody.data.user.email, 'superadmin@placement.edu');
    assert.equal(meBody.data.user.role, 'SUPER_ADMIN');
  });
});

describe('Phase 2 — Role-Based Access Control (RBAC)', () => {
  let superAdminToken: string;
  let placementAdminToken: string;
  let studentToken: string;

  before(async () => {
    // Login as Super Admin
    const r1 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@placement.edu', password: 'SuperAdmin@123' }),
    });
    superAdminToken = (await r1.json()).data.accessToken;

    // Login as Placement Admin
    const r2 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'placementadmin@placement.edu', password: 'PlacementAdmin@123' }),
    });
    placementAdminToken = (await r2.json()).data.accessToken;

    // Login as Student
    const r3 = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@placement.edu', password: 'Student@123' }),
    });
    studentToken = (await r3.json()).data.accessToken;
  });

  it('10. Unauthorized request without token returns HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/admin/overview`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /unauthorized|missing/i);
  });

  it('11. Student attempting to access Admin endpoint returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Forbidden/i);
  });

  it('12. Placement Admin attempting Super Admin only endpoint returns HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/admin/system`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Forbidden/i);
  });

  it('13. Permitted admin accessing admin overview returns HTTP 200', async () => {
    // Super admin permitted
    const res1 = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.success, true);
    assert.equal(body1.data.scope, 'PLACEMENT_ADMINISTRATION');

    // Placement admin permitted
    const res2 = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${placementAdminToken}` },
    });
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
  });

  it('14. Student accessing Student Portal returns HTTP 200', async () => {
    const res = await fetch(`${baseUrl}/student/portal`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.scope, 'STUDENT_PORTAL');
  });
});
