// src/lib/types/agent.ts
// Agent system type definitions and interfaces

export enum AgentGroup {
    INTAKE = 'INTAKE',
    INVESTIGATION = 'INVESTIGATION',
    FRAUD = 'FRAUD',
    EVALUATION = 'EVALUATION',
    COMMUNICATIONS = 'COMMUNICATIONS',
    ANALYTICS = 'ANALYTICS',
    QA = 'QA',
    VALIDATOR = 'VALIDATOR'
}

export enum AgentRole {
    // Group A: Intake
    DATA_PARSER = 'DATA_PARSER',
    VALIDATION_SPECIALIST = 'VALIDATION_SPECIALIST',
    SEVERITY_SCORER = 'SEVERITY_SCORER',
    ACKNOWLEDGMENT_WRITER = 'ACKNOWLEDGMENT_WRITER',
    DATA_VALIDATOR = 'DATA_VALIDATOR',
    DOCUMENT_ANALYZER = 'DOCUMENT_ANALYZER',

    // Group B: Investigation
    EVIDENCE_COLLECTOR = 'EVIDENCE_COLLECTOR',
    DATA_EXTRACTOR = 'DATA_EXTRACTOR',
    LIABILITY_ANALYST = 'LIABILITY_ANALYST',
    LIABILITY_ASSESSOR = 'LIABILITY_ASSESSOR',
    CHECKLIST_MANAGER = 'CHECKLIST_MANAGER',
    VEHICLE_INSPECTOR = 'VEHICLE_INSPECTOR',

    // Group C: Fraud
    PATTERN_DETECTOR = 'PATTERN_DETECTOR',
    MEDICAL_FRAUD_SCREENER = 'MEDICAL_FRAUD_SCREENER',
    SIU_BRIEFING_WRITER = 'SIU_BRIEFING_WRITER',

    // Group D: Evaluation
    VALUATION_SPECIALIST = 'VALUATION_SPECIALIST',
    RESERVE_ANALYST = 'RESERVE_ANALYST',
    COVERAGE_CALCULATOR = 'COVERAGE_CALCULATOR',
    SETTLEMENT_DRAFTER = 'SETTLEMENT_DRAFTER',

    // Group E: Communications
    CUSTOMER_WRITER = 'CUSTOMER_WRITER',
    INTERNAL_DOC_SPECIALIST = 'INTERNAL_DOC_SPECIALIST',
    COMPLIANCE_MONITOR = 'COMPLIANCE_MONITOR',
    HANDBOOK_HELPER = 'HANDBOOK_HELPER',

    // Group F: Analytics
    TREND_ANALYZER = 'TREND_ANALYZER',
    FEEDBACK_GENERATOR = 'FEEDBACK_GENERATOR',
    MARKETING_CREATOR = 'MARKETING_CREATOR',
    RULE_REFINER = 'RULE_REFINER',

    // Group G: QA
    TECHNICAL_QA = 'TECHNICAL_QA',
    COMPLIANCE_QA = 'COMPLIANCE_QA',
    BUSINESS_LOGIC_QA = 'BUSINESS_LOGIC_QA',
    QA_REVIEWER = 'QA_REVIEWER',

    // Agent Z
    FINAL_VALIDATOR = 'FINAL_VALIDATOR',

    // Supervisor and Validation
    ESCALATION_HANDLER = 'ESCALATION_HANDLER',
    REGULATORY_VALIDATOR = 'REGULATORY_VALIDATOR'
}

export interface AgentTask {
    id: string;
    agentRole: AgentRole;
    agentGroup: AgentGroup;
    claimId: string;
    taskType: string;
    input: Record<string, any>;
    output?: Record<string, any>;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    confidence?: number;
}

export interface AgentResult {
    agentId?: string | AgentRole;
    agentRole?: AgentRole;
    success: boolean;
    data?: Record<string, any>;
    confidence?: number;
    warnings?: string[];
    errors?: string[];
    error?: string;
    recommendations?: string[];
    escalationRequired?: boolean;
    escalationReason?: string;
    processingTime?: number;
    escalations?: SimpleEscalation[];
    decision?: 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'DRAFT_HOLD' | 'SIU_REVIEW' | string;
}

// Simplified escalation for inline agent use
export interface SimpleEscalation {
    type: string;
    reason: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface OrchestratorChecklist {
    phase1_intake: boolean;
    phase2_investigation: boolean;
    phase3_evaluation: boolean;
    phase4_communications: boolean;
    phase5_qa: boolean;
    phase6_validation: boolean;
    phase7_decision: boolean;
}

// Extended checklist status for master orchestrator
export interface OrchestratorChecklistStatus {
    phase1_IntakeAndTriage: boolean;
    phase2_InvestigationAndDocumentation: boolean;
    phase3_EvaluationAndSettlement: boolean;
    phase4_CommunicationsAndCompliance: boolean;
    phase5_QualityAssurance: boolean;
    phase6_FinalValidation: boolean;
    phase7_SubmissionOrApproval: boolean;
    startTime: Date;
    completedPhases: string[];
    currentPhase: string;
}

export interface OrchestratorState {
    claimId: string;
    currentPhase: number;
    checklist: OrchestratorChecklist;
    agentResults: Record<AgentRole, AgentResult>;
    escalationTriggers: string[];
    humanReviewRequired: boolean;
    finalDecision?: ClaimDecision;
    completedAt?: Date;
}

export interface ValidationResult {
    approved: boolean;
    issues: ValidationIssue[];
    recommendations: string[];
    confidence: number;
    reviewedBy: string;
    reviewedAt: Date;
}

export interface ValidationIssue {
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    category: string;
    description: string;
    affectedField?: string;
    suggestedAction?: string;
}

export interface EscalationTrigger {
    type: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    agentRole?: AgentRole;
    detectedAt?: Date;
    requiresImmediate?: boolean;
    timestamp?: Date;
    details?: any;
}

export interface ClaimDecision {
    decision: 'AUTO_APPROVE' | 'ESCALATE_HUMAN' | 'DRAFT_HOLD' | 'SIU_REVIEW';
    reason: string;
    confidence: number;
    estimatedValue?: number;
    requiredActions?: string[];
    escalationTriggers?: string[];
}

export interface AgentContext {
    claimId?: string;
    userId: string;
    channel: 'phone' | 'web' | 'email' | 'app';
    input: any;
    documents?: any[];
    previousResults?: Record<AgentRole, AgentResult>;
}

// Coverage analysis result from coverage calculator agent
export interface CoverageAnalysis {
    policyId?: string;
    claimId?: string;
    claimType?: string;
    coveredAmount?: number;
    deductible?: number;
    netPayable?: number;
    netCoverageAvailable?: number;
    coverageApplies?: boolean;
    exclusions?: string[];
    limitations?: string[];
    recommendations?: string[];
    confidence?: number;
    applicableCoverages?: any[];
    coverageLimits?: any;
    coverageGaps?: string[];
    recommendation?: any;
    // Additional fields used by coverageCalculator
    analysisDate?: string;
    policyLimits?: {
        perOccurrence?: number;
        aggregate?: number;
        usedAggregate?: number;
    };
    deductibleApplicable?: number;
    gaps?: string[];
}

// Reserve analysis for evaluation agents
export interface ReserveAnalysis {
    claimId: string;
    totalReserve: number | {
        minimum: number;
        maximum: number;
        recommended: number;
    };
    breakdownByCategory?: Record<string, number>;
    breakdown?: ReserveBreakdown[];
    confidence: number;
    recommendations: string[];
    escalations?: SimpleEscalation[];
    analysisDate?: string;
    methodology?: string;
    stateAdjustmentFactor?: number;
}

export interface ReserveBreakdown {
    category: string;
    estimatedMin: number;
    estimatedMax: number;
    recommended: number;
    confidence: number;
    factors: string[];
}

// Settlement draft interface
export interface SettlementDraft {
    claimId: string;
    totalAmount?: number;
    lineItems?: SettlementLineItem[];
    deductible?: number;
    netPayable?: number;
    paymentMethod?: string;
    recommendations?: string[];
    // Fields used by settlement drafter
    draftDate?: string;
    components?: SettlementComponent[];
    grossAmount?: number;
    deductibleAmount?: number;
    netAmount?: number;
    negotiationRange?: SettlementNegotiationRange;
    autoApprovalEligible?: boolean;
    settlementLetter?: string;
    paymentDetails?: {
        method: string;
        payee?: string;
        payeeName?: string;
        amount?: number;
        splitPayments?: { payee: string; amount: number }[];
    };
    releaseRequired?: boolean;
    expirationDate?: string;
}

export interface SettlementLineItem {
    category: string;
    description: string;
    amount: number;
}

export interface SettlementComponent {
    category: string;
    description: string;
    amount: number;
    basis?: string;
}

export interface SettlementNegotiationRange {
    minimum: number;
    target: number;
    maximum: number;
}

// Damage assessment
export interface DamageAssessment {
    claimId: string;
    vehicleId?: string;
    totalDamage: number;
    damageItems: DamageAssessmentItem[];
    isTotalLoss: boolean;
    salvageValue?: number;
    repairEstimate?: number;
}

export interface DamageAssessmentItem {
    component: string;
    severity: string;
    estimatedCost: number;
    repairType?: string;
}

