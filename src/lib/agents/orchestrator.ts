// src/lib/agents/orchestrator.ts
// Master Orchestrator Agent - Coordinates all agent groups and workflow

import { ClaimData, ClaimProcessingResult, ClaimDecision } from '@/lib/types/claim';
import { AgentRole, OrchestratorState, AgentResult } from '@/lib/types/agent';
import { AUTO_APPROVAL_THRESHOLD, FRAUD_THRESHOLD } from '@/lib/constants/thresholds';

export class MasterOrchestrator {
    private state: OrchestratorState;
    private startTime: Date;

    constructor(claimId: string) {
        this.state = {
            claimId,
            currentPhase: 1,
            checklist: {
                phase1_intake: false,
                phase2_investigation: false,
                phase3_evaluation: false,
                phase4_communications: false,
                phase5_qa: false,
                phase6_validation: false,
                phase7_decision: false
            },
            agentResults: {} as Record<AgentRole, AgentResult>,
            escalationTriggers: [],
            humanReviewRequired: false
        };
        this.startTime = new Date();
    }

    /**
     * Main orchestration workflow
     */
    async processClaim(claimData: ClaimData): Promise<ClaimProcessingResult> {
        console.log(`[ORCHESTRATOR] Starting claim processing: ${claimData.claimNumber}`);

        try {
            // Phase 1: Intake & Triage
            await this.executePhase1_Intake(claimData);

            // Phase 2: Investigation & Documentation
            await this.executePhase2_Investigation(claimData);

            // Phase 3: Evaluation & Settlement
            await this.executePhase3_Evaluation(claimData);

            // Phase 4: Communications & Compliance
            await this.executePhase4_Communications(claimData);

            // Phase 5: Quality Assurance
            await this.executePhase5_QA(claimData);

            // Phase 6: Final Validation (Agent Z)
            const validationResult = await this.executePhase6_Validation(claimData);

            if (!validationResult.approved) {
                return this.escalateToHuman(claimData, 'Agent Z validation failed', validationResult.issues);
            }

            // Phase 7: Final Decision
            const decision = await this.executePhase7_Decision(claimData);

            return this.buildProcessingResult(claimData, decision);

        } catch (error) {
            console.error('[ORCHESTRATOR] Error processing claim:', error);
            return this.escalateToHuman(claimData, 'Orchestration error', [error]);
        }
    }

    private async executePhase1_Intake(claim: ClaimData): Promise<void> {
        console.log('[ORCHESTRATOR] Phase 1: Intake & Triage');
        this.state.currentPhase = 1;
        this.state.checklist.phase1_intake = true;
    }

    private async executePhase2_Investigation(claim: ClaimData): Promise<void> {
        console.log('[ORCHESTRATOR] Phase 2: Investigation');
        this.state.currentPhase = 2;
        this.state.checklist.phase2_investigation = true;
    }

    private async executePhase3_Evaluation(claim: ClaimData): Promise<void> {
        console.log('[ORCHESTRATOR] Phase 3: Evaluation');
        this.state.currentPhase = 3;
        this.state.checklist.phase3_evaluation = true;
    }

    private async executePhase4_Communications(claim: ClaimData): Promise<void> {
        console.log('[ORCHESTRATOR] Phase 4: Communications');
        this.state.currentPhase = 4;
        this.state.checklist.phase4_communications = true;
    }

    private async executePhase5_QA(claim: ClaimData): Promise<void> {
        console.log('[ORCHESTRATOR] Phase 5: QA');
        this.state.currentPhase = 5;
        this.state.checklist.phase5_qa = true;
    }

    private async executePhase6_Validation(claim: ClaimData): Promise<any> {
        console.log('[ORCHESTRATOR] Phase 6: Final Validation');
        this.state.currentPhase = 6;
        this.state.checklist.phase6_validation = true;
        return { approved: true, issues: [] };
    }

    private async executePhase7_Decision(claim: ClaimData): Promise<ClaimDecision> {
        console.log('[ORCHESTRATOR] Phase 7: Final Decision');
        this.state.currentPhase = 7;
        this.state.checklist.phase7_decision = true;

        // Check escalation triggers
        if (this.state.escalationTriggers.length > 0) {
            return {
                decision: 'ESCALATE_HUMAN',
                reason: `Escalation triggers: ${this.state.escalationTriggers.join('; ')}`,
                confidence: 1.0,
                escalationTriggers: this.state.escalationTriggers
            };
        }

        // Get key metrics
        const fraudScore = this.state.agentResults[AgentRole.PATTERN_DETECTOR]?.data.fraudScore || 0;
        const estimatedValue = this.state.agentResults[AgentRole.VALUATION_SPECIALIST]?.data.estimatedValue || 0;
        const confidence = this.calculateOverallConfidence();

        // Check fraud threshold
        if (fraudScore >= FRAUD_THRESHOLD.ESCALATION) {
            return {
                decision: 'SIU_REVIEW',
                reason: `Fraud score ${fraudScore} requires SIU review`,
                confidence: 1.0,
                estimatedValue
            };
        }

        // Check auto-approval eligibility
        if (
            estimatedValue <= AUTO_APPROVAL_THRESHOLD.MAX_AMOUNT &&
            confidence >= AUTO_APPROVAL_THRESHOLD.MIN_CONFIDENCE &&
            fraudScore < AUTO_APPROVAL_THRESHOLD.MIN_FRAUD_SCORE_PASS
        ) {
            return {
                decision: 'AUTO_APPROVE',
                reason: 'Meets all auto-approval criteria',
                confidence,
                estimatedValue
            };
        }

        // Default to human review
        return {
            decision: 'ESCALATE_HUMAN',
            reason: 'Requires human adjuster review',
            confidence,
            estimatedValue
        };
    }

    private calculateOverallConfidence(): number {
        const confidences = Object.values(this.state.agentResults)
            .filter(r => r.confidence !== undefined)
            .map(r => r.confidence);

        return confidences.length > 0
            ? confidences.reduce((a, b) => a + b, 0) / confidences.length
            : 0;
    }

    private escalateToHuman(claim: ClaimData, reason: string, details: any): ClaimProcessingResult {
        return {
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            decision: {
                decision: 'ESCALATE_HUMAN',
                reason,
                confidence: 1.0,
                escalationTriggers: [reason]
            },
            nextSteps: ['Human adjuster review required'],
            estimatedResolutionTime: '24-48 hours'
        };
    }

    private buildProcessingResult(claim: ClaimData, decision: ClaimDecision): ClaimProcessingResult {
        const endTime = new Date();
        const processingTime = (endTime.getTime() - this.startTime.getTime()) / 1000 / 60;

        return {
            claimId: claim.id,
            claimNumber: claim.claimNumber,
            status: claim.status,
            decision,
            nextSteps: this.generateNextSteps(decision),
            estimatedResolutionTime: decision.decision === 'AUTO_APPROVE' ? `${Math.ceil(processingTime / 60)} hours` : '24-48 hours'
        };
    }

    private generateNextSteps(decision: ClaimDecision): string[] {
        switch (decision.decision) {
            case 'AUTO_APPROVE':
                return ['Payment processing initiated', 'Customer notification sent'];
            case 'ESCALATE_HUMAN':
                return ['Assigned to adjuster', 'Additional review required'];
            case 'SIU_REVIEW':
                return ['Forwarded to SIU', 'Fraud investigation initiated'];
            case 'DRAFT_HOLD':
                return ['Draft decision prepared', 'Awaiting human approval'];
            default:
                return ['Under review'];
        }
    }
}

export const createOrchestrator = (claimId: string) => new MasterOrchestrator(claimId);

