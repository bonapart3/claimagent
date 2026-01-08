// src/app/api/auth/me/route.ts
// Get current user API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;

        if (!sessionToken) {
            return NextResponse.json({
                success: false,
                error: 'Not authenticated',
            }, { status: 401 });
        }

        // Find valid session
        const session = await prisma.userSession.findFirst({
            where: {
                token: sessionToken,
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                        active: true,
                    },
                },
            },
        });

        if (!session) {
            // Clear invalid cookie
            cookieStore.delete('session');
            return NextResponse.json({
                success: false,
                error: 'Session expired',
            }, { status: 401 });
        }

        if (!session.user.active) {
            cookieStore.delete('session');
            return NextResponse.json({
                success: false,
                error: 'Account disabled',
            }, { status: 403 });
        }

        // Extend session if needed (sliding expiration)
        const now = new Date();
        const daysUntilExpiry = (session.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysUntilExpiry < 3) {
            const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await prisma.userSession.update({
                where: { id: session.id },
                data: { expiresAt: newExpiry },
            });

            cookieStore.set('session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                expires: newExpiry,
                path: '/',
            });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: session.user.id,
                email: session.user.email,
                name: `${session.user.firstName} ${session.user.lastName}`,
                role: session.user.role,
            },
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get user' },
            { status: 500 }
        );
    }
}

