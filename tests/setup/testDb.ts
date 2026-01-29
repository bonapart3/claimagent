import { PrismaClient } from '@prisma/client';

// Singleton test database client
let prisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.DEBUG_PRISMA ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

export async function cleanupTestData() {
  const db = getTestPrisma() as any;

  // Use optional chaining to handle models that may not exist in schema
  const deleteOps = [
    db.phaseCompletion?.deleteMany?.(),
    db.assessment?.deleteMany?.(),
    db.communication?.deleteMany?.(),
    db.payment?.deleteMany?.(),
    db.damage?.deleteMany?.(),
    db.participant?.deleteMany?.(),
    db.document?.deleteMany?.(),
    db.auditLog?.deleteMany?.(),
    db.claim?.deleteMany?.(),
    db.vehicle?.deleteMany?.(),
    db.policy?.deleteMany?.(),
    db.userSession?.deleteMany?.(),
    db.user?.deleteMany?.(),
    db.fraudWatchlist?.deleteMany?.(),
    db.valuationCache?.deleteMany?.(),
    db.claimMetric?.deleteMany?.(),
  ].filter(Boolean);
  await db.$transaction(deleteOps);
}

export async function disconnectTestDb() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
