// src/lib/utils/auditLogger.ts
// Comprehensive audit logging for compliance and security

import { prisma } from './database';

export interface AuditLogEntry {
    action: string;
    claimId?: string;
    userId?: string;
    agentId?: string;
    description?: string;
    details?: Record<string, any>;
    // Optional extras accepted for convenience by callers; persisted inside details if needed
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, any>;
    changes?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface PageViewLog {
    userAgent: string;
    ipAddress: string;
    timestamp: string;
}

export class AuditLogger {
    static logEvent: any;
    /**
     * Log an audit event to the database
     */
    static async log(entry: AuditLogEntry): Promise<void> {
        try {
            const changes: Record<string, any> = {};
            if (entry.details) changes.details = entry.details;
            if (entry.metadata) changes.metadata = entry.metadata;
            if (entry.changes) changes.changes = entry.changes;

            await prisma.auditLog.create({
                data: {
                    action: entry.action,
                    claimId: entry.claimId || undefined,
                    userId: entry.userId || undefined,
                    entityType: entry.entityType || 'SYSTEM',
                    entityId: entry.entityId || (entry.claimId ?? 'UNKNOWN'),
                    ipAddress: entry.ipAddress,
                    userAgent: entry.userAgent,
                } as any,
            });
        } catch (error) {
            console.error('Audit log failed:', error);
            // Fail silently to not disrupt main operations
        }
    }

    /**
     * Log a page view (analytics)
     */
    static async logPageView(entry: PageViewLog): Promise<void> {
        // In production, send to analytics service
        if (process.env.NODE_ENV === 'production') {
            console.log('[ANALYTICS] Page view:', entry);
        }
    }
}

/**
 * Convenience function for inline audit logging
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
    await AuditLogger.log(entry);
}

