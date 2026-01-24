// src/lib/db/index.ts
// Neon PostgreSQL Database Connection Utility
// ClaimAgent™ - Enterprise Claims Platform

import { neon, neonConfig, NeonQueryFunction } from '@neondatabase/serverless';

// Configure Neon for optimal performance
neonConfig.fetchConnectionCache = true;

// Connection singleton
let sql: NeonQueryFunction<boolean, boolean> | null = null;

/**
 * Get the Neon SQL client instance
 * Uses connection pooling for optimal serverless performance
 */
export function getDb(): NeonQueryFunction<boolean, boolean> {
    if (!sql) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        sql = neon(connectionString);
    }

    return sql;
}

/**
 * Execute a raw SQL query
 */
export async function query<T = unknown>(
    queryText: string,
    params?: unknown[]
): Promise<T[]> {
    const db = getDb();
    const result = await db(queryText, params);
    return result as T[];
}

/**
 * Execute a query and return the first result
 */
export async function queryOne<T = unknown>(
    queryText: string,
    params?: unknown[]
): Promise<T | null> {
    const results = await query<T>(queryText, params);
    return results[0] || null;
}

/**
 * Execute an insert and return the inserted row
 */
export async function insert<T = unknown>(
    table: string,
    data: Record<string, unknown>
): Promise<T> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const queryText = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
    `;

    const result = await query<T>(queryText, values);
    return result[0];
}

/**
 * Execute an update and return the updated row(s)
 */
export async function update<T = unknown>(
    table: string,
    data: Record<string, unknown>,
    whereClause: string,
    whereParams: unknown[] = []
): Promise<T[]> {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const setClause = columns
        .map((col, i) => `${col} = $${i + 1}`)
        .join(', ');

    // Adjust parameter indices for where clause
    const adjustedWhereClause = whereClause.replace(
        /\$(\d+)/g,
        (_, num) => `$${parseInt(num) + columns.length}`
    );

    const queryText = `
        UPDATE ${table}
        SET ${setClause}
        WHERE ${adjustedWhereClause}
        RETURNING *
    `;

    return query<T>(queryText, [...values, ...whereParams]);
}

/**
 * Execute a delete and return deleted row count
 */
export async function remove(
    table: string,
    whereClause: string,
    whereParams: unknown[] = []
): Promise<number> {
    const queryText = `
        DELETE FROM ${table}
        WHERE ${whereClause}
    `;

    const result = await query(queryText, whereParams);
    return Array.isArray(result) ? result.length : 0;
}

/**
 * Check database connection health
 */
export async function checkConnection(): Promise<boolean> {
    try {
        await query('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database connection check failed:', error);
        return false;
    }
}

/**
 * Execute a transaction
 * Note: Neon serverless doesn't support traditional transactions,
 * but we can use this for batch operations
 */
export async function transaction<T>(
    callback: (db: NeonQueryFunction<boolean, boolean>) => Promise<T>
): Promise<T> {
    const db = getDb();

    try {
        await db('BEGIN');
        const result = await callback(db);
        await db('COMMIT');
        return result;
    } catch (error) {
        await db('ROLLBACK');
        throw error;
    }
}

// Re-export types
export type { NeonQueryFunction };

// Default export
export default {
    getDb,
    query,
    queryOne,
    insert,
    update,
    remove,
    checkConnection,
    transaction,
};
