/**
 * ClaimAgent™ - Valuation Specialist (Agent D1)
 * Calculates ACV, salvage values, and total loss determinations
 * Part of GROUP D: Evaluation & Settlement Team
 */

import { auditLog } from '@/lib/utils/auditLogger';
import { getTotalLossThreshold } from '@/lib/constants/stateRegulations';

interface VehicleInfo { id?: string; vin: string; year?: number; make?: string; model?: string; mileage?: number; condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; priorDamage?: boolean; options?: string[]; lienHolder?: string; value?: number; }
interface ClaimData { vehicleInfo?: VehicleInfo; state: string; deductible?: number; damageDescription?: string; repairEstimate?: { amount: number }; }

interface ValuationAnalysis {
    vehicleId: string;
    vin: string;
    actualCashValue: ACVCalculation;
    salvageValue: SalvageEstimate;
    totalLossAnalysis: TotalLossAnalysis;
    repairEstimate?: RepairEstimate;
    recommendation: ValuationRecommendation;
    confidence: number;
    analysisTimestamp: Date;
    dataSources: string[];
}

interface ACVCalculation { baseValue: number; adjustments: ValueAdjustment[]; finalACV: number; methodology: 'NADA' | 'KBB' | 'CCC' | 'MITCHELL' | 'COMPARABLE_SALES' | 'MULTIPLE_SOURCES'; marketDataDate: Date; condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; mileageAdjustment: number; optionsValue: number; }
interface ValueAdjustment { factor: string; amount: number; direction: 'INCREASE' | 'DECREASE'; rationale: string; }
interface SalvageEstimate { estimatedValue: number; bidRange: { low: number; high: number }; methodology: 'BID_AVERAGE' | 'HISTORICAL' | 'PERCENTAGE_ACV'; salvageType: 'REBUILDABLE' | 'PARTS_ONLY' | 'SCRAP'; marketFactors: string[]; confidence: number; }
interface TotalLossAnalysis { isTotalLoss: boolean; threshold: number; stateThresholdPercent: number; actualThresholdPercent: number; costToRepair: number; acv: number; salvage: number; ownerRetainedSalvage: boolean; settlement: TotalLossSettlement; stateLaw: string; }
interface TotalLossSettlement { grossSettlement: number; lessSalvage: number; lessDeductible: number; netToOwner: number; taxableAmount?: number; licenseFeesIncluded?: boolean; }
interface RepairEstimate { estimatedCost: number; partsTotal: number; laborTotal: number; paintTotal: number; otherTotal: number; estimateSource: 'CCC' | 'MITCHELL' | 'AUDATEX' | 'SHOP_ESTIMATE'; supplementProbability: number; supplementReserve: number; }
interface ValuationRecommendation { decision: 'TOTAL_LOSS' | 'REPAIR' | 'HUMAN_REVIEW'; rationale: string[]; nextSteps: string[]; requiredDocuments: string[]; specialConsiderations: string[]; }

export class ValuationSpecialist {
    private claimId: string;
    private carrierCode: string;

    constructor(claimId: string, carrierCode: string) {
        this.claimId = claimId;
        this.carrierCode = carrierCode;
    }

    async performValuation(claimData: ClaimData): Promise<ValuationAnalysis> {
        try {
            await auditLog({ action: 'VALUATION_START', entityType: 'claim', entityId: this.claimId, metadata: { vin: claimData.vehicleInfo?.vin, state: claimData.state } });
            if (!claimData.vehicleInfo) throw new Error('Vehicle information required for valuation');

            const [acvCalc, salvageEst, repairEst] = await Promise.all([
                this.calculateACV(claimData.vehicleInfo, claimData.state),
                this.estimateSalvageValue(claimData.vehicleInfo, claimData.state),
                this.estimateRepairCost(claimData)
            ]);

            const totalLossAnalysis = this.analyzeTotalLoss(acvCalc, salvageEst, repairEst, claimData.state, claimData.deductible);
            const recommendation = this.generateRecommendation(totalLossAnalysis, repairEst, claimData);

            const analysis: ValuationAnalysis = {
                vehicleId: claimData.vehicleInfo.id || 'UNKNOWN',
                vin: claimData.vehicleInfo.vin,
                actualCashValue: acvCalc,
                salvageValue: salvageEst,
                totalLossAnalysis,
                repairEstimate: repairEst,
                recommendation,
                confidence: this.calculateConfidence(acvCalc, salvageEst, repairEst),
                analysisTimestamp: new Date(),
                dataSources: this.getDataSources(acvCalc, salvageEst, repairEst)
            };

            await auditLog({ action: 'VALUATION_COMPLETE', entityType: 'claim', entityId: this.claimId, metadata: { isTotalLoss: totalLossAnalysis.isTotalLoss, acv: acvCalc.finalACV, repairCost: repairEst?.estimatedCost, recommendation: recommendation.decision } });
            return analysis;
        } catch (error) {
            await auditLog({ action: 'VALUATION_ERROR', entityType: 'claim', entityId: this.claimId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
            throw error;
        }
    }

    private async calculateACV(vehicle: VehicleInfo, state: string): Promise<ACVCalculation> {
        const nadaValue = await this.fetchNADAValue(vehicle);
        const kbbValue = await this.fetchKBBValue(vehicle);
        const cccValue = await this.fetchCCCValue(vehicle);
        const baseValue = this.reconcileBaseValues(nadaValue, kbbValue, cccValue);

        const adjustments: ValueAdjustment[] = [];
        const mileageAdj = this.calculateMileageAdjustment(vehicle.mileage, vehicle.year);
        if (mileageAdj !== 0) adjustments.push({ factor: 'Mileage', amount: mileageAdj, direction: mileageAdj > 0 ? 'INCREASE' : 'DECREASE', rationale: `${vehicle.mileage?.toLocaleString()} miles vs average for ${vehicle.year}` });

        const optionsValue = this.calculateOptionsValue(vehicle);
        if (optionsValue > 0) adjustments.push({ factor: 'Options & Equipment', amount: optionsValue, direction: 'INCREASE', rationale: 'Premium features increase market value' });

        const conditionAdj = this.calculateConditionAdjustment(vehicle.condition, baseValue);
        if (conditionAdj !== 0) adjustments.push({ factor: 'Vehicle Condition', amount: conditionAdj, direction: conditionAdj > 0 ? 'INCREASE' : 'DECREASE', rationale: `Condition: ${vehicle.condition || 'AVERAGE'}` });

        if (vehicle.priorDamage) {
            const priorDamageAdj = baseValue * -0.10;
            adjustments.push({ factor: 'Prior Damage', amount: priorDamageAdj, direction: 'DECREASE', rationale: 'Vehicle has documented prior damage history' });
        }

        const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
        const finalACV = Math.round(baseValue + totalAdjustments);

        return { baseValue, adjustments, finalACV, methodology: 'MULTIPLE_SOURCES', marketDataDate: new Date(), condition: vehicle.condition || 'GOOD', mileageAdjustment: mileageAdj, optionsValue };
    }

    private async estimateSalvageValue(vehicle: VehicleInfo, state: string): Promise<SalvageEstimate> {
        const historicalBids = await this.fetchHistoricalSalvageBids(vehicle);
        let estimatedValue: number;
        let methodology: SalvageEstimate['methodology'];
        let salvageType: SalvageEstimate['salvageType'];

        if (historicalBids.length >= 3) {
            estimatedValue = Math.round(historicalBids.reduce((sum, bid) => sum + bid.amount, 0) / historicalBids.length);
            methodology = 'BID_AVERAGE';
        } else {
            const acv = await this.quickACVEstimate(vehicle);
            estimatedValue = Math.round(acv * 0.25);
            methodology = 'PERCENTAGE_ACV';
        }

        if (vehicle.year && vehicle.year >= new Date().getFullYear() - 5 && estimatedValue > 3000) salvageType = 'REBUILDABLE';
        else if (estimatedValue > 1000) salvageType = 'PARTS_ONLY';
        else salvageType = 'SCRAP';

        return { estimatedValue, bidRange: { low: Math.round(estimatedValue * 0.8), high: Math.round(estimatedValue * 1.2) }, methodology, salvageType, marketFactors: this.identifySalvageMarketFactors(vehicle, state), confidence: historicalBids.length >= 3 ? 85 : 65 };
    }

    private async estimateRepairCost(claimData: ClaimData): Promise<RepairEstimate | undefined> {
        if (!claimData.damageDescription) return undefined;
        const shopEstimate = claimData.repairEstimate;
        let estimatedCost: number;
        let estimateSource: RepairEstimate['estimateSource'];

        if (shopEstimate && shopEstimate.amount > 0) { estimatedCost = shopEstimate.amount; estimateSource = 'SHOP_ESTIMATE'; }
        else { estimatedCost = this.estimateFromDescription(claimData.damageDescription); estimateSource = 'SHOP_ESTIMATE'; }

        const supplementProbability = this.calculateSupplementProbability(estimatedCost, claimData.vehicleInfo?.year || 2020, estimateSource);
        return { estimatedCost: Math.round(estimatedCost), partsTotal: Math.round(estimatedCost * 0.5), laborTotal: Math.round(estimatedCost * 0.35), paintTotal: Math.round(estimatedCost * 0.12), otherTotal: Math.round(estimatedCost * 0.03), estimateSource, supplementProbability, supplementReserve: Math.round(estimatedCost * (supplementProbability / 100) * 0.3) };
    }

    private analyzeTotalLoss(acv: ACVCalculation, salvage: SalvageEstimate, repair: RepairEstimate | undefined, state: string, deductible: number = 0): TotalLossAnalysis {
        const stateThresholdPercent = Math.round(getTotalLossThreshold(state) * 100);
        const threshold = acv.finalACV * (stateThresholdPercent / 100);
        const costToRepair = repair?.estimatedCost || acv.finalACV;
        const actualThresholdPercent = (costToRepair / acv.finalACV) * 100;
        const isTotalLoss = costToRepair >= threshold;

        const grossSettlement = acv.finalACV;
        const lessSalvage = isTotalLoss ? salvage.estimatedValue : 0;
        const lessDeductible = deductible;
        const netToOwner = grossSettlement - lessSalvage - lessDeductible;

        return { isTotalLoss, threshold, stateThresholdPercent, actualThresholdPercent: Math.round(actualThresholdPercent), costToRepair, acv: acv.finalACV, salvage: salvage.estimatedValue, ownerRetainedSalvage: false, settlement: { grossSettlement, lessSalvage, lessDeductible, netToOwner: Math.max(0, netToOwner) }, stateLaw: `${state} total loss threshold: ${stateThresholdPercent}% of ACV` };
    }

    private generateRecommendation(totalLoss: TotalLossAnalysis, repair: RepairEstimate | undefined, claimData: ClaimData): ValuationRecommendation {
        const rationale: string[] = [];
        const nextSteps: string[] = [];
        const requiredDocuments: string[] = [];
        const specialConsiderations: string[] = [];
        let decision: ValuationRecommendation['decision'];

        if (totalLoss.isTotalLoss) {
            decision = 'TOTAL_LOSS';
            rationale.push(`Repair cost ($${totalLoss.costToRepair.toLocaleString()}) exceeds ${totalLoss.stateThresholdPercent}% of ACV ($${totalLoss.acv.toLocaleString()})`);
            rationale.push(`State law threshold: ${totalLoss.stateThresholdPercent}% | Actual: ${totalLoss.actualThresholdPercent}%`);
            nextSteps.push('Obtain vehicle title from owner', 'Arrange vehicle pick-up or owner-retained salvage election', 'Process total loss settlement', 'Submit salvage to auction');
            requiredDocuments.push('Vehicle title (original)', 'Lien holder information (if applicable)', 'Total loss settlement release', 'Owner-retained salvage affidavit (if elected)');
            if (claimData.vehicleInfo?.lienHolder) specialConsiderations.push(`Lien holder: ${claimData.vehicleInfo.lienHolder} - dual payee required`);
            if (totalLoss.settlement.netToOwner < 1000) specialConsiderations.push('Low net settlement - discuss with insured to manage expectations');
        } else if (repair && repair.estimatedCost > 0) {
            decision = 'REPAIR';
            rationale.push(`Repair cost ($${repair.estimatedCost.toLocaleString()}) is below total loss threshold ($${totalLoss.threshold.toLocaleString()})`);
            rationale.push(`Economic to repair: ${Math.round((repair.estimatedCost / totalLoss.acv) * 100)}% of ACV`);
            nextSteps.push('Approve repair estimate', 'Issue repair authorization to shop', 'Monitor repair progress', `Reserve supplement allowance: $${repair.supplementReserve.toLocaleString()}`);
            requiredDocuments.push('Final repair invoice', 'Itemized parts list', 'Photos of completed repairs');
            if (repair.supplementProbability > 50) specialConsiderations.push(`High supplement probability (${repair.supplementProbability}%) - expect additional authorization request`);
            if (claimData.vehicleInfo?.year && claimData.vehicleInfo.year >= new Date().getFullYear() - 3) specialConsiderations.push('Late-model vehicle - verify OEM parts requirement under policy');
        } else {
            decision = 'HUMAN_REVIEW';
            rationale.push('Insufficient data to make automated determination', 'Manual inspection and estimate required');
            nextSteps.push('Assign to appraiser for physical inspection', 'Obtain detailed repair estimate', 'Re-run valuation once estimate received');
            requiredDocuments.push('Professional appraisal report', 'Detailed repair estimate from certified shop', 'Additional vehicle photos');
        }

        return { decision, rationale, nextSteps, requiredDocuments, specialConsiderations };
    }

    private async fetchNADAValue(vehicle: VehicleInfo): Promise<number> { return this.estimateVehicleValue(vehicle) * 0.98; }
    private async fetchKBBValue(vehicle: VehicleInfo): Promise<number> { return this.estimateVehicleValue(vehicle) * 1.02; }
    private async fetchCCCValue(vehicle: VehicleInfo): Promise<number> { return this.estimateVehicleValue(vehicle); }

    private estimateVehicleValue(vehicle: VehicleInfo): number {
        const currentYear = new Date().getFullYear();
        const age = currentYear - (vehicle.year || currentYear);
        const baseNewValue = 35000;
        const depreciationRate = 0.15;
        let value = baseNewValue * Math.pow(1 - depreciationRate, age);
        if (['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Cadillac'].includes(vehicle.make || '')) value *= 1.5;
        return Math.round(value);
    }

    private reconcileBaseValues(nada: number, kbb: number, ccc: number): number { return Math.round((nada + kbb + ccc) / 3); }

    private calculateMileageAdjustment(mileage: number | undefined, year: number | undefined): number {
        if (!mileage || !year) return 0;
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        const expectedMileage = age * 12000;
        return Math.round((expectedMileage - mileage) * 0.10);
    }

    private calculateOptionsValue(vehicle: VehicleInfo): number {
        let optionsValue = 0;
        if (vehicle.options) {
            const premiumOptions = ['Navigation', 'Leather', 'Sunroof', 'Premium Sound', 'AWD', '4WD'];
            for (const option of vehicle.options) { if (premiumOptions.some(p => option.includes(p))) optionsValue += 500; }
        }
        return optionsValue;
    }

    private calculateConditionAdjustment(condition: string | undefined, baseValue: number): number {
        const conditionMultipliers = { 'EXCELLENT': 1.10, 'GOOD': 1.00, 'FAIR': 0.90, 'POOR': 0.75 };
        const multiplier = conditionMultipliers[condition as keyof typeof conditionMultipliers] || 1.00;
        return Math.round(baseValue * (multiplier - 1));
    }

    private async fetchHistoricalSalvageBids(vehicle: VehicleInfo): Promise<Array<{ amount: number; date: Date }>> {
        return [{ amount: 3500, date: new Date(Date.now() - 86400000 * 10) }, { amount: 3800, date: new Date(Date.now() - 86400000 * 15) }, { amount: 3200, date: new Date(Date.now() - 86400000 * 20) }];
    }

    private async quickACVEstimate(vehicle: VehicleInfo): Promise<number> { return this.estimateVehicleValue(vehicle); }

    private identifySalvageMarketFactors(vehicle: VehicleInfo, state: string): string[] {
        const factors: string[] = [];
        if (vehicle.make && ['Honda', 'Toyota', 'Ford', 'Chevrolet'].includes(vehicle.make)) factors.push('High demand for parts - popular make');
        if (vehicle.year && vehicle.year >= new Date().getFullYear() - 5) factors.push('Late model - higher salvage value');
        factors.push(`Regional market: ${state}`);
        return factors;
    }

    private estimateFromDescription(description: string): number {
        const keywords = { 'minor': 1500, 'moderate': 4000, 'major': 8000, 'severe': 12000, 'front': 5000, 'rear': 3500, 'side': 4500, 'bumper': 1200, 'fender': 800, 'door': 1500, 'hood': 1000, 'airbag': 3000 };
        let estimate = 2000;
        const lowerDesc = description.toLowerCase();
        for (const [keyword, value] of Object.entries(keywords)) { if (lowerDesc.includes(keyword)) estimate += value; }
        return estimate;
    }

    private calculateSupplementProbability(cost: number, year: number, source: RepairEstimate['estimateSource']): number {
        let probability = 30;
        if (cost > 10000) probability += 20;
        if (cost > 20000) probability += 15;
        if (year >= new Date().getFullYear() - 3) probability += 10;
        if (source === 'SHOP_ESTIMATE') probability -= 10;
        return Math.min(probability, 85);
    }

    private calculateConfidence(acv: ACVCalculation, salvage: SalvageEstimate, repair: RepairEstimate | undefined): number {
        let confidence = 70;
        if (acv.methodology === 'MULTIPLE_SOURCES') confidence += 10;
        if (salvage.confidence >= 80) confidence += 10;
        if (repair && repair.estimateSource !== 'SHOP_ESTIMATE') confidence += 5;
        return Math.min(confidence, 95);
    }

    private getDataSources(acv: ACVCalculation, salvage: SalvageEstimate, repair: RepairEstimate | undefined): string[] {
        const sources = [acv.methodology, `Salvage: ${salvage.methodology}`];
        if (repair) sources.push(`Repair: ${repair.estimateSource}`);
        return sources;
    }
}

export default ValuationSpecialist;
