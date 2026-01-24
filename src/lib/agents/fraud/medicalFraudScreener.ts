// src/lib/agents/fraud/medicalFraudScreener.ts
// Agent C2: Medical Fraud Screening

import { FRAUD_THRESHOLD } from '@/lib/constants/thresholds';

// Known high-risk CPT code patterns (commonly upcoded)
const UPCODING_RISK_CODES: Record<string, { expected: string; highRiskIf: string }> = {
    '99215': { expected: '99214', highRiskIf: 'routine visit' }, // Office visit - highest level
    '99223': { expected: '99222', highRiskIf: 'straightforward admission' }, // Hospital admit - highest level
    '99285': { expected: '99284', highRiskIf: 'non-emergent' }, // ER visit - highest level
    '97140': { expected: '97110', highRiskIf: 'basic therapy' }, // Manual therapy vs therapeutic exercise
};

// CPT codes that should typically be bundled together
const UNBUNDLING_PATTERNS: Array<{ codes: string[]; bundledCode: string; description: string }> = [
    { codes: ['97110', '97140', '97530'], bundledCode: '97542', description: 'PT evaluation components billed separately' },
    { codes: ['99213', '36415', '85025'], bundledCode: '99214', description: 'Lab draw billed separately from visit' },
    { codes: ['29881', '29880'], bundledCode: '29881', description: 'Knee arthroscopy components billed separately' },
];

// Known problematic provider patterns (would be loaded from database in production)
const WATCHLIST_PROVIDER_PATTERNS = [
    'pain management',
    'injury center',
    'accident clinic',
    'lien-based',
];

export interface MedicalScreeningResult {
    score: number;
    indicators: string[];
    recommendedAction: string;
}

export interface BillingAnomaly {
    type: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    amount?: number;
}

export class MedicalFraudScreener {
    /**
     * Analyze claim for medical fraud indicators
     */
    async analyze(claim: any): Promise<number> {
        let score = 0;
        const anomalies: BillingAnomaly[] = [];

        // Check for injury/damage mismatch
        const mismatchScore = this.checkInjuryDamageMismatch(claim);
        score += mismatchScore;

        // Check for suspicious medical providers
        const providerScore = await this.checkMedicalProviders(claim);
        score += providerScore;

        // Check for billing anomalies
        const billingScore = await this.checkBillingAnomalies(claim);
        score += billingScore;

        // Check for suspicious treatment patterns
        const treatmentScore = this.checkTreatmentPatterns(claim);
        score += treatmentScore;

        return Math.min(score, 100);
    }

    /**
     * Check for mismatch between claimed injuries and vehicle damage
     */
    private checkInjuryDamageMismatch(claim: any): number {
        let score = 0;

        if (!claim.injuryDescription || !claim.vehicle?.damageDescription) {
            return 0;
        }

        const injurySeverity = this.estimateInjurySeverity(claim.injuryDescription);
        const damageSeverity = this.estimateDamageSeverity(claim.vehicle.damageDescription);

        // Severe injury claimed with minor vehicle damage
        if (injurySeverity === 'SEVERE' && damageSeverity === 'MINOR') {
            score += 30;
        } else if (injurySeverity === 'MODERATE' && damageSeverity === 'MINOR') {
            score += 15;
        }

        return score;
    }

    /**
     * Check medical providers against watchlists and suspicious patterns
     */
    private async checkMedicalProviders(claim: any): Promise<number> {
        let score = 0;

        // Check providers from medical bills
        const providers: string[] = [];
        if (claim.medicalBills) {
            for (const bill of claim.medicalBills) {
                if (bill.providerName) providers.push(bill.providerName.toLowerCase());
                if (bill.facilityName) providers.push(bill.facilityName.toLowerCase());
            }
        }

        // Check treatment providers
        if (claim.treatmentProviders) {
            for (const provider of claim.treatmentProviders) {
                if (provider.name) providers.push(provider.name.toLowerCase());
            }
        }

        // Check against watchlist patterns
        for (const provider of providers) {
            for (const pattern of WATCHLIST_PROVIDER_PATTERNS) {
                if (provider.includes(pattern)) {
                    score += 15;
                    break; // Only count once per provider
                }
            }
        }

        // Check for multiple providers in short timeframe (doctor shopping)
        const uniqueProviders = new Set(providers);
        if (uniqueProviders.size > 5) {
            score += 20; // Many different providers
        } else if (uniqueProviders.size > 3) {
            score += 10;
        }

        // Check for out-of-state providers
        if (claim.policy?.holderAddress?.state && claim.medicalBills) {
            const homeState = claim.policy.holderAddress.state.toLowerCase();
            const outOfStateProviders = claim.medicalBills.filter(
                (bill: any) => bill.providerState && bill.providerState.toLowerCase() !== homeState
            );
            if (outOfStateProviders.length > 0) {
                score += 10;
            }
        }

        return Math.min(score, 45); // Cap this check's contribution
    }

    /**
     * Check for medical billing anomalies
     */
    private async checkBillingAnomalies(claim: any): Promise<number> {
        let score = 0;

        if (!claim.medicalBills || claim.medicalBills.length === 0) {
            return 0;
        }

        for (const bill of claim.medicalBills) {
            // Check for upcoding patterns
            if (this.detectUpcoding(bill)) {
                score += 20;
            }

            // Check for unbundling
            if (this.detectUnbundling(bill)) {
                score += 15;
            }

            // Check for duplicate billing
            if (this.detectDuplicates(bill, claim.medicalBills)) {
                score += 25;
            }
        }

        return Math.min(score, 60);
    }

    /**
     * Check for suspicious treatment patterns
     */
    private checkTreatmentPatterns(claim: any): number {
        let score = 0;

        // Check for extended chiropractic treatment
        if (claim.treatmentDays && claim.treatmentDays > 90) {
            score += 15;
        }

        // Check for excessive physical therapy
        if (claim.physicalTherapySessions && claim.physicalTherapySessions > 50) {
            score += 10;
        }

        return score;
    }

    /**
     * Estimate injury severity from description
     */
    private estimateInjurySeverity(description: string): 'MINOR' | 'MODERATE' | 'SEVERE' {
        const lower = description.toLowerCase();

        const severeKeywords = ['surgery', 'fracture', 'broken', 'hospitalized', 'icu', 'coma'];
        const moderateKeywords = ['whiplash', 'sprain', 'strain', 'contusion', 'laceration'];

        if (severeKeywords.some(k => lower.includes(k))) return 'SEVERE';
        if (moderateKeywords.some(k => lower.includes(k))) return 'MODERATE';
        return 'MINOR';
    }

    /**
     * Estimate damage severity from description
     */
    private estimateDamageSeverity(description: string): 'MINOR' | 'MODERATE' | 'SEVERE' {
        const lower = description.toLowerCase();

        const severeKeywords = ['total loss', 'totaled', 'destroyed', 'fire', 'rolled over'];
        const moderateKeywords = ['frame damage', 'airbag deployed', 'significant', 'major'];

        if (severeKeywords.some(k => lower.includes(k))) return 'SEVERE';
        if (moderateKeywords.some(k => lower.includes(k))) return 'MODERATE';
        return 'MINOR';
    }

    /**
     * Detect potential upcoding in medical bills
     * Upcoding is when a provider bills for a more expensive service than was provided
     */
    private detectUpcoding(bill: any): boolean {
        if (!bill.cptCode) return false;

        const cptCode = bill.cptCode.toString();

        // Check if this is a known high-risk code
        if (UPCODING_RISK_CODES[cptCode]) {
            // If the bill has a description, check for mismatches
            if (bill.description) {
                const descLower = bill.description.toLowerCase();
                const riskPattern = UPCODING_RISK_CODES[cptCode].highRiskIf;

                // Flag if description suggests simpler service than code indicates
                if (descLower.includes(riskPattern) ||
                    descLower.includes('routine') ||
                    descLower.includes('simple') ||
                    descLower.includes('basic')) {
                    return true;
                }
            }

            // Flag highest-level E&M codes (99215, 99223, 99285) without supporting documentation
            if (['99215', '99223', '99285'].includes(cptCode)) {
                // Check if there's documented complexity to justify highest level
                if (!bill.complexity || bill.complexity === 'LOW' || bill.complexity === 'MODERATE') {
                    return true;
                }
            }
        }

        // Check for suspicious billing amounts for common codes
        if (bill.amount) {
            const amount = parseFloat(bill.amount);
            // Flag amounts significantly above typical rates
            if (cptCode.startsWith('992') && amount > 500) { // E&M codes typically under $500
                return true;
            }
            if (cptCode.startsWith('971') && amount > 200) { // PT codes typically under $200
                return true;
            }
        }

        return false;
    }

    /**
     * Detect potential unbundling in medical bills
     * Unbundling is when services that should be billed as one are split into separate charges
     */
    private detectUnbundling(bill: any): boolean {
        if (!bill.cptCode || !bill.relatedBills) return false;

        const currentCode = bill.cptCode.toString();

        // Get all CPT codes from the same date/visit
        const sameDateCodes: string[] = [currentCode];
        if (Array.isArray(bill.relatedBills)) {
            for (const related of bill.relatedBills) {
                if (related.cptCode && related.date === bill.date) {
                    sameDateCodes.push(related.cptCode.toString());
                }
            }
        }

        // Check against known unbundling patterns
        for (const pattern of UNBUNDLING_PATTERNS) {
            const matchingCodes = pattern.codes.filter(code => sameDateCodes.includes(code));
            // If we see 2+ codes from a pattern that should be bundled, flag it
            if (matchingCodes.length >= 2) {
                return true;
            }
        }

        // Check for common component separation patterns
        // E.g., billing comprehensive visit + separate components
        if (sameDateCodes.length > 3) {
            // Multiple codes on same date may indicate unbundling
            const evalCodes = sameDateCodes.filter(c => c.startsWith('992')); // E&M
            const labCodes = sameDateCodes.filter(c => c.startsWith('8')); // Lab
            const procCodes = sameDateCodes.filter(c => c.startsWith('9') && !c.startsWith('99')); // Procedures

            if (evalCodes.length > 1 || (evalCodes.length >= 1 && labCodes.length >= 2 && procCodes.length >= 1)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Detect duplicate billing
     */
    private detectDuplicates(bill: any, allBills: any[]): boolean {
        // Check for exact duplicates
        const duplicates = allBills.filter(
            b => b.id !== bill.id &&
                b.date === bill.date &&
                b.amount === bill.amount &&
                b.cptCode === bill.cptCode
        );
        return duplicates.length > 0;
    }
}

export const medicalFraudScreener = new MedicalFraudScreener();

