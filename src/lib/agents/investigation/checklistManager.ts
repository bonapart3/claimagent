/**
 * ClaimAgent™ - Checklist Manager (Agent B4)
 * 
 * Responsibilities:
 * - Generate claim-type-specific checklists
 * - Link items to handbook/regulatory requirements
 * - Track completion status
 * - Trigger reminders for overdue items
 * - Ensure compliance with investigation requirements
 * - Provide audit trail of checklist completion
 * 
 * @module agents/investigation/checklistManager
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { getStateRegulation } from '@/lib/constants/stateRegulations';

export interface ChecklistInput {
    claimId: string;
    claimType: 'collision' | 'comprehensive' | 'liability' | 'UM' | 'medical_payments';
    state: string;
    severityLevel: 'simple' | 'moderate' | 'complex' | 'critical';
    hasBodilyInjury: boolean;
    hasTotalLoss: boolean;
    hasMultipleVehicles: boolean;
    hasLitigationIndicators: boolean;
    specialCircumstances: string[];
}

export interface ChecklistOutput {
    claimId: string;
    generatedDate: Date;
    categories: ChecklistCategory[];
    totalItems: number;
    criticalItems: number;
    estimatedCompletionTime: number;
    complianceDeadlines: Deadline[];
}

export interface ChecklistCategory {
    name: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    items: ChecklistItem[];
    completionPercentage: number;
}

export interface ChecklistItem {
    id: string;
    description: string;
    required: boolean;
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'not_applicable';
    assignedTo?: string;
    dueDate?: Date;
    completedDate?: Date;
    completedBy?: string;
    handbookReference?: string;
    regulatoryReference?: string;
    dependencies: string[];
    notes: string[];
    evidence: string[];
}

export interface Deadline {
    description: string;
    dueDate: Date;
    regulatoryBasis: string;
    priority: 'critical' | 'high';
    relatedItems: string[];
}

export class ChecklistManager {
    async generateChecklist(input: ChecklistInput): Promise<ChecklistOutput> {
        await auditLog({ action: 'CHECKLIST_GENERATION_INITIATED', entityType: 'claim', entityId: input.claimId, metadata: { claimType: input.claimType, severityLevel: input.severityLevel } });

        try {
            const categories: ChecklistCategory[] = [];
            categories.push(this.generateCoreInvestigationChecklist(input));
            categories.push(this.generateClaimTypeChecklist(input));
            if (input.hasBodilyInjury) categories.push(this.generateBodilyInjuryChecklist(input));
            if (input.hasTotalLoss) categories.push(this.generateTotalLossChecklist(input));
            if (input.hasMultipleVehicles) categories.push(this.generateMultiVehicleChecklist(input));
            categories.push(this.generateComplianceChecklist(input));
            if (input.hasLitigationIndicators) categories.push(this.generateLitigationChecklist(input));

            const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);
            const criticalItems = categories.reduce((sum, cat) => sum + cat.items.filter(item => item.priority === 'critical' && item.required).length, 0);
            const complianceDeadlines = this.generateComplianceDeadlines(input, categories);
            const estimatedCompletionTime = this.estimateCompletionTime(categories, input.severityLevel);

            const output: ChecklistOutput = { claimId: input.claimId, generatedDate: new Date(), categories, totalItems, criticalItems, estimatedCompletionTime, complianceDeadlines };
            await auditLog({ action: 'CHECKLIST_GENERATION_COMPLETED', entityType: 'claim', entityId: input.claimId, metadata: { totalItems, criticalItems, categories: categories.length } });
            return output;
        } catch (error) {
            await auditLog({ action: 'CHECKLIST_GENERATION_ERROR', entityType: 'claim', entityId: input.claimId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
            throw error;
        }
    }

    private generateCoreInvestigationChecklist(input: ChecklistInput): ChecklistCategory {
        const stateRegs = getStateRegulation(input.state);
        const items: ChecklistItem[] = [
            { id: 'CORE-001', description: 'Verify policy coverage and effective dates', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 2.1 - Coverage Verification', regulatoryReference: 'NAIC Model Regulation - Policy Verification', dependencies: [], notes: ['Must be completed before proceeding with investigation'], evidence: [] },
            { id: 'CORE-002', description: 'Obtain and review First Notice of Loss (FNOL)', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 1.2 - FNOL Processing', dependencies: [], notes: [], evidence: [] },
            { id: 'CORE-003', description: 'Send acknowledgment letter to insured', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Communication Templates - Acknowledgment', regulatoryReference: `${input.state} Insurance Code - Acknowledgment Requirements`, dependencies: ['CORE-002'], notes: [`Must be sent within ${stateRegs?.timeRequirements?.acknowledgment || 24} hours`], evidence: [] },
            { id: 'CORE-004', description: 'Obtain recorded statement from insured', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 3.1 - Statement Guidelines', dependencies: ['CORE-003'], notes: ['Record date, time, and method of statement'], evidence: [] },
            { id: 'CORE-005', description: 'Collect vehicle photos (minimum 8 angles)', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 3.3 - Photo Documentation', dependencies: [], notes: ['Include VIN, odometer, all damage areas, and overall vehicle condition'], evidence: [] },
            { id: 'CORE-006', description: 'Obtain police report (if applicable)', required: false, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 3.2 - Police Report Review', dependencies: [], notes: ['Required for liability determination in multi-vehicle accidents'], evidence: [] },
            { id: 'CORE-007', description: 'Verify loss location and jurisdiction', required: true, priority: 'medium', status: 'not_started', handbookReference: 'Claims Manual Section 2.3 - Jurisdiction Determination', dependencies: ['CORE-002'], notes: ['Confirm state/local laws apply'], evidence: [] }
        ];
        return { name: 'Core Investigation', description: 'Essential tasks for all auto claims', priority: 'critical', items, completionPercentage: 0 };
    }

    private generateClaimTypeChecklist(input: ChecklistInput): ChecklistCategory {
        let items: ChecklistItem[] = [];
        switch (input.claimType) {
            case 'collision':
                items = [
                    { id: 'COLL-001', description: 'Obtain repair estimate from approved facility', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 4.1 - Collision Repair Estimates', dependencies: ['CORE-005'], notes: [], evidence: [] },
                    { id: 'COLL-002', description: 'Verify deductible amount and collect if applicable', required: true, priority: 'high', status: 'not_started', handbookReference: 'Policy Declarations - Deductibles', dependencies: ['CORE-001'], notes: [], evidence: [] },
                    { id: 'COLL-003', description: 'Determine if vehicle requires ADAS calibration', required: true, priority: 'medium', status: 'not_started', handbookReference: 'Claims Manual Section 4.5 - ADAS Considerations', dependencies: ['COLL-001'], notes: ['Required for vehicles 2018 or newer with front/rear sensors'], evidence: [] }
                ];
                break;
            case 'comprehensive':
                items = [
                    { id: 'COMP-001', description: 'Determine peril causing loss', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 5.1 - Comprehensive Perils', dependencies: ['CORE-004'], notes: ['Common perils: theft, vandalism, weather, animal strike, glass breakage'], evidence: [] },
                    { id: 'COMP-002', description: 'Verify no collision involvement', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 5.2 - Collision vs Comprehensive', dependencies: ['COMP-001'], notes: [], evidence: [] }
                ];
                break;
            case 'liability':
                items = [
                    { id: 'LIAB-001', description: 'Investigate and determine liability', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 6.1 - Liability Investigation', regulatoryReference: 'Good Faith Claims Handling Requirements', dependencies: ['CORE-004', 'CORE-006'], notes: ['Must complete thorough investigation before liability determination'], evidence: [] },
                    { id: 'LIAB-002', description: 'Obtain claimant statement', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 6.2 - Third Party Statements', dependencies: [], notes: [], evidence: [] },
                    { id: 'LIAB-003', description: 'Verify claimant vehicle ownership and damages', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 6.3 - Damage Verification', dependencies: ['LIAB-002'], notes: [], evidence: [] },
                    { id: 'LIAB-004', description: 'Determine applicable comparative negligence', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 6.5 - Comparative Negligence', dependencies: ['LIAB-001'], notes: ['Apply state-specific comparative negligence standard'], evidence: [] }
                ];
                break;
            case 'UM':
                items = [
                    { id: 'UM-001', description: 'Verify other party is uninsured or underinsured', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 7.1 - UM/UIM Verification', dependencies: [], notes: ['Obtain insurance verification or declination letter'], evidence: [] },
                    { id: 'UM-002', description: 'Confirm UM/UIM coverage on policy', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Policy Review - UM/UIM Coverage', dependencies: ['CORE-001'], notes: [], evidence: [] }
                ];
                break;
            case 'medical_payments':
                items = [
                    { id: 'MEDPAY-001', description: 'Obtain medical bills and records', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 8.1 - Medical Documentation', dependencies: [], notes: [], evidence: [] },
                    { id: 'MEDPAY-002', description: 'Verify treatment is accident-related', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 8.2 - Medical Causation', dependencies: ['MEDPAY-001'], notes: [], evidence: [] }
                ];
                break;
        }
        return { name: `${input.claimType.charAt(0).toUpperCase() + input.claimType.slice(1)} Claim Requirements`, description: `Specific requirements for ${input.claimType} claims`, priority: 'high', items, completionPercentage: 0 };
    }

    private generateBodilyInjuryChecklist(input: ChecklistInput): ChecklistCategory {
        const items: ChecklistItem[] = [
            { id: 'BI-001', description: 'Obtain medical authorization from injured party', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 9.1 - Medical Authorizations', regulatoryReference: 'HIPAA Compliance Requirements', dependencies: [], notes: ['Must obtain signed HIPAA authorization'], evidence: [] },
            { id: 'BI-002', description: 'Collect all medical bills and records', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 9.2 - Medical Records Review', dependencies: ['BI-001'], notes: [], evidence: [] },
            { id: 'BI-003', description: 'Verify pre-existing conditions', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 9.3 - Pre-Existing Conditions', dependencies: ['BI-002'], notes: ['Review medical history for prior injuries'], evidence: [] },
            { id: 'BI-004', description: 'Assess permanency and future medical needs', required: false, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 9.5 - Permanency Evaluation', dependencies: ['BI-002'], notes: ['May require IME or medical review'], evidence: [] },
            { id: 'BI-005', description: 'Document wage loss (if applicable)', required: false, priority: 'medium', status: 'not_started', handbookReference: 'Claims Manual Section 9.6 - Economic Damages', dependencies: [], notes: ['Obtain wage verification from employer'], evidence: [] }
        ];
        return { name: 'Bodily Injury Investigation', description: 'Requirements for claims involving bodily injury', priority: 'critical', items, completionPercentage: 0 };
    }

    private generateTotalLossChecklist(input: ChecklistInput): ChecklistCategory {
        const stateRegs = getStateRegulation(input.state);
        const threshold = stateRegs?.totalLossRules?.threshold || 0.75;
        const items: ChecklistItem[] = [
            { id: 'TL-001', description: 'Obtain ACV valuation from approved source', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 10.1 - Total Loss Valuation', regulatoryReference: `${input.state} Total Loss Threshold: ${Math.round(threshold * 100)}%`, dependencies: ['CORE-005'], notes: ['Use NADA, KBB, or other approved valuation tool'], evidence: [] },
            { id: 'TL-002', description: 'Calculate total loss threshold', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 10.2 - TL Threshold Calculation', dependencies: ['TL-001'], notes: [`${input.state} requires TL when repair cost exceeds ${Math.round(threshold * 100)}% of ACV`], evidence: [] },
            { id: 'TL-003', description: 'Obtain salvage bid', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 10.3 - Salvage Disposition', dependencies: ['TL-002'], notes: [], evidence: [] },
            { id: 'TL-004', description: 'Verify loan/lease payoff amount', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 10.4 - Lienholder Verification', dependencies: ['CORE-001'], notes: ['Obtain payoff letter from lienholder'], evidence: [] },
            { id: 'TL-005', description: 'Obtain title for salvage transfer', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 10.5 - Title Transfer', dependencies: ['TL-003'], notes: [], evidence: [] }
        ];
        return { name: 'Total Loss Processing', description: 'Requirements for total loss claims', priority: 'critical', items, completionPercentage: 0 };
    }

    private generateMultiVehicleChecklist(input: ChecklistInput): ChecklistCategory {
        const items: ChecklistItem[] = [
            { id: 'MV-001', description: 'Obtain statements from all drivers', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 11.1 - Multi-Vehicle Investigation', dependencies: [], notes: [], evidence: [] },
            { id: 'MV-002', description: 'Diagram accident scene', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 11.2 - Scene Documentation', dependencies: [], notes: ['Include vehicle positions, impact points, skid marks, traffic controls'], evidence: [] },
            { id: 'MV-003', description: 'Canvas for independent witnesses', required: true, priority: 'medium', status: 'not_started', handbookReference: 'Claims Manual Section 11.3 - Witness Statements', dependencies: [], notes: [], evidence: [] },
            { id: 'MV-004', description: 'Analyze damage patterns for consistency', required: true, priority: 'high', status: 'not_started', handbookReference: 'Claims Manual Section 11.4 - Damage Analysis', dependencies: ['MV-001', 'CORE-005'], notes: ['Verify damage is consistent with described impact'], evidence: [] }
        ];
        return { name: 'Multi-Vehicle Investigation', description: 'Additional requirements for multi-vehicle accidents', priority: 'high', items, completionPercentage: 0 };
    }

    private generateComplianceChecklist(input: ChecklistInput): ChecklistCategory {
        const stateRegs = getStateRegulation(input.state);
        const items: ChecklistItem[] = [
            { id: 'COMP-REG-001', description: 'Meet state acknowledgment deadline', required: true, priority: 'critical', status: 'not_started', regulatoryReference: `${input.state} Insurance Code - ${stateRegs?.timeRequirements?.acknowledgment || 24} hour acknowledgment`, dependencies: ['CORE-003'], notes: [], evidence: [] },
            { id: 'COMP-REG-002', description: 'Complete investigation within regulatory timeframe', required: true, priority: 'critical', status: 'not_started', regulatoryReference: `${input.state} - ${stateRegs?.timeRequirements?.investigation || 15} day investigation requirement`, dependencies: [], notes: [], evidence: [] },
            { id: 'COMP-REG-003', description: 'Provide coverage decision within deadline', required: true, priority: 'critical', status: 'not_started', regulatoryReference: `${input.state} - ${stateRegs?.timeRequirements?.decision || 30} day decision requirement`, dependencies: ['COMP-REG-002'], notes: [], evidence: [] },
            { id: 'COMP-REG-004', description: 'Document good faith investigation', required: true, priority: 'high', status: 'not_started', regulatoryReference: 'Unfair Claims Settlement Practices Act', dependencies: [], notes: ['Maintain detailed file notes of all investigation steps'], evidence: [] }
        ];
        return { name: 'Regulatory Compliance', description: 'State-specific compliance requirements', priority: 'critical', items, completionPercentage: 0 };
    }

    private generateLitigationChecklist(input: ChecklistInput): ChecklistCategory {
        const items: ChecklistItem[] = [
            { id: 'LIT-001', description: 'Notify legal counsel of litigation threat', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 12.1 - Litigation Response', dependencies: [], notes: ['Immediate notification required'], evidence: [] },
            { id: 'LIT-002', description: 'Preserve all evidence and documents', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 12.2 - Evidence Preservation', regulatoryReference: 'Litigation Hold Requirements', dependencies: ['LIT-001'], notes: ['No documents may be destroyed once litigation threatened'], evidence: [] },
            { id: 'LIT-003', description: 'Cease direct communication with claimant', required: true, priority: 'critical', status: 'not_started', handbookReference: 'Claims Manual Section 12.3 - Represented Party Communication', dependencies: ['LIT-001'], notes: ['All communication must go through attorney'], evidence: [] }
        ];
        return { name: 'Litigation Management', description: 'Requirements when litigation is threatened or filed', priority: 'critical', items, completionPercentage: 0 };
    }

    private generateComplianceDeadlines(input: ChecklistInput, categories: ChecklistCategory[]): Deadline[] {
        const deadlines: Deadline[] = [];
        const stateRegs = getStateRegulation(input.state);
        const now = new Date();

        const ackDeadline = new Date(now);
        ackDeadline.setHours(ackDeadline.getHours() + (stateRegs?.timeRequirements?.acknowledgment || 24));
        deadlines.push({ description: 'Send claim acknowledgment', dueDate: ackDeadline, regulatoryBasis: `${input.state} Insurance Code - Acknowledgment Requirement`, priority: 'critical', relatedItems: ['CORE-003'] });

        const invDeadline = new Date(now);
        invDeadline.setDate(invDeadline.getDate() + (stateRegs?.timeRequirements?.investigation || 15));
        deadlines.push({ description: 'Complete claim investigation', dueDate: invDeadline, regulatoryBasis: `${input.state} - Investigation Timeframe`, priority: 'critical', relatedItems: ['COMP-REG-002'] });

        const decisionDeadline = new Date(now);
        decisionDeadline.setDate(decisionDeadline.getDate() + (stateRegs?.timeRequirements?.decision || 30));
        deadlines.push({ description: 'Provide coverage decision', dueDate: decisionDeadline, regulatoryBasis: `${input.state} - Decision Requirement`, priority: 'critical', relatedItems: ['COMP-REG-003'] });

        return deadlines;
    }

    private estimateCompletionTime(categories: ChecklistCategory[], severity: string): number {
        const baseHours: Record<string, number> = { simple: 4, moderate: 24, complex: 48, critical: 72 };
        const base = baseHours[severity] || 24;
        const itemCount = categories.reduce((sum, cat) => sum + cat.items.length, 0);
        const additionalHours = (itemCount * 0.25);
        return Math.round(base + additionalHours);
    }
}

export default ChecklistManager;
