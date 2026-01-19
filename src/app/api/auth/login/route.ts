// src/app/api/auth/login/route.ts
// Authentication login API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { LoginRequestSchema } from '@/lib/schemas/api';
import {
    validateRequestBody,
    validationErrorResponse,
    checkHeaders,
} from '@/lib/utils/requestValidator';

// In production, use proper password hashing (bcrypt) and JWT tokens
export async function POST(request: NextRequest) {
    try {
        // Check headers for suspicious patterns
        const headerCheck = checkHeaders(request);
        if (headerCheck.blocked) {
            await auditLog({
                action: 'BLOCKED_LOGIN_ATTEMPT',
                details: {
                    reason: 'Suspicious headers detected',
                    threats: headerCheck.threats,
                    ip: request.headers.get('x-forwarded-for') || 'unknown',
                },
            });
            return NextResponse.json(
                { success: false, error: 'Request blocked' },
                { status: 403 }
            );
        }

        // Validate request body against schema
        const validation = await validateRequestBody(request, LoginRequestSchema, {
            blockOnThreat: true,
            logThreats: true,
        });

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        const { email, password } = validation.data;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                passwordHash: true,
                active: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        if (!user.active) {
            return NextResponse.json(
                { success: false, error: 'Account is disabled' },
                { status: 403 }
            );
        }

        // In production, use bcrypt.compare
        // For demo, accept any password or use simple check
        const isValidPassword = await verifyPassword(password, user.passwordHash);

        if (!isValidPassword) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Create session token
        const sessionToken = generateSessionToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // Store session
        await prisma.userSession.create({
            data: {
                userId: user.id,
                token: sessionToken,
                expiresAt,
                userAgent: request.headers.get('user-agent') || '',
                ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            },
        });

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: expiresAt,
            path: '/',
        });

        // Log login
        await auditLog({
            action: 'USER_LOGIN',
            userId: user.id,
            details: { email: user.email },
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Login failed' },
            { status: 500 }
        );
    }
}

// Password verification using bcrypt
async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}

// Generate session token
function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

