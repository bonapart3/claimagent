/**
 * ClaimAgent™ - Evidence Collector (Agent B1)
 * 
 * Responsibilities:
 * - Gather photos, estimates, police reports, medical bills
 * - Index and organize documentation
 * - Create evidence timeline
 * - Validate document completeness
 * - Extract metadata from documents
 * - Detect missing or inconsistent evidence
 * 
 * @module agents/investigation/evidenceCollector
 */

import { auditLog } from '@/lib/utils/auditLogger';

export interface EvidenceInput {
    claimId: string;
    documentSources: DocumentSource[];
    claimType: string;
    lossDate: Date;
    requiredDocuments: string[];
}

export interface DocumentSource {
    type: 'photo' | 'estimate' | 'police_report' | 'medical_bill' | 'telematics' | 'statement' | 'repair_invoice' | 'other';
    url?: string;
    content?: Buffer | string;
    uploadDate: Date;
    uploadedBy: string;
    filename: string;
    metadata?: Record<string, any>;
}

export interface EvidencePackage {
    claimId: string;
    collectionDate: Date;
    completeness: number;
    documents: CategorizedDocument[];
    timeline: TimelineEvent[];
    missingDocuments: string[];
    qualityIssues: QualityIssue[];
    metadata: {
        totalDocuments: number;
        totalPhotos: number;
        totalPages: number;
        storageSize: number;
    };
    recommendations: string[];
}

export interface CategorizedDocument {
    id: string;
    type: string;
    filename: string;
    uploadDate: Date;
    uploadedBy: string;
    category: 'critical' | 'important' | 'supplementary';
    verified: boolean;
    extractedData?: Record<string, any>;
    relatedDocuments: string[];
    tags: string[];
    url: string;
    thumbnailUrl?: string;
}

export interface TimelineEvent {
    date: Date;
    event: string;
    source: string;
    documentId?: string;
    importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface QualityIssue {
    documentId: string;
    issue: string;
    severity: 'warning' | 'error';
    recommendation: string;
}

export class EvidenceCollector {
    private readonly REQUIRED_PHOTOS_MIN = 4;

    async collectEvidence(input: EvidenceInput): Promise<EvidencePackage> {
        await auditLog({
            action: 'EVIDENCE_COLLECTION_INITIATED',
            entityType: 'claim',
            entityId: input.claimId,
            metadata: { documentCount: input.documentSources.length }
        });

        try {
            const documents = await this.categorizeDocuments(input.documentSources, input.claimId);
            const timeline = this.buildTimeline(documents, input.lossDate);
            const completeness = this.calculateCompleteness(documents, input.requiredDocuments, input.claimType);
            const missingDocuments = this.identifyMissingDocuments(documents, input.requiredDocuments, input.claimType);
            const qualityIssues = await this.detectQualityIssues(documents);
            const metadata = this.calculateMetadata(documents);
            const recommendations = this.generateRecommendations(completeness, missingDocuments, qualityIssues);

            const evidencePackage: EvidencePackage = {
                claimId: input.claimId,
                collectionDate: new Date(),
                completeness,
                documents,
                timeline,
                missingDocuments,
                qualityIssues,
                metadata,
                recommendations
            };

            await auditLog({
                action: 'EVIDENCE_COLLECTION_COMPLETED',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { completeness, documentCount: documents.length, missingCount: missingDocuments.length }
            });

            return evidencePackage;
        } catch (error) {
            await auditLog({
                action: 'EVIDENCE_COLLECTION_ERROR',
                entityType: 'claim',
                entityId: input.claimId,
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
            });
            throw error;
        }
    }

    private async categorizeDocuments(sources: DocumentSource[], claimId: string): Promise<CategorizedDocument[]> {
        const documents: CategorizedDocument[] = [];

        for (const source of sources) {
            const doc: CategorizedDocument = {
                id: `${claimId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: source.type,
                filename: source.filename,
                uploadDate: source.uploadDate,
                uploadedBy: source.uploadedBy,
                category: this.determineCategory(source.type),
                verified: false,
                tags: this.generateTags(source),
                url: source.url || '',
                relatedDocuments: []
            };

            if (source.metadata) doc.extractedData = source.metadata;
            if (source.content) doc.extractedData = await this.extractDocumentData(source);
            doc.verified = await this.verifyDocument(source);
            documents.push(doc);
        }

        this.linkRelatedDocuments(documents);
        return documents;
    }

    private determineCategory(type: string): 'critical' | 'important' | 'supplementary' {
        const criticalTypes = ['police_report', 'estimate', 'medical_bill'];
        const importantTypes = ['photo', 'statement', 'repair_invoice'];
        if (criticalTypes.includes(type)) return 'critical';
        if (importantTypes.includes(type)) return 'important';
        return 'supplementary';
    }

    private generateTags(source: DocumentSource): string[] {
        const tags: string[] = [source.type];
        const filename = source.filename.toLowerCase();
        if (filename.includes('front')) tags.push('front_damage');
        if (filename.includes('rear')) tags.push('rear_damage');
        if (filename.includes('side')) tags.push('side_damage');
        if (filename.includes('interior')) tags.push('interior');
        if (filename.includes('vin')) tags.push('vin_plate');
        if (filename.includes('odometer')) tags.push('odometer');
        tags.push(`uploaded_${source.uploadDate.getFullYear()}_${source.uploadDate.getMonth() + 1}`);
        return tags;
    }

    private async extractDocumentData(source: DocumentSource): Promise<Record<string, any>> {
        const extracted: Record<string, any> = {};
        switch (source.type) {
            case 'estimate':
                extracted.estimateAmount = null;
                extracted.repairItems = [];
                extracted.laborHours = null;
                break;
            case 'police_report':
                extracted.reportNumber = null;
                extracted.officerName = null;
                extracted.faultDetermination = null;
                break;
            case 'medical_bill':
                extracted.provider = null;
                extracted.amount = null;
                extracted.cptCodes = [];
                break;
            case 'photo':
                extracted.timestamp = source.metadata?.timestamp || null;
                extracted.gpsLocation = source.metadata?.gpsLocation || null;
                extracted.deviceInfo = source.metadata?.deviceInfo || null;
                break;
        }
        return extracted;
    }

    private async verifyDocument(source: DocumentSource): Promise<boolean> {
        const checks = {
            hasContent: !!source.content || !!source.url,
            hasMetadata: !!source.metadata,
            validTimestamp: source.uploadDate <= new Date(),
            validFilename: source.filename.length > 0
        };
        return Object.values(checks).every(check => check);
    }

    private linkRelatedDocuments(documents: CategorizedDocument[]): void {
        for (let i = 0; i < documents.length; i++) {
            for (let j = i + 1; j < documents.length; j++) {
                if (this.areDocumentsRelated(documents[i], documents[j])) {
                    documents[i].relatedDocuments.push(documents[j].id);
                    documents[j].relatedDocuments.push(documents[i].id);
                }
            }
        }
    }

    private areDocumentsRelated(doc1: CategorizedDocument, doc2: CategorizedDocument): boolean {
        const sharedTags = doc1.tags.filter(tag => doc2.tags.includes(tag));
        if (sharedTags.length >= 2) return true;
        const timeDiff = Math.abs(doc1.uploadDate.getTime() - doc2.uploadDate.getTime());
        if (timeDiff < 5 * 60 * 1000 && doc1.uploadedBy === doc2.uploadedBy) return true;
        if ((doc1.type === 'estimate' && doc2.type === 'photo') || (doc1.type === 'photo' && doc2.type === 'estimate')) return true;
        return false;
    }

    private buildTimeline(documents: CategorizedDocument[], lossDate: Date): TimelineEvent[] {
        const timeline: TimelineEvent[] = [];
        timeline.push({ date: lossDate, event: 'Loss Occurred', source: 'Claim Data', importance: 'critical' });
        for (const doc of documents) {
            timeline.push({
                date: doc.uploadDate,
                event: `${this.humanizeDocType(doc.type)} Uploaded`,
                source: doc.uploadedBy,
                documentId: doc.id,
                importance: doc.category === 'critical' ? 'high' : 'medium'
            });
            if (doc.extractedData?.timestamp) {
                timeline.push({
                    date: new Date(doc.extractedData.timestamp),
                    event: `${this.humanizeDocType(doc.type)} Created`,
                    source: doc.type,
                    documentId: doc.id,
                    importance: 'medium'
                });
            }
        }
        timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
        return timeline;
    }

    private calculateCompleteness(documents: CategorizedDocument[], required: string[], claimType: string): number {
        const requiredDocs = [...required, ...this.getClaimTypeRequirements(claimType)];
        const uniqueRequired = Array.from(new Set(requiredDocs));
        let satisfied = 0;
        for (const reqDoc of uniqueRequired) {
            if (documents.some(doc => doc.type === reqDoc || doc.tags.includes(reqDoc))) satisfied++;
        }
        const photoCount = documents.filter(d => d.type === 'photo').length;
        if (photoCount >= this.REQUIRED_PHOTOS_MIN) satisfied += 0.5;
        return Math.min(Math.round((satisfied / uniqueRequired.length) * 100), 100);
    }

    private getClaimTypeRequirements(claimType: string): string[] {
        const requirements: Record<string, string[]> = {
            collision: ['photo', 'estimate', 'police_report'],
            comprehensive: ['photo', 'estimate'],
            liability: ['photo', 'statement', 'police_report'],
            medical_payments: ['medical_bill', 'statement']
        };
        return requirements[claimType] || ['photo', 'estimate'];
    }

    private identifyMissingDocuments(documents: CategorizedDocument[], required: string[], claimType: string): string[] {
        const requiredDocs = [...required, ...this.getClaimTypeRequirements(claimType)];
        const uniqueRequired = Array.from(new Set(requiredDocs));
        const missing: string[] = [];
        for (const reqDoc of uniqueRequired) {
            if (!documents.some(doc => doc.type === reqDoc || doc.tags.includes(reqDoc))) {
                missing.push(this.humanizeDocType(reqDoc));
            }
        }
        const photoCount = documents.filter(d => d.type === 'photo').length;
        if (photoCount < this.REQUIRED_PHOTOS_MIN) {
            missing.push(`Additional photos (need ${this.REQUIRED_PHOTOS_MIN - photoCount} more)`);
        }
        return missing;
    }

    private async detectQualityIssues(documents: CategorizedDocument[]): Promise<QualityIssue[]> {
        const issues: QualityIssue[] = [];
        for (const doc of documents) {
            if (!doc.verified) {
                issues.push({ documentId: doc.id, issue: 'Document could not be verified', severity: 'warning', recommendation: 'Request re-upload with clear metadata' });
            }
            if (!doc.extractedData && doc.category === 'critical') {
                issues.push({ documentId: doc.id, issue: 'No data could be extracted from critical document', severity: 'error', recommendation: 'Manual review required for data extraction' });
            }
            if (doc.type === 'photo' && !doc.extractedData?.timestamp) {
                issues.push({ documentId: doc.id, issue: 'Photo missing timestamp metadata', severity: 'warning', recommendation: 'Verify photo was taken at time of loss' });
            }
            if (doc.type === 'estimate' && !doc.extractedData?.estimateAmount) {
                issues.push({ documentId: doc.id, issue: 'Estimate amount could not be extracted', severity: 'error', recommendation: 'Manual review required to determine estimate value' });
            }
        }
        return issues;
    }

    private calculateMetadata(documents: CategorizedDocument[]): { totalDocuments: number; totalPhotos: number; totalPages: number; storageSize: number } {
        return {
            totalDocuments: documents.length,
            totalPhotos: documents.filter(d => d.type === 'photo').length,
            totalPages: documents.reduce((sum, doc) => sum + (doc.extractedData?.pageCount || 1), 0),
            storageSize: documents.reduce((sum, doc) => sum + (doc.extractedData?.fileSize || 0), 0)
        };
    }

    private generateRecommendations(completeness: number, missing: string[], issues: QualityIssue[]): string[] {
        const recommendations: string[] = [];
        if (completeness < 70) recommendations.push(`Evidence package only ${completeness}% complete. Request missing documents immediately.`);
        if (missing.length > 0) recommendations.push(`Missing documents: ${missing.join(', ')}`);
        const criticalIssues = issues.filter(i => i.severity === 'error');
        if (criticalIssues.length > 0) recommendations.push(`${criticalIssues.length} critical quality issues detected. Manual review recommended.`);
        if (completeness >= 90 && issues.length === 0) recommendations.push('Evidence package is complete and high quality. Proceed with evaluation.');
        return recommendations;
    }

    private humanizeDocType(type: string): string {
        const map: Record<string, string> = {
            photo: 'Photos', estimate: 'Repair Estimate', police_report: 'Police Report', medical_bill: 'Medical Bill',
            telematics: 'Telematics Data', statement: 'Statement', repair_invoice: 'Repair Invoice', other: 'Other Document'
        };
        return map[type] || type;
    }
}

export default EvidenceCollector;

