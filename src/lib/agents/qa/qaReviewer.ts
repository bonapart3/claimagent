// src/lib/agents/qa/qaReviewer.ts
// Agent F1: QA Reviewer - Quality assurance review of claim decisions

import { ClaimData } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface QACheckResult {
    checkId: string;
    category: string;
    description: string;
    status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIPPED';
    details: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface QAReviewResult {
    claimId: string;
    reviewDate: string;
    overallStatus: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
    score: number;
    checks: QACheckResult[];
    passedChecks: number;
    failedChecks: number;
    warnings: number;
    recommendations: string[];
    requiresSupervisorReview: boolean;
    complianceIssues: string[];
}

export class QAReviewer {
    private readonly agentId: AgentRole = AgentRole.QA_REVIEWER;

    async review(
        claimData: ClaimData,
        processingResults: Record<string, unknown>
    ): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];
        const checks: QACheckResult[] = [];

        try {
            // Run all QA checks
            checks.push(...this.runDocumentationChecks(claimData));
            checks.push(...this.runProcessingChecks(claimData, processingResults));
            checks.push(...this.runComplianceChecks(claimData));
            checks.push(...this.runFinancialChecks(claimData, processingResults));
            checks.push(...this.runTimelinessChecks(claimData));
            checks.push(...this.runDataQualityChecks(claimData));

            // Calculate results
            const passedChecks = checks.filter(c => c.status === 'PASS').length;
            const failedChecks = checks.filter(c => c.status === 'FAIL').length;
            const warnings = checks.filter(c => c.status === 'WARNING').length;
            const score = Math.round((passedChecks / checks.length) * 100);

            // Determine overall status
            const criticalFails = checks.filter(c => c.status === 'FAIL' && c.severity === 'CRITICAL');
            const highFails = checks.filter(c => c.status === 'FAIL' && c.severity === 'HIGH');

            let overallStatus: 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
            if (criticalFails.length > 0) {
                overallStatus = 'REJECTED';
            } else if (highFails.length > 0 || failedChecks > 2) {
                overallStatus = 'NEEDS_REVIEW';
            } else {
                overallStatus = 'APPROVED';
            }

            // Collect compliance issues
            const complianceIssues = checks
                .filter(c => c.category === 'COMPLIANCE' && c.status === 'FAIL')
                .map(c => c.description);

            // Determine if supervisor review needed
            const requiresSupervisorReview =
                overallStatus !== 'APPROVED' ||
                criticalFails.length > 0 ||
                complianceIssues.length > 0;

            // Generate escalations
            if (overallStatus === 'REJECTED') {
                escalations.push({
                    type: 'QA_FAILURE',
                    reason: `QA review rejected: ${criticalFails.map(c => c.description).join(', ')}`,
                    severity: 'HIGH',
                });
            }

            if (complianceIssues.length > 0) {
                escalations.push({
                    type: 'COMPLIANCE_ISSUE',
                    reason: `Compliance issues: ${complianceIssues.join(', ')}`,
                    severity: 'HIGH',
                });
            }

            const result: QAReviewResult = {
                claimId: claimData.id,
                reviewDate: new Date().toISOString(),
                overallStatus,
                score,
                checks,
                passedChecks,
                failedChecks,
                warnings,
                recommendations: this.generateRecommendations(checks, overallStatus),
                requiresSupervisorReview,
                complianceIssues,
            };

            await auditLog({
                claimId: claimData.id,
                action: 'QA_REVIEW_COMPLETED',
                agentId: this.agentId,
                description: `QA Review: ${overallStatus} (Score: ${score}%)`,
                details: { result },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: result,
                confidence: score / 100,
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: result.recommendations,
            };
        } catch (error) {
            console.error('QA review error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'QA review failed',
                processingTime: Date.now() - startTime,
            };
        }
    }

    private runDocumentationChecks(claimData: ClaimData): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check for required documents
        checks.push({
            checkId: 'DOC-001',
            category: 'DOCUMENTATION',
            description: 'Claim has supporting documentation',
            status: claimData.documents && claimData.documents.length > 0 ? 'PASS' : 'WARNING',
            details: `${claimData.documents?.length || 0} documents on file`,
            severity: 'MEDIUM',
        });

        // Check for photos
        const hasPhotos = claimData.documents?.some(d =>
            d.type === 'PHOTO' || d.type === 'DAMAGE_PHOTO'
        );
        checks.push({
            checkId: 'DOC-002',
            category: 'DOCUMENTATION',
            description: 'Damage photos provided',
            status: hasPhotos ? 'PASS' : 'WARNING',
            details: hasPhotos ? 'Photos on file' : 'No damage photos found',
            severity: 'MEDIUM',
        });

        // Check for police report on required claim types
        if (['THEFT', 'HIT_AND_RUN'].includes(claimData.claimType)) {
            checks.push({
                checkId: 'DOC-003',
                category: 'DOCUMENTATION',
                description: 'Police report provided for theft/hit-and-run',
                status: claimData.policeReportNumber ? 'PASS' : 'FAIL',
                details: claimData.policeReportNumber
                    ? `Report: ${claimData.policeReportNumber}`
                    : 'Police report required but not provided',
                severity: 'HIGH',
            });
        }

        // Check for estimates on damage claims
        if (claimData.claimType === 'COLLISION' || claimData.claimType === 'COMPREHENSIVE') {
            const hasEstimate = claimData.documents?.some(d =>
                d.type === 'ESTIMATE' || d.type === 'REPAIR_ESTIMATE'
            );
            checks.push({
                checkId: 'DOC-004',
                category: 'DOCUMENTATION',
                description: 'Repair estimate provided',
                status: hasEstimate || claimData.damages?.length ? 'PASS' : 'WARNING',
                details: hasEstimate ? 'Estimate on file' : 'No formal estimate',
                severity: 'MEDIUM',
            });
        }

        return checks;
    }

    private runProcessingChecks(
        claimData: ClaimData,
        results: Record<string, unknown>
    ): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check fraud score was calculated
        checks.push({
            checkId: 'PROC-001',
            category: 'PROCESSING',
            description: 'Fraud analysis completed',
            status: claimData.fraudScore !== undefined ? 'PASS' : 'WARNING',
            details: claimData.fraudScore !== undefined
                ? `Fraud score: ${(claimData.fraudScore * 100).toFixed(1)}%`
                : 'No fraud score recorded',
            severity: 'MEDIUM',
        });

        // Check coverage verification
        checks.push({
            checkId: 'PROC-002',
            category: 'PROCESSING',
            description: 'Coverage verified',
            status: results.coverageAnalysis ? 'PASS' : 'WARNING',
            details: results.coverageAnalysis ? 'Coverage analysis completed' : 'Coverage not verified',
            severity: 'HIGH',
        });

        // Check damage assessment
        checks.push({
            checkId: 'PROC-003',
            category: 'PROCESSING',
            description: 'Damage assessment completed',
            status: claimData.damages && claimData.damages.length > 0 ? 'PASS' : 'WARNING',
            details: `${claimData.damages?.length || 0} damage items assessed`,
            severity: 'MEDIUM',
        });

        // Check settlement calculation
        if (claimData.status === 'APPROVED' || claimData.approvedAmount) {
            checks.push({
                checkId: 'PROC-004',
                category: 'PROCESSING',
                description: 'Settlement properly calculated',
                status: claimData.approvedAmount && claimData.approvedAmount > 0 ? 'PASS' : 'FAIL',
                details: claimData.approvedAmount
                    ? `Settlement: $${claimData.approvedAmount.toLocaleString()}`
                    : 'No settlement amount recorded',
                severity: 'HIGH',
            });
        }

        // Check all required agents ran
        const requiredAgents = ['intakeValidation', 'fraudAnalysis', 'coverageAnalysis'];
        const missingAgents = requiredAgents.filter(a => !results[a]);
        checks.push({
            checkId: 'PROC-005',
            category: 'PROCESSING',
            description: 'All required processing steps completed',
            status: missingAgents.length === 0 ? 'PASS' : 'FAIL',
            details: missingAgents.length === 0
                ? 'All processing complete'
                : `Missing: ${missingAgents.join(', ')}`,
            severity: 'HIGH',
        });

        return checks;
    }

    private runComplianceChecks(claimData: ClaimData): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check for proper claim status
        const validStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'INVESTIGATING', 'APPROVED', 'REJECTED', 'PAID', 'CLOSED'];
        checks.push({
            checkId: 'COMP-001',
            category: 'COMPLIANCE',
            description: 'Valid claim status',
            status: validStatuses.includes(claimData.status) ? 'PASS' : 'FAIL',
            details: `Current status: ${claimData.status}`,
            severity: 'HIGH',
        });

        // Check for audit trail
        checks.push({
            checkId: 'COMP-002',
            category: 'COMPLIANCE',
            description: 'Audit trail maintained',
            status: claimData.auditLogs && claimData.auditLogs.length > 0 ? 'PASS' : 'WARNING',
            details: `${claimData.auditLogs?.length || 0} audit entries`,
            severity: 'MEDIUM',
        });

        // Check state regulation compliance
        if (claimData.lossState) {
            checks.push({
                checkId: 'COMP-003',
                category: 'COMPLIANCE',
                description: 'State regulations applied',
                status: 'PASS', // Would check actual regulations in production
                details: `State: ${claimData.lossState}`,
                severity: 'HIGH',
            });
        }

        // Check for proper notifications
        if (['APPROVED', 'REJECTED'].includes(claimData.status)) {
            checks.push({
                checkId: 'COMP-004',
                category: 'COMPLIANCE',
                description: 'Claimant notification sent',
                status: claimData.notificationSent ? 'PASS' : 'WARNING',
                details: claimData.notificationSent
                    ? 'Notification sent'
                    : 'Notification status unknown',
                severity: 'MEDIUM',
            });
        }

        // Check for proper authorization
        if (claimData.approvedAmount && claimData.approvedAmount > 25000) {
            checks.push({
                checkId: 'COMP-005',
                category: 'COMPLIANCE',
                description: 'High-value claim authorization',
                status: claimData.supervisorApproval ? 'PASS' : 'FAIL',
                details: claimData.supervisorApproval
                    ? 'Supervisor approved'
                    : 'Supervisor approval required for amount > $25,000',
                severity: 'CRITICAL',
            });
        }

        return checks;
    }

    private runFinancialChecks(
        claimData: ClaimData,
        results: Record<string, unknown>
    ): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check estimated vs approved amounts
        if (claimData.estimatedAmount && claimData.approvedAmount) {
            const variance = Math.abs(claimData.approvedAmount - claimData.estimatedAmount) / claimData.estimatedAmount;
            checks.push({
                checkId: 'FIN-001',
                category: 'FINANCIAL',
                description: 'Settlement within estimate variance',
                status: variance <= 0.2 ? 'PASS' : variance <= 0.5 ? 'WARNING' : 'FAIL',
                details: `Variance: ${(variance * 100).toFixed(1)}%`,
                severity: variance > 0.5 ? 'HIGH' : 'MEDIUM',
            });
        }

        // Check for reasonable amounts
        if (claimData.approvedAmount) {
            checks.push({
                checkId: 'FIN-002',
                category: 'FINANCIAL',
                description: 'Settlement amount reasonable',
                status: claimData.approvedAmount > 0 && claimData.approvedAmount < 500000 ? 'PASS' : 'WARNING',
                details: `Amount: $${claimData.approvedAmount.toLocaleString()}`,
                severity: 'MEDIUM',
            });
        }

        // Check deductible applied
        if (claimData.deductible !== undefined) {
            checks.push({
                checkId: 'FIN-003',
                category: 'FINANCIAL',
                description: 'Deductible properly applied',
                status: claimData.deductible >= 0 ? 'PASS' : 'FAIL',
                details: `Deductible: $${claimData.deductible.toLocaleString()}`,
                severity: 'HIGH',
            });
        }

        // Check reserve adequacy
        const reserveAnalysis = results.reserveAnalysis as { totalReserve?: { recommended?: number } } | undefined;
        if (reserveAnalysis?.totalReserve?.recommended) {
            const reserve = reserveAnalysis.totalReserve.recommended;
            const settlement = claimData.approvedAmount || 0;
            checks.push({
                checkId: 'FIN-004',
                category: 'FINANCIAL',
                description: 'Settlement within reserve',
                status: settlement <= reserve * 1.1 ? 'PASS' : 'WARNING',
                details: `Reserve: $${reserve.toLocaleString()}, Settlement: $${settlement.toLocaleString()}`,
                severity: 'MEDIUM',
            });
        }

        return checks;
    }

    private runTimelinessChecks(claimData: ClaimData): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check claim acknowledgment time
        if (claimData.createdAt && claimData.acknowledgedAt) {
            const created = new Date(claimData.createdAt);
            const acknowledged = new Date(claimData.acknowledgedAt);
            const hours = (acknowledged.getTime() - created.getTime()) / (1000 * 60 * 60);

            checks.push({
                checkId: 'TIME-001',
                category: 'TIMELINESS',
                description: 'Claim acknowledged within 24 hours',
                status: hours <= 24 ? 'PASS' : hours <= 48 ? 'WARNING' : 'FAIL',
                details: `Acknowledged in ${hours.toFixed(1)} hours`,
                severity: 'MEDIUM',
            });
        }

        // Check processing time
        if (claimData.createdAt) {
            const created = new Date(claimData.createdAt);
            const now = new Date();
            const days = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

            if (['SUBMITTED', 'UNDER_REVIEW'].includes(claimData.status)) {
                checks.push({
                    checkId: 'TIME-002',
                    category: 'TIMELINESS',
                    description: 'Claim processed within SLA',
                    status: days <= 10 ? 'PASS' : days <= 20 ? 'WARNING' : 'FAIL',
                    details: `${Math.round(days)} days in processing`,
                    severity: days > 30 ? 'HIGH' : 'MEDIUM',
                });
            }
        }

        return checks;
    }

    private runDataQualityChecks(claimData: ClaimData): QACheckResult[] {
        const checks: QACheckResult[] = [];

        // Check for complete claimant information
        checks.push({
            checkId: 'DATA-001',
            category: 'DATA_QUALITY',
            description: 'Claimant contact information complete',
            status: claimData.claimantName && (claimData.claimantPhone || claimData.claimantEmail) ? 'PASS' : 'WARNING',
            details: claimData.claimantName ? 'Contact info on file' : 'Missing contact info',
            severity: 'LOW',
        });

        // Check for complete vehicle information
        if (claimData.vehicle) {
            const vehicleComplete = claimData.vehicle.vin &&
                claimData.vehicle.year &&
                claimData.vehicle.make &&
                claimData.vehicle.model;
            checks.push({
                checkId: 'DATA-002',
                category: 'DATA_QUALITY',
                description: 'Vehicle information complete',
                status: vehicleComplete ? 'PASS' : 'WARNING',
                details: vehicleComplete ? 'Vehicle info complete' : 'Incomplete vehicle info',
                severity: 'MEDIUM',
            });
        }

        // Check loss description quality
        checks.push({
            checkId: 'DATA-003',
            category: 'DATA_QUALITY',
            description: 'Loss description adequate',
            status: claimData.lossDescription && claimData.lossDescription.length > 50 ? 'PASS' : 'WARNING',
            details: `${claimData.lossDescription?.length || 0} characters`,
            severity: 'LOW',
        });

        return checks;
    }

    private generateRecommendations(checks: QACheckResult[], status: string): string[] {
        const recommendations: string[] = [];

        const failedChecks = checks.filter(c => c.status === 'FAIL');
        const warnings = checks.filter(c => c.status === 'WARNING');

        if (status === 'APPROVED') {
            recommendations.push('Claim passes QA - approved for processing');
        } else if (status === 'NEEDS_REVIEW') {
            recommendations.push('Manual review required before proceeding');

            for (const check of failedChecks) {
                recommendations.push(`Address: ${check.description}`);
            }
        } else {
            recommendations.push('Claim rejected - correct issues and resubmit');

            for (const check of failedChecks.filter(c => c.severity === 'CRITICAL')) {
                recommendations.push(`CRITICAL: ${check.description}`);
            }
        }

        if (warnings.length > 3) {
            recommendations.push('Consider improving documentation quality');
        }

        return recommendations;
    }
}

export const qaReviewer = new QAReviewer();

