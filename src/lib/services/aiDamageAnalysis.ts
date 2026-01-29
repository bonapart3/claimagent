/**
 * AI Damage Analysis Service
 * Multimodal AI for vehicle damage assessment, repair cost estimation, and total loss determination
 * Integrates with computer vision models and historical repair data
 * 
 * @module services/aiDamageAnalysis
 */

import { DamageAssessment, VehicleData } from '../types/claim';
import { auditLog } from '../utils/auditLogger';

// Local type definitions for this service
type VehicleInfo = VehicleData;

interface ClaimEvidence {
  photos: DamagePhoto[];
  documents: string[];
  statements: string[];
}

interface RepairEstimate {
  laborCost: number;
  partsCost: number;
  paintCost: number;
  totalCost: number;
  estimatedRepairDays: number;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DamagePhoto {
  url: string;
  timestamp: Date;
  gpsLocation?: {
    latitude: number;
    longitude: number;
  };
  metadata: {
    deviceType?: string;
    originalFileName: string;
    fileSize: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

export interface DamagePoint {
  location: string; // e.g., "front_bumper", "driver_door", "hood"
  severity: 'minor' | 'moderate' | 'severe' | 'structural';
  damageTypes: Array<'scratch' | 'dent' | 'crack' | 'paint' | 'panel' | 'glass' | 'structural'>;
  estimatedCost: {
    min: number;
    max: number;
    average: number;
  };
  confidence: number; // 0-100
  requiresInspection: boolean;
  notes: string;
}

export interface AIDamageAnalysisResult {
  analysisId: string;
  timestamp: Date;
  overallSeverity: 'minor' | 'moderate' | 'severe' | 'total_loss';
  totalEstimatedCost: {
    min: number;
    max: number;
    average: number;
  };
  damagePoints: DamagePoint[];
  confidenceScore: number; // 0-100
  totalLossIndicators: {
    isTotalLoss: boolean;
    confidence: number;
    factors: string[];
    acvThreshold?: number;
    estimatedRepairCost?: number;
  };
  airbagDeployment: {
    detected: boolean;
    confidence: number;
    locations?: string[];
  };
  structuralDamage: {
    detected: boolean;
    confidence: number;
    areas?: string[];
  };
  sensorZones: {
    affected: boolean;
    zones: Array<{
      name: string;
      likelihood: number;
      repairCost: number;
    }>;
  };
  recommendedActions: string[];
  requiresHumanReview: boolean;
  humanReviewReasons: string[];
}

export interface RepairCostEstimate {
  parts: Array<{
    partName: string;
    partNumber?: string;
    oem: boolean;
    aftermarket: boolean;
    quantity: number;
    unitCost: number;
    totalCost: number;
    availability: 'in_stock' | 'order' | 'backorder' | 'discontinued';
  }>;
  labor: {
    hours: number;
    rate: number;
    total: number;
  };
  paintMaterials: {
    cost: number;
    hours: number;
  };
  sublet: Array<{
    service: string;
    cost: number;
  }>;
  taxes: number;
  fees: number;
  subtotal: number;
  total: number;
}

// ============================================================================
// DAMAGE ANALYSIS ENGINE
// ============================================================================

export class AIDamageAnalysisService {
  private modelEndpoint: string;
  private apiKey: string;
  private historicalDataSource: string;
  analyze: any;

  constructor(config?: {
    modelEndpoint?: string;
    apiKey?: string;
    historicalDataSource?: string;
  }) {
    this.modelEndpoint = config?.modelEndpoint || process.env.AI_DAMAGE_MODEL_ENDPOINT || 'https://api.claimagent.io/v1/damage-analysis';
    this.apiKey = config?.apiKey || process.env.AI_DAMAGE_API_KEY || '';
    this.historicalDataSource = config?.historicalDataSource || 'internal';
  }

  /**
   * Analyze vehicle damage from photos
   * Main entry point for AI damage assessment
   */
  async analyzeDamage(
    photos: DamagePhoto[],
    vehicleInfo: VehicleInfo,
    claimId: string
  ): Promise<AIDamageAnalysisResult> {
    try {
      await auditLog({
        action: 'AI_DAMAGE_ANALYSIS_START',
        entityType: 'claim',
        entityId: claimId,
        metadata: {
          photoCount: photos.length,
          vin: vehicleInfo.vin,
        },
      });

      // Validate inputs
      this.validateInputs(photos, vehicleInfo);

      // Step 1: Image preprocessing and quality check
      const processedPhotos = await this.preprocessImages(photos);

      // Step 2: Run multimodal AI analysis
      const aiResults = await this.runAIModel(processedPhotos, vehicleInfo);

      // Step 3: Extract damage points
      const damagePoints = await this.extractDamagePoints(aiResults, vehicleInfo);

      // Step 4: Estimate repair costs
      const costEstimate = await this.estimateRepairCosts(damagePoints, vehicleInfo);

      // Step 5: Check for total loss indicators
      const totalLossAnalysis = await this.analyzeTotalLoss(costEstimate, vehicleInfo);

      // Step 6: Detect safety features and sensors
      const sensorAnalysis = await this.analyzeSensorZones(damagePoints, vehicleInfo);

      // Step 7: Check for airbag deployment
      const airbagAnalysis = await this.detectAirbagDeployment(processedPhotos, aiResults);

      // Step 8: Detect structural damage
      const structuralAnalysis = await this.detectStructuralDamage(damagePoints, aiResults);

      // Step 9: Determine if human review is required
      const { requiresReview, reasons } = this.determineHumanReviewRequirement(
        damagePoints,
        totalLossAnalysis,
        sensorAnalysis,
        airbagAnalysis,
        structuralAnalysis,
        aiResults.confidenceScore
      );

      // Step 10: Generate recommendations
      const recommendations = this.generateRecommendations(
        damagePoints,
        totalLossAnalysis,
        sensorAnalysis,
        structuralAnalysis
      );

      const result: AIDamageAnalysisResult = {
        analysisId: `AI-${Date.now()}-${claimId}`,
        timestamp: new Date(),
        overallSeverity: this.calculateOverallSeverity(damagePoints),
        totalEstimatedCost: costEstimate,
        damagePoints,
        confidenceScore: aiResults.confidenceScore,
        totalLossIndicators: totalLossAnalysis,
        airbagDeployment: airbagAnalysis,
        structuralDamage: structuralAnalysis,
        sensorZones: sensorAnalysis,
        recommendedActions: recommendations,
        requiresHumanReview: requiresReview,
        humanReviewReasons: reasons,
      };

      await auditLog({
        action: 'AI_DAMAGE_ANALYSIS_COMPLETE',
        entityType: 'claim',
        entityId: claimId,
        metadata: {
          analysisId: result.analysisId,
          severity: result.overallSeverity,
          estimatedCost: result.totalEstimatedCost.average,
          requiresHumanReview: result.requiresHumanReview,
        },
      });

      return result;
    } catch (error) {
      await auditLog({
        action: 'AI_DAMAGE_ANALYSIS_ERROR',
        entityType: 'claim',
        entityId: claimId,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      throw error;
    }
  }

  /**
   * Validate input data
   */
  private validateInputs(photos: DamagePhoto[], vehicleInfo: VehicleInfo): void {
    if (!photos || photos.length === 0) {
      throw new Error('At least one damage photo is required for AI analysis');
    }

    if (photos.length > 50) {
      throw new Error('Maximum 50 photos allowed per analysis');
    }

    if (!vehicleInfo.vin || vehicleInfo.vin.length !== 17) {
      throw new Error('Valid 17-character VIN is required');
    }

    if (!vehicleInfo.year || vehicleInfo.year < 1980 || vehicleInfo.year > new Date().getFullYear() + 1) {
      throw new Error('Valid vehicle year is required');
    }
  }

  /**
   * Preprocess images for AI analysis
   */
  private async preprocessImages(photos: DamagePhoto[]): Promise<DamagePhoto[]> {
    const processed: DamagePhoto[] = [];

    for (const photo of photos) {
      // Quality check
      if (photo.metadata.fileSize > 10 * 1024 * 1024) {
        throw new Error(`Photo ${photo.metadata.originalFileName} exceeds 10MB limit`);
      }

      // TODO: Implement actual image preprocessing (resize, normalize, etc.)
      // For now, pass through
      processed.push(photo);
    }

    return processed;
  }

  /**
   * Run multimodal AI model
   */
  private async runAIModel(
    photos: DamagePhoto[],
    vehicleInfo: VehicleInfo
  ): Promise<{
    confidenceScore: number;
    rawPredictions: any[];
    metadata: any;
  }> {
    // In production, this would call actual AI model endpoint
    // For now, simulate with mock data

    const photoUrls = photos.map(p => p.url);

    try {
      // Simulated AI model call
      const response = await fetch(this.modelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          images: photoUrls,
          vehicle: {
            vin: vehicleInfo.vin,
            year: vehicleInfo.year,
            make: vehicleInfo.make,
            model: vehicleInfo.model,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI model returned status ${response.status}`);
      }

      const data = await response.json();

      return {
        confidenceScore: data.confidence || 85,
        rawPredictions: data.predictions || [],
        metadata: data.metadata || {},
      };
    } catch (error) {
      // Fallback to rule-based analysis if AI unavailable
      console.warn('AI model unavailable, using fallback analysis');
      return {
        confidenceScore: 60,
        rawPredictions: [],
        metadata: { fallback: true },
      };
    }
  }

  /**
   * Extract structured damage points from AI results
   */
  private async extractDamagePoints(
    aiResults: any,
    vehicleInfo: VehicleInfo
  ): Promise<DamagePoint[]> {
    const damagePoints: DamagePoint[] = [];

    // Parse AI predictions into structured damage points
    // This is a simplified implementation
    const commonDamageAreas = [
      'front_bumper',
      'hood',
      'driver_door',
      'passenger_door',
      'rear_bumper',
      'windshield',
    ];

    // Simulate damage detection (replace with actual AI parsing)
    const numDamagePoints = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numDamagePoints; i++) {
      const location = commonDamageAreas[Math.floor(Math.random() * commonDamageAreas.length)];
      const severity = this.randomSeverity();
      const damageTypes = this.randomDamageTypes();

      const estimatedCost = this.estimateDamagePointCost(location, severity, damageTypes);

      damagePoints.push({
        location,
        severity,
        damageTypes,
        estimatedCost,
        confidence: Math.floor(Math.random() * 20) + 80, // 80-100
        requiresInspection: severity === 'severe' || severity === 'structural',
        notes: `${severity.charAt(0).toUpperCase() + severity.slice(1)} damage detected on ${location.replace('_', ' ')}`,
      });
    }

    return damagePoints;
  }

  /**
   * Estimate repair costs based on damage points
   */
  private async estimateRepairCosts(
    damagePoints: DamagePoint[],
    vehicleInfo: VehicleInfo
  ): Promise<{ min: number; max: number; average: number }> {
    let totalMin = 0;
    let totalMax = 0;

    for (const point of damagePoints) {
      totalMin += point.estimatedCost.min;
      totalMax += point.estimatedCost.max;
    }

    // Add labor multiplier based on vehicle age
    const laborMultiplier = vehicleInfo.year > 2020 ? 1.2 : 1.0;
    totalMin *= laborMultiplier;
    totalMax *= laborMultiplier;

    return {
      min: Math.round(totalMin),
      max: Math.round(totalMax),
      average: Math.round((totalMin + totalMax) / 2),
    };
  }

  /**
   * Analyze if vehicle is a total loss
   */
  private async analyzeTotalLoss(
    costEstimate: { min: number; max: number; average: number },
    vehicleInfo: VehicleInfo
  ): Promise<{
    isTotalLoss: boolean;
    confidence: number;
    factors: string[];
    acvThreshold?: number;
    estimatedRepairCost?: number;
  }> {
    // Estimate ACV (Actual Cash Value)
    const estimatedACV = await this.estimateACV(vehicleInfo);

    // Get state-specific total loss threshold (typically 70-80%)
    const stateThreshold = this.getStateTotalLossThreshold(vehicleInfo.state || 'CA');
    const totalLossThreshold = estimatedACV * stateThreshold;

    const isTotalLoss = costEstimate.average > totalLossThreshold;
    const factors: string[] = [];

    if (costEstimate.average > estimatedACV * 0.7) {
      factors.push('Repair cost exceeds 70% of ACV');
    }

    if (costEstimate.average > totalLossThreshold) {
      factors.push(`Repair cost exceeds state threshold (${(stateThreshold * 100).toFixed(0)}%)`);
    }

    // Check vehicle age
    const currentYear = new Date().getFullYear();
    const vehicleAge = currentYear - vehicleInfo.year;
    if (vehicleAge > 10 && costEstimate.average > 5000) {
      factors.push('Vehicle age and repair cost indicate total loss');
    }

    return {
      isTotalLoss,
      confidence: isTotalLoss ? 85 : 95,
      factors,
      acvThreshold: totalLossThreshold,
      estimatedRepairCost: costEstimate.average,
    };
  }

  /**
   * Analyze sensor zones and ADAS systems
   */
  private async analyzeSensorZones(
    damagePoints: DamagePoint[],
    vehicleInfo: VehicleInfo
  ): Promise<{
    affected: boolean;
    zones: Array<{
      name: string;
      likelihood: number;
      repairCost: number;
    }>;
  }> {
    const zones: Array<{ name: string; likelihood: number; repairCost: number }> = [];

    // Check if vehicle has ADAS (2016+)
    if (vehicleInfo.year < 2016) {
      return { affected: false, zones: [] };
    }

    // Check damage points for sensor zone impact
    for (const point of damagePoints) {
      if (point.location.includes('front_bumper')) {
        zones.push({
          name: 'Front Radar',
          likelihood: 85,
          repairCost: 1200,
        });
        zones.push({
          name: 'Forward Collision Warning',
          likelihood: 75,
          repairCost: 800,
        });
      }

      if (point.location.includes('windshield')) {
        zones.push({
          name: 'Lane Departure Camera',
          likelihood: 90,
          repairCost: 1500,
        });
      }

      if (point.location.includes('rear_bumper')) {
        zones.push({
          name: 'Rear Parking Sensors',
          likelihood: 70,
          repairCost: 600,
        });
      }
    }

    return {
      affected: zones.length > 0,
      zones,
    };
  }

  /**
   * Detect airbag deployment from photos
   */
  private async detectAirbagDeployment(
    photos: DamagePhoto[],
    aiResults: any
  ): Promise<{
    detected: boolean;
    confidence: number;
    locations?: string[];
  }> {
    // In production, this would use computer vision
    // Simplified implementation
    const detected = Math.random() > 0.8; // 20% chance for demo

    if (detected) {
      return {
        detected: true,
        confidence: 92,
        locations: ['driver_front', 'passenger_front'],
      };
    }

    return {
      detected: false,
      confidence: 95,
    };
  }

  /**
   * Detect structural damage
   */
  private async detectStructuralDamage(
    damagePoints: DamagePoint[],
    aiResults: any
  ): Promise<{
    detected: boolean;
    confidence: number;
    areas?: string[];
  }> {
    const structuralPoints = damagePoints.filter(p => p.severity === 'structural');

    if (structuralPoints.length > 0) {
      return {
        detected: true,
        confidence: 88,
        areas: structuralPoints.map(p => p.location),
      };
    }

    return {
      detected: false,
      confidence: 90,
    };
  }

  /**
   * Determine if human review is required
   */
  private determineHumanReviewRequirement(
    damagePoints: DamagePoint[],
    totalLossAnalysis: any,
    sensorAnalysis: any,
    airbagAnalysis: any,
    structuralAnalysis: any,
    confidenceScore: number
  ): { requiresReview: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Low confidence
    if (confidenceScore < 75) {
      reasons.push('AI confidence below 75% threshold');
    }

    // Total loss
    if (totalLossAnalysis.isTotalLoss) {
      reasons.push('Potential total loss requires human evaluation');
    }

    // Airbag deployment
    if (airbagAnalysis.detected) {
      reasons.push('Airbag deployment detected - safety inspection required');
    }

    // Structural damage
    if (structuralAnalysis.detected) {
      reasons.push('Structural damage requires certified inspection');
    }

    // Sensor zones affected
    if (sensorAnalysis.affected && sensorAnalysis.zones.some((z: any) => z.likelihood > 70)) {
      reasons.push('ADAS sensor recalibration may be required');
    }

    // High severity
    if (damagePoints.some(p => p.severity === 'severe' || p.severity === 'structural')) {
      reasons.push('Severe damage requires adjuster inspection');
    }

    return {
      requiresReview: reasons.length > 0,
      reasons,
    };
  }

  /**
   * Generate action recommendations
   */
  private generateRecommendations(
    damagePoints: DamagePoint[],
    totalLossAnalysis: any,
    sensorAnalysis: any,
    structuralAnalysis: any
  ): string[] {
    const recommendations: string[] = [];

    if (totalLossAnalysis.isTotalLoss) {
      recommendations.push('Initiate total loss evaluation process');
      recommendations.push('Obtain salvage value quote');
      recommendations.push('Send total loss notification to insured');
    } else {
      recommendations.push('Obtain detailed repair estimate from approved shop');

      if (sensorAnalysis.affected) {
        recommendations.push('Include ADAS recalibration in repair estimate');
        recommendations.push('Use OEM parts for sensor mounting areas');
      }

      if (structuralAnalysis.detected) {
        recommendations.push('Require frame measurements before and after repair');
        recommendations.push('Consider diminished value assessment');
      }

      if (damagePoints.some(p => p.requiresInspection)) {
        recommendations.push('Schedule physical inspection before final approval');
      }
    }

    return recommendations;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private randomSeverity(): 'minor' | 'moderate' | 'severe' | 'structural' {
    const rand = Math.random();
    if (rand < 0.4) return 'minor';
    if (rand < 0.7) return 'moderate';
    if (rand < 0.9) return 'severe';
    return 'structural';
  }

  private randomDamageTypes(): Array<'scratch' | 'dent' | 'crack' | 'paint' | 'panel' | 'glass' | 'structural'> {
    const allTypes: Array<'scratch' | 'dent' | 'crack' | 'paint' | 'panel' | 'glass' | 'structural'> =
      ['scratch', 'dent', 'crack', 'paint', 'panel', 'glass', 'structural'];
    const numTypes = Math.floor(Math.random() * 3) + 1;
    return allTypes.slice(0, numTypes);
  }

  private estimateDamagePointCost(
    location: string,
    severity: string,
    damageTypes: string[]
  ): { min: number; max: number; average: number } {
    let baseMin = 200;
    let baseMax = 500;

    // Severity multiplier
    const severityMultipliers: Record<string, number> = {
      minor: 1,
      moderate: 2,
      severe: 4,
      structural: 8,
    };
    const multiplier = severityMultipliers[severity] || 1;

    // Location adjustment
    const locationMultipliers: Record<string, number> = {
      front_bumper: 1.2,
      hood: 1.5,
      windshield: 2.0,
      driver_door: 1.3,
      passenger_door: 1.3,
      rear_bumper: 1.1,
    };
    const locationMult = locationMultipliers[location] || 1;

    baseMin *= multiplier * locationMult;
    baseMax *= multiplier * locationMult;

    // Add for damage type variety
    baseMin += damageTypes.length * 100;
    baseMax += damageTypes.length * 200;

    return {
      min: Math.round(baseMin),
      max: Math.round(baseMax),
      average: Math.round((baseMin + baseMax) / 2),
    };
  }

  private calculateOverallSeverity(damagePoints: DamagePoint[]): 'minor' | 'moderate' | 'severe' | 'total_loss' {
    if (damagePoints.some(p => p.severity === 'structural')) {
      return 'total_loss';
    }
    if (damagePoints.some(p => p.severity === 'severe')) {
      return 'severe';
    }
    if (damagePoints.some(p => p.severity === 'moderate')) {
      return 'moderate';
    }
    return 'minor';
  }

  private async estimateACV(vehicleInfo: VehicleInfo): Promise<number> {
    // Simplified ACV calculation
    // In production, this would call valuation API
    const baseValue = 25000;
    const currentYear = new Date().getFullYear();
    const age = currentYear - vehicleInfo.year;
    const depreciationRate = 0.15; // 15% per year

    const acv = baseValue * Math.pow(1 - depreciationRate, age);
    return Math.max(acv, 1000); // Minimum $1000
  }

  private getStateTotalLossThreshold(state: string): number {
    const thresholds: Record<string, number> = {
      AL: 0.75,
      AK: 0.70,
      AZ: 0.70,
      CA: 0.75,
      FL: 0.80,
      TX: 0.70,
      NY: 0.75,
    };
    return thresholds[state] || 0.75; // Default 75%
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const aiDamageAnalysis = new AIDamageAnalysisService();
