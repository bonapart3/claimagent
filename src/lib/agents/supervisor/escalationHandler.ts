// src/lib/agents/supervisor/escalationHandler.ts
// Supervisor Agent: Handles escalations from other agents

import { ClaimData } from '@/lib/types/claim';
import { AgentResult, AgentRole, EscalationTrigger } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface EscalationDecision {
  escalationId: string;
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  action: 'APPROVE' | 'REJECT' | 'INVESTIGATE' | 'REFER_SUPERVISOR' | 'REFER_LEGAL';
  reasoning: string;
  deadline?: string;
  requiredDocuments?: string[];
  nextSteps: string[];
}

interface EscalationHandlerResult {
  claimId: string;
  handledDate: string;
  escalationsReceived: number;
  decisions: EscalationDecision[];
  requiresHumanReview: boolean;
  humanReviewReason?: string;
  overallRecommendation: string;
}

export class EscalationHandler {
  private readonly agentId: AgentRole = 'ESCALATION_HANDLER';

  // Authority thresholds
  private readonly AUTO_APPROVE_LIMIT = 25000;
  private readonly SUPERVISOR_LIMIT = 100000;
  private readonly FRAUD_SCORE_AUTO_DENY = 0.85;
  private readonly FRAUD_SCORE_INVESTIGATE = 0.5;

  async handleEscalations(
    claimData: ClaimData,
    escalations: EscalationTrigger[],
    processingResults: Record<string, unknown>
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const decisions: EscalationDecision[] = [];

    try {
      // Process each escalation
      for (const escalation of escalations) {
        const decision = await this.processEscalation(escalation, claimData, processingResults);
        decisions.push(decision);
      }

      // Determine if human review is required
      const requiresHumanReview = this.requiresHumanIntervention(decisions, claimData);
      const humanReviewReason = requiresHumanReview 
        ? this.getHumanReviewReason(decisions, claimData)
        : undefined;

      const result: EscalationHandlerResult = {
        claimId: claimData.id,
        handledDate: new Date().toISOString(),
        escalationsReceived: escalations.length,
        decisions,
        requiresHumanReview,
        humanReviewReason,
        overallRecommendation: this.generateOverallRecommendation(decisions, claimData),
      };

      await auditLog({
        claimId: claimData.id,
        action: 'ESCALATIONS_HANDLED',
        agentId: this.agentId,
        description: `Processed ${escalations.length} escalations`,
        details: { result },
      });

      return {
        agentId: this.agentId,
        success: true,
        data: result,
        confidence: requiresHumanReview ? 0.7 : 0.95,
        processingTime: Date.now() - startTime,
        recommendations: decisions.flatMap(d => d.nextSteps),
      };
    } catch (error) {
      console.error('Escalation handling error:', error);
      return {
        agentId: this.agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Escalation handling failed',
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async processEscalation(
    escalation: EscalationTrigger,
    claimData: ClaimData,
    results: Record<string, unknown>
  ): Promise<EscalationDecision> {
    const escalationId = `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    switch (escalation.type) {
      case 'HIGH_VALUE_CLAIM':
        return this.handleHighValueEscalation(escalationId, escalation, claimData);

      case 'FRAUD_SUSPECTED':
        return this.handleFraudEscalation(escalationId, escalation, claimData);

      case 'COVERAGE_DISPUTE':
        return this.handleCoverageEscalation(escalationId, escalation, claimData);

      case 'TOTAL_LOSS':
        return this.handleTotalLossEscalation(escalationId, escalation, claimData);

      case 'COMPLIANCE_ISSUE':
        return this.handleComplianceEscalation(escalationId, escalation, claimData);

      case 'QA_FAILURE':
        return this.handleQAEscalation(escalationId, escalation, claimData);

      case 'INJURY_CLAIM':
        return this.handleInjuryEscalation(escalationId, escalation, claimData);

      default:
        return this.handleGenericEscalation(escalationId, escalation, claimData);
    }
  }

  private handleHighValueEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    const amount = claimData.estimatedAmount || claimData.approvedAmount || 0;

    if (amount <= this.AUTO_APPROVE_LIMIT) {
      return {
        escalationId,
        type: 'HIGH_VALUE_CLAIM',
        priority: 'MEDIUM',
        action: 'APPROVE',
        reasoning: `Amount $${amount.toLocaleString()} within auto-approval threshold`,
        nextSteps: ['Proceed with standard processing', 'Generate settlement documents'],
      };
    } else if (amount <= this.SUPERVISOR_LIMIT) {
      return {
        escalationId,
        type: 'HIGH_VALUE_CLAIM',
        priority: 'HIGH',
        action: 'REFER_SUPERVISOR',
        assignedTo: 'CLAIMS_SUPERVISOR',
        reasoning: `Amount $${amount.toLocaleString()} requires supervisor approval`,
        deadline: this.getDeadline(2),
        nextSteps: [
          'Route to claims supervisor queue',
          'Prepare summary for review',
          'Ensure all documentation complete',
        ],
      };
    } else {
      return {
        escalationId,
        type: 'HIGH_VALUE_CLAIM',
        priority: 'CRITICAL',
        action: 'REFER_SUPERVISOR',
        assignedTo: 'CLAIMS_MANAGER',
        reasoning: `Amount $${amount.toLocaleString()} requires manager approval`,
        deadline: this.getDeadline(1),
        nextSteps: [
          'Escalate to claims manager immediately',
          'Prepare comprehensive claim package',
          'Schedule review meeting if needed',
        ],
      };
    }
  }

  private handleFraudEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    const fraudScore = claimData.fraudScore || 0;

    if (fraudScore >= this.FRAUD_SCORE_AUTO_DENY) {
      return {
        escalationId,
        type: 'FRAUD_SUSPECTED',
        priority: 'CRITICAL',
        action: 'REJECT',
        assignedTo: 'SIU',
        reasoning: `Fraud score ${(fraudScore * 100).toFixed(0)}% exceeds auto-deny threshold`,
        deadline: this.getDeadline(1),
        requiredDocuments: ['Fraud investigation report', 'Evidence summary', 'SIU referral form'],
        nextSteps: [
          'Deny claim pending investigation',
          'Create SIU case file',
          'Preserve all evidence',
          'Do not communicate denial reason to claimant until investigation complete',
        ],
      };
    } else if (fraudScore >= this.FRAUD_SCORE_INVESTIGATE) {
      return {
        escalationId,
        type: 'FRAUD_SUSPECTED',
        priority: 'HIGH',
        action: 'INVESTIGATE',
        assignedTo: 'SIU',
        reasoning: `Fraud score ${(fraudScore * 100).toFixed(0)}% requires investigation`,
        deadline: this.getDeadline(5),
        requiredDocuments: ['Additional documentation request', 'Recorded statement', 'EUO if needed'],
        nextSteps: [
          'Hold claim for investigation',
          'Request additional documentation',
          'Consider recorded statement',
          'Continue processing non-fraud-related items',
        ],
      };
    } else {
      return {
        escalationId,
        type: 'FRAUD_SUSPECTED',
        priority: 'MEDIUM',
        action: 'APPROVE',
        reasoning: `Fraud indicators noted but score ${(fraudScore * 100).toFixed(0)}% below investigation threshold`,
        nextSteps: [
          'Document fraud indicators in file',
          'Proceed with standard processing',
          'Monitor for additional red flags',
        ],
      };
    }
  }

  private handleCoverageEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    return {
      escalationId,
      type: 'COVERAGE_DISPUTE',
      priority: 'HIGH',
      action: 'INVESTIGATE',
      assignedTo: 'COVERAGE_SPECIALIST',
      reasoning: escalation.reason,
      deadline: this.getDeadline(3),
      requiredDocuments: ['Policy declarations', 'Coverage analysis', 'Exclusion review'],
      nextSteps: [
        'Issue reservation of rights letter',
        'Complete coverage analysis',
        'Consult with underwriting if needed',
        'Document coverage determination',
      ],
    };
  }

  private handleTotalLossEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    return {
      escalationId,
      type: 'TOTAL_LOSS',
      priority: 'HIGH',
      action: 'APPROVE',
      reasoning: 'Vehicle declared total loss - following total loss procedures',
      deadline: this.getDeadline(3),
      requiredDocuments: ['Total loss valuation', 'Title', 'Lienholder payoff letter'],
      nextSteps: [
        'Obtain current payoff from lienholder',
        'Complete fair market value determination',
        'Prepare total loss settlement offer',
        'Arrange title and salvage transfer',
      ],
    };
  }

  private handleComplianceEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    return {
      escalationId,
      type: 'COMPLIANCE_ISSUE',
      priority: 'CRITICAL',
      action: 'INVESTIGATE',
      assignedTo: 'COMPLIANCE_OFFICER',
      reasoning: escalation.reason,
      deadline: this.getDeadline(1),
      nextSteps: [
        'Review compliance violation immediately',
        'Document corrective actions',
        'Notify compliance department',
        'Implement remediation steps',
      ],
    };
  }

  private handleQAEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    return {
      escalationId,
      type: 'QA_FAILURE',
      priority: 'HIGH',
      action: 'INVESTIGATE',
      assignedTo: 'QA_TEAM',
      reasoning: escalation.reason,
      deadline: this.getDeadline(2),
      nextSteps: [
        'Review QA failures',
        'Correct identified issues',
        'Re-run QA validation',
        'Document root cause',
      ],
    };
  }

  private handleInjuryEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    return {
      escalationId,
      type: 'INJURY_CLAIM',
      priority: 'HIGH',
      action: 'REFER_SUPERVISOR',
      assignedTo: 'BODILY_INJURY_ADJUSTER',
      reasoning: 'Claim involves bodily injury - requires BI specialist',
      deadline: this.getDeadline(2),
      requiredDocuments: ['Medical records', 'Treatment documentation', 'Lost wage verification'],
      nextSteps: [
        'Assign to bodily injury adjuster',
        'Request medical authorization',
        'Begin BI investigation',
        'Set appropriate BI reserves',
      ],
    };
  }

  private handleGenericEscalation(
    escalationId: string,
    escalation: EscalationTrigger,
    claimData: ClaimData
  ): EscalationDecision {
    const priority = escalation.severity === 'HIGH' ? 'HIGH' : 
                    escalation.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW';

    return {
      escalationId,
      type: escalation.type,
      priority,
      action: 'INVESTIGATE',
      reasoning: escalation.reason,
      deadline: this.getDeadline(3),
      nextSteps: [
        `Review escalation: ${escalation.type}`,
        'Determine appropriate action',
        'Document resolution',
      ],
    };
  }

  private requiresHumanIntervention(
    decisions: EscalationDecision[],
    claimData: ClaimData
  ): boolean {
    // Check for conditions requiring human review
    if (decisions.some(d => d.priority === 'CRITICAL')) return true;
    if (decisions.some(d => d.action === 'REFER_LEGAL')) return true;
    if (decisions.some(d => d.action === 'REFER_SUPERVISOR' && d.priority === 'HIGH')) return true;
    if (claimData.hasLitigation) return true;
    if ((claimData.approvedAmount || 0) > this.SUPERVISOR_LIMIT) return true;

    return false;
  }

  private getHumanReviewReason(
    decisions: EscalationDecision[],
    claimData: ClaimData
  ): string {
    const reasons: string[] = [];

    if (decisions.some(d => d.priority === 'CRITICAL')) {
      reasons.push('Critical priority escalation');
    }
    if (claimData.hasLitigation) {
      reasons.push('Claim in litigation');
    }
    if ((claimData.approvedAmount || 0) > this.SUPERVISOR_LIMIT) {
      reasons.push('Exceeds automated authority limit');
    }

    return reasons.join('; ');
  }

  private generateOverallRecommendation(
    decisions: EscalationDecision[],
    claimData: ClaimData
  ): string {
    const rejectDecisions = decisions.filter(d => d.action === 'REJECT');
    const investigateDecisions = decisions.filter(d => d.action === 'INVESTIGATE');
    const referDecisions = decisions.filter(d => d.action.startsWith('REFER_'));

    if (rejectDecisions.length > 0) {
      return `DENY: ${rejectDecisions.map(d => d.reasoning).join('; ')}`;
    }
    if (investigateDecisions.length > 0) {
      return `INVESTIGATE: Hold for investigation - ${investigateDecisions.length} issues pending`;
    }
    if (referDecisions.length > 0) {
      return `REFER: Route to ${referDecisions[0].assignedTo || 'supervisor'} for review`;
    }
    return 'PROCEED: All escalations resolved - continue processing';
  }

  private getDeadline(days: number): string {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toISOString();
  }
}

export const escalationHandler = new EscalationHandler();

