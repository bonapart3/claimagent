// Mock AI Damage Analysis Service

export interface MockDamageResult {
  damageAreas: Array<{
    area: string;
    component: string;
    severity: 'MINOR' | 'MODERATE' | 'SEVERE' | 'TOTAL';
    estimatedCost: number;
    confidence: number;
  }>;
  totalEstimate: number;
  isTotalLoss: boolean;
  confidence: number;
  requiresHumanReview: boolean;
  flags: string[];
}

const defaultMockResult: MockDamageResult = {
  damageAreas: [
    {
      area: 'Front',
      component: 'Bumper',
      severity: 'MODERATE',
      estimatedCost: 85000, // $850 in cents
      confidence: 0.92,
    },
    {
      area: 'Front',
      component: 'Hood',
      severity: 'MINOR',
      estimatedCost: 45000, // $450 in cents
      confidence: 0.88,
    },
  ],
  totalEstimate: 130000, // $1,300 in cents
  isTotalLoss: false,
  confidence: 0.9,
  requiresHumanReview: false,
  flags: [],
};

let mockResult: MockDamageResult = { ...defaultMockResult };

export const setMockDamageResult = (result: Partial<MockDamageResult>) => {
  mockResult = { ...defaultMockResult, ...result };
};

export const resetMockDamageResult = () => {
  mockResult = { ...defaultMockResult };
};

export const analyzeDamageFromPhotos = jest.fn().mockImplementation(
  async (photos: string[]): Promise<MockDamageResult> => {
    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 10));
    return mockResult;
  }
);

export const analyzeVehicleDamage = jest.fn().mockImplementation(
  async (imageUrl: string): Promise<MockDamageResult> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return mockResult;
  }
);

export const estimateRepairCost = jest.fn().mockImplementation(
  async (damageDescription: string, vehicleInfo: any): Promise<number> => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return mockResult.totalEstimate;
  }
);

export const detectTotalLoss = jest.fn().mockImplementation(
  async (damageEstimate: number, vehicleACV: number, state: string): Promise<boolean> => {
    // Use state-specific thresholds (simplified)
    const threshold = 0.75; // Default 75%
    return damageEstimate / vehicleACV >= threshold;
  }
);
