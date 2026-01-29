// src/lib/services/policyValidation.ts
// Policy validation service

import { prisma } from '@/lib/utils/database';
import { Policy } from '@/lib/types/policy';
import { CoverageVerification } from '@/lib/types/claim';

export interface PolicyValidationResult {
    isValid: boolean;
    policyStatus: string;
    effectiveDate?: Date;
    expirationDate?: Date;
    issues: string[];
}

/**
 * Policy Validation Service class for agent usage
 */
export class PolicyValidationService {
    async validatePolicy(policyNumber: string, lossDate: Date): Promise<PolicyValidationResult> {
        const policy = await validatePolicyAPI(policyNumber);

        if (!policy) {
            return {
                isValid: false,
                policyStatus: 'NOT_FOUND',
                issues: ['Policy not found']
            };
        }

        const isActive = isPolicyActiveForDate(policy, lossDate);

        return {
            isValid: isActive,
            policyStatus: policy.status,
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
            issues: isActive ? [] : ['Policy not active for loss date']
        };
    }

    async verifyCoverage(policy: Policy, claimType: string, lossDate: Date): Promise<CoverageVerification> {
        const coverages = getAvailableCoverages(policy, claimType);
        const hasApplicable = coverages.length > 0;

        return {
            policyId: policy.id,
            isValid: hasApplicable,
            coverageType: claimType,
            coverageTypes: coverages.map(c => c.type),
            hasApplicableCoverage: hasApplicable,
            issues: hasApplicable ? [] : ['No applicable coverage found']
        };
    }

    async getPolicyByNumber(policyNumber: string): Promise<Policy | null> {
        return validatePolicyAPI(policyNumber);
    }

    async isVehicleOnPolicy(policy: Policy, vin: string): Promise<boolean> {
        return policy.vehicles.some(v => v.vin === vin);
    }

    async isDriverOnPolicy(policy: Policy, licenseNumber: string): Promise<boolean> {
        // Placeholder - would check driver list on policy
        return true;
    }

    async isDriverExcluded(policy: Policy, licenseNumber: string): Promise<boolean> {
        // Placeholder - would check excluded driver list
        return false;
    }

    async getRecentPolicyChanges(policyNumber: string, days: number = 30): Promise<any[]> {
        // Placeholder - would return recent policy changes
        return [];
    }
}

export const policyValidationService = new PolicyValidationService();

/**
 * Validate and retrieve policy by policy number
 */
export async function validatePolicyAPI(policyNumber: string): Promise<Policy | null> {
    try {
        const policy = await prisma.policy.findUnique({
            where: { policyNumber },
            include: {
                vehicles: true,
                coverages: true,
            },
        });

        if (!policy) {
            return null;
        }

        // Transform database model to Policy interface
        const policyAny = policy as any;
        return {
            id: policy.id,
            policyNumber: policy.policyNumber,
            namedInsured: policyAny.policyholderName || `${policyAny.holderFirstName} ${policyAny.holderLastName}` || 'Unknown',
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
            status: policy.status as Policy['status'],
            state: policyAny.state || 'UNKNOWN',
            vehicles: policy.vehicles?.map((v: any) => ({
                id: v.id,
                vin: v.vin,
                year: v.year,
                make: v.make,
                model: v.model,
                licensePlate: v.licensePlate,
                state: v.state || policyAny.state || 'UNKNOWN',
                garageZipCode: v.garageZipCode || '',
                usage: v.usage || 'personal',
            })) || [],
            coverages: (policy.coverages as any)?.map((c: any) => ({
                type: c.type,
                limit: c.limit,
                deductible: c.deductible,
                included: c.included !== false,
            })) || [],
            limits: {
                bodilyInjuryPerPerson: 100000,
                bodilyInjuryPerAccident: 300000,
                propertyDamage: 100000,
            },
            deductibles: {
                collision: 500,
                comprehensive: 250,
            },
            exclusions: [],
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
        };
    } catch (error) {
        console.error('Policy validation API error:', error);
        return null;
    }
}

/**
 * Check if policy is active for a given date
 */
export function isPolicyActiveForDate(policy: Policy, date: Date): boolean {
    const checkDate = new Date(date);
    const effectiveDate = new Date(policy.effectiveDate);
    const expirationDate = new Date(policy.expirationDate);

    return (
        policy.status === 'active' &&
        checkDate >= effectiveDate &&
        checkDate <= expirationDate
    );
}

/**
 * Get available coverages for claim type
 */
export function getAvailableCoverages(
    policy: Policy,
    claimType: string
): Policy['coverages'] {
    // Filter coverages based on claim type
    const relevantCoverages: Record<string, string[]> = {
        COLLISION: ['collision', 'liability'],
        COMPREHENSIVE: ['comprehensive'],
        LIABILITY: ['liability'],
        UNINSURED_MOTORIST: ['um_uim', 'liability'],
        MEDICAL_PAYMENTS: ['medical_payments', 'pip'],
        PERSONAL_INJURY: ['pip', 'medical_payments', 'liability'],
    };

    const relevantTypes = relevantCoverages[claimType] || [];

    return policy.coverages.filter(c =>
        relevantTypes.includes(c.type) && c.included
    );
}

