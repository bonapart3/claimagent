// Mock Vehicle Valuation Service

export interface MockValuationResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage?: number;
  acv: number; // Actual Cash Value in cents
  salvageValue: number; // in cents
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  source: string;
  confidence: number;
  comparables: Array<{
    price: number;
    mileage: number;
    condition: string;
    source: string;
  }>;
}

const defaultMockValuation: MockValuationResult = {
  vin: '1HGBH41JXMN109186',
  year: 2021,
  make: 'Honda',
  model: 'Accord',
  trim: 'Sport',
  mileage: 35000,
  acv: 2500000, // $25,000 in cents
  salvageValue: 500000, // $5,000 in cents
  condition: 'GOOD',
  source: 'MockValuationAPI',
  confidence: 0.95,
  comparables: [
    { price: 2450000, mileage: 32000, condition: 'GOOD', source: 'Dealer1' },
    { price: 2550000, mileage: 38000, condition: 'GOOD', source: 'Dealer2' },
    { price: 2480000, mileage: 35000, condition: 'FAIR', source: 'Private' },
  ],
};

let mockValuation: MockValuationResult = { ...defaultMockValuation };

export const setMockValuation = (valuation: Partial<MockValuationResult>) => {
  mockValuation = { ...defaultMockValuation, ...valuation };
};

export const resetMockValuation = () => {
  mockValuation = { ...defaultMockValuation };
};

export const getVehicleValuation = jest.fn().mockImplementation(
  async (vin: string, mileage?: number): Promise<MockValuationResult> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ...mockValuation, vin, mileage: mileage || mockValuation.mileage };
  }
);

export const getACV = jest.fn().mockImplementation(
  async (vehicleInfo: { vin: string; year: number; make: string; model: string; mileage?: number }): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return mockValuation.acv;
  }
);

export const getSalvageValue = jest.fn().mockImplementation(
  async (vin: string): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return mockValuation.salvageValue;
  }
);

export const calculateTotalLossThreshold = jest.fn().mockImplementation(
  (acv: number, state: string): number => {
    // State-specific thresholds (simplified)
    const thresholds: Record<string, number> = {
      CA: 0.75,
      TX: 1.0, // Texas uses TDI formula
      NY: 0.75,
      FL: 0.80,
      DEFAULT: 0.75,
    };
    const threshold = thresholds[state] || thresholds.DEFAULT;
    return Math.round(acv * threshold);
  }
);
