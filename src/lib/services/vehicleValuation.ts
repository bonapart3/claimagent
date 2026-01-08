// src/lib/services/vehicleValuation.ts
// Vehicle Valuation Service

import { VehicleInfo } from '@/lib/types/claim';

interface ValuationResult {
  vehicleId: string;
  vin: string;
  baseValue: number;
  adjustedValue: number;
  adjustments: ValuationAdjustment[];
  sources: ValuationSource[];
  valuationDate: string;
  confidence: number;
  valueRange: {
    low: number;
    mid: number;
    high: number;
  };
}

interface ValuationAdjustment {
  type: string;
  description: string;
  amount: number;
  percentage?: number;
}

interface ValuationSource {
  name: string;
  value: number;
  date: string;
  weight: number;
}

// Base depreciation rates by vehicle age
const DEPRECIATION_RATES: Record<number, number> = {
  0: 0.00,  // New
  1: 0.20,  // 1 year old
  2: 0.35,
  3: 0.45,
  4: 0.52,
  5: 0.58,
  6: 0.63,
  7: 0.67,
  8: 0.70,
  9: 0.73,
  10: 0.75,
};

// Mileage adjustment per mile (after standard)
const MILEAGE_ADJUSTMENT_PER_MILE = 0.05;
const STANDARD_MILES_PER_YEAR = 12000;

// Condition adjustments
const CONDITION_ADJUSTMENTS: Record<string, number> = {
  EXCELLENT: 0.10,
  GOOD: 0.00,
  FAIR: -0.10,
  POOR: -0.25,
};

export class VehicleValuationService {
  async getValuation(
    vehicle: VehicleInfo,
    state: string
  ): Promise<ValuationResult> {
    const valuationDate = new Date().toISOString();
    const adjustments: ValuationAdjustment[] = [];

    // Get base MSRP (simulated - in production use actual data source)
    const baseMsrp = this.getBaseMsrp(vehicle);

    // Calculate age depreciation
    const age = new Date().getFullYear() - vehicle.year;
    const depreciationRate = DEPRECIATION_RATES[Math.min(age, 10)] || 0.75;
    const depreciatedValue = baseMsrp * (1 - depreciationRate);

    adjustments.push({
      type: 'DEPRECIATION',
      description: `${age} year depreciation at ${(depreciationRate * 100).toFixed(0)}%`,
      amount: -(baseMsrp - depreciatedValue),
      percentage: -depreciationRate * 100,
    });

    // Calculate mileage adjustment
    const expectedMiles = age * STANDARD_MILES_PER_YEAR;
    const mileageDiff = (vehicle.mileage || expectedMiles) - expectedMiles;
    const mileageAdjustment = -mileageDiff * MILEAGE_ADJUSTMENT_PER_MILE;

    if (mileageAdjustment !== 0) {
      adjustments.push({
        type: 'MILEAGE',
        description: `${Math.abs(mileageDiff).toLocaleString()} miles ${mileageDiff > 0 ? 'over' : 'under'} average`,
        amount: mileageAdjustment,
      });
    }

    // Apply condition adjustment
    const condition = vehicle.condition || 'GOOD';
    const conditionRate = CONDITION_ADJUSTMENTS[condition] || 0;
    const conditionAdjustment = depreciatedValue * conditionRate;

    if (conditionAdjustment !== 0) {
      adjustments.push({
        type: 'CONDITION',
        description: `${condition} condition adjustment`,
        amount: conditionAdjustment,
        percentage: conditionRate * 100,
      });
    }

    // Apply optional equipment adjustments
    if (vehicle.optionalEquipment && vehicle.optionalEquipment.length > 0) {
      const equipmentValue = this.calculateEquipmentValue(vehicle.optionalEquipment);
      adjustments.push({
        type: 'EQUIPMENT',
        description: `Optional equipment (${vehicle.optionalEquipment.length} items)`,
        amount: equipmentValue,
      });
    }

    // Calculate regional adjustment (California, luxury markets higher)
    const regionalAdjustment = this.getRegionalAdjustment(state, depreciatedValue);
    if (regionalAdjustment !== 0) {
      adjustments.push({
        type: 'REGIONAL',
        description: `${state} market adjustment`,
        amount: regionalAdjustment,
      });
    }

    // Calculate final value
    const totalAdjustments = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
    const adjustedValue = Math.max(500, depreciatedValue + totalAdjustments);

    // Get comparison values (simulated)
    const sources = this.getValuationSources(vehicle, adjustedValue);

    // Calculate value range
    const valueRange = {
      low: Math.round(adjustedValue * 0.9),
      mid: Math.round(adjustedValue),
      high: Math.round(adjustedValue * 1.1),
    };

    return {
      vehicleId: vehicle.vin || `${vehicle.year}-${vehicle.make}-${vehicle.model}`,
      vin: vehicle.vin || '',
      baseValue: baseMsrp,
      adjustedValue: Math.round(adjustedValue),
      adjustments,
      sources,
      valuationDate,
      confidence: 0.85,
      valueRange,
    };
  }

  private getBaseMsrp(vehicle: VehicleInfo): number {
    // Simulated MSRP lookup - in production, use actual data sources
    const msrpByMake: Record<string, Record<string, number>> = {
      TOYOTA: { CAMRY: 26420, COROLLA: 21550, RAV4: 28475, HIGHLANDER: 36620 },
      HONDA: { ACCORD: 27295, CIVIC: 23950, CRV: 28410, PILOT: 38660 },
      FORD: { F150: 33695, ESCAPE: 28350, EXPLORER: 36760, MUSTANG: 29145 },
      CHEVROLET: { SILVERADO: 34600, EQUINOX: 27600, MALIBU: 25100, CAMARO: 27195 },
      BMW: { '3': 43300, '5': 55200, X3: 47000, X5: 62600 },
      MERCEDES: { C: 44600, E: 56650, GLC: 48300, GLE: 58900 },
      TESLA: { MODEL3: 42990, MODELY: 52990, MODELS: 94990, MODELX: 99990 },
      NISSAN: { ALTIMA: 25290, ROGUE: 29150, SENTRA: 20050, PATHFINDER: 35030 },
      HYUNDAI: { SONATA: 25100, TUCSON: 28750, ELANTRA: 21650, SANTA_FE: 30700 },
      KIA: { SPORTAGE: 29590, OPTIMA: 25290, SORENTO: 33590, TELLURIDE: 36190 },
    };

    const make = vehicle.make.toUpperCase();
    const model = vehicle.model.toUpperCase().replace(/\s+/g, '');

    // Look up specific model
    if (msrpByMake[make] && msrpByMake[make][model]) {
      return msrpByMake[make][model];
    }

    // Estimate based on make
    const makeAverages: Record<string, number> = {
      TOYOTA: 32000,
      HONDA: 31000,
      FORD: 38000,
      CHEVROLET: 35000,
      BMW: 55000,
      MERCEDES: 58000,
      TESLA: 65000,
      NISSAN: 28000,
      HYUNDAI: 27000,
      KIA: 30000,
      LEXUS: 50000,
      AUDI: 52000,
      VOLKSWAGEN: 32000,
      SUBARU: 30000,
      MAZDA: 28000,
      JEEP: 38000,
      RAM: 42000,
      GMC: 45000,
      ACURA: 42000,
      INFINITI: 48000,
    };

    return makeAverages[make] || 30000;
  }

  private calculateEquipmentValue(equipment: string[]): number {
    const equipmentValues: Record<string, number> = {
      'NAVIGATION': 1500,
      'SUNROOF': 1200,
      'LEATHER': 2000,
      'PREMIUM_AUDIO': 800,
      'HEATED_SEATS': 500,
      'REMOTE_START': 400,
      'BACKUP_CAMERA': 300,
      'BLIND_SPOT': 500,
      'LANE_ASSIST': 600,
      'ADAPTIVE_CRUISE': 800,
      'PARKING_SENSORS': 400,
      'APPLE_CARPLAY': 300,
      'ANDROID_AUTO': 300,
      'THIRD_ROW': 2500,
      'TOW_PACKAGE': 1000,
      '4WD': 3000,
      'AWD': 2500,
      'SPORT_PACKAGE': 2000,
    };

    // Equipment depreciates faster - use 40% of value
    return equipment.reduce((sum, item) => {
      const value = equipmentValues[item.toUpperCase()] || 300;
      return sum + (value * 0.4);
    }, 0);
  }

  private getRegionalAdjustment(state: string, baseValue: number): number {
    const regionalFactors: Record<string, number> = {
      CA: 0.05,   // California premium
      NY: 0.03,   // New York premium
      FL: 0.02,   // Florida premium
      TX: 0.00,   // Texas baseline
      AZ: -0.02,  // Arizona discount
      NV: 0.01,
      WA: 0.03,
      OR: 0.02,
      CO: 0.02,
      MA: 0.03,
      NJ: 0.02,
      IL: 0.01,
      PA: 0.00,
      OH: -0.02,
      MI: -0.03,  // Michigan lower (more used car supply)
    };

    const factor = regionalFactors[state] || 0;
    return baseValue * factor;
  }

  private getValuationSources(vehicle: VehicleInfo, estimatedValue: number): ValuationSource[] {
    // Simulated comparison sources
    const variance = () => (Math.random() - 0.5) * 0.1; // +/- 5%

    return [
      {
        name: 'Kelley Blue Book',
        value: Math.round(estimatedValue * (1 + variance())),
        date: new Date().toISOString(),
        weight: 0.30,
      },
      {
        name: 'NADA',
        value: Math.round(estimatedValue * (1 + variance())),
        date: new Date().toISOString(),
        weight: 0.25,
      },
      {
        name: 'Edmunds',
        value: Math.round(estimatedValue * (1 + variance())),
        date: new Date().toISOString(),
        weight: 0.20,
      },
      {
        name: 'Black Book',
        value: Math.round(estimatedValue * (1 + variance())),
        date: new Date().toISOString(),
        weight: 0.15,
      },
      {
        name: 'Local Market Comparison',
        value: Math.round(estimatedValue * (1 + variance())),
        date: new Date().toISOString(),
        weight: 0.10,
      },
    ];
  }

  // Calculate total loss threshold by state
  getTotalLossThreshold(state: string): number {
    const thresholds: Record<string, number> = {
      AL: 0.75, AK: 0.80, AZ: 0.65, AR: 0.70, CA: 0.80,
      CO: 1.00, CT: 0.80, DE: 0.75, FL: 0.80, GA: 0.75,
      HI: 0.75, ID: 0.80, IL: 0.80, IN: 0.70, IA: 0.50,
      KS: 0.75, KY: 0.75, LA: 0.75, ME: 0.75, MD: 0.75,
      MA: 0.75, MI: 0.75, MN: 0.70, MS: 0.75, MO: 0.80,
      MT: 0.75, NE: 0.75, NV: 0.65, NH: 0.75, NJ: 0.80,
      NM: 0.75, NY: 0.75, NC: 0.75, ND: 0.75, OH: 0.80,
      OK: 0.60, OR: 0.80, PA: 0.80, RI: 0.75, SC: 0.75,
      SD: 0.75, TN: 0.75, TX: 1.00, UT: 0.75, VT: 0.80,
      VA: 0.75, WA: 0.80, WV: 0.75, WI: 0.70, WY: 0.75,
    };

    return thresholds[state] || 0.75;
  }

  // Determine if vehicle is total loss
  isTotalLoss(
    vehicle: VehicleInfo,
    repairCost: number,
    salvageValue: number,
    state: string
  ): { isTotalLoss: boolean; method: string; calculation: string } {
    const threshold = this.getTotalLossThreshold(state);

    // Get vehicle value
    // In production, this would be async - simplified for sync use
    const estimatedValue = this.getBaseMsrp(vehicle) * (1 - (DEPRECIATION_RATES[Math.min(new Date().getFullYear() - vehicle.year, 10)] || 0.75));

    if (threshold === 1.00) {
      // Total Loss Formula (TLF) states: repair cost + salvage > value
      const tlf = repairCost + salvageValue;
      const isTotalLoss = tlf > estimatedValue;
      return {
        isTotalLoss,
        method: 'Total Loss Formula (TLF)',
        calculation: `Repair ($${repairCost.toLocaleString()}) + Salvage ($${salvageValue.toLocaleString()}) = $${tlf.toLocaleString()} ${isTotalLoss ? '>' : '<='} Value ($${estimatedValue.toLocaleString()})`,
      };
    } else {
      // Threshold method: repair cost > (threshold * value)
      const thresholdValue = estimatedValue * threshold;
      const isTotalLoss = repairCost > thresholdValue;
      return {
        isTotalLoss,
        method: `${(threshold * 100).toFixed(0)}% Threshold`,
        calculation: `Repair ($${repairCost.toLocaleString()}) ${isTotalLoss ? '>' : '<='} ${(threshold * 100).toFixed(0)}% of Value ($${thresholdValue.toLocaleString()})`,
      };
    }
  }
}

export const vehicleValuation = new VehicleValuationService();

