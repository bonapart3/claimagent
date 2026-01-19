import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/utils/database';
import { validateSession } from '@/lib/utils/validation';
import { auditLog } from '@/lib/utils/auditLogger';

/**
 * POST /api/claims/[id]/automate
 * Run automated adjuster processing on an existing claim
 * Focus: Automotive claims only, no trucking
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

        // Authorization check
        if (claim.assignedToId !== session.userId && session.role !== 'ADMIN' && session.role !== 'SUPERVISOR') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check if automotive claim (not trucking)
        if (claim.policy?.policyType === 'COMMERCIAL_AUTO' && claim.vehicle?.usage === 'DELIVERY') {
            return NextResponse.json({
                error: 'Automation not available for trucking/commercial delivery claims'
            }, { status: 400 });
        }

        // Run automated processing
        const automationResult = await runAutomatedAdjusterProcessing(claim);

        // Log automation usage
        await auditLog({
            userId: session.userId,
            action: 'CLAIM_AUTOMATION_RUN',
            claimId: claimId,
            details: {
                automationType: 'adjuster_assistance',
                recommendations: automationResult.recommendations?.length || 0
            },
            ipAddress: request.headers.get('x-forwarded-for') || undefined,
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

/**
 * Thin automation layer for adjuster assistance
 * Extracts key insights without replacing human judgment
 */
async function runAutomatedAdjusterProcessing(claim: any) {
    const recommendations = [];
    const insights = [];

    // 1. Basic validation checks
    if (!claim.vehicle) {
        recommendations.push({
            type: 'MISSING_DATA',
            priority: 'HIGH',
            message: 'Vehicle information missing - recommend gathering VIN and vehicle details',
            action: 'REQUEST_VEHICLE_INFO'
        });
    }

    // 2. Policy coverage analysis (simplified)
    if (claim.policy) {
        const coverageAnalysis = analyzeCoverage(claim);
        if (coverageAnalysis.warnings.length > 0) {
            recommendations.push(...coverageAnalysis.warnings);
        }
        insights.push(...coverageAnalysis.insights);
    }

    // 3. Estimate validation (simplified)
    if (claim.estimatedAmount) {
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

function analyzeCoverage(claim: any) {
    const warnings = [];
    const insights = [];

    // Check coverage limits
    if (claim.policy?.liabilityLimit && claim.estimatedAmount > claim.policy.liabilityLimit) {
        warnings.push({
            type: 'COVERAGE_LIMIT',
            priority: 'HIGH',
            message: `Claim estimate (${claim.estimatedAmount}) exceeds liability limit (${claim.policy.liabilityLimit})`,
            action: 'REVIEW_COVERAGE'
        });
    }

    // Check deductibles
    if (claim.policy?.collisionDeductible && claim.claimType === 'COLLISION') {
        insights.push(`Collision deductible: $${claim.policy.collisionDeductible}`);
    }

    return { warnings, insights };
}

function validateEstimate(claim: any) {
    const recommendations = [];
    const insights = [];

    // Basic reasonableness checks
    if (claim.claimType === 'COLLISION' && claim.vehicle?.year) {
        const vehicleAge = new Date().getFullYear() - claim.vehicle.year;
        if (vehicleAge > 10 && claim.estimatedAmount > 5000) {
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

function getReasonablenessScore(claim: any): number {
    let score = 5; // baseline

    // Adjust based on factors
    if (claim.vehicle?.year && claim.vehicle.year > 2015) score += 1;
    if (claim.policy?.deductibles) score += 1;
    if (claim.incidentDate) {
        const daysSince = (Date.now() - new Date(claim.incidentDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) score += 1; // recent claims more reliable
    }

    return Math.min(10, Math.max(1, score));
}

function basicFraudCheck(claim: any) {
    const flags = [];

    // Simple checks
    if (claim.estimatedAmount > 50000) {
        flags.push('high_dollar_amount');
    }

    if (!claim.policeReportNum && claim.claimType === 'COLLISION') {
        flags.push('missing_police_report');
    }

    return { flags };
}