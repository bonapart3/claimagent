// src/lib/agents/investigation/vehicleInspector.ts
// Agent B1: Vehicle Inspector - Analyzes vehicle damage from photos and estimates

import { ClaimData, DamageItem, Vehicle } from '@/lib/types/claim';
import { AgentResult, AgentRole, SimpleEscalation } from '@/lib/types/agent';
import { auditLog } from '@/lib/utils/auditLogger';
import { TOTAL_LOSS_THRESHOLDS } from '@/lib/constants/thresholds';

interface VehicleInspectionResult {
    claimId: string;
    vehicleId: string;
    inspectionDate: string;
    damages: DamageItem[];
    totalDamageCost: number;
    marketValue: number;
    totalLossThreshold: number;
    isTotalLoss: boolean;
    repairability: 'REPAIRABLE' | 'QUESTIONABLE' | 'TOTAL_LOSS';
    safetyIssues: string[];
    recommendations: string[];
}

interface DamagePattern {
    impactLocation: string;
    impactDirection: string;
    severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE';
    consistentWithDescription: boolean;
    inconsistencies: string[];
}

export class VehicleInspector {
    private readonly agentId: AgentRole = AgentRole.VEHICLE_INSPECTOR;

    // Standard labor rates by region ($/hour)
    private readonly laborRates: Record<string, number> = {
        NORTHEAST: 65,
        SOUTHEAST: 55,
        MIDWEST: 52,
        SOUTHWEST: 58,
        WEST: 70,
        DEFAULT: 58,
    };

    async inspect(claimData: ClaimData): Promise<AgentResult> {
        const startTime = Date.now();
        const escalations: SimpleEscalation[] = [];

        try {
            if (!claimData.vehicle) {
                throw new Error('No vehicle information provided');
            }

            // Step 1: Analyze damage from photos/estimates
            const damages = await this.analyzeDamages(claimData);

            // Step 2: Calculate repair costs
            const totalDamageCost = damages.reduce((sum, d) => sum + (d.estimatedCost || 0), 0);

            // Step 3: Determine vehicle value
            const marketValue = await this.estimateMarketValue(claimData.vehicle);

            // Step 4: Check total loss threshold
            const state = claimData.lossState || 'DEFAULT';
            const threshold = TOTAL_LOSS_THRESHOLDS[state] || 0.75;
            const isTotalLoss = totalDamageCost / marketValue >= threshold;

            // Step 5: Analyze damage patterns
            const damagePattern = this.analyzeDamagePattern(damages, claimData);

            // Step 6: Check for safety issues
            const safetyIssues = this.identifySafetyIssues(damages);

            // Step 7: Check for inconsistencies
            if (!damagePattern.consistentWithDescription) {
                escalations.push({
                    type: 'DAMAGE_INCONSISTENCY',
                    reason: `Damage pattern inconsistent: ${damagePattern.inconsistencies.join(', ')}`,
                    severity: 'MEDIUM',
                });
            }

            // Step 8: Escalate if total loss
            if (isTotalLoss) {
                escalations.push({
                    type: 'TOTAL_LOSS',
                    reason: `Vehicle is total loss (${(totalDamageCost / marketValue * 100).toFixed(0)}% of value)`,
                    severity: 'HIGH',
                });
            }

            const result: VehicleInspectionResult = {
                claimId: claimData.id,
                vehicleId: claimData.vehicle.id || 'unknown',
                inspectionDate: new Date().toISOString(),
                damages,
                totalDamageCost,
                marketValue,
                totalLossThreshold: threshold,
                isTotalLoss,
                repairability: this.determineRepairability(isTotalLoss, damages),
                safetyIssues,
                recommendations: this.generateRecommendations(isTotalLoss, damages, safetyIssues),
            };

            await auditLog({
                claimId: claimData.id,
                action: 'VEHICLE_INSPECTION_COMPLETED',
                agentId: this.agentId,
                description: `Inspection complete: $${totalDamageCost.toLocaleString()} damage, ${isTotalLoss ? 'TOTAL LOSS' : 'REPAIRABLE'}`,
                details: { result },
            });

            return {
                agentId: this.agentId,
                success: true,
                data: result,
                confidence: this.calculateConfidence(damages, claimData),
                processingTime: Date.now() - startTime,
                escalations,
                recommendations: result.recommendations,
            };
        } catch (error) {
            console.error('Vehicle inspection error:', error);
            return {
                agentId: this.agentId,
                success: false,
                error: error instanceof Error ? error.message : 'Vehicle inspection failed',
                processingTime: Date.now() - startTime,
                escalations: [{
                    type: 'SYSTEM_ERROR',
                    reason: 'Vehicle inspection system failure',
                    severity: 'HIGH',
                }],
            };
        }
    }

    private async analyzeDamages(claimData: ClaimData): Promise<DamageItem[]> {
        // If damages already assessed, enhance them
        if (claimData.damages && claimData.damages.length > 0) {
            return claimData.damages.map(d => this.enhanceDamageItem(d, claimData));
        }

        // Otherwise, create initial assessment from description
        return this.createDamageItemFromDescription(claimData);
    }

    private enhanceDamageItem(damage: DamageItem, claimData: ClaimData): DamageItem {
        const region = this.getRegionFromState(claimData.lossState);
        const laborRate = this.laborRates[region] || this.laborRates.DEFAULT;

        // Calculate costs if not provided
        if (!damage.estimatedCost && damage.laborHours) {
            const laborCost = damage.laborHours * laborRate;
            const partsCost = damage.partsCost || 0;
            damage.estimatedCost = laborCost + partsCost;
        }

        // Set severity if not provided
        if (!damage.severity) {
            damage.severity = this.estimateSeverity(damage);
        }

        return damage;
    }

    private createDamageItemFromDescription(claimData: ClaimData): DamageItem[] {
        const damages: DamageItem[] = [];
        const description = claimData.lossDescription?.toLowerCase() || '';

        // Parse common damage keywords
        const damageKeywords: Record<string, { component: string; baseCost: number; laborHours: number }> = {
            'front bumper': { component: 'Front Bumper', baseCost: 800, laborHours: 3 },
            'rear bumper': { component: 'Rear Bumper', baseCost: 750, laborHours: 2.5 },
            'hood': { component: 'Hood', baseCost: 1200, laborHours: 4 },
            'fender': { component: 'Fender', baseCost: 600, laborHours: 3 },
            'door': { component: 'Door', baseCost: 900, laborHours: 4 },
            'windshield': { component: 'Windshield', baseCost: 450, laborHours: 2 },
            'headlight': { component: 'Headlight Assembly', baseCost: 650, laborHours: 1.5 },
            'taillight': { component: 'Taillight Assembly', baseCost: 350, laborHours: 1 },
            'mirror': { component: 'Side Mirror', baseCost: 250, laborHours: 0.5 },
            'trunk': { component: 'Trunk Lid', baseCost: 800, laborHours: 3 },
            'quarter panel': { component: 'Quarter Panel', baseCost: 1500, laborHours: 8 },
            'frame': { component: 'Frame', baseCost: 5000, laborHours: 20 },
            'airbag': { component: 'Airbag System', baseCost: 2500, laborHours: 4 },
            'radiator': { component: 'Radiator', baseCost: 800, laborHours: 3 },
        };

        for (const [keyword, details] of Object.entries(damageKeywords)) {
            if (description.includes(keyword)) {
                damages.push({
                    id: `dmg-${Date.now()}-${damages.length}`,
                    component: details.component,
                    description: `${details.component} damage`,
                    severity: 'MODERATE',
                    repairType: details.baseCost > 1000 ? 'REPLACE' : 'REPAIR',
                    estimatedCost: details.baseCost,
                    laborHours: details.laborHours,
                    partsCost: details.baseCost * 0.6,
                });
            }
        }

        // If no specific damage found, create generic assessment
        if (damages.length === 0 && claimData.claimType === 'COLLISION') {
            damages.push({
                id: `dmg-${Date.now()}`,
                component: 'General Collision Damage',
                description: 'Damage pending physical inspection',
                severity: 'MODERATE',
                repairType: 'REPAIR',
                estimatedCost: 2500,
                laborHours: 6,
                partsCost: 1500,
            });
        }

        return damages;
    }

    private async estimateMarketValue(vehicle: Vehicle): Promise<number> {
        // In production, this would call valuation APIs (KBB, NADA, etc.)
        // Using simplified calculation for demonstration

        const currentYear = new Date().getFullYear();
        const age = currentYear - (vehicle.year || currentYear);

        // Base value by vehicle type (simplified)
        let baseValue = 30000;

        const premiumMakes = ['BMW', 'MERCEDES', 'AUDI', 'LEXUS', 'PORSCHE', 'TESLA'];
        const economyMakes = ['HYUNDAI', 'KIA', 'NISSAN', 'TOYOTA', 'HONDA'];

        if (vehicle.make && premiumMakes.includes(vehicle.make.toUpperCase())) {
            baseValue = 50000;
        } else if (vehicle.make && economyMakes.includes(vehicle.make.toUpperCase())) {
            baseValue = 25000;
        }

        // Depreciation (15% first year, 10% subsequent)
        let depreciation = 0;
        if (age >= 1) {
            depreciation = 0.15 + (age - 1) * 0.10;
        }
        depreciation = Math.min(depreciation, 0.80); // Max 80% depreciation

        let value = baseValue * (1 - depreciation);

        // Mileage adjustment
        if (vehicle.mileage) {
            const expectedMileage = age * 12000;
            const mileageDiff = vehicle.mileage - expectedMileage;
            const mileageAdjustment = mileageDiff * 0.05; // $0.05 per mile difference
            value -= mileageAdjustment;
        }

        // Use actual market value if provided
        if (vehicle.marketValue && vehicle.marketValue > 0) {
            return vehicle.marketValue;
        }

        return Math.max(value, 2000); // Minimum $2,000 value
    }

    private analyzeDamagePattern(
        damages: DamageItem[],
        claimData: ClaimData
    ): DamagePattern {
        const inconsistencies: string[] = [];
        const description = claimData.lossDescription?.toLowerCase() || '';

        // Determine impact location from damages
        const frontDamage = damages.some(d =>
            d.component?.toLowerCase().includes('front') ||
            d.component?.toLowerCase().includes('hood') ||
            d.component?.toLowerCase().includes('headlight')
        );
        const rearDamage = damages.some(d =>
            d.component?.toLowerCase().includes('rear') ||
            d.component?.toLowerCase().includes('trunk') ||
            d.component?.toLowerCase().includes('taillight')
        );
        const sideDamage = damages.some(d =>
            d.component?.toLowerCase().includes('door') ||
            d.component?.toLowerCase().includes('quarter') ||
            d.component?.toLowerCase().includes('mirror')
        );

        let impactLocation = 'Unknown';
        if (frontDamage && !rearDamage && !sideDamage) impactLocation = 'Front';
        else if (rearDamage && !frontDamage && !sideDamage) impactLocation = 'Rear';
        else if (sideDamage && !frontDamage && !rearDamage) impactLocation = 'Side';
        else if (frontDamage && rearDamage) impactLocation = 'Multiple';

        // Check consistency with description
        if (description.includes('rear-ended') && !rearDamage) {
            inconsistencies.push('Rear-end collision claimed but no rear damage documented');
        }

        if (description.includes('t-bone') && !sideDamage) {
            inconsistencies.push('Side impact claimed but no side damage documented');
        }

        if (description.includes('hit from behind') && frontDamage && !rearDamage) {
            inconsistencies.push('Hit from behind claimed but front damage present without rear');
        }

        // Check for scattered damage pattern (possible fraud indicator)
        const damageLocations = new Set(damages.map(d => this.getDamageZone(d.component || '')));
        if (damageLocations.size > 3 && !description.includes('rollover')) {
            inconsistencies.push('Damage in multiple unrelated areas without rollover');
        }

        return {
            impactLocation,
            impactDirection: this.inferImpactDirection(description),
            severity: this.calculateOverallSeverity(damages),
            consistentWithDescription: inconsistencies.length === 0,
            inconsistencies,
        };
    }

    private getDamageZone(component: string): string {
        const lower = component.toLowerCase();
        if (lower.includes('front') || lower.includes('hood') || lower.includes('headlight')) return 'FRONT';
        if (lower.includes('rear') || lower.includes('trunk') || lower.includes('taillight')) return 'REAR';
        if (lower.includes('left')) return 'LEFT';
        if (lower.includes('right')) return 'RIGHT';
        if (lower.includes('roof') || lower.includes('top')) return 'TOP';
        if (lower.includes('bottom') || lower.includes('undercarriage')) return 'BOTTOM';
        return 'CENTER';
    }

    private inferImpactDirection(description: string): string {
        const lower = description.toLowerCase();
        if (lower.includes('rear-ended') || lower.includes('hit from behind')) return 'REAR_TO_FRONT';
        if (lower.includes('t-bone') || lower.includes('side impact')) return 'SIDE';
        if (lower.includes('head-on') || lower.includes('hit front')) return 'FRONT';
        if (lower.includes('rollover')) return 'ROLLOVER';
        if (lower.includes('sideswipe')) return 'SIDESWIPE';
        return 'UNKNOWN';
    }

    private calculateOverallSeverity(damages: DamageItem[]): 'MINOR' | 'MODERATE' | 'MAJOR' | 'SEVERE' {
        if (damages.length === 0) return 'MINOR';

        const severityScores: Record<string, number> = {
            MINOR: 1,
            MODERATE: 2,
            MAJOR: 3,
            SEVERE: 4,
        };

        const avgScore = damages.reduce((sum, d) => {
            return sum + (severityScores[d.severity?.toUpperCase() || 'MODERATE'] || 2);
        }, 0) / damages.length;

        if (avgScore >= 3.5) return 'SEVERE';
        if (avgScore >= 2.5) return 'MAJOR';
        if (avgScore >= 1.5) return 'MODERATE';
        return 'MINOR';
    }

    private identifySafetyIssues(damages: DamageItem[]): string[] {
        const issues: string[] = [];

        for (const damage of damages) {
            const component = damage.component?.toLowerCase() || '';

            if (component.includes('airbag')) {
                issues.push('Airbag deployment - vehicle safety system compromised');
            }
            if (component.includes('frame')) {
                issues.push('Frame damage - structural integrity may be compromised');
            }
            if (component.includes('steering')) {
                issues.push('Steering system damage - safety critical');
            }
            if (component.includes('brake')) {
                issues.push('Brake system damage - safety critical');
            }
            if (component.includes('suspension')) {
                issues.push('Suspension damage - affects vehicle handling');
            }
            if (component.includes('wheel') || component.includes('tire')) {
                issues.push('Wheel/tire damage - may affect safe operation');
            }
        }

        return [...new Set(issues)]; // Remove duplicates
    }

    private estimateSeverity(damage: DamageItem): string {
        const cost = damage.estimatedCost || 0;

        if (cost < 500) return 'MINOR';
        if (cost < 2000) return 'MODERATE';
        if (cost < 5000) return 'MAJOR';
        return 'SEVERE';
    }

    private determineRepairability(
        isTotalLoss: boolean,
        damages: DamageItem[]
    ): 'REPAIRABLE' | 'QUESTIONABLE' | 'TOTAL_LOSS' {
        if (isTotalLoss) return 'TOTAL_LOSS';

        // Check for structural damage
        const hasStructural = damages.some(d =>
            d.component?.toLowerCase().includes('frame') ||
            d.component?.toLowerCase().includes('unibody')
        );

        if (hasStructural) return 'QUESTIONABLE';

        return 'REPAIRABLE';
    }

    private getRegionFromState(state?: string): string {
        const regions: Record<string, string> = {
            // Northeast
            CT: 'NORTHEAST', ME: 'NORTHEAST', MA: 'NORTHEAST', NH: 'NORTHEAST',
            NJ: 'NORTHEAST', NY: 'NORTHEAST', PA: 'NORTHEAST', RI: 'NORTHEAST', VT: 'NORTHEAST',
            // Southeast
            AL: 'SOUTHEAST', FL: 'SOUTHEAST', GA: 'SOUTHEAST', KY: 'SOUTHEAST',
            MS: 'SOUTHEAST', NC: 'SOUTHEAST', SC: 'SOUTHEAST', TN: 'SOUTHEAST', VA: 'SOUTHEAST',
            // Midwest
            IL: 'MIDWEST', IN: 'MIDWEST', IA: 'MIDWEST', KS: 'MIDWEST',
            MI: 'MIDWEST', MN: 'MIDWEST', MO: 'MIDWEST', NE: 'MIDWEST',
            ND: 'MIDWEST', OH: 'MIDWEST', SD: 'MIDWEST', WI: 'MIDWEST',
            // Southwest
            AZ: 'SOUTHWEST', NM: 'SOUTHWEST', OK: 'SOUTHWEST', TX: 'SOUTHWEST',
            // West
            CA: 'WEST', CO: 'WEST', NV: 'WEST', OR: 'WEST', WA: 'WEST',
        };

        return state ? (regions[state] || 'DEFAULT') : 'DEFAULT';
    }

    private calculateConfidence(damages: DamageItem[], claimData: ClaimData): number {
        let confidence = 0.6; // Base confidence

        // More damages = better understanding
        if (damages.length > 0) confidence += 0.1;
        if (damages.length > 3) confidence += 0.05;

        // Photos increase confidence
        const photos = claimData.documents?.filter(d => d.type === 'PHOTO' || d.type === 'DAMAGE_PHOTO');
        if (photos && photos.length > 0) confidence += 0.1;
        if (photos && photos.length > 4) confidence += 0.05;

        // Estimates increase confidence
        const hasEstimate = claimData.documents?.some(d => d.type === 'ESTIMATE' || d.type === 'REPAIR_ESTIMATE');
        if (hasEstimate) confidence += 0.1;

        return Math.min(confidence, 0.95);
    }

    private generateRecommendations(
        isTotalLoss: boolean,
        damages: DamageItem[],
        safetyIssues: string[]
    ): string[] {
        const recommendations: string[] = [];

        if (isTotalLoss) {
            recommendations.push('Proceed with total loss evaluation');
            recommendations.push('Order salvage value appraisal');
            recommendations.push('Notify claimant of total loss determination');
        } else {
            recommendations.push('Approve repairs at approved body shop');

            if (safetyIssues.length > 0) {
                recommendations.push('Ensure safety-critical repairs are prioritized');
            }
        }

        const hasStructural = damages.some(d => d.component?.toLowerCase().includes('frame'));
        if (hasStructural && !isTotalLoss) {
            recommendations.push('Require post-repair inspection for frame work');
        }

        if (damages.length < 2) {
            recommendations.push('Consider requesting additional photos for completeness');
        }

        return recommendations;
    }
}

export const vehicleInspector = new VehicleInspector();

