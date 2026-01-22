// src/lib/db/types.ts
// Database Type Definitions for ClaimAgent™
// Maps to Neon PostgreSQL schema

// ============================================================================
// ENUM TYPES
// ============================================================================

export type UserRole =
    | 'ADMIN'
    | 'ADJUSTER'
    | 'SIU_SPECIALIST'
    | 'SUPERVISOR'
    | 'UNDERWRITER'
    | 'AGENT'
    | 'CUSTOMER';

export type CarrierTier = 'SMALL' | 'REGIONAL' | 'MIDSIZE';

export type PolicyStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUSPENDED';

export type CoverageType =
    | 'LIABILITY'
    | 'COLLISION'
    | 'COMPREHENSIVE'
    | 'UM_UIM'
    | 'MEDICAL_PAYMENTS'
    | 'RENTAL_REIMBURSEMENT'
    | 'ROADSIDE_ASSISTANCE';

export type ClaimType =
    | 'AUTO_LIABILITY'
    | 'AUTO_COLLISION'
    | 'AUTO_COMPREHENSIVE'
    | 'AUTO_UNINSURED_MOTORIST'
    | 'AUTO_PIP'
    | 'AUTO_MEDICAL_PAYMENTS';

export type LossType =
    | 'COLLISION'
    | 'THEFT'
    | 'VANDALISM'
    | 'WEATHER'
    | 'FIRE'
    | 'GLASS'
    | 'HIT_AND_RUN'
    | 'ANIMAL'
    | 'OTHER';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Complexity = 'SIMPLE' | 'MODERATE' | 'COMPLEX';

export type ClaimStatus =
    | 'INTAKE'
    | 'INVESTIGATION'
    | 'EVALUATION'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'PAYMENT_PROCESSING'
    | 'CLOSED'
    | 'DENIED'
    | 'SUSPENDED';

export type RoutingDecision =
    | 'AUTO_APPROVED'
    | 'HUMAN_REVIEW'
    | 'SIU_ESCALATION'
    | 'SPECIALIST_REVIEW'
    | 'LEGAL_REVIEW'
    | 'DRAFT_DENIAL';

export type ParticipantRole =
    | 'INSURED'
    | 'CLAIMANT'
    | 'WITNESS'
    | 'OTHER_DRIVER'
    | 'PASSENGER'
    | 'PEDESTRIAN'
    | 'ATTORNEY'
    | 'MEDICAL_PROVIDER';

export type DocumentType =
    | 'PHOTO_VEHICLE'
    | 'PHOTO_SCENE'
    | 'POLICE_REPORT'
    | 'MEDICAL_RECORD'
    | 'REPAIR_ESTIMATE'
    | 'INVOICE'
    | 'RECEIPT'
    | 'CORRESPONDENCE'
    | 'LEGAL_DOCUMENT'
    | 'OTHER';

export type CommunicationType =
    | 'ACKNOWLEDGMENT'
    | 'INFO_REQUEST'
    | 'STATUS_UPDATE'
    | 'APPROVAL_LETTER'
    | 'DENIAL_LETTER'
    | 'RESERVATION_OF_RIGHTS'
    | 'SETTLEMENT_OFFER'
    | 'PAYMENT_NOTICE'
    | 'INTERNAL_NOTE';

export type CommDirection = 'OUTBOUND' | 'INBOUND';

export type CommStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SENT' | 'DELIVERED' | 'FAILED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PaymentMethod = 'CHECK' | 'ACH' | 'WIRE' | 'DEBIT_CARD';

export type PaymentStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'PROCESSING'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

export type AgentStatus = 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'ESCALATED';

export type HandbookType =
    | 'CLAIMS_MANUAL'
    | 'SIU_PLAYBOOK'
    | 'CORRESPONDENCE_GUIDE'
    | 'UNDERWRITING_GUIDELINES'
    | 'STATE_SPECIFIC'
    | 'TRAINING_MATERIAL';

// ============================================================================
// MODEL INTERFACES
// ============================================================================

export interface Carrier {
    id: string;
    name: string;
    code: string;
    annual_written_premium: number;
    license_number: string;
    domiciled_state: string;
    is_active: boolean;
    tier: CarrierTier;
    created_at: Date;
    updated_at: Date;
}

export interface User {
    id: string;
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    carrier_id: string | null;
    can_auto_approve: boolean;
    approval_limit: number | null;
    last_login_at: Date | null;
    login_count: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Session {
    id: string;
    user_id: string;
    token: string;
    expires_at: Date;
    ip_address: string | null;
    user_agent: string | null;
    created_at: Date;
}

export interface Policy {
    id: string;
    policy_number: string;
    carrier_id: string;
    holder_first_name: string;
    holder_last_name: string;
    holder_email: string | null;
    holder_phone: string | null;
    holder_address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    effective_date: Date;
    expiration_date: Date;
    status: PolicyStatus;
    annual_premium: number;
    created_at: Date;
    updated_at: Date;
}

export interface Coverage {
    id: string;
    policy_id: string;
    type: CoverageType;
    limit_per_person: number | null;
    limit_per_accident: number | null;
    limit_property: number | null;
    deductible: number | null;
    uninsured_motorist: boolean;
    underinsured_motorist: boolean;
    medical_payments: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface Vehicle {
    id: string;
    policy_id: string;
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    color: string | null;
    mileage: number | null;
    msrp: number | null;
    current_acv: number | null;
    last_valuation_date: Date | null;
    has_sensors: boolean;
    has_adas: boolean;
    fuel_type: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface Claim {
    id: string;
    claim_number: string;
    carrier_id: string;
    policy_id: string;
    vehicle_id: string | null;
    adjuster_id: string | null;
    loss_date: Date;
    reported_date: Date;
    loss_location: {
        address: string;
        city: string;
        state: string;
        zip: string;
        coordinates?: { lat: number; lng: number };
    };
    loss_description: string;
    claim_type: ClaimType;
    loss_type: LossType;
    severity: Severity;
    complexity: Complexity;
    status: ClaimStatus;
    sub_status: string | null;
    estimated_loss: number | null;
    reserve_amount: number | null;
    paid_amount: number;
    deductible: number | null;
    is_total_loss: boolean;
    is_fraudulent: boolean;
    fraud_score: number;
    requires_human_review: boolean;
    auto_approval_eligible: boolean;
    routing_decision: RoutingDecision | null;
    escalation_reason: string | null;
    acknowledged_at: Date | null;
    investigated_at: Date | null;
    evaluated_at: Date | null;
    settled_at: Date | null;
    closed_at: Date | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}

export interface ClaimParticipant {
    id: string;
    claim_id: string;
    role: ParticipantRole;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    address: Record<string, unknown> | null;
    license_number: string | null;
    license_state: string | null;
    vehicle_info: {
        vin?: string;
        year?: number;
        make?: string;
        model?: string;
        plate?: string;
    } | null;
    insurance_carrier: string | null;
    insurance_policy_number: string | null;
    injury_description: string | null;
    medical_treatment: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Document {
    id: string;
    claim_id: string;
    type: DocumentType;
    file_name: string;
    file_size: number;
    mime_type: string;
    storage_url: string;
    extracted_text: string | null;
    extracted_data: Record<string, unknown> | null;
    ocr_confidence: number | null;
    ai_analysis: Record<string, unknown> | null;
    damage_areas: string[] | null;
    estimated_cost: number | null;
    uploaded_by: string | null;
    uploaded_at: Date;
    verified_at: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface Communication {
    id: string;
    claim_id: string;
    type: CommunicationType;
    direction: CommDirection;
    recipient_email: string | null;
    recipient_phone: string | null;
    recipient_name: string | null;
    subject: string | null;
    body: string;
    template: string | null;
    sent_at: Date | null;
    delivered_at: Date | null;
    opened_at: Date | null;
    status: CommStatus;
    state_requirements: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
}

export interface FraudAnalysis {
    id: string;
    claim_id: string;
    overall_score: number;
    risk_level: RiskLevel;
    repeated_claimant: boolean;
    overlapping_loss: boolean;
    staging_indicators: boolean;
    inconsistent_story: boolean;
    medical_fraud_flags: Record<string, unknown> | null;
    billing_anomalies: boolean;
    rapid_reporting: boolean;
    excessive_claims: boolean;
    flagged_reasons: string[] | null;
    siu_recommendation: string | null;
    siu_reviewed: boolean;
    siu_reviewed_at: Date | null;
    siu_notes: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface FraudRule {
    id: string;
    carrier_id: string;
    name: string;
    description: string;
    rule_logic: Record<string, unknown>;
    score_impact: number;
    is_active: boolean;
    triggered_count: number;
    true_positive_rate: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface Valuation {
    id: string;
    claim_id: string;
    pre_accident_value: number;
    post_accident_value: number | null;
    diminished_value: number | null;
    is_total_loss: boolean;
    total_loss_threshold: number | null;
    salvage_value: number | null;
    estimated_repair_cost: number | null;
    actual_repair_cost: number | null;
    labor_cost: number | null;
    parts_cost: number | null;
    valuation_source: string | null;
    api_response: Record<string, unknown> | null;
    comparables: Record<string, unknown> | null;
    valued_at: Date;
    valued_by: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface Settlement {
    id: string;
    claim_id: string;
    total_paid: number;
    damage_amount: number | null;
    medical_amount: number | null;
    rental_amount: number | null;
    other_amount: number | null;
    deductible_applied: number | null;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    check_number: string | null;
    transaction_id: string | null;
    paid_at: Date | null;
    release_obtained: boolean;
    release_date: Date | null;
    created_at: Date;
    updated_at: Date;
}

export interface AgentLog {
    id: string;
    claim_id: string;
    agent_name: string;
    agent_group: string;
    phase: string;
    action: string;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    confidence: number | null;
    status: AgentStatus;
    error_message: string | null;
    execution_time_ms: number | null;
    created_at: Date;
}

export interface AuditLog {
    id: string;
    entity_type: string;
    entity_id: string;
    claim_id: string | null;
    user_id: string | null;
    actor_type: string;
    action: string;
    description: string;
    before_state: Record<string, unknown> | null;
    after_state: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown> | null;
    timestamp: Date;
}

export interface Handbook {
    id: string;
    carrier_id: string;
    title: string;
    type: HandbookType;
    version: string;
    effective_date: Date;
    content: string;
    sections: Record<string, unknown>;
    indexed: boolean;
    vector_embeddings: Record<string, unknown> | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface StateRegulation {
    id: string;
    state: string;
    total_loss_threshold: number;
    total_loss_formula: string;
    allows_dv: boolean;
    dv_limitations: string | null;
    acknowledgment_days: number;
    investigation_days: number;
    payment_days: number;
    requires_ror: boolean;
    special_notices: Record<string, unknown> | null;
    doi_website: string | null;
    doi_phone: string | null;
    updated_at: Date;
}

export interface ClaimMetrics {
    id: string;
    carrier_id: string;
    period_start: Date;
    period_end: Date;
    total_claims: number;
    new_claims: number;
    closed_claims: number;
    total_incurred: number;
    total_paid: number;
    average_claim_cost: number;
    auto_approved_count: number;
    auto_approval_rate: number;
    avg_cycle_time_hours: number;
    fraud_flags_count: number;
    fraud_confirmed_count: number;
    fraud_savings: number | null;
    error_rate: number;
    customer_sat_score: number | null;
    created_at: Date;
}

// ============================================================================
// CREATE/UPDATE INPUT TYPES
// ============================================================================

export type CreateCarrierInput = Omit<Carrier, 'id' | 'created_at' | 'updated_at'>;
export type UpdateCarrierInput = Partial<CreateCarrierInput>;

export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at' | 'login_count' | 'last_login_at'>;
export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password_hash'>>;

export type CreatePolicyInput = Omit<Policy, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePolicyInput = Partial<CreatePolicyInput>;

export type CreateClaimInput = Omit<Claim, 'id' | 'created_at' | 'updated_at' | 'reported_date'>;
export type UpdateClaimInput = Partial<CreateClaimInput>;

export type CreateDocumentInput = Omit<Document, 'id' | 'created_at' | 'updated_at' | 'uploaded_at'>;
export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export type CreateFraudAnalysisInput = Omit<FraudAnalysis, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFraudAnalysisInput = Partial<CreateFraudAnalysisInput>;

export type CreateValuationInput = Omit<Valuation, 'id' | 'created_at' | 'updated_at' | 'valued_at'>;
export type UpdateValuationInput = Partial<CreateValuationInput>;

export type CreateSettlementInput = Omit<Settlement, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSettlementInput = Partial<CreateSettlementInput>;
