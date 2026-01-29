// src/lib/agents/evaluation/coverageCalculator.ts
// Agent D2: Coverage Calculator - Determines applicable coverage limits and deductibles

import { ClaimData, ClaimType } from '@/lib/types/claim';
import { Policy, Coverage, CoverageType } from '@/lib/types/policy';
import { AgentResult, AgentRole, SimpleEscalation, CoverageAnalysis } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface CoverageApplicability {
    coverageType: CoverageType;
    isApplicable: boolean;
    limit: number;
    deductible?: number;
    remaining: number;
    reason: string;
}

interface CoverageRecommendation {
    primaryCoverage: CoverageType;
    alternativeCoverages: CoverageType[];
    totalAvailable: number;
    totalDeductibles: number;
    stackingAllowed: boolean;
}

export class CoverageCalculator {
    private readonly agentId = AgentRole.COVERAGE_CALCULATOR;

    async analyze(claimData: ClaimData, policy: Policy): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];

        try {
            // Step 1: Validate policy is active
            const policyStatus = this.validatePolicyStatus(policy, claimData.lossDate);
            if (!policyStatus.valid) {
                return {
                    agentId: this.agentId,
                    success: false,
                    error: policyStatus.reason,
                    processingTime: Date.now() - startTime,
                    escalations: [{
                        type: 'COVERAGE_ISSUE',
                        reason: policyStatus.reason,
                        severity: 'HIGH',
                    }],
                };
            }

            // Step 2: Determine applicable coverages
            const applicableCoverages = await this.determineApplicableCoverages(
                claimData,
                policy.coverages
            );

            // Step 3: Calculate coverage limits
            const coverageLimits = this.calculateCoverageLimits(applicableCoverages);

            // Step 4: Check for coverage gaps
            const gaps = this.identifyCoverageGaps(claimData, applicableCoverages);
            if (gaps.length > 0) {
                escalations.push({
                    type: 'COVERAGE_GAP',
                    reason: `Coverage gaps identified: ${gaps.join(', ')}`,
                    severity: 'MEDIUM',
                });
            }

            // Step 5: Determine coverage recommendation
            const recommendation = this.buildCoverageRecommendation(applicableCoverages, claimData);

            // Step 6: Check for policy limits concerns
            if (recommendation.totalAvailable < (claimData.estimatedAmount || 0)) {
                escalations.push({
                    type: 'LIMITS_CONCERN',
                    reason: 'Estimated damages may exceed available coverage',
                    severity: 'HIGH',
                });
            }

            // Step 7: Build coverage analysis
            const coverageAnalysis: CoverageAnalysis = {
                claimId: claimData.id,
                policyId: policy.id,
                analysisDate: new Date().toISOString(),
                applicableCoverages,
                recommendation,
                gaps,
                policyLimits: {
                    perOccurrence: policy.limits?.perOccurrence || 0,
                    aggregate: policy.limits?.aggregate || 0,
                    usedAggregate: policy.limits?.usedAggregate || 0,
                },
                deductibleApplicable: recommendation.totalDeductibles,
                netCoverageAvailable: recommendation.totalAvailable - recommendation.totalDeductibles,
            };

            // Log audit
            await auditLog({
                claimId: claimData.id,
                action: 'COVERAGE_ANALYSIS_COMPLETED',
                agentId: this.agentId,
                description: `Coverage analysis: $${(coverageAnalysis.netCoverageAvailable ?? 0).toLocaleString()} available`,
                details: { coverage: coverageAnalysis },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: coverageAnalysis,
                confidence: this.calculateConfidence(applicableCoverages),
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: this.generateRecommendations(coverageAnalysis, claimData),
            };
        } catch (error) {
            console.error('Coverage calculation error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Coverage calculation failed',
                processingTime: Date.now() - startTime,
                escalations: [{
                    type: 'SYSTEM_ERROR',
                    reason: 'Coverage calculation system failure',
                    severity: 'HIGH',
                }],
            };
        }
    }

    private validatePolicyStatus(
        policy: Policy,
        lossDate: string | Date
    ): { valid: boolean; reason: string } {
        const loss = new Date(lossDate);
        const effective = new Date(policy.effectiveDate);
        const expiration = new Date(policy.expirationDate);

        // Check if policy was active at time of loss
        if (loss < effective) {
            return {
                valid: false,
                reason: `Loss occurred before policy effective date (${effective.toLocaleDateString()})`,
            };
        }

        if (loss > expiration) {
            return {
                valid: false,
                reason: `Loss occurred after policy expiration date (${expiration.toLocaleDateString()})`,
            };
        }

        // Check policy status (support both uppercase and lowercase)
        const status = policy.status.toUpperCase();
        if (status === 'CANCELLED') {
            return {
                valid: false,
                reason: 'Policy was cancelled',
            };
        }

        if (status === 'SUSPENDED') {
            return {
                valid: false,
                reason: 'Policy was suspended at time of loss',
            };
        }

        if (status === 'LAPSED') {
            return {
                valid: false,
                reason: 'Policy was lapsed due to non-payment',
            };
        }

        return { valid: true, reason: 'Policy active at time of loss' };
    }

    private async determineApplicableCoverages(
        claimData: ClaimData,
        coverages: Coverage[]
    ): Promise<CoverageApplicability[]> {
        return coverages.map(coverage => {
            const applicability = this.checkCoverageApplicability(coverage, claimData);

            return {
                coverageType: coverage.type,
                isApplicable: applicability.applicable,
                limit: coverage.limit,
                deductible: coverage.deductible,
                remaining: coverage.limit - (coverage.usedAmount || 0),
                reason: applicability.reason,
            };
        });
    }

    private checkCoverageApplicability(
        coverage: Coverage,
        claimData: ClaimData
    ): { applicable: boolean; reason: string } {
        const claimType = claimData.claimType;

        // Map claim types to coverage types
        const coverageMapping: Record<string, CoverageType[]> = {
            COLLISION: ['COLLISION', 'COMPREHENSIVE'],
            COMPREHENSIVE: ['COMPREHENSIVE'],
            LIABILITY: ['LIABILITY', 'PROPERTY_DAMAGE', 'BODILY_INJURY'],
            UNINSURED_MOTORIST: ['UNINSURED_MOTORIST', 'UNDERINSURED_MOTORIST'],
            MEDICAL_PAYMENTS: ['MEDICAL_PAYMENTS', 'PIP'],
            PROPERTY_DAMAGE: ['PROPERTY_DAMAGE', 'LIABILITY'],
            BODILY_INJURY: ['BODILY_INJURY', 'MEDICAL_PAYMENTS', 'PIP'],
            THEFT: ['COMPREHENSIVE'],
            VANDALISM: ['COMPREHENSIVE'],
            WEATHER: ['COMPREHENSIVE'],
            GLASS: ['COMPREHENSIVE', 'GLASS'],
        };

        const applicableTypes = coverageMapping[claimType] || [];

        if (applicableTypes.includes(coverage.type)) {
            // Check for coverage-specific exclusions
            const exclusion = this.checkExclusions(coverage, claimData);
            if (exclusion) {
                return { applicable: false, reason: exclusion };
            }

            return {
                applicable: true,
                reason: `${coverage.type} coverage applies to ${claimType} claims`
            };
        }

        return {
            applicable: false,
            reason: `${coverage.type} coverage does not apply to ${claimType} claims`
        };
    }

    private checkExclusions(coverage: Coverage, claimData: ClaimData): string | null {
        // Check common exclusions

        // Racing or speed contest exclusion
        if (claimData.lossDescription?.toLowerCase().includes('racing') ||
            claimData.lossDescription?.toLowerCase().includes('speed contest')) {
            return 'Racing or speed contest exclusion applies';
        }

        // Intentional damage exclusion
        if (claimData.lossDescription?.toLowerCase().includes('intentional')) {
            return 'Intentional damage exclusion applies';
        }

        // Commercial use exclusion (for personal policies)
        if (claimData.vehicleUsage === 'COMMERCIAL' && coverage.personalOnly) {
            return 'Commercial use exclusion applies';
        }

        // Unlicensed driver exclusion
        if (claimData.driverUnlicensed) {
            return 'Unlicensed driver exclusion applies';
        }

        // DUI exclusion (some coverages)
        if (claimData.driverIntoxicated && coverage.type === 'COLLISION') {
            return 'Intoxicated driver may affect coverage';
        }

        return null;
    }

    private calculateCoverageLimits(
        coverages: CoverageApplicability[]
    ): Map<CoverageType, { limit: number; deductible: number; remaining: number }> {
        const limits = new Map();

        for (const coverage of coverages) {
            if (coverage.isApplicable) {
                limits.set(coverage.coverageType, {
                    limit: coverage.limit,
                    deductible: coverage.deductible,
                    remaining: coverage.remaining,
                });
            }
        }

        return limits;
    }

    private identifyCoverageGaps(
        claimData: ClaimData,
        coverages: CoverageApplicability[]
    ): string[] {
        const gaps: string[] = [];

        // Check for injury claims without medical coverage
        if (claimData.injuries) {
            const hasMedical = coverages.some(
                c => c.isApplicable &&
                    ['MEDICAL_PAYMENTS', 'PIP', 'BODILY_INJURY'].includes(c.coverageType)
            );
            if (!hasMedical) {
                gaps.push('No applicable medical/injury coverage');
            }
        }

        // Check for rental coverage
        if (claimData.rentalNeeded) {
            const hasRental = coverages.some(
                c => c.isApplicable && c.coverageType === 'RENTAL_REIMBURSEMENT'
            );
            if (!hasRental) {
                gaps.push('No rental reimbursement coverage');
            }
        }

        // Check for roadside/towing
        if (claimData.towingRequired) {
            const hasTowing = coverages.some(
                c => c.isApplicable && c.coverageType === 'ROADSIDE_ASSISTANCE'
            );
            if (!hasTowing) {
                gaps.push('No roadside assistance coverage');
            }
        }

        // Check for gap insurance on total loss
        if (claimData.isTotalLoss) {
            const hasGap = coverages.some(
                c => c.isApplicable && c.coverageType === 'GAP'
            );
            if (!hasGap && claimData.vehicleLoanBalance && claimData.vehicleValue) {
                if (claimData.vehicleLoanBalance > claimData.vehicleValue) {
                    gaps.push('No GAP coverage for upside-down loan');
                }
            }
        }

        return gaps;
    }

    private buildCoverageRecommendation(
        coverages: CoverageApplicability[],
        claimData: ClaimData
    ): CoverageRecommendation {
        const applicable = coverages.filter(c => c.isApplicable);

        // Determine primary coverage based on claim type
        const primary = this.determinePrimaryCoverage(applicable, claimData.claimType);

        // Get alternative coverages
        const alternatives = applicable
            .filter(c => c.coverageType !== primary)
            .map(c => c.coverageType);

        // Calculate totals
        const totalAvailable = applicable.reduce((sum, c) => sum + c.remaining, 0);
        const totalDeductibles = primary
            ? applicable.find(c => c.coverageType === primary)?.deductible || 0
            : 0;

        return {
            primaryCoverage: primary || 'NONE' as CoverageType,
            alternativeCoverages: alternatives,
            totalAvailable,
            totalDeductibles,
            stackingAllowed: this.checkStackingAllowed(claimData.lossState),
        };
    }

    private determinePrimaryCoverage(
        coverages: CoverageApplicability[],
        claimType: ClaimType | string
    ): CoverageType | null {
        // Priority order for each claim type
        const priorities: Record<string, CoverageType[]> = {
            COLLISION: ['COLLISION'],
            COMPREHENSIVE: ['COMPREHENSIVE'],
            LIABILITY: ['LIABILITY', 'BODILY_INJURY', 'PROPERTY_DAMAGE'],
            UNINSURED_MOTORIST: ['UNINSURED_MOTORIST', 'UNDERINSURED_MOTORIST'],
            MEDICAL_PAYMENTS: ['PIP', 'MEDICAL_PAYMENTS'],
        };

        const priority = priorities[claimType] || [];

        for (const type of priority) {
            const coverage = coverages.find(c => c.coverageType === type && c.isApplicable);
            if (coverage) {
                return coverage.coverageType;
            }
        }

        // Return first applicable coverage if no priority match
        return coverages[0]?.coverageType || null;
    }

    private checkStackingAllowed(state?: string): boolean {
        // States that allow stacking of uninsured motorist coverage
        const stackingStates = [
            'PA', 'NJ', 'OH', 'WI', 'MN', 'SD', 'WV', 'SC', 'AL', 'AR',
        ];

        return state ? stackingStates.includes(state) : false;
    }

    private calculateConfidence(coverages: CoverageApplicability[]): number {
        const applicable = coverages.filter(c => c.isApplicable);

        if (applicable.length === 0) return 0.5;

        // Higher confidence with clear coverage match
        const hasHighLimit = applicable.some(c => c.remaining > 50000);
        const hasLowDeductible = applicable.some(c => (c.deductible ?? 0) < 1000);

        let confidence = 0.7;
        if (hasHighLimit) confidence += 0.1;
        if (hasLowDeductible) confidence += 0.1;
        // Note: deductible can be undefined
        if (applicable.length > 1) confidence += 0.05;

        return Math.min(confidence, 0.95);
    }

    private generateRecommendations(
        analysis: CoverageAnalysis,
        claimData: ClaimData
    ): string[] {
        const recommendations: string[] = [];

        if (analysis.gaps && analysis.gaps.length > 0) {
            recommendations.push(
                'Discuss coverage gaps with policyholder for future policy review'
            );
        }

        if ((analysis.netCoverageAvailable ?? 0) < (claimData.estimatedAmount || 0)) {
            recommendations.push(
                'Advise policyholder of potential out-of-pocket expenses'
            );
        }

        if ((analysis.deductibleApplicable ?? 0) > 0) {
            recommendations.push(
                `Collect $${(analysis.deductibleApplicable ?? 0).toLocaleString()} deductible before settlement`
            );
        }

        const applicable = (analysis.applicableCoverages ?? []).filter((c: any) => c.isApplicable);
        if (applicable.length > 1) {
            recommendations.push(
                'Multiple coverages may apply - review for optimal claim handling'
            );
        }

        return recommendations;
    }
}

export const coverageCalculator = new CoverageCalculator();

