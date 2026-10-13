import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';
import { QUESTIONS_UPLOAD_DIR } from '../utils/file-security.util.js';

async function main() {
  const files = fs.readdirSync(QUESTIONS_UPLOAD_DIR);
  console.log('All files in upload dir:');
  for (const f of files) {
    const size = fs.statSync(path.join(QUESTIONS_UPLOAD_DIR, f)).size;
    console.log(`- ${f}: ${size} bytes`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
