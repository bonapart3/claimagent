import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { safeEmail } from '@/lib/schemas/api';
import { z } from 'zod';
import crypto from 'crypto';

const ForgotPasswordSchema = z.object({
    email: safeEmail,
}).strict();

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = ForgotPasswordSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: 'Invalid email address' },
                { status: 400 }
            );
        }

        const { email } = result.data;

        // Find user (don't reveal if user exists)
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (user && user.active) {
            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Store reset token
            await prisma.passwordReset.upsert({
                where: { userId: user.id },
                update: {
                    token: resetTokenHash,
                    expiresAt,
                },
                create: {
                    userId: user.id,
                    token: resetTokenHash,
                    expiresAt,
                },
            });

            await auditLog({
                action: 'PASSWORD_RESET_REQUESTED',
                userId: user.id,
                details: { email: user.email },
            });

            // In production, send email with reset link
            // For demo, log the token
            console.log(`Password reset link: /reset-password?token=${resetToken}`);
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.',
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
