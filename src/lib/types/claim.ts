// src/lib/types/claim.ts
// Core claim type definitions and interfaces

export enum ClaimStatus {
    SUBMITTED = 'SUBMITTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
    INVESTIGATING = 'INVESTIGATING',
    NEEDS_INFO = 'NEEDS_INFO',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PAYMENT_PENDING = 'PAYMENT_PENDING',
    PAID = 'PAID',
    CLOSED = 'CLOSED',
    FLAGGED_FRAUD = 'FLAGGED_FRAUD',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    CANCELLED = 'CANCELLED'
}

export enum ClaimType {
    COLLISION = 'COLLISION',
    COMPREHENSIVE = 'COMPREHENSIVE',
    LIABILITY = 'LIABILITY',
    UNINSURED_MOTORIST = 'UNINSURED_MOTORIST',
    MEDICAL_PAYMENTS = 'MEDICAL_PAYMENTS',
    PERSONAL_INJURY = 'PERSONAL_INJURY'
}

export enum SeverityLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface ClaimData {
    [x: string]: any;
    id: string;
    claimNumber: string;
    policyId: string;
    status: ClaimStatus;
    claimType: ClaimType;
    lossDate: Date;
    reportedDate: Date;
    lossDescription: string;
    lossLocation: string;
    estimatedAmount?: number;
    severity: SeverityLevel;
    complexity: number;
    fraudScore?: number;
    autoApprovalEligible: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface VehicleData {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    licensePlate?: string;
    state: string;
    estimatedValue?: number;
    damageDescription?: string;
    damageAreas?: string[];
    totalLoss: boolean;
}

export interface ParticipantData {
    name: string;
    role: 'INSURED' | 'THIRD_PARTY' | 'WITNESS';
    contactInfo: {
        phone?: string;
        email?: string;
        address?: string;
    };
    vehicleInfo?: {
        vin?: string;
        licensePlate?: string;
        insurance?: string;
    };
}

export interface InjuryData {
    injured: boolean;
    description?: string;
    severity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'FATAL';
    medicalTreatment?: boolean;
    hospitalName?: string;
    estimatedMedicalCosts?: number;
}

export interface DocumentData {
    id: string;
    claimId: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType: string;
    description?: string;
    ocrProcessed: boolean;
    extractedData?: Record<string, any>;
    uploadedBy: string;
    uploadedAt: Date;
}

export interface FraudAssessmentData {
    id: string;
    claimId: string;
    fraudScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    indicators: string;
    patternScore?: number;
    medicalScore?: number;
    assessedAt: Date;
    assessedBy: string;
}

export interface ValuationData {
    id: string;
    claimId: string;
    actualCashValue?: number;
    salvageValue?: number;
    repairEstimate?: number;
    totalLossThreshold?: number;
    isTotalLoss: boolean;
    valuationMethod: string;
    valuationDate: Date;
    valuationSource: string;
}

export interface ClaimDecision {
    decision: 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'DRAFT_HOLD' | 'SIU_REVIEW';
    reason: string;
    confidence: number;
    estimatedValue?: number;
    requiredActions?: string[];
    escalationTriggers?: string[];
}

export interface ClaimSubmissionInput {
    policyNumber: string;
    lossDate: string;
    lossTime?: string;
    lossLocation: string;
    lossDescription: string;
    claimType: ClaimType;
    vehicleVin: string;
    damageDescription?: string;
    policeReportNumber?: string;
    injuries?: InjuryData;
    participants?: ParticipantData[];
    photos?: File[];
}

export interface ClaimProcessingResult {
    claimId: string;
    claimNumber: string;
    status: ClaimStatus;
    decision: ClaimDecision;
    fraudAssessment?: FraudAssessmentData;
    valuation?: ValuationData;
    nextSteps: string[];
    estimatedResolutionTime?: string;
}

