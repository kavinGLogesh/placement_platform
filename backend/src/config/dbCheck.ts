import { prisma, disconnectPrisma } from './prisma.config.js';

async function checkDatabaseConnection(): Promise<void> {
  console.log('🔄 Verifying MySQL Database Connection via Prisma...');
  try {
    const startTime = Date.now();
    // Run a raw ping query
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    console.log(`✅ Database connection successful! (Latency: ${latency}ms)`);
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

checkDatabaseConnection();
