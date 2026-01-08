// src/lib/utils/database.ts
// Prisma database client and connection management

import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development
// to prevent exhausting the database connection limit
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('Database connection failed:', error);
        return false;
    }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
}

