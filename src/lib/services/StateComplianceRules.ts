// STATE COMPLIANCE RULES
export interface StateComplianceRule {
    state: string;
    stateCode: string;
    fairClaimsRegulation?: string | null;
    badFaithStatute?: boolean;
    thirdPartyBadFaith?: boolean;
    comparativeNegligence?: 'pure' | 'modified-51' | string;
    pip_nofault?: boolean;
    pipLimit?: number | null;
    umUimRequired?: boolean;
    medPayRequired?: boolean;
    propertyDamageThreshold?: number | null;
}

export interface StateDiminishedValue {
    state: string;
    stateCode: string;
    firstPartyAllowed: boolean;
    thirdPartyAllowed: boolean;
    inherentDVOnly: boolean;
    statutoryBasis?: string | null;
    caselaw?: string | null;
}

export interface StateTotalLossRule {
    state: string;
    stateCode: string;
    thresholdType: 'percentage' | 'formula' | 'hybrid';
    thresholdPercentage?: number | null;
    salvageValueIncluded?: boolean;
}

export interface StateTimeLimit {
    state: string;
    stateCode: string;
    statuteOfLimitationsYears?: number | null;
    notes?: string | null;
}

export const STATE_COMPLIANCE_RULES: StateComplianceRule[] = [
    {
        state: 'California',
        stateCode: 'CA',
        fairClaimsRegulation: 'CA Code Regs Title 10 § 2695',
        badFaithStatute: true,
        thirdPartyBadFaith: false,
        comparativeNegligence: 'pure',
        pip_nofault: false,
        pipLimit: null,
        umUimRequired: true,
        medPayRequired: false,
        propertyDamageThreshold: null
    },
    {
        state: 'Florida',
        stateCode: 'FL',
        fairClaimsRegulation: 'FL Stat § 626.9541',
        badFaithStatute: true,
        thirdPartyBadFaith: true,
        comparativeNegligence: 'pure',
        pip_nofault: true,
        pipLimit: 10000,
        umUimRequired: true,
        medPayRequired: false,
        propertyDamageThreshold: null
    },
    {
        state: 'Michigan',
        stateCode: 'MI',
        fairClaimsRegulation: 'MI Comp Laws § 500.2006',
        badFaithStatute: true,
        thirdPartyBadFaith: false,
        comparativeNegligence: 'modified-51',
        pip_nofault: true,
        pipLimit: 250000,
        umUimRequired: true,
        medPayRequired: false,
        propertyDamageThreshold: null
    },
    {
        state: 'New York',
        stateCode: 'NY',
        fairClaimsRegulation: 'NY Ins Law § 2601',
        badFaithStatute: false,
        thirdPartyBadFaith: false,
        comparativeNegligence: 'pure',
        pip_nofault: true,
        pipLimit: 50000,
        umUimRequired: true,
        medPayRequired: false,
        propertyDamageThreshold: null
    },
    {
        state: 'Texas',
        stateCode: 'TX',
        fairClaimsRegulation: 'TX Ins Code § 542',
        badFaithStatute: true,
        thirdPartyBadFaith: true,
        comparativeNegligence: 'modified-51',
        pip_nofault: false,
        pipLimit: null,
        umUimRequired: true,
        medPayRequired: false,
        propertyDamageThreshold: null
    }
];

// DIMINISHED VALUE RULES BY STATE
export const STATE_DIMINISHED_VALUE: StateDiminishedValue[] = [
    {
        state: 'Georgia',
        stateCode: 'GA',
        firstPartyAllowed: true,
        thirdPartyAllowed: true,
        inherentDVOnly: true,
        statutoryBasis: 'Mabry v. State Farm, 274 Ga. 498 (2001)',
        caselaw: 'GA Supreme Court established first-party inherent DV'
    },
    {
        state: 'Kansas',
        stateCode: 'KS',
        firstPartyAllowed: true,
        thirdPartyAllowed: true,
        inherentDVOnly: true,
        statutoryBasis: null,
        caselaw: 'Spiegel v. Wilder, 2007 KS Supreme Court'
    },
    {
        state: 'California',
        stateCode: 'CA',
        firstPartyAllowed: false,
        thirdPartyAllowed: true,
        inherentDVOnly: true,
        statutoryBasis: null,
        caselaw: 'First-party DV not recognized; third-party under tort law'
    },
    {
        state: 'Florida',
        stateCode: 'FL',
        firstPartyAllowed: false,
        thirdPartyAllowed: true,
        inherentDVOnly: true,
        statutoryBasis: null,
        caselaw: 'Third-party only; not covered under standard auto policy'
    }
];

// HELPER FUNCTIONS

export const STATE_TOTAL_LOSS_RULES: StateTotalLossRule[] = [
    // Populate with state total-loss rules as needed, e.g.:
    // { state: 'California', stateCode: 'CA', thresholdType: 'percentage', thresholdPercentage: 75, salvageValueIncluded: false }
];

export const STATE_TIME_LIMITS: StateTimeLimit[] = [
    // Populate with state time limits as needed, e.g.:
    // { state: 'California', stateCode: 'CA', statuteOfLimitationsYears: 2 }
];

export function getTotalLossThreshold(stateCode: string): StateTotalLossRule | undefined {
    return STATE_TOTAL_LOSS_RULES.find(rule => rule.stateCode === stateCode);
}

export function getStateTimeLimit(stateCode: string): StateTimeLimit | undefined {
    return STATE_TIME_LIMITS.find(limit => limit.stateCode === stateCode);
}

export function getStateComplianceRule(stateCode: string): StateComplianceRule | undefined {
    return STATE_COMPLIANCE_RULES.find(rule => rule.stateCode === stateCode);
}

export function getDiminishedValueRule(stateCode: string): StateDiminishedValue | undefined {
    return STATE_DIMINISHED_VALUE.find(rule => rule.stateCode === stateCode);
}

export function isTotalLoss(repairCost: number, acv: number, salvageValue: number, stateCode: string): boolean {
    const rule = getTotalLossThreshold(stateCode);
    if (!rule) return false;

    switch (rule.thresholdType) {
        case 'percentage':
            if (rule.thresholdPercentage === null || rule.thresholdPercentage === undefined) return false;
            return repairCost >= (acv * rule.thresholdPercentage / 100);

        case 'formula':
            return rule.salvageValueIncluded
                ? (repairCost + salvageValue) >= acv
                : repairCost >= acv;

        case 'hybrid':
            const percentageCheck = rule.thresholdPercentage
                ? repairCost >= (acv * rule.thresholdPercentage / 100)
                : false;
            const formulaCheck = (repairCost + salvageValue) >= acv;
            return percentageCheck || formulaCheck;

        default:
            return false;
    }
}

export const ALL_STATE_CODES = STATE_TOTAL_LOSS_RULES.map(rule => rule.stateCode);