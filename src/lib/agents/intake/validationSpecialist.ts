/**
 * ClaimAgent™ - Validation Specialist Agent (Agent A2)
 * 
 * Validates policy coverage, effective dates, and eligibility.
 * Performs real-time policy checks and coverage verification.
 * 
 * @module agents/intake/validationSpecialist
 */

import { PolicyValidationService } from '../../services/policyValidation';
import type { ParsedClaimData, ValidationResult, CoverageVerification } from '../../types/claim';

export class ValidationSpecialist {
    private policyService: PolicyValidationService;

    constructor() {
        this.policyService = new PolicyValidationService();
    }

    /**
     * Main validation method
     */
    static async validatePolicy(claim: any, parsedData: ParsedClaimData): Promise<ValidationResult> {
        const validator = new ValidationSpecialist();

        console.log(`[AGENT A2: ValidationSpecialist] Validating policy for claim ${claim.id}`);

        try {
            const validationResult: ValidationResult = {
                valid: true,
                errors: [],
                warnings: [],
                coverage: null,
                policyStatus: null
            };

            // 1. Policy existence and status
            const policyCheck = await validator.checkPolicyStatus(claim.policyNumber, parsedData.lossDate);
            if (!policyCheck.valid) {
                validationResult.valid = false;
                validationResult.errors.push(...policyCheck.errors);
            }
            validationResult.policyStatus = policyCheck.status;

            // 2. Loss date within policy period
            const dateCheck = validator.validateLossDate(claim, parsedData.lossDate);
            if (!dateCheck.valid) {
                validationResult.valid = false;
                validationResult.errors.push(...dateCheck.errors);
            }

            // 3. Vehicle coverage verification
            const vehicleCheck = await validator.verifyVehicleCoverage(claim, parsedData);
            if (!vehicleCheck.valid) {
                validationResult.valid = false;
                validationResult.errors.push(...vehicleCheck.errors);
            } else {
                validationResult.warnings.push(...vehicleCheck.warnings);
            }

            // 4. Driver eligibility
            const driverCheck = await validator.validateDriver(claim, parsedData);
            if (!driverCheck.valid) {
                validationResult.valid = false;
                validationResult.errors.push(...driverCheck.errors);
            }

            // 5. Coverage type verification
            const coverageCheck = await validator.verifyCoverageType(claim, parsedData);
            validationResult.coverage = coverageCheck;
            if (!coverageCheck.hasApplicableCoverage) {
                validationResult.valid = false;
                validationResult.errors.push('No applicable coverage found for this loss type');
            }

            // 6. Check for exclusions
            const exclusionCheck = await validator.checkExclusions(claim, parsedData);
            if (exclusionCheck.hasExclusions) {
                validationResult.valid = false;
                validationResult.errors.push(...exclusionCheck.exclusions.map((e: any) => `Exclusion: ${e}`));
            }

            // 7. Check limits and deductibles
            const limitsCheck = validator.checkLimitsAndDeductibles(claim, parsedData, coverageCheck);
            validationResult.warnings.push(...limitsCheck.warnings);

            console.log(`[AGENT A2: ValidationSpecialist] ${validationResult.valid ? '✓' : '✗'} Validation ${validationResult.valid ? 'passed' : 'failed'}`);

            return validationResult;

        } catch (error) {
            console.error(`[AGENT A2: ValidationSpecialist] ✗ Validation error:`, error);
            return {
                valid: false,
                errors: [`Validation system error: ${error.message}`],
                warnings: [],
                coverage: null,
                policyStatus: 'ERROR'
            };
        }
    }

    /**
     * Check policy status and existence
     */
    private async checkPolicyStatus(policyNumber: string, lossDate: Date): Promise<{
        valid: boolean;
        errors: string[];
        status: string;
    }> {
        try {
            const policy = await this.policyService.getPolicyByNumber(policyNumber);

            if (!policy) {
                return {
                    valid: false,
                    errors: [`Policy ${policyNumber} not found`],
                    status: 'NOT_FOUND'
                };
            }

            if (policy.status !== 'ACTIVE') {
                return {
                    valid: false,
                    errors: [`Policy ${policyNumber} is not active. Status: ${policy.status}`],
                    status: policy.status
                };
            }

            return {
                valid: true,
                errors: [],
                status: 'ACTIVE'
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Unable to verify policy status: ${error.message}`],
                status: 'ERROR'
            };
        }
    }

    /**
     * Validate loss date is within policy period
     */
    private validateLossDate(claim: any, lossDate: Date): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!claim.policy) {
            errors.push('Policy information not available');
            return { valid: false, errors };
        }

        const effectiveDate = new Date(claim.policy.effectiveDate);
        const expirationDate = new Date(claim.policy.expirationDate);

        if (lossDate < effectiveDate) {
            errors.push(`Loss date ${lossDate.toISOString()} is before policy effective date ${effectiveDate.toISOString()}`);
        }

        if (lossDate > expirationDate) {
            errors.push(`Loss date ${lossDate.toISOString()} is after policy expiration date ${expirationDate.toISOString()}`);
        }

        // Check if loss is more than 60 days old (late reporting warning)
        const daysSinceLoss = Math.floor((Date.now() - lossDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceLoss > 60) {
            errors.push(`Late reporting: Loss occurred ${daysSinceLoss} days ago`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Verify vehicle coverage
     */
    private async verifyVehicleCoverage(claim: any, parsedData: ParsedClaimData): Promise<{
        valid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const insuredVehicle = parsedData.vehicles.find(v => v.isInsured);
        if (!insuredVehicle) {
            errors.push('No insured vehicle identified in claim');
            return { valid: false, errors, warnings };
        }

        // Check if vehicle is listed on policy
        const isVehicleOnPolicy = await this.policyService.isVehicleOnPolicy(
            claim.policyNumber,
            insuredVehicle.vin
        );

        if (!isVehicleOnPolicy) {
            errors.push(`Vehicle VIN ${insuredVehicle.vin} is not listed on policy ${claim.policyNumber}`);
            return { valid: false, errors, warnings };
        }

        // Check for recent policy changes
        const recentChanges = await this.policyService.getRecentPolicyChanges(
            claim.policyNumber,
            parsedData.lossDate
        );

        if (recentChanges && recentChanges.length > 0) {
            warnings.push('Policy was recently modified - verify coverage applies');
        }

        return { valid: true, errors, warnings };
    }

    /**
     * Validate driver eligibility
     */
    private async validateDriver(claim: any, parsedData: ParsedClaimData): Promise<{
        valid: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];

        const insuredDriver = parsedData.participants.find(p => p.role === 'INSURED_DRIVER');
        if (!insuredDriver) {
            errors.push('No driver information provided');
            return { valid: false, errors };
        }

        // Check if driver is listed on policy
        const isDriverListed = await this.policyService.isDriverOnPolicy(
            claim.policyNumber,
            insuredDriver.licenseNumber || insuredDriver.name
        );

        if (!isDriverListed && claim.policy?.requiresListedDrivers) {
            errors.push(`Driver ${insuredDriver.name} is not listed on policy`);
        }

        // Check for excluded drivers
        const isExcluded = await this.policyService.isDriverExcluded(
            claim.policyNumber,
            insuredDriver.licenseNumber || insuredDriver.name
        );

        if (isExcluded) {
            errors.push(`Driver ${insuredDriver.name} is excluded from coverage`);
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Verify coverage type for loss
     */
    private async verifyCoverageType(claim: any, parsedData: ParsedClaimData): Promise<CoverageVerification> {
        const coverage: CoverageVerification = {
            hasApplicableCoverage: false,
            coverageTypes: [],
            limits: {},
            deductibles: {},
            applicableParts: []
        };

        const incidentType = parsedData.incident.type;

        // Determine applicable coverage based on incident type
        if (incidentType === 'THEFT' || incidentType === 'VANDALISM' || incidentType === 'WEATHER') {
            // Comprehensive coverage
            if (claim.policy?.comprehensiveCoverage) {
                coverage.hasApplicableCoverage = true;
                coverage.coverageTypes.push('COMPREHENSIVE');
                coverage.limits.comprehensive = claim.policy.comprehensiveLimit;
                coverage.deductibles.comprehensive = claim.policy.comprehensiveDeductible;
                coverage.applicableParts.push({
                    part: 'Comprehensive',
                    limit: claim.policy.comprehensiveLimit,
                    deductible: claim.policy.comprehensiveDeductible
                });
            }
        } else {
            // Collision coverage
            if (claim.policy?.collisionCoverage) {
                coverage.hasApplicableCoverage = true;
                coverage.coverageTypes.push('COLLISION');
                coverage.limits.collision = claim.policy.collisionLimit;
                coverage.deductibles.collision = claim.policy.collisionDeductible;
                coverage.applicableParts.push({
                    part: 'Collision',
                    limit: claim.policy.collisionLimit,
                    deductible: claim.policy.collisionDeductible
                });
            }
        }

        // Check for bodily injury coverage if injuries reported
        if (parsedData.participants.some(p => p.injuries && p.injuries.length > 0)) {
            if (claim.policy?.bodilyInjuryLiability) {
                coverage.coverageTypes.push('BODILY_INJURY_LIABILITY');
                coverage.limits.bodilyInjury = claim.policy.bodilyInjuryLimit;
            }
            if (claim.policy?.medicalPayments) {
                coverage.coverageTypes.push('MEDICAL_PAYMENTS');
                coverage.limits.medicalPayments = claim.policy.medicalPaymentsLimit;
            }
            if (claim.policy?.pip) {
                coverage.coverageTypes.push('PIP');
                coverage.limits.pip = claim.policy.pipLimit;
            }
        }

        // Check for uninsured/underinsured motorist coverage if applicable
        if (parsedData.participants.some(p => p.role === 'OTHER_DRIVER' && !p.insuranceInfo)) {
            if (claim.policy?.uninsuredMotorist) {
                coverage.coverageTypes.push('UNINSURED_MOTORIST');
                coverage.limits.uninsuredMotorist = claim.policy.uninsuredMotoristLimit;
            }
        }

        return coverage;
    }

    /**
     * Check for policy exclusions
     */
    private async checkExclusions(claim: any, parsedData: ParsedClaimData): Promise<{
        hasExclusions: boolean;
        exclusions: string[];
    }> {
        const exclusions: string[] = [];

        // Check common exclusions
        if (parsedData.incident.intentionalAct) {
            exclusions.push('Intentional acts are excluded from coverage');
        }

        if (parsedData.incident.racing) {
            exclusions.push('Racing activities are excluded from coverage');
        }

        if (parsedData.incident.businessUse && !claim.policy?.businessUseEndorsement) {
            exclusions.push('Business use without proper endorsement');
        }

        if (parsedData.incident.dui || parsedData.incident.drivingUnderInfluence) {
            exclusions.push('DUI/DWI may affect coverage');
        }

        // Check for earthquake/flood (require specific coverage)
        if ((parsedData.incident.type === 'WEATHER' && parsedData.incident.causeOfLoss === 'FLOOD') &&
            !claim.policy?.floodCoverage) {
            exclusions.push('Flood damage requires separate coverage');
        }

        return {
            hasExclusions: exclusions.length > 0,
            exclusions
        };
    }

    /**
     * Check limits and deductibles
     */
    private checkLimitsAndDeductibles(claim: any, parsedData: ParsedClaimData, coverage: CoverageVerification): {
        warnings: string[];
    } {
        const warnings: string[] = [];

        // Check if estimated damage exceeds limits
        if (parsedData.incident.estimatedDamage) {
            for (const part of coverage.applicableParts) {
                if (parsedData.incident.estimatedDamage > part.limit) {
                    warnings.push(`Estimated damage $${parsedData.incident.estimatedDamage} may exceed ${part.part} limit of $${part.limit}`);
                }
            }
        }

        // Warn about high deductibles
        for (const part of coverage.applicableParts) {
            if (part.deductible >= 1000) {
                warnings.push(`High deductible: $${part.deductible} applies to ${part.part} coverage`);
            }
        }

        return { warnings };
    }
}

export default ValidationSpecialist;