// src/app/api/auth/logout/route.ts
// Authentication logout API

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('session')?.value;

        if (sessionToken) {
            // Find and delete session
            const session = await prisma.userSession.findFirst({
                where: { token: sessionToken },
                include: { user: { select: { id: true, email: true } } },
            });

            if (session) {
                await prisma.userSession.delete({
                    where: { id: session.id },
                });

                await auditLog({
                    action: 'USER_LOGOUT',
                    userId: session.user.id,
                    details: { email: session.user.email },
                });
            }
        }

        // Clear cookie
        cookieStore.delete('session');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Logout error:', error);
        // Still clear cookie even on error
        const cookieStore = await cookies();
        cookieStore.delete('session');

        return NextResponse.json({
            success: true,
            message: 'Logged out',
        });
    }
}

