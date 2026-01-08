typescript
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { validateSession } from '@/lib/utils/validation';
import { auditLog } from '@/lib/utils/auditLogger';

const prisma = new PrismaClient();

/**
 * GET /api/claims/[id]
 * Retrieve detailed claim information
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Authentication
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: claimId } = params;

        // Fetch claim with all related data
        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            include: {
                documents: {
                    select: {
                        id: true,
                        fileName: true,
                        fileType: true,
                        documentType: true,
                        fileUrl: true,
                        createdAt: true,
                    },
                },
                notes: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                activities: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                },
                fraudAnalysis: true,
                valuation: true,
                aiAssessments: {
                    orderBy: { createdAt: 'desc' },
                },
                escalations: {
                    where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
                },
                assignedUser: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        if (!claim) {
            return NextResponse.json(
                { error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Authorization check - ensure user has access to this claim
        if (claim.assignedTo !== session.userId && session.role !== 'ADMIN') {
            await auditLog({
                userId: session.userId,
                action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
                entityType: 'Claim',
                entityId: claimId,
                ipAddress: request.headers.get('x-forwarded-for') || undefined,
            });

            return NextResponse.json(
                { error: 'Access denied - insufficient permissions' },
                { status: 403 }
            );
        }

        // Log access
        await auditLog({
            userId: session.userId,
            action: 'CLAIM_VIEWED',
            entityType: 'Claim',
            entityId: claimId,
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({
            success: true,
            claim,
        });

    } catch (error) {
        console.error('[GET_CLAIM_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to retrieve claim' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/claims/[id]
 * Update claim information
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: claimId } = params;
        const updates = await request.json();

        // Fetch existing claim
        const existingClaim = await prisma.claim.findUnique({
            where: { id: claimId },
        });

        if (!existingClaim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        // Authorization check
        if (existingClaim.assignedTo !== session.userId && session.role !== 'ADMIN' && session.role !== 'SUPERVISOR') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Update claim
        const updatedClaim = await prisma.claim.update({
            where: { id: claimId },
            data: {
                ...updates,
                updatedAt: new Date(),
            },
        });

        // Log activity
        await prisma.claimActivity.create({
            data: {
                claimId,
                activityType: 'STATUS_CHANGED',
                performedBy: session.userId,
                description: `Claim updated by ${session.userId}`,
                metadata: { updates },
            },
        });

        // Audit log
        await auditLog({
            userId: session.userId,
            action: 'CLAIM_UPDATED',
            entityType: 'Claim',
            entityId: claimId,
            changes: updates,
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({
            success: true,
            claim: updatedClaim,
        });

    } catch (error) {
        console.error('[UPDATE_CLAIM_ERROR]', error);
        return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
    }
}

/**
 * DELETE /api/claims/[id]
 * Soft delete claim (Admin only)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await validateSession(request);
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: claimId } = params;

        // Mark claim as withdrawn
        await prisma.claim.update({
            where: { id: claimId },
            data: {
                status: 'WITHDRAWN',
                updatedAt: new Date(),
            },
        });

        await auditLog({
            userId: session.userId,
            action: 'CLAIM_DELETED',
            entityType: 'Claim',
            entityId: claimId,
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        return NextResponse.json({ success: true, message: 'Claim withdrawn' });

    } catch (error) {
        console.error('[DELETE_CLAIM_ERROR]', error);
        return NextResponse.json({ error: 'Failed to delete claim' }, { status: 500 });
    }
}

