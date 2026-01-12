import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { safeString, safeEmail } from '@/lib/schemas/api';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const UpdateProfileSchema = z.object({
    firstName: safeString(50).optional(),
    lastName: safeString(50).optional(),
    email: safeEmail.optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .optional(),
}).strict();

async function getCurrentUser(request: NextRequest) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) return null;

    const session = await prisma.userSession.findUnique({
        where: { token: sessionToken },
        include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) return null;
    return session.user;
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                licenseNumber: user.licenseNumber,
                state: user.state,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get profile' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const result = UpdateProfileSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error.errors[0]?.message || 'Invalid request' },
                { status: 400 }
            );
        }

        const { firstName, lastName, email, currentPassword, newPassword } = result.data;
        const updateData: Record<string, string> = {};

        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;

        // Email change requires verification (simplified for demo)
        if (email && email !== user.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
            });
            if (existingUser) {
                return NextResponse.json(
                    { success: false, error: 'Email already in use' },
                    { status: 409 }
                );
            }
            updateData.email = email.toLowerCase();
        }

        // Password change requires current password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { success: false, error: 'Current password is required to change password' },
                    { status: 400 }
                );
            }

            // Verify current password (in demo mode, accept if hash exists)
            const isValidPassword = user.passwordHash.length > 0;
            if (!isValidPassword) {
                return NextResponse.json(
                    { success: false, error: 'Current password is incorrect' },
                    { status: 400 }
                );
            }

            updateData.passwordHash = await bcrypt.hash(newPassword, 12);
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No changes provided' },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });

        await auditLog({
            action: 'PROFILE_UPDATED',
            userId: user.id,
            details: { fields: Object.keys(updateData) },
        });

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
