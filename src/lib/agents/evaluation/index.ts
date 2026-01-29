// src/lib/agents/evaluation/index.ts
// Barrel file for evaluation agents

export { CoverageCalculator } from './coverageCalculator';
export { ReserveAnalyst } from './reserveAnalyst';
export { SettlementDrafter } from './settlementDrafter';

// Stub export for valuation specialist
export const ValuationSpecialist = {
    performValuation: async (claim: any) => ({
        acv: 0,
        repairCost: 0,
        isTotalLoss: false,
        methodology: 'STANDARD',
        confidence: 0.8
    })
};

