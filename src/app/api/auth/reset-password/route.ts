import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ResetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
}).strict();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = ResetPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error.errors[0]?.message || 'Invalid request' },
                { status: 400 }
            );
        }

        const { token, password } = result.data;

        // Hash token to compare with stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid reset token
        const resetRecord = await prisma.passwordReset.findFirst({
            where: {
                token: tokenHash,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });

        if (!resetRecord) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user password
        await prisma.user.update({
            where: { id: resetRecord.userId },
            data: { passwordHash },
        });

        // Delete used reset token
        await prisma.passwordReset.delete({
            where: { id: resetRecord.id },
        });

        // Invalidate all existing sessions for security
        await prisma.userSession.deleteMany({
            where: { userId: resetRecord.userId },
        });

        await auditLog({
            action: 'PASSWORD_RESET_COMPLETED',
            userId: resetRecord.userId,
            details: { email: resetRecord.user.email },
        });

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. Please log in with your new password.',
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to reset password' },
            { status: 500 }
        );
    }
}
