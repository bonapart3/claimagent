// src/lib/utils/validation.ts
// Request validation and session management

import { NextRequest } from 'next/server';
import { prisma } from './database';

export interface Session {
    userId: string;
    email: string;
    role: string;
    canRead: boolean;
    canWrite: boolean;
    canAdmin: boolean;
}

/**
 * Validate session from request headers/cookies
 */
export async function validateSession(request: NextRequest): Promise<Session | null> {
    try {
        const authHeader = request.headers.get('authorization');
        const sessionCookie = request.cookies.get('session')?.value;

        const token = authHeader?.replace('Bearer ', '') || sessionCookie;

        if (!token) {
            return null;
        }

        // In production, verify JWT and look up session
        // For now, return a mock session for development
        if (process.env.NODE_ENV === 'development' && token === 'dev-token') {
            return {
                userId: 'dev-user-001',
                email: 'dev@claimagent.io',
                role: 'admin',
                canRead: true,
                canWrite: true,
                canAdmin: true,
            };
        }

        // Look up session in database
        const session = await prisma.session.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
            return null;
        }

        return {
            userId: session.userId,
            email: session.user.email,
            role: session.user.role,
            canRead: true,
            canWrite: ['admin', 'adjuster', 'claims_rep'].includes(session.user.role),
            canAdmin: session.user.role === 'admin',
        };
    } catch (error) {
        console.error('Session validation failed:', error);
        return null;
    }
}

/**
 * Validate required input fields
 */
export function validateInput(
    input: Record<string, any>,
    requiredFields: string[]
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of requiredFields) {
        if (input[field] === undefined || input[field] === null || input[field] === '') {
            errors.push(`${field} is required`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Validate VIN format
 */
export function validateVIN(vin: string): boolean {
    if (!vin || vin.length !== 17) return false;

    // VIN should not contain I, O, or Q
    if (/[IOQ]/i.test(vin)) return false;

    // VIN should be alphanumeric
    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) return false;

    return true;
}

/**
 * Validate policy number format
 */
export function validatePolicyNumber(policyNumber: string): boolean {
    if (!policyNumber) return false;
    return /^[A-Z0-9-]{6,20}$/i.test(policyNumber);
}

