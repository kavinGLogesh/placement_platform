import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';
import { QUESTIONS_UPLOAD_DIR } from '../utils/file-security.util.js';

async function main() {
  const artifactDir = 'C:\\Users\\logeshwaran\\.gemini\\antigravity-ide\\brain\\a59a4b97-632e-4e35-954e-fa89de578c71';
  
  // 1. Copy Binary Tree Image
  const binaryTreeSrc = path.join(artifactDir, 'binary_tree_diagram_1791796782353.jpg');
  const binaryTreeDest = path.join(QUESTIONS_UPLOAD_DIR, 'qimg_binary_tree_search.jpg');
  fs.copyFileSync(binaryTreeSrc, binaryTreeDest);
  console.log(`Copied binary tree image to ${binaryTreeDest} (${fs.statSync(binaryTreeDest).size} bytes)`);

  // 2. Copy Shaded Area Image
  const shadedAreaSrc = path.join(artifactDir, 'shaded_area_diagram_1791796804187.jpg');
  const shadedAreaDest = path.join(QUESTIONS_UPLOAD_DIR, 'qimg_shaded_area_geometry.jpg');
  fs.copyFileSync(shadedAreaSrc, shadedAreaDest);
  console.log(`Copied shaded area image to ${shadedAreaDest} (${fs.statSync(shadedAreaDest).size} bytes)`);

  // 3. Update questions in DB
  const updateBT = await prisma.question.updateMany({
    where: { questionText: { contains: 'binary tree' } },
    data: { imageUrl: '/api/questions/images/qimg_binary_tree_search.jpg' },
  });
  console.log(`Updated ${updateBT.count} Binary Tree questions to /api/questions/images/qimg_binary_tree_search.jpg`);

  const updateShaded = await prisma.question.updateMany({
    where: { questionText: { contains: 'shaded area' } },
    data: { imageUrl: '/api/questions/images/qimg_shaded_area_geometry.jpg' },
  });
  console.log(`Updated ${updateShaded.count} Shaded Area questions to /api/questions/images/qimg_shaded_area_geometry.jpg`);

  // Also, for pattern series rotation (if any question exists or was topic 7)
  const patternRotation = await prisma.question.findFirst({
    where: { OR: [{ questionText: { contains: 'Rotation' } }, { topic: { contains: 'Rotation' } }] },
  });
  if (patternRotation) {
    await prisma.question.update({
      where: { id: patternRotation.id },
      data: { imageUrl: '/api/questions/images/qimg_1791468151830_845d6d8e392db77aa1f7a0f9.png' },
    });
    console.log(`Updated Pattern Series (Rotation) question ${patternRotation.id}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
