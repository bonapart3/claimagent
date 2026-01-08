/**
 * ClaimAgent™ - Severity Scorer (Agent A3)
 * 
 * Responsibilities:
 * - Assess claim complexity and severity
 * - Score Property Damage vs Bodily Injury
 * - Identify total loss indicators
 * - Flag multi-vehicle and commercial claims
 * - Generate initial routing recommendations
 * 
 * @module agents/intake/severityScorer
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { AUTO_APPROVAL_LIMITS } from '@/lib/constants/thresholds';

export interface SeverityInput {
    claimId: string;
    claimType: 'collision' | 'comprehensive' | 'liability' | 'UM' | 'medical_payments';
    estimatedDamage: number;
    vehicleCount: number;
    injuryReported: boolean;
    injurySeverity?: 'minor' | 'moderate' | 'severe' | 'fatal';
    totalLossIndicator: boolean;
    airbagDeployment: boolean;
    vehicleAge: number;
    vehicleValue: number;
    priorClaims: number;
    policyholderId: string;
    state: string;
    isCommercialAuto: boolean;
    litigationIndicators: string[];
    passengerCount: number;
    propertyDamage: boolean;
    thirdPartyClaimants: number;
    telematicsData?: {
        speedAtImpact: number;
        harshBraking: boolean;
        suddenAcceleration: boolean;
    };
}

export interface SeverityScore {
    overallScore: number;
    complexityLevel: 'simple' | 'moderate' | 'complex' | 'critical';
    riskFactors: RiskFactor[];
    routingRecommendation: RoutingRecommendation;
    escalationRequired: boolean;
    escalationReasons: string[];
    estimatedCycleTime: number;
    requiredReviews: string[];
    priorityLevel: 'low' | 'medium' | 'high' | 'critical';
    confidenceScore: number;
    flags: SeverityFlag[];
}

interface RiskFactor {
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: number;
    mitigation?: string;
}

interface RoutingRecommendation {
    destination: 'auto_approval' | 'express_desk' | 'standard_adjuster' | 'senior_adjuster' | 'specialist' | 'legal_review' | 'siu';
    reasoning: string;
    alternativeRoutes: string[];
    requiredApprovals: string[];
}

interface SeverityFlag {
    type: 'total_loss' | 'bodily_injury' | 'multi_vehicle' | 'commercial' | 'litigation' | 'high_value' | 'sensor_zone' | 'fraud_indicator' | 'regulatory';
    severity: 'warning' | 'alert' | 'critical';
    message: string;
    actionRequired: string;
}

export class SeverityScorer {
    async scoreClaim(input: SeverityInput): Promise<SeverityScore> {
        await auditLog({
            action: 'SEVERITY_SCORING_INITIATED',
            entityType: 'claim',
            entityId: input.claimId,
            metadata: { claimType: input.claimType, estimatedDamage: input.estimatedDamage }
        });

        try {
            const damageScore = this.calculateDamageScore(input);
            const injuryScore = this.calculateInjuryScore(input);
            const complexityScore = this.calculateComplexityScore(input);
            const riskScore = this.calculateRiskScore(input);
            const litigationScore = this.calculateLitigationScore(input);

            const overallScore = Math.round(
                (damageScore * 0.25) +
                (injuryScore * 0.35) +
                (complexityScore * 0.20) +
                (riskScore * 0.15) +
                (litigationScore * 0.05)
            );

            const riskFactors = this.identifyRiskFactors(input, { damageScore, injuryScore, complexityScore, riskScore, litigationScore });
            const complexityLevel = this.determineComplexityLevel(overallScore, riskFactors);
            const flags = this.generateFlags(input, overallScore);
            const escalationCheck = this.checkEscalationRequired(input, overallScore, flags);
            const routingRecommendation = this.determineRouting(input, overallScore, complexityLevel, flags, escalationCheck.required);
            const estimatedCycleTime = this.estimateCycleTime(complexityLevel, escalationCheck.required);
            const requiredReviews = this.identifyRequiredReviews(input, flags);
            const priorityLevel = this.determinePriority(overallScore, escalationCheck.required, flags);
            const confidenceScore = this.calculateConfidence(input);

            const result: SeverityScore = {
                overallScore,
                complexityLevel,
                riskFactors,
                routingRecommendation,
                escalationRequired: escalationCheck.required,
                escalationReasons: escalationCheck.reasons,
                estimatedCycleTime,
                requiredReviews,
                priorityLevel,
                confidenceScore,
                flags
            };

            await auditLog({
                action: 'SEVERITY_SCORING_COMPLETED',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { overallScore, complexityLevel, routing: routingRecommendation.destination }
            });

            return result;

        } catch (error) {
            await auditLog({
                action: 'SEVERITY_SCORING_ERROR',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
            throw error;
        }
    }

    private calculateDamageScore(input: SeverityInput): number {
        let score = 0;

        if (input.estimatedDamage <= 1000) score += 10;
        else if (input.estimatedDamage <= 2500) score += 25;
        else if (input.estimatedDamage <= 5000) score += 40;
        else if (input.estimatedDamage <= 10000) score += 60;
        else if (input.estimatedDamage <= 25000) score += 80;
        else score += 95;

        if (input.totalLossIndicator) score = Math.max(score, 85);
        if (input.airbagDeployment) score += 15;

        if (input.vehicleValue > 0) {
            const damageRatio = input.estimatedDamage / input.vehicleValue;
            if (damageRatio > 0.75) score += 20;
            else if (damageRatio > 0.50) score += 15;
            else if (damageRatio > 0.25) score += 10;
        }

        return Math.min(score, 100);
    }

    private calculateInjuryScore(input: SeverityInput): number {
        if (!input.injuryReported) return 0;

        let score = 30;

        switch (input.injurySeverity) {
            case 'minor': score += 20; break;
            case 'moderate': score += 50; break;
            case 'severe': score += 80; break;
            case 'fatal': score = 100; break;
            default: score += 30;
        }

        score += Math.min(input.passengerCount * 10, 30);
        if (input.airbagDeployment) score += 10;

        return Math.min(score, 100);
    }

    private calculateComplexityScore(input: SeverityInput): number {
        let score = 0;

        if (input.vehicleCount > 1) score += 20;
        if (input.vehicleCount > 2) score += 30;
        if (input.vehicleCount > 4) score += 50;
        if (input.isCommercialAuto) score += 25;
        score += Math.min(input.thirdPartyClaimants * 15, 45);
        if (input.propertyDamage) score += 15;
        if (input.priorClaims > 2) score += 10;
        if (input.priorClaims > 4) score += 20;

        return Math.min(score, 100);
    }

    private calculateRiskScore(input: SeverityInput): number {
        let score = 0;

        if (input.telematicsData) {
            if (input.telematicsData.speedAtImpact > 50) score += 30;
            else if (input.telematicsData.speedAtImpact > 35) score += 20;
            if (input.telematicsData.harshBraking) score += 15;
            if (input.telematicsData.suddenAcceleration) score += 10;
        }

        if (input.vehicleValue > 75000) score += 20;
        else if (input.vehicleValue > 50000) score += 15;
        else if (input.vehicleValue > 35000) score += 10;

        if (input.vehicleAge <= 3 && input.estimatedDamage > 1000) score += 25;
        if (input.claimType === 'liability') score += 15;

        return Math.min(score, 100);
    }

    private calculateLitigationScore(input: SeverityInput): number {
        let score = 0;
        score += input.litigationIndicators.length * 30;
        if (input.litigationIndicators.some(i => i.toLowerCase().includes('attorney'))) score = 100;
        if (input.injurySeverity === 'severe' || input.injurySeverity === 'fatal') score += 40;
        return Math.min(score, 100);
    }

    private identifyRiskFactors(input: SeverityInput, scores: any): RiskFactor[] {
        const factors: RiskFactor[] = [];

        if (input.injuryReported) {
            factors.push({
                category: 'Bodily Injury',
                severity: input.injurySeverity === 'fatal' ? 'critical' : input.injurySeverity === 'severe' ? 'high' : 'medium',
                description: `${input.injurySeverity || 'unspecified'} injury reported with ${input.passengerCount} passengers`,
                impact: scores.injuryScore / 10,
                mitigation: 'Immediate medical documentation required'
            });
        }

        if (input.totalLossIndicator) {
            factors.push({
                category: 'Total Loss',
                severity: 'high',
                description: 'Vehicle identified as likely total loss',
                impact: 8,
                mitigation: 'Route to salvage specialist for valuation'
            });
        }

        if (input.vehicleCount > 1) {
            factors.push({
                category: 'Multi-Vehicle Incident',
                severity: input.vehicleCount > 3 ? 'high' : 'medium',
                description: `${input.vehicleCount} vehicles involved`,
                impact: Math.min(input.vehicleCount * 2, 10),
                mitigation: 'Detailed scene investigation required'
            });
        }

        if (input.isCommercialAuto) {
            factors.push({
                category: 'Commercial Auto',
                severity: 'high',
                description: 'Commercial vehicle claim with additional requirements',
                impact: 7,
                mitigation: 'Review commercial policy endorsements'
            });
        }

        if (input.litigationIndicators.length > 0) {
            factors.push({
                category: 'Litigation Risk',
                severity: 'critical',
                description: `${input.litigationIndicators.length} litigation indicators identified`,
                impact: 10,
                mitigation: 'Immediate legal review required'
            });
        }

        return factors;
    }

    private determineComplexityLevel(score: number, riskFactors: RiskFactor[]): 'simple' | 'moderate' | 'complex' | 'critical' {
        if (riskFactors.some(f => f.severity === 'critical')) return 'critical';
        if (score >= 80) return 'critical';
        if (score >= 60) return 'complex';
        if (score >= 35) return 'moderate';
        return 'simple';
    }

    private generateFlags(input: SeverityInput, score: number): SeverityFlag[] {
        const flags: SeverityFlag[] = [];

        if (input.totalLossIndicator) {
            flags.push({ type: 'total_loss', severity: 'alert', message: 'Vehicle identified as total loss', actionRequired: 'Route to salvage specialist' });
        }

        if (input.injuryReported) {
            flags.push({
                type: 'bodily_injury',
                severity: input.injurySeverity === 'fatal' ? 'critical' : input.injurySeverity === 'severe' ? 'alert' : 'warning',
                message: `${input.injurySeverity || 'Unspecified'} bodily injury reported`,
                actionRequired: 'Obtain medical documentation'
            });
        }

        if (input.vehicleCount > 1) {
            flags.push({ type: 'multi_vehicle', severity: input.vehicleCount > 3 ? 'alert' : 'warning', message: `${input.vehicleCount} vehicles involved`, actionRequired: 'Coordinate investigations' });
        }

        if (input.isCommercialAuto) {
            flags.push({ type: 'commercial', severity: 'alert', message: 'Commercial auto claim requires specialized handling', actionRequired: 'Review commercial policy' });
        }

        if (input.litigationIndicators.length > 0) {
            flags.push({ type: 'litigation', severity: 'critical', message: 'Litigation indicators present', actionRequired: 'Immediate legal review' });
        }

        if (input.vehicleAge <= 5 && input.estimatedDamage > 1000) {
            flags.push({ type: 'sensor_zone', severity: 'warning', message: 'Modern vehicle may have ADAS damage', actionRequired: 'Ensure OEM calibration' });
        }

        return flags;
    }

    private checkEscalationRequired(input: SeverityInput, score: number, flags: SeverityFlag[]): { required: boolean; reasons: string[] } {
        const reasons: string[] = [];

        if (score >= 80) reasons.push('Overall severity score exceeds critical threshold');
        if (input.injurySeverity === 'fatal') reasons.push('Fatality involved');
        if (input.litigationIndicators.length > 0) reasons.push('Litigation indicators present');
        if (input.estimatedDamage > AUTO_APPROVAL_LIMITS.maxClaimAmount * 3) reasons.push('Claim value significantly exceeds limits');

        const criticalFlags = flags.filter(f => f.severity === 'critical');
        if (criticalFlags.length >= 2) reasons.push('Multiple critical risk factors');

        return { required: reasons.length > 0, reasons };
    }

    private determineRouting(input: SeverityInput, score: number, complexity: string, flags: SeverityFlag[], escalationRequired: boolean): RoutingRecommendation {
        if (escalationRequired) {
            return {
                destination: input.litigationIndicators.length > 0 ? 'legal_review' : 'senior_adjuster',
                reasoning: 'Critical severity requires senior review',
                alternativeRoutes: [],
                requiredApprovals: ['Senior Adjuster', 'Claims Manager']
            };
        }

        if (input.totalLossIndicator) {
            return { destination: 'specialist', reasoning: 'Total loss requires salvage specialist', alternativeRoutes: ['senior_adjuster'], requiredApprovals: ['Total Loss Specialist'] };
        }

        if (input.injuryReported) {
            return { destination: input.injurySeverity === 'severe' ? 'senior_adjuster' : 'standard_adjuster', reasoning: 'Bodily injury requires human assessment', alternativeRoutes: [], requiredApprovals: ['Claims Adjuster'] };
        }

        if (score <= 35 && complexity === 'simple' && input.estimatedDamage <= AUTO_APPROVAL_LIMITS.maxClaimAmount && !input.injuryReported && input.vehicleCount === 1 && !input.isCommercialAuto) {
            return { destination: 'auto_approval', reasoning: 'Low complexity eligible for automation', alternativeRoutes: ['express_desk'], requiredApprovals: [] };
        }

        return { destination: 'standard_adjuster', reasoning: 'Standard complexity requires review', alternativeRoutes: ['express_desk'], requiredApprovals: ['Claims Adjuster'] };
    }

    private estimateCycleTime(complexity: string, escalated: boolean): number {
        if (escalated) return 72;
        switch (complexity) {
            case 'simple': return 4;
            case 'moderate': return 24;
            case 'complex': return 48;
            case 'critical': return 72;
            default: return 24;
        }
    }

    private identifyRequiredReviews(input: SeverityInput, flags: SeverityFlag[]): string[] {
        const reviews: Set<string> = new Set();
        if (input.injuryReported) reviews.add('Medical Review');
        if (input.totalLossIndicator) reviews.add('Total Loss Valuation');
        if (input.litigationIndicators.length > 0) reviews.add('Legal Review');
        if (input.isCommercialAuto) reviews.add('Commercial Lines Review');
        if (flags.some(f => f.type === 'sensor_zone')) reviews.add('ADAS Calibration Review');
        if (input.thirdPartyClaimants > 0) reviews.add('Liability Assessment');
        return Array.from(reviews);
    }

    private determinePriority(score: number, escalated: boolean, flags: SeverityFlag[]): 'low' | 'medium' | 'high' | 'critical' {
        if (escalated) return 'critical';
        if (flags.some(f => f.severity === 'critical')) return 'critical';
        if (score >= 80) return 'critical';
        if (score >= 60) return 'high';
        if (score >= 35) return 'medium';
        return 'low';
    }

    private calculateConfidence(input: SeverityInput): number {
        let confidence = 100;
        if (!input.injurySeverity && input.injuryReported) confidence -= 15;
        if (!input.telematicsData) confidence -= 10;
        if (input.estimatedDamage === 0) confidence -= 20;
        if (input.vehicleValue === 0) confidence -= 10;
        if (input.telematicsData) confidence += 5;
        return Math.max(Math.min(confidence, 100), 0);
    }
}

export default SeverityScorer;

