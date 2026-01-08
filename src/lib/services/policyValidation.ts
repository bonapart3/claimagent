// src/lib/services/policyValidation.ts
// Policy validation service

import { prisma } from '@/lib/utils/database';
import { Policy } from '@/lib/types/policy';

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
        return {
            id: policy.id,
            policyNumber: policy.policyNumber,
            namedInsured: policy.policyholderName,
            effectiveDate: policy.effectiveDate,
            expirationDate: policy.expirationDate,
            status: policy.status as Policy['status'],
            state: policy.state || 'UNKNOWN',
            vehicles: policy.vehicles?.map((v: any) => ({
                id: v.id,
                vin: v.vin,
                year: v.year,
                make: v.make,
                model: v.model,
                licensePlate: v.licensePlate,
                state: v.state || policy.state,
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

