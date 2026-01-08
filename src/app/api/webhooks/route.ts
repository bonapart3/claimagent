// src/app/api/webhooks/route.ts
// Webhooks API for external integrations

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';

// Webhook event types
type WebhookEvent =
    | 'claim.created'
    | 'claim.updated'
    | 'claim.approved'
    | 'claim.rejected'
    | 'claim.paid'
    | 'document.uploaded'
    | 'fraud.detected'
    | 'payment.issued';

interface WebhookPayload {
    event: WebhookEvent;
    timestamp: string;
    data: Record<string, unknown>;
    signature?: string;
}

// POST - Receive incoming webhooks
export async function POST(request: NextRequest) {
    try {
        const signature = request.headers.get('x-webhook-signature');
        const webhookSource = request.headers.get('x-webhook-source');
        const body = await request.json() as WebhookPayload;

        // Validate webhook signature (in production, use proper HMAC validation)
        if (!validateSignature(body, signature)) {
            return NextResponse.json(
                { success: false, error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // Log webhook receipt
        await auditLog({
            claimId: body.data.claimId as string | null,
            action: 'WEBHOOK_RECEIVED',
            agentId: 'WEBHOOK_HANDLER',
            description: `Received webhook: ${body.event} from ${webhookSource}`,
            details: { event: body.event, source: webhookSource },
        });

        // Process webhook based on event type
        const result = await processWebhook(body, webhookSource || 'unknown');

        return NextResponse.json({
            success: true,
            processed: true,
            result,
        });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { success: false, error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}

// GET - Webhook endpoint verification
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const challenge = searchParams.get('challenge');

    // Echo challenge for webhook verification
    if (challenge) {
        return NextResponse.json({ challenge });
    }

    return NextResponse.json({
        status: 'active',
        version: '1.0',
        supportedEvents: [
            'claim.created',
            'claim.updated',
            'claim.approved',
            'claim.rejected',
            'claim.paid',
            'document.uploaded',
            'fraud.detected',
            'payment.issued',
        ],
    });
}

function validateSignature(payload: WebhookPayload, signature: string | null): boolean {
    // In production, implement proper HMAC signature validation
    // using a shared secret between systems
    if (!signature) return false;

    // For demo, accept any signature
    return true;
}

async function processWebhook(
    payload: WebhookPayload,
    source: string
): Promise<{ action: string; status: string }> {
    switch (source) {
        case 'payment-gateway':
            return processPaymentWebhook(payload);

        case 'fraud-service':
            return processFraudWebhook(payload);

        case 'document-service':
            return processDocumentWebhook(payload);

        default:
            return { action: 'queued', status: 'pending' };
    }
}

async function processPaymentWebhook(
    payload: WebhookPayload
): Promise<{ action: string; status: string }> {
    const { event, data } = payload;

    if (event === 'payment.issued') {
        // Update claim payment status
        const claimId = data.claimId as string;
        const paymentId = data.paymentId as string;
        const amount = data.amount as number;

        if (claimId) {
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    status: 'PAID',
                    paymentId,
                    paymentAmount: amount,
                    paidAt: new Date(),
                },
            });

            await auditLog({
                claimId,
                action: 'PAYMENT_CONFIRMED',
                agentId: 'WEBHOOK_HANDLER',
                description: `Payment confirmed: $${amount.toLocaleString()}`,
                details: { paymentId, amount },
            });
        }

        return { action: 'payment_recorded', status: 'complete' };
    }

    return { action: 'unknown_event', status: 'ignored' };
}

async function processFraudWebhook(
    payload: WebhookPayload
): Promise<{ action: string; status: string }> {
    const { event, data } = payload;

    if (event === 'fraud.detected') {
        const claimId = data.claimId as string;
        const fraudScore = data.score as number;
        const indicators = data.indicators as string[];

        if (claimId) {
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    fraudScore,
                    fraudIndicators: indicators,
                    status: fraudScore > 0.8 ? 'FLAGGED_FRAUD' : undefined,
                },
            });

            await auditLog({
                claimId,
                action: 'FRAUD_ALERT',
                agentId: 'EXTERNAL_FRAUD_SERVICE',
                description: `External fraud alert: ${(fraudScore * 100).toFixed(0)}% risk`,
                details: { fraudScore, indicators },
            });
        }

        return { action: 'fraud_recorded', status: 'complete' };
    }

    return { action: 'unknown_event', status: 'ignored' };
}

async function processDocumentWebhook(
    payload: WebhookPayload
): Promise<{ action: string; status: string }> {
    const { event, data } = payload;

    if (event === 'document.uploaded') {
        const documentId = data.documentId as string;
        const analysisResult = data.analysis as Record<string, unknown>;

        if (documentId) {
            await prisma.document.update({
                where: { id: documentId },
                data: {
                    status: 'ANALYZED',
                    analysisResult,
                    analyzedAt: new Date(),
                },
            });
        }

        return { action: 'document_analysis_recorded', status: 'complete' };
    }

    return { action: 'unknown_event', status: 'ignored' };
}

