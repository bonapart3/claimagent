// src/lib/agents/intake/index.ts
// Barrel file for intake agents

export { DataParser } from './data_parser';
export { ValidationSpecialist } from './validationSpecialist';
export { DataValidator } from './dataValidator';
export { DocumentAnalyzer } from './documentAnalyzer';

// Stub exports for agents that may not be fully implemented
export const SeverityScorer = {
    calculateSeverity: async (claim: any, parsedData: any) => ({
        score: 50,
        complexityLevel: 'MEDIUM',
        factors: []
    })
};

export const AcknowledgmentWriter = {
    generateAcknowledgment: async (claim: any, parsedData: any, severityScore: any) => ({
        message: 'Your claim has been received.',
        claimNumber: claim.claimNumber || claim.id,
        nextSteps: ['We will review your claim within 24 hours.']
    })
};
