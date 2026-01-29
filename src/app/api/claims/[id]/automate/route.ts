import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { auditLog } from '@/lib/utils/auditLogger';
import { Claim, Policy, Vehicle } from '@prisma/client';

type ClaimWithRelations = Claim & {
    policy: Policy;
    vehicle: Vehicle | null;
};

/**
 * POST /api/claims/[id]/automate
 * Run automated adjuster processing on an existing claim
 * Focus: Automotive claims only
 */
export async function POST(
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

        // Fetch claim
        const claim = await prisma.claim.findUnique({
            where: { id: claimId },
            include: {
                policy: true,
                vehicle: true,
            },
        });

        if (!claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
        }

        // Run automated processing
        const automationResult = await runAutomatedAdjusterProcessing(claim);

        // Log automation usage
        await auditLog({
            userId: session.userId,
            action: 'CLAIM_AUTOMATION_RUN',
            claimId: claimId,
            entityType: 'Claim',
            entityId: claimId,
            details: {
                automationType: 'adjuster_assistance',
                recommendations: automationResult.recommendations?.length || 0
            },
        });

        return NextResponse.json({
            success: true,
            automation: automationResult,
            message: 'Automated adjuster processing completed'
        });

    } catch (error) {
        console.error('[AUTOMATE_CLAIM_ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to run automation' },
            { status: 500 }
        );
    }
}

interface Recommendation {
    type: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    action: string;
}

/**
 * Thin automation layer for adjuster assistance
 * Extracts key insights without replacing human judgment
 */
async function runAutomatedAdjusterProcessing(claim: ClaimWithRelations) {
    const recommendations: Recommendation[] = [];
    const insights: string[] = [];

    // 1. Basic validation checks
    if (!claim.vehicle) {
        recommendations.push({
            type: 'MISSING_DATA',
            priority: 'HIGH',
            message: 'Vehicle information missing - recommend gathering VIN and vehicle details',
            action: 'REQUEST_VEHICLE_INFO'
        });
    }

    // 2. Policy coverage analysis
    if (claim.policy) {
        const coverageAnalysis = await analyzeCoverage(claim);
        if (coverageAnalysis.warnings.length > 0) {
            recommendations.push(...coverageAnalysis.warnings);
        }
        insights.push(...coverageAnalysis.insights);
    }

    // 3. Estimate validation
    if (claim.estimatedLoss) {
        const estimateCheck = validateEstimate(claim);
        recommendations.push(...estimateCheck.recommendations);
        insights.push(...estimateCheck.insights);
    }

    // 4. Fraud indicators (basic)
    const fraudCheck = basicFraudCheck(claim);
    if (fraudCheck.flags.length > 0) {
        recommendations.push({
            type: 'FRAUD_CONCERN',
            priority: 'HIGH',
            message: `Potential fraud indicators detected: ${fraudCheck.flags.join(', ')}`,
            action: 'REVIEW_FOR_FRAUD'
        });
    }

    return {
        recommendations,
        insights,
        summary: {
            totalRecommendations: recommendations.length,
            highPriority: recommendations.filter(r => r.priority === 'HIGH').length,
            automatedAt: new Date().toISOString()
        }
    };
}

async function analyzeCoverage(claim: ClaimWithRelations) {
    const warnings: Recommendation[] = [];
    const insights: string[] = [];

    // Fetch coverages for the policy
    const coverages = await prisma.coverage.findMany({
        where: { policyId: claim.policyId },
    });

    // Find collision coverage
    const collisionCoverage = coverages.find(c => c.type === 'COLLISION');

    if (collisionCoverage && claim.estimatedLoss) {
        const limit = collisionCoverage.limitPerAccident || collisionCoverage.limitProperty;
        if (limit && Number(claim.estimatedLoss) > Number(limit)) {
            warnings.push({
                type: 'COVERAGE_LIMIT',
                priority: 'HIGH',
                message: `Claim estimate ($${claim.estimatedLoss}) may exceed coverage limit ($${limit})`,
                action: 'REVIEW_COVERAGE'
            });
        }

        if (collisionCoverage.deductible) {
            insights.push(`Collision deductible: $${collisionCoverage.deductible}`);
        }
    }

    return { warnings, insights };
}

function validateEstimate(claim: ClaimWithRelations) {
    const recommendations: Recommendation[] = [];
    const insights: string[] = [];

    // Basic reasonableness checks
    if (claim.claimType === 'AUTO_COLLISION' && claim.vehicle?.year) {
        const vehicleAge = new Date().getFullYear() - claim.vehicle.year;
        if (vehicleAge > 10 && claim.estimatedLoss && Number(claim.estimatedLoss) > 5000) {
            recommendations.push({
                type: 'ESTIMATE_REVIEW',
                priority: 'MEDIUM',
                message: 'High repair estimate for older vehicle - consider total loss evaluation',
                action: 'REVIEW_TOTAL_LOSS'
            });
        }
    }

    insights.push(`Estimate reasonableness: ${getReasonablenessScore(claim)}/10`);

    return { recommendations, insights };
}

function getReasonablenessScore(claim: ClaimWithRelations): number {
    let score = 5; // baseline

    // Adjust based on factors
    if (claim.vehicle?.year && claim.vehicle.year > 2015) score += 1;
    if (claim.deductible) score += 1;
    if (claim.lossDate) {
        const daysSince = (Date.now() - new Date(claim.lossDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) score += 1; // recent claims more reliable
    }

    return Math.min(10, Math.max(1, score));
}

function basicFraudCheck(claim: ClaimWithRelations) {
    const flags: string[] = [];

    // Simple checks
    if (claim.estimatedLoss && Number(claim.estimatedLoss) > 50000) {
        flags.push('high_dollar_amount');
    }

    // Check metadata for police report
    const metadata = claim.metadata as Record<string, unknown> | null;
    if (!metadata?.policeReportNumber && claim.claimType === 'AUTO_COLLISION') {
        flags.push('missing_police_report');
    }

    if (claim.fraudScore >= 50) {
        flags.push('elevated_fraud_score');
    }

    return { flags };
}
