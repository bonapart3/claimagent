// src/lib/agents/communications/index.ts
// Barrel file for communications agents

export { CustomerWriter } from './customerWriter';
export { InternalDocSpecialist } from './internalDocSpecialist';
export { HandbookHelper } from './handbookHelper';

// Stub export for compliance monitor
export const ComplianceMonitor = {
    checkCompliance: async (claim: any) => ({
        compliant: true,
        issues: [],
        recommendations: []
    })
};

