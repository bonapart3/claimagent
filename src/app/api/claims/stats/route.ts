// src/app/api/claims/stats/route.ts
// Claims Statistics API Route

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
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

        // Get basic stats using actual ClaimStatus enum values
        const [
            totalClaims,
            pendingClaims,
            approvedClaims,
            closedClaims,
            deniedClaims,
            fraudFlaggedClaims,
        ] = await Promise.all([
            prisma.claim.count(),
            prisma.claim.count({
                where: {
                    status: { in: ['INTAKE', 'INVESTIGATION', 'EVALUATION', 'PENDING_APPROVAL'] },
                },
            }),
            prisma.claim.count({ where: { status: 'APPROVED' } }),
            prisma.claim.count({ where: { status: 'CLOSED' } }),
            prisma.claim.count({ where: { status: 'DENIED' } }),
            prisma.claim.count({ where: { fraudScore: { gte: 50 } } }),
        ]);

        // Calculate average processing time (from submission to resolution)
        const resolvedClaims = await prisma.claim.findMany({
            where: {
                status: { in: ['APPROVED', 'CLOSED', 'DENIED'] },
            },
            select: {
                createdAt: true,
                updatedAt: true,
            },
            take: 100, // Sample last 100 resolved claims
            orderBy: { updatedAt: 'desc' },
        });

        let avgProcessingTime = '2.3 days'; // Default
        if (resolvedClaims.length > 0) {
            const totalHours = resolvedClaims.reduce((sum, claim) => {
                const hours =
                    (claim.updatedAt.getTime() - claim.createdAt.getTime()) /
                    (1000 * 60 * 60);
                return sum + hours;
            }, 0);
            const avgHours = totalHours / resolvedClaims.length;
            if (avgHours < 24) {
                avgProcessingTime = `${Math.round(avgHours)} hours`;
            } else {
                avgProcessingTime = `${(avgHours / 24).toFixed(1)} days`;
            }
        }

        // Get claims by type
        const claimsByType = await prisma.claim.groupBy({
            by: ['claimType'],
            _count: { id: true },
        });

        // Get claims by status
        const claimsByStatus = await prisma.claim.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        // Get total amounts using correct field names
        const totals = await prisma.claim.aggregate({
            _sum: {
                estimatedLoss: true,
                paidAmount: true,
            },
            _avg: {
                fraudScore: true,
            },
        });

        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentClaims = await prisma.claim.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
        });

        // Calculate auto-approval rate
        const autoApprovedClaims = await prisma.claim.count({
            where: {
                status: { in: ['APPROVED', 'CLOSED'] },
                autoApprovalEligible: true,
            },
        });

        const approvalRate =
            totalClaims > 0
                ? (((approvedClaims + closedClaims) / totalClaims) * 100).toFixed(1)
                : '0';

        return NextResponse.json({
            success: true,
            data: {
                totalClaims,
                pendingClaims,
                approvedClaims,
                closedClaims,
                deniedClaims,
                fraudFlaggedClaims,
                avgProcessingTime,
                approvalRate: `${approvalRate}%`,

                claimsByType: claimsByType.map(item => ({
                    type: item.claimType,
                    count: item._count.id,
                })),

                claimsByStatus: claimsByStatus.map(item => ({
                    status: item.status,
                    count: item._count.id,
                })),

                financials: {
                    totalEstimated: totals._sum?.estimatedLoss || 0,
                    totalPaid: totals._sum?.paidAmount || 0,
                    avgFraudScore: totals._avg?.fraudScore || 0,
                },

                trends: {
                    claimsLast30Days: recentClaims,
                    autoApprovalRate:
                        totalClaims > 0
                            ? `${((autoApprovedClaims / totalClaims) * 100).toFixed(1)}%`
                            : '0%',
                },
            },
        });
    } catch (error) {
        console.error('Error fetching claim stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch statistics' },
            { status: 500 }
        );
    }
}
