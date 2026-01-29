// src/lib/services/coverageAnalyzer.ts
// Coverage Analysis Service

import { ClaimData, PolicyInfo } from '@/lib/types/claim';

interface Coverage {
    type: string;
    status: string;
    limit?: number;
    deductible?: number;
    aggregateLimit?: number;
    vehicleVin?: string;
    namedDriverOnly?: boolean;
    namedDrivers?: string[];
    pendingEndorsement?: boolean;
}

interface CoverageAnalysisResult {
    claimId: string;
    policyNumber: string;
    coverageApplies: boolean;
    applicableCoverages: ApplicableCoverage[];
    exclusions: CoverageExclusion[];
    deductibles: DeductibleInfo[];
    limits: LimitInfo[];
    recommendations: string[];
    warnings: string[];
}

interface ApplicableCoverage {
    type: string;
    name: string;
    applies: boolean;
    reason: string;
    limit?: number;
    deductible?: number;
}

interface CoverageExclusion {
    exclusionCode: string;
    description: string;
    applies: boolean;
    details?: string;
}

interface DeductibleInfo {
    coverageType: string;
    amount: number;
    waived: boolean;
    waiverReason?: string;
}

interface LimitInfo {
    coverageType: string;
    perOccurrence: number;
    aggregate?: number;
    remaining?: number;
}

// Coverage type mappings
const CLAIM_TYPE_TO_COVERAGE: Record<string, string[]> = {
    COLLISION: ['COLLISION'],
    COMPREHENSIVE: ['COMPREHENSIVE', 'OTHER_THAN_COLLISION'],
    THEFT: ['COMPREHENSIVE', 'THEFT'],
    VANDALISM: ['COMPREHENSIVE'],
    WEATHER: ['COMPREHENSIVE'],
    FIRE: ['COMPREHENSIVE'],
    HIT_AND_RUN: ['COLLISION', 'UNINSURED_MOTORIST_PD'],
    GLASS: ['COMPREHENSIVE', 'GLASS'],
    ANIMAL: ['COMPREHENSIVE'],
    BODILY_INJURY: ['BODILY_INJURY', 'PIP', 'MEDPAY'],
};

export class CoverageAnalyzerService {
    async analyzeCoverage(
        claimData: ClaimData,
        policy: PolicyInfo
    ): Promise<CoverageAnalysisResult> {
        const applicableCoverages: ApplicableCoverage[] = [];
        const exclusions: CoverageExclusion[] = [];
        const deductibles: DeductibleInfo[] = [];
        const limits: LimitInfo[] = [];
        const warnings: string[] = [];
        const recommendations: string[] = [];

        // Check policy status
        const lossDateStr = claimData.lossDate instanceof Date ? claimData.lossDate.toISOString() : String(claimData.lossDate);
        if (!this.isPolicyActive(policy, lossDateStr)) {
            warnings.push('Policy may not have been active on date of loss');
        }

        // Get applicable coverage types for this claim type
        const neededCoverages = CLAIM_TYPE_TO_COVERAGE[claimData.claimType] || ['COLLISION'];

        // Build coverage Map for O(1) lookup instead of O(n) .find()
        const coverageMap = new Map(policy.coverages?.map(c => [c.type, c]) || []);

        // Analyze each coverage
        for (const coverageType of neededCoverages) {
            const coverage = coverageMap.get(coverageType);

            if (coverage) {
                const applies = this.checkCoverageApplies(coverage, claimData);
                applicableCoverages.push({
                    type: coverage.type,
                    name: this.getCoverageName(coverage.type),
                    applies: applies.applies,
                    reason: applies.reason,
                    limit: coverage.limit,
                    deductible: coverage.deductible,
                });

                if (applies.applies && coverage.limit) {
                    limits.push({
                        coverageType: coverage.type,
                        perOccurrence: coverage.limit,
                        aggregate: coverage.aggregateLimit,
                    });
                }

                if (applies.applies && coverage.deductible) {
                    deductibles.push({
                        coverageType: coverage.type,
                        amount: coverage.deductible,
                        waived: this.checkDeductibleWaiver(claimData, coverage),
                        waiverReason: this.getDeductibleWaiverReason(claimData, coverage),
                    });
                }
            } else {
                applicableCoverages.push({
                    type: coverageType,
                    name: this.getCoverageName(coverageType),
                    applies: false,
                    reason: 'Coverage not on policy',
                });
            }
        }

        // Check common exclusions
        exclusions.push(...this.checkExclusions(claimData, policy));

        // Check for coverage gaps
        const coverageGaps = this.identifyCoverageGaps(applicableCoverages);
        warnings.push(...coverageGaps);

        // Generate recommendations
        recommendations.push(...this.generateRecommendations(applicableCoverages, exclusions, claimData));

        const coverageApplies = applicableCoverages.some(c => c.applies);

        return {
            claimId: claimData.id,
            policyNumber: policy.policyNumber,
            coverageApplies,
            applicableCoverages,
            exclusions,
            deductibles,
            limits,
            recommendations,
            warnings,
        };
    }

    private isPolicyActive(policy: PolicyInfo, lossDate: string): boolean {
        const loss = new Date(lossDate);
        const effectiveDate = new Date(policy.effectiveDate);
        const expirationDate = new Date(policy.expirationDate);

        return loss >= effectiveDate && loss <= expirationDate;
    }

    private checkCoverageApplies(
        coverage: Coverage,
        claimData: ClaimData
    ): { applies: boolean; reason: string } {
        // Check if coverage is active
        if (coverage.status !== 'ACTIVE') {
            return { applies: false, reason: 'Coverage not active' };
        }

        // Check vehicle-specific coverage
        if (coverage.vehicleVin && claimData.vehicle?.vin) {
            if (coverage.vehicleVin !== claimData.vehicle.vin) {
                return { applies: false, reason: 'Coverage applies to different vehicle' };
            }
        }

        // Check named driver requirements
        if (coverage.namedDriverOnly && claimData.driver) {
            // Use Set for O(1) lookup instead of O(n) .includes()
            const namedDriverSet = new Set(coverage.namedDrivers || []);
            const isNamedDriver = namedDriverSet.has(claimData.driver.name || '');
            if (!isNamedDriver) {
                return { applies: false, reason: 'Driver not listed as named driver' };
            }
        }

        // Check for pending endorsements
        if (coverage.pendingEndorsement) {
            return { applies: false, reason: 'Coverage endorsement pending' };
        }

        return { applies: true, reason: 'Coverage verified and applicable' };
    }

    private checkExclusions(
        claimData: ClaimData,
        policy: PolicyInfo
    ): CoverageExclusion[] {
        const exclusions: CoverageExclusion[] = [];

        // Intentional acts exclusion
        exclusions.push({
            exclusionCode: 'EX-001',
            description: 'Intentional damage or acts',
            applies: this.checkIntentionalActs(claimData),
            details: 'Coverage excluded for intentional damage',
        });

        // Business use exclusion
        exclusions.push({
            exclusionCode: 'EX-002',
            description: 'Business/commercial use',
            applies: this.checkBusinessUse(claimData, policy),
            details: 'Personal auto policy excludes commercial use',
        });

        // Racing exclusion
        exclusions.push({
            exclusionCode: 'EX-003',
            description: 'Racing or speed contests',
            applies: claimData.involvedInRacing || false,
            details: 'Damage during racing or speed contests excluded',
        });

        // DUI/DWI exclusion (some policies)
        if (policy.duiExclusion) {
            exclusions.push({
                exclusionCode: 'EX-004',
                description: 'DUI/DWI incident',
                applies: claimData.duiInvolved || false,
                details: 'Policy excludes coverage for DUI incidents',
            });
        }

        // Unlicensed driver exclusion
        exclusions.push({
            exclusionCode: 'EX-005',
            description: 'Unlicensed or excluded driver',
            applies: this.checkExcludedDriver(claimData, policy),
            details: 'Driver not authorized to operate vehicle',
        });

        // Wear and tear exclusion
        exclusions.push({
            exclusionCode: 'EX-006',
            description: 'Mechanical breakdown or wear and tear',
            applies: claimData.claimType === 'MECHANICAL',
            details: 'Normal wear and mechanical breakdown excluded',
        });

        // War and terrorism exclusion
        exclusions.push({
            exclusionCode: 'EX-007',
            description: 'War, terrorism, nuclear hazard',
            applies: false, // Rarely applies
            details: 'Standard exclusion for catastrophic events',
        });

        return exclusions;
    }

    private checkIntentionalActs(claimData: ClaimData): boolean {
        // Check for indicators of intentional damage
        if (claimData.suspectedIntentional) return true;
        if (claimData.fraudScore && claimData.fraudScore > 0.8) return false; // Already flagged for fraud
        return false;
    }

    private checkBusinessUse(claimData: ClaimData, policy: PolicyInfo): boolean {
        if (policy.coverageType === 'COMMERCIAL') return false;
        if (claimData.businessUseAtTimeOfLoss) return true;
        if (claimData.rideshareActivity) return !policy.rideshareEndorsement;
        if (claimData.deliveryActivity) return !policy.deliveryEndorsement;
        return false;
    }

    private checkExcludedDriver(claimData: ClaimData, policy: PolicyInfo): boolean {
        if (!claimData.driver) return false;

        // Check excluded driver list - use Set for O(1) lookup
        const excludedDriverSet = new Set(policy.excludedDrivers || []);
        if (excludedDriverSet.has(claimData.driver.name || '')) return true;

        // Check license status
        if (claimData.driver.licenseStatus === 'SUSPENDED') return true;
        if (claimData.driver.licenseStatus === 'REVOKED') return true;

        return false;
    }

    private checkDeductibleWaiver(claimData: ClaimData, coverage: Coverage): boolean {
        // Hit and run - some states/policies waive deductible
        if (claimData.claimType === 'HIT_AND_RUN' && claimData.policeReportNumber) {
            return true;
        }

        // Glass repair vs replacement (some policies)
        if (coverage.type === 'GLASS' && claimData.glassRepairOnly) {
            return true;
        }

        // Subrogation successful (future waiver)
        if (claimData.subrogationComplete && claimData.subrogationRecovery) {
            return true;
        }

        return false;
    }

    private getDeductibleWaiverReason(claimData: ClaimData, coverage: Coverage): string | undefined {
        if (claimData.claimType === 'HIT_AND_RUN' && claimData.policeReportNumber) {
            return 'Hit and run with police report filed';
        }
        if (coverage.type === 'GLASS' && claimData.glassRepairOnly) {
            return 'Glass repair (not replacement)';
        }
        return undefined;
    }

    private identifyCoverageGaps(coverages: ApplicableCoverage[]): string[] {
        const gaps: string[] = [];

        const hasCollision = coverages.some(c => c.type === 'COLLISION' && c.applies);
        const hasComprehensive = coverages.some(c => c.type === 'COMPREHENSIVE' && c.applies);
        const hasUm = coverages.some(c => c.type === 'UNINSURED_MOTORIST' && c.applies);

        if (!hasCollision && coverages.some(c => c.type === 'COLLISION')) {
            gaps.push('Collision coverage not applicable - verify coverage status');
        }

        if (!hasComprehensive && coverages.some(c => c.type === 'COMPREHENSIVE')) {
            gaps.push('Comprehensive coverage not applicable - verify coverage status');
        }

        return gaps;
    }

    private getCoverageName(type: string): string {
        const names: Record<string, string> = {
            COLLISION: 'Collision Coverage',
            COMPREHENSIVE: 'Comprehensive Coverage',
            OTHER_THAN_COLLISION: 'Other Than Collision',
            THEFT: 'Theft Coverage',
            GLASS: 'Glass Coverage',
            BODILY_INJURY: 'Bodily Injury Liability',
            PROPERTY_DAMAGE: 'Property Damage Liability',
            PIP: 'Personal Injury Protection',
            MEDPAY: 'Medical Payments',
            UNINSURED_MOTORIST: 'Uninsured Motorist',
            UNINSURED_MOTORIST_PD: 'Uninsured Motorist Property Damage',
            UNDERINSURED_MOTORIST: 'Underinsured Motorist',
            RENTAL: 'Rental Reimbursement',
            TOWING: 'Towing and Labor',
            ROADSIDE: 'Roadside Assistance',
        };
        return names[type] || type;
    }

    private generateRecommendations(
        coverages: ApplicableCoverage[],
        exclusions: CoverageExclusion[],
        claimData: ClaimData
    ): string[] {
        const recommendations: string[] = [];

        const applicableExclusions = exclusions.filter(e => e.applies);
        if (applicableExclusions.length > 0) {
            recommendations.push('Review applicable exclusions with coverage counsel');
        }

        const noCoverage = coverages.every(c => !c.applies);
        if (noCoverage) {
            recommendations.push('Consider issuing coverage denial letter');
            recommendations.push('Review for any overlooked coverage that may apply');
        }

        const partialCoverage = coverages.some(c => c.applies) && coverages.some(c => !c.applies);
        if (partialCoverage) {
            recommendations.push('Partial coverage applies - process under applicable coverage only');
        }

        return recommendations;
    }
}

export const coverageAnalyzer = new CoverageAnalyzerService();

