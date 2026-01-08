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

    // Group B: Investigation
    EVIDENCE_COLLECTOR = 'EVIDENCE_COLLECTOR',
    DATA_EXTRACTOR = 'DATA_EXTRACTOR',
    LIABILITY_ANALYST = 'LIABILITY_ANALYST',
    CHECKLIST_MANAGER = 'CHECKLIST_MANAGER',

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

    // Agent Z
    FINAL_VALIDATOR = 'FINAL_VALIDATOR'
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
    agentRole: AgentRole;
    success: boolean;
    data: Record<string, any>;
    confidence: number;
    warnings?: string[];
    errors?: string[];
    recommendations?: string[];
    escalationRequired?: boolean;
    escalationReason?: string;
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
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    reason: string;
    agentRole: AgentRole;
    detectedAt: Date;
    requiresImmediate: boolean;
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

