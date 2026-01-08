// src/app/api/claims/route.ts
// List Claims API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { auditLog } from '@/lib/utils/auditLogger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const policyId = searchParams.get('policyId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Record<string, unknown> = {};

        if (status && status !== 'all') {
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
                            damages: true,
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
            lossDate: claim.incidentDate.toISOString(),
            lossLocation: claim.incidentLocation,
            createdAt: claim.createdAt.toISOString(),
            updatedAt: claim.updatedAt.toISOString(),
            estimatedAmount: claim.estimatedAmount,
            approvedAmount: claim.approvedAmount,
            policyNumber: claim.policy.policyNumber,
            policyHolder: `${claim.policy.holderFirstName} ${claim.policy.holderLastName}`,
            vehicle: claim.vehicle ? {
                vin: claim.vehicle.vin,
                year: claim.vehicle.year,
                make: claim.vehicle.make,
                model: claim.vehicle.model,
            } : null,
            documentCount: claim._count.documents,
            damageCount: claim._count.damages,
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
        const body = await request.json();

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

