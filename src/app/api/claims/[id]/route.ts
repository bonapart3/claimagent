// src/app/api/claims/[id]/route.ts
// Single Claim Details API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const claimId = params.id;

        // Try to find by claim number or ID
        const claim = await prisma.claim.findFirst({
            where: {
                OR: [
                    { id: claimId },
                    { claimNumber: claimId },
                ],
            },
            include: {
                policy: true,
                vehicle: true,
                documents: true,
                damages: true,
                participants: true,
                assessments: true,
                communications: true,
                auditLogs: true,
                payments: true,
            },
        });

        if (!claim) {
            return NextResponse.json(
                { success: false, error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Build timeline from audit logs
        const timeline = claim.auditLogs.map(log => ({
            id: log.id,
            action: log.action,
            description: `${log.action} on ${log.entityType} (${log.entityId})`,
            timestamp: log.timestamp.toISOString(),
            agent: log.userId || undefined,
        }));

        // Transform response
        const response = {
            id: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            claimType: claim.claimType,
            lossDate: claim.incidentDate.toISOString(),
            lossTime: claim.incidentTime,
            lossLocation: claim.incidentLocation,
            lossDescription: claim.description,
            createdAt: claim.createdAt.toISOString(),
            updatedAt: claim.updatedAt.toISOString(),
            estimatedAmount: claim.estimatedAmount,
            approvedAmount: claim.approvedAmount,
            deductible: claim.deductibleAmount,
            fraudScore: claim.fraudScore,
            priority: claim.severity,
            assignedAdjuster: claim.assignedToId,

            policy: {
                id: claim.policy.id,
                policyNumber: claim.policy.policyNumber,
                status: claim.policy.status,
                effectiveDate: claim.policy.effectiveDate.toISOString(),
                expirationDate: claim.policy.expirationDate.toISOString(),
                holder: `${claim.policy.holderFirstName} ${claim.policy.holderLastName}`,
                coverages: [
                    { type: 'Liability', limit: claim.policy.liabilityLimit, deductible: 0 },
                    claim.policy.collisionLimit ? { type: 'Collision', limit: claim.policy.collisionLimit, deductible: claim.policy.collisionDeductible || 0 } : null,
                    claim.policy.comprehensiveLimit ? { type: 'Comprehensive', limit: claim.policy.comprehensiveLimit, deductible: claim.policy.comprehensiveDeductible || 0 } : null,
                    claim.policy.umUimLimit ? { type: 'UM/UIM', limit: claim.policy.umUimLimit, deductible: 0 } : null,
                    claim.policy.medicalPaymentLimit ? { type: 'Medical Payments', limit: claim.policy.medicalPaymentLimit, deductible: 0 } : null,
                ].filter(Boolean),
            },

            vehicle: claim.vehicle ? {
                id: claim.vehicle.id,
                vin: claim.vehicle.vin,
                year: claim.vehicle.year,
                make: claim.vehicle.make,
                model: claim.vehicle.model,
                color: claim.vehicle.color,
            } : null,

            documents: claim.documents.map(doc => ({
                id: doc.id,
                type: doc.type,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
                uploadedAt: doc.createdAt.toISOString(),
                aiAnalysis: doc.aiAnalysis,
            })),

            damages: claim.damages.map(damage => ({
                id: damage.id,
                component: damage.component,
                description: `${damage.area} ${damage.component} - ${damage.damageType}`,
                severity: damage.severity,
                estimatedCost: damage.estimatedCost,
            })),

            participants: claim.participants.map(p => ({
                id: p.id,
                role: p.role,
                name: `${p.firstName} ${p.lastName}`,
                phone: p.phone,
                email: p.email,
                insuranceCompany: p.insuranceCarrier,
                policyNumber: p.policyNumber,
            })),

            assessments: claim.assessments.map(a => ({
                id: a.id,
                type: a.agentType,
                phase: a.phase,
                findings: a.findings,
                recommendations: a.recommendations,
                confidence: a.confidence,
                flagsRaised: a.flagsRaised,
                requiresHuman: a.requiresHuman,
                completedAt: a.completedAt.toISOString(),
            })),

            payments: claim.payments.map(p => ({
                id: p.id,
                type: p.paymentType,
                amount: p.amount,
                payee: p.payeeName,
                approvedAt: p.approvedAt.toISOString(),
                processedAt: p.processedAt?.toISOString(),
            })),

            timeline,
        };

        // Log access
        await auditLog({
            claimId: claim.id,
            action: 'CLAIM_VIEWED',
            details: { description: `Claim ${claim.claimNumber} details accessed` },
        });

        return NextResponse.json({
            success: true,
            data: response,
        });
    } catch (error) {
        console.error('Error fetching claim details:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch claim details' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const claimId = params.id;
        const body = await request.json();

        // Find existing claim
        const existingClaim = await prisma.claim.findFirst({
            where: {
                OR: [
                    { id: claimId },
                    { claimNumber: claimId },
                ],
            },
        });

        if (!existingClaim) {
            return NextResponse.json(
                { success: false, error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Only allow updating certain fields
        const allowedUpdates = [
            'status',
            'priority',
            'assignedAdjuster',
            'estimatedAmount',
            'approvedAmount',
            'deductible',
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedUpdates) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        // Update claim
        const updatedClaim = await prisma.claim.update({
            where: { id: existingClaim.id },
            data: updateData,
        });

        // Log update
        await auditLog({
            claimId: existingClaim.id,
            action: 'CLAIM_UPDATED',
            details: { description: `Claim ${existingClaim.claimNumber} updated: ${Object.keys(updateData).join(', ')}`, previousValues: existingClaim, newValues: updateData },
        });

        return NextResponse.json({
            success: true,
            data: updatedClaim,
        });
    } catch (error) {
        console.error('Error updating claim:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update claim' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const claimId = params.id;

        // Find existing claim
        const existingClaim = await prisma.claim.findFirst({
            where: {
                OR: [
                    { id: claimId },
                    { claimNumber: claimId },
                ],
            },
        });

        if (!existingClaim) {
            return NextResponse.json(
                { success: false, error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Only allow deletion of early-stage claims (not processed)
        if (!['SUBMITTED', 'ACKNOWLEDGED'].includes(existingClaim.status)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot delete claim that has been processed'
                },
                { status: 400 }
            );
        }

        // Soft delete by updating status
        await prisma.claim.update({
            where: { id: existingClaim.id },
            data: { status: 'CLOSED' },
        });

        await auditLog({
            claimId: existingClaim.id,
            action: 'CLAIM_CANCELLED',
            details: { description: `Claim ${existingClaim.claimNumber} was cancelled` },
        });

        return NextResponse.json({
            success: true,
            message: 'Claim cancelled successfully',
        });
    } catch (error) {
        console.error('Error deleting claim:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete claim' },
            { status: 500 }
        );
    }
}
