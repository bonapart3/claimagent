import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function globalTeardown() {
  // Clean up test database
  if (process.env.NODE_ENV === 'test') {
    try {
      // Delete in order respecting foreign key constraints
      await prisma.$transaction([
        prisma.phaseCompletion.deleteMany(),
        prisma.assessment.deleteMany(),
        prisma.communication.deleteMany(),
        prisma.payment.deleteMany(),
        prisma.damage.deleteMany(),
        prisma.participant.deleteMany(),
        prisma.document.deleteMany(),
        prisma.auditLog.deleteMany(),
        prisma.claim.deleteMany(),
        prisma.vehicle.deleteMany(),
        prisma.policy.deleteMany(),
        prisma.userSession.deleteMany(),
        prisma.user.deleteMany(),
        prisma.fraudWatchlist.deleteMany(),
        prisma.valuationCache.deleteMany(),
        prisma.claimMetrics.deleteMany(),
      ]);
    } catch (error) {
      console.error('Error cleaning up test database:', error);
    } finally {
      await prisma.$disconnect();
    }
  }
}
