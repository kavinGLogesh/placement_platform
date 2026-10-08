import { prisma } from '../config/prisma.config.js';
import { verifyPassword } from '../utils/password.util.js';

async function testUser(email: string, pass: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log(`User ${email} NOT FOUND`);
    return;
  }
  const match = await verifyPassword(pass, user.passwordHash);
  console.log(`User: ${email} | Password: ${pass} | Valid: ${match} | Role: ${user.role}`);
}

async function main() {
  await testUser('superadmin@placement.edu', 'SuperAdmin@123');
  await testUser('placementadmin@placement.edu', 'PlacementAdmin@123');
  await testUser('student@placement.edu', 'Student@123');
}

main().finally(() => prisma.$disconnect());
