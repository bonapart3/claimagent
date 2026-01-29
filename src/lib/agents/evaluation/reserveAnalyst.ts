// src/lib/agents/evaluation/reserveAnalyst.ts
// Agent D1: Reserve Analyst - Calculates appropriate claim reserves

import { ClaimData, DamageItem } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation, ReserveAnalysis, ReserveBreakdown } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';
import { FINANCIAL_THRESHOLDS } from '@/lib/constants/thresholds';

// Local type alias for damage assessment
type DamageAssessment = DamageItem;

interface ReserveFactors {
    vehicleDamage: number;
    bodilyInjury: number;
    propertyDamage: number;
    rentalCar: number;
    legalDefense: number;
    medicalPayments: number;
    uninsuredMotorist: number;
    subrogation: number;
}

// ReserveBreakdown is imported from agent.ts

export class ReserveAnalyst {
    private readonly agentId = AgentRole.RESERVE_ANALYST;

    async analyze(claimData: ClaimData): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];

        try {
            // Step 1: Calculate damage reserves
            const damageReserve = await this.calculateDamageReserve(claimData);

            // Step 2: Calculate injury reserves if applicable
            const injuryReserve = claimData.injuries
                ? await this.calculateInjuryReserve(claimData)
                : null;

            // Step 3: Calculate additional reserves
            const additionalReserves = await this.calculateAdditionalReserves(claimData);

            // Step 4: Apply state-specific adjustments
            const stateAdjustment = this.getStateAdjustmentFactor(claimData.lossState);

            // Step 5: Calculate total reserve
            const totalReserve = this.calculateTotalReserve(
                damageReserve,
                injuryReserve,
                additionalReserves,
                stateAdjustment
            );

            // Step 6: Determine if escalation needed
            if (totalReserve.recommended > FINANCIAL_THRESHOLDS.SETTLEMENT_AUTHORITY.ADJUSTER) {
                escalations.push({
                    type: 'HIGH_RESERVE',
                    reason: `Reserve of $${totalReserve.recommended.toLocaleString()} exceeds adjuster authority`,
                    severity: totalReserve.recommended > FINANCIAL_THRESHOLDS.SETTLEMENT_AUTHORITY.SUPERVISOR
                        ? 'HIGH'
                        : 'MEDIUM',
                });
            }

            // Step 7: Build reserve analysis
            const reserveAnalysis: ReserveAnalysis = {
                claimId: claimData.id,
                analysisDate: new Date().toISOString(),
                breakdown: this.buildBreakdown(damageReserve, injuryReserve, additionalReserves),
                totalReserve: {
                    minimum: totalReserve.min,
                    maximum: totalReserve.max,
                    recommended: totalReserve.recommended,
                },
                confidence: totalReserve.confidence,
                methodology: 'Multi-factor analysis with industry benchmarks',
                stateAdjustmentFactor: stateAdjustment,
                recommendations: this.generateRecommendations(totalReserve, claimData),
            };

            // Log audit
            const reserveAmount = typeof reserveAnalysis.totalReserve === 'number'
                ? reserveAnalysis.totalReserve
                : reserveAnalysis.totalReserve.recommended;
            await auditLog({
                claimId: claimData.id,
                action: 'RESERVE_ANALYSIS_COMPLETED',
                agentId: this.agentId,
                description: `Reserve analysis: $${reserveAmount.toLocaleString()}`,
                details: { reserve: reserveAnalysis },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: reserveAnalysis,
                confidence: totalReserve.confidence,
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: reserveAnalysis.recommendations,
            };
        } catch (error) {
            console.error('Reserve analysis error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Reserve analysis failed',
                processingTime: Date.now() - startTime,
                escalations: [{
                    type: 'SYSTEM_ERROR',
                    reason: 'Reserve analysis system failure',
                    severity: 'HIGH',
                }],
            };
        }
    }

    private async calculateDamageReserve(claimData: ClaimData): Promise<ReserveBreakdown> {
        const damages = claimData.damages || [];

        if (damages.length === 0) {
            return {
                category: 'Vehicle Damage',
                estimatedMin: 0,
                estimatedMax: 5000,
                recommended: 2500,
                confidence: 0.5,
                factors: ['No damage assessment available', 'Using average collision damage'],
            };
        }

        // Sum up damage estimates
        const totalDamage = damages.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

        // Apply contingency factors based on damage severity
        const severityMultiplier = this.getSeverityMultiplier(damages);

        // Calculate range
        const min = totalDamage * 0.9;
        const max = totalDamage * severityMultiplier;
        const recommended = totalDamage * ((0.9 + severityMultiplier) / 2);

        // Confidence based on damage detail completeness
        const confidence = this.calculateDamageConfidence(damages);

        return {
            category: 'Vehicle Damage',
            estimatedMin: Math.round(min),
            estimatedMax: Math.round(max),
            recommended: Math.round(recommended),
            confidence,
            factors: this.getDamageFactors(damages),
        };
    }

    private async calculateInjuryReserve(claimData: ClaimData): Promise<ReserveBreakdown | null> {
        if (!claimData.injuries) return null;

        const injuries = Array.isArray(claimData.injuries)
            ? claimData.injuries
            : [claimData.injuries];

        let totalMin = 0;
        let totalMax = 0;
        const factors: string[] = [];

        for (const injury of injuries) {
            const severityFactor = this.getInjurySeverityFactor(injury.severity);

            // Base costs by injury type
            const baseCost = this.getBaseInjuryCost(injury.type);

            totalMin += baseCost * severityFactor.min;
            totalMax += baseCost * severityFactor.max;
            factors.push(`${injury.type}: ${injury.severity} severity`);
        }

        // Add potential lost wages if applicable
        if (claimData.lostWages) {
            totalMin += claimData.lostWages.estimated;
            totalMax += claimData.lostWages.estimated * 1.5;
            factors.push('Lost wages claim included');
        }

        const recommended = (totalMin + totalMax) / 2;

        return {
            category: 'Bodily Injury',
            estimatedMin: Math.round(totalMin),
            estimatedMax: Math.round(totalMax),
            recommended: Math.round(recommended),
            confidence: 0.7,
            factors,
        };
    }

    private async calculateAdditionalReserves(claimData: ClaimData): Promise<ReserveBreakdown[]> {
        const reserves: ReserveBreakdown[] = [];

        // Rental car reserve
        if (claimData.rentalNeeded) {
            const estimatedDays = this.estimateRepairDays(claimData);
            const dailyRate = 45; // Average daily rate

            reserves.push({
                category: 'Rental Car',
                estimatedMin: estimatedDays * dailyRate * 0.8,
                estimatedMax: (estimatedDays * 1.5) * dailyRate,
                recommended: estimatedDays * dailyRate,
                confidence: 0.75,
                factors: [`Estimated ${estimatedDays} days for repairs`],
            });
        }

        // Towing and storage
        if (claimData.towingRequired) {
            reserves.push({
                category: 'Towing & Storage',
                estimatedMin: 150,
                estimatedMax: 500,
                recommended: 300,
                confidence: 0.8,
                factors: ['Standard towing and initial storage'],
            });
        }

        // Legal defense (if liability claim)
        if (claimData.claimType === 'LIABILITY' && claimData.injuries) {
            reserves.push({
                category: 'Legal Defense',
                estimatedMin: 5000,
                estimatedMax: 25000,
                recommended: 10000,
                confidence: 0.6,
                factors: ['Potential litigation defense costs'],
            });
        }

        return reserves;
    }

    private getStateAdjustmentFactor(state?: string): number {
        // State-specific cost adjustments
        const highCostStates: Record<string, number> = {
            CA: 1.25,
            NY: 1.20,
            FL: 1.15,
            TX: 1.10,
            IL: 1.10,
            NJ: 1.15,
            MA: 1.12,
            PA: 1.08,
        };

        const lowCostStates: Record<string, number> = {
            WV: 0.85,
            MS: 0.88,
            AR: 0.90,
            AL: 0.92,
            OK: 0.93,
        };

        if (state && highCostStates[state]) return highCostStates[state];
        if (state && lowCostStates[state]) return lowCostStates[state];
        return 1.0;
    }

    private calculateTotalReserve(
        damage: ReserveBreakdown,
        injury: ReserveBreakdown | null,
        additional: ReserveBreakdown[],
        stateAdjustment: number
    ): { min: number; max: number; recommended: number; confidence: number } {
        let totalMin = damage.estimatedMin;
        let totalMax = damage.estimatedMax;
        let totalRecommended = damage.recommended;
        let confidenceSum = damage.confidence;
        let count = 1;

        if (injury) {
            totalMin += injury.estimatedMin;
            totalMax += injury.estimatedMax;
            totalRecommended += injury.recommended;
            confidenceSum += injury.confidence;
            count++;
        }

        for (const reserve of additional) {
            totalMin += reserve.estimatedMin;
            totalMax += reserve.estimatedMax;
            totalRecommended += reserve.recommended;
            confidenceSum += reserve.confidence;
            count++;
        }

        // Apply state adjustment
        totalMin *= stateAdjustment;
        totalMax *= stateAdjustment;
        totalRecommended *= stateAdjustment;

        return {
            min: Math.round(totalMin),
            max: Math.round(totalMax),
            recommended: Math.round(totalRecommended),
            confidence: confidenceSum / count,
        };
    }

    private buildBreakdown(
        damage: ReserveBreakdown,
        injury: ReserveBreakdown | null,
        additional: ReserveBreakdown[]
    ): ReserveBreakdown[] {
        const breakdown = [damage];
        if (injury) breakdown.push(injury);
        return [...breakdown, ...additional];
    }

    private getSeverityMultiplier(damages: DamageAssessment[]): number {
        const severities = damages.map(d => d.severity?.toUpperCase());

        if (severities.includes('TOTAL_LOSS')) return 1.0;
        if (severities.includes('SEVERE')) return 1.3;
        if (severities.includes('MAJOR')) return 1.2;
        if (severities.includes('MODERATE')) return 1.15;
        return 1.1; // Minor
    }

    private calculateDamageConfidence(damages: DamageAssessment[]): number {
        let score = 0.5; // Base score

        // Add for each documented damage
        score += Math.min(damages.length * 0.05, 0.2);

        // Add if costs are specified
        const withCosts = damages.filter(d => d.estimatedCost && d.estimatedCost > 0);
        score += (withCosts.length / damages.length) * 0.2;

        // Add if severity is specified
        const withSeverity = damages.filter(d => d.severity);
        score += (withSeverity.length / damages.length) * 0.1;

        return Math.min(score, 0.95);
    }

    private getDamageFactors(damages: DamageAssessment[]): string[] {
        const factors: string[] = [];

        const totalCost = damages.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);
        factors.push(`${damages.length} damaged components identified`);
        factors.push(`Base estimate: $${totalCost.toLocaleString()}`);

        const structural = damages.filter(d =>
            d.component?.toLowerCase().includes('frame') ||
            d.component?.toLowerCase().includes('structural')
        );
        if (structural.length > 0) {
            factors.push('Structural damage detected - potential hidden damage');
        }

        return factors;
    }

    private getInjurySeverityFactor(severity?: string): { min: number; max: number } {
        const factors: Record<string, { min: number; max: number }> = {
            MINOR: { min: 1.0, max: 1.5 },
            MODERATE: { min: 1.5, max: 3.0 },
            MAJOR: { min: 3.0, max: 7.0 },
            SEVERE: { min: 7.0, max: 15.0 },
            CRITICAL: { min: 15.0, max: 30.0 },
        };

        return factors[severity?.toUpperCase() || 'MODERATE'] || factors.MODERATE;
    }

    private getBaseInjuryCost(type?: string): number {
        const costs: Record<string, number> = {
            WHIPLASH: 3500,
            SOFT_TISSUE: 2500,
            FRACTURE: 15000,
            LACERATION: 2000,
            CONCUSSION: 8000,
            SPINAL: 50000,
            INTERNAL: 30000,
            BURN: 20000,
            DEFAULT: 5000,
        };

        return costs[type?.toUpperCase() || 'DEFAULT'] || costs.DEFAULT;
    }

    private estimateRepairDays(claimData: ClaimData): number {
        const damages = claimData.damages || [];

        if (damages.length === 0) return 5;

        // Estimate based on damage severity and count
        let days = damages.length * 2;

        const hasSevere = damages.some(d =>
            ['SEVERE', 'MAJOR', 'TOTAL_LOSS'].includes(d.severity?.toUpperCase() || '')
        );

        if (hasSevere) days *= 2;

        // Cap at reasonable maximum
        return Math.min(Math.max(days, 3), 30);
    }

    private generateRecommendations(
        reserve: { recommended: number; confidence: number },
        claimData: ClaimData
    ): string[] {
        const recommendations: string[] = [];

        if (reserve.confidence < 0.7) {
            recommendations.push('Request additional documentation to improve reserve accuracy');
        }

        if (reserve.recommended > 25000) {
            recommendations.push('Consider independent adjuster review for high-value claim');
        }

        if (claimData.injuries) {
            recommendations.push('Monitor medical treatment progress for reserve adjustments');
        }

        if (!claimData.damages || claimData.damages.length === 0) {
            recommendations.push('Obtain detailed damage estimate from body shop');
        }

        recommendations.push('Schedule 30-day reserve review');

        return recommendations;
    }
}

export const reserveAnalyst = new ReserveAnalyst();

