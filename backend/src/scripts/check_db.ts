import { prisma } from '../config/prisma.config.js';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      student: {
        select: {
          registerNumber: true,
          status: true,
        },
      },
    },
  });

  console.log('--- USERS IN DATABASE ---');
  console.log('Count:', users.length);
  for (const u of users) {
    console.log(`Email: ${u.email} | Role: ${u.role} | Active: ${u.isActive} | RegNo: ${u.student?.registerNumber || 'N/A'}`);
  }

  const colleges = await prisma.college.findMany({
    include: {
      departments: {
        include: {
          courses: {
            include: {
              classes: {
                include: {
                  sections: true,
                },
              },
            },
          },
        },
      },
    },
  });
  console.log('--- COLLEGES & DEPARTMENTS ---');
  console.log(JSON.stringify(colleges, null, 2));
}

main()
  .catch((e) => console.error('Error querying DB:', e))
  .finally(() => prisma.$disconnect());
