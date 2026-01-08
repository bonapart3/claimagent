// src/lib/types/policy.ts
// Policy type definitions

export interface Policy {
    exclusions: any;
    id: string;
    policyNumber: string;
    namedInsured: string;
    effectiveDate: Date;
    expirationDate: Date;
    status: 'active' | 'in_force' | 'cancelled' | 'expired' | 'pending';
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
}

export type CoverageType =
    | 'liability'
    | 'collision'
    | 'comprehensive'
    | 'um_uim'
    | 'medical_payments'
    | 'pip'
    | 'rental'
    | 'towing';

export interface PolicyLimits {
    bodilyInjuryPerPerson: number;
    bodilyInjuryPerAccident: number;
    propertyDamage: number;
    uninsuredMotorist?: number;
    underinsuredMotorist?: number;
    medicalPayments?: number;
    pip?: number;
}

export interface PolicyDeductibles {
    collision?: number;
    comprehensive?: number;
}

