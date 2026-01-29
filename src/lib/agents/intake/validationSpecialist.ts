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
                isValid: true,
                valid: true,
                errors: [],
                warnings: [],
                coverage: undefined,
                policyStatus: undefined
            };

            // 1. Policy existence and status
            const lossDate = parsedData.lossDate ? new Date(parsedData.lossDate as string) : new Date();
            const policyCheck = await validator.checkPolicyStatus(claim.policyNumber, lossDate);
            if (!policyCheck.valid) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push(...policyCheck.errors);
            }
            validationResult.policyStatus = policyCheck.status;

            // 2. Loss date within policy period
            const dateCheck = validator.validateLossDate(claim, lossDate);
            if (!dateCheck.valid) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push(...dateCheck.errors);
            }

            // 3. Vehicle coverage verification
            const vehicleCheck = await validator.verifyVehicleCoverage(claim, parsedData);
            if (!vehicleCheck.valid) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push(...vehicleCheck.errors);
            } else {
                validationResult.warnings.push(...vehicleCheck.warnings);
            }

            // 4. Driver eligibility
            const driverCheck = await validator.validateDriver(claim, parsedData);
            if (!driverCheck.valid) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push(...driverCheck.errors);
            }

            // 5. Coverage type verification
            const coverageCheck = await validator.verifyCoverageType(claim, parsedData);
            validationResult.coverage = coverageCheck;
            if (!coverageCheck.hasApplicableCoverage) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push('No applicable coverage found for this loss type');
            }

            // 6. Check for exclusions
            const exclusionCheck = await validator.checkExclusions(claim, parsedData);
            if (exclusionCheck.hasExclusions) {
                validationResult.isValid = false;
                validationResult.valid = false;
                validationResult.errors.push(...exclusionCheck.exclusions.map((e: any) => `Exclusion: ${e}`));
            }

            // 7. Check limits and deductibles
            const limitsCheck = validator.checkLimitsAndDeductibles(claim, parsedData, coverageCheck);
            validationResult.warnings.push(...limitsCheck.warnings);

            console.log(`[AGENT A2: ValidationSpecialist] ${validationResult.isValid ? '✓' : '✗'} Validation ${validationResult.isValid ? 'passed' : 'failed'}`);

            return validationResult;

        } catch (error) {
            console.error(`[AGENT A2: ValidationSpecialist] ✗ Validation error:`, error);
            return {
                isValid: false,
                valid: false,
                errors: [`Validation system error: ${(error as Error).message}`],
                warnings: [],
                coverage: undefined,
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
                errors: [`Unable to verify policy status: ${(error as Error).message}`],
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

        const vehicles = parsedData.vehicles ?? [];
        const insuredVehicle = vehicles.find((v: any) => v.isInsured) ?? parsedData.vehicle;
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
            30 // days
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

        const participants = parsedData.participants ?? [];
        const insuredDriver = participants.find((p: any) => p.role === 'INSURED_DRIVER');
        if (!insuredDriver) {
            // No driver info is not always an error
            return { valid: true, errors };
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
            policyId: claim.policyId || claim.id || '',
            isValid: false,
            hasApplicableCoverage: false,
            coverageTypes: [],
            limits: {},
            deductibles: {},
            applicableParts: []
        };

        const incidentType = parsedData.incident?.type || claim.claimType || 'COLLISION';

        // Determine applicable coverage based on incident type
        if (incidentType === 'THEFT' || incidentType === 'VANDALISM' || incidentType === 'WEATHER') {
            // Comprehensive coverage
            if (claim.policy?.comprehensiveCoverage) {
                coverage.hasApplicableCoverage = true;
                coverage.isValid = true;
                coverage.coverageTypes?.push('COMPREHENSIVE');
                if (coverage.limits) coverage.limits.comprehensive = claim.policy.comprehensiveLimit;
                if (coverage.deductibles) coverage.deductibles.comprehensive = claim.policy.comprehensiveDeductible;
                coverage.applicableParts?.push('Comprehensive');
            }
        } else {
            // Collision coverage
            if (claim.policy?.collisionCoverage) {
                coverage.hasApplicableCoverage = true;
                coverage.isValid = true;
                coverage.coverageTypes?.push('COLLISION');
                if (coverage.limits) coverage.limits.collision = claim.policy.collisionLimit;
                if (coverage.deductibles) coverage.deductibles.collision = claim.policy.collisionDeductible;
                coverage.applicableParts?.push('Collision');
            }
        }

        // Check for bodily injury coverage if injuries reported
        const participants = parsedData.participants ?? [];
        if (participants.some((p: any) => p.injuries)) {
            if (claim.policy?.bodilyInjuryLiability) {
                coverage.coverageTypes?.push('BODILY_INJURY_LIABILITY');
                if (coverage.limits) coverage.limits.bodilyInjury = claim.policy.bodilyInjuryLimit;
            }
            if (claim.policy?.medicalPayments) {
                coverage.coverageTypes?.push('MEDICAL_PAYMENTS');
                if (coverage.limits) coverage.limits.medicalPayments = claim.policy.medicalPaymentsLimit;
            }
            if (claim.policy?.pip) {
                coverage.coverageTypes?.push('PIP');
                if (coverage.limits) coverage.limits.pip = claim.policy.pipLimit;
            }
        }

        // Check for uninsured/underinsured motorist coverage if applicable
        if (participants.some((p: any) => p.role === 'OTHER_DRIVER' && !p.insuranceInfo)) {
            if (claim.policy?.uninsuredMotorist) {
                coverage.coverageTypes?.push('UNINSURED_MOTORIST');
                if (coverage.limits) coverage.limits.uninsuredMotorist = claim.policy.uninsuredMotoristLimit;
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
        const incident = parsedData.incident || {} as any;

        // Check common exclusions
        if (incident.intentionalAct) {
            exclusions.push('Intentional acts are excluded from coverage');
        }

        if (incident.racing) {
            exclusions.push('Racing activities are excluded from coverage');
        }

        if (incident.businessUse && !claim.policy?.businessUseEndorsement) {
            exclusions.push('Business use without proper endorsement');
        }

        if (incident.dui || incident.drivingUnderInfluence) {
            exclusions.push('DUI/DWI may affect coverage');
        }

        // Check for earthquake/flood (require specific coverage)
        if ((incident.type === 'WEATHER' && incident.causeOfLoss === 'FLOOD') &&
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
        const incident = parsedData.incident || {} as any;
        const applicableParts = coverage.applicableParts || [];

        // Check if estimated damage exceeds limits
        if (incident.estimatedDamage && coverage.limits) {
            for (const part of applicableParts) {
                const limit = coverage.limits[part as string] || 0;
                if (incident.estimatedDamage > limit && limit > 0) {
                    warnings.push(`Estimated damage $${incident.estimatedDamage} may exceed ${part} limit of $${limit}`);
                }
            }
        }

        // Warn about high deductibles
        if (coverage.deductibles) {
            for (const part of applicableParts) {
                const deductible = coverage.deductibles[part as string] || 0;
                if (deductible >= 1000) {
                    warnings.push(`High deductible: $${deductible} applies to ${part} coverage`);
                }
            }
        }

        return { warnings };
    }
}

export default ValidationSpecialist;