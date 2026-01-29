import { isPolicyActiveForDate } from '@/lib/services/policyValidation';
import type { Policy } from '@/lib/types/policy';

describe('policyValidation.isPolicyActiveForDate', () => {
    const basePolicy: Policy = {
        id: 'P1',
        policyNumber: 'AUTO-123',
        namedInsured: 'John Doe',
        effectiveDate: new Date('2025-01-01') as any,
        expirationDate: new Date('2025-12-31') as any,
        status: 'active' as any,
        state: 'CA',
        vehicles: [],
        coverages: [],
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
        createdAt: new Date('2025-01-01') as any,
        updatedAt: new Date('2025-01-01') as any,
    };

    it('returns true when date within coverage period and status active', () => {
        const result = isPolicyActiveForDate(basePolicy, new Date('2025-06-01'));
        expect(result).toBe(true);
    });

    it('returns false when date outside coverage period', () => {
        const result = isPolicyActiveForDate(basePolicy, new Date('2026-01-01'));
        expect(result).toBe(false);
    });

    it('returns false when policy is not active', () => {
        const inactive: Policy = { ...basePolicy, status: 'expired' as any };
        const result = isPolicyActiveForDate(inactive, new Date('2025-06-01'));
        expect(result).toBe(false);
    });
});