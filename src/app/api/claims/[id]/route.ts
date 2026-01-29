// src/app/api/claims/[id]/route.ts
// Single Claim Details API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';
import { validateSession } from '@/lib/utils/validation';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

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
                policy: {
                    include: {
                        coverages: true,
                    },
                },
                vehicle: true,
                documents: true,
                participants: true,
                communications: true,
                agentLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                fraudAnalysis: true,
                valuation: true,
                settlement: true,
            },
        });

        if (!claim) {
            return NextResponse.json(
                { success: false, error: 'Claim not found' },
                { status: 404 }
            );
        }

        // Build timeline from agent logs
        const timeline = claim.agentLogs.map(log => ({
            id: log.id,
            action: log.action,
            description: `${log.agentName}: ${log.action}`,
            timestamp: log.createdAt.toISOString(),
            agent: log.agentName,
            status: log.status,
        }));

        // Transform response
        const response = {
            id: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            claimType: claim.claimType,
            lossType: claim.lossType,
            lossDate: claim.lossDate.toISOString(),
            lossLocation: claim.lossLocation,
            lossDescription: claim.lossDescription,
            createdAt: claim.createdAt.toISOString(),
            updatedAt: claim.updatedAt.toISOString(),
            reportedDate: claim.reportedDate.toISOString(),
            estimatedLoss: claim.estimatedLoss,
            reserveAmount: claim.reserveAmount,
            paidAmount: claim.paidAmount,
            deductible: claim.deductible,
            fraudScore: claim.fraudScore,
            severity: claim.severity,
            complexity: claim.complexity,
            isTotalLoss: claim.isTotalLoss,
            requiresHumanReview: claim.requiresHumanReview,
            autoApprovalEligible: claim.autoApprovalEligible,
            routingDecision: claim.routingDecision,
            adjusterId: claim.adjusterId,

            policy: {
                id: claim.policy.id,
                policyNumber: claim.policy.policyNumber,
                status: claim.policy.status,
                effectiveDate: claim.policy.effectiveDate.toISOString(),
                expirationDate: claim.policy.expirationDate.toISOString(),
                holder: `${claim.policy.holderFirstName} ${claim.policy.holderLastName}`,
                holderEmail: claim.policy.holderEmail,
                holderPhone: claim.policy.holderPhone,
                coverages: claim.policy.coverages.map(cov => ({
                    type: cov.type,
                    limitPerPerson: cov.limitPerPerson,
                    limitPerAccident: cov.limitPerAccident,
                    limitProperty: cov.limitProperty,
                    deductible: cov.deductible,
                })),
            },

            vehicle: claim.vehicle ? {
                id: claim.vehicle.id,
                vin: claim.vehicle.vin,
                year: claim.vehicle.year,
                make: claim.vehicle.make,
                model: claim.vehicle.model,
                trim: claim.vehicle.trim,
                color: claim.vehicle.color,
                mileage: claim.vehicle.mileage,
                hasSensors: claim.vehicle.hasSensors,
                hasAdas: claim.vehicle.hasAdas,
            } : null,

            documents: claim.documents.map(doc => ({
                id: doc.id,
                type: doc.type,
                fileName: doc.fileName,
                fileSize: doc.fileSize,
                mimeType: doc.mimeType,
                uploadedAt: doc.uploadedAt.toISOString(),
                aiAnalysis: doc.aiAnalysis,
                damageAreas: doc.damageAreas,
                estimatedCost: doc.estimatedCost,
            })),

            participants: claim.participants.map(p => ({
                id: p.id,
                role: p.role,
                name: `${p.firstName} ${p.lastName}`,
                phone: p.phone,
                email: p.email,
                insuranceCarrier: p.insuranceCarrier,
                insurancePolicyNumber: p.insurancePolicyNumber,
                injuryDescription: p.injuryDescription,
                medicalTreatment: p.medicalTreatment,
            })),

            fraudAnalysis: claim.fraudAnalysis ? {
                overallScore: claim.fraudAnalysis.overallScore,
                riskLevel: claim.fraudAnalysis.riskLevel,
                flaggedReasons: claim.fraudAnalysis.flaggedReasons,
                siuRecommendation: claim.fraudAnalysis.siuRecommendation,
                siuReviewed: claim.fraudAnalysis.siuReviewed,
            } : null,

            valuation: claim.valuation ? {
                preAccidentValue: claim.valuation.preAccidentValue,
                postAccidentValue: claim.valuation.postAccidentValue,
                isTotalLoss: claim.valuation.isTotalLoss,
                salvageValue: claim.valuation.salvageValue,
                estimatedRepairCost: claim.valuation.estimatedRepairCost,
                valuationSource: claim.valuation.valuationSource,
            } : null,

            settlement: claim.settlement ? {
                totalPaid: claim.settlement.totalPaid,
                paymentMethod: claim.settlement.paymentMethod,
                paymentStatus: claim.settlement.paymentStatus,
                paidAt: claim.settlement.paidAt?.toISOString(),
                releaseObtained: claim.settlement.releaseObtained,
            } : null,

            timeline,
        };

        // Log access
        await auditLog({
            claimId: claim.id,
            action: 'CLAIM_VIEWED',
            entityType: 'Claim',
            entityId: claim.id,
            details: { claimNumber: claim.claimNumber },
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
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

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
            'severity',
            'adjusterId',
            'estimatedLoss',
            'reserveAmount',
            'deductible',
            'requiresHumanReview',
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
            entityType: 'Claim',
            entityId: existingClaim.id,
            details: {
                claimNumber: existingClaim.claimNumber,
                updatedFields: Object.keys(updateData),
            },
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
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

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

        // Only allow deletion of early-stage claims (INTAKE status)
        if (existingClaim.status !== 'INTAKE') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Cannot delete claim that has been processed'
                },
                { status: 400 }
            );
        }

        // Soft delete by updating status to CLOSED
        await prisma.claim.update({
            where: { id: existingClaim.id },
            data: { status: 'CLOSED' },
        });

        await auditLog({
            claimId: existingClaim.id,
            action: 'CLAIM_CANCELLED',
            entityType: 'Claim',
            entityId: existingClaim.id,
            details: { claimNumber: existingClaim.claimNumber },
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
