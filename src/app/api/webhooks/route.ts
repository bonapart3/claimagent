// src/app/api/webhooks/route.ts
// Webhooks API for external integrations

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auditLog } from '@/lib/utils/auditLogger';
import { createHmac, timingSafeEqual } from 'crypto';

// Webhook secrets per source (should be in environment variables)
const WEBHOOK_SECRETS: Record<string, string> = {
    'payment-gateway': process.env.WEBHOOK_SECRET_PAYMENT || '',
    'fraud-service': process.env.WEBHOOK_SECRET_FRAUD || '',
    'document-service': process.env.WEBHOOK_SECRET_DOCUMENT || '',
};

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

        // Validate webhook signature using HMAC-SHA256
        if (!validateSignature(body, signature, webhookSource)) {
            return NextResponse.json(
                { success: false, error: 'Invalid signature' },
                { status: 401 }
            );
        }

        // Log webhook receipt
        await auditLog({
            claimId: body.data.claimId as string | undefined,
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

function validateSignature(
    payload: WebhookPayload,
    signature: string | null,
    source: string | null
): boolean {
    // Require signature
    if (!signature) return false;

    // Get secret for this webhook source
    const secret = source ? WEBHOOK_SECRETS[source] : null;

    // If no secret configured for this source, reject
    // SECURITY: Never allow unsigned webhooks in production
    if (!secret) {
        console.error(`[WEBHOOK] No secret configured for source: ${source}`);
        return false;
    }

    // Compute expected signature using HMAC-SHA256
    const payloadString = JSON.stringify(payload);
    const expectedSignature = createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    try {
        const signatureBuffer = Buffer.from(signature, 'hex');
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');

        if (signatureBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
        console.error('[WEBHOOK] Signature validation error:', error);
        return false;
    }
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
        const amount = data.amount as number;

        if (claimId) {
            // Update claim to PAYMENT_PROCESSING or CLOSED
            await prisma.claim.update({
                where: { id: claimId },
                data: {
                    status: 'PAYMENT_PROCESSING',
                    paidAmount: amount,
                    settledAt: new Date(),
                },
            });

            // Create/update settlement record
            await prisma.settlement.upsert({
                where: { claimId },
                create: {
                    claimId,
                    totalPaid: amount,
                    paymentMethod: 'ACH',
                    paymentStatus: 'COMPLETED',
                    paidAt: new Date(),
                },
                update: {
                    totalPaid: amount,
                    paymentStatus: 'COMPLETED',
                    paidAt: new Date(),
                },
            });

            await auditLog({
                claimId,
                action: 'PAYMENT_CONFIRMED',
                agentId: 'WEBHOOK_HANDLER',
                description: `Payment confirmed: $${amount.toLocaleString()}`,
                details: { amount },
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
            // Update claim with fraud score
            const updateData: Record<string, unknown> = {
                fraudScore: Math.round(fraudScore * 100), // Convert to 0-100 scale
            };

            // Escalate to SIU if high fraud score
            if (fraudScore > 0.8) {
                updateData.status = 'SUSPENDED';
                updateData.routingDecision = 'SIU_ESCALATION';
            }

            await prisma.claim.update({
                where: { id: claimId },
                data: updateData,
            });

            // Create fraud analysis record
            await prisma.fraudAnalysis.create({
                data: {
                    claimId,
                    overallScore: Math.round(fraudScore * 100),
                    riskLevel: fraudScore > 0.8 ? 'CRITICAL' : fraudScore > 0.5 ? 'HIGH' : 'MEDIUM',
                    flaggedReasons: indicators,
                    siuRecommendation: fraudScore > 0.8 ? 'Recommend SIU review' : null,
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
                    aiAnalysis: analysisResult as object,
                    ocrConfidence: analysisResult?.confidence as number | undefined,
                },
            });
        }

        return { action: 'document_analysis_recorded', status: 'complete' };
    }

    return { action: 'unknown_event', status: 'ignored' };
}
