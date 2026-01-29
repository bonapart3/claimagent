// src/lib/agents/fraud/patternDetector.ts
// Agent C1: Fraud Pattern Detection

import { ClaimData, ClaimStatus } from '@/lib/types/claim';
import { FRAUD_THRESHOLD } from '@/lib/constants/thresholds';
import { prisma } from '@/lib/utils/database';

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
     * Check for repeat claimant patterns by querying database
     */
    private async checkRepeatClaimant(claim: any): Promise<{ score: number; indicators: string[] }> {
        let score = 0;
        const indicators: string[] = [];

        try {
            // Get policy holder info to find related claims
            const policyId = claim.policyId || claim.policy?.id;
            if (!policyId) return { score, indicators };

            // Get the policy to find the holder
            const policy = await prisma.policy.findUnique({
                where: { id: policyId },
                select: {
                    holderEmail: true,
                    holderPhone: true,
                    holderFirstName: true,
                    holderLastName: true,
                },
            });

            if (!policy) return { score, indicators };

            // Query for prior claims from same policyholder (by email or name)
            const priorClaims = await prisma.claim.findMany({
                where: {
                    id: { not: claim.id }, // Exclude current claim
                    policy: {
                        OR: [
                            { holderEmail: policy.holderEmail },
                            {
                                AND: [
                                    { holderFirstName: policy.holderFirstName },
                                    { holderLastName: policy.holderLastName },
                                ],
                            },
                        ],
                    },
                },
                select: {
                    id: true,
                    claimNumber: true,
                    status: true,
                    createdAt: true,
                    lossType: true,
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            // Score based on prior claim count
            const claimCount = priorClaims.length;
            if (claimCount >= 5) {
                score += 30;
                indicators.push(`Claimant has ${claimCount} prior claims in system`);
            } else if (claimCount >= 3) {
                score += 20;
                indicators.push(`Claimant has ${claimCount} prior claims in system`);
            } else if (claimCount >= 1) {
                score += 10;
                indicators.push(`Claimant has ${claimCount} prior claim(s) in system`);
            }

            // Check for claims within last 12 months
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const recentClaims = priorClaims.filter(c => c.createdAt > oneYearAgo);

            if (recentClaims.length >= 2) {
                score += 15;
                indicators.push(`${recentClaims.length} claims filed within last 12 months`);
            }

            // Check for denied/fraud-flagged prior claims
            const flaggedClaims = priorClaims.filter(
                c => c.status === 'CLOSED' || (c.status as string) === 'FLAGGED_FRAUD'
            );

            if (flaggedClaims.length > 0) {
                score += 25;
                indicators.push(`${flaggedClaims.length} prior claim(s) were denied or flagged for fraud`);
            }

        } catch (error) {
            console.error('[PatternDetector] Error checking repeat claimant:', error);
            // Don't fail the analysis, just return no score for this check
        }

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

