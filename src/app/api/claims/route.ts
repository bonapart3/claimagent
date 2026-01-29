// src/app/api/claims/route.ts
// List Claims API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { ClaimListQuerySchema } from '@/lib/schemas/api';
import {
    validateQueryParams,
    validationErrorResponse,
} from '@/lib/utils/requestValidator';
import { validateSession } from '@/lib/utils/validation';

export async function GET(request: NextRequest) {
    try {
        // Validate session - SECURITY FIX
        const session = await validateSession(request);
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Validate query parameters
        const queryValidation = validateQueryParams(request, ClaimListQuerySchema);

        if (!queryValidation.success || !queryValidation.data) {
            return validationErrorResponse(queryValidation);
        }

        const { status, policyId, page = 1, limit = 10 } = queryValidation.data;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status && (status as string) !== 'all') {
            where.status = status;
        }

        if (policyId) {
            where.policyId = policyId;
        }

        // Fetch claims with pagination
        const [claims, total] = await Promise.all([
            prisma.claim.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    policy: {
                        select: {
                            policyNumber: true,
                            holderFirstName: true,
                            holderLastName: true,
                        },
                    },
                    vehicle: {
                        select: {
                            vin: true,
                            year: true,
                            make: true,
                            model: true,
                        },
                    },
                    _count: {
                        select: {
                            documents: true,
                        },
                    },
                },
            }),
            prisma.claim.count({ where }),
        ]);

        // Transform response
        const transformedClaims = claims.map(claim => ({
            id: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            claimType: claim.claimType,
            lossDate: claim.lossDate.toISOString(),
            lossLocation: claim.lossLocation,
            createdAt: claim.createdAt.toISOString(),
            updatedAt: claim.updatedAt.toISOString(),
            estimatedLoss: claim.estimatedLoss,
            paidAmount: claim.paidAmount,
            policyNumber: claim.policy.policyNumber,
            policyHolder: `${claim.policy.holderFirstName} ${claim.policy.holderLastName}`,
            vehicle: claim.vehicle ? {
                vin: claim.vehicle.vin,
                year: claim.vehicle.year,
                make: claim.vehicle.make,
                model: claim.vehicle.model,
            } : null,
            documentCount: claim._count.documents,
        }));

        return NextResponse.json({
            success: true,
            data: transformedClaims,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching claims:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch claims' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // This endpoint could be used for bulk operations
        // For now, redirect to submit endpoint
        return NextResponse.json(
            {
                success: false,
                error: 'Use /api/claims/submit for new claim submission'
            },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error in claims POST:', error);
        return NextResponse.json(
            { success: false, error: 'Invalid request' },
            { status: 400 }
        );
    }
}
