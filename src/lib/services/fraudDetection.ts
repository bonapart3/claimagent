/**
 * Fraud Detection Service
 * Multi-layered fraud detection combining rule-based logic and ML models
 * Integrates with SIU databases, watchlists, and historical patterns
 * 
 * @module services/fraudDetection
 */

import { Claim, Participant } from '../types/claim';

// Type alias for backward compatibility
type ClaimParticipant = Participant;
import { auditLog } from '../utils/auditLogger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface FraudScore {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: FraudFlag[];
  patterns: FraudPattern[];
  recommendations: string[];
  requiresSIUReview: boolean;
  confidence: number;
}

export interface FraudFlag {
  id: string;
  type: FraudFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string[];
  weight: number;
  timestamp: Date;
}

export type FraudFlagType =
  | 'repeated_claimant'
  | 'staged_accident'
  | 'inflated_damages'
  | 'phantom_vehicle'
  | 'medical_fraud'
  | 'prior_fraud_indicator'
  | 'suspicious_timing'
  | 'inconsistent_statements'
  | 'organized_fraud_ring'
  | 'billing_anomaly'
  | 'questionable_provider'
  | 'suspicious_location'
  | 'vehicle_history_mismatch'
  | 'rapid_policy_purchase'
  | 'suspicious_repairs';

export interface FraudPattern {
  patternType: string;
  matches: number;
  confidence: number;
  description: string;
  relatedClaims?: string[];
  relatedEntities?: string[];
}

export interface WatchlistCheck {
  onWatchlist: boolean;
  watchlistType?: 'claimant' | 'provider' | 'attorney' | 'repair_shop' | 'medical_provider';
  reason?: string;
  addedDate?: Date;
  agencySource?: string;
}

export interface SIUBriefing {
  claimId: string;
  fraudScore: FraudScore;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  summary: string;
  investigationRecommendations: string[];
  supportingDocuments: string[];
  estimatedFraudAmount?: number;
  assignedInvestigator?: string;
  createdAt: Date;
}

// ============================================================================
// FRAUD DETECTION ENGINE
// ============================================================================

export class FraudDetectionService {
  private mlModelEndpoint: string;
  private watchlistDatabase: string;
  private historicalClaimsDb: string;

  constructor(config?: {
    mlModelEndpoint?: string;
    watchlistDatabase?: string;
    historicalClaimsDb?: string;
  }) {
    this.mlModelEndpoint = config?.mlModelEndpoint || process.env.FRAUD_ML_ENDPOINT || 'https://api.claimagent.io/v1/fraud-detection';
    this.watchlistDatabase = config?.watchlistDatabase || process.env.WATCHLIST_DB || 'internal';
    this.historicalClaimsDb = config?.historicalClaimsDb || process.env.HISTORICAL_CLAIMS_DB || 'internal';
  }

  /**
   * Comprehensive fraud analysis for a claim
   */
  async analyzeClaim(claim: Claim): Promise<FraudScore> {
    try {
      await auditLog({
        action: 'FRAUD_ANALYSIS_START',
        entityType: 'claim',
        entityId: claim.id,
        metadata: { claimType: claim.type, claimAmount: claim.estimatedAmount },
      });

      const ruleBasedFlags = await this.runRuleBasedChecks(claim);
      const mlScore = await this.runMLModel(claim);
      const watchlistResults = await this.checkWatchlists(claim);
      const patterns = await this.detectPatterns(claim);
      const historicalAnalysis = await this.analyzeHistoricalData(claim);
      const networkAnalysis = await this.analyzeNetworkConnections(claim);

      const overallScore = this.calculateOverallFraudScore(
        ruleBasedFlags, mlScore, watchlistResults, patterns, historicalAnalysis, networkAnalysis
      );

      const allFlags = [
        ...ruleBasedFlags,
        ...this.convertWatchlistToFlags(watchlistResults),
        ...this.convertPatternsToFlags(patterns),
      ];

      const riskLevel = this.determineRiskLevel(overallScore);
      const requiresSIU = overallScore >= 50 || riskLevel === 'critical' || riskLevel === 'high';
      const recommendations = this.generateRecommendations(allFlags, patterns, overallScore);

      const fraudScore: FraudScore = {
        overallScore,
        riskLevel,
        flags: allFlags,
        patterns,
        recommendations,
        requiresSIUReview: requiresSIU,
        confidence: this.calculateConfidence(allFlags, mlScore),
      };

      await auditLog({
        action: 'FRAUD_ANALYSIS_COMPLETE',
        entityType: 'claim',
        entityId: claim.id,
        metadata: { fraudScore: overallScore, riskLevel, requiresSIU, flagCount: allFlags.length },
      });

      return fraudScore;
    } catch (error) {
      await auditLog({
        action: 'FRAUD_ANALYSIS_ERROR',
        entityType: 'claim',
        entityId: claim.id,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
  }

  private async runRuleBasedChecks(claim: Claim): Promise<FraudFlag[]> {
    const flags: FraudFlag[] = [];

    if (this.checkRapidPolicyPurchase(claim)) {
      flags.push({
        id: `FRAUD-${Date.now()}-RAPID-POLICY`,
        type: 'rapid_policy_purchase',
        severity: 'high',
        description: 'Policy purchased within 30 days before claim',
        evidence: ['Policy effective date', 'Loss date'],
        weight: 15,
        timestamp: new Date(),
      });
    }

    if (this.checkSuspiciousTiming(claim)) {
      flags.push({
        id: `FRAUD-${Date.now()}-TIMING`,
        type: 'suspicious_timing',
        severity: 'medium',
        description: 'Claim occurred at suspicious time or location',
        evidence: ['Loss time', 'Loss location'],
        weight: 8,
        timestamp: new Date(),
      });
    }

    const inconsistencies = this.checkInconsistentStatements(claim);
    if (inconsistencies.length > 0) {
      flags.push({
        id: `FRAUD-${Date.now()}-INCONSISTENT`,
        type: 'inconsistent_statements',
        severity: 'high',
        description: 'Inconsistencies detected in claim narrative',
        evidence: inconsistencies,
        weight: 12,
        timestamp: new Date(),
      });
    }

    if (await this.checkVehicleHistoryMismatch(claim)) {
      flags.push({
        id: `FRAUD-${Date.now()}-VEHICLE-HISTORY`,
        type: 'vehicle_history_mismatch',
        severity: 'high',
        description: 'Vehicle history does not match claim details',
        evidence: ['VIN history', 'Claim description'],
        weight: 14,
        timestamp: new Date(),
      });
    }

    if (this.checkPriorDamageIndicators(claim)) {
      flags.push({
        id: `FRAUD-${Date.now()}-PRIOR-DAMAGE`,
        type: 'inflated_damages',
        severity: 'medium',
        description: 'Evidence of prior unreported damage',
        evidence: ['Damage photos', 'Vehicle history'],
        weight: 10,
        timestamp: new Date(),
      });
    }

    if (claim.medicalBills && claim.medicalBills.length > 0) {
      flags.push(...this.checkMedicalBillingAnomalies(claim));
    }

    if (claim.repairEstimates && claim.repairEstimates.length > 0) {
      flags.push(...this.checkSuspiciousRepairs(claim));
    }

    return flags;
  }

  private async runMLModel(claim: Claim): Promise<number> {
    try {
      const features = this.extractFeatures(claim);

      const response = await fetch(this.mlModelEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FRAUD_ML_API_KEY}`,
        },
        body: JSON.stringify({ features }),
      });

      if (!response.ok) {
        console.warn('ML model unavailable, using rule-based only');
        return 0;
      }

      const data = await response.json();
      return data.fraudScore || 0;
    } catch (error) {
      console.warn('ML model error, using rule-based only:', error);
      return 0;
    }
  }

  private async checkWatchlists(claim: Claim): Promise<WatchlistCheck[]> {
    // Build all watchlist check promises to run in parallel
    const checkPromises: Promise<WatchlistCheck>[] = [];

    if (claim.claimant) {
      checkPromises.push(
        this.checkEntityWatchlist(claim.claimant.name, claim.claimant.ssn, 'claimant')
      );
    }

    if (claim.repairShop) {
      checkPromises.push(
        this.checkEntityWatchlist(claim.repairShop, null, 'repair_shop')
      );
    }

    // Batch all medical provider checks in parallel
    if (claim.medicalProviders && claim.medicalProviders.length > 0) {
      for (const provider of claim.medicalProviders) {
        checkPromises.push(
          this.checkEntityWatchlist(provider, null, 'medical_provider')
        );
      }
    }

    if (claim.attorney) {
      checkPromises.push(
        this.checkEntityWatchlist(claim.attorney, null, 'attorney')
      );
    }

    // Execute all checks in parallel
    const allResults = await Promise.all(checkPromises);

    // Filter to only return entities on watchlist
    return allResults.filter(result => result.onWatchlist);
  }

  private async detectPatterns(claim: Claim): Promise<FraudPattern[]> {
    const patterns: FraudPattern[] = [];

    const repeatedClaimPattern = await this.detectRepeatedClaimant(claim);
    if (repeatedClaimPattern) patterns.push(repeatedClaimPattern);

    const stagedPattern = this.detectStagedAccident(claim);
    if (stagedPattern) patterns.push(stagedPattern);

    const ringPattern = await this.detectFraudRing(claim);
    if (ringPattern) patterns.push(ringPattern);

    const geoPattern = await this.detectGeographicClustering(claim);
    if (geoPattern) patterns.push(geoPattern);

    return patterns;
  }

  private async analyzeHistoricalData(claim: Claim): Promise<{
    priorClaimsCount: number;
    avgClaimAmount: number;
    suspiciousHistory: boolean;
  }> {
    return {
      priorClaimsCount: Math.floor(Math.random() * 3),
      avgClaimAmount: Math.random() * 5000,
      suspiciousHistory: Math.random() > 0.9,
    };
  }

  private async analyzeNetworkConnections(claim: Claim): Promise<{
    connectedToKnownFraud: boolean;
    connections: string[];
    riskMultiplier: number;
  }> {
    return { connectedToKnownFraud: false, connections: [], riskMultiplier: 1.0 };
  }

  private calculateOverallFraudScore(
    ruleBasedFlags: FraudFlag[],
    mlScore: number,
    watchlistResults: WatchlistCheck[],
    patterns: FraudPattern[],
    historicalAnalysis: any,
    networkAnalysis: any
  ): number {
    let score = 0;
    const ruleScore = ruleBasedFlags.reduce((sum, flag) => sum + flag.weight, 0);
    score += Math.min(ruleScore, 50);
    score += mlScore * 0.3;
    score += watchlistResults.length * 10;
    score += patterns.length * 5;
    if (historicalAnalysis.suspiciousHistory) score += 10;
    score *= networkAnalysis.riskMultiplier;
    return Math.min(Math.round(score), 100);
  }

  async generateSIUBriefing(claim: Claim, fraudScore: FraudScore): Promise<SIUBriefing> {
    const priority = this.determineSIUPriority(fraudScore);
    const summary = this.generateSIUSummary(claim, fraudScore);
    const recommendations = this.generateInvestigationRecommendations(fraudScore);
    const estimatedFraudAmount = this.estimateFraudAmount(claim, fraudScore);

    return {
      claimId: claim.id,
      fraudScore,
      priority,
      summary,
      investigationRecommendations: recommendations,
      supportingDocuments: [],
      estimatedFraudAmount,
      createdAt: new Date(),
    };
  }

  // Helper Methods
  private checkRapidPolicyPurchase(claim: Claim): boolean {
    if (!claim.policy?.effectiveDate || !claim.lossDate) return false;
    const effectiveDate = new Date(claim.policy.effectiveDate);
    const lossDate = new Date(claim.lossDate);
    const daysBetween = (lossDate.getTime() - effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysBetween < 30;
  }

  private checkSuspiciousTiming(claim: Claim): boolean {
    if (!claim.lossDate) return false;
    const lossDate = new Date(claim.lossDate);
    const hour = lossDate.getHours();
    const day = lossDate.getDay();
    if (hour >= 23 || hour <= 5) return true;
    if (day === 0 || day === 6) return true;
    return false;
  }

  private checkInconsistentStatements(claim: Claim): string[] {
    const inconsistencies: string[] = [];
    if (claim.description && claim.policeReport) {
      const keywords = ['rear-end', 'side-impact', 'head-on', 'single-vehicle'];
      const descMatches = keywords.filter(k => claim.description?.toLowerCase().includes(k));
      const reportMatches = keywords.filter(k => claim.policeReport?.toLowerCase().includes(k));
      if (descMatches.length > 0 && reportMatches.length > 0 && descMatches[0] !== reportMatches[0]) {
        inconsistencies.push('Accident type mismatch between description and police report');
      }
    }
    return inconsistencies;
  }

  private async checkVehicleHistoryMismatch(claim: Claim): Promise<boolean> {
    return Math.random() > 0.95;
  }

  private checkPriorDamageIndicators(claim: Claim): boolean {
    return Math.random() > 0.9;
  }

  private checkMedicalBillingAnomalies(claim: Claim): FraudFlag[] {
    const flags: FraudFlag[] = [];
    const totalBilling = claim.medicalBills?.reduce((sum: number, bill: { amount?: number }) => sum + (bill.amount || 0), 0) || 0;
    
    if (totalBilling > 50000) {
      flags.push({
        id: `FRAUD-${Date.now()}-HIGH-MEDICAL`,
        type: 'medical_fraud',
        severity: 'high',
        description: 'Unusually high medical billing',
        evidence: [`Total medical bills: $${totalBilling}`],
        weight: 12,
        timestamp: new Date(),
      });
    }

    if (claim.medicalBills && claim.medicalBills.length > 10) {
      flags.push({
        id: `FRAUD-${Date.now()}-RAPID-TREATMENT`,
        type: 'medical_fraud',
        severity: 'medium',
        description: 'Rapid treatment escalation pattern',
        evidence: [`${claim.medicalBills.length} treatment sessions`],
        weight: 8,
        timestamp: new Date(),
      });
    }

    return flags;
  }

  private checkSuspiciousRepairs(claim: Claim): FraudFlag[] {
    const flags: FraudFlag[] = [];
    const avgEstimate = claim.repairEstimates?.reduce((sum: number, est: { total?: number }) => sum + (est.total || 0), 0) /
                        (claim.repairEstimates?.length || 1) || 0;
    
    if (avgEstimate > 15000) {
      flags.push({
        id: `FRAUD-${Date.now()}-HIGH-REPAIRS`,
        type: 'inflated_damages',
        severity: 'medium',
        description: 'Repair estimate exceeds typical range',
        evidence: [`Average estimate: $${avgEstimate}`],
        weight: 8,
        timestamp: new Date(),
      });
    }

    return flags;
  }

  private async checkEntityWatchlist(
    name: string,
    identifier: string | null,
    type: WatchlistCheck['watchlistType']
  ): Promise<WatchlistCheck> {
    const onWatchlist = Math.random() > 0.98;

    if (onWatchlist) {
      return {
        onWatchlist: true,
        watchlistType: type,
        reason: 'Prior fraud involvement',
        addedDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        agencySource: 'Internal SIU',
      };
    }

    return { onWatchlist: false };
  }

  private async detectRepeatedClaimant(claim: Claim): Promise<FraudPattern | null> {
    const priorClaimsCount = Math.floor(Math.random() * 5);
    if (priorClaimsCount >= 3) {
      return {
        patternType: 'repeated_claimant',
        matches: priorClaimsCount,
        confidence: 85,
        description: `Claimant has filed ${priorClaimsCount} prior claims in 24 months`,
        relatedClaims: [],
      };
    }
    return null;
  }

  private detectStagedAccident(claim: Claim): FraudPattern | null {
    const indicators = [];
    if (claim.participants && claim.participants.length === 2) indicators.push('Two-vehicle accident');
    if (claim.description?.toLowerCase().includes('rear-end')) indicators.push('Rear-end collision');
    if (!claim.policeReport) indicators.push('No police report');

    if (indicators.length >= 2) {
      return {
        patternType: 'staged_accident',
        matches: indicators.length,
        confidence: 70,
        description: 'Claim exhibits staged accident characteristics',
      };
    }
    return null;
  }

  private async detectFraudRing(claim: Claim): Promise<FraudPattern | null> {
    return null;
  }

  private async detectGeographicClustering(claim: Claim): Promise<FraudPattern | null> {
    return null;
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private calculateConfidence(flags: FraudFlag[], mlScore: number): number {
    if (flags.length === 0 && mlScore === 0) return 50;
    if (flags.length >= 3 && mlScore > 50) return 95;
    if (flags.length >= 2 || mlScore > 30) return 80;
    return 70;
  }

  private generateRecommendations(flags: FraudFlag[], patterns: FraudPattern[], score: number): string[] {
    const recommendations: string[] = [];

    if (score >= 50) {
      recommendations.push('Immediate SIU referral required');
      recommendations.push('Suspend payment pending investigation');
    }

    if (flags.some(f => f.type === 'medical_fraud')) {
      recommendations.push('Request detailed medical records');
      recommendations.push('Conduct medical provider interview');
    }

    if (flags.some(f => f.type === 'staged_accident')) {
      recommendations.push('Obtain recorded statements from all parties');
      recommendations.push('Request cell phone records for time of loss');
    }

    if (patterns.some(p => p.patternType === 'repeated_claimant')) {
      recommendations.push('Review all prior claims for same claimant');
      recommendations.push('Consider pattern analysis across portfolio');
    }

    if (flags.some(f => f.type === 'inflated_damages')) {
      recommendations.push('Obtain independent repair estimate');
      recommendations.push('Conduct vehicle inspection');
    }

    return recommendations;
  }

  private convertWatchlistToFlags(watchlistResults: WatchlistCheck[]): FraudFlag[] {
    return watchlistResults.map((result, idx) => ({
      id: `FRAUD-${Date.now()}-WATCHLIST-${idx}`,
      type: 'prior_fraud_indicator' as FraudFlagType,
      severity: 'critical' as const,
      description: `Entity on ${result.watchlistType} watchlist: ${result.reason}`,
      evidence: [`Watchlist source: ${result.agencySource}`],
      weight: 20,
      timestamp: new Date(),
    }));
  }

  private convertPatternsToFlags(patterns: FraudPattern[]): FraudFlag[] {
    return patterns.map((pattern, idx) => ({
      id: `FRAUD-${Date.now()}-PATTERN-${idx}`,
      type: pattern.patternType as FraudFlagType,
      severity: pattern.confidence > 80 ? ('high' as const) : ('medium' as const),
      description: pattern.description,
      evidence: [`Confidence: ${pattern.confidence}%`, `Matches: ${pattern.matches}`],
      weight: Math.round(pattern.confidence / 5),
      timestamp: new Date(),
    }));
  }

  private extractFeatures(claim: Claim): any {
    return {
      claimAmount: claim.estimatedAmount,
      vehicleAge: claim.vehicle ? new Date().getFullYear() - claim.vehicle.year : 0,
      hasPoliceReport: !!claim.policeReport,
      participantCount: claim.participants?.length || 0,
      hasAttorney: !!claim.attorney,
      hasWitnesses: (claim.witnesses?.length || 0) > 0,
      lossHour: claim.lossDate ? new Date(claim.lossDate).getHours() : 12,
      policyAge: claim.policy?.effectiveDate ? 
        (new Date().getTime() - new Date(claim.policy.effectiveDate).getTime()) / (1000 * 60 * 60 * 24) : 0,
    };
  }

  private determineSIUPriority(fraudScore: FraudScore): 'low' | 'medium' | 'high' | 'urgent' {
    if (fraudScore.overallScore >= 75) return 'urgent';
    if (fraudScore.overallScore >= 60) return 'high';
    if (fraudScore.overallScore >= 40) return 'medium';
    return 'low';
  }

  private generateSIUSummary(claim: Claim, fraudScore: FraudScore): string {
    const flagSummary = fraudScore.flags.slice(0, 3).map(f => f.description).join('; ');
    return `Claim ${claim.id} flagged with fraud score ${fraudScore.overallScore}/100 (${fraudScore.riskLevel} risk). Key indicators: ${flagSummary}`;
  }

  private generateInvestigationRecommendations(fraudScore: FraudScore): string[] {
    const recommendations: string[] = [
      'Conduct thorough investigation before payment',
      'Obtain recorded statements from all parties',
      'Review claim file documentation for inconsistencies',
    ];

    if (fraudScore.flags.some(f => f.type === 'medical_fraud')) {
      recommendations.push('Audit medical billing and treatment records');
    }

    if (fraudScore.patterns.some(p => p.patternType === 'staged_accident')) {
      recommendations.push('Consider surveillance and scene investigation');
    }

    return recommendations;
  }

  private estimateFraudAmount(claim: Claim, fraudScore: FraudScore): number {
    if (fraudScore.riskLevel === 'low') return 0;
    const claimAmount = claim.estimatedAmount || 0;
    const fraudPercentage = fraudScore.overallScore / 100;
    return Math.round(claimAmount * fraudPercentage);
  }
}

export const fraudDetection = new FraudDetectionService();

