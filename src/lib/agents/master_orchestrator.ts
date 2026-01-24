/**
 * ClaimAgent™ - Master Orchestrator Agent
 * 
 * Central coordination agent that manages all sub-agents, maintains
 * internal checklist, routes decisions, and ensures quality validation.
 * 
 * @module agents/orchestrator
 */

import { prisma } from '../utils/database';
import { AuditLogger } from '../utils/auditLogger';
import type { Claim, AgentResult, OrchestratorChecklistStatus, EscalationTrigger } from '../types/claim';

// Import all agent groups
import * as IntakeAgents from './intake';
import * as InvestigationAgents from './investigation';
import * as FraudAgents from './fraud';
import * as EvaluationAgents from './evaluation';
import * as CommunicationAgents from './communications';
import * as AnalyticsAgents from './analytics';
import * as QAAgents from './qa';
import { FinalValidator } from './validator/finalValidator';

export class MasterOrchestrator {
    private db: typeof prisma;
    private auditLogger: AuditLogger;
    private checklist: OrchestratorChecklistStatus;
    private escalationTriggers: EscalationTrigger[];

    constructor() {
        this.db = prisma;
        this.auditLogger = new AuditLogger();
        this.initializeChecklist();
        this.escalationTriggers = [];
    }

    /**
     * Initialize internal tracking checklist
     */
    private initializeChecklist(): void {
        this.checklist = {
            phase1_IntakeAndTriage: false,
            phase2_InvestigationAndDocumentation: false,
            phase3_EvaluationAndSettlement: false,
            phase4_CommunicationsAndCompliance: false,
            phase5_QualityAssurance: false,
            phase6_FinalValidation: false,
            phase7_SubmissionOrApproval: false,
            startTime: new Date(),
            completedPhases: [],
            currentPhase: 'phase1_IntakeAndTriage'
        };
    }

    /**
     * Main orchestration method - processes entire claim lifecycle
     */
    async processClaim(claimId: string): Promise<AgentResult> {
        try {
            this.auditLogger.log({
                action: 'ORCHESTRATION_START',
                claimId,
                timestamp: new Date(),
                details: { checklist: this.checklist }
            });

            // Phase 1: Intake & Triage
            const phase1Result = await this.executePhase1(claimId);
            if (!phase1Result.success) {
                return this.escalateToHuman(claimId, 'Phase 1 failure', phase1Result);
            }

            // Phase 2: Investigation & Documentation (parallel with Fraud)
            const phase2Result = await this.executePhase2(claimId);
            if (!phase2Result.success) {
                return this.escalateToHuman(claimId, 'Phase 2 failure', phase2Result);
            }

            // Check fraud triggers
            if (this.hasFraudTriggers()) {
                return this.escalateToHuman(claimId, 'Fraud indicators detected', phase2Result);
            }

            // Phase 3: Evaluation & Settlement
            const phase3Result = await this.executePhase3(claimId);
            if (!phase3Result.success) {
                return this.escalateToHuman(claimId, 'Phase 3 failure', phase3Result);
            }

            // Phase 4: Communications & Compliance
            const phase4Result = await this.executePhase4(claimId);
            if (!phase4Result.success) {
                return this.escalateToHuman(claimId, 'Phase 4 failure', phase4Result);
            }

            // Phase 5: Quality Assurance
            const phase5Result = await this.executePhase5(claimId);
            if (!phase5Result.success) {
                return this.escalateToHuman(claimId, 'QA failure', phase5Result);
            }

            // Phase 6: Final Validation (Agent Z)
            const phase6Result = await this.executePhase6(claimId);
            if (!phase6Result.success || !phase6Result.data?.approved) {
                return this.escalateToHuman(claimId, 'Final validation rejected', phase6Result);
            }

            // Phase 7: Decision Routing
            const phase7Result = await this.executePhase7(claimId);

            // Log completion
            this.auditLogger.log({
                action: 'ORCHESTRATION_COMPLETE',
                claimId,
                timestamp: new Date(),
                details: {
                    checklist: this.checklist,
                    duration: Date.now() - this.checklist.startTime.getTime(),
                    finalDecision: phase7Result.decision
                }
            });

            return phase7Result;

        } catch (error) {
            this.auditLogger.log({
                action: 'ORCHESTRATION_ERROR',
                claimId,
                timestamp: new Date(),
                details: { error: error.message, stack: error.stack }
            });

            return this.escalateToHuman(claimId, 'System error', {
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Phase 1: Intake & Triage
     * Deploy GROUP A agents
     */
    private async executePhase1(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 1: Intake & Triage for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true,
                    documents: true
                }
            });

            if (!claim) {
                throw new Error(`Claim ${claimId} not found`);
            }

            // Agent A1: Data Parser
            const parsedData = await IntakeAgents.DataParser.parseFNOL(claim);

            // Agent A2: Validation Specialist
            const validationResult = await IntakeAgents.ValidationSpecialist.validatePolicy(claim, parsedData);
            if (!validationResult.valid) {
                this.escalationTriggers.push({
                    type: 'VALIDATION_FAILURE',
                    reason: validationResult.errors.join(', '),
                    timestamp: new Date()
                });
                return { success: false, error: 'Policy validation failed', data: validationResult };
            }

            // Agent A3: Severity Scorer
            const severityScore = await IntakeAgents.SeverityScorer.calculateSeverity(claim, parsedData);

            // Agent A4: Acknowledgment Writer
            const acknowledgment = await IntakeAgents.AcknowledgmentWriter.generateAcknowledgment(
                claim,
                parsedData,
                severityScore
            );

            // Update claim in database
            await this.db.claim.update({
                where: { id: claimId },
                data: {
                    status: 'ACKNOWLEDGED',
                    severityScore: severityScore.score,
                    complexityLevel: severityScore.complexityLevel,
                    parsedData: JSON.stringify(parsedData),
                    acknowledgmentSentAt: new Date()
                }
            });

            // Mark phase complete
            this.checklist.phase1_IntakeAndTriage = true;
            this.checklist.completedPhases.push('phase1');
            this.checklist.currentPhase = 'phase2_InvestigationAndDocumentation';

            console.log(`[ORCHESTRATOR] ✓ Phase 1 complete for claim ${claimId}`);

            return {
                success: true,
                data: {
                    parsedData,
                    validation: validationResult,
                    severity: severityScore,
                    acknowledgment
                }
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 1 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Phase 2: Investigation & Documentation + Fraud Detection
     * Deploy GROUP B and GROUP C agents in parallel
     */
    private async executePhase2(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 2: Investigation & Fraud Detection for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true,
                    documents: true,
                    claimants: true
                }
            });

            // Run investigation and fraud detection in parallel
            const [investigationResult, fraudResult] = await Promise.all([
                this.runInvestigationGroup(claim),
                this.runFraudDetectionGroup(claim)
            ]);

            // Check for fraud escalation
            if (fraudResult.score >= 50) {
                this.escalationTriggers.push({
                    type: 'FRAUD_DETECTED',
                    reason: `Fraud score: ${fraudResult.score}`,
                    timestamp: new Date(),
                    details: fraudResult.indicators
                });
            }

            // Update claim
            await this.db.claim.update({
                where: { id: claimId },
                data: {
                    status: 'UNDER_INVESTIGATION',
                    fraudScore: fraudResult.score,
                    fraudIndicators: JSON.stringify(fraudResult.indicators),
                    investigationData: JSON.stringify(investigationResult)
                }
            });

            // Mark phase complete
            this.checklist.phase2_InvestigationAndDocumentation = true;
            this.checklist.completedPhases.push('phase2');
            this.checklist.currentPhase = 'phase3_EvaluationAndSettlement';

            console.log(`[ORCHESTRATOR] ✓ Phase 2 complete for claim ${claimId}`);

            return {
                success: true,
                data: {
                    investigation: investigationResult,
                    fraud: fraudResult
                }
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 2 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Run GROUP B: Investigation Agents
     */
    private async runInvestigationGroup(claim: any): Promise<any> {
        // Agent B1: Evidence Collector
        const evidence = await InvestigationAgents.EvidenceCollector.collectEvidence(claim);

        // Agent B2: Data Extractor
        const extractedData = await InvestigationAgents.DataExtractor.extractStructuredData(evidence);

        // Agent B3: Liability Analyst (Advisory Only)
        const liabilityAnalysis = await InvestigationAgents.LiabilityAnalyst.analyzeLiability(claim, extractedData);

        // Agent B4: Checklist Manager
        const checklist = await InvestigationAgents.ChecklistManager.generateChecklist(claim);

        return {
            evidence,
            extractedData,
            liabilityAnalysis,
            checklist
        };
    }

    /**
     * Run GROUP C: Fraud Detection Agents
     */
    private async runFraudDetectionGroup(claim: any): Promise<any> {
        // Agent C1: Pattern Detector
        const patterns = await FraudAgents.PatternDetector.detectPatterns(claim);

        // Agent C2: Medical Fraud Screener
        const medicalFlags = await FraudAgents.MedicalFraudScreener.screenMedicalClaims(claim);

        // Agent C3: SIU Briefing Writer
        const fraudScore = patterns.score + medicalFlags.score;
        let siuBriefing = null;

        if (fraudScore >= 50) {
            siuBriefing = await FraudAgents.SIUBriefingWriter.generateBriefing(claim, patterns, medicalFlags);
        }

        return {
            score: fraudScore,
            indicators: [...patterns.indicators, ...medicalFlags.indicators],
            patterns,
            medicalFlags,
            siuBriefing
        };
    }

    /**
     * Phase 3: Evaluation & Settlement
     * Deploy GROUP D agents
     */
    private async executePhase3(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 3: Evaluation & Settlement for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true,
                    damages: true
                }
            });

            // Agent D1: Valuation Specialist
            const valuation = await EvaluationAgents.ValuationSpecialist.performValuation(claim);

            // Check for total loss escalation
            if (valuation.isTotalLoss) {
                this.escalationTriggers.push({
                    type: 'TOTAL_LOSS',
                    reason: 'Vehicle determined to be total loss',
                    timestamp: new Date()
                });
            }

            // Agent D2: Reserve Analyst
            const reserves = await EvaluationAgents.ReserveAnalyst.calculateReserves(claim, valuation);

            // Agent D3: Coverage Calculator
            const coverageCalc = await EvaluationAgents.CoverageCalculator.calculateCoverage(claim, valuation);

            // Agent D4: Settlement Drafter
            const settlement = await EvaluationAgents.SettlementDrafter.draftSettlement(
                claim,
                valuation,
                coverageCalc
            );

            // Update claim
            await this.db.claim.update({
                where: { id: claimId },
                data: {
                    status: 'EVALUATION_COMPLETE',
                    isTotalLoss: valuation.isTotalLoss,
                    acvAmount: valuation.acv,
                    estimatedRepairCost: valuation.repairCost,
                    suggestedReserve: reserves.suggested,
                    settlementAmount: settlement.amount
                }
            });

            // Mark phase complete
            this.checklist.phase3_EvaluationAndSettlement = true;
            this.checklist.completedPhases.push('phase3');
            this.checklist.currentPhase = 'phase4_CommunicationsAndCompliance';

            console.log(`[ORCHESTRATOR] ✓ Phase 3 complete for claim ${claimId}`);

            return {
                success: true,
                data: {
                    valuation,
                    reserves,
                    coverage: coverageCalc,
                    settlement
                }
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 3 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Phase 4: Communications & Compliance
     * Deploy GROUP E agents
     */
    private async executePhase4(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 4: Communications & Compliance for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    communications: true
                }
            });

            // Agent E1: Customer Communications Writer
            const communications = await CommunicationAgents.CustomerWriter.generateCommunications(claim);

            // Agent E2: Internal Documentation Specialist
            const internalDocs = await CommunicationAgents.InternalDocSpecialist.generateDocumentation(claim);

            // Agent E3: Regulatory Compliance Monitor
            const compliance = await CommunicationAgents.ComplianceMonitor.checkCompliance(claim);

            if (!compliance.compliant) {
                this.escalationTriggers.push({
                    type: 'COMPLIANCE_ISSUE',
                    reason: compliance.issues.join(', '),
                    timestamp: new Date()
                });
                return { success: false, error: 'Compliance issues detected', data: compliance };
            }

            // Agent E4: Handbook Helper
            const references = await CommunicationAgents.HandbookHelper.retrieveReferences(claim);

            // Update claim
            await this.db.claim.update({
                where: { id: claimId },
                data: {
                    status: 'COMMUNICATIONS_GENERATED',
                    complianceChecked: true,
                    complianceStatus: 'COMPLIANT'
                }
            });

            // Mark phase complete
            this.checklist.phase4_CommunicationsAndCompliance = true;
            this.checklist.completedPhases.push('phase4');
            this.checklist.currentPhase = 'phase5_QualityAssurance';

            console.log(`[ORCHESTRATOR] ✓ Phase 4 complete for claim ${claimId}`);

            return {
                success: true,
                data: {
                    communications,
                    internalDocs,
                    compliance,
                    references
                }
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 4 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Phase 5: Quality Assurance
     * Deploy GROUP G agents
     */
    private async executePhase5(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 5: Quality Assurance for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true,
                    damages: true,
                    communications: true
                }
            });

            // Agent G1: Technical QA
            const technicalQA = await QAAgents.TechnicalQA.performTechnicalReview(claim);

            // Agent G2: Compliance QA
            const complianceQA = await QAAgents.ComplianceQA.performComplianceReview(claim);

            // Agent G3: Business Logic QA
            const businessLogicQA = await QAAgents.BusinessLogicQA.performBusinessLogicReview(claim);

            const allPassed = technicalQA.passed && complianceQA.passed && businessLogicQA.passed;

            if (!allPassed) {
                const issues = [
                    ...technicalQA.issues,
                    ...complianceQA.issues,
                    ...businessLogicQA.issues
                ];

                this.escalationTriggers.push({
                    type: 'QA_FAILURE',
                    reason: `QA checks failed: ${issues.join(', ')}`,
                    timestamp: new Date(),
                    details: { technicalQA, complianceQA, businessLogicQA }
                });

                return {
                    success: false,
                    error: 'Quality assurance checks failed',
                    data: { technicalQA, complianceQA, businessLogicQA }
                };
            }

            // Mark phase complete
            this.checklist.phase5_QualityAssurance = true;
            this.checklist.completedPhases.push('phase5');
            this.checklist.currentPhase = 'phase6_FinalValidation';

            console.log(`[ORCHESTRATOR] ✓ Phase 5 complete for claim ${claimId}`);

            return {
                success: true,
                data: {
                    technicalQA,
                    complianceQA,
                    businessLogicQA
                }
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 5 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Phase 6: Final Validation (Agent Z)
     * Double-check all decisions before submission
     */
    private async executePhase6(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 6: Final Validation (Agent Z) for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true,
                    damages: true,
                    communications: true,
                    auditLog: true
                }
            });

            const validator = new FinalValidator();
            const validationResult = await validator.performFinalValidation(claim, this.escalationTriggers);

            if (!validationResult.approved) {
                console.log(`[ORCHESTRATOR] ✗ Agent Z rejected claim ${claimId}: ${validationResult.rejectionReason}`);
                return {
                    success: false,
                    error: `Agent Z rejection: ${validationResult.rejectionReason}`,
                    data: validationResult
                };
            }

            // Mark phase complete
            this.checklist.phase6_FinalValidation = true;
            this.checklist.completedPhases.push('phase6');
            this.checklist.currentPhase = 'phase7_SubmissionOrApproval';

            console.log(`[ORCHESTRATOR] ✓ Phase 6 complete - Agent Z approved claim ${claimId}`);

            return {
                success: true,
                data: validationResult
            };

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 6 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Phase 7: Decision Routing
     * Determine final action (auto-approve or escalate)
     */
    private async executePhase7(claimId: string): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] Starting Phase 7: Decision Routing for claim ${claimId}`);

        try {
            const claim = await this.db.claim.findUnique({
                where: { id: claimId },
                include: {
                    policy: true,
                    vehicle: true
                }
            });

            // Check auto-approval criteria
            const canAutoApprove = this.checkAutoApprovalCriteria(claim);

            if (canAutoApprove) {
                await this.autoApproveClaim(claim);

                this.checklist.phase7_SubmissionOrApproval = true;

                console.log(`[ORCHESTRATOR] ✓ Claim ${claimId} auto-approved`);

                return {
                    success: true,
                    decision: 'AUTO_APPROVED',
                    data: {
                        claimId,
                        settlementAmount: claim.settlementAmount,
                        paymentMethod: 'ACH',
                        estimatedPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                    }
                };
            } else {
                return this.escalateToHuman(claimId, 'Auto-approval criteria not met', {
                    success: true,
                    data: { claim, escalationReasons: this.escalationTriggers }
                });
            }

        } catch (error) {
            console.error(`[ORCHESTRATOR] ✗ Phase 7 failed for claim ${claimId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if claim meets auto-approval criteria
     */
    private checkAutoApprovalCriteria(claim: any): boolean {
        // Auto-approval requires ALL of:
        // 1. Settlement amount ≤ $2,500
        // 2. Fraud score < 50
        // 3. No escalation triggers
        // 4. Confidence score ≥ 80%
        // 5. Not a total loss
        // 6. No sensor zone repairs on newer vehicles
        // 7. No bodily injury
        // 8. No coverage disputes

        if (claim.settlementAmount > 2500) return false;
        if (claim.fraudScore >= 50) return false;
        if (this.escalationTriggers.length > 0) return false;
        if (claim.confidenceScore < 80) return false;
        if (claim.isTotalLoss) return false;
        if (claim.hasSensorDamage && claim.vehicle.year >= 2015) return false;
        if (claim.hasBodilyInjury) return false;
        if (claim.hasCoverageDispute) return false;

        return true;
    }

    /**
     * Auto-approve claim and initiate payment
     */
    private async autoApproveClaim(claim: any): Promise<void> {
        await this.db.claim.update({
            where: { id: claim.id },
            data: {
                status: 'AUTO_APPROVED',
                approvedAt: new Date(),
                approvedBy: 'CLAIMAGENT_AUTO',
                paymentStatus: 'PENDING',
                paymentInitiatedAt: new Date()
            }
        });

        // Initiate payment (placeholder - would integrate with payment processor)
        this.auditLogger.log({
            action: 'AUTO_APPROVAL',
            claimId: claim.id,
            timestamp: new Date(),
            details: {
                amount: claim.settlementAmount,
                payee: claim.policyholderId,
                method: 'ACH'
            }
        });
    }

    /**
     * Escalate claim to human adjuster
     */
    private async escalateToHuman(
        claimId: string,
        reason: string,
        additionalData: any
    ): Promise<AgentResult> {
        console.log(`[ORCHESTRATOR] ⚠ Escalating claim ${claimId} to human: ${reason}`);

        await this.db.claim.update({
            where: { id: claimId },
            data: {
                status: 'ESCALATED_TO_HUMAN',
                escalatedAt: new Date(),
                escalationReason: reason,
                escalationData: JSON.stringify({
                    triggers: this.escalationTriggers,
                    additionalData,
                    checklist: this.checklist
                })
            }
        });

        this.auditLogger.log({
            action: 'ESCALATION',
            claimId,
            timestamp: new Date(),
            details: {
                reason,
                triggers: this.escalationTriggers,
                checklist: this.checklist
            }
        });

        return {
            success: true,
            decision: 'ESCALATED',
            data: {
                reason,
                triggers: this.escalationTriggers,
                claimSummary: additionalData
            }
        };
    }

    /**
     * Check if any fraud triggers exist
     */
    private hasFraudTriggers(): boolean {
        return this.escalationTriggers.some(t => t.type === 'FRAUD_DETECTED');
    }

    /**
     * Get current orchestration status
     */
    public getStatus(): OrchestratorChecklistStatus {
        return { ...this.checklist };
    }
}

export default MasterOrchestrator;