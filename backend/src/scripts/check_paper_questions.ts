import { prisma } from '../config/prisma.config.js';

async function main() {
  const paper = await prisma.assessmentPaper.findUnique({
    where: { id: 'paper-1791793344132-1-zx6s' },
    include: {
      questions: {
        include: {
          question: {
            include: { options: true },
          },
        },
        orderBy: { questionOrder: 'asc' },
      },
    },
  });

  if (!paper) {
    console.log('Paper not found!');
    return;
  }

  console.log(`Paper ${paper.paperCode} has ${paper.questions.length} questions:`);
  for (const q of paper.questions) {
    console.log(`[Q${q.questionOrder}] (ID: ${q.id}, QID: ${q.questionId}) type: ${q.question.questionType}`);
    console.log(`Text: ${q.question.questionText}`);
    console.log(`ImageUrl: ${q.question.imageUrl}`);
    console.log('---');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
