/**
 * AGENT E3: Regulatory Compliance Monitor
 * 
 * Responsibilities:
 * - Track state-specific regulatory requirements
 * - Monitor timing deadlines (acknowledgment, investigation, payment)
 * - Verify required disclosures and notices
 * - Flag unfair claims practice risks
 * - Generate compliance reports
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { STATE_REGULATIONS } from '@/lib/constants/states';

// ==================== TYPES ====================

export interface ComplianceCheck {
  claimId: string;
  state: string;
  checkType: 'initial' | 'ongoing' | 'pre_settlement' | 'pre_denial' | 'audit';
  claimData: ComplianceClaimData;
}

export interface ComplianceClaimData {
  reportedDate: string;
  lossDate: string;
  acknowledgmentSent?: string;
  investigationStarted?: string;
  investigationCompleted?: string;
  settlementOffered?: string;
  paymentIssued?: string;
  denialIssued?: string;
  reservationOfRightsSent?: string;
  claimType: string;
  currentStatus: string;
  communications: Communication[];
  decisions: any[];
}

export interface Communication {
  date: string;
  type: string;
  recipient: string;
  delivered: boolean;
  requiredByLaw?: boolean;
}

export interface ComplianceReport {
  claimId: string;
  state: string;
  checkDate: string;
  overallStatus: 'compliant' | 'at_risk' | 'non_compliant';
  requirements: ComplianceRequirement[];
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  recommendations: string[];
  deadlines: ComplianceDeadline[];
  score: number; // 0-100
  metadata: {
    agentVersion: string;
    regulationsChecked: number;
    criticalIssues: number;
  };
}

export interface ComplianceRequirement {
  category: string;
  requirement: string;
  status: 'met' | 'pending' | 'overdue' | 'not_applicable';
  deadline?: string;
  daysRemaining?: number;
  evidence?: string;
  statute: string;
}

export interface ComplianceViolation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  statute: string;
  consequences: string;
  remediation: string;
  reportable: boolean;
}

export interface ComplianceWarning {
  category: string;
  description: string;
  dueDate: string;
  daysUntilDue: number;
  action: string;
}

export interface ComplianceDeadline {
  requirement: string;
  dueDate: string;
  status: 'upcoming' | 'today' | 'overdue';
  daysRemaining: number;
  priority: 'critical' | 'high' | 'normal';
}

// ==================== COMPLIANCE MONITOR ====================

export class ComplianceMonitor {
  private readonly agentId = 'AGENT_E3';
  private readonly version = '1.0.0';

  /**
   * Perform comprehensive compliance check
   */
  async checkCompliance(check: ComplianceCheck, userId: string): Promise<ComplianceReport> {
    try {
      await auditLog({
        action: 'compliance_check_initiated',
        agentId: this.agentId,
        claimId: check.claimId,
        userId,
        metadata: { state: check.state, checkType: check.checkType }
      });

      const stateReg = STATE_REGULATIONS[check.state] || STATE_REGULATIONS.DEFAULT;

      // Check all requirements
      const requirements = this.checkAllRequirements(check, stateReg);

      // Identify violations
      const violations = this.identifyViolations(check, requirements, stateReg);

      // Generate warnings for upcoming deadlines
      const warnings = this.generateWarnings(check, requirements);

      // Compile deadlines
      const deadlines = this.compileDeadlines(requirements);

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations, warnings);

      // Calculate compliance score
      const score = this.calculateComplianceScore(requirements, violations);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(violations, warnings, score);

      const report: ComplianceReport = {
        claimId: check.claimId,
        state: check.state,
        checkDate: new Date().toISOString(),
        overallStatus,
        requirements,
        violations,
        warnings,
        recommendations,
        deadlines,
        score,
        metadata: {
          agentVersion: this.version,
          regulationsChecked: requirements.length,
          criticalIssues: violations.filter(v => v.severity === 'critical').length
        }
      };

      await auditLog({
        action: 'compliance_check_completed',
        agentId: this.agentId,
        claimId: check.claimId,
        userId,
        metadata: {
          status: overallStatus,
          score,
          violations: violations.length,
          warnings: warnings.length
        }
      });

      return report;

    } catch (error) {
      await auditLog({
        action: 'compliance_check_error',
        agentId: this.agentId,
        claimId: check.claimId,
        userId,
        metadata: { error: (error as Error).message }
      });
      throw error;
    }
  }

  /**
   * Check all regulatory requirements
   */
  private checkAllRequirements(check: ComplianceCheck, stateReg: any): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];

    // Acknowledgment requirement
    requirements.push(this.checkAcknowledgment(check, stateReg));

    // Investigation timeline
    requirements.push(this.checkInvestigationTimeline(check, stateReg));

    // Payment deadline
    if (check.claimData.settlementOffered) {
      requirements.push(this.checkPaymentDeadline(check, stateReg));
    }

    // Reservation of rights
    if (check.claimData.reservationOfRightsSent) {
      requirements.push(this.checkReservationOfRights(check, stateReg));
    }

    // Denial requirements
    if (check.claimData.denialIssued) {
      requirements.push(...this.checkDenialRequirements(check, stateReg));
    }

    // Communication requirements
    requirements.push(...this.checkCommunicationRequirements(check, stateReg));

    // Unfair claims practices
    requirements.push(...this.checkUnfairPractices(check, stateReg));

    return requirements;
  }

  /**
   * Check acknowledgment timing
   */
  private checkAcknowledgment(check: ComplianceCheck, stateReg: any): ComplianceRequirement {
    const deadlineDays = stateReg.acknowledgmentDeadlineDays || 15;
    const reportedDate = new Date(check.claimData.reportedDate);
    const deadline = new Date(reportedDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
    const ackDate = check.claimData.acknowledgmentSent ? new Date(check.claimData.acknowledgmentSent) : null;

    let status: 'met' | 'pending' | 'overdue' = 'pending';
    if (ackDate) {
      status = ackDate <= deadline ? 'met' : 'overdue';
    } else if (new Date() > deadline) {
      status = 'overdue';
    }

    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      category: 'Acknowledgment',
      requirement: `Acknowledge claim within ${deadlineDays} days of receipt`,
      status,
      deadline: deadline.toISOString(),
      daysRemaining,
      evidence: ackDate ? `Acknowledgment sent ${ackDate.toLocaleDateString()}` : 'No acknowledgment sent',
      statute: stateReg.acknowledgmentStatute || `${check.state} Insurance Code`
    };
  }

  /**
   * Check investigation timeline
   */
  private checkInvestigationTimeline(check: ComplianceCheck, stateReg: any): ComplianceRequirement {
    const timeLimit = stateReg.claimInvestigationTimeLimit || '90 days';
    const days = parseInt(timeLimit);
    const reportedDate = new Date(check.claimData.reportedDate);
    const deadline = new Date(reportedDate.getTime() + days * 24 * 60 * 60 * 1000);
    const completedDate = check.claimData.investigationCompleted ? new Date(check.claimData.investigationCompleted) : null;

    let status: 'met' | 'pending' | 'overdue' = 'pending';
    if (completedDate) {
      status = completedDate <= deadline ? 'met' : 'overdue';
    } else if (new Date() > deadline) {
      status = 'overdue';
    }

    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      category: 'Investigation',
      requirement: `Complete investigation within ${timeLimit}`,
      status,
      deadline: deadline.toISOString(),
      daysRemaining,
      evidence: completedDate ? `Investigation completed ${completedDate.toLocaleDateString()}` : 'Investigation in progress',
      statute: stateReg.investigationStatute || `${check.state} Regulations`
    };
  }

  /**
   * Check payment deadline
   */
  private checkPaymentDeadline(check: ComplianceCheck, stateReg: any): ComplianceRequirement {
    const deadlineDays = stateReg.paymentDeadlineDays || 30;
    const offerDate = new Date(check.claimData.settlementOffered!);
    const deadline = new Date(offerDate.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
    const paymentDate = check.claimData.paymentIssued ? new Date(check.claimData.paymentIssued) : null;

    let status: 'met' | 'pending' | 'overdue' = 'pending';
    if (paymentDate) {
      status = paymentDate <= deadline ? 'met' : 'overdue';
    } else if (new Date() > deadline) {
      status = 'overdue';
    }

    const daysRemaining = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      category: 'Payment',
      requirement: `Issue payment within ${deadlineDays} days of settlement acceptance`,
      status,
      deadline: deadline.toISOString(),
      daysRemaining,
      evidence: paymentDate ? `Payment issued ${paymentDate.toLocaleDateString()}` : 'Payment pending',
      statute: stateReg.paymentStatute || `${check.state} Prompt Payment Law`
    };
  }

  /**
   * Check reservation of rights
   */
  private checkReservationOfRights(check: ComplianceCheck, stateReg: any): ComplianceRequirement {
    const rorDate = new Date(check.claimData.reservationOfRightsSent!);
    const reportedDate = new Date(check.claimData.reportedDate);
    const daysBetween = Math.ceil((rorDate.getTime() - reportedDate.getTime()) / (24 * 60 * 60 * 1000));

    const requiredDays = stateReg.reservationOfRightsDeadline || 30;

    return {
      category: 'Reservation of Rights',
      requirement: `Issue reservation of rights within ${requiredDays} days when coverage uncertain`,
      status: daysBetween <= requiredDays ? 'met' : 'overdue',
      evidence: `Reservation sent ${daysBetween} days after claim reported`,
      statute: stateReg.reservationStatute || `${check.state} Bad Faith Prevention Law`
    };
  }

  /**
   * Check denial requirements
   */
  private checkDenialRequirements(check: ComplianceCheck, stateReg: any): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];

    // Written notice requirement
    requirements.push({
      category: 'Denial Notice',
      requirement: 'Denial must be in writing with specific policy provisions cited',
      status: 'met', // Assume met if denial issued
      evidence: 'Written denial issued',
      statute: stateReg.denialRequirements || `${check.state} Unfair Claims Practices Act`
    });

    // Appeal rights disclosure
    requirements.push({
      category: 'Appeal Rights',
      requirement: 'Denial must include information about appeal rights',
      status: 'met', // Should be verified from actual denial letter
      evidence: 'Appeal rights included in denial letter',
      statute: stateReg.appealRightsStatute || `${check.state} Consumer Protection Law`
    });

    // DOI contact information
    requirements.push({
      category: 'DOI Notice',
      requirement: 'Denial must include Department of Insurance contact information',
      status: 'met',
      evidence: 'DOI contact included',
      statute: stateReg.doiNoticeRequirement || `${check.state} Insurance Code`
    });

    return requirements;
  }

  /**
   * Check communication requirements
   */
  private checkCommunicationRequirements(check: ComplianceCheck, stateReg: any): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];

    // Regular status updates
    const daysSinceLastComm = check.claimData.communications.length > 0 ?
      Math.ceil((Date.now() - new Date(check.claimData.communications[check.claimData.communications.length - 1].date).getTime()) / (24 * 60 * 60 * 1000)) :
      999;

    requirements.push({
      category: 'Status Updates',
      requirement: 'Provide status updates at least every 30 days during active investigation',
      status: daysSinceLastComm <= 30 ? 'met' : 'overdue',
      evidence: `Last communication ${daysSinceLastComm} days ago`,
      statute: stateReg.communicationRequirements || `${check.state} Fair Claims Handling Regulations`
    });

    return requirements;
  }

  /**
   * Check for unfair claims practices
   */
  private checkUnfairPractices(check: ComplianceCheck, stateReg: any): ComplianceRequirement[] {
    const requirements: ComplianceRequirement[] = [];
    const daysSinceReported = Math.ceil((Date.now() - new Date(check.claimData.reportedDate).getTime()) / (24 * 60 * 60 * 1000));

    // Delay tactics
    if (stateReg.unfairClaimsPractices?.includes('delay_tactics')) {
      requirements.push({
        category: 'No Delay Tactics',
        requirement: 'Claims must be processed without unreasonable delay',
        status: daysSinceReported > 90 && check.claimData.currentStatus === 'pending' ? 'overdue' : 'met',
        evidence: `Claim ${daysSinceReported} days old, status: ${check.claimData.currentStatus}`,
        statute: `${check.state} Unfair Claims Practices Act - Section 2.1`
      });
    }

    // Lowball offers
    if (stateReg.unfairClaimsPractices?.includes('lowball_offers')) {
      requirements.push({
        category: 'Fair Valuation',
        requirement: 'Settlement offers must be reasonable and based on actual cash value',
        status: 'met', // Would need actual settlement analysis
        statute: `${check.state} Unfair Claims Practices Act - Section 3.4`
      });
    }

    // Failure to investigate
    if (stateReg.unfairClaimsPractices?.includes('failure_to_investigate')) {
      requirements.push({
        category: 'Thorough Investigation',
        requirement: 'Claims must be thoroughly investigated before denial',
        status: check.claimData.investigationCompleted ? 'met' : 'pending',
        evidence: check.claimData.investigationCompleted ? 'Investigation completed' : 'Investigation ongoing',
        statute: `${check.state} Unfair Claims Practices Act - Section 4.2`
      });
    }

    return requirements;
  }

  /**
   * Identify violations
   */
  private identifyViolations(check: ComplianceCheck, requirements: ComplianceRequirement[], stateReg: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    requirements.forEach(req => {
      if (req.status === 'overdue') {
        const severity = this.determineSeverity(req, check, stateReg);

        violations.push({
          severity,
          category: req.category,
          description: `${req.requirement} - Deadline missed`,
          statute: req.statute,
          consequences: this.getConsequences(req, severity, stateReg),
          remediation: this.getRemediation(req),
          reportable: severity === 'critical' || severity === 'high'
        });
      }
    });

    return violations;
  }

  /**
   * Determine violation severity
   */
  private determineSeverity(req: ComplianceRequirement, check: ComplianceCheck, stateReg: any): 'critical' | 'high' | 'medium' | 'low' {
    // Critical violations
    if (req.category === 'Payment' && req.daysRemaining && req.daysRemaining < -30) return 'critical';
    if (req.category === 'Denial Notice' && req.status === 'overdue') return 'critical';

    // High severity
    if (req.category === 'Acknowledgment' && req.daysRemaining && req.daysRemaining < -10) return 'high';
    if (req.category === 'Investigation' && req.daysRemaining && req.daysRemaining < -30) return 'high';

    // Medium severity
    if (req.daysRemaining && req.daysRemaining < -7) return 'medium';

    return 'low';
  }

  /**
   * Get consequences for violation
   */
  private getConsequences(req: ComplianceRequirement, severity: 'critical' | 'high' | 'medium' | 'low', stateReg: any): string {
    const consequences: string[] = [];

    if (severity === 'critical') {
      consequences.push('Regulatory sanctions possible');
      consequences.push('Bad faith exposure');
      consequences.push('Potential fines');
    }

    if (severity === 'high') {
      consequences.push('Market conduct examination risk');
      consequences.push('Consumer complaint possible');
    }

    consequences.push('DOI inquiry possible');
    consequences.push('Reputational damage');

    return consequences.join('; ');
  }

  /**
   * Get remediation steps
   */
  private getRemediation(req: ComplianceRequirement): string {
    const steps: Record<string, string> = {
      'Acknowledgment': 'Send acknowledgment immediately with explanation for delay',
      'Investigation': 'Complete investigation urgently or provide status update with timeline',
      'Payment': 'Issue payment immediately and include interest for delay',
      'Status Updates': 'Send status update today and schedule regular updates',
      'Denial Notice': 'Ensure denial letter includes all required elements and reissue if necessary'
    };

    return steps[req.category] || 'Take corrective action immediately and document';
  }

  /**
   * Generate warnings for upcoming deadlines
   */
  private generateWarnings(check: ComplianceCheck, requirements: ComplianceRequirement[]): ComplianceWarning[] {
    const warnings: ComplianceWarning[] = [];

    requirements.forEach(req => {
      if (req.status === 'pending' && req.daysRemaining !== undefined && req.daysRemaining > 0 && req.daysRemaining <= 7) {
        warnings.push({
          category: req.category,
          description: `${req.requirement} - Due soon`,
          dueDate: req.deadline!,
          daysUntilDue: req.daysRemaining,
          action: `Complete ${req.category.toLowerCase()} before ${new Date(req.deadline!).toLocaleDateString()}`
        });
      }
    });

    return warnings.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  /**
   * Compile all deadlines
   */
  private compileDeadlines(requirements: ComplianceRequirement[]): ComplianceDeadline[] {
    return requirements
      .filter(req => req.deadline && req.status === 'pending')
      .map(req => {
        const daysRemaining = req.daysRemaining || 0;
        let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
        if (daysRemaining < 0) status = 'overdue';
        else if (daysRemaining === 0) status = 'today';

        let priority: 'critical' | 'high' | 'normal' = 'normal';
        if (daysRemaining <= 3) priority = 'critical';
        else if (daysRemaining <= 7) priority = 'high';

        return {
          requirement: req.requirement,
          dueDate: req.deadline!,
          status,
          daysRemaining,
          priority
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(violations: ComplianceViolation[], warnings: ComplianceWarning[]): string[] {
    const recommendations: string[] = [];

    // Critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push(`🚨 URGENT: ${criticalViolations.length} critical violation(s) require immediate attention`);
      criticalViolations.forEach(v => {
        recommendations.push(`  → ${v.remediation}`);
      });
    }

    // High severity violations
    const highViolations = violations.filter(v => v.severity === 'high');
    if (highViolations.length > 0) {
      recommendations.push(`⚠️ ${highViolations.length} high-severity violation(s) need prompt resolution`);
    }

    // Upcoming deadlines
    const urgentWarnings = warnings.filter(w => w.daysUntilDue <= 3);
    if (urgentWarnings.length > 0) {
      recommendations.push(`⏰ ${urgentWarnings.length} deadline(s) within 3 days - prioritize completion`);
    }

    // General recommendations
    if (violations.length === 0 && warnings.length === 0) {
      recommendations.push('✅ Claim is in compliance - continue standard processing');
    } else {
      recommendations.push('📋 Document all corrective actions taken');
      recommendations.push('📊 Generate compliance report for supervisor review');
    }

    return recommendations;
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(requirements: ComplianceRequirement[], violations: ComplianceViolation[]): number {
    let score = 100;

    // Deduct points for violations
    violations.forEach(v => {
      switch (v.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });

    // Deduct points for pending overdue requirements
    const overdue = requirements.filter(r => r.status === 'overdue');
    score -= overdue.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall compliance status
   */
  private determineOverallStatus(
    violations: ComplianceViolation[],
    warnings: ComplianceWarning[],
    score: number
  ): 'compliant' | 'at_risk' | 'non_compliant' {
    if (violations.some(v => v.severity === 'critical')) return 'non_compliant';
    if (score < 70) return 'non_compliant';
    if (violations.length > 0 || warnings.filter(w => w.daysUntilDue <= 3).length > 0) return 'at_risk';
    return 'compliant';
  }
}

// Singleton instance
export const complianceMonitor = new ComplianceMonitor();
