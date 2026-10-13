import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma.config.js';
import { QUESTIONS_UPLOAD_DIR } from '../utils/file-security.util.js';

async function main() {
  console.log('=== Starting Diagram Images Repair & DB Linking ===');

  // 1. Overwrite dummy 70-byte PNGs with real Family Tree PNG
  const realFamilyTreeFile = 'qimg_1791468151839_291b15871ca4a5a586ea9e9f.png';
  const realFamilyTreePath = path.resolve(QUESTIONS_UPLOAD_DIR, realFamilyTreeFile);

  if (!fs.existsSync(realFamilyTreePath)) {
    throw new Error(`Real family tree image not found at ${realFamilyTreePath}`);
  }

  const familyTreeBuffer = fs.readFileSync(realFamilyTreePath);
  console.log(`Loaded authentic Family Tree diagram (${familyTreeBuffer.length} bytes).`);

  const dummyFilesToOverwrite = [
    'qimg_1791438717268_af163ccd227c0fbd99191d33.png',
    'qimg_1791467053539_32ee299c649664e7f7a589fc.png',
    'qimg_1791467092260_78b234d4a7741593fa4015b6.png',
  ];

  for (const dummy of dummyFilesToOverwrite) {
    const targetPath = path.resolve(QUESTIONS_UPLOAD_DIR, dummy);
    fs.writeFileSync(targetPath, familyTreeBuffer);
    console.log(`Overwrote dummy file ${dummy} with real Family Tree diagram (${familyTreeBuffer.length} bytes).`);
  }

  // 2. Map of 20 Diagrammatic Questions and their respective authentic images
  const topicImageMap: { topicSubstring: string; imageFile: string }[] = [
    { topicSubstring: 'Venn Diagram (Three Sets)', imageFile: 'qimg_1791468151803_d1761b41760a293137ef6c5a.png' },
    { topicSubstring: 'Venn Diagram (Two Sets with Universe)', imageFile: 'qimg_1791468151808_d9e2354b6f198053768e474b.png' },
    { topicSubstring: 'Counting Triangles', imageFile: 'qimg_1791468151813_a0bfb047ef772e4b18c10191.png' },
    { topicSubstring: 'Counting Squares', imageFile: 'qimg_1791468151817_3cbd2d3d4c01baa441592896.png' },
    { topicSubstring: 'Counting Rectangles', imageFile: 'qimg_1791468151822_8eb1d540727ba0112834e06a.png' },
    { topicSubstring: 'Figure Series (Dot Pattern)', imageFile: 'qimg_1791468151825_1e8b3d878b32afe1b578aed7.png' },
    { topicSubstring: 'Pattern Series (Rotation)', imageFile: 'qimg_1791468151830_845d6d8e392db77aa1f7a0f9.png' },
    { topicSubstring: 'Direction Sense', imageFile: 'qimg_1791468151834_963e541d2810533fd9f56fb6.png' },
    { topicSubstring: 'Blood Relation (Family Tree)', imageFile: 'qimg_1791468151839_291b15871ca4a5a586ea9e9f.png' },
    { topicSubstring: 'Circular Seating Arrangement', imageFile: 'qimg_1791468151845_78f9a44fb49c6925c5d75541.png' },
    { topicSubstring: 'Clock (Angle between Hands)', imageFile: 'qimg_1791468151850_30d810833de55d59dc6c5105.png' },
    { topicSubstring: 'Cube and Dice (Opposite Faces)', imageFile: 'qimg_1791468151854_934fc185614fce0c60550bfc.png' },
    { topicSubstring: 'Painted Cube (Cutting)', imageFile: 'qimg_1791468151856_eeb5c7d424aa76928be95259.png' },
    { topicSubstring: 'Number in Triangles', imageFile: 'qimg_1791468151862_04cbfecede05c2f7bd1d36b5.png' },
    { topicSubstring: 'Number Matrix', imageFile: 'qimg_1791468151865_d4ab5d545b8085d4293f8743.png' },
    { topicSubstring: 'Missing Number in Circles', imageFile: 'qimg_1791468151868_4567bb35fa17a6cf43059838.png' },
    { topicSubstring: 'Flowchart Logic', imageFile: 'qimg_1791468151871_552b08ac6cfddda92b5be9fb.png' },
    { topicSubstring: 'Syllogism using Venn Diagram', imageFile: 'qimg_1791468151875_01504423fc5c0e3e2a4324b1.png' },
    { topicSubstring: 'Paper Folding and Punching', imageFile: 'qimg_1791468151878_9fd00d60881b9bccab0566c8.png' },
    { topicSubstring: 'Bar Graph Reasoning', imageFile: 'qimg_1791468151881_b8ebbaad0dd2d50f70e08f6a.png' },
  ];

  for (const item of topicImageMap) {
    const imageUrl = `/api/questions/images/${item.imageFile}`;
    const updateResult = await prisma.question.updateMany({
      where: {
        questionText: { contains: item.topicSubstring },
      },
      data: {
        imageUrl,
      },
    });
    console.log(`Updated ${updateResult.count} question(s) for topic "${item.topicSubstring}" -> ${imageUrl}`);
  }

  // 3. Family tree specific question: "Based on the family tree diagram, person A is the grandfather of person D."
  const familyTreeQs = await prisma.question.updateMany({
    where: {
      questionText: { contains: 'family tree diagram, person A is the grandfather of person D' },
    },
    data: {
      imageUrl: `/api/questions/images/${realFamilyTreeFile}`,
    },
  });
  console.log(`Updated ${familyTreeQs.count} question(s) matching grandfather family tree query -> ${realFamilyTreeFile}`);

  console.log('=== Diagram Images Repair & DB Linking Complete ===');
  await prisma.$disconnect();
}

main().catch(console.error);
