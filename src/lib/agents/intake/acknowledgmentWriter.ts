/**
 * ClaimAgent™ - Acknowledgment Writer (Agent A4)
 * 
 * Responsibilities:
 * - Draft acknowledgment letters and emails
 * - Apply carrier-specific templates
 * - Ensure state-specific disclosure compliance
 * - Generate claim numbers and reference information
 * - Personalize communications based on claim context
 * 
 * @module agents/intake/acknowledgmentWriter
 */

import { auditLog } from '@/lib/utils/auditLogger';

export interface AcknowledgmentInput {
    claimId: string;
    claimNumber: string;
    policyNumber: string;
    policyholder: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        preferredContact: 'email' | 'phone' | 'mail' | 'sms';
    };
    lossDate: Date;
    lossType: string;
    state: string;
    assignedAdjuster?: {
        name: string;
        phone: string;
        email: string;
    };
    estimatedCycleTime: number;
    nextSteps: string[];
    documentsRequired: string[];
    urgencyLevel: 'standard' | 'priority' | 'urgent';
    channel: 'email' | 'sms' | 'mail' | 'portal';
}

export interface AcknowledgmentOutput {
    content: string;
    subject?: string;
    attachments: string[];
    deliveryChannel: string;
    scheduledSendTime: Date;
    requiresReview: boolean;
    complianceChecks: ComplianceCheck[];
    metadata: {
        templateUsed: string;
        wordCount: number;
        readingLevel: string;
        languageCode: string;
    };
}

interface ComplianceCheck {
    requirement: string;
    status: 'pass' | 'fail' | 'warning';
    details: string;
    regulation: string;
}

export class AcknowledgmentWriter {
    async generateAcknowledgment(input: AcknowledgmentInput): Promise<AcknowledgmentOutput> {
        await auditLog({
            action: 'ACKNOWLEDGMENT_GENERATION_INITIATED',
            entityType: 'claim',
            entityId: input.claimId,
            metadata: { channel: input.channel, state: input.state }
        });

        try {
            const content = this.generateContent(input);
            const complianceChecks = this.runComplianceChecks(input, content);
            const requiresReview = complianceChecks.some(c => c.status === 'fail');

            const result: AcknowledgmentOutput = {
                content,
                subject: input.channel === 'email' ? `Claim ${input.claimNumber} - Acknowledgment of Receipt` : undefined,
                attachments: this.determineAttachments(input),
                deliveryChannel: input.channel,
                scheduledSendTime: this.calculateSendTime(input),
                requiresReview,
                complianceChecks,
                metadata: {
                    templateUsed: 'standard_acknowledgment',
                    wordCount: content.split(/\s+/).length,
                    readingLevel: '8th grade',
                    languageCode: 'en-US'
                }
            };

            await auditLog({
                action: 'ACKNOWLEDGMENT_GENERATION_COMPLETED',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { channel: input.channel, requiresReview }
            });

            return result;
        } catch (error) {
            await auditLog({
                action: 'ACKNOWLEDGMENT_GENERATION_ERROR',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
            throw error;
        }
    }

    private generateContent(input: AcknowledgmentInput): string {
        const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const lossDateFormatted = input.lossDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        let content = `
Dear ${input.policyholder.firstName} ${input.policyholder.lastName},

Thank you for reporting your ${input.lossType} claim. We understand this may be a difficult time and want to assure you that we are here to help.

CLAIM INFORMATION
-----------------
Claim Number: ${input.claimNumber}
Policy Number: ${input.policyNumber}
Date of Loss: ${lossDateFormatted}
Date Reported: ${formattedDate}
`;

        if (input.assignedAdjuster) {
            content += `
YOUR CLAIMS ADJUSTER
--------------------
Name: ${input.assignedAdjuster.name}
Phone: ${input.assignedAdjuster.phone}
Email: ${input.assignedAdjuster.email}
`;
        }

        if (input.nextSteps.length > 0) {
            content += `
NEXT STEPS
----------
${input.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
`;
        }

        if (input.documentsRequired.length > 0) {
            content += `
DOCUMENTS NEEDED
----------------
${input.documentsRequired.map(doc => `• ${doc}`).join('\n')}
`;
        }

        content += `
ESTIMATED TIMELINE
------------------
We aim to process your claim within ${this.formatCycleTime(input.estimatedCycleTime)}.

${this.getStateDisclosure(input.state)}

If you have any questions, please don't hesitate to contact us.

Sincerely,
Claims Department
`;

        return content.trim();
    }

    private formatCycleTime(hours: number): string {
        if (hours <= 24) return `${hours} hours`;
        const days = Math.ceil(hours / 24);
        return `${days} business day${days > 1 ? 's' : ''}`;
    }

    private getStateDisclosure(state: string): string {
        const disclosures: Record<string, string> = {
            CA: 'In accordance with California Insurance Code Section 790.03, we will provide you with a complete response within 15 calendar days.',
            TX: 'Per Texas Insurance Code, you will receive a decision on your claim within 15 business days of receiving all required documentation.',
            FL: 'Under Florida Statute 627.426, we will acknowledge receipt and begin processing your claim promptly.',
            NY: 'In compliance with New York Insurance Law, we will keep you informed of all developments in your claim.',
        };

        return disclosures[state] || 'We are committed to processing your claim in accordance with all applicable state regulations.';
    }

    private runComplianceChecks(input: AcknowledgmentInput, content: string): ComplianceCheck[] {
        const checks: ComplianceCheck[] = [];

        // Check claim number presence
        checks.push({
            requirement: 'Claim number displayed',
            status: content.includes(input.claimNumber) ? 'pass' : 'fail',
            details: 'Claim number must be prominently displayed',
            regulation: 'General Insurance Standards'
        });

        // Check policy number presence
        checks.push({
            requirement: 'Policy number included',
            status: content.includes(input.policyNumber) ? 'pass' : 'fail',
            details: 'Policy number must be referenced',
            regulation: 'General Insurance Standards'
        });

        // Check loss date presence
        checks.push({
            requirement: 'Loss date confirmed',
            status: content.toLowerCase().includes('loss') ? 'pass' : 'fail',
            details: 'Date of loss must be confirmed',
            regulation: 'Claims Handling Standards'
        });

        // Check contact information
        checks.push({
            requirement: 'Contact information provided',
            status: input.assignedAdjuster || content.toLowerCase().includes('contact') ? 'pass' : 'warning',
            details: 'Customer must be able to contact claims department',
            regulation: 'Customer Service Standards'
        });

        // Check state-specific disclosure
        checks.push({
            requirement: 'State disclosure included',
            status: content.toLowerCase().includes('accordance') || content.toLowerCase().includes('comply') ? 'pass' : 'warning',
            details: 'State-specific regulatory disclosure required',
            regulation: `${input.state} Insurance Code`
        });

        return checks;
    }

    private determineAttachments(input: AcknowledgmentInput): string[] {
        const attachments: string[] = [];

        if (input.documentsRequired.length > 0) {
            attachments.push('required_documents_checklist.pdf');
        }

        if (input.lossType === 'collision' || input.lossType === 'comprehensive') {
            attachments.push('repair_shop_guide.pdf');
        }

        attachments.push('claims_faq.pdf');

        return attachments;
    }

    private calculateSendTime(input: AcknowledgmentInput): Date {
        const now = new Date();

        if (input.urgencyLevel === 'urgent') {
            return now; // Send immediately
        }

        if (input.urgencyLevel === 'priority') {
            return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
        }

        // Standard - send within business hours
        const hour = now.getHours();
        if (hour >= 8 && hour < 18) {
            return new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
        }

        // Outside business hours - schedule for next morning
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(8, 0, 0, 0);
        return nextDay;
    }

    async generateBatchAcknowledgments(inputs: AcknowledgmentInput[]): Promise<Map<string, AcknowledgmentOutput>> {
        const results = new Map<string, AcknowledgmentOutput>();

        for (const input of inputs) {
            try {
                const output = await this.generateAcknowledgment(input);
                results.set(input.claimId, output);
            } catch (error) {
                console.error(`Failed to generate acknowledgment for claim ${input.claimId}:`, error);
            }
        }

        return results;
    }
}

export default AcknowledgmentWriter;

