// src/lib/agents/validation/regulatoryValidator.ts
// Agent G1: Regulatory Validator - State compliance validation

import { ClaimData } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation } from '@/lib/types/agent';
import { StateRegulation } from '@/lib/constants/stateRegulations';
import { auditLog } from '@/lib/utils/auditLogger';
import { stateRegulations } from '@/lib/constants/stateRegulations';

interface ValidationCheck {
  checkId: string;
  regulation: string;
  description: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
  details: string;
  citation?: string;
  remediation?: string;
}

interface RegulatoryValidationResult {
  claimId: string;
  state: string;
  validationDate: string;
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  checks: ValidationCheck[];
  compliantCount: number;
  nonCompliantCount: number;
  requiresRemediation: boolean;
  remediationSteps: string[];
  stateSpecificNotes: string[];
}

export class RegulatoryValidator {
  private readonly agentId: AgentRole = AgentRole.REGULATORY_VALIDATOR;

  async validate(
    claimData: ClaimData,
    processingResults: Record<string, unknown>
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const escalations: SimpleEscalation[] = [];
    const checks: ValidationCheck[] = [];

    try {
      const state = claimData.lossState || claimData.policyState || 'CA';
      const regulations = stateRegulations[state] || stateRegulations['CA'];

      // Run regulatory checks
      checks.push(...this.checkTimelinessRequirements(claimData, state, regulations));
      checks.push(...this.checkNotificationRequirements(claimData, state, regulations));
      checks.push(...this.checkSettlementRequirements(claimData, state, regulations));
      checks.push(...this.checkDocumentationRequirements(claimData, state, regulations));
      checks.push(...this.checkFraudReportingRequirements(claimData, state));
      checks.push(...this.checkPaymentRequirements(claimData, state, regulations));

      // Calculate results
      const compliantCount = checks.filter(c => c.status === 'COMPLIANT').length;
      const nonCompliantCount = checks.filter(c => c.status === 'NON_COMPLIANT').length;
      const needsReviewCount = checks.filter(c => c.status === 'NEEDS_REVIEW').length;

      let overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
      if (nonCompliantCount > 0) {
        overallStatus = 'NON_COMPLIANT';
      } else if (needsReviewCount > 0) {
        overallStatus = 'NEEDS_REVIEW';
      } else {
        overallStatus = 'COMPLIANT';
      }

      // Collect remediation steps
      const remediationSteps = checks
        .filter(c => c.remediation)
        .map(c => c.remediation!);

      // Generate escalations
      if (nonCompliantCount > 0) {
        escalations.push({
          type: 'COMPLIANCE_VIOLATION',
          reason: `${nonCompliantCount} regulatory non-compliance issues found`,
          severity: 'HIGH',
        });
      }

      const result: RegulatoryValidationResult = {
        claimId: claimData.id,
        state,
        validationDate: new Date().toISOString(),
        overallStatus,
        checks,
        compliantCount,
        nonCompliantCount,
        requiresRemediation: nonCompliantCount > 0,
        remediationSteps,
        stateSpecificNotes: this.getStateNotes(state),
      };

      await auditLog({
        claimId: claimData.id,
        action: 'REGULATORY_VALIDATION',
        agentId: this.agentId,
        description: `Regulatory validation: ${overallStatus} (${state})`,
        details: { result },
      });

      return {
        agentId: this.agentId,
        success: true,
        data: result,
        confidence: compliantCount / checks.filter(c => c.status !== 'NOT_APPLICABLE').length,
        processingTime: Date.now() - startTime,
        escalations,
        recommendations: remediationSteps,
      };
    } catch (error) {
      console.error('Regulatory validation error:', error);
      return {
        agentId: this.agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Regulatory validation failed',
        processingTime: Date.now() - startTime,
      };
    }
  }

  private checkTimelinessRequirements(
    claimData: ClaimData,
    state: string,
    regulations: StateRegulation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];
    const ackDeadline = regulations.timeRequirements?.acknowledgment || 15;
    const decisionDeadline = regulations.timeRequirements?.decision || 30;

    // Acknowledgment timeliness
    if (claimData.createdAt && claimData.acknowledgedAt) {
      const created = new Date(claimData.createdAt);
      const acknowledged = new Date(claimData.acknowledgedAt);
      const days = (acknowledged.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      checks.push({
        checkId: 'TIME-001',
        regulation: 'Claim Acknowledgment Deadline',
        description: `Claim must be acknowledged within ${ackDeadline} days`,
        status: days <= ackDeadline ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: `Acknowledged in ${days.toFixed(1)} days`,
        citation: `${state} Insurance Code`,
        remediation: days > ackDeadline ? 'Document reason for delayed acknowledgment' : undefined,
      });
    }

    // Decision timeliness
    if (claimData.createdAt && ['APPROVED', 'REJECTED'].includes(claimData.status)) {
      const created = new Date(claimData.createdAt);
      const decided = claimData.decidedAt ? new Date(claimData.decidedAt) : new Date();
      const days = (decided.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

      checks.push({
        checkId: 'TIME-002',
        regulation: 'Claim Decision Deadline',
        description: `Claim decision within ${decisionDeadline} days`,
        status: days <= decisionDeadline ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: `Decision made in ${days.toFixed(1)} days`,
        citation: `${state} Insurance Code`,
        remediation: days > decisionDeadline ? 'Document valid extensions or complexity factors' : undefined,
      });
    }

    return checks;
  }

  private checkNotificationRequirements(
    claimData: ClaimData,
    state: string,
    regulations: StateRegulation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Written denial notification
    if (claimData.status === 'REJECTED') {
      checks.push({
        checkId: 'NOTIF-001',
        regulation: 'Written Denial Notice',
        description: 'Denied claims require written notification with explanation',
        status: claimData.denialLetterSent ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: claimData.denialLetterSent 
          ? 'Denial letter sent'
          : 'Missing denial notification',
        citation: `${state} Insurance Code - Claim Denial Requirements`,
        remediation: !claimData.denialLetterSent ? 'Send written denial with specific reasons' : undefined,
      });

      // Appeal rights notification
      checks.push({
        checkId: 'NOTIF-002',
        regulation: 'Appeal Rights Notification',
        description: 'Claimant must be informed of appeal rights',
        status: claimData.appealInfoProvided ? 'COMPLIANT' : 'NEEDS_REVIEW',
        details: claimData.appealInfoProvided 
          ? 'Appeal rights communicated'
          : 'Verify appeal rights included in denial',
        citation: `${state} Insurance Code - Consumer Rights`,
      });
    }

    // Reservation of rights
    if (claimData.reservationOfRights) {
      checks.push({
        checkId: 'NOTIF-003',
        regulation: 'Reservation of Rights Notice',
        description: 'Timely reservation of rights if coverage in question',
        status: 'COMPLIANT',
        details: 'Reservation of rights issued',
        citation: `${state} Insurance Code`,
      });
    }

    return checks;
  }

  private checkSettlementRequirements(
    claimData: ClaimData,
    state: string,
    regulations: StateRegulation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    if (claimData.status === 'APPROVED' && claimData.approvedAmount) {
      // Fair settlement amount
      checks.push({
        checkId: 'SETTLE-001',
        regulation: 'Fair Settlement Standards',
        description: 'Settlement must be fair and based on policy terms',
        status: claimData.approvedAmount > 0 ? 'COMPLIANT' : 'NEEDS_REVIEW',
        details: `Settlement: $${claimData.approvedAmount.toLocaleString()}`,
        citation: `${state} Unfair Claims Practices Act`,
      });

      // Prompt payment after agreement
      if (claimData.settlementAccepted && !claimData.paymentIssued) {
        const paymentDeadline = (regulations.paymentDeadlineDays as number) || 30;
        checks.push({
          checkId: 'SETTLE-002',
          regulation: 'Prompt Payment',
          description: `Payment within ${paymentDeadline} days of agreement`,
          status: 'NEEDS_REVIEW',
          details: 'Settlement accepted, payment pending',
          citation: `${state} Prompt Payment Law`,
          remediation: 'Issue payment immediately',
        });
      }

      // Total loss fair market value (if applicable)
      if (claimData.isTotalLoss) {
        checks.push({
          checkId: 'SETTLE-003',
          regulation: 'Total Loss Valuation',
          description: 'Fair market value determination for total loss',
          status: claimData.marketValueSource ? 'COMPLIANT' : 'NEEDS_REVIEW',
          details: claimData.marketValueSource 
            ? `Valuation source: ${claimData.marketValueSource}`
            : 'Verify fair market value methodology',
          citation: `${state} Total Loss Regulations`,
        });
      }
    }

    return checks;
  }

  private checkDocumentationRequirements(
    claimData: ClaimData,
    state: string,
    regulations: StateRegulation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    // Claim file documentation
    checks.push({
      checkId: 'DOC-001',
      regulation: 'Claim File Documentation',
      description: 'Complete claim file with all communications',
      status: claimData.auditLogs && claimData.auditLogs.length > 0 ? 'COMPLIANT' : 'NEEDS_REVIEW',
      details: `${claimData.auditLogs?.length || 0} audit log entries`,
      citation: `${state} Record Retention Requirements`,
    });

    // Document retention
    checks.push({
      checkId: 'DOC-002',
      regulation: 'Document Retention',
      description: 'Claim documents retained for required period',
      status: 'COMPLIANT', // Assuming system handles retention
      details: 'Documents stored per retention policy',
      citation: `${state} Insurance Code - Record Retention`,
    });

    return checks;
  }

  private checkFraudReportingRequirements(
    claimData: ClaimData,
    state: string
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    if (claimData.fraudScore && claimData.fraudScore > 0.7) {
      // SIU referral for suspected fraud
      checks.push({
        checkId: 'FRAUD-001',
        regulation: 'Fraud Reporting',
        description: 'High-risk claims referred to SIU',
        status: claimData.siuReferral ? 'COMPLIANT' : 'NON_COMPLIANT',
        details: claimData.siuReferral 
          ? 'Referred to SIU'
          : `Fraud score ${(claimData.fraudScore * 100).toFixed(0)}% - requires SIU referral`,
        citation: `${state} Insurance Fraud Prevention Act`,
        remediation: !claimData.siuReferral ? 'Submit SIU referral immediately' : undefined,
      });

      // State fraud bureau reporting
      checks.push({
        checkId: 'FRAUD-002',
        regulation: 'State Fraud Bureau Reporting',
        description: 'Suspected fraud reported to state fraud bureau',
        status: claimData.fraudBureauReported ? 'COMPLIANT' : 'NEEDS_REVIEW',
        details: claimData.fraudBureauReported 
          ? 'Reported to fraud bureau'
          : 'Verify if fraud bureau report required',
        citation: `${state} Fraud Reporting Requirements`,
      });
    }

    return checks;
  }

  private checkPaymentRequirements(
    claimData: ClaimData,
    state: string,
    regulations: StateRegulation
  ): ValidationCheck[] {
    const checks: ValidationCheck[] = [];

    if (claimData.paymentIssued) {
      // Correct payee
      checks.push({
        checkId: 'PAY-001',
        regulation: 'Correct Payee',
        description: 'Payment issued to correct party',
        status: claimData.payee ? 'COMPLIANT' : 'NEEDS_REVIEW',
        details: claimData.payee ? `Payee: ${claimData.payee}` : 'Verify payee information',
        citation: `${state} Insurance Code`,
      });

      // Lienholder inclusion if applicable
      if (claimData.hasLienholder) {
        checks.push({
          checkId: 'PAY-002',
          regulation: 'Lienholder Interest',
          description: 'Lienholder included on payment if required',
          status: claimData.lienholderOnPayment ? 'COMPLIANT' : 'NON_COMPLIANT',
          details: claimData.lienholderOnPayment 
            ? 'Lienholder on check'
            : 'Lienholder must be included on payment',
          citation: `${state} Insurance Code - Lienholder Requirements`,
          remediation: !claimData.lienholderOnPayment ? 'Reissue check with lienholder' : undefined,
        });
      }
    }

    return checks;
  }

  private getStateNotes(state: string): string[] {
    const notes: Record<string, string[]> = {
      CA: [
        'California requires acknowledgment within 15 days',
        'Prompt payment within 30 days of settlement agreement',
        'Total loss vehicles valued at fair market value + sales tax',
      ],
      TX: [
        'Texas requires acknowledgment within 15 business days',
        'Payment within 5 business days after settlement',
        'Replacement parts must meet OEM specifications or approved aftermarket',
      ],
      FL: [
        'Florida is a no-fault PIP state',
        'Property damage claims follow standard timelines',
        'Hurricane claims have extended deadlines',
      ],
      NY: [
        'New York requires acknowledgment within 15 business days',
        'Denial must be in writing with specific reasons',
        'Total loss includes sales tax reimbursement',
      ],
    };

    return notes[state] || ['Follow state-specific insurance regulations'];
  }
}

export const regulatoryValidator = new RegulatoryValidator();

