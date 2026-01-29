// src/app/api/contact/route.ts
// Contact form submission - stores inquiry and optionally forwards via webhook

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/utils/database';
import { randomUUID } from 'crypto';

const ContactSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Invalid email address'),
    company: z.string().min(1, 'Company is required').max(200),
    claimsVolume: z.string().optional(),
    message: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const result = ContactSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Validation failed',
                    details: result.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                },
                { status: 400 }
            );
        }

        const data = result.data;

        // Store in audit log as a contact inquiry
        try {
            await prisma.auditLog.create({
                data: {
                    id: randomUUID(),
                    action: 'CONTACT_INQUIRY',
                    entityType: 'ContactForm',
                    entityId: randomUUID(),
                    actorType: 'USER',
                    details: {
                        name: data.name,
                        email: data.email,
                        company: data.company,
                        claimsVolume: data.claimsVolume,
                        message: data.message,
                        source: 'contact_page',
                        submittedAt: new Date().toISOString(),
                    },
                    ipAddress: request.headers.get('x-forwarded-for') || undefined,
                    userAgent: request.headers.get('user-agent') || undefined,
                },
            });
        } catch (dbError) {
            // Log but don't fail - the inquiry is still valuable even without DB storage
            console.error('[CONTACT_DB_ERROR]', dbError);
        }

        // Forward to webhook if configured
        const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
        if (webhookUrl) {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'contact_inquiry',
                        timestamp: new Date().toISOString(),
                        data: {
                            name: data.name,
                            email: data.email,
                            company: data.company,
                            claimsVolume: data.claimsVolume,
                            message: data.message,
                        },
                    }),
                });
            } catch (webhookError) {
                console.error('[CONTACT_WEBHOOK_ERROR]', webhookError);
            }
        }

        // Always log to server for reliability
        console.log('[CONTACT_INQUIRY]', JSON.stringify({
            name: data.name,
            email: data.email,
            company: data.company,
            claimsVolume: data.claimsVolume,
            timestamp: new Date().toISOString(),
        }));

        return NextResponse.json({
            success: true,
            message: 'Thank you for your inquiry. We will be in touch within 24 hours.',
        });
    } catch (error) {
        console.error('[CONTACT_ERROR]', error);
        return NextResponse.json(
            { success: false, error: 'Failed to submit inquiry' },
            { status: 500 }
        );
    }
}
