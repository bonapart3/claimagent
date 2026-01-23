// src/app/api/claims/submit/route.ts
// Submit New Claim API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { auditLog } from '@/lib/utils/auditLogger';
import {
    validateRequestBody,
    validationErrorResponse,
} from '@/lib/utils/requestValidator';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Schema for claim submission
const ClaimSubmissionSchema = z.object({
    policyId: z.string().uuid('Invalid policy ID'),
    vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
    claimType: z.enum([
        'AUTO_LIABILITY',
        'AUTO_COLLISION',
        'AUTO_COMPREHENSIVE',
        'AUTO_UNINSURED_MOTORIST',
        'AUTO_PIP',
        'AUTO_MEDICAL_PAYMENTS',
    ]),
    lossType: z.enum([
        'COLLISION',
        'THEFT',
        'VANDALISM',
        'WEATHER',
        'FIRE',
        'GLASS',
        'HIT_AND_RUN',
        'ANIMAL',
        'OTHER',
    ]),
    lossDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    lossLocation: z.object({
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().max(2).optional(),
        zip: z.string().optional(),
        description: z.string().optional(),
    }),
    lossDescription: z.string().min(10, 'Please provide a detailed description').max(5000),
    estimatedAmount: z.number().positive().optional(),
    policeReportFiled: z.boolean().optional(),
    policeReportNumber: z.string().optional(),
    injuries: z.boolean().optional(),
    injuryDescription: z.string().optional(),
});

/**
 * Generate a unique claim number
 */
function generateClaimNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CLM-${year}-${random}`;
}

/**
 * POST /api/claims/submit
 * Submit a new insurance claim
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Validate request body
        const validation = await validateRequestBody(request, ClaimSubmissionSchema, {
            blockOnThreat: true,
            logThreats: true,
        });

        if (!validation.success || !validation.data) {
            return validationErrorResponse(validation);
        }

        const claimData = validation.data;

        // Verify policy exists and is active
        const policy = await prisma.policy.findUnique({
            where: { id: claimData.policyId },
            include: {
                carrier: true,
            },
        });

        if (!policy) {
            return NextResponse.json(
                { success: false, error: 'Policy not found' },
                { status: 404 }
            );
        }

        if (policy.status !== 'ACTIVE') {
            return NextResponse.json(
                { success: false, error: 'Policy is not active' },
                { status: 400 }
            );
        }

        // Check if loss date is within policy period
        const lossDate = new Date(claimData.lossDate);
        if (lossDate < policy.effectiveDate || lossDate > policy.expirationDate) {
            return NextResponse.json(
                { success: false, error: 'Loss date is outside policy coverage period' },
                { status: 400 }
            );
        }

        // Verify vehicle if provided
        if (claimData.vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: claimData.vehicleId },
            });

            if (!vehicle || vehicle.policyId !== claimData.policyId) {
                return NextResponse.json(
                    { success: false, error: 'Vehicle not found or not covered by this policy' },
                    { status: 400 }
                );
            }
        }

        // Generate unique claim number
        const claimNumber = generateClaimNumber();

        // Determine initial severity based on claim data
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (claimData.injuries) {
            severity = 'HIGH';
        } else if (claimData.estimatedAmount && claimData.estimatedAmount > 10000) {
            severity = 'MEDIUM';
        } else if (claimData.estimatedAmount && claimData.estimatedAmount > 25000) {
            severity = 'HIGH';
        }

        // Create claim in database
        const claim = await prisma.claim.create({
            data: {
                id: randomUUID(),
                claimNumber,
                carrierId: policy.carrierId,
                policyId: claimData.policyId,
                vehicleId: claimData.vehicleId,
                claimType: claimData.claimType,
                lossType: claimData.lossType,
                lossDate: lossDate,
                reportedDate: new Date(),
                lossLocation: claimData.lossLocation,
                lossDescription: claimData.lossDescription,
                severity,
                complexity: 'SIMPLE', // Will be updated by agents
                status: 'INTAKE',
                estimatedLoss: claimData.estimatedAmount,
                fraudScore: 0,
                requiresHumanReview: false,
                autoApprovalEligible: true,
                metadata: {
                    policeReportFiled: claimData.policeReportFiled,
                    policeReportNumber: claimData.policeReportNumber,
                    injuries: claimData.injuries,
                    injuryDescription: claimData.injuryDescription,
                    submittedBy: session.userId,
                    submittedAt: new Date().toISOString(),
                },
            },
        });

        // Create audit log entry
        await auditLog({
            claimId: claim.id,
            userId: session.userId,
            action: 'CLAIM_SUBMITTED',
            entityType: 'Claim',
            entityId: claim.id,
            details: {
                claimNumber,
                claimType: claimData.claimType,
                lossType: claimData.lossType,
                estimatedAmount: claimData.estimatedAmount,
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });

        // Return success with claim details
        return NextResponse.json({
            success: true,
            message: 'Claim submitted successfully',
            data: {
                id: claim.id,
                claimNumber: claim.claimNumber,
                status: claim.status,
                severity: claim.severity,
                createdAt: claim.createdAt,
            },
        }, { status: 201 });

    } catch (error) {
        console.error('[CLAIM_SUBMIT_ERROR]', error);
        return NextResponse.json(
            { success: false, error: 'Failed to submit claim' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/claims/submit
 * Return information about claim submission requirements
 */
export async function GET(request: NextRequest) {
    return NextResponse.json({
        success: true,
        endpoint: '/api/claims/submit',
        method: 'POST',
        description: 'Submit a new insurance claim',
        requiredFields: [
            'policyId',
            'claimType',
            'lossType',
            'lossDate',
            'lossLocation',
            'lossDescription',
        ],
        optionalFields: [
            'vehicleId',
            'estimatedAmount',
            'policeReportFiled',
            'policeReportNumber',
            'injuries',
            'injuryDescription',
        ],
        claimTypes: [
            'AUTO_LIABILITY',
            'AUTO_COLLISION',
            'AUTO_COMPREHENSIVE',
            'AUTO_UNINSURED_MOTORIST',
            'AUTO_PIP',
            'AUTO_MEDICAL_PAYMENTS',
        ],
        lossTypes: [
            'COLLISION',
            'THEFT',
            'VANDALISM',
            'WEATHER',
            'FIRE',
            'GLASS',
            'HIT_AND_RUN',
            'ANIMAL',
            'OTHER',
        ],
    });
}
