// src/lib/agents/communications/internalDocSpecialist.ts
// Agent E2: Internal Documentation Specialist - Generates internal claim documentation

import { ClaimData } from '@/lib/types/claim';
import { AgentResult, AgentRole } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface InternalDocument {
    type: string;
    title: string;
    content: string;
    confidentiality: 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
    audience: string[];
}

export class InternalDocSpecialist {
    private readonly agentId = AgentRole.INTERNAL_DOC_SPECIALIST;

    async generateDocument(
        claimData: ClaimData,
        documentType: string,
        context?: Record<string, unknown>
    ): Promise<AgentResult> {
        const startTime = Date.now();

        try {
            let document: InternalDocument;

            switch (documentType) {
                case 'CLAIM_SUMMARY':
                    document = this.generateClaimSummary(claimData);
                    break;
                case 'INVESTIGATION_REPORT':
                    document = this.generateInvestigationReport(claimData, context);
                    break;
                case 'FRAUD_ALERT':
                    document = this.generateFraudAlert(claimData, context);
                    break;
                case 'SUPERVISOR_ESCALATION':
                    document = this.generateSupervisorEscalation(claimData, context);
                    break;
                case 'SETTLEMENT_MEMO':
                    document = this.generateSettlementMemo(claimData, context);
                    break;
                case 'COVERAGE_ANALYSIS':
                    document = this.generateCoverageAnalysisDoc(claimData, context);
                    break;
                default:
                    document = this.generateGenericDocument(claimData, documentType);
            }

            await auditLog({
                claimId: claimData.id,
                action: 'INTERNAL_DOC_GENERATED',
                agentId: this.agentId,
                description: `Generated ${documentType} document`,
                details: { documentType, confidentiality: document.confidentiality },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: document,
                confidence: 0.90,
                processingTime: Date.now() - startTime,
            };
        } catch (error) {
            console.error('Internal document generation error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Document generation failed',
                processingTime: Date.now() - startTime,
            };
        }
    }

    private generateClaimSummary(claimData: ClaimData): InternalDocument {
        const damages = claimData.damages || [];
        const damageList = damages.length > 0
            ? damages.map(d => `- ${d.component}: ${d.severity} - $${(d.estimatedCost || 0).toLocaleString()}`).join('\n')
            : '- No damage assessment available';

        return {
            type: 'CLAIM_SUMMARY',
            title: `Claim Summary - ${claimData.claimNumber}`,
            confidentiality: 'INTERNAL',
            audience: ['Adjusters', 'Supervisors', 'Quality Assurance'],
            content: `
================================================================================
                         CLAIM SUMMARY REPORT
================================================================================

CLAIM INFORMATION
-----------------
Claim Number:     ${claimData.claimNumber}
Policy Number:    ${claimData.policyNumber}
Status:           ${claimData.status}
Priority:         ${claimData.priority || 'NORMAL'}
Assigned To:      ${claimData.assignedAdjuster || 'Unassigned'}

LOSS DETAILS
------------
Date of Loss:     ${new Date(claimData.lossDate).toLocaleDateString()}
Time of Loss:     ${claimData.lossTime || 'Not specified'}
Location:         ${claimData.lossLocation}
Claim Type:       ${claimData.claimType}

Description:
${claimData.lossDescription || 'No description provided'}

INSURED INFORMATION
-------------------
Name:             ${claimData.claimantName || 'N/A'}
Contact Phone:    ${claimData.claimantPhone || 'N/A'}
Contact Email:    ${claimData.claimantEmail || 'N/A'}

VEHICLE INFORMATION
-------------------
VIN:              ${claimData.vehicle?.vin || 'N/A'}
Year/Make/Model:  ${claimData.vehicle?.year || ''} ${claimData.vehicle?.make || ''} ${claimData.vehicle?.model || ''}
Mileage:          ${claimData.vehicle?.mileage?.toLocaleString() || 'N/A'}

DAMAGE ASSESSMENT
-----------------
${damageList}

Total Estimated:  $${(claimData.estimatedAmount || 0).toLocaleString()}

FRAUD ANALYSIS
--------------
Fraud Score:      ${((claimData.fraudScore || 0) * 100).toFixed(1)}%
Risk Level:       ${this.getFraudRiskLevel(claimData.fraudScore || 0)}

KEY OBSERVATIONS
----------------
${this.generateKeyObservations(claimData)}

NEXT STEPS
----------
${this.generateNextSteps(claimData)}

================================================================================
Generated: ${new Date().toISOString()}
Agent: ${this.agentId}
================================================================================
      `.trim(),
        };
    }

    private generateInvestigationReport(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): InternalDocument {
        const findings = (context?.findings as string[]) || [];
        const findingsList = findings.length > 0
            ? findings.map((f, i) => `${i + 1}. ${f}`).join('\n')
            : 'Investigation findings pending';

        return {
            type: 'INVESTIGATION_REPORT',
            title: `Investigation Report - ${claimData.claimNumber}`,
            confidentiality: 'CONFIDENTIAL',
            audience: ['SIU', 'Supervisors', 'Legal'],
            content: `
================================================================================
                    INVESTIGATION REPORT - CONFIDENTIAL
================================================================================

CLAIM: ${claimData.claimNumber}
DATE: ${new Date().toLocaleDateString()}
INVESTIGATOR: ${context?.investigator || 'System Generated'}

INVESTIGATION SUMMARY
---------------------
${context?.summary || 'Automated investigation completed based on claim data analysis.'}

FINDINGS
--------
${findingsList}

EVIDENCE REVIEWED
-----------------
${this.listEvidence(claimData, context)}

WITNESS/PARTICIPANT STATEMENTS
------------------------------
${this.formatStatements(claimData)}

ANALYSIS
--------
${context?.analysis || 'Detailed analysis available in claim file.'}

CONCLUSION
----------
${context?.conclusion || 'Investigation results support claim validity.'}

RECOMMENDATIONS
---------------
${context?.recommendations || '- Proceed with standard claim processing\n- No additional investigation required'}

================================================================================
CONFIDENTIAL - For Internal Use Only
================================================================================
      `.trim(),
        };
    }

    private generateFraudAlert(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): InternalDocument {
        const indicators = (context?.indicators as string[]) || [];
        const indicatorList = indicators.length > 0
            ? indicators.map(i => `⚠️ ${i}`).join('\n')
            : 'No specific indicators provided';

        return {
            type: 'FRAUD_ALERT',
            title: `⚠️ FRAUD ALERT - ${claimData.claimNumber}`,
            confidentiality: 'RESTRICTED',
            audience: ['SIU', 'Fraud Unit', 'Management'],
            content: `
================================================================================
                    🚨 FRAUD ALERT - RESTRICTED 🚨
================================================================================

CLAIM: ${claimData.claimNumber}
ALERT DATE: ${new Date().toISOString()}
FRAUD SCORE: ${((claimData.fraudScore || 0) * 100).toFixed(1)}%
RISK LEVEL: ${this.getFraudRiskLevel(claimData.fraudScore || 0)}

FRAUD INDICATORS DETECTED
-------------------------
${indicatorList}

CLAIMANT PROFILE
----------------
Name:             ${claimData.claimantName || 'N/A'}
Prior Claims:     ${context?.priorClaims || 'Unknown'}
Watchlist Match:  ${context?.watchlistMatch ? 'YES ⚠️' : 'No'}

SUSPICIOUS PATTERNS
-------------------
${context?.patterns || 'See fraud analysis for detailed patterns.'}

IMMEDIATE ACTIONS REQUIRED
--------------------------
1. Place claim on hold pending SIU review
2. Do not contact claimant about fraud concerns
3. Preserve all evidence and documentation
4. Notify SIU supervisor within 24 hours

INVESTIGATION PRIORITY
----------------------
${context?.priority || 'HIGH'} - Recommend immediate SIU assignment

NOTES
-----
${context?.notes || 'This alert was generated by automated fraud detection systems.'}

================================================================================
RESTRICTED - SIU ACCESS ONLY
Do not discuss with claimant or share outside authorized personnel
================================================================================
      `.trim(),
        };
    }

    private generateSupervisorEscalation(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): InternalDocument {
        return {
            type: 'SUPERVISOR_ESCALATION',
            title: `Escalation Request - ${claimData.claimNumber}`,
            confidentiality: 'INTERNAL',
            audience: ['Supervisors', 'Management'],
            content: `
================================================================================
                         SUPERVISOR ESCALATION
================================================================================

CLAIM: ${claimData.claimNumber}
DATE: ${new Date().toLocaleDateString()}
ESCALATION TYPE: ${context?.escalationType || 'General Review'}

REASON FOR ESCALATION
---------------------
${context?.reason || 'Claim requires supervisor review and approval.'}

CURRENT STATUS
--------------
Status:           ${claimData.status}
Estimated Amount: $${(claimData.estimatedAmount || 0).toLocaleString()}
Fraud Score:      ${((claimData.fraudScore || 0) * 100).toFixed(1)}%

SPECIFIC CONCERNS
-----------------
${context?.concerns || 'See claim notes for details.'}

ADJUSTER RECOMMENDATION
-----------------------
${context?.recommendation || 'Requesting supervisor guidance.'}

ACTION REQUIRED
---------------
${context?.actionRequired || '- Review claim details\n- Provide direction to adjuster\n- Approve or modify settlement amount'}

DEADLINE
--------
${context?.deadline || 'Within 48 hours'}

================================================================================
      `.trim(),
        };
    }

    private generateSettlementMemo(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): InternalDocument {
        return {
            type: 'SETTLEMENT_MEMO',
            title: `Settlement Authorization Memo - ${claimData.claimNumber}`,
            confidentiality: 'INTERNAL',
            audience: ['Adjusters', 'Supervisors', 'Finance'],
            content: `
================================================================================
                     SETTLEMENT AUTHORIZATION MEMO
================================================================================

CLAIM: ${claimData.claimNumber}
DATE: ${new Date().toLocaleDateString()}
PREPARED BY: ${this.agentId}

SETTLEMENT AMOUNT
-----------------
Gross Amount:     $${(context?.grossAmount as number || claimData.estimatedAmount || 0).toLocaleString()}
Deductible:       $${(context?.deductible as number || 0).toLocaleString()}
NET SETTLEMENT:   $${(context?.netAmount as number || claimData.approvedAmount || 0).toLocaleString()}

COVERAGE ANALYSIS
-----------------
Coverage Type:    ${context?.coverageType || claimData.claimType}
Policy Limit:     $${(context?.policyLimit as number || 0).toLocaleString()}
Available:        $${(context?.availableLimit as number || 0).toLocaleString()}

SETTLEMENT BREAKDOWN
--------------------
${context?.breakdown || 'See settlement calculation for itemized breakdown.'}

AUTHORITY LEVEL
---------------
Required:         ${context?.authorityRequired || 'Adjuster'}
Approved By:      ${context?.approvedBy || 'Pending'}

PAYMENT INSTRUCTIONS
--------------------
Payee:            ${context?.payee || claimData.claimantName || 'N/A'}
Method:           ${context?.paymentMethod || 'Check'}
Special Notes:    ${context?.paymentNotes || 'None'}

JUSTIFICATION
-------------
${context?.justification || 'Settlement amount represents fair and reasonable compensation based on damage assessment and coverage analysis.'}

================================================================================
      `.trim(),
        };
    }

    private generateCoverageAnalysisDoc(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): InternalDocument {
        return {
            type: 'COVERAGE_ANALYSIS',
            title: `Coverage Analysis - ${claimData.claimNumber}`,
            confidentiality: 'INTERNAL',
            audience: ['Adjusters', 'Underwriting'],
            content: `
================================================================================
                        COVERAGE ANALYSIS DOCUMENT
================================================================================

CLAIM: ${claimData.claimNumber}
POLICY: ${claimData.policyNumber}
ANALYSIS DATE: ${new Date().toLocaleDateString()}

POLICY STATUS AT TIME OF LOSS
-----------------------------
Status:           ${context?.policyStatus || 'Active'}
Effective:        ${context?.effectiveDate || 'N/A'}
Expiration:       ${context?.expirationDate || 'N/A'}

APPLICABLE COVERAGES
--------------------
${context?.coverages || 'Coverage analysis pending.'}

COVERAGE LIMITS
---------------
${context?.limits || 'See policy declarations.'}

DEDUCTIBLES
-----------
${context?.deductibles || 'See policy declarations.'}

EXCLUSIONS REVIEWED
-------------------
${context?.exclusions || 'No applicable exclusions identified.'}

COVERAGE DETERMINATION
----------------------
${context?.determination || 'Coverage applies to this loss.'}

SPECIAL CONDITIONS
------------------
${context?.specialConditions || 'None identified.'}

RECOMMENDATIONS
---------------
${context?.recommendations || 'Proceed with standard claim handling.'}

================================================================================
      `.trim(),
        };
    }

    private generateGenericDocument(claimData: ClaimData, type: string): InternalDocument {
        return {
            type,
            title: `${type} - ${claimData.claimNumber}`,
            confidentiality: 'INTERNAL',
            audience: ['Adjusters'],
            content: `
================================================================================
                              ${type.toUpperCase()}
================================================================================

CLAIM: ${claimData.claimNumber}
DATE: ${new Date().toLocaleDateString()}

Document content to be populated based on claim analysis.

================================================================================
      `.trim(),
        };
    }

    private getFraudRiskLevel(score: number): string {
        if (score >= 0.8) return 'CRITICAL';
        if (score >= 0.6) return 'HIGH';
        if (score >= 0.4) return 'MEDIUM';
        if (score >= 0.2) return 'LOW';
        return 'MINIMAL';
    }

    private generateKeyObservations(claimData: ClaimData): string {
        const observations: string[] = [];

        if (claimData.injuries) {
            observations.push('- Injuries reported - may require medical documentation');
        }

        if ((claimData.fraudScore || 0) > 0.5) {
            observations.push('- Elevated fraud score - recommend additional review');
        }

        if ((claimData.estimatedAmount || 0) > 25000) {
            observations.push('- High-value claim - supervisor approval may be required');
        }

        if (observations.length === 0) {
            observations.push('- Standard claim processing recommended');
        }

        return observations.join('\n');
    }

    private generateNextSteps(claimData: ClaimData): string {
        const steps: string[] = [];

        if (claimData.status === 'SUBMITTED') {
            steps.push('1. Complete initial review');
            steps.push('2. Verify policy coverage');
            steps.push('3. Request any missing documentation');
        } else if (claimData.status === 'UNDER_REVIEW') {
            steps.push('1. Complete damage assessment');
            steps.push('2. Calculate settlement amount');
            steps.push('3. Prepare settlement offer');
        } else {
            steps.push('1. Continue standard processing');
        }

        return steps.join('\n');
    }

    private listEvidence(claimData: ClaimData, context?: Record<string, unknown>): string {
        const evidence: string[] = [];

        if (claimData.documents) {
            claimData.documents.forEach(doc => {
                evidence.push(`- ${doc.type}: ${doc.fileName}`);
            });
        }

        if (evidence.length === 0) {
            evidence.push('- No additional evidence reviewed');
        }

        return evidence.join('\n');
    }

    private formatStatements(claimData: ClaimData): string {
        if (!claimData.participants || claimData.participants.length === 0) {
            return 'No participant statements available.';
        }

        return claimData.participants
            .map(p => `${p.name} (${p.role}): ${p.statement || 'No statement provided'}`)
            .join('\n\n');
    }
}

export const internalDocSpecialist = new InternalDocSpecialist();

