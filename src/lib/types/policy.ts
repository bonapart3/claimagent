// src/lib/types/policy.ts
// Policy type definitions

export interface Policy {
    exclusions: any;
    id: string;
    policyNumber: string;
    namedInsured: string;
    effectiveDate: Date;
    expirationDate: Date;
    status: 'active' | 'in_force' | 'cancelled' | 'expired' | 'pending' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'LAPSED' | 'EXPIRED';
    state: string;
    cancellationDate?: Date;
    nonPaymentFlag?: boolean;
    vehicles: PolicyVehicle[];
    coverages: PolicyCoverage[];
    limits: PolicyLimits;
    deductibles: PolicyDeductibles;
    createdAt: Date;
    updatedAt: Date;
}

export interface PolicyVehicle {
    id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    licensePlate?: string;
    state: string;
    garageZipCode: string;
    usage: 'personal' | 'business' | 'commute';
    annualMileage?: number;
}

export interface PolicyCoverage {
    type: CoverageType;
    limit: number;
    deductible?: number;
    included: boolean;
    usedAmount?: number;
    personalOnly?: boolean;
}

export type CoverageType =
    | 'liability'
    | 'collision'
    | 'comprehensive'
    | 'um_uim'
    | 'medical_payments'
    | 'pip'
    | 'rental'
    | 'towing'
    // Uppercase variants for compatibility
    | 'LIABILITY'
    | 'COLLISION'
    | 'COMPREHENSIVE'
    | 'PROPERTY_DAMAGE'
    | 'BODILY_INJURY'
    | 'UNINSURED_MOTORIST'
    | 'UNDERINSURED_MOTORIST'
    | 'MEDICAL_PAYMENTS'
    | 'PIP'
    // Additional coverage types used by agents
    | 'GLASS'
    | 'RENTAL_REIMBURSEMENT'
    | 'ROADSIDE_ASSISTANCE'
    | 'GAP'
    | 'NONE';

export interface PolicyLimits {
    bodilyInjuryPerPerson: number;
    bodilyInjuryPerAccident: number;
    propertyDamage: number;
    uninsuredMotorist?: number;
    underinsuredMotorist?: number;
    medicalPayments?: number;
    pip?: number;
    // Additional fields for coverage calculator
    perOccurrence?: number;
    aggregate?: number;
    usedAggregate?: number;
}

export interface PolicyDeductibles {
    collision?: number;
    comprehensive?: number;
}

// Alias for backward compatibility with agent imports
export type Coverage = PolicyCoverage;

