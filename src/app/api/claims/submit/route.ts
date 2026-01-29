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

// Map simplified claim types to full enum values
const CLAIM_TYPE_MAP: Record<string, string> = {
    'COLLISION': 'AUTO_COLLISION',
    'COMPREHENSIVE': 'AUTO_COMPREHENSIVE',
    'LIABILITY': 'AUTO_LIABILITY',
    'UNINSURED_MOTORIST': 'AUTO_UNINSURED_MOTORIST',
    'MEDICAL_PAYMENTS': 'AUTO_MEDICAL_PAYMENTS',
    'PIP': 'AUTO_PIP',
    // Already-qualified values pass through
    'AUTO_COLLISION': 'AUTO_COLLISION',
    'AUTO_COMPREHENSIVE': 'AUTO_COMPREHENSIVE',
    'AUTO_LIABILITY': 'AUTO_LIABILITY',
    'AUTO_UNINSURED_MOTORIST': 'AUTO_UNINSURED_MOTORIST',
    'AUTO_MEDICAL_PAYMENTS': 'AUTO_MEDICAL_PAYMENTS',
    'AUTO_PIP': 'AUTO_PIP',
};

// Schema accepts both frontend form format and API format
const ClaimSubmissionSchema = z.object({
    // Accept either policyNumber (from form) or policyId (from API)
    policyNumber: z.string().min(1).optional(),
    policyId: z.string().uuid('Invalid policy ID').optional(),
    vehicleId: z.string().uuid('Invalid vehicle ID').optional(),
    // Accept vehicle details from form
    vehicle: z.object({
        vin: z.string().optional(),
        year: z.number().optional(),
        make: z.string().optional(),
        model: z.string().optional(),
    }).optional(),
    claimType: z.string().min(1, 'Claim type is required'),
    lossType: z.string().optional(),
    lossDate: z.string().min(1, 'Loss date is required'),
    lossTime: z.string().optional(),
    // Accept string or object for location
    lossLocation: z.union([
        z.string().min(1),
        z.object({
            address: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zip: z.string().optional(),
            description: z.string().optional(),
        }),
    ]),
    lossDescription: z.string().min(10, 'Please provide a detailed description').max(5000),
    damageDescription: z.string().optional(),
    estimatedAmount: z.number().positive().optional(),
    policeReportFiled: z.boolean().optional(),
    policeReportNumber: z.string().optional(),
    injuries: z.union([
        z.boolean(),
        z.object({ description: z.string().optional() }),
    ]).optional(),
    injuryDescription: z.string().optional(),
}).refine(
    (data) => data.policyNumber || data.policyId,
    { message: 'Either policyNumber or policyId is required' }
);

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

        // Resolve policy: look up by ID or by number
        let policy: any = null;
        let policyId: string | undefined;

        if (claimData.policyId) {
            policy = await prisma.policy.findUnique({
                where: { id: claimData.policyId },
                include: { carrier: true },
            });
        } else if (claimData.policyNumber) {
            policy = await prisma.policy.findFirst({
                where: { policyNumber: claimData.policyNumber },
                include: { carrier: true },
            });
        }

        if (policy) {
            policyId = policy.id;

            if (policy.status !== 'ACTIVE') {
                return NextResponse.json(
                    { success: false, error: 'Policy is not active' },
                    { status: 400 }
                );
            }

            // Check if loss date is within policy period
            const lossDateCheck = new Date(claimData.lossDate);
            if (lossDateCheck < policy.effectiveDate || lossDateCheck > policy.expirationDate) {
                return NextResponse.json(
                    { success: false, error: 'Loss date is outside policy coverage period' },
                    { status: 400 }
                );
            }
        } else {
            // Policy not found - still allow claim submission (pending verification)
            // This enables the demo flow where policy may not exist yet
            console.warn(`[CLAIM_SUBMIT] Policy not found: ${claimData.policyNumber || claimData.policyId}`);
        }

        // Resolve vehicle: use vehicleId or find/create from details
        let vehicleId = claimData.vehicleId;
        if (!vehicleId && claimData.vehicle?.vin && policyId) {
            const existingVehicle = await prisma.vehicle.findFirst({
                where: { vin: claimData.vehicle.vin, policyId },
            });
            vehicleId = existingVehicle?.id;
        }

        // Normalize claim type
        const resolvedClaimType = CLAIM_TYPE_MAP[claimData.claimType] || 'AUTO_COLLISION';

        // Derive loss type from claim type if not provided
        const resolvedLossType = claimData.lossType || claimData.claimType.replace('AUTO_', '') || 'COLLISION';

        // Normalize location to object
        const lossLocation = typeof claimData.lossLocation === 'string'
            ? { description: claimData.lossLocation }
            : claimData.lossLocation;

        const lossDate = new Date(claimData.lossDate);
        const claimNumber = generateClaimNumber();

        // Determine injuries
        const hasInjuries = typeof claimData.injuries === 'boolean'
            ? claimData.injuries
            : !!claimData.injuries;
        const injuryDesc = typeof claimData.injuries === 'object' && claimData.injuries
            ? (claimData.injuries as any).description
            : claimData.injuryDescription;

        // Determine initial severity
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        if (hasInjuries) {
            severity = 'HIGH';
        } else if (claimData.estimatedAmount && claimData.estimatedAmount > 25000) {
            severity = 'HIGH';
        } else if (claimData.estimatedAmount && claimData.estimatedAmount > 10000) {
            severity = 'MEDIUM';
        }

        // Find a default carrier if no policy found
        let carrierId = policy?.carrierId;
        if (!carrierId) {
            const defaultCarrier = await prisma.carrier.findFirst();
            carrierId = defaultCarrier?.id;
        }

        if (!carrierId) {
            return NextResponse.json(
                { success: false, error: 'No carrier configured. Please contact support.' },
                { status: 400 }
            );
        }

        // Create claim in database
        const claim = await prisma.claim.create({
            data: {
                id: randomUUID(),
                claimNumber,
                carrierId,
                policyId: policyId,
                vehicleId: vehicleId,
                claimType: resolvedClaimType,
                lossType: resolvedLossType,
                lossDate,
                reportedDate: new Date(),
                lossLocation,
                lossDescription: claimData.lossDescription,
                severity,
                complexity: 'SIMPLE',
                status: 'INTAKE',
                estimatedLoss: claimData.estimatedAmount,
                fraudScore: 0,
                requiresHumanReview: !policy, // Require review if policy not found
                autoApprovalEligible: !!policy,
                metadata: {
                    policyNumber: claimData.policyNumber,
                    policeReportFiled: claimData.policeReportFiled,
                    policeReportNumber: claimData.policeReportNumber,
                    injuries: hasInjuries,
                    injuryDescription: injuryDesc,
                    damageDescription: claimData.damageDescription,
                    vehicle: claimData.vehicle,
                    submittedBy: session.userId,
                    submittedAt: new Date().toISOString(),
                    policyVerified: !!policy,
                },
            },
        });

        // Audit log (fire and forget)
        auditLog({
            claimId: claim.id,
            userId: session.userId,
            action: 'CLAIM_SUBMITTED',
            entityType: 'Claim',
            entityId: claim.id,
            details: {
                claimNumber,
                claimType: resolvedClaimType,
                lossType: resolvedLossType,
                policyVerified: !!policy,
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
        }).catch(err => console.error('[AUDIT_LOG_ERROR]', err));

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
