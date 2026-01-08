/**
 * ClaimAgent™ - SIU Briefing Writer (Agent C3)
 * Compiles comprehensive Special Investigation Unit briefings
 * Part of GROUP C: Fraud & Risk Detection Team
 */

import { auditLog } from '@/lib/utils/auditLogger';

interface SIUBriefing {
    briefingId: string;
    claimId: string;
    priority: 'ROUTINE' | 'ELEVATED' | 'URGENT' | 'CRITICAL';
    overallFraudScore: number;
    executiveSummary: string;
    flagsSummary: FlagSummary[];
    evidencePackage: EvidencePackage;
    investigativeRecommendations: InvestigativeRecommendation[];
    legalConsiderations: string[];
    timelineCritical: TimelineCritical[];
    referralContacts: ReferralContact[];
    estimatedExposure: ExposureEstimate;
    generatedAt: Date;
    generatedBy: string;
}

interface FlagSummary {
    category: 'PATTERN' | 'MEDICAL' | 'FINANCIAL' | 'IDENTITY' | 'STAGED' | 'NETWORK';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    keyEvidence: string[];
    score: number;
    confidence: number;
}

interface EvidencePackage {
    documentaryEvidence: DocumentaryEvidence[];
    digitalEvidence: DigitalEvidence[];
    testimonialEvidence: TestimonialEvidence[];
    financialEvidence: FinancialEvidence[];
    physicalEvidence: PhysicalEvidence[];
}

interface DocumentaryEvidence { documentType: string; description: string; location: string; significance: string; tags: string[]; }
interface DigitalEvidence { evidenceType: 'TELEMATICS' | 'SOCIAL_MEDIA' | 'GEOLOCATION' | 'EMAIL' | 'PHONE'; description: string; source: string; timestamp: Date; significance: string; }
interface TestimonialEvidence { witnessType: 'CLAIMANT' | 'WITNESS' | 'POLICE' | 'MEDICAL' | 'EXPERT'; source: string; statement: string; inconsistencies?: string[]; credibilityAssessment: string; }
interface FinancialEvidence { transactionType: string; amount: number; date: Date; parties: string[]; redFlags: string[]; }
interface PhysicalEvidence { evidenceType: string; description: string; location: string; significance: string; preservationRequired: boolean; }
interface InvestigativeRecommendation { priority: 'HIGH' | 'MEDIUM' | 'LOW'; action: string; rationale: string; timeline: string; assignTo: 'SIU' | 'LEGAL' | 'ADJUSTER' | 'EXTERNAL' | 'LAW_ENFORCEMENT'; estimatedCost?: number; }
interface TimelineCritical { deadline: Date; action: string; consequence: string; responsible: string; }
interface ReferralContact { organization: 'NICB' | 'FBI' | 'STATE_FRAUD_BUREAU' | 'LOCAL_PD' | 'DA_OFFICE' | 'DOI'; contactName?: string; phoneNumber?: string; emailAddress?: string; caseReferenceNumber?: string; notes: string; }
interface ExposureEstimate { potentialLoss: number; alreadyPaid: number; outstandingReserve: number; projectedLegalCosts: number; recoveryPotential: number; netExposure: number; }

interface FraudFlag { type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'; description: string; evidence: string[]; score: number; }
interface FraudAnalysis { overallScore: number; confidence: number; flags: FraudFlag[]; networkAnalysis?: { organizedFraudIndicators?: boolean }; }
interface MedicalFraudAnalysis { overallScore: number; confidence: number; flags: FraudFlag[]; billingAnomalies: { anomalyType: string; actualAmount: number; provider: string; explanation: string }[]; providerRisks: { riskLevel: string }[]; }
interface ClaimData { claimId?: string; policyNumber?: string; claimant?: { name: string }; lossDate: Date; claimAmount?: number; policeReport?: { fileLocation?: string }; photos?: any[]; medicalRecords?: any[]; telematicsData?: any; geolocationData?: any; claimantStatement?: string; statements?: any[]; witnessStatements?: { name: string; statement: string; relationship?: string }[]; vehicleInfo?: { year?: number; make?: string; model?: string }; vehicleDamage?: any; vehicleLocation?: string; attorneyRepresented?: boolean; state?: string; fnolDate: Date; paymentsMade?: { amount: number }[]; reserve?: number; subrogationPotential?: boolean; }

export class SIUBriefingWriter {
    private claimId: string;
    private carrierCode: string;

    constructor(claimId: string, carrierCode: string) {
        this.claimId = claimId;
        this.carrierCode = carrierCode;
    }

    async generateBriefing(claimData: ClaimData, patternFraudAnalysis: FraudAnalysis, medicalFraudAnalysis: MedicalFraudAnalysis): Promise<SIUBriefing> {
        try {
            await auditLog({ action: 'SIU_BRIEFING_GENERATION_START', entityType: 'claim', entityId: this.claimId, metadata: { overallScore: patternFraudAnalysis.overallScore } });

            const briefingId = this.generateBriefingId();
            const overallScore = this.calculateCombinedFraudScore(patternFraudAnalysis, medicalFraudAnalysis);
            const priority = this.determinePriority(overallScore, patternFraudAnalysis, medicalFraudAnalysis);

            const briefing: SIUBriefing = {
                briefingId,
                claimId: this.claimId,
                priority,
                overallFraudScore: overallScore,
                executiveSummary: this.generateExecutiveSummary(claimData, patternFraudAnalysis, medicalFraudAnalysis, overallScore),
                flagsSummary: this.consolidateFlagsSummary(patternFraudAnalysis, medicalFraudAnalysis),
                evidencePackage: this.compileEvidencePackage(claimData, patternFraudAnalysis, medicalFraudAnalysis),
                investigativeRecommendations: this.generateInvestigativeRecommendations(claimData, patternFraudAnalysis, medicalFraudAnalysis, overallScore),
                legalConsiderations: this.identifyLegalConsiderations(claimData, patternFraudAnalysis),
                timelineCritical: this.identifyTimelineCritical(claimData),
                referralContacts: this.generateReferralContacts(overallScore, patternFraudAnalysis),
                estimatedExposure: this.calculateExposure(claimData),
                generatedAt: new Date(),
                generatedBy: 'AGENT_C3'
            };

            await auditLog({ action: 'SIU_BRIEFING_GENERATION_COMPLETE', entityType: 'claim', entityId: this.claimId, metadata: { briefingId, priority, flagCount: briefing.flagsSummary.length, recommendationCount: briefing.investigativeRecommendations.length } });
            return briefing;
        } catch (error) {
            await auditLog({ action: 'SIU_BRIEFING_GENERATION_ERROR', entityType: 'claim', entityId: this.claimId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
            throw error;
        }
    }

    private generateBriefingId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `SIU-${timestamp}-${random}`;
    }

    private calculateCombinedFraudScore(patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis): number {
        return Math.round((patternAnalysis.overallScore * 0.6) + (medicalAnalysis.overallScore * 0.4));
    }

    private determinePriority(overallScore: number, patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis): SIUBriefing['priority'] {
        if (overallScore >= 75 || patternAnalysis.flags.some(f => f.severity === 'CRITICAL') || medicalAnalysis.flags.some(f => f.severity === 'CRITICAL') || patternAnalysis.networkAnalysis?.organizedFraudIndicators) return 'CRITICAL';
        if (overallScore >= 60 || (patternAnalysis.flags.filter(f => f.severity === 'HIGH').length >= 2) || (medicalAnalysis.flags.filter(f => f.severity === 'HIGH').length >= 2)) return 'URGENT';
        if (overallScore >= 50 || patternAnalysis.flags.some(f => f.severity === 'HIGH') || medicalAnalysis.flags.some(f => f.severity === 'HIGH')) return 'ELEVATED';
        return 'ROUTINE';
    }

    private generateExecutiveSummary(claimData: ClaimData, patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis, overallScore: number): string {
        const claimant = claimData.claimant?.name || 'Unknown Claimant';
        const policyNumber = claimData.policyNumber || 'N/A';
        const lossDate = claimData.lossDate.toLocaleDateString();
        const claimAmount = claimData.claimAmount || 0;

        let summary = `EXECUTIVE SUMMARY - FRAUD SCORE: ${overallScore}/100\n\n`;
        summary += `Claimant: ${claimant}\nPolicy: ${policyNumber}\nLoss Date: ${lossDate}\nClaimed Amount: $${claimAmount.toLocaleString()}\n\n`;
        summary += `PRIMARY CONCERNS:\n`;

        const allFlags = [...patternAnalysis.flags.map(f => ({ ...f, source: 'Pattern Analysis' })), ...medicalAnalysis.flags.map(f => ({ ...f, source: 'Medical Analysis' }))].sort((a, b) => b.score - a.score).slice(0, 3);
        allFlags.forEach((flag, index) => { summary += `${index + 1}. [${flag.severity}] ${flag.description} (Source: ${flag.source})\n`; });

        summary += `\nRECOMMENDATION: `;
        if (overallScore >= 75) summary += `IMMEDIATE FULL INVESTIGATION with consideration for claim denial and potential referral to law enforcement.`;
        else if (overallScore >= 60) summary += `ENHANCED INVESTIGATION with expanded evidence gathering and independent verification.`;
        else if (overallScore >= 50) summary += `STANDARD SIU INVESTIGATION with focused review of flagged areas.`;
        else summary += `MONITORING with targeted verification of specific concerns.`;

        return summary;
    }

    private consolidateFlagsSummary(patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis): FlagSummary[] {
        const flags: FlagSummary[] = [];
        for (const flag of patternAnalysis.flags) { flags.push({ category: this.categorizeFlagType(flag.type), severity: flag.severity, description: flag.description, keyEvidence: flag.evidence, score: flag.score, confidence: patternAnalysis.confidence }); }
        for (const flag of medicalAnalysis.flags) { flags.push({ category: 'MEDICAL', severity: flag.severity, description: flag.description, keyEvidence: flag.evidence, score: flag.score, confidence: medicalAnalysis.confidence }); }
        return flags.sort((a, b) => { const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }; const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]; return severityDiff !== 0 ? severityDiff : b.score - a.score; });
    }

    private categorizeFlagType(type: string): FlagSummary['category'] {
        if (type.includes('IDENTITY')) return 'IDENTITY';
        if (type.includes('STAGED') || type.includes('ACCIDENT')) return 'STAGED';
        if (type.includes('NETWORK') || type.includes('ORGANIZED')) return 'NETWORK';
        if (type.includes('BILLING') || type.includes('FINANCIAL')) return 'FINANCIAL';
        if (type.includes('INJURY') || type.includes('MEDICAL')) return 'MEDICAL';
        return 'PATTERN';
    }

    private compileEvidencePackage(claimData: ClaimData, patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis): EvidencePackage {
        return {
            documentaryEvidence: this.compileDocumentaryEvidence(claimData),
            digitalEvidence: this.compileDigitalEvidence(claimData),
            testimonialEvidence: this.compileTestimonialEvidence(claimData),
            financialEvidence: this.compileFinancialEvidence(claimData, medicalAnalysis),
            physicalEvidence: this.compilePhysicalEvidence(claimData)
        };
    }

    private compileDocumentaryEvidence(claimData: ClaimData): DocumentaryEvidence[] {
        const evidence: DocumentaryEvidence[] = [];
        if (claimData.policeReport) evidence.push({ documentType: 'POLICE_REPORT', description: 'Official police accident report', location: claimData.policeReport.fileLocation || 'Document system', significance: 'Primary source for accident details and officer observations', tags: ['OFFICIAL', 'PRIMARY_SOURCE', 'ACCIDENT_DETAILS'] });
        if (claimData.photos && claimData.photos.length > 0) evidence.push({ documentType: 'PHOTOS', description: `${claimData.photos.length} photographs of vehicle damage and scene`, location: 'Image repository', significance: 'Visual evidence of damage extent and accident scene', tags: ['VISUAL', 'DAMAGE_ASSESSMENT', 'SCENE_DOCUMENTATION'] });
        if (claimData.medicalRecords && claimData.medicalRecords.length > 0) evidence.push({ documentType: 'MEDICAL_RECORDS', description: `Medical records from ${claimData.medicalRecords.length} provider(s)`, location: 'Medical records system', significance: 'Documentation of injuries, treatment, and medical opinions', tags: ['MEDICAL', 'INJURY_DOCUMENTATION', 'TREATMENT_HISTORY'] });
        return evidence;
    }

    private compileDigitalEvidence(claimData: ClaimData): DigitalEvidence[] {
        const evidence: DigitalEvidence[] = [];
        if (claimData.telematicsData) evidence.push({ evidenceType: 'TELEMATICS', description: 'Vehicle telematics data showing speed, braking, and impact details', source: 'Vehicle EDR / Telematics provider', timestamp: claimData.lossDate, significance: 'Objective data on accident dynamics and vehicle operation' });
        if (claimData.geolocationData) evidence.push({ evidenceType: 'GEOLOCATION', description: 'GPS/cell tower location data for claimant and vehicle', source: 'Mobile carrier / GPS provider', timestamp: claimData.lossDate, significance: 'Verification of claimant location and movement patterns' });
        return evidence;
    }

    private compileTestimonialEvidence(claimData: ClaimData): TestimonialEvidence[] {
        const evidence: TestimonialEvidence[] = [];
        if (claimData.claimantStatement) evidence.push({ witnessType: 'CLAIMANT', source: claimData.claimant?.name || 'Claimant', statement: claimData.claimantStatement, inconsistencies: this.detectStatementInconsistencies(claimData), credibilityAssessment: 'Pending investigation' });
        if (claimData.witnessStatements && claimData.witnessStatements.length > 0) { for (const witness of claimData.witnessStatements) { evidence.push({ witnessType: 'WITNESS', source: witness.name, statement: witness.statement, credibilityAssessment: witness.relationship === 'INDEPENDENT' ? 'High credibility' : 'Relationship to claimant noted' }); } }
        return evidence;
    }

    private compileFinancialEvidence(claimData: ClaimData, medicalAnalysis: MedicalFraudAnalysis): FinancialEvidence[] {
        const evidence: FinancialEvidence[] = [];
        for (const anomaly of medicalAnalysis.billingAnomalies) { evidence.push({ transactionType: `MEDICAL_BILLING_${anomaly.anomalyType}`, amount: anomaly.actualAmount, date: new Date(), parties: [anomaly.provider], redFlags: [anomaly.explanation] }); }
        return evidence;
    }

    private compilePhysicalEvidence(claimData: ClaimData): PhysicalEvidence[] {
        const evidence: PhysicalEvidence[] = [];
        if (claimData.vehicleDamage) evidence.push({ evidenceType: 'VEHICLE', description: `${claimData.vehicleInfo?.year} ${claimData.vehicleInfo?.make} ${claimData.vehicleInfo?.model}`, location: claimData.vehicleLocation || 'Unknown', significance: 'Physical damage assessment and potential for engineering analysis', preservationRequired: true });
        return evidence;
    }

    private generateInvestigativeRecommendations(claimData: ClaimData, patternAnalysis: FraudAnalysis, medicalAnalysis: MedicalFraudAnalysis, overallScore: number): InvestigativeRecommendation[] {
        const recommendations: InvestigativeRecommendation[] = [];
        if (overallScore >= 75) {
            recommendations.push({ priority: 'HIGH', action: 'Obtain recorded statement from claimant under oath', rationale: 'Critical fraud score warrants sworn testimony for potential legal action', timeline: 'Within 5 business days', assignTo: 'SIU', estimatedCost: 500 });
            recommendations.push({ priority: 'HIGH', action: 'Conduct surveillance of claimant activities', rationale: 'High fraud indicators suggest activity monitoring may reveal inconsistencies', timeline: '10-14 days', assignTo: 'EXTERNAL', estimatedCost: 3500 });
        }
        if (medicalAnalysis.overallScore > 50) {
            recommendations.push({ priority: 'HIGH', action: 'Independent Medical Examination (IME)', rationale: 'Medical fraud indicators and injury inconsistencies require independent evaluation', timeline: 'Within 15 business days', assignTo: 'ADJUSTER', estimatedCost: 1200 });
            if (medicalAnalysis.providerRisks.some(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL')) recommendations.push({ priority: 'HIGH', action: 'Provider investigation and possible fraud referral', rationale: 'High-risk provider involvement requires investigation', timeline: 'Within 10 business days', assignTo: 'SIU', estimatedCost: 2000 });
        }
        if (patternAnalysis.flags.some(f => f.type.includes('STAGED'))) {
            recommendations.push({ priority: 'HIGH', action: 'Scene reconstruction and engineering analysis', rationale: 'Staged accident indicators warrant detailed accident reconstruction', timeline: 'Within 20 business days', assignTo: 'EXTERNAL', estimatedCost: 4500 });
            recommendations.push({ priority: 'MEDIUM', action: 'Social media investigation of all parties', rationale: 'Staged accidents often revealed through social media connections', timeline: 'Within 7 business days', assignTo: 'SIU', estimatedCost: 800 });
        }
        if (patternAnalysis.networkAnalysis?.organizedFraudIndicators) recommendations.push({ priority: 'HIGH', action: 'NICB referral and multi-claim investigation', rationale: 'Organized fraud indicators require industry-wide investigation', timeline: 'Immediate', assignTo: 'LEGAL', estimatedCost: 1000 });
        if (patternAnalysis.flags.some(f => f.type.includes('IDENTITY'))) recommendations.push({ priority: 'HIGH', action: 'Identity verification and document authentication', rationale: 'Identity fraud indicators require verification of all identification', timeline: 'Within 5 business days', assignTo: 'SIU', estimatedCost: 600 });
        return recommendations.sort((a, b) => { const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }; return priorityOrder[b.priority] - priorityOrder[a.priority]; });
    }

    private identifyLegalConsiderations(claimData: ClaimData, patternAnalysis: FraudAnalysis): string[] {
        const considerations: string[] = [];
        if (patternAnalysis.overallScore >= 75) { considerations.push('Potential criminal fraud - consider law enforcement referral'); considerations.push('Document preservation required for potential litigation'); }
        if (claimData.attorneyRepresented) { considerations.push('Claimant represented by counsel - all communications through attorney'); considerations.push('Discovery obligations if denial is contested'); }
        if (patternAnalysis.flags.some(f => f.severity === 'CRITICAL')) considerations.push('Potential bad faith exposure if claim denied - ensure thorough documentation');
        considerations.push('Maintain strict compliance with state unfair claims practice acts');
        considerations.push('Ensure all investigation activities comply with privacy laws and regulations');
        return considerations;
    }

    private identifyTimelineCritical(claimData: ClaimData): TimelineCritical[] {
        const critical: TimelineCritical[] = [];
        const responseDeadline = new Date(claimData.fnolDate);
        responseDeadline.setDate(responseDeadline.getDate() + 15);
        critical.push({ deadline: responseDeadline, action: 'Claim acknowledgment and investigation status communication', consequence: 'Regulatory violation / potential bad faith', responsible: 'SIU Lead' });
        const investigationDeadline = new Date(claimData.fnolDate);
        investigationDeadline.setDate(investigationDeadline.getDate() + 45);
        critical.push({ deadline: investigationDeadline, action: 'Complete investigation and issue coverage determination', consequence: 'Regulatory violation / prompt payment penalties', responsible: 'Claims Manager' });
        return critical.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }

    private generateReferralContacts(overallScore: number, patternAnalysis: FraudAnalysis): ReferralContact[] {
        const contacts: ReferralContact[] = [];
        if (overallScore >= 75) contacts.push({ organization: 'NICB', emailAddress: 'hotline@nicb.org', phoneNumber: '1-800-TEL-NICB', notes: 'National Insurance Crime Bureau - mandatory referral for suspected organized fraud' });
        if (overallScore >= 80 || patternAnalysis.networkAnalysis?.organizedFraudIndicators) contacts.push({ organization: 'FBI', notes: 'Federal Bureau of Investigation - consider referral for interstate fraud or organized crime' });
        contacts.push({ organization: 'STATE_FRAUD_BUREAU', notes: 'State insurance fraud bureau - required reporting per state statute' });
        return contacts;
    }

    private calculateExposure(claimData: ClaimData): ExposureEstimate {
        const potentialLoss = claimData.claimAmount || 0;
        const alreadyPaid = claimData.paymentsMade?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const outstandingReserve = claimData.reserve || 0;
        const projectedLegalCosts = potentialLoss > 50000 ? 15000 : 5000;
        const recoveryPotential = claimData.subrogationPotential ? (claimData.claimAmount || 0) * 0.6 : 0;
        return { potentialLoss, alreadyPaid, outstandingReserve, projectedLegalCosts, recoveryPotential, netExposure: potentialLoss + projectedLegalCosts - recoveryPotential };
    }

    private detectStatementInconsistencies(claimData: ClaimData): string[] | undefined {
        const inconsistencies: string[] = [];
        if (claimData.statements && claimData.statements.length > 1) inconsistencies.push('Multiple statement versions detected - requires detailed comparison');
        return inconsistencies.length > 0 ? inconsistencies : undefined;
    }
}

export default SIUBriefingWriter;
