import { prisma } from './prisma.config.js';
import { hashPassword } from '../utils/password.util.js';

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting Database Seeding for College Placement Assessment Platform...');

  // 1. Seed Users
  const superAdminHash = await hashPassword('SuperAdmin@123');
  const placementAdminHash = await hashPassword('PlacementAdmin@123');
  const studentHash = await hashPassword('Student@123');

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@placement.edu' },
    update: {},
    create: {
      id: 'usr-super-admin-001',
      email: 'superadmin@placement.edu',
      passwordHash: superAdminHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'placementadmin@placement.edu' },
    update: {},
    create: {
      id: 'usr-placement-admin-001',
      email: 'placementadmin@placement.edu',
      passwordHash: placementAdminHash,
      role: 'PLACEMENT_ADMIN',
      isActive: true,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: 'student@placement.edu' },
    update: {},
    create: {
      id: 'usr-student-001',
      email: 'student@placement.edu',
      passwordHash: studentHash,
      role: 'STUDENT',
      isActive: true,
    },
  });

  console.log('✅ Seeded Users: SuperAdmin, PlacementAdmin, Student');

  // 2. Seed College
  const college = await prisma.college.upsert({
    where: { code: 'KEC' },
    update: {},
    create: {
      id: 'col-001',
      code: 'KEC',
      name: 'Kongu Engineering College',
      address: 'Perundurai, Erode, Tamil Nadu 638060',
      website: 'https://kongu.ac.in',
      contactEmail: 'principal@kongu.ac.in',
      contactPhone: '04294-226555',
    },
  });

  // 3. Seed Departments
  const deptCSE = await prisma.department.upsert({
    where: { id: 'dept-001' },
    update: {},
    create: {
      id: 'dept-001',
      collegeId: college.id,
      code: 'CSE',
      name: 'Computer Science and Engineering',
    },
  });

  const deptECE = await prisma.department.upsert({
    where: { id: 'dept-002' },
    update: {},
    create: {
      id: 'dept-002',
      collegeId: college.id,
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
    },
  });

  // 4. Seed Courses
  const courseCSE = await prisma.course.upsert({
    where: { id: 'crs-001' },
    update: {},
    create: {
      id: 'crs-001',
      departmentId: deptCSE.id,
      code: 'BTECH-CSE',
      name: 'B.Tech in Computer Science and Engineering',
      durationYears: 4,
    },
  });

  const courseECE = await prisma.course.upsert({
    where: { id: 'crs-002' },
    update: {},
    create: {
      id: 'crs-002',
      departmentId: deptECE.id,
      code: 'BE-ECE',
      name: 'B.E. in Electronics and Communication Engineering',
      durationYears: 4,
    },
  });

  // 5. Seed Classes
  const classCSE = await prisma.class.upsert({
    where: { id: 'cls-001' },
    update: {},
    create: {
      id: 'cls-001',
      departmentId: deptCSE.id,
      courseId: courseCSE.id,
      batchYear: 2026,
      currentYear: 3,
      name: 'CSE 2022-2026 - Year 3',
    },
  });

  await prisma.class.upsert({
    where: { id: 'cls-002' },
    update: {},
    create: {
      id: 'cls-002',
      departmentId: deptECE.id,
      courseId: courseECE.id,
      batchYear: 2026,
      currentYear: 3,
      name: 'ECE 2022-2026 - Year 3',
    },
  });

  // 6. Seed Sections
  const secA = await prisma.section.upsert({
    where: { id: 'sec-001' },
    update: {},
    create: {
      id: 'sec-001',
      classId: classCSE.id,
      name: 'A',
    },
  });

  const secB = await prisma.section.upsert({
    where: { id: 'sec-002' },
    update: {},
    create: {
      id: 'sec-002',
      classId: classCSE.id,
      name: 'B',
    },
  });

  // 7. Seed Student Profile
  await prisma.student.upsert({
    where: { registerNumber: '2026CS101' },
    update: {},
    create: {
      id: 'stu-001',
      userId: studentUser.id,
      registerNumber: '2026CS101',
      name: 'Logeshwaran',
      collegeEmail: 'student@placement.edu',
      phone: '9876543210',
      departmentId: deptCSE.id,
      courseId: courseCSE.id,
      classId: classCSE.id,
      sectionId: secA.id,
      year: 3,
      cgpa: 8.92,
      status: 'ACTIVE',
    },
  });

  // Second student for filtering
  const studentUser2 = await prisma.user.upsert({
    where: { email: 'priya@placement.edu' },
    update: {},
    create: {
      id: 'usr-student-002',
      email: 'priya@placement.edu',
      passwordHash: studentHash,
      role: 'STUDENT',
      isActive: true,
    },
  });

  await prisma.student.upsert({
    where: { registerNumber: '2026CS102' },
    update: {},
    create: {
      id: 'stu-002',
      userId: studentUser2.id,
      registerNumber: '2026CS102',
      name: 'Priya Sharma',
      collegeEmail: 'priya@placement.edu',
      phone: '9876543211',
      departmentId: deptCSE.id,
      courseId: courseCSE.id,
      classId: classCSE.id,
      sectionId: secB.id,
      year: 3,
      cgpa: 9.15,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Seeded Hierarchy & Students: College, Departments, Courses, Classes, Sections, Students');

  // 8. Seed Questions
  await prisma.question.upsert({
    where: { id: 'q-sample-quant-001' },
    update: {},
    create: {
      id: 'q-sample-quant-001',
      category: 'QUANTITATIVE_APTITUDE',
      topic: 'Percentage',
      difficulty: 'EASY',
      questionType: 'SINGLE_CHOICE',
      questionText: 'What is 20% of 150?',
      marks: 2.0,
      negativeMarks: 0.5,
      correctAnswer: '30',
      explanation: '20% of 150 = (20/100) * 150 = 30',
      status: 'ACTIVE',
      createdById: superAdmin.id,
      options: {
        create: [
          { optionText: '25', optionOrder: 1, isCorrect: false },
          { optionText: '30', optionOrder: 2, isCorrect: true },
          { optionText: '35', optionOrder: 3, isCorrect: false },
          { optionText: '40', optionOrder: 4, isCorrect: false },
        ],
      },
    },
  });

  await prisma.question.upsert({
    where: { id: 'q-sample-logical-001' },
    update: {},
    create: {
      id: 'q-sample-logical-001',
      category: 'LOGICAL_REASONING',
      topic: 'Blood Relations',
      difficulty: 'MEDIUM',
      questionType: 'SINGLE_CHOICE',
      questionText: "Pointing to a photograph, a man said, 'I have no brother or sister but that man’s father is my father’s son.' Whose photograph was it?",
      marks: 2.0,
      negativeMarks: 0.5,
      correctAnswer: 'His son',
      explanation: "Since the speaker has no brothers or sisters, 'my father’s son' is the speaker himself. So, the man’s father is the speaker. Hence, the photograph is of his son.",
      status: 'ACTIVE',
      createdById: superAdmin.id,
      options: {
        create: [
          { optionText: 'His nephew', optionOrder: 1, isCorrect: false },
          { optionText: 'His father', optionOrder: 2, isCorrect: false },
          { optionText: 'His son', optionOrder: 3, isCorrect: true },
          { optionText: 'His own', optionOrder: 4, isCorrect: false },
        ],
      },
    },
  });

  await prisma.question.upsert({
    where: { id: 'q-sample-verbal-001' },
    update: {},
    create: {
      id: 'q-sample-verbal-001',
      category: 'VERBAL_ABILITY',
      topic: 'Reading Comprehension',
      difficulty: 'EASY',
      questionType: 'TRUE_FALSE',
      questionText: 'Active voice sentences are generally more concise and direct than passive voice sentences.',
      marks: 1.0,
      negativeMarks: 0.0,
      correctAnswer: 'True',
      explanation: 'Active voice highlights the doer of the action, making sentences clearer and more direct.',
      status: 'ACTIVE',
      createdById: superAdmin.id,
      options: {
        create: [
          { optionText: 'True', optionOrder: 1, isCorrect: true },
          { optionText: 'False', optionOrder: 2, isCorrect: false },
        ],
      },
    },
  });

  await prisma.question.upsert({
    where: { id: 'q-sample-coding-001' },
    update: {},
    create: {
      id: 'q-sample-coding-001',
      category: 'CODING',
      topic: 'Arrays',
      difficulty: 'EASY',
      questionType: 'DESCRIPTIVE',
      questionText: 'Two Sum\nGiven an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.',
      marks: 10.0,
      negativeMarks: 0.0,
      correctAnswer: JSON.stringify({
        title: 'Two Sum',
        description: 'Given an array of integers nums and an integer target, return indices of two numbers.',
        starterCode: {
          python: 'def two_sum():\n    pass\n',
        },
        testCases: [
          { index: 1, isSample: true, input: '2 7 11 15\n9', expectedOutput: '0 1', explanation: '2 + 7 = 9' },
          { index: 2, isSample: false, input: '3 2 4\n6', expectedOutput: '1 2' },
        ],
      }),
      explanation: 'Use a hash map to look up complements in O(N) time.',
      status: 'ACTIVE',
      createdById: superAdmin.id,
    },
  });

  console.log('✅ Seeded Questions: Quant, Logical, Verbal, Coding');
  console.log('🎉 Database seeding completed successfully.');
}

// Run directly if executed as script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('❌ Seeding failed:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
