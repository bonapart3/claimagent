// src/lib/agents/intake/dataValidator.ts
// Agent A2: Data Validator - Validates claim data completeness and accuracy

import { ClaimData, ClaimType } from '@/lib/types/claim';
import { AgentResult, AgentRole, EscalationTrigger, ValidationResult } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface FieldValidation {
    field: string;
    value: unknown;
    status: 'VALID' | 'INVALID' | 'MISSING' | 'WARNING';
    message: string;
}

interface DataValidationResult {
    claimId: string;
    overallStatus: 'COMPLETE' | 'INCOMPLETE' | 'INVALID';
    completenessScore: number;
    validations: FieldValidation[];
    missingRequired: string[];
    warnings: string[];
    recommendations: string[];
}

export class DataValidator {
    private readonly agentId: AgentRole = 'DATA_VALIDATOR';

    private readonly requiredFields: Record<ClaimType, string[]> = {
        COLLISION: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'lossDescription',
            'vehicle.vin',
            'vehicle.year',
            'vehicle.make',
            'vehicle.model',
        ],
        COMPREHENSIVE: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'lossDescription',
            'vehicle.vin',
        ],
        LIABILITY: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'lossDescription',
            'thirdPartyInfo',
        ],
        UNINSURED_MOTORIST: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'lossDescription',
            'otherDriverInfo',
        ],
        MEDICAL_PAYMENTS: [
            'policyNumber',
            'lossDate',
            'injuryDescription',
            'medicalProvider',
        ],
        PROPERTY_DAMAGE: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'propertyDescription',
        ],
        BODILY_INJURY: [
            'policyNumber',
            'lossDate',
            'injuryDescription',
        ],
        THEFT: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'vehicle.vin',
            'policeReportNumber',
        ],
        VANDALISM: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'vehicle.vin',
        ],
        WEATHER: [
            'policyNumber',
            'lossDate',
            'lossLocation',
            'weatherEventType',
        ],
        GLASS: [
            'policyNumber',
            'lossDate',
            'vehicle.vin',
            'glassType',
        ],
    };

    async validate(claimData: ClaimData): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: EscalationTrigger[] = [];

        try {
            const validations: FieldValidation[] = [];
            const missingRequired: string[] = [];
            const warnings: string[] = [];

            // Get required fields for claim type
            const requiredFields = this.requiredFields[claimData.claimType] || this.requiredFields.COLLISION;

            // Validate required fields
            for (const field of requiredFields) {
                const validation = this.validateField(claimData, field);
                validations.push(validation);

                if (validation.status === 'MISSING') {
                    missingRequired.push(field);
                }
            }

            // Validate field formats
            const formatValidations = this.validateFormats(claimData);
            validations.push(...formatValidations);

            // Cross-field validations
            const crossValidations = this.performCrossValidations(claimData);
            validations.push(...crossValidations.validations);
            warnings.push(...crossValidations.warnings);

            // Business rule validations
            const ruleValidations = this.validateBusinessRules(claimData);
            validations.push(...ruleValidations.validations);
            warnings.push(...ruleValidations.warnings);

            // Calculate completeness score
            const validCount = validations.filter(v => v.status === 'VALID').length;
            const completenessScore = validCount / validations.length;

            // Determine overall status
            let overallStatus: 'COMPLETE' | 'INCOMPLETE' | 'INVALID';
            if (missingRequired.length > 0) {
                overallStatus = 'INCOMPLETE';
            } else if (validations.some(v => v.status === 'INVALID')) {
                overallStatus = 'INVALID';
            } else {
                overallStatus = 'COMPLETE';
            }

            // Generate escalations
            if (overallStatus === 'INVALID') {
                escalations.push({
                    type: 'DATA_QUALITY',
                    reason: 'Claim data validation failed',
                    severity: 'MEDIUM',
                });
            }

            if (missingRequired.length > 3) {
                escalations.push({
                    type: 'INCOMPLETE_DATA',
                    reason: `Multiple required fields missing: ${missingRequired.join(', ')}`,
                    severity: 'MEDIUM',
                });
            }

            const result: DataValidationResult = {
                claimId: claimData.id,
                overallStatus,
                completenessScore,
                validations,
                missingRequired,
                warnings,
                recommendations: this.generateRecommendations(missingRequired, warnings),
            };

            await auditLog({
                claimId: claimData.id,
                action: 'DATA_VALIDATION_COMPLETED',
                agentId: this.agentId,
                description: `Validation: ${overallStatus}, Score: ${(completenessScore * 100).toFixed(0)}%`,
                details: { result },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: result,
                confidence: completenessScore,
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: result.recommendations,
            };
        } catch (error) {
            console.error('Data validation error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Data validation failed',
                processingTime: Date.now() - startTime,
            };
        }
    }

    private validateField(claimData: ClaimData, fieldPath: string): FieldValidation {
        const value = this.getNestedValue(claimData, fieldPath);

        if (value === undefined || value === null || value === '') {
            return {
                field: fieldPath,
                value: null,
                status: 'MISSING',
                message: `Required field '${fieldPath}' is missing`,
            };
        }

        return {
            field: fieldPath,
            value,
            status: 'VALID',
            message: 'Field is present and valid',
        };
    }

    private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
        return path.split('.').reduce((current, key) => {
            return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
        }, obj as unknown);
    }

    private validateFormats(claimData: ClaimData): FieldValidation[] {
        const validations: FieldValidation[] = [];

        // VIN format validation
        if (claimData.vehicle?.vin) {
            const vinValid = /^[A-HJ-NPR-Z0-9]{17}$/i.test(claimData.vehicle.vin);
            validations.push({
                field: 'vehicle.vin',
                value: claimData.vehicle.vin,
                status: vinValid ? 'VALID' : 'INVALID',
                message: vinValid ? 'VIN format is valid' : 'VIN must be 17 alphanumeric characters',
            });
        }

        // Policy number format
        if (claimData.policyNumber) {
            const policyValid = /^[A-Z]{2,3}-\d{6,12}$/i.test(claimData.policyNumber);
            validations.push({
                field: 'policyNumber',
                value: claimData.policyNumber,
                status: policyValid ? 'VALID' : 'WARNING',
                message: policyValid ? 'Policy number format is valid' : 'Policy number format may be non-standard',
            });
        }

        // Email format
        if (claimData.claimantEmail) {
            const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimData.claimantEmail);
            validations.push({
                field: 'claimantEmail',
                value: claimData.claimantEmail,
                status: emailValid ? 'VALID' : 'INVALID',
                message: emailValid ? 'Email format is valid' : 'Invalid email format',
            });
        }

        // Phone format
        if (claimData.claimantPhone) {
            const phoneValid = /^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(claimData.claimantPhone);
            validations.push({
                field: 'claimantPhone',
                value: claimData.claimantPhone,
                status: phoneValid ? 'VALID' : 'WARNING',
                message: phoneValid ? 'Phone format is valid' : 'Phone number format may be non-standard',
            });
        }

        // Date validations
        if (claimData.lossDate) {
            const lossDate = new Date(claimData.lossDate);
            const now = new Date();
            const isValid = lossDate <= now && lossDate > new Date('2000-01-01');
            validations.push({
                field: 'lossDate',
                value: claimData.lossDate,
                status: isValid ? 'VALID' : 'INVALID',
                message: isValid ? 'Loss date is valid' : 'Loss date is invalid or in the future',
            });
        }

        return validations;
    }

    private performCrossValidations(claimData: ClaimData): { validations: FieldValidation[]; warnings: string[] } {
        const validations: FieldValidation[] = [];
        const warnings: string[] = [];

        // Vehicle year validation
        if (claimData.vehicle?.year) {
            const currentYear = new Date().getFullYear();
            if (claimData.vehicle.year > currentYear + 1 || claimData.vehicle.year < 1900) {
                validations.push({
                    field: 'vehicle.year',
                    value: claimData.vehicle.year,
                    status: 'INVALID',
                    message: 'Vehicle year is outside valid range',
                });
            }
        }

        // Loss date vs policy dates (if available)
        if (claimData.lossDate && claimData.policyEffectiveDate) {
            const lossDate = new Date(claimData.lossDate);
            const effectiveDate = new Date(claimData.policyEffectiveDate);

            if (lossDate < effectiveDate) {
                validations.push({
                    field: 'lossDate',
                    value: claimData.lossDate,
                    status: 'INVALID',
                    message: 'Loss date is before policy effective date',
                });
            }
        }

        // Injury claim needs injury description
        if (claimData.injuries && !claimData.injuryDescription) {
            warnings.push('Injuries reported but no injury description provided');
        }

        // Third party claim needs third party info
        if (claimData.isThirdParty && !claimData.thirdPartyInfo) {
            warnings.push('Third party claim but no third party information provided');
        }

        // High estimated amount needs documentation
        if ((claimData.estimatedAmount || 0) > 10000 && (!claimData.documents || claimData.documents.length === 0)) {
            warnings.push('High-value claim without supporting documentation');
        }

        return { validations, warnings };
    }

    private validateBusinessRules(claimData: ClaimData): { validations: FieldValidation[]; warnings: string[] } {
        const validations: FieldValidation[] = [];
        const warnings: string[] = [];

        // Reporting delay check
        if (claimData.lossDate && claimData.createdAt) {
            const lossDate = new Date(claimData.lossDate);
            const reportDate = new Date(claimData.createdAt);
            const daysDiff = (reportDate.getTime() - lossDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff > 30) {
                warnings.push(`Claim reported ${Math.round(daysDiff)} days after loss - late reporting`);
            }
        }

        // Theft claims need police report
        if (claimData.claimType === 'THEFT' && !claimData.policeReportNumber) {
            validations.push({
                field: 'policeReportNumber',
                value: null,
                status: 'MISSING',
                message: 'Police report required for theft claims',
            });
        }

        // Total loss threshold
        if (claimData.isTotalLoss && (claimData.estimatedAmount || 0) < 5000) {
            warnings.push('Total loss indicated but estimated amount seems low');
        }

        // Multiple vehicles check
        if (claimData.additionalVehicles && claimData.additionalVehicles.length > 5) {
            warnings.push('Unusually high number of vehicles involved');
        }

        return { validations, warnings };
    }

    private generateRecommendations(missingRequired: string[], warnings: string[]): string[] {
        const recommendations: string[] = [];

        if (missingRequired.length > 0) {
            recommendations.push(`Request missing information: ${missingRequired.join(', ')}`);
        }

        if (warnings.some(w => w.includes('documentation'))) {
            recommendations.push('Request supporting documentation');
        }

        if (warnings.some(w => w.includes('late reporting'))) {
            recommendations.push('Inquire about reason for delayed reporting');
        }

        if (warnings.some(w => w.includes('police report'))) {
            recommendations.push('Request police report number');
        }

        if (recommendations.length === 0) {
            recommendations.push('Claim data is complete - proceed with processing');
        }

        return recommendations;
    }
}

export const dataValidator = new DataValidator();

