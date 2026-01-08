// src/lib/agents/evaluation/settlementDrafter.ts
// Agent D3: Settlement Drafter - Prepares settlement offers and documentation

import { ClaimData } from '@/lib/types/claim';
import { AgentResult, AgentRole, EscalationTrigger, SettlementDraft } from '@/lib/types/agent';
import { CoverageAnalysis, ReserveAnalysis } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';
import { FINANCIAL_THRESHOLDS, AUTO_APPROVAL_THRESHOLDS } from '@/lib/constants/thresholds';

interface SettlementComponent {
    category: string;
    description: string;
    amount: number;
    basis: string;
}

interface SettlementNegotiationRange {
    minimum: number;
    target: number;
    maximum: number;
}

export class SettlementDrafter {
    private readonly agentId: AgentRole = 'SETTLEMENT_DRAFTER';

    async draft(
        claimData: ClaimData,
        coverageAnalysis: CoverageAnalysis,
        reserveAnalysis: ReserveAnalysis
    ): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: EscalationTrigger[] = [];

        try {
            // Step 1: Calculate settlement components
            const components = await this.calculateSettlementComponents(claimData, reserveAnalysis);

            // Step 2: Apply coverage limits
            const adjustedComponents = this.applyCoverageLimits(components, coverageAnalysis);

            // Step 3: Calculate deductibles
            const deductibleAmount = coverageAnalysis.deductibleApplicable || 0;

            // Step 4: Determine settlement amount
            const grossAmount = adjustedComponents.reduce((sum, c) => sum + c.amount, 0);
            const netAmount = Math.max(0, grossAmount - deductibleAmount);

            // Step 5: Determine if auto-approval eligible
            const autoApprovalEligible = this.checkAutoApprovalEligibility(
                netAmount,
                claimData,
                coverageAnalysis
            );

            // Step 6: Set negotiation range
            const negotiationRange = this.calculateNegotiationRange(netAmount, claimData);

            // Step 7: Check for authority requirements
            if (netAmount > FINANCIAL_THRESHOLDS.SETTLEMENT_AUTHORITY.ADJUSTER) {
                escalations.push({
                    type: 'AUTHORITY_REQUIRED',
                    reason: `Settlement of $${netAmount.toLocaleString()} requires supervisor approval`,
                    severity: netAmount > FINANCIAL_THRESHOLDS.SETTLEMENT_AUTHORITY.SUPERVISOR
                        ? 'HIGH'
                        : 'MEDIUM',
                });
            }

            // Step 8: Generate settlement letter
            const settlementLetter = await this.generateSettlementLetter(
                claimData,
                adjustedComponents,
                grossAmount,
                deductibleAmount,
                netAmount
            );

            // Step 9: Build settlement draft
            const settlementDraft: SettlementDraft = {
                claimId: claimData.id,
                draftDate: new Date().toISOString(),
                components: adjustedComponents,
                grossAmount,
                deductibleAmount,
                netAmount,
                negotiationRange,
                autoApprovalEligible,
                settlementLetter,
                paymentDetails: this.buildPaymentDetails(claimData, netAmount),
                releaseRequired: this.determineReleaseRequired(claimData),
                expirationDate: this.calculateExpirationDate(),
            };

            // Log audit
            await auditLog({
                claimId: claimData.id,
                action: 'SETTLEMENT_DRAFTED',
                agentId: this.agentId,
                description: `Settlement drafted: $${netAmount.toLocaleString()} (Auto-approval: ${autoApprovalEligible})`,
                details: { settlement: settlementDraft },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: settlementDraft,
                confidence: this.calculateConfidence(adjustedComponents),
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: this.generateRecommendations(settlementDraft, claimData),
            };
        } catch (error) {
            console.error('Settlement drafting error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Settlement drafting failed',
                processingTime: Date.now() - startTime,
                escalations: [{
                    type: 'SYSTEM_ERROR',
                    reason: 'Settlement drafting system failure',
                    severity: 'HIGH',
                }],
            };
        }
    }

    private async calculateSettlementComponents(
        claimData: ClaimData,
        reserveAnalysis: ReserveAnalysis
    ): Promise<SettlementComponent[]> {
        const components: SettlementComponent[] = [];

        // Vehicle damage component
        const damageBreakdown = reserveAnalysis.breakdown.find(
            b => b.category === 'Vehicle Damage'
        );
        if (damageBreakdown) {
            components.push({
                category: 'Property Damage',
                description: 'Vehicle repair/replacement costs',
                amount: damageBreakdown.recommended,
                basis: `Based on damage assessment: ${damageBreakdown.factors.join('; ')}`,
            });
        }

        // Add specific damage items if available
        if (claimData.damages) {
            for (const damage of claimData.damages) {
                if (damage.repairType === 'REPLACE') {
                    components.push({
                        category: 'Parts Replacement',
                        description: `${damage.component} replacement`,
                        amount: damage.estimatedCost || 0,
                        basis: 'OEM or equivalent part pricing',
                    });
                }
            }
        }

        // Bodily injury component
        const injuryBreakdown = reserveAnalysis.breakdown.find(
            b => b.category === 'Bodily Injury'
        );
        if (injuryBreakdown) {
            components.push({
                category: 'Medical Expenses',
                description: 'Medical treatment costs',
                amount: injuryBreakdown.recommended * 0.6, // Medical portion
                basis: 'Actual medical bills and projected treatment',
            });

            components.push({
                category: 'Pain and Suffering',
                description: 'General damages for pain and suffering',
                amount: injuryBreakdown.recommended * 0.4, // P&S portion
                basis: 'Multiplier method based on injury severity',
            });
        }

        // Rental car component
        const rentalBreakdown = reserveAnalysis.breakdown.find(
            b => b.category === 'Rental Car'
        );
        if (rentalBreakdown) {
            components.push({
                category: 'Loss of Use',
                description: 'Rental vehicle during repair period',
                amount: rentalBreakdown.recommended,
                basis: `Estimated repair time at standard daily rate`,
            });
        }

        // Towing and storage
        const towingBreakdown = reserveAnalysis.breakdown.find(
            b => b.category === 'Towing & Storage'
        );
        if (towingBreakdown) {
            components.push({
                category: 'Towing & Storage',
                description: 'Towing and vehicle storage fees',
                amount: towingBreakdown.recommended,
                basis: 'Actual invoiced amounts',
            });
        }

        // Lost wages
        if (claimData.lostWages) {
            components.push({
                category: 'Lost Wages',
                description: 'Income lost due to injuries',
                amount: claimData.lostWages.estimated,
                basis: 'Verified employment and wage documentation',
            });
        }

        return components;
    }

    private applyCoverageLimits(
        components: SettlementComponent[],
        coverageAnalysis: CoverageAnalysis
    ): SettlementComponent[] {
        const netAvailable = coverageAnalysis.netCoverageAvailable;
        const totalRequested = components.reduce((sum, c) => sum + c.amount, 0);

        if (totalRequested <= netAvailable) {
            return components; // All amounts within limits
        }

        // Need to reduce amounts proportionally
        const ratio = netAvailable / totalRequested;

        return components.map(component => ({
            ...component,
            amount: Math.round(component.amount * ratio),
            basis: `${component.basis} (Adjusted to policy limits)`,
        }));
    }

    private checkAutoApprovalEligibility(
        amount: number,
        claimData: ClaimData,
        coverageAnalysis: CoverageAnalysis
    ): boolean {
        // Check amount threshold
        if (amount > AUTO_APPROVAL_THRESHOLDS.MAX_AMOUNT) {
            return false;
        }

        // Check fraud score
        if ((claimData.fraudScore || 0) > AUTO_APPROVAL_THRESHOLDS.FRAUD_SCORE) {
            return false;
        }

        // Check complexity
        if (claimData.injuries) {
            return false; // Injury claims require review
        }

        // Check for coverage gaps
        if (coverageAnalysis.gaps.length > 0) {
            return false;
        }

        // Check claim type
        const autoApprovalTypes = ['COLLISION', 'COMPREHENSIVE', 'GLASS'];
        if (!autoApprovalTypes.includes(claimData.claimType)) {
            return false;
        }

        return true;
    }

    private calculateNegotiationRange(
        baseAmount: number,
        claimData: ClaimData
    ): SettlementNegotiationRange {
        // Calculate range based on claim characteristics
        let minMultiplier = 0.85;
        let maxMultiplier = 1.0;

        // Adjust for strong liability cases
        if (claimData.liabilityPercentage && claimData.liabilityPercentage > 80) {
            minMultiplier = 0.90;
        }

        // Adjust for disputed claims
        if (claimData.disputed) {
            minMultiplier = 0.75;
            maxMultiplier = 0.95;
        }

        return {
            minimum: Math.round(baseAmount * minMultiplier),
            target: Math.round(baseAmount * 0.95),
            maximum: baseAmount,
        };
    }

    private async generateSettlementLetter(
        claimData: ClaimData,
        components: SettlementComponent[],
        grossAmount: number,
        deductibleAmount: number,
        netAmount: number
    ): Promise<string> {
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const componentList = components
            .map(c => `  ${c.description}: $${c.amount.toLocaleString()}`)
            .join('\n');

        return `
SETTLEMENT OFFER

Date: ${date}
Claim Number: ${claimData.claimNumber}
Policy Number: ${claimData.policyNumber}

Dear ${claimData.claimantName || 'Policyholder'},

We have completed our evaluation of your claim for the incident that occurred on ${new Date(claimData.lossDate).toLocaleDateString()}.

Based on our investigation and damage assessment, we are prepared to offer the following settlement:

SETTLEMENT BREAKDOWN:
${componentList}

Gross Settlement Amount: $${grossAmount.toLocaleString()}
Less Deductible: ($${deductibleAmount.toLocaleString()})
-----------------------------------
NET SETTLEMENT OFFER: $${netAmount.toLocaleString()}

This settlement offer is made in full and final satisfaction of your claim. Upon acceptance, you will be required to sign a release form releasing all claims arising from this incident.

This offer is valid for 30 days from the date of this letter. Please contact us to accept this settlement or discuss any questions you may have.

If you accept this settlement:
1. Sign and return the enclosed release form
2. Provide payment instructions (check or direct deposit)
3. Return any rental vehicle (if applicable)

We appreciate your patience during our claims process and hope this settlement meets your expectations.

Sincerely,

Claims Department
ClaimAgent™ Insurance Services
    `.trim();
    }

    private buildPaymentDetails(
        claimData: ClaimData,
        amount: number
    ): { payee: string; method: string; splitPayments?: { payee: string; amount: number }[] } {
        // Determine payee based on claim type and lienholder
        const hasLienholder = claimData.vehicleLienholder;
        const method = amount > 10000 ? 'ACH Transfer' : 'Check';

        if (hasLienholder && claimData.isTotalLoss) {
            return {
                payee: `${claimData.claimantName || 'Policyholder'} AND ${claimData.vehicleLienholder}`,
                method,
                splitPayments: [
                    { payee: claimData.vehicleLienholder, amount: claimData.vehicleLoanBalance || 0 },
                    { payee: claimData.claimantName || 'Policyholder', amount: amount - (claimData.vehicleLoanBalance || 0) },
                ],
            };
        }

        return {
            payee: claimData.claimantName || 'Policyholder',
            method,
        };
    }

    private determineReleaseRequired(claimData: ClaimData): boolean {
        // Release required for:
        // - All liability claims
        // - Claims with injuries
        // - Third-party claims
        // - Total loss claims

        return !!(
            claimData.claimType === 'LIABILITY' ||
            claimData.injuries ||
            claimData.isThirdParty ||
            claimData.isTotalLoss
        );
    }

    private calculateExpirationDate(): string {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + 30);
        return expDate.toISOString();
    }

    private calculateConfidence(components: SettlementComponent[]): number {
        if (components.length === 0) return 0.5;

        // Higher confidence with more documented components
        let confidence = 0.6;
        confidence += Math.min(components.length * 0.05, 0.2);

        // Check if all components have basis
        const withBasis = components.filter(c => c.basis && c.basis.length > 0);
        confidence += (withBasis.length / components.length) * 0.1;

        return Math.min(confidence, 0.95);
    }

    private generateRecommendations(
        draft: SettlementDraft,
        claimData: ClaimData
    ): string[] {
        const recommendations: string[] = [];

        if (draft.autoApprovalEligible) {
            recommendations.push('Claim eligible for auto-approval - proceed with settlement');
        } else {
            recommendations.push('Manual review required before issuing settlement');
        }

        if (draft.releaseRequired) {
            recommendations.push('Obtain signed release before payment disbursement');
        }

        if (draft.paymentDetails.splitPayments) {
            recommendations.push('Issue split payments to policyholder and lienholder');
        }

        if (claimData.isTotalLoss) {
            recommendations.push('Arrange for salvage title transfer and vehicle pickup');
        }

        if (draft.netAmount > 25000) {
            recommendations.push('Recommend supervisor review before final approval');
        }

        recommendations.push(`Settlement offer expires ${new Date(draft.expirationDate).toLocaleDateString()}`);

        return recommendations;
    }
}

export const settlementDrafter = new SettlementDrafter();

