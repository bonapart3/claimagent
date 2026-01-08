// src/lib/agents/fraud/patternDetector.ts
// Agent C1: Fraud Pattern Detection

import { ClaimData, ClaimStatus } from '@/lib/types/claim';
import { FRAUD_THRESHOLD } from '@/lib/constants/thresholds';

export interface PatternScore {
    score: number;
    indicators: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface FraudPattern {
    type: string;
    severity: string;
    description: string;
    indicators: string[];
    detectedAt: string;
}

export class PatternDetector {
    /**
     * Analyze claim for fraud patterns
     */
    async analyze(claim: any): Promise<PatternScore> {
        let score = 0;
        const indicators: string[] = [];

        // Check for repeat claimant patterns
        const repeatPatterns = await this.checkRepeatClaimant(claim);
        score += repeatPatterns.score;
        indicators.push(...repeatPatterns.indicators);

        // Check for suspicious timing
        const timingPatterns = this.checkSuspiciousTiming(claim);
        score += timingPatterns.score;
        indicators.push(...timingPatterns.indicators);

        // Check for location patterns
        const locationPatterns = await this.checkLocationPatterns(claim);
        score += locationPatterns.score;
        indicators.push(...locationPatterns.indicators);

        // Check for vehicle patterns
        const vehiclePatterns = await this.checkVehiclePatterns(claim);
        score += vehiclePatterns.score;
        indicators.push(...vehiclePatterns.indicators);

        // Cap score at 100
        score = Math.min(score, 100);

        // Determine risk level
        let riskLevel: PatternScore['riskLevel'];
        if (score >= FRAUD_THRESHOLD.CRITICAL) {
            riskLevel = 'CRITICAL';
        } else if (score >= FRAUD_THRESHOLD.HIGH) {
            riskLevel = 'HIGH';
        } else if (score >= FRAUD_THRESHOLD.MEDIUM) {
            riskLevel = 'MEDIUM';
        } else {
            riskLevel = 'LOW';
        }

        return { score, indicators, riskLevel };
    }

    /**
     * Check for repeat claimant patterns
     */
    private async checkRepeatClaimant(claim: any): Promise<{ score: number; indicators: string[] }> {
        const score = 0;
        const indicators: string[] = [];

        // In production, query database for prior claims
        // This is a placeholder for the pattern detection logic

        return { score, indicators };
    }

    /**
     * Check for suspicious timing patterns
     */
    private checkSuspiciousTiming(claim: any): { score: number; indicators: string[] } {
        let score = 0;
        const indicators: string[] = [];

        if (claim.policy && claim.lossDate) {
            const policyStart = new Date(claim.policy.effectiveDate);
            const lossDate = new Date(claim.lossDate);
            const daysSincePolicyStart = Math.floor(
                (lossDate.getTime() - policyStart.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Claim within 30 days of policy start
            if (daysSincePolicyStart <= 30) {
                score += 20;
                indicators.push('Claim occurred within 30 days of policy effective date');
            }

            // Claim within 7 days of policy start - higher risk
            if (daysSincePolicyStart <= 7) {
                score += 15;
                indicators.push('Claim occurred within 7 days of policy effective date');
            }
        }

        // Late reporting check
        if (claim.reportedDate && claim.lossDate) {
            const lossDate = new Date(claim.lossDate);
            const reportDate = new Date(claim.reportedDate);
            const daysBetween = Math.floor(
                (reportDate.getTime() - lossDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysBetween > 30) {
                score += 15;
                indicators.push(`Claim reported ${daysBetween} days after incident`);
            }
        }

        return { score, indicators };
    }

    /**
     * Check for location-based fraud patterns
     */
    private async checkLocationPatterns(claim: any): Promise<{ score: number; indicators: string[] }> {
        let score = 0;
        const indicators: string[] = [];

        // In production, check against known fraud hotspots
        const suspiciousLocations = [
            'parking lot',
            'parking garage',
            'staged',
        ];

        if (claim.lossLocation) {
            const lossLocationLower = claim.lossLocation.toLowerCase();
            for (const keyword of suspiciousLocations) {
                if (lossLocationLower.includes(keyword)) {
                    score += 10;
                    indicators.push(`Loss location contains keyword: ${keyword}`);
                }
            }
        }

        return { score, indicators };
    }

    /**
     * Check for vehicle-related fraud patterns
     */
    private async checkVehiclePatterns(claim: any): Promise<{ score: number; indicators: string[] }> {
        let score = 0;
        const indicators: string[] = [];

        if (claim.vehicle) {
            // Check for salvage title indicators
            if (claim.vehicle.titleType === 'SALVAGE' || claim.vehicle.titleType === 'REBUILT') {
                score += 15;
                indicators.push('Vehicle has salvage or rebuilt title');
            }

            // Check for very high value claims on older vehicles
            const currentYear = new Date().getFullYear();
            const vehicleAge = currentYear - (claim.vehicle.year || currentYear);

            if (vehicleAge > 10 && claim.estimatedAmount > 20000) {
                score += 20;
                indicators.push(`High claim amount ($${claim.estimatedAmount}) on ${vehicleAge}-year-old vehicle`);
            }
        }

        return { score, indicators };
    }
}

export const patternDetector = new PatternDetector();

