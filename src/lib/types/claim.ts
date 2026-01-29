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
    PERSONAL_INJURY = 'PERSONAL_INJURY',
    PROPERTY_DAMAGE = 'PROPERTY_DAMAGE',
    BODILY_INJURY = 'BODILY_INJURY',
    PIP = 'PIP',
    THEFT = 'THEFT',
    VANDALISM = 'VANDALISM',
    GLASS = 'GLASS',
    WEATHER = 'WEATHER',
    FIRE = 'FIRE',
    ANIMAL = 'ANIMAL',
    HIT_AND_RUN = 'HIT_AND_RUN'
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
    policyNumber?: string;
    status: ClaimStatus | string;
    claimType: ClaimType | string;
    lossDate: Date;
    reportedDate: Date;
    lossDescription: string;
    lossLocation: string | Record<string, any>;
    estimatedAmount?: number;
    approvedAmount?: number;
    severity: SeverityLevel | string;
    complexity: number | string;
    fraudScore?: number;
    autoApprovalEligible: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Additional fields used by agents
    claimantName?: string;
    assignedAdjuster?: string;
    priority?: string;
    damages?: DamageItem[];
    documents?: DocumentData[];
    participants?: ParticipantData[];
    vehicle?: VehicleData;
    policy?: any;
    injuryDescription?: string;
    injuries?: InjuryData;
    // Coverage calculator fields
    vehicleUsage?: 'PERSONAL' | 'COMMERCIAL' | 'BUSINESS';
    driverUnlicensed?: boolean;
    driverIntoxicated?: boolean;
    rentalNeeded?: boolean;
    towingRequired?: boolean;
    isTotalLoss?: boolean;
    vehicleLoanBalance?: number;
    vehicleValue?: number;
    lossState?: string;
    // Settlement drafter fields
    lostWages?: {
        estimated: number;
        verified?: boolean;
    };
    liabilityPercentage?: number;
    disputed?: boolean;
    // Coverage analyzer fields
    driver?: {
        name?: string;
        licenseStatus?: string;
        licenseNumber?: string;
    };
    involvedInRacing?: boolean;
    duiInvolved?: boolean;
    businessUseAtTimeOfLoss?: boolean;
    rideshareActivity?: boolean;
    deliveryActivity?: boolean;
    suspectedIntentional?: boolean;
    policeReportNumber?: string;
    glassRepairOnly?: boolean;
    subrogationComplete?: boolean;
    subrogationRecovery?: number;
}

export interface DamageItem {
    id?: string;
    component: string;
    severity: string;
    estimatedCost?: number;
    area?: string;
    damageType?: string;
    repairType?: string;
    // Additional fields for vehicle inspector
    description?: string;
    laborHours?: number;
    partsCost?: number;
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
    // Additional fields used by agents
    mileage?: number;
    color?: string;
    trim?: string;
    isInsured?: boolean;
    role?: 'INSURED' | 'THIRD_PARTY' | 'CLAIMANT';
    ownerName?: string;
    condition?: string;
    insuranceInfo?: {
        company?: string;
        policyNumber?: string;
    };
    priorDamage?: string;
    hasADAS?: boolean;
    marketValue?: number;
}

// Type aliases for backward compatibility
export type Vehicle = VehicleData;

export interface ParticipantData {
    id?: string;
    name: string;
    role: 'INSURED' | 'THIRD_PARTY' | 'WITNESS' | 'OTHER_DRIVER' | 'INSURED_DRIVER' | 'PASSENGER' | 'POLICE';
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
    // Additional fields used by agents
    statement?: string;
    insuranceCompany?: string;
    licenseNumber?: string;
    licenseState?: string;
    injuries?: InjuryData;
    badgeNumber?: string;
    dateOfBirth?: string | Date;
    relationship?: string;
    department?: string;
    reportNumber?: string;
}

// Type alias for backward compatibility
export type Participant = ParticipantData;

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
    // Additional field used by agents
    type?: string;
}

// Type alias for backward compatibility
export type Document = DocumentData;

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

// Additional types for agent imports
export interface Location {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    latitude?: number;
    longitude?: number;
    description?: string;
    county?: string;
    locationType?: string;
    weatherConditions?: string;
    roadConditions?: string;
    lightingConditions?: string;
}

export interface ParsedClaimData {
    claimId?: string;
    claimNumber?: string;
    policyNumber?: string;
    policyholderId?: string;
    reportedDate?: Date | string;
    lossDate?: Date | string;
    lossTime?: string;
    lossLocation?: Location | string;
    lossDescription?: string;
    claimType?: ClaimType | string;
    vehicle?: VehicleData;
    vehicles?: VehicleData[];
    participants?: ParticipantData[];
    injuries?: InjuryData;
    documents?: DocumentData[];
    rawData?: Record<string, any>;
    confidence?: number;
    incident?: {
        type?: string;
        description?: string;
        date?: Date | string;
    };
}

export interface CoverageVerification {
    policyId: string;
    isValid: boolean;
    coverageType?: string;
    coverageTypes?: string[];
    limit?: number;
    limits?: Record<string, number>;
    deductible?: number;
    deductibles?: Record<string, number>;
    issues?: string[];
    hasApplicableCoverage?: boolean;
    applicableParts?: string[];
}

// Re-export ValidationResult type for claims (different from agent ValidationResult)
export interface ClaimValidationResult {
    isValid: boolean;
    valid?: boolean; // Alias for isValid for backward compatibility
    errors: string[];
    warnings: string[];
    missingFields?: string[];
    policyStatus?: string | null;
    coverage?: CoverageVerification | null;
}

// Type alias - use ClaimValidationResult in claim context
export type ValidationResult = ClaimValidationResult;

// Policy info for coverage analyzer
export interface PolicyInfo {
    id: string;
    policyNumber: string;
    effectiveDate: Date | string;
    expirationDate: Date | string;
    status: string;
    coverageType?: string;
    coverages?: Array<{
        type: string;
        status: string;
        limit?: number;
        deductible?: number;
        aggregateLimit?: number;
        vehicleVin?: string;
        namedDriverOnly?: boolean;
        namedDrivers?: string[];
        pendingEndorsement?: boolean;
    }>;
    excludedDrivers?: string[];
    duiExclusion?: boolean;
    rideshareEndorsement?: boolean;
    deliveryEndorsement?: boolean;
}

// Claim type alias (for legacy imports)
export type Claim = ClaimData;

// Damage assessment for vehicle inspector
export interface DamageAssessment {
    claimId: string;
    vehicleId?: string;
    totalDamage: number;
    damageItems: DamageItem[];
    isTotalLoss: boolean;
    salvageValue?: number;
    repairEstimate?: number;
    inspectionDate?: Date;
    inspectorId?: string;
    photos?: string[];
    notes?: string;
}

