// src/lib/agents/investigation/liabilityAssessor.ts
// Agent B2: Liability Assessor - Determines fault and liability percentages

import { ClaimData, Participant } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface LiabilityAssessment {
    claimId: string;
    assessmentDate: string;
    insuredLiability: number;
    otherPartyLiability: number;
    liabilityType: 'CLEAR' | 'SHARED' | 'DISPUTED' | 'UNDETERMINED';
    faultIndicators: FaultIndicator[];
    contributingFactors: string[];
    comparativeNegligenceApplicable: boolean;
    stateRule: 'PURE_COMPARATIVE' | 'MODIFIED_COMPARATIVE_50' | 'MODIFIED_COMPARATIVE_51' | 'CONTRIBUTORY';
    recoveryPotential: number;
    subrogationRecommended: boolean;
    recommendations: string[];
}

interface FaultIndicator {
    factor: string;
    weight: number;
    favoredParty: 'INSURED' | 'OTHER_PARTY' | 'NEUTRAL';
    source: string;
}

export class LiabilityAssessor {
    private readonly agentId: AgentRole = AgentRole.LIABILITY_ASSESSOR;

    // State comparative negligence rules
    private readonly stateRules: Record<string, string> = {
        // Contributory negligence (bars recovery if any fault)
        AL: 'CONTRIBUTORY', DC: 'CONTRIBUTORY', MD: 'CONTRIBUTORY', NC: 'CONTRIBUTORY', VA: 'CONTRIBUTORY',
        // Modified comparative (50% bar)
        AR: 'MODIFIED_COMPARATIVE_50', CO: 'MODIFIED_COMPARATIVE_50', GA: 'MODIFIED_COMPARATIVE_50',
        ID: 'MODIFIED_COMPARATIVE_50', KS: 'MODIFIED_COMPARATIVE_50', ME: 'MODIFIED_COMPARATIVE_50',
        NE: 'MODIFIED_COMPARATIVE_50', ND: 'MODIFIED_COMPARATIVE_50', OK: 'MODIFIED_COMPARATIVE_50',
        TN: 'MODIFIED_COMPARATIVE_50', UT: 'MODIFIED_COMPARATIVE_50', WV: 'MODIFIED_COMPARATIVE_50',
        // Modified comparative (51% bar)
        CT: 'MODIFIED_COMPARATIVE_51', DE: 'MODIFIED_COMPARATIVE_51', HI: 'MODIFIED_COMPARATIVE_51',
        IL: 'MODIFIED_COMPARATIVE_51', IN: 'MODIFIED_COMPARATIVE_51', IA: 'MODIFIED_COMPARATIVE_51',
        MA: 'MODIFIED_COMPARATIVE_51', MI: 'MODIFIED_COMPARATIVE_51', MN: 'MODIFIED_COMPARATIVE_51',
        MT: 'MODIFIED_COMPARATIVE_51', NV: 'MODIFIED_COMPARATIVE_51', NH: 'MODIFIED_COMPARATIVE_51',
        NJ: 'MODIFIED_COMPARATIVE_51', OH: 'MODIFIED_COMPARATIVE_51', OR: 'MODIFIED_COMPARATIVE_51',
        PA: 'MODIFIED_COMPARATIVE_51', SC: 'MODIFIED_COMPARATIVE_51', TX: 'MODIFIED_COMPARATIVE_51',
        VT: 'MODIFIED_COMPARATIVE_51', WI: 'MODIFIED_COMPARATIVE_51', WY: 'MODIFIED_COMPARATIVE_51',
        // Pure comparative (recovery reduced by fault %)
        AK: 'PURE_COMPARATIVE', AZ: 'PURE_COMPARATIVE', CA: 'PURE_COMPARATIVE', FL: 'PURE_COMPARATIVE',
        KY: 'PURE_COMPARATIVE', LA: 'PURE_COMPARATIVE', MS: 'PURE_COMPARATIVE', MO: 'PURE_COMPARATIVE',
        NM: 'PURE_COMPARATIVE', NY: 'PURE_COMPARATIVE', RI: 'PURE_COMPARATIVE', SD: 'PURE_COMPARATIVE',
        WA: 'PURE_COMPARATIVE',
    };

    async assess(claimData: ClaimData): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];

        try {
            // Step 1: Gather fault indicators
            const faultIndicators = await this.gatherFaultIndicators(claimData);

            // Step 2: Calculate initial liability split
            const liabilitySplit = this.calculateLiabilitySplit(faultIndicators);

            // Step 3: Determine liability type
            const liabilityType = this.determineLiabilityType(liabilitySplit);

            // Step 4: Get state comparative negligence rule
            const stateRule = this.getStateRule(claimData.lossState);

            // Step 5: Calculate recovery potential
            const recoveryPotential = this.calculateRecoveryPotential(
                liabilitySplit.insured,
                stateRule,
                claimData.estimatedAmount || 0
            );

            // Step 6: Determine subrogation potential
            const subrogationRecommended = this.evaluateSubrogation(
                liabilitySplit.otherParty,
                claimData
            );

            // Step 7: Identify contributing factors
            const contributingFactors = this.identifyContributingFactors(claimData);

            // Step 8: Check for escalations
            if (liabilityType === 'DISPUTED') {
                escalations.push({
                    type: 'LIABILITY_DISPUTE',
                    reason: 'Liability determination is disputed',
                    severity: 'MEDIUM',
                });
            }

            if (liabilitySplit.insured > 50 && claimData.isThirdParty) {
                escalations.push({
                    type: 'HIGH_LIABILITY',
                    reason: `Insured may be ${liabilitySplit.insured}% at fault`,
                    severity: 'HIGH',
                });
            }

            const assessment: LiabilityAssessment = {
                claimId: claimData.id,
                assessmentDate: new Date().toISOString(),
                insuredLiability: liabilitySplit.insured,
                otherPartyLiability: liabilitySplit.otherParty,
                liabilityType,
                faultIndicators,
                contributingFactors,
                comparativeNegligenceApplicable: this.isComparativeApplicable(stateRule, liabilitySplit.insured),
                stateRule: stateRule as LiabilityAssessment['stateRule'],
                recoveryPotential,
                subrogationRecommended,
                recommendations: this.generateRecommendations(liabilitySplit, liabilityType, subrogationRecommended),
            };

            await auditLog({
                claimId: claimData.id,
                action: 'LIABILITY_ASSESSMENT_COMPLETED',
                agentId: this.agentId,
                description: `Liability: Insured ${liabilitySplit.insured}%, Other ${liabilitySplit.otherParty}%`,
                details: { assessment },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: assessment,
                confidence: this.calculateConfidence(faultIndicators, claimData),
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: assessment.recommendations,
            };
        } catch (error) {
            console.error('Liability assessment error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Liability assessment failed',
                processingTime: Date.now() - startTime,
            };
        }
    }

    private async gatherFaultIndicators(claimData: ClaimData): Promise<FaultIndicator[]> {
        const indicators: FaultIndicator[] = [];

        // Police report indicators
        if (claimData.policeReportNumber) {
            // Check for citations
            if (claimData.citationIssued === true) {
                indicators.push({
                    factor: 'Citation issued to other party',
                    weight: 0.8,
                    favoredParty: 'INSURED',
                    source: 'Police Report',
                });
            } else if (claimData.citationIssued === false && claimData.insuredCited) {
                indicators.push({
                    factor: 'Citation issued to insured',
                    weight: 0.8,
                    favoredParty: 'OTHER_PARTY',
                    source: 'Police Report',
                });
            }

            // Police fault determination
            if (claimData.policeFaultDetermination) {
                indicators.push({
                    factor: `Police determined fault: ${claimData.policeFaultDetermination}`,
                    weight: 0.7,
                    favoredParty: claimData.policeFaultDetermination === 'OTHER' ? 'INSURED' : 'OTHER_PARTY',
                    source: 'Police Report',
                });
            }
        }

        // Damage location indicators
        const damageLocation = this.analyzeDamageLocation(claimData);
        if (damageLocation) {
            indicators.push(damageLocation);
        }

        // Statement analysis
        const statementIndicators = this.analyzeStatements(claimData.participants || []);
        indicators.push(...statementIndicators);

        // Traffic violation indicators
        const violationIndicators = this.analyzeViolations(claimData);
        indicators.push(...violationIndicators);

        // Witness statements
        if (claimData.witnesses && claimData.witnesses.length > 0) {
            const witnessIndicator = this.analyzeWitnessStatements(claimData.witnesses);
            if (witnessIndicator) {
                indicators.push(witnessIndicator);
            }
        }

        return indicators;
    }

    private analyzeDamageLocation(claimData: ClaimData): FaultIndicator | null {
        const damages = claimData.damages || [];

        const hasRearDamage = damages.some(d =>
            d.component?.toLowerCase().includes('rear') ||
            d.component?.toLowerCase().includes('taillight') ||
            d.component?.toLowerCase().includes('trunk')
        );

        const hasFrontDamage = damages.some(d =>
            d.component?.toLowerCase().includes('front') ||
            d.component?.toLowerCase().includes('hood') ||
            d.component?.toLowerCase().includes('headlight')
        );

        // Rear-end collision - typically other party at fault
        if (hasRearDamage && !hasFrontDamage) {
            return {
                factor: 'Rear-end damage pattern suggests insured was struck from behind',
                weight: 0.7,
                favoredParty: 'INSURED',
                source: 'Damage Analysis',
            };
        }

        // Front-end collision while other vehicle has rear damage
        if (hasFrontDamage && claimData.otherVehicleDamageLocation === 'REAR') {
            return {
                factor: 'Front-end damage with other vehicle rear damage suggests insured at fault',
                weight: 0.7,
                favoredParty: 'OTHER_PARTY',
                source: 'Damage Analysis',
            };
        }

        return null;
    }

    private analyzeStatements(participants: Participant[]): FaultIndicator[] {
        const indicators: FaultIndicator[] = [];

        for (const participant of participants) {
            if (participant.role === 'OTHER_DRIVER' && participant.statement) {
                const statement = participant.statement.toLowerCase();

                // Look for admissions
                if (statement.includes("my fault") || statement.includes("i caused") || statement.includes("i hit")) {
                    indicators.push({
                        factor: 'Other party admission of fault in statement',
                        weight: 0.9,
                        favoredParty: 'INSURED',
                        source: 'Participant Statement',
                    });
                }

                // Look for blame placement
                if (statement.includes("their fault") || statement.includes("they hit") || statement.includes("they caused")) {
                    indicators.push({
                        factor: 'Other party blames insured',
                        weight: 0.3,
                        favoredParty: 'OTHER_PARTY',
                        source: 'Participant Statement',
                    });
                }
            }
        }

        return indicators;
    }

    private analyzeViolations(claimData: ClaimData): FaultIndicator[] {
        const indicators: FaultIndicator[] = [];
        const description = claimData.lossDescription?.toLowerCase() || '';

        // Running red light
        if (description.includes('ran red light') || description.includes('red light violation')) {
            indicators.push({
                factor: 'Red light violation',
                weight: 0.85,
                favoredParty: description.includes('other') ? 'INSURED' : 'OTHER_PARTY',
                source: 'Loss Description',
            });
        }

        // Stop sign violation
        if (description.includes('ran stop sign') || description.includes('stop sign violation')) {
            indicators.push({
                factor: 'Stop sign violation',
                weight: 0.8,
                favoredParty: description.includes('other') ? 'INSURED' : 'OTHER_PARTY',
                source: 'Loss Description',
            });
        }

        // Speeding
        if (description.includes('speeding') || description.includes('excessive speed')) {
            indicators.push({
                factor: 'Speeding violation',
                weight: 0.6,
                favoredParty: description.includes('other') ? 'INSURED' : 'OTHER_PARTY',
                source: 'Loss Description',
            });
        }

        // DUI
        if (description.includes('dui') || description.includes('intoxicated') || description.includes('drunk')) {
            indicators.push({
                factor: 'Driving under influence',
                weight: 0.95,
                favoredParty: description.includes('other') ? 'INSURED' : 'OTHER_PARTY',
                source: 'Loss Description',
            });
        }

        // Distracted driving
        if (description.includes('phone') || description.includes('texting') || description.includes('distracted')) {
            indicators.push({
                factor: 'Distracted driving',
                weight: 0.7,
                favoredParty: description.includes('other') ? 'INSURED' : 'OTHER_PARTY',
                source: 'Loss Description',
            });
        }

        return indicators;
    }

    private analyzeWitnessStatements(witnesses: Array<{ name: string; statement?: string }>): FaultIndicator | null {
        const favorInsured = witnesses.filter(w =>
            w.statement?.toLowerCase().includes('other driver') &&
            (w.statement?.toLowerCase().includes('fault') || w.statement?.toLowerCase().includes('caused'))
        ).length;

        const favorOther = witnesses.filter(w =>
            w.statement?.toLowerCase().includes('insured') &&
            (w.statement?.toLowerCase().includes('fault') || w.statement?.toLowerCase().includes('caused'))
        ).length;

        if (favorInsured > favorOther) {
            return {
                factor: `${favorInsured} witness(es) support insured's account`,
                weight: 0.5 + (favorInsured * 0.1),
                favoredParty: 'INSURED',
                source: 'Witness Statements',
            };
        } else if (favorOther > favorInsured) {
            return {
                factor: `${favorOther} witness(es) support other party's account`,
                weight: 0.5 + (favorOther * 0.1),
                favoredParty: 'OTHER_PARTY',
                source: 'Witness Statements',
            };
        }

        return null;
    }

    private calculateLiabilitySplit(indicators: FaultIndicator[]): { insured: number; otherParty: number } {
        if (indicators.length === 0) {
            return { insured: 50, otherParty: 50 }; // Default to 50/50
        }

        let insuredScore = 0;
        let otherPartyScore = 0;
        let totalWeight = 0;

        for (const indicator of indicators) {
            totalWeight += indicator.weight;

            if (indicator.favoredParty === 'INSURED') {
                insuredScore += indicator.weight;
            } else if (indicator.favoredParty === 'OTHER_PARTY') {
                otherPartyScore += indicator.weight;
            } else {
                // Neutral - split equally
                insuredScore += indicator.weight / 2;
                otherPartyScore += indicator.weight / 2;
            }
        }

        // Calculate percentages
        if (totalWeight === 0) {
            return { insured: 50, otherParty: 50 };
        }

        const insuredPercent = Math.round((otherPartyScore / totalWeight) * 100);
        const otherPartyPercent = 100 - insuredPercent;

        return {
            insured: Math.max(0, Math.min(100, insuredPercent)),
            otherParty: Math.max(0, Math.min(100, otherPartyPercent))
        };
    }

    private determineLiabilityType(split: { insured: number; otherParty: number }): 'CLEAR' | 'SHARED' | 'DISPUTED' | 'UNDETERMINED' {
        if (split.insured === 0 || split.otherParty === 0) {
            return 'CLEAR';
        } else if (Math.abs(split.insured - split.otherParty) < 20) {
            return 'DISPUTED';
        } else if (split.insured > 0 && split.otherParty > 0) {
            return 'SHARED';
        }
        return 'UNDETERMINED';
    }

    private getStateRule(state?: string): string {
        return state ? (this.stateRules[state] || 'PURE_COMPARATIVE') : 'PURE_COMPARATIVE';
    }

    private isComparativeApplicable(rule: string, insuredFault: number): boolean {
        switch (rule) {
            case 'CONTRIBUTORY':
                return insuredFault === 0; // Any fault bars recovery
            case 'MODIFIED_COMPARATIVE_50':
                return insuredFault < 50;
            case 'MODIFIED_COMPARATIVE_51':
                return insuredFault <= 50;
            case 'PURE_COMPARATIVE':
                return insuredFault < 100;
            default:
                return true;
        }
    }

    private calculateRecoveryPotential(
        insuredFault: number,
        stateRule: string,
        claimAmount: number
    ): number {
        if (!this.isComparativeApplicable(stateRule, insuredFault)) {
            return 0;
        }

        const otherPartyFault = 100 - insuredFault;
        return Math.round(claimAmount * (otherPartyFault / 100));
    }

    private evaluateSubrogation(otherPartyFault: number, claimData: ClaimData): boolean {
        // Recommend subrogation if:
        // - Other party is at least 50% at fault
        // - Claim amount is significant
        // - Other party is insured

        if (otherPartyFault < 50) return false;
        if ((claimData.estimatedAmount || 0) < 2000) return false;

        // Check if other party has insurance
        const otherDriver = claimData.participants?.find(p => p.role === 'OTHER_DRIVER');
        if (otherDriver?.insuranceCompany) {
            return true;
        }

        return otherPartyFault >= 75;
    }

    private identifyContributingFactors(claimData: ClaimData): string[] {
        const factors: string[] = [];
        const description = claimData.lossDescription?.toLowerCase() || '';

        if (description.includes('weather') || description.includes('rain') || description.includes('snow')) {
            factors.push('Adverse weather conditions');
        }

        if (description.includes('night') || description.includes('dark') || description.includes('visibility')) {
            factors.push('Low visibility conditions');
        }

        if (description.includes('construction') || description.includes('road work')) {
            factors.push('Road construction zone');
        }

        if (description.includes('intersection')) {
            factors.push('Intersection collision');
        }

        if (description.includes('parking lot')) {
            factors.push('Parking lot incident');
        }

        if (description.includes('highway') || description.includes('freeway')) {
            factors.push('Highway/freeway collision');
        }

        return factors;
    }

    private calculateConfidence(indicators: FaultIndicator[], claimData: ClaimData): number {
        let confidence = 0.5;

        // More indicators = higher confidence
        confidence += Math.min(indicators.length * 0.05, 0.2);

        // High-weight indicators increase confidence
        const highWeightCount = indicators.filter(i => i.weight > 0.7).length;
        confidence += highWeightCount * 0.05;

        // Police report increases confidence
        if (claimData.policeReportNumber) confidence += 0.1;

        // Witnesses increase confidence
        if (claimData.witnesses && claimData.witnesses.length > 0) confidence += 0.05;

        return Math.min(confidence, 0.95);
    }

    private generateRecommendations(
        split: { insured: number; otherParty: number },
        type: string,
        subrogation: boolean
    ): string[] {
        const recommendations: string[] = [];

        if (type === 'CLEAR' && split.otherParty === 100) {
            recommendations.push('Clear liability on other party - proceed with claim payment');
            if (subrogation) {
                recommendations.push('Initiate subrogation against other party insurer');
            }
        } else if (type === 'CLEAR' && split.insured === 100) {
            recommendations.push('Insured appears at fault - review for collision coverage');
        } else if (type === 'SHARED') {
            recommendations.push(`Shared liability (${split.insured}/${split.otherParty}) - apply comparative negligence`);
        } else if (type === 'DISPUTED') {
            recommendations.push('Liability is disputed - gather additional evidence');
            recommendations.push('Consider independent investigation');
        }

        if (subrogation) {
            recommendations.push('Subrogation recovery potential exists');
        }

        return recommendations;
    }
}

export const liabilityAssessor = new LiabilityAssessor();

