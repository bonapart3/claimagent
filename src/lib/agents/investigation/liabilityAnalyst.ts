/**
 * ClaimAgent™ - Liability Analyst (Agent B3)
 * 
 * ADVISORY ONLY - NEVER MAKES FINAL LIABILITY DETERMINATIONS
 * 
 * Responsibilities:
 * - Surface relevant policy language for adjusters
 * - Present comparative negligence frameworks
 * - Provide jurisdiction-specific rule guidance
 * - Highlight potential coverage issues
 * - Suggest areas requiring further investigation
 * - ALWAYS defer final decisions to human adjusters
 * 
 * @module agents/investigation/liabilityAnalyst
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { getStateRegulation } from '@/lib/constants/stateRegulations';

export interface LiabilityAnalysisInput {
    claimId: string;
    state: string;
    incidentType: 'collision' | 'rear_end' | 'intersection' | 'parking_lot' | 'single_vehicle' | 'multi_vehicle' | 'pedestrian' | 'other';
    partiesInvolved: Party[];
    policeReport?: PoliceReportData;
    statements: Statement[];
    evidenceNotes: string[];
    policyDetails: PolicyDetails;
}

export interface Party {
    id: string;
    role: 'insured' | 'claimant' | 'third_party' | 'witness';
    name: string;
    vehicleDetails?: { year: number; make: string; model: string; vin?: string };
    insuranceInfo?: { carrier?: string; policyNumber?: string; limitsKnown: boolean };
}

export interface PoliceReportData {
    reportNumber: string;
    officerName: string;
    faultIndicator?: string;
    citationsIssued: Citation[];
    diagramAvailable: boolean;
    weatherConditions: string;
    roadConditions: string;
}

export interface Citation { party: string; violation: string; code: string; }
export interface Statement { from: string; role: string; date: Date; summary: string; consistencyScore?: number; }
export interface PolicyDetails { policyNumber: string; coverages: Coverage[]; limits: Limits; exclusions: string[]; endorsements: string[]; }
export interface Coverage { type: 'liability' | 'collision' | 'comprehensive' | 'UM' | 'UIM' | 'medical_payments' | 'rental'; active: boolean; deductible?: number; }
export interface Limits { bodilyInjuryPerPerson: number; bodilyInjuryPerAccident: number; propertyDamage: number; uninsuredMotorist?: number; underinsuredMotorist?: number; }

export interface LiabilityAnalysisOutput {
    claimId: string;
    analysisDate: Date;
    disclaimer: string;
    jurisdictionRules: JurisdictionGuidance;
    policyGuidance: PolicyGuidance;
    liabilityScenarios: LiabilityScenario[];
    investigationRecommendations: string[];
    coverageConsiderations: CoverageConsideration[];
    complianceNotes: string[];
    requiresLegalReview: boolean;
    confidence: number;
}

export interface JurisdictionGuidance {
    state: string;
    negligenceStandard: 'pure_comparative' | 'modified_comparative_50' | 'modified_comparative_51' | 'contributory';
    keyStatutes: string[];
    relevantCaseLaw: string[];
    specialRules: string[];
    timeRequirements: { acknowledgment: number; investigation: number; decision: number };
}

export interface PolicyGuidance {
    applicableCoverages: string[];
    potentialExclusions: PotentialExclusion[];
    limitsConcerns: string[];
    endorsementImpact: string[];
    policyLanguageExcerpts: PolicyExcerpt[];
}

export interface PotentialExclusion { exclusionType: string; policyLanguage: string; applicability: 'likely' | 'possible' | 'unlikely'; reasoning: string; requiresReview: boolean; }
export interface PolicyExcerpt { section: string; text: string; relevance: string; page?: number; }

export interface LiabilityScenario {
    scenarioName: string;
    description: string;
    supportingEvidence: string[];
    contradictingEvidence: string[];
    liabilityDistribution: { party: string; percentage: number }[];
    legalBasis: string[];
    strengthOfCase: 'strong' | 'moderate' | 'weak';
    furtherInvestigationNeeded: string[];
    disclaimerNote: string;
}

export interface CoverageConsideration {
    issue: string;
    impact: 'coverage_denied' | 'coverage_limited' | 'coverage_questioned' | 'coverage_confirmed';
    analysis: string;
    policyReference: string;
    recommendation: string;
}

export class LiabilityAnalyst {
    private readonly DISCLAIMER = "⚠️ ADVISORY ONLY: This analysis is for informational purposes only. All liability determinations and coverage decisions must be made by licensed adjusters or legal counsel. Do not rely solely on this analysis for claim disposition.";

    async analyzeLiability(input: LiabilityAnalysisInput): Promise<LiabilityAnalysisOutput> {
        await auditLog({ action: 'LIABILITY_ANALYSIS_INITIATED', entityType: 'claim', entityId: input.claimId, metadata: { state: input.state, incidentType: input.incidentType, disclaimer: 'Advisory analysis only - not a determination' } });

        try {
            const jurisdictionRules = this.getJurisdictionGuidance(input.state);
            const policyGuidance = this.analyzePolicyGuidance(input.policyDetails, input);
            const liabilityScenarios = this.developLiabilityScenarios(input, jurisdictionRules);
            const investigationRecommendations = this.generateInvestigationRecommendations(input, liabilityScenarios);
            const coverageConsiderations = this.identifyCoverageConsiderations(input, policyGuidance);
            const complianceNotes = this.compileComplianceNotes(input.state, jurisdictionRules);
            const requiresLegalReview = this.requiresLegalReview(input, coverageConsiderations);
            const confidence = this.calculateAnalysisConfidence(input);

            const output: LiabilityAnalysisOutput = { claimId: input.claimId, analysisDate: new Date(), disclaimer: this.DISCLAIMER, jurisdictionRules, policyGuidance, liabilityScenarios, investigationRecommendations, coverageConsiderations, complianceNotes, requiresLegalReview, confidence };
            await auditLog({ action: 'LIABILITY_ANALYSIS_COMPLETED', entityType: 'claim', entityId: input.claimId, metadata: { scenariosGenerated: liabilityScenarios.length, requiresLegalReview, disclaimer: 'Advisory guidance provided - awaiting human decision' } });
            return output;
        } catch (error) {
            await auditLog({ action: 'LIABILITY_ANALYSIS_ERROR', entityType: 'claim', entityId: input.claimId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
            throw error;
        }
    }

    private getJurisdictionGuidance(state: string): JurisdictionGuidance {
        const stateRegs = getStateRegulation(state);
        const negligenceMap: Record<string, JurisdictionGuidance['negligenceStandard']> = {
            'CA': 'pure_comparative', 'NY': 'pure_comparative', 'FL': 'pure_comparative', 'AK': 'pure_comparative', 'AZ': 'pure_comparative',
            'AR': 'modified_comparative_50', 'CO': 'modified_comparative_50', 'GA': 'modified_comparative_50', 'ID': 'modified_comparative_50',
            'CT': 'modified_comparative_51', 'DE': 'modified_comparative_51', 'HI': 'modified_comparative_51', 'IL': 'modified_comparative_51', 'TX': 'modified_comparative_51',
            'AL': 'contributory', 'DC': 'contributory', 'MD': 'contributory', 'NC': 'contributory', 'VA': 'contributory'
        };

        return {
            state,
            negligenceStandard: negligenceMap[state] || 'pure_comparative',
            keyStatutes: stateRegs ? stateRegs.specificRequirements : ['State regulations not loaded - manual review required'],
            relevantCaseLaw: [`${state} comparative negligence standard applies`, `Review ${state} DOI guidelines for liability determination`],
            specialRules: this.getStateSpecialRules(state, stateRegs),
            timeRequirements: { acknowledgment: stateRegs?.timeRequirements.acknowledgment || 24, investigation: stateRegs?.timeRequirements.investigationDays || 15, decision: stateRegs?.timeRequirements.decisionDays || 30 }
        };
    }

    private getStateSpecialRules(state: string, regs: any): string[] {
        const rules: string[] = [];
        const noFaultStates = ['FL', 'HI', 'KS', 'KY', 'MA', 'MI', 'MN', 'NJ', 'NY', 'ND', 'PA', 'UT'];
        if (noFaultStates.includes(state)) rules.push(`${state} is a no-fault state - PIP/medical payments primary for insured's injuries`);
        if (['AL', 'DC', 'MD', 'NC', 'VA'].includes(state)) rules.push(`${state} follows pure contributory negligence - any fault by claimant bars recovery`);
        if (regs?.diminishedValue?.allowed) rules.push(`${state} recognizes diminished value claims`);
        if (regs?.totalLossRules?.threshold) rules.push(`${state} total loss threshold: ${Math.round(regs.totalLossRules.threshold * 100)}% of ACV`);
        return rules;
    }

    private analyzePolicyGuidance(policy: PolicyDetails, input: LiabilityAnalysisInput): PolicyGuidance {
        const applicableCoverages: string[] = [];
        const potentialExclusions: PotentialExclusion[] = [];
        const limitsConcerns: string[] = [];
        const endorsementImpact: string[] = [];

        for (const coverage of policy.coverages) {
            if (coverage.active) applicableCoverages.push(`${coverage.type} coverage active${coverage.deductible ? ` ($${coverage.deductible} deductible)` : ''}`);
        }

        for (const exclusion of policy.exclusions) {
            const applicability = this.assessExclusionApplicability(exclusion, input);
            if (applicability !== 'unlikely') {
                potentialExclusions.push({ exclusionType: exclusion, policyLanguage: this.getExclusionLanguage(exclusion), applicability, reasoning: this.explainExclusionApplicability(exclusion, input), requiresReview: applicability === 'likely' });
            }
        }

        if (input.partiesInvolved.length > 2) limitsConcerns.push('Multiple claimants may exceed per-accident limits');
        if (input.statements.some(s => s.summary.toLowerCase().includes('injury'))) limitsConcerns.push('Bodily injury claim may approach policy limits - monitor closely');

        for (const endorsement of policy.endorsements) endorsementImpact.push(`${endorsement} endorsement may affect coverage - review endorsement terms`);

        return { applicableCoverages, potentialExclusions, limitsConcerns, endorsementImpact, policyLanguageExcerpts: [{ section: 'Part A - Liability Coverage', text: 'We will pay damages for bodily injury or property damage for which any covered person becomes legally responsible because of an auto accident.', relevance: 'Defines liability coverage trigger', page: 4 }] };
    }

    private assessExclusionApplicability(exclusion: string, input: LiabilityAnalysisInput): 'likely' | 'possible' | 'unlikely' {
        const exclusionLower = exclusion.toLowerCase();
        if (exclusionLower.includes('intentional') && input.evidenceNotes.some(e => e.toLowerCase().includes('intentional'))) return 'possible';
        if (exclusionLower.includes('racing') && input.evidenceNotes.some(e => e.toLowerCase().includes('racing'))) return 'likely';
        if (exclusionLower.includes('business') && input.evidenceNotes.some(e => e.toLowerCase().includes('business') || e.toLowerCase().includes('commercial'))) return 'possible';
        return 'unlikely';
    }

    private getExclusionLanguage(exclusion: string): string {
        const languageMap: Record<string, string> = {
            'intentional': 'We do not provide Liability Coverage for any insured for bodily injury or property damage caused intentionally by or at the direction of that insured.',
            'racing': 'We do not provide coverage for any loss that occurs while a vehicle is being used in any racing, speed, or demolition contest or stunting activity.',
            'business': 'We do not provide coverage for liability assumed under any contract or agreement.'
        };
        for (const [key, language] of Object.entries(languageMap)) { if (exclusion.toLowerCase().includes(key)) return language; }
        return 'Exclusion language to be reviewed from policy documents';
    }

    private explainExclusionApplicability(exclusion: string, input: LiabilityAnalysisInput): string {
        const exclusionLower = exclusion.toLowerCase();
        if (exclusionLower.includes('intentional')) return 'Evidence notes suggest possible intentional act - requires investigation';
        if (exclusionLower.includes('racing')) return 'Witness statements reference high speed or racing - verify circumstances';
        if (exclusionLower.includes('business')) return 'Commercial use indicated - confirm policy covers business use';
        return 'Potential applicability based on claim circumstances - review recommended';
    }

    private developLiabilityScenarios(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario[] {
        const scenarios: LiabilityScenario[] = [];
        switch (input.incidentType) {
            case 'rear_end': scenarios.push(this.developRearEndScenario(input, jurisdiction)); break;
            case 'intersection': scenarios.push(...this.developIntersectionScenarios(input, jurisdiction)); break;
            case 'parking_lot': scenarios.push(this.developParkingLotScenario(input, jurisdiction)); break;
            case 'single_vehicle': scenarios.push(this.developSingleVehicleScenario(input, jurisdiction)); break;
            default: scenarios.push(this.developGeneralScenario(input, jurisdiction));
        }
        return scenarios;
    }

    private developRearEndScenario(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario {
        const insured = input.partiesInvolved.find(p => p.role === 'insured');
        const claimant = input.partiesInvolved.find(p => p.role === 'claimant');
        return {
            scenarioName: 'Rear-End Collision - Presumption of Fault',
            description: 'In rear-end collisions, there is typically a presumption that the following vehicle is at fault for failing to maintain safe following distance.',
            supportingEvidence: ['Rear-end collision pattern', input.policeReport?.faultIndicator || 'Police report indicates rear vehicle fault', 'Following vehicle has duty to maintain control'],
            contradictingEvidence: input.statements.filter(s => s.summary.toLowerCase().includes('sudden') || s.summary.toLowerCase().includes('stop')).map(s => `Statement suggests sudden stop: "${s.summary}"`),
            liabilityDistribution: [{ party: claimant?.name || 'Front Vehicle', percentage: 0 }, { party: insured?.name || 'Rear Vehicle', percentage: 100 }],
            legalBasis: ['Following vehicle duty to maintain safe distance', `${jurisdiction.state} Vehicle Code - Following Too Closely`, 'Rebuttable presumption of fault on following driver'],
            strengthOfCase: 'strong',
            furtherInvestigationNeeded: ['Verify no sudden lane change by front vehicle', 'Check for brake light functionality', 'Review telematics data for braking patterns'],
            disclaimerNote: '⚠️ This is an advisory scenario only. Final liability determination must be made by licensed adjuster.'
        };
    }

    private developIntersectionScenarios(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario[] {
        const scenarios: LiabilityScenario[] = [];
        if (input.policeReport?.citationsIssued && input.policeReport.citationsIssued.length > 0) {
            scenarios.push({ scenarioName: 'Intersection - Citation Issued', description: 'One party cited for traffic violation (e.g., running red light, failure to yield)', supportingEvidence: [`Citation issued: ${input.policeReport.citationsIssued[0].violation}`, 'Traffic control device violation establishes negligence'], contradictingEvidence: [], liabilityDistribution: [{ party: input.policeReport.citationsIssued[0].party, percentage: 100 }, { party: 'Other Party', percentage: 0 }], legalBasis: ['Violation of traffic law establishes negligence per se', `${jurisdiction.state} Vehicle Code ${input.policeReport.citationsIssued[0].code}`], strengthOfCase: 'strong', furtherInvestigationNeeded: ['Verify traffic signal timing', 'Obtain intersection camera footage if available'], disclaimerNote: '⚠️ Advisory scenario - final determination by licensed adjuster required' });
        }
        scenarios.push({ scenarioName: 'Intersection - Comparative Negligence', description: 'Both parties may share fault depending on right-of-way rules and comparative negligence standard', supportingEvidence: ['Conflicting statements suggest shared fault', 'No clear traffic control violation'], contradictingEvidence: [], liabilityDistribution: [{ party: 'Party A', percentage: 60 }, { party: 'Party B', percentage: 40 }], legalBasis: [`${jurisdiction.state} follows ${jurisdiction.negligenceStandard.replace(/_/g, ' ')} negligence`, 'Right-of-way rules apply', 'Duty to avoid collision despite right-of-way'], strengthOfCase: 'moderate', furtherInvestigationNeeded: ['Obtain independent witness statements', 'Review intersection design and visibility', 'Analyze vehicle damage patterns for impact angle'], disclaimerNote: '⚠️ Advisory scenario - complex comparative fault requires expert adjuster analysis' });
        return scenarios;
    }

    private developParkingLotScenario(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario {
        return { scenarioName: 'Parking Lot - Shared Fault Likely', description: 'Parking lot accidents often involve shared fault due to reduced traffic control and frequent backing movements', supportingEvidence: ['Private property parking lot', 'Both vehicles likely moving', 'Reduced traffic control compared to public roads'], contradictingEvidence: [], liabilityDistribution: [{ party: 'Vehicle 1', percentage: 50 }, { party: 'Vehicle 2', percentage: 50 }], legalBasis: ['Parking lot accidents subject to general negligence principles', 'Both drivers owe duty of care', `${jurisdiction.negligenceStandard.replace(/_/g, ' ')} applies`], strengthOfCase: 'moderate', furtherInvestigationNeeded: ['Determine which vehicle was backing', 'Establish right-of-way in parking lot lane', 'Review security camera footage', 'Assess visibility and obstructions'], disclaimerNote: '⚠️ Advisory scenario - parking lot liability is fact-intensive and requires thorough investigation' };
    }

    private developSingleVehicleScenario(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario {
        return { scenarioName: 'Single Vehicle - Driver Responsibility', description: 'Single vehicle accidents typically result in driver being solely responsible unless external factors caused loss of control', supportingEvidence: ['No other vehicles involved', 'Driver has duty to maintain control', 'Weather and road conditions'], contradictingEvidence: input.policeReport ? [`Road conditions: ${input.policeReport.roadConditions}`, `Weather: ${input.policeReport.weatherConditions}`] : [], liabilityDistribution: [{ party: input.partiesInvolved[0]?.name || 'Driver', percentage: 100 }], legalBasis: ['Driver duty to maintain reasonable control', 'Must adjust speed for conditions', 'Single vehicle presumption absent external cause'], strengthOfCase: 'strong', furtherInvestigationNeeded: ['Rule out mechanical failure', 'Assess road defects or hazards', 'Verify weather conditions at time of loss', 'Review for animal involvement'], disclaimerNote: '⚠️ Advisory scenario - external causation factors require thorough investigation' };
    }

    private developGeneralScenario(input: LiabilityAnalysisInput, jurisdiction: JurisdictionGuidance): LiabilityScenario {
        return { scenarioName: 'General Liability Analysis', description: 'Liability determination requires comprehensive investigation of all facts and circumstances', supportingEvidence: input.statements.map(s => `Statement: ${s.summary}`), contradictingEvidence: ['Conflicting accounts require further investigation'], liabilityDistribution: [{ party: 'Party A', percentage: 50 }, { party: 'Party B', percentage: 50 }], legalBasis: [`${jurisdiction.state} negligence law applies`, 'All parties owe duty of reasonable care', 'Causation must be established'], strengthOfCase: 'moderate', furtherInvestigationNeeded: ['Obtain all witness statements', 'Review physical evidence', 'Analyze vehicle damage patterns', 'Consider accident reconstruction'], disclaimerNote: '⚠️ Advisory scenario - complex facts require experienced adjuster review' };
    }

    private generateInvestigationRecommendations(input: LiabilityAnalysisInput, scenarios: LiabilityScenario[]): string[] {
        const recommendations = new Set<string>();
        for (const scenario of scenarios) { scenario.furtherInvestigationNeeded.forEach(rec => recommendations.add(rec)); }
        if (!input.policeReport) recommendations.add('Obtain police report if available');
        if (input.statements.length < input.partiesInvolved.length) recommendations.add('Obtain statements from all parties involved');
        const hasWitnesses = input.partiesInvolved.some(p => p.role === 'witness');
        if (!hasWitnesses) recommendations.add('Canvas for independent witnesses');
        recommendations.add('Request telematics data if available (speed, braking, location)');
        recommendations.add('Ensure comprehensive photo documentation of all vehicle damage and accident scene');
        return Array.from(recommendations);
    }

    private identifyCoverageConsiderations(input: LiabilityAnalysisInput, policyGuidance: PolicyGuidance): CoverageConsideration[] {
        const considerations: CoverageConsideration[] = [];
        for (const exclusion of policyGuidance.potentialExclusions) {
            if (exclusion.applicability === 'likely') { considerations.push({ issue: `Potential Exclusion: ${exclusion.exclusionType}`, impact: 'coverage_denied', analysis: exclusion.reasoning, policyReference: exclusion.policyLanguage, recommendation: 'Immediate coverage counsel review required before proceeding' }); }
            else if (exclusion.applicability === 'possible') { considerations.push({ issue: `Possible Exclusion: ${exclusion.exclusionType}`, impact: 'coverage_questioned', analysis: exclusion.reasoning, policyReference: exclusion.policyLanguage, recommendation: 'Further investigation needed to determine exclusion applicability' }); }
        }
        if (policyGuidance.limitsConcerns.length > 0) { considerations.push({ issue: 'Policy Limits Concern', impact: 'coverage_limited', analysis: policyGuidance.limitsConcerns.join('; '), policyReference: 'Policy Declarations Page', recommendation: 'Monitor claim value against policy limits; consider excess exposure' }); }
        return considerations;
    }

    private compileComplianceNotes(state: string, jurisdiction: JurisdictionGuidance): string[] {
        const notes: string[] = [];
        notes.push(`Liability analysis must be completed within ${jurisdiction.timeRequirements.investigation} days per ${state} regulations`);
        notes.push(`Coverage decision required within ${jurisdiction.timeRequirements.decision} days`);
        notes.push(`${state} follows ${jurisdiction.negligenceStandard.replace(/_/g, ' ')} negligence standard`);
        for (const rule of jurisdiction.specialRules) notes.push(rule);
        notes.push('All liability determinations subject to good faith investigation requirements');
        notes.push('Document all investigation steps thoroughly for potential bad faith defense');
        return notes;
    }

    private requiresLegalReview(input: LiabilityAnalysisInput, considerations: CoverageConsideration[]): boolean {
        if (considerations.some(c => c.impact === 'coverage_denied')) return true;
        if (input.evidenceNotes.some(e => e.toLowerCase().includes('attorney') || e.toLowerCase().includes('lawyer') || e.toLowerCase().includes('litigation'))) return true;
        if (['AL', 'DC', 'MD', 'NC', 'VA'].includes(input.state)) return true;
        if (input.partiesInvolved.filter(p => p.role === 'claimant').length > 2) return true;
        return false;
    }

    private calculateAnalysisConfidence(input: LiabilityAnalysisInput): number {
        let confidence = 100;
        if (!input.policeReport) confidence -= 20;
        if (input.statements.length === 0) confidence -= 30;
        if (input.evidenceNotes.length === 0) confidence -= 15;
        if (!input.policyDetails.coverages.length) confidence -= 10;
        if (input.statements.length >= input.partiesInvolved.length) confidence += 10;
        if (input.policeReport?.diagramAvailable) confidence += 5;
        return Math.max(Math.min(confidence, 100), 0);
    }
}

export default LiabilityAnalyst;
