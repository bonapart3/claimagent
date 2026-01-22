// src/lib/utils/database.ts
// Neon PostgreSQL database client and connection management
// Re-exports from the main db module for backwards compatibility

import db, {
    getDb,
    query,
    queryOne,
    insert,
    update,
    remove,
    checkConnection,
    transaction,
} from '@/lib/db';

// Import Prisma client for unified access
import { prisma as prismaClient } from '@/lib/prisma';

// Re-export all functions
export {
    getDb,
    query,
    queryOne,
    insert,
    update,
    remove,
    transaction,
};

// Re-export Prisma client
export const prisma = prismaClient;

// Backwards-compatible aliases
export const checkDatabaseConnection = checkConnection;

export async function disconnectDatabase(): Promise<void> {
    // Neon serverless doesn't require explicit disconnection
    // This is a no-op for backwards compatibility
    console.log('Neon serverless: No explicit disconnect required');
}

export default db;
