// src/lib/agents/intake/documentAnalyzer.ts
// Agent A1: Document Analyzer - Analyzes uploaded claim documents

import { ClaimData, Document as ClaimDocument } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';

interface DocumentAnalysis {
    documentId: string;
    documentType: string;
    confidence: number;
    extractedData: Record<string, unknown>;
    validationStatus: 'VALID' | 'INVALID' | 'NEEDS_REVIEW';
    issues: string[];
    recommendations: string[];
}

interface ImageAnalysis {
    damageDetected: boolean;
    damageLocations: string[];
    severityEstimate: string;
    vehicleIdentified: boolean;
    vehicleDetails?: {
        make?: string;
        model?: string;
        color?: string;
        licensePlate?: string;
    };
    qualityScore: number;
    manipulationIndicators: string[];
}

export class DocumentAnalyzer {
    private readonly agentId = AgentRole.DOCUMENT_ANALYZER;

    async analyze(document: ClaimDocument, claimData: ClaimData): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];

        try {
            let analysis: DocumentAnalysis;

            // Route to appropriate analyzer based on document type
            switch (document.type) {
                case 'PHOTO':
                case 'DAMAGE_PHOTO':
                    analysis = await this.analyzePhoto(document, claimData);
                    break;
                case 'POLICE_REPORT':
                    analysis = await this.analyzePoliceReport(document, claimData);
                    break;
                case 'ESTIMATE':
                case 'REPAIR_ESTIMATE':
                    analysis = await this.analyzeRepairEstimate(document, claimData);
                    break;
                case 'MEDICAL_BILL':
                case 'MEDICAL_RECORD':
                    analysis = await this.analyzeMedicalDocument(document, claimData);
                    break;
                case 'REGISTRATION':
                case 'TITLE':
                    analysis = await this.analyzeVehicleDocument(document, claimData);
                    break;
                case 'DRIVERS_LICENSE':
                    analysis = await this.analyzeDriversLicense(document, claimData);
                    break;
                default:
                    analysis = await this.analyzeGenericDocument(document, claimData);
            }

            // Check for escalation triggers
            if (analysis.validationStatus === 'INVALID') {
                escalations.push({
                    type: 'DOCUMENT_ISSUE',
                    reason: `Document validation failed: ${analysis.issues.join(', ')}`,
                    severity: 'MEDIUM',
                });
            }

            if (analysis.issues.some(i => i.toLowerCase().includes('manipulation'))) {
                escalations.push({
                    type: 'POTENTIAL_FRAUD',
                    reason: 'Document manipulation indicators detected',
                    severity: 'HIGH',
                });
            }

            await auditLog({
                claimId: claimData.id,
                action: 'DOCUMENT_ANALYZED',
                agentId: this.agentId,
                description: `Analyzed ${document.type}: ${analysis.validationStatus}`,
                details: { documentId: document.id, analysis },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: analysis,
                confidence: analysis.confidence,
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: analysis.recommendations,
            };
        } catch (error) {
            console.error('Document analysis error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Document analysis failed',
                processingTime: Date.now() - startTime,
                escalations: [{
                    type: 'SYSTEM_ERROR',
                    reason: 'Document analysis system failure',
                    severity: 'MEDIUM',
                }],
            };
        }
    }

    private async analyzePhoto(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        // Simulate AI image analysis
        const imageAnalysis: ImageAnalysis = await this.performImageAnalysis(document);

        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check image quality
        if (imageAnalysis.qualityScore < 0.5) {
            issues.push('Image quality is poor - may affect damage assessment');
            recommendations.push('Request higher quality photos');
        }

        // Check for manipulation
        if (imageAnalysis.manipulationIndicators.length > 0) {
            issues.push(`Potential manipulation detected: ${imageAnalysis.manipulationIndicators.join(', ')}`);
            recommendations.push('Flag for SIU review');
        }

        // Validate against claim data
        if (imageAnalysis.vehicleIdentified && claimData.vehicle) {
            if (imageAnalysis.vehicleDetails?.color &&
                imageAnalysis.vehicleDetails.color.toLowerCase() !== claimData.vehicle.color?.toLowerCase()) {
                issues.push('Vehicle color in photo may not match policy records');
            }
        }

        return {
            documentId: document.id,
            documentType: document.type || 'UNKNOWN',
            confidence: imageAnalysis.qualityScore,
            extractedData: {
                damageDetected: imageAnalysis.damageDetected,
                damageLocations: imageAnalysis.damageLocations,
                severityEstimate: imageAnalysis.severityEstimate,
                vehicleDetails: imageAnalysis.vehicleDetails,
            },
            validationStatus: issues.some(i => i.includes('manipulation'))
                ? 'NEEDS_REVIEW'
                : issues.length > 0 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async performImageAnalysis(document: ClaimDocument): Promise<ImageAnalysis> {
        // In production, this would call computer vision APIs
        // Simulating analysis for demonstration
        return {
            damageDetected: true,
            damageLocations: ['Front bumper', 'Hood', 'Right headlight'],
            severityEstimate: 'MODERATE',
            vehicleIdentified: true,
            vehicleDetails: {
                color: 'Silver',
            },
            qualityScore: 0.85,
            manipulationIndicators: [],
        };
    }

    private async analyzePoliceReport(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        // Simulate OCR and extraction
        const extractedData = await this.extractPoliceReportData(document);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Validate report number
        if (!extractedData.reportNumber) {
            issues.push('Could not extract police report number');
        }

        // Cross-reference with claim data
        if (extractedData.incidentDate) {
            const reportDate = new Date(extractedData.incidentDate as string);
            const claimDate = new Date(claimData.lossDate);
            const daysDiff = Math.abs((reportDate.getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff > 1) {
                issues.push('Police report date differs from claimed loss date');
                recommendations.push('Verify correct loss date with claimant');
            }
        }

        // Check for liability determination
        if (extractedData.faultDetermination) {
            recommendations.push(`Police report indicates fault: ${extractedData.faultDetermination}`);
        }

        return {
            documentId: document.id,
            documentType: 'POLICE_REPORT',
            confidence: 0.85,
            extractedData,
            validationStatus: issues.length > 1 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async extractPoliceReportData(document: ClaimDocument): Promise<Record<string, unknown>> {
        // In production, this would use OCR and NLP
        return {
            reportNumber: 'PR-2024-123456',
            incidentDate: new Date().toISOString(),
            location: '123 Main Street',
            officerName: 'Officer Smith',
            faultDetermination: 'Other party at fault',
            citationIssued: true,
            citationDetails: 'Failure to yield',
        };
    }

    private async analyzeRepairEstimate(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        const extractedData = await this.extractEstimateData(document);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Validate estimate components
        const lineItems = extractedData.lineItems as Array<{ description: string; amount: number }> || [];
        const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);

        if (Math.abs(totalAmount - (extractedData.totalAmount as number || 0)) > 1) {
            issues.push('Line items do not sum to stated total');
        }

        // Check for reasonable amounts
        const avgPerItem = totalAmount / lineItems.length;
        if (avgPerItem > 5000) {
            recommendations.push('Higher than average repair costs - verify with second estimate');
        }

        // Check shop credentials
        if (!extractedData.shopLicense) {
            issues.push('Shop license number not provided');
            recommendations.push('Verify shop is licensed and approved');
        }

        return {
            documentId: document.id,
            documentType: 'REPAIR_ESTIMATE',
            confidence: 0.80,
            extractedData,
            validationStatus: issues.length > 0 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async extractEstimateData(document: ClaimDocument): Promise<Record<string, unknown>> {
        return {
            shopName: 'ABC Auto Body',
            shopLicense: 'LIC-12345',
            estimateDate: new Date().toISOString(),
            vehicleInfo: {
                vin: '1HGBH41JXMN109186',
                year: 2021,
                make: 'Honda',
                model: 'Accord',
            },
            lineItems: [
                { description: 'Front bumper replacement', amount: 850 },
                { description: 'Hood repair', amount: 1200 },
                { description: 'Headlight assembly', amount: 650 },
                { description: 'Paint and refinish', amount: 1400 },
                { description: 'Labor', amount: 900 },
            ],
            totalAmount: 5000,
            laborHours: 12,
        };
    }

    private async analyzeMedicalDocument(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        const extractedData = await this.extractMedicalData(document);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Validate treatment dates
        if (extractedData.treatmentDate) {
            const treatmentDate = new Date(extractedData.treatmentDate as string);
            const lossDate = new Date(claimData.lossDate);

            if (treatmentDate < lossDate) {
                issues.push('Treatment date is before loss date');
            }
        }

        // Check for pre-existing conditions
        if (extractedData.preExistingConditions) {
            recommendations.push('Pre-existing conditions noted - review for relatedness');
        }

        // Validate provider information
        if (!extractedData.providerNPI) {
            issues.push('Provider NPI number not found');
            recommendations.push('Verify provider credentials');
        }

        return {
            documentId: document.id,
            documentType: document.type || 'UNKNOWN',
            confidence: 0.75,
            extractedData,
            validationStatus: issues.length > 0 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async extractMedicalData(document: ClaimDocument): Promise<Record<string, unknown>> {
        return {
            providerName: 'City Medical Center',
            providerNPI: '1234567890',
            treatmentDate: new Date().toISOString(),
            diagnosis: ['Cervical strain', 'Contusion'],
            treatment: ['Physical therapy', 'Pain management'],
            totalCharges: 3500,
            preExistingConditions: null,
        };
    }

    private async analyzeVehicleDocument(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        const extractedData = await this.extractVehicleDocData(document);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Cross-reference VIN
        if (extractedData.vin && claimData.vehicle?.vin) {
            if (extractedData.vin !== claimData.vehicle.vin) {
                issues.push('VIN on document does not match claim vehicle VIN');
            }
        }

        // Validate ownership
        if (extractedData.ownerName && claimData.claimantName) {
            if (!this.namesMatch(extractedData.ownerName as string, claimData.claimantName)) {
                issues.push('Vehicle owner name does not match claimant');
                recommendations.push('Verify claimant is authorized to file claim');
            }
        }

        return {
            documentId: document.id,
            documentType: document.type || 'UNKNOWN',
            confidence: 0.90,
            extractedData,
            validationStatus: issues.length > 0 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async extractVehicleDocData(document: ClaimDocument): Promise<Record<string, unknown>> {
        return {
            vin: '1HGBH41JXMN109186',
            ownerName: 'John Smith',
            registrationState: 'CA',
            expirationDate: '2025-06-30',
            plateNumber: 'ABC1234',
        };
    }

    private async analyzeDriversLicense(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        const extractedData = await this.extractLicenseData(document);
        const issues: string[] = [];
        const recommendations: string[] = [];

        // Check expiration
        if (extractedData.expirationDate) {
            const expDate = new Date(extractedData.expirationDate as string);
            const lossDate = new Date(claimData.lossDate);

            if (expDate < lossDate) {
                issues.push('License was expired at time of loss');
                recommendations.push('Review policy for unlicensed driver exclusion');
            }
        }

        // Verify age
        if (extractedData.dateOfBirth) {
            const dob = new Date(extractedData.dateOfBirth as string);
            const loss = new Date(claimData.lossDate);
            const age = (loss.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

            if (age < 16) {
                issues.push('Driver appears to be under legal driving age');
            }
        }

        return {
            documentId: document.id,
            documentType: 'DRIVERS_LICENSE',
            confidence: 0.88,
            extractedData,
            validationStatus: issues.length > 0 ? 'NEEDS_REVIEW' : 'VALID',
            issues,
            recommendations,
        };
    }

    private async extractLicenseData(document: ClaimDocument): Promise<Record<string, unknown>> {
        return {
            licenseNumber: 'DL123456789',
            name: 'John Smith',
            dateOfBirth: '1985-03-15',
            expirationDate: '2026-03-15',
            state: 'CA',
            class: 'C',
            restrictions: [],
        };
    }

    private async analyzeGenericDocument(
        document: ClaimDocument,
        claimData: ClaimData
    ): Promise<DocumentAnalysis> {
        return {
            documentId: document.id,
            documentType: document.type || 'UNKNOWN',
            confidence: 0.60,
            extractedData: {
                fileName: document.fileName,
                fileSize: document.fileSize,
                uploadDate: document.uploadedAt,
            },
            validationStatus: 'NEEDS_REVIEW',
            issues: ['Document type requires manual review'],
            recommendations: ['Adjuster should review document manually'],
        };
    }

    private namesMatch(name1: string, name2: string): boolean {
        const normalize = (n: string) => n.toLowerCase().replace(/[^a-z]/g, '');
        return normalize(name1) === normalize(name2);
    }
}

export const documentAnalyzer = new DocumentAnalyzer();

