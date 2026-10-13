import { prisma } from '../config/prisma.config.js';

async function main() {
  const topics = [
    'Venn Diagram (Three Sets)',
    'Venn Diagram (Two Sets with Universe)',
    'Counting Triangles',
    'Counting Squares',
    'Counting Rectangles',
    'Figure Series (Dot Pattern)',
    'Pattern Series (Rotation)',
    'Direction Sense',
    'Blood Relation (Family Tree)',
    'Circular Seating Arrangement',
    'Clock (Angle between Hands)',
    'Cube and Dice (Opposite Faces)',
    'Painted Cube (Cutting)',
    'Number in Triangles',
    'Number Matrix',
    'Missing Number in Circles',
    'Flowchart Logic',
    'Syllogism using Venn Diagram',
    'Paper Folding and Punching',
    'Bar Graph Reasoning',
  ];

  console.log('Searching for the 20 diagrammatic questions in DB:');
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const qs = await prisma.question.findMany({
      where: {
        questionText: { contains: topic },
      },
      select: {
        id: true,
        questionText: true,
        imageUrl: true,
        category: true,
      },
    });

    console.log(`[Q${i + 1}] Topic: "${topic}" -> Found ${qs.length} question(s):`);
    for (const q of qs) {
      console.log(`   ID: ${q.id}, ImageUrl: ${q.imageUrl}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
