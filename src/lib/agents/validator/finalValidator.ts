/**
 * ClaimAgent™ - Final Validator (Agent Z)
 *
 * Performs final validation before claim approval or escalation.
 * This is the last checkpoint before automated decisions are made.
 */

import type { Claim, EscalationTrigger } from '../../types/claim';

export interface ValidationResult {
    approved: boolean;
    rejectionReason?: string;
    confidence: number;
    warnings: string[];
    validationDetails: {
        dataComplete: boolean;
        policyValid: boolean;
        amountReasonable: boolean;
        noFraudIndicators: boolean;
        compliancePass: boolean;
    };
}

export class FinalValidator {
    /**
     * Perform final validation on a claim before approval
     */
    async performFinalValidation(
        claim: any,
        escalationTriggers: EscalationTrigger[]
    ): Promise<ValidationResult> {
        const warnings: string[] = [];

        // Check for escalation triggers
        if (escalationTriggers.length > 0) {
            const fraudTriggers = escalationTriggers.filter(t => t.type === 'FRAUD_DETECTED');
            if (fraudTriggers.length > 0) {
                return {
                    approved: false,
                    rejectionReason: 'Fraud indicators present - requires human review',
                    confidence: 0,
                    warnings: ['Fraud detection triggered'],
                    validationDetails: {
                        dataComplete: true,
                        policyValid: true,
                        amountReasonable: true,
                        noFraudIndicators: false,
                        compliancePass: true,
                    },
                };
            }
        }

        // Validate data completeness
        const dataComplete = this.validateDataCompleteness(claim);
        if (!dataComplete.valid) {
            warnings.push(...dataComplete.missing.map(m => `Missing: ${m}`));
        }

        // Validate policy
        const policyValid = this.validatePolicy(claim);

        // Validate amount reasonableness
        const amountReasonable = this.validateAmount(claim);

        // Check fraud score
        const noFraudIndicators = (claim.fraudScore || 0) < 50;

        // Check compliance
        const compliancePass = claim.complianceStatus !== 'NON_COMPLIANT';

        // Calculate overall approval
        const approved = dataComplete.valid &&
                        policyValid &&
                        amountReasonable &&
                        noFraudIndicators &&
                        compliancePass;

        // Calculate confidence
        let confidence = 100;
        if (!dataComplete.valid) confidence -= 20;
        if (!policyValid) confidence -= 30;
        if (!amountReasonable) confidence -= 15;
        if (!noFraudIndicators) confidence -= 25;
        if (!compliancePass) confidence -= 10;

        return {
            approved,
            rejectionReason: approved ? undefined : this.determineRejectionReason({
                dataComplete: dataComplete.valid,
                policyValid,
                amountReasonable,
                noFraudIndicators,
                compliancePass,
            }),
            confidence: Math.max(0, confidence),
            warnings,
            validationDetails: {
                dataComplete: dataComplete.valid,
                policyValid,
                amountReasonable,
                noFraudIndicators,
                compliancePass,
            },
        };
    }

    private validateDataCompleteness(claim: any): { valid: boolean; missing: string[] } {
        const missing: string[] = [];

        if (!claim.claimNumber) missing.push('Claim number');
        if (!claim.incidentDate) missing.push('Incident date');
        if (!claim.description) missing.push('Description');

        return {
            valid: missing.length === 0,
            missing,
        };
    }

    private validatePolicy(claim: any): boolean {
        if (!claim.policy) return false;
        if (!claim.policy.active) return false;

        // Check policy dates
        const now = new Date();
        const effectiveDate = new Date(claim.policy.effectiveDate);
        const expirationDate = new Date(claim.policy.expirationDate);

        if (now < effectiveDate || now > expirationDate) return false;

        return true;
    }

    private validateAmount(claim: any): boolean {
        if (!claim.settlementAmount) return true; // Not yet calculated

        // Check for unreasonably high amounts
        if (claim.settlementAmount > 100000) return false;

        // Check for negative amounts
        if (claim.settlementAmount < 0) return false;

        return true;
    }

    private determineRejectionReason(details: ValidationResult['validationDetails']): string {
        if (!details.noFraudIndicators) return 'Fraud indicators detected';
        if (!details.policyValid) return 'Policy validation failed';
        if (!details.dataComplete) return 'Incomplete claim data';
        if (!details.amountReasonable) return 'Settlement amount requires review';
        if (!details.compliancePass) return 'Compliance check failed';
        return 'Validation failed';
    }
}

export default FinalValidator;
