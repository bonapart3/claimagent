import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalTeardown() {
  // Clean up test database
  if (process.env.NODE_ENV === 'test') {
    try {
      // Delete in order respecting foreign key constraints
      // Cast to any to bypass Prisma type checking for models that may not exist in schema
      const db = prisma as any;
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
      await prisma.$transaction(deleteOps);
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}
