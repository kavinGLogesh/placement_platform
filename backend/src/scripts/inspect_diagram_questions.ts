import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';
import { QUESTIONS_UPLOAD_DIR } from '../utils/file-security.util.js';

async function main() {
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { imageUrl: { not: null } },
        { questionText: { contains: 'diagram' } },
        { questionText: { contains: 'tree' } },
        { questionText: { contains: 'figure' } },
      ],
    },
    select: {
      id: true,
      questionText: true,
      imageUrl: true,
      category: true,
      topic: true,
      questionType: true,
    },
  });

  console.log(`Found ${questions.length} questions matching query:`);
  for (const q of questions) {
    let fileInfo = 'No imageUrl';
    if (q.imageUrl) {
      const filename = path.basename(q.imageUrl.split('?')[0]);
      const fullPath = path.resolve(QUESTIONS_UPLOAD_DIR, filename);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        fileInfo = `File exists: ${filename} (${stats.size} bytes)`;
      } else {
        fileInfo = `FILE MISSING: ${filename} (path: ${fullPath})`;
      }
    }
    console.log({
      id: q.id,
      text: q.questionText,
      imageUrl: q.imageUrl,
      fileInfo,
    });
  }

  await prisma.$disconnect();
}

main().catch(console.error);
