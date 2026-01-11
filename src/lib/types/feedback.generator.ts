/**
 * ClaimAgent™ - Underwriting Feedback Generator (Agent F2)
 * 
 * Responsibilities:
 * - Generate underwriting insights from claims data
 * - Identify profitable/unprofitable segments
 * - Risk segmentation analysis
 * - Rating factor validation
 * - Portfolio optimization recommendations
 * 
 * @module agents/analytics/feedbackGenerator
 */

import { Claim } from '@/lib/types/claim';
import { Policy } from '@/lib/types/policy';
import { auditLog } from '@/lib/utils/auditLogger';

export interface UnderwritingFeedbackRequest {
    claims: Claim[];
    policies: Policy[];
    timeframe: {
        startDate: Date;
        endDate: Date;
    };
}

export interface UnderwritingFeedbackResult {
    executiveSummary: string;
    segmentAnalysis: SegmentAnalysis[];
    riskFactorValidation: RiskFactorAnalysis[];
    recommendations: UnderwritingRecommendation[];
    profitableNiches: ProfitableNiche[];
    unprofitableSegments: UnprofitableSegment[];
}

export interface SegmentAnalysis {
    segment: string;
    criteria: string;
    policyCount: number;
    claimCount: number;
    frequency: number;
    severity: number;
    lossRatio: number;
    profitability: 'highly_profitable' | 'profitable' | 'marginal' | 'unprofitable';
}

export interface RiskFactorAnalysis {
    factor: string;
    expectedImpact: number;
    actualImpact: number;
    variance: number;
    recommendation: string;
}

export interface UnderwritingRecommendation {
    priority: 'immediate' | 'high' | 'medium' | 'low';
    category: string;
    finding: string;
    action: string;
    expectedOutcome: string;
}

export interface ProfitableNiche {
    description: string;
    characteristics: string[];
    policyCount: number;
    lossRatio: number;
    growthOpportunity: string;
}

export interface UnprofitableSegment {
    description: string;
    characteristics: string[];
    policyCount: number;
    lossRatio: number;
    actionRequired: string;
}

export class UnderwritingFeedbackGenerator {
    private readonly agentId = 'AGENT_F2_UW_FEEDBACK';

    /**
     * Generate comprehensive underwriting feedback
     */
    async generateFeedback(
        request: UnderwritingFeedbackRequest
    ): Promise<UnderwritingFeedbackResult> {
        try {
            auditLog({
                agentId: this.agentId,
                action: 'FEEDBACK_GENERATION_START',
                timestamp: new Date(),
                metadata: {
                    claimCount: request.claims.length,
                    policyCount: request.policies.length,
                },
            });

            const segmentAnalysis = this.analyzeSegments(request);
            const riskFactorValidation = this.validateRiskFactors(request);
            const profitableNiches = this.identifyProfitableNiches(segmentAnalysis);
            const unprofitableSegments = this.identifyUnprofitableSegments(segmentAnalysis);
            const recommendations = this.generateRecommendations({
                segmentAnalysis,
                riskFactorValidation,
                profitableNiches,
                unprofitableSegments,
            });
            const executiveSummary = this.createExecutiveSummary({
                segmentAnalysis,
                recommendations,
                profitableNiches,
                unprofitableSegments,
            });

            const result: UnderwritingFeedbackResult = {
                executiveSummary,
                segmentAnalysis,
                riskFactorValidation,
                recommendations,
                profitableNiches,
                unprofitableSegments,
            };

            auditLog({
                agentId: this.agentId,
                action: 'FEEDBACK_GENERATION_COMPLETE',
                timestamp: new Date(),
            });

            return result;
        } catch (error) {
            auditLog({
                agentId: this.agentId,
                action: 'FEEDBACK_GENERATION_ERROR',
                timestamp: new Date(),
                metadata: { error: error.message },
            });
            throw error;
        }
    }

    /**
     * Analyze segments
     */
    private analyzeSegments(request: UnderwritingFeedbackRequest): SegmentAnalysis[] {
        const segments: SegmentAnalysis[] = [];

        // Segment by vehicle age
        const vehicleAgeSegments = [
            { label: '0-3 years', min: 0, max: 3 },
            { label: '4-7 years', min: 4, max: 7 },
            { label: '8-12 years', min: 8, max: 12 },
            { label: '13+ years', min: 13, max: 999 },
        ];

        vehicleAgeSegments.forEach((ageGroup) => {
            const policies = request.policies.filter((p) => {
                const vehicleAge = new Date().getFullYear() - (p.vehicles[0]?.year || 2020);
                return vehicleAge >= ageGroup.min && vehicleAge <= ageGroup.max;
            });

            // Use Set for O(1) lookup instead of O(n) .some()
            const policyNumbers = new Set(policies.map(p => p.policyNumber));
            const claims = request.claims.filter((c) => policyNumbers.has(c.policyNumber));

            const frequency = (claims.length / policies.length) * 100;
            const severity = claims.reduce((sum, c) => sum + (c.amountPaid || 0), 0) / claims.length || 0;
            const earnedPremium = policies.reduce((sum, p) => sum + (p.premium?.total || 0), 0);
            const incurredLoss = claims.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
            const lossRatio = (incurredLoss / earnedPremium) * 100 || 0;

            segments.push({
                segment: `Vehicle Age: ${ageGroup.label}`,
                criteria: `Vehicle model year ${ageGroup.min}-${ageGroup.max} years old`,
                policyCount: policies.length,
                claimCount: claims.length,
                frequency,
                severity,
                lossRatio,
                profitability: this.categorizeProfitability(lossRatio),
            });
        });

        // Segment by driver age
        const driverAgeSegments = [
            { label: '16-24', min: 16, max: 24 },
            { label: '25-34', min: 25, max: 34 },
            { label: '35-54', min: 35, max: 54 },
            { label: '55+', min: 55, max: 999 },
        ];

        driverAgeSegments.forEach((ageGroup) => {
            const policies = request.policies.filter((p) => {
                const driverAge = new Date().getFullYear() - new Date(p.namedInsured.dateOfBirth).getFullYear();
                return driverAge >= ageGroup.min && driverAge <= ageGroup.max;
            });

            // Use Set for O(1) lookup instead of O(n) .some()
            const policyNumbers = new Set(policies.map(p => p.policyNumber));
            const claims = request.claims.filter((c) => policyNumbers.has(c.policyNumber));

            const frequency = (claims.length / policies.length) * 100;
            const severity = claims.reduce((sum, c) => sum + (c.amountPaid || 0), 0) / claims.length || 0;
            const earnedPremium = policies.reduce((sum, p) => sum + (p.premium?.total || 0), 0);
            const incurredLoss = claims.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
            const lossRatio = (incurredLoss / earnedPremium) * 100 || 0;

            segments.push({
                segment: `Driver Age: ${ageGroup.label}`,
                criteria: `Primary driver age ${ageGroup.min}-${ageGroup.max}`,
                policyCount: policies.length,
                claimCount: claims.length,
                frequency,
                severity,
                lossRatio,
                profitability: this.categorizeProfitability(lossRatio),
            });
        });

        return segments;
    }

    /**
     * Validate risk factors
     */
    private validateRiskFactors(request: UnderwritingFeedbackRequest): RiskFactorAnalysis[] {
        const analyses: RiskFactorAnalysis[] = [];

        // Factor 1: Prior accidents
        const withPriorAccidents = request.policies.filter((p) =>
            p.drivers.some((d) => (d.accidentsLast3Years || 0) > 0)
        );
        const noPriorAccidents = request.policies.filter((p) =>
            p.drivers.every((d) => (d.accidentsLast3Years || 0) === 0)
        );

        // Use Sets for O(1) lookup instead of O(n) .some()
        const withPriorPolicyNumbers = new Set(withPriorAccidents.map(p => p.policyNumber));
        const noPriorPolicyNumbers = new Set(noPriorAccidents.map(p => p.policyNumber));
        const withPriorClaims = request.claims.filter((c) => withPriorPolicyNumbers.has(c.policyNumber));
        const noPriorClaims = request.claims.filter((c) => noPriorPolicyNumbers.has(c.policyNumber));

        const withPriorFreq = (withPriorClaims.length / withPriorAccidents.length) * 100 || 0;
        const noPriorFreq = (noPriorClaims.length / noPriorAccidents.length) * 100 || 0;

        analyses.push({
            factor: 'Prior Accidents',
            expectedImpact: 50, // 50% increase expected
            actualImpact: ((withPriorFreq - noPriorFreq) / noPriorFreq) * 100,
            variance: 0, // Calculated below
            recommendation: '',
        });
        analyses[0].variance = analyses[0].actualImpact - analyses[0].expectedImpact;
        analyses[0].recommendation =
            analyses[0].variance > 10
                ? 'Prior accident factor is stronger than expected - consider increasing rating factor'
                : 'Prior accident rating factor is appropriate';

        return analyses;
    }

    /**
     * Identify profitable niches
     */
    private identifyProfitableNiches(segments: SegmentAnalysis[]): ProfitableNiche[] {
        const profitable = segments
            .filter((s) => s.profitability === 'highly_profitable' || s.profitability === 'profitable')
            .slice(0, 3);

        return profitable.map((s) => ({
            description: s.segment,
            characteristics: [s.criteria, `Loss ratio: ${s.lossRatio.toFixed(1)}%`],
            policyCount: s.policyCount,
            lossRatio: s.lossRatio,
            growthOpportunity: `Potential to grow this segment by 20-30% while maintaining profitability`,
        }));
    }

    /**
     * Identify unprofitable segments
     */
    private identifyUnprofitableSegments(
        segments: SegmentAnalysis[]
    ): UnprofitableSegment[] {
        const unprofitable = segments
            .filter((s) => s.profitability === 'unprofitable')
            .slice(0, 3);

        return unprofitable.map((s) => ({
            description: s.segment,
            characteristics: [s.criteria, `Loss ratio: ${s.lossRatio.toFixed(1)}%`],
            policyCount: s.policyCount,
            lossRatio: s.lossRatio,
            actionRequired:
                s.lossRatio > 100
                    ? 'Implement rate increase of 15-20% or tighten underwriting'
                    : 'Monitor closely and consider rate adjustment',
        }));
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(data: {
        segmentAnalysis: SegmentAnalysis[];
        riskFactorValidation: RiskFactorAnalysis[];
        profitableNiches: ProfitableNiche[];
        unprofitableSegments: UnprofitableSegment[];
    }): UnderwritingRecommendation[] {
        const recommendations: UnderwritingRecommendation[] = [];

        // Unprofitable segment recommendations
        data.unprofitableSegments.forEach((segment) => {
            recommendations.push({
                priority: segment.lossRatio > 120 ? 'immediate' : 'high',
                category: 'Rate Adequacy',
                finding: `${segment.description} has loss ratio of ${segment.lossRatio.toFixed(1)}%`,
                action: segment.actionRequired,
                expectedOutcome: `Improve loss ratio to 70-75% range`,
            });
        });

        // Profitable niche recommendations
        data.profitableNiches.slice(0, 2).forEach((niche) => {
            recommendations.push({
                priority: 'medium',
                category: 'Growth Opportunity',
                finding: `${niche.description} performing well (loss ratio: ${niche.lossRatio.toFixed(1)}%)`,
                action: niche.growthOpportunity,
                expectedOutcome: 'Increase profitable premium volume',
            });
        });

        // Risk factor recommendations
        data.riskFactorValidation.forEach((factor) => {
            if (Math.abs(factor.variance) > 10) {
                recommendations.push({
                    priority: 'high',
                    category: 'Rating Factor',
                    finding: `${factor.factor} variance of ${factor.variance.toFixed(1)}%`,
                    action: factor.recommendation,
                    expectedOutcome: 'Improve rate adequacy and selection',
                });
            }
        });

        return recommendations.sort((a, b) => {
            const priorityOrder = { immediate: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * Create executive summary
     */
    private createExecutiveSummary(data: {
        segmentAnalysis: SegmentAnalysis[];
        recommendations: UnderwritingRecommendation[];
        profitableNiches: ProfitableNiche[];
        unprofitableSegments: UnprofitableSegment[];
    }): string {
        const sections: string[] = [];

        sections.push('UNDERWRITING FEEDBACK - EXECUTIVE SUMMARY\n');

        // Overall performance
        const avgLossRatio =
            data.segmentAnalysis.reduce((sum, s) => sum + s.lossRatio, 0) /
            data.segmentAnalysis.length;
        sections.push(`Portfolio Average Loss Ratio: ${avgLossRatio.toFixed(1)}%`);
        sections.push(`Profitable Segments Identified: ${data.profitableNiches.length}`);
        sections.push(`Unprofitable Segments Identified: ${data.unprofitableSegments.length}\n`);

        // Key findings
        sections.push('KEY FINDINGS:');
        if (data.profitableNiches.length > 0) {
            sections.push(
                `✓ ${data.profitableNiches[0].description} is highly profitable (LR: ${data.profitableNiches[0].lossRatio.toFixed(1)}%)`
            );
        }
        if (data.unprofitableSegments.length > 0) {
            sections.push(
                `⚠ ${data.unprofitableSegments[0].description} requires immediate attention (LR: ${data.unprofitableSegments[0].lossRatio.toFixed(1)}%)`
            );
        }
        sections.push('');

        // Priority actions
        sections.push('PRIORITY ACTIONS:');
        const immediateActions = data.recommendations.filter((r) => r.priority === 'immediate' || r.priority === 'high');
        immediateActions.slice(0, 3).forEach((rec, idx) => {
            sections.push(`${idx + 1}. [${rec.priority.toUpperCase()}] ${rec.action}`);
        });

        return sections.join('\n');
    }

    /**
     * Categorize profitability
     */
    private categorizeProfitability(
        lossRatio: number
    ): 'highly_profitable' | 'profitable' | 'marginal' | 'unprofitable' {
        if (lossRatio < 60) return 'highly_profitable';
        if (lossRatio < 75) return 'profitable';
        if (lossRatio < 90) return 'marginal';
        return 'unprofitable';
    }
}

export const feedbackGenerator = new UnderwritingFeedbackGenerator();