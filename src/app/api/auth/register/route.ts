import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { RegisterRequestSchema } from '@/lib/schemas/api';
import { validateRequestBody, validationErrorResponse } from '@/lib/utils/requestValidator';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const validation = await validateRequestBody(request, RegisterRequestSchema, {
            blockOnThreat: true,
            logThreats: true,
        });

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        const { email, password, firstName, lastName } = validation.data;

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user with default role ADJUSTER
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                firstName,
                lastName,
                passwordHash,
                role: 'ADJUSTER', // Default role for self-registration
                active: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
            },
        });

        await auditLog({
            action: 'USER_REGISTERED',
            userId: user.id,
            details: { email: user.email },
        });

        return NextResponse.json({
            success: true,
            message: 'Account created successfully',
            user: {
                id: user.id,
                email: user.email,
                name: `${user.firstName} ${user.lastName}`,
                role: user.role,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { success: false, error: 'Registration failed' },
            { status: 500 }
        );
    }
}
