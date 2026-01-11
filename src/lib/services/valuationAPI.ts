/**
 * Valuation API Service
 * Integration with third-party valuation services (NADA, KBB, Black Book)
 * ACV calculation, salvage value estimation, and total loss determination
 * 
 * @module services/valuationAPI
 */

import { VehicleData } from '../types/claim';
import { auditLog } from '../utils/auditLogger';

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ValuationCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number = 3600000, maxSize: number = 1000) { // Default: 1 hour TTL, 1000 entries
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  generateKey(vin: string, mileage: number, condition: string): string {
    return `${vin}:${Math.floor(mileage / 1000)}:${condition}`;
  }
}

// Singleton caches for valuations
const acvCache = new ValuationCache<ACVValuation>(3600000); // 1 hour TTL
const salvageCache = new ValuationCache<SalvageValuation>(3600000);

// State total loss thresholds
const STATE_TOTAL_LOSS_THRESHOLDS: Record<string, number> = {
  AL: 0.75, AK: 0.80, AZ: 0.70, AR: 0.70, CA: 0.75, CO: 1.00, CT: 0.80,
  DE: 0.75, FL: 0.80, GA: 0.75, HI: 0.75, ID: 0.75, IL: 0.50, IN: 0.70,
  IA: 0.50, KS: 0.75, KY: 0.75, LA: 0.75, ME: 0.75, MD: 0.75, MA: 0.75,
  MI: 0.75, MN: 0.70, MS: 0.75, MO: 0.80, MT: 0.75, NE: 0.75, NV: 0.65,
  NH: 0.75, NJ: 0.75, NM: 0.75, NY: 0.75, NC: 0.75, ND: 0.75, OH: 0.70,
  OK: 0.60, OR: 0.80, PA: 0.70, RI: 0.75, SC: 0.75, SD: 0.75, TN: 0.75,
  TX: 1.00, UT: 0.70, VT: 0.75, VA: 0.75, WA: 0.70, WV: 0.75, WI: 0.70, WY: 0.75,
};

export interface ACVValuation {
  vehicleId: string;
  vin: string;
  acv: number;
  valuationDate: Date;
  valuationSource: 'nada' | 'kbb' | 'black_book' | 'internal';
  confidence: number;
  breakdown: {
    baseValue: number;
    mileageAdjustment: number;
    conditionAdjustment: number;
    optionsAdjustment: number;
    regionalAdjustment: number;
    marketAdjustment: number;
  };
  comparables: Comparable[];
  methodologyNotes: string;
}

export interface Comparable {
  id: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  mileage: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  salePrice: number;
  saleDate: Date;
  location: string;
  distance: number;
  similarityScore: number;
}

export interface SalvageValuation {
  vehicleId: string;
  vin: string;
  salvageValue: number;
  estimatedRecovery: number;
  valuationDate: Date;
  salvageType: 'repairable' | 'parts_only' | 'scrap' | 'export';
  bids?: SalvageBid[];
  estimatedTimeToSell: number;
  notes: string;
}

export interface SalvageBid {
  bidderId: string;
  bidderName: string;
  bidAmount: number;
  bidDate: Date;
  terms: string;
  pickupLocation: string;
}

export interface TotalLossAnalysis {
  isTotalLoss: boolean;
  confidence: number;
  acv: number;
  estimatedRepairCost: number;
  salvageValue: number;
  state: string;
  stateThreshold: number;
  actualThresholdPercent: number;
  totalLossFormula: string;
  ownerRetainSalvage: {
    allowed: boolean;
    salvageDeduction: number;
    netSettlement: number;
  };
  settlement: {
    acv: number;
    salesTax: number;
    titleFees: number;
    otherFees: number;
    totalBeforeSalvage: number;
    salvageDeduction: number;
    netSettlement: number;
  };
  recommendations: string[];
}

export interface ValuationRequest {
  vehicle: VehicleData;
  lossDate: Date;
  lossState: string;
  mileage: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  estimatedRepairCost?: number;
  ownerRetainsSalvage?: boolean;
}

export class ValuationAPIService {
  private nadaEndpoint: string;
  private kbbEndpoint: string;
  private blackBookEndpoint: string;
  private salvageNetwork: string;
  private nadaApiKey: string;
  private kbbApiKey: string;

  constructor(config?: {
    nadaEndpoint?: string;
    kbbEndpoint?: string;
    blackBookEndpoint?: string;
    salvageNetwork?: string;
    nadaApiKey?: string;
    kbbApiKey?: string;
  }) {
    this.nadaEndpoint = config?.nadaEndpoint || process.env.NADA_API_ENDPOINT || 'https://api.nada.com/v1';
    this.kbbEndpoint = config?.kbbEndpoint || process.env.KBB_API_ENDPOINT || 'https://api.kbb.com/v1';
    this.blackBookEndpoint = config?.blackBookEndpoint || process.env.BLACKBOOK_API_ENDPOINT || 'https://api.blackbook.com/v1';
    this.salvageNetwork = config?.salvageNetwork || process.env.SALVAGE_NETWORK_API || 'https://api.salvage-network.com/v1';
    this.nadaApiKey = config?.nadaApiKey || process.env.NADA_API_KEY || '';
    this.kbbApiKey = config?.kbbApiKey || process.env.KBB_API_KEY || '';
  }

  async getACVValuation(request: ValuationRequest): Promise<ACVValuation> {
    // Check cache first
    const cacheKey = acvCache.generateKey(request.vehicle.vin, request.mileage, request.condition);
    const cached = acvCache.get(cacheKey);
    if (cached) {
      await auditLog({
        action: 'ACV_VALUATION_CACHE_HIT',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { acv: cached.acv, source: 'cache' },
      });
      return cached;
    }

    try {
      await auditLog({
        action: 'ACV_VALUATION_START',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { year: request.vehicle.year, make: request.vehicle.make, model: request.vehicle.model },
      });

      const valuations = await Promise.allSettled([
        this.getNADAValuation(request),
        this.getKBBValuation(request),
      ]);

      const successfulValuations = valuations
        .filter((result): result is PromiseFulfilledResult<ACVValuation> => result.status === 'fulfilled')
        .map(result => result.value);

      if (successfulValuations.length === 0) {
        console.warn('All external valuations failed, using internal calculation');
        const internalValuation = await this.getInternalValuation(request);
        acvCache.set(cacheKey, internalValuation);
        return internalValuation;
      }

      const selectedValuation = this.selectBestValuation(successfulValuations);

      // Store in cache
      acvCache.set(cacheKey, selectedValuation);

      await auditLog({
        action: 'ACV_VALUATION_COMPLETE',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { acv: selectedValuation.acv, source: selectedValuation.valuationSource, confidence: selectedValuation.confidence },
      });

      return selectedValuation;
    } catch (error) {
      await auditLog({
        action: 'ACV_VALUATION_ERROR',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
  }

  async getSalvageValuation(vehicle: VehicleData, acv: number): Promise<SalvageValuation> {
    // Check cache first (key based on VIN and ACV bucket)
    const cacheKey = `${vehicle.vin}:${Math.floor(acv / 1000)}`;
    const cached = salvageCache.get(cacheKey);
    if (cached) {
      await auditLog({
        action: 'SALVAGE_VALUATION_CACHE_HIT',
        entityType: 'vehicle',
        entityId: vehicle.vin,
        metadata: { salvageValue: cached.salvageValue, source: 'cache' },
      });
      return cached;
    }

    try {
      await auditLog({
        action: 'SALVAGE_VALUATION_START',
        entityType: 'vehicle',
        entityId: vehicle.vin,
        metadata: { acv },
      });

      const response = await fetch(`${this.salvageNetwork}/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SALVAGE_API_KEY}`,
        },
        body: JSON.stringify({
          vin: vehicle.vin,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          acv,
        }),
      });

      if (!response.ok) {
        throw new Error(`Salvage API returned status ${response.status}`);
      }

      const data = await response.json();

      const valuation: SalvageValuation = {
        vehicleId: vehicle.vin,
        vin: vehicle.vin,
        salvageValue: data.estimatedValue || this.estimateSalvageValue(acv),
        estimatedRecovery: data.estimatedRecovery || this.estimateSalvageValue(acv) * 0.9,
        valuationDate: new Date(),
        salvageType: this.determineSalvageType(vehicle, acv),
        bids: data.bids || [],
        estimatedTimeToSell: data.timeToSell || 30,
        notes: data.notes || 'Estimated based on similar vehicles',
      };

      // Store in cache
      salvageCache.set(cacheKey, valuation);

      await auditLog({
        action: 'SALVAGE_VALUATION_COMPLETE',
        entityType: 'vehicle',
        entityId: vehicle.vin,
        metadata: { salvageValue: valuation.salvageValue, salvageType: valuation.salvageType },
      });

      return valuation;
    } catch (error) {
      console.warn('Salvage API unavailable, using estimate:', error);
      const fallbackValuation: SalvageValuation = {
        vehicleId: vehicle.vin,
        vin: vehicle.vin,
        salvageValue: this.estimateSalvageValue(acv),
        estimatedRecovery: this.estimateSalvageValue(acv) * 0.9,
        valuationDate: new Date(),
        salvageType: this.determineSalvageType(vehicle, acv),
        estimatedTimeToSell: 30,
        notes: 'Estimated - salvage network unavailable',
      };
      // Cache fallback too to avoid repeated failed API calls
      salvageCache.set(cacheKey, fallbackValuation);
      return fallbackValuation;
    }
  }

  async analyzeTotalLoss(request: ValuationRequest): Promise<TotalLossAnalysis> {
    try {
      await auditLog({
        action: 'TOTAL_LOSS_ANALYSIS_START',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { estimatedRepairCost: request.estimatedRepairCost },
      });

      const acvValuation = await this.getACVValuation(request);
      const salvageValuation = await this.getSalvageValuation(request.vehicle, acvValuation.acv);
      const stateThreshold = STATE_TOTAL_LOSS_THRESHOLDS[request.lossState] || 0.75;
      const totalLossThresholdAmount = acvValuation.acv * stateThreshold;

      const estimatedRepairCost = request.estimatedRepairCost || 0;
      const isTotalLoss = estimatedRepairCost >= totalLossThresholdAmount;
      const actualThresholdPercent = (estimatedRepairCost / acvValuation.acv) * 100;

      const salesTax = this.calculateSalesTax(acvValuation.acv, request.lossState);
      const titleFees = this.calculateTitleFees(request.lossState);
      const otherFees = 50;

      const totalBeforeSalvage = acvValuation.acv + salesTax + titleFees + otherFees;
      const salvageDeduction = request.ownerRetainsSalvage ? salvageValuation.salvageValue : 0;
      const netSettlement = totalBeforeSalvage - salvageDeduction;

      const recommendations: string[] = [];

      if (isTotalLoss) {
        recommendations.push('Declare total loss and initiate settlement process');
        recommendations.push('Obtain owner signature on title/transfer documents');
        recommendations.push('Arrange vehicle pickup or owner retention');
        recommendations.push('Process payment within state-mandated timeframe');
      } else {
        recommendations.push('Proceed with repair authorization');
        recommendations.push('Monitor repair progress for supplemental damage');
        recommendations.push('Consider diminished value claim exposure');
      }

      if (actualThresholdPercent > 60) {
        recommendations.push('Repair cost approaching threshold - monitor closely');
      }

      const analysis: TotalLossAnalysis = {
        isTotalLoss,
        confidence: acvValuation.confidence,
        acv: acvValuation.acv,
        estimatedRepairCost,
        salvageValue: salvageValuation.salvageValue,
        state: request.lossState,
        stateThreshold,
        actualThresholdPercent: Math.round(actualThresholdPercent * 100) / 100,
        totalLossFormula: `Repair Cost ($${estimatedRepairCost}) ${isTotalLoss ? '>=' : '<'} ACV ($${acvValuation.acv}) × ${stateThreshold * 100}% = $${totalLossThresholdAmount.toFixed(0)}`,
        ownerRetainSalvage: {
          allowed: this.isOwnerRetainAllowed(request.lossState),
          salvageDeduction: salvageValuation.salvageValue,
          netSettlement: totalBeforeSalvage - salvageValuation.salvageValue,
        },
        settlement: {
          acv: acvValuation.acv,
          salesTax,
          titleFees,
          otherFees,
          totalBeforeSalvage,
          salvageDeduction,
          netSettlement,
        },
        recommendations,
      };

      await auditLog({
        action: 'TOTAL_LOSS_ANALYSIS_COMPLETE',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { isTotalLoss, acv: acvValuation.acv, estimatedRepairCost, actualThresholdPercent },
      });

      return analysis;
    } catch (error) {
      await auditLog({
        action: 'TOTAL_LOSS_ANALYSIS_ERROR',
        entityType: 'vehicle',
        entityId: request.vehicle.vin,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
  }

  private async getNADAValuation(request: ValuationRequest): Promise<ACVValuation> {
    const response = await fetch(`${this.nadaEndpoint}/valuation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.nadaApiKey}`,
      },
      body: JSON.stringify({
        vin: request.vehicle.vin,
        mileage: request.mileage,
        condition: request.condition,
        zip: request.vehicle.state || '90210',
      }),
    });

    if (!response.ok) {
      throw new Error(`NADA API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      vehicleId: request.vehicle.vin,
      vin: request.vehicle.vin,
      acv: data.cleanTradeIn || data.averageTradeIn || 20000,
      valuationDate: new Date(),
      valuationSource: 'nada',
      confidence: 90,
      breakdown: {
        baseValue: data.baseValue || 18000,
        mileageAdjustment: data.mileageAdjustment || -500,
        conditionAdjustment: data.conditionAdjustment || 500,
        optionsAdjustment: data.optionsAdjustment || 1000,
        regionalAdjustment: data.regionalAdjustment || 500,
        marketAdjustment: data.marketAdjustment || 500,
      },
      comparables: data.comparables || [],
      methodologyNotes: 'NADA Clean Trade-In value adjusted for mileage and condition',
    };
  }

  private async getKBBValuation(request: ValuationRequest): Promise<ACVValuation> {
    const response = await fetch(`${this.kbbEndpoint}/valuation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.kbbApiKey}`,
      },
      body: JSON.stringify({
        vin: request.vehicle.vin,
        mileage: request.mileage,
        condition: request.condition,
        zip: request.vehicle.state || '90210',
      }),
    });

    if (!response.ok) {
      throw new Error(`KBB API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      vehicleId: request.vehicle.vin,
      vin: request.vehicle.vin,
      acv: data.fairMarketValue || 21000,
      valuationDate: new Date(),
      valuationSource: 'kbb',
      confidence: 92,
      breakdown: {
        baseValue: data.baseValue || 19000,
        mileageAdjustment: data.mileageAdjustment || -600,
        conditionAdjustment: data.conditionAdjustment || 600,
        optionsAdjustment: data.optionsAdjustment || 1100,
        regionalAdjustment: data.regionalAdjustment || 450,
        marketAdjustment: data.marketAdjustment || 450,
      },
      comparables: data.comparables || [],
      methodologyNotes: 'KBB Fair Market Range - typical selling price',
    };
  }

  private async getInternalValuation(request: ValuationRequest): Promise<ACVValuation> {
    const baseValue = 20000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - request.vehicle.year;
    const depreciationRate = 0.15;
    const acv = baseValue * Math.pow(1 - depreciationRate, age);

    const avgMileagePerYear = 12000;
    const expectedMileage = age * avgMileagePerYear;
    const mileageDiff = request.mileage - expectedMileage;
    const mileageAdjustment = (mileageDiff / 1000) * -25;

    const conditionAdjustments = { excellent: 500, good: 0, fair: -500, poor: -1500 };
    const conditionAdjustment = conditionAdjustments[request.condition];
    const finalACV = Math.max(acv + mileageAdjustment + conditionAdjustment, 500);

    return {
      vehicleId: request.vehicle.vin,
      vin: request.vehicle.vin,
      acv: Math.round(finalACV),
      valuationDate: new Date(),
      valuationSource: 'internal',
      confidence: 70,
      breakdown: {
        baseValue: Math.round(acv),
        mileageAdjustment: Math.round(mileageAdjustment),
        conditionAdjustment,
        optionsAdjustment: 0,
        regionalAdjustment: 0,
        marketAdjustment: 0,
      },
      comparables: [],
      methodologyNotes: 'Internal depreciation model - external sources unavailable',
    };
  }

  private selectBestValuation(valuations: ACVValuation[]): ACVValuation {
    const external = valuations.filter(v => v.valuationSource !== 'internal');
    if (external.length > 0) {
      return external.reduce((best, current) => current.confidence > best.confidence ? current : best);
    }
    return valuations[0];
  }

  private estimateSalvageValue(acv: number): number {
    return Math.round(acv * 0.25);
  }

  private determineSalvageType(vehicle: VehicleData, acv: number): 'repairable' | 'parts_only' | 'scrap' | 'export' {
    const currentYear = new Date().getFullYear();
    const age = currentYear - vehicle.year;
    if (acv > 10000 && age < 10) return 'repairable';
    if (acv > 5000 && age < 15) return 'parts_only';
    return 'scrap';
  }

  private calculateSalesTax(acv: number, state: string): number {
    const taxRates: Record<string, number> = {
      CA: 0.0725, TX: 0.0625, FL: 0.06, NY: 0.04,
    };
    const taxRate = taxRates[state] || 0.06;
    return Math.round(acv * taxRate);
  }

  private calculateTitleFees(state: string): number {
    const titleFees: Record<string, number> = {
      CA: 15, TX: 33, FL: 77.25, NY: 50,
    };
    return titleFees[state] || 50;
  }

  private isOwnerRetainAllowed(state: string): boolean {
    const allowedStates = ['CA', 'TX', 'FL', 'NY'];
    return allowedStates.includes(state);
  }
}

export const valuationAPI = new ValuationAPIService();

// Thin wrappers for simplified consumers
export async function getACV(args: {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  odometer?: number;
  zip?: string;
}) {
  const req: any = {
    vehicle: {
      vin: args.vin,
      year: args.year,
      make: args.make,
      model: args.model,
      trim: args.trim,
      mileage: args.odometer ?? 0,
      condition: 'good',
    },
    lossDate: new Date(),
    lossState: 'CA',
    mileage: args.odometer ?? 0,
    condition: 'good',
  };

  const res = await valuationAPI.getACVValuation(req);
  return {
    value: res.acv,
    baseValue: res.breakdown.baseValue,
    mileageAdjustment: res.breakdown.mileageAdjustment,
    conditionAdjustment: res.breakdown.conditionAdjustment,
    marketAdjustment: res.breakdown.marketAdjustment,
    source: res.valuationSource,
    confidence: res.confidence,
  };
}

export async function getSalvageValue(args: { vin: string; condition: string }) {
  // Derive ACV first for estimation
  const acvRes = await getACV({ vin: args.vin, year: new Date().getFullYear() - 5, make: 'UNKNOWN', model: 'UNKNOWN', odometer: 60000 });
  const vehicle: any = { vin: args.vin, year: new Date().getFullYear() - 5, make: 'UNKNOWN', model: 'UNKNOWN', mileage: 60000 };
  const salv = await valuationAPI.getSalvageValuation(vehicle, acvRes.value);
  return {
    value: salv.salvageValue,
    estimatedRecovery: salv.estimatedRecovery,
    source: salv.salvageType,
  };
}

