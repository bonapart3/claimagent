
import { NextRequest, NextResponse } from 'next/server';
import { ClaimStatus } from '@prisma/client';
import { z } from 'zod';
import { validateSession } from '@/lib/utils/validation';
import { auditLog } from '@/lib/utils/auditLogger';
import { prisma } from '@/lib/utils/database';

// Using shared prisma client

const StatusUpdateSchema = z.object({
    status: z.nativeEnum(ClaimStatus),
    reason: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/claims/[id]/status
 * Update claim status and trigger appropriate agent workflows
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: claimId } = params;
        const body = await request.json();
        const { status, reason, metadata } = StatusUpdateSchema.parse(body);

        // Fetch claim
        const claim = await prisma.claim.findUnique({ where: { id: claimId } });

        if (!claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        // Previous status
        const previousStatus = claim.status;

        // Update claim status
        const updatedClaim = await prisma.claim.update({
            where: { id: claimId },
            data: {
                status,
                updatedAt: new Date(),
                ...(status === ClaimStatus.ACKNOWLEDGED && { acknowledgedAt: new Date() }),
                ...(status === ClaimStatus.CLOSED && { closedAt: new Date() }),
            },
        });

        // Audit log
        await auditLog({
            userId: session.userId,
            action: 'STATUS_CHANGED',
            claimId,
            details: { from: previousStatus, to: status, reason, metadata },
        });

        return NextResponse.json({
            success: true,
            claim: updatedClaim,
            previousStatus,
            newStatus: status,
            workflowTriggered: false,
            workflowResult: null,
        });

    } catch (error) {
        console.error('[STATUS_UPDATE_ERROR]', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update claim status' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/claims/[id]/status
 * Get current claim status and workflow state
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: claimId } = params;

        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            select: {
                id: true,
                claimNumber: true,
                status: true,
                routingDecision: true,
                autoApproved: true,
                submittedAt: true,
                acknowledgedAt: true,
                closedAt: true,
            },
        });

        if (!claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            status: claim.status,
            claimNumber: claim.claimNumber,
            routingDecision: claim.routingDecision,
            autoApproved: claim.autoApproved,
            timeline: {
                submitted: claim.submittedAt,
                acknowledged: claim.acknowledgedAt,
                closed: claim.closedAt,
            },
        });

    } catch (error) {
        console.error('[GET_STATUS_ERROR]', error);
        return NextResponse.json({ error: 'Failed to retrieve status' }, { status: 500 });
    }
}