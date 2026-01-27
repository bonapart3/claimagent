// src/lib/agents/communications/customerWriter.ts
// Agent E1: Customer Writer - Generates customer-facing communications

import { ClaimData, ClaimStatus } from '@/lib/types/claim';
import { AgentResult, AgentRole } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface CommunicationTemplate {
    type: string;
    subject: string;
    body: string;
    channel: 'EMAIL' | 'SMS' | 'LETTER';
}

export class CustomerWriter {
    private readonly agentId: AgentRole = 'CUSTOMER_WRITER';

    async generateCommunication(
        claimData: ClaimData,
        communicationType: string,
        additionalContext?: Record<string, unknown>
    ): Promise<AgentResult> {
        const startTime = Date.now();

        try {
            let communication: CommunicationTemplate;

            switch (communicationType) {
                case 'CLAIM_RECEIVED':
                    communication = this.generateClaimReceivedEmail(claimData);
                    break;
                case 'STATUS_UPDATE':
                    communication = this.generateStatusUpdateEmail(claimData);
                    break;
                case 'DOCUMENTS_NEEDED':
                    communication = this.generateDocumentsNeededEmail(claimData, additionalContext);
                    break;
                case 'SETTLEMENT_OFFER':
                    communication = this.generateSettlementOfferEmail(claimData, additionalContext);
                    break;
                case 'PAYMENT_ISSUED':
                    communication = this.generatePaymentIssuedEmail(claimData, additionalContext);
                    break;
                case 'CLAIM_CLOSED':
                    communication = this.generateClaimClosedEmail(claimData);
                    break;
                case 'DELAY_NOTIFICATION':
                    communication = this.generateDelayNotificationEmail(claimData, additionalContext);
                    break;
                default:
                    communication = this.generateGenericEmail(claimData, communicationType);
            }

            await auditLog({
                claimId: claimData.id,
                action: 'COMMUNICATION_GENERATED',
                agentId: this.agentId,
                description: `Generated ${communicationType} communication`,
                details: { type: communicationType, channel: communication.channel },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: communication,
                confidence: 0.95,
                processingTime: Date.now() - startTime,
            };
        } catch (error) {
            console.error('Customer communication error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Communication generation failed',
                processingTime: Date.now() - startTime,
            };
        }
    }

    private generateClaimReceivedEmail(claimData: ClaimData): CommunicationTemplate {
        return {
            type: 'CLAIM_RECEIVED',
            subject: `Claim Received - ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

Thank you for filing your claim with us. We have received your claim and are here to help you through this process.

CLAIM DETAILS:
- Claim Number: ${claimData.claimNumber}
- Date of Loss: ${new Date(claimData.lossDate).toLocaleDateString()}
- Claim Type: ${claimData.claimType}

WHAT HAPPENS NEXT:
1. Our team will review your claim within 24-48 hours
2. An adjuster may contact you for additional information
3. You can track your claim status online at claimagent.com/claims

NEED TO REACH US?
- Online: claimagent.com/claims/${claimData.claimNumber}
- Phone: 1-800-CLAIMS-1
- Email: tyler@claimagent.io

Please keep your claim number handy for all future correspondence.

We appreciate your patience and are committed to resolving your claim as quickly as possible.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateStatusUpdateEmail(claimData: ClaimData): CommunicationTemplate {
        const statusMessages: Record<string, string> = {
            SUBMITTED: 'Your claim has been submitted and is awaiting review.',
            UNDER_REVIEW: 'Your claim is currently being reviewed by our team.',
            INVESTIGATING: 'Our team is investigating the details of your claim.',
            APPROVED: 'Great news! Your claim has been approved.',
            REJECTED: 'After careful review, we were unable to approve your claim.',
            PAID: 'Payment for your claim has been processed.',
            CLOSED: 'Your claim has been closed.',
        };

        const statusMessage = statusMessages[claimData.status] || 'Your claim status has been updated.';

        return {
            type: 'STATUS_UPDATE',
            subject: `Claim Status Update - ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

We wanted to provide you with an update on your claim.

CLAIM: ${claimData.claimNumber}
NEW STATUS: ${claimData.status.replace('_', ' ')}

${statusMessage}

${claimData.status === 'APPROVED' ? `
Your approved settlement amount is $${(claimData.approvedAmount || 0).toLocaleString()}.
Please log in to your account to review the settlement details and complete any required documentation.
` : ''}

${claimData.status === 'REJECTED' ? `
If you have questions about this decision or would like to appeal, please contact our claims department.
` : ''}

Track your claim online: claimagent.com/claims/${claimData.claimNumber}

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateDocumentsNeededEmail(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): CommunicationTemplate {
        const documents = (context?.documentsNeeded as string[]) || [
            'Photos of damage',
            'Police report',
            'Repair estimates',
        ];

        const documentList = documents.map(d => `  • ${d}`).join('\n');

        return {
            type: 'DOCUMENTS_NEEDED',
            subject: `Documents Needed - Claim ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

To continue processing your claim, we need the following documents:

${documentList}

HOW TO SUBMIT:
1. Log in at claimagent.com/claims/${claimData.claimNumber}
2. Click "Upload Documents"
3. Select and upload the requested files

You can also:
- Email documents to: tyler@claimagent.io
- Fax to: 1-800-FAX-DOCS

Please reference your claim number (${claimData.claimNumber}) on all documents.

Submitting these documents promptly will help us process your claim faster.

If you have questions about what's needed, please contact us at 1-800-CLAIMS-1.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateSettlementOfferEmail(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): CommunicationTemplate {
        const amount = (context?.settlementAmount as number) || claimData.approvedAmount || 0;

        return {
            type: 'SETTLEMENT_OFFER',
            subject: `Settlement Offer - Claim ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

We have completed our evaluation of your claim and are pleased to present our settlement offer.

CLAIM: ${claimData.claimNumber}
SETTLEMENT AMOUNT: $${amount.toLocaleString()}

This offer includes all damages and losses covered under your policy for this claim.

TO ACCEPT THIS SETTLEMENT:
1. Log in at claimagent.com/claims/${claimData.claimNumber}
2. Review the settlement details
3. Sign the electronic release form
4. Select your payment preference

Payment will be processed within 3-5 business days of acceptance.

This offer is valid for 30 days from the date of this email.

If you have questions or concerns about this offer, please don't hesitate to contact us.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generatePaymentIssuedEmail(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): CommunicationTemplate {
        const amount = (context?.paymentAmount as number) || claimData.approvedAmount || 0;
        const method = (context?.paymentMethod as string) || 'check';

        return {
            type: 'PAYMENT_ISSUED',
            subject: `Payment Issued - Claim ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

Great news! Payment for your claim has been issued.

CLAIM: ${claimData.claimNumber}
PAYMENT AMOUNT: $${amount.toLocaleString()}
PAYMENT METHOD: ${method === 'ach' ? 'Direct Deposit' : 'Check'}

${method === 'ach' ?
                    'The funds should appear in your account within 2-3 business days.' :
                    'Your check has been mailed and should arrive within 5-7 business days.'}

If you have any questions about this payment, please contact us.

Thank you for choosing ClaimAgent™. We're glad we could help.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateClaimClosedEmail(claimData: ClaimData): CommunicationTemplate {
        return {
            type: 'CLAIM_CLOSED',
            subject: `Claim Closed - ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

Your claim has been closed.

CLAIM: ${claimData.claimNumber}
FINAL STATUS: ${claimData.status}
${claimData.approvedAmount ? `TOTAL PAID: $${claimData.approvedAmount.toLocaleString()}` : ''}

IMPORTANT INFORMATION:
- Keep copies of all claim documents for your records
- Contact us if you experience related issues in the future
- Your claim history is available online for 7 years

We hope this experience was satisfactory. Your feedback helps us improve our service.

TAKE OUR SURVEY: claimagent.com/feedback/${claimData.claimNumber}

Thank you for choosing ClaimAgent™.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateDelayNotificationEmail(
        claimData: ClaimData,
        context?: Record<string, unknown>
    ): CommunicationTemplate {
        const reason = (context?.delayReason as string) || 'additional review required';
        const newDate = (context?.estimatedDate as string) || 'within the next 5-7 business days';

        return {
            type: 'DELAY_NOTIFICATION',
            subject: `Update on Your Claim - ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

We wanted to let you know about a delay in processing your claim.

CLAIM: ${claimData.claimNumber}
REASON: ${reason}
EXPECTED UPDATE: ${newDate}

We understand this may be frustrating, and we apologize for any inconvenience. We are working diligently to resolve your claim as quickly as possible.

If you have questions or concerns, please don't hesitate to reach out:
- Phone: 1-800-CLAIMS-1
- Email: tyler@claimagent.io

We appreciate your patience and understanding.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    private generateGenericEmail(claimData: ClaimData, type: string): CommunicationTemplate {
        return {
            type,
            subject: `Regarding Your Claim - ${claimData.claimNumber}`,
            channel: 'EMAIL',
            body: `
Dear ${claimData.claimantName || 'Valued Customer'},

We are writing regarding your claim ${claimData.claimNumber}.

Please log in to your account at claimagent.com/claims to view the latest updates.

If you have any questions, please contact us at 1-800-CLAIMS-1.

Sincerely,
Claims Team
ClaimAgent™ Insurance Services
      `.trim(),
        };
    }

    // SMS variants for urgent communications
    generateSMS(claimData: ClaimData, type: string): CommunicationTemplate {
        const messages: Record<string, string> = {
            CLAIM_RECEIVED: `ClaimAgent: Your claim ${claimData.claimNumber} has been received. Track it at claimagent.com/claims`,
            STATUS_UPDATE: `ClaimAgent: Claim ${claimData.claimNumber} status updated to ${claimData.status}. Check details at claimagent.com/claims`,
            DOCUMENTS_NEEDED: `ClaimAgent: Documents needed for claim ${claimData.claimNumber}. Upload at claimagent.com/claims or call 1-800-CLAIMS-1`,
            PAYMENT_ISSUED: `ClaimAgent: Payment issued for claim ${claimData.claimNumber}. Amount: $${(claimData.approvedAmount || 0).toLocaleString()}`,
        };

        return {
            type,
            subject: '',
            channel: 'SMS',
            body: messages[type] || `ClaimAgent: Update on claim ${claimData.claimNumber}. Visit claimagent.com/claims`,
        };
    }
}

export const customerWriter = new CustomerWriter();

