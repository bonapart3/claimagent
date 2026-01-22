-- ClaimAgent™ PostgreSQL Schema for Neon
-- Enterprise-grade P&C Insurance Claims Platform
-- Version: 3.0.0

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
-- Note: These extensions require PostgreSQL and must be run by a superuser or
-- a user with CREATE privilege on the database.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Extension uuid-ossp already exists or cannot be created';
END;
$$;

DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Extension pgcrypto already exists or cannot be created';
END;
$$;

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

-- User & Auth Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'ADMIN',
            'ADJUSTER',
            'SIU_SPECIALIST',
            'SUPERVISOR',
            'UNDERWRITER',
            'AGENT',
            'CUSTOMER'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'carrier_tier') THEN
        CREATE TYPE carrier_tier AS ENUM (
            'SMALL',      -- $5M-$50M
            'REGIONAL',   -- $50M-$150M
            'MIDSIZE'     -- $150M-$500M
        );
    END IF;
END;
$$;

-- Policy Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'policy_status') THEN
        CREATE TYPE policy_status AS ENUM (
            'ACTIVE',
            'EXPIRED',
            'CANCELLED',
            'SUSPENDED'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coverage_type') THEN
        CREATE TYPE coverage_type AS ENUM (
            'LIABILITY',
            'COLLISION',
            'COMPREHENSIVE',
            'UM_UIM',
            'MEDICAL_PAYMENTS',
            'RENTAL_REIMBURSEMENT',
            'ROADSIDE_ASSISTANCE'
        );
    END IF;
END;
$$;

-- Claim Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_type') THEN
        CREATE TYPE claim_type AS ENUM (
            'AUTO_LIABILITY',
            'AUTO_COLLISION',
            'AUTO_COMPREHENSIVE',
            'AUTO_UNINSURED_MOTORIST',
            'AUTO_PIP',
            'AUTO_MEDICAL_PAYMENTS'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loss_type') THEN
        CREATE TYPE loss_type AS ENUM (
            'COLLISION',
            'THEFT',
            'VANDALISM',
            'WEATHER',
            'FIRE',
            'GLASS',
            'HIT_AND_RUN',
            'ANIMAL',
            'OTHER'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity') THEN
        CREATE TYPE severity AS ENUM (
            'LOW',       -- PD only, < $2,500
            'MEDIUM',    -- PD $2,500-$10,000
            'HIGH',      -- PD > $10,000 or minor BI
            'CRITICAL'   -- Serious BI, fatalities, litigation
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complexity') THEN
        CREATE TYPE complexity AS ENUM (
            'SIMPLE',    -- Single vehicle, clear liability
            'MODERATE',  -- Multi-vehicle, shared liability
            'COMPLEX'    -- Serious injury, legal involvement
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM (
            'INTAKE',
            'INVESTIGATION',
            'EVALUATION',
            'PENDING_APPROVAL',
            'APPROVED',
            'PAYMENT_PROCESSING',
            'CLOSED',
            'DENIED',
            'SUSPENDED'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'routing_decision') THEN
        CREATE TYPE routing_decision AS ENUM (
            'AUTO_APPROVED',
            'HUMAN_REVIEW',
            'SIU_ESCALATION',
            'SPECIALIST_REVIEW',
            'LEGAL_REVIEW',
            'DRAFT_DENIAL'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participant_role') THEN
        CREATE TYPE participant_role AS ENUM (
            'INSURED',
            'CLAIMANT',
            'WITNESS',
            'OTHER_DRIVER',
            'PASSENGER',
            'PEDESTRIAN',
            'ATTORNEY',
            'MEDICAL_PROVIDER'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
        CREATE TYPE document_type AS ENUM (
            'PHOTO_VEHICLE',
            'PHOTO_SCENE',
            'POLICE_REPORT',
            'MEDICAL_RECORD',
            'REPAIR_ESTIMATE',
            'INVOICE',
            'RECEIPT',
            'CORRESPONDENCE',
            'LEGAL_DOCUMENT',
            'OTHER'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'communication_type') THEN
        CREATE TYPE communication_type AS ENUM (
            'ACKNOWLEDGMENT',
            'INFO_REQUEST',
            'STATUS_UPDATE',
            'APPROVAL_LETTER',
            'DENIAL_LETTER',
            'RESERVATION_OF_RIGHTS',
            'SETTLEMENT_OFFER',
            'PAYMENT_NOTICE',
            'INTERNAL_NOTE'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comm_direction') THEN
        CREATE TYPE comm_direction AS ENUM (
            'OUTBOUND',
            'INBOUND'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comm_status') THEN
        CREATE TYPE comm_status AS ENUM (
            'DRAFT',
            'PENDING_APPROVAL',
            'SENT',
            'DELIVERED',
            'FAILED'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_level') THEN
        CREATE TYPE risk_level AS ENUM (
            'LOW',
            'MEDIUM',
            'HIGH',
            'CRITICAL'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM (
            'CHECK',
            'ACH',
            'WIRE',
            'DEBIT_CARD'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'PENDING',
            'APPROVED',
            'PROCESSING',
            'COMPLETED',
            'FAILED',
            'CANCELLED'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_status') THEN
        CREATE TYPE agent_status AS ENUM (
            'SUCCESS',
            'FAILURE',
            'SKIPPED',
            'ESCALATED'
        );
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'handbook_type') THEN
        CREATE TYPE handbook_type AS ENUM (
            'CLAIMS_MANUAL',
            'SIU_PLAYBOOK',
            'CORRESPONDENCE_GUIDE',
            'UNDERWRITING_GUIDELINES',
            'STATE_SPECIFIC',
            'TRAINING_MATERIAL'
        );
    END IF;
END;
$$;

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Carriers Table
CREATE TABLE carriers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    annual_written_premium DECIMAL(15, 2) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    domiciled_state VARCHAR(2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    tier carrier_tier DEFAULT 'REGIONAL',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_carriers_code ON carriers(code);
CREATE INDEX idx_carriers_is_active ON carriers(is_active);

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    carrier_id UUID REFERENCES carriers(id),
    can_auto_approve BOOLEAN DEFAULT false,
    approval_limit DECIMAL(10, 2),
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_carrier_role ON users(carrier_id, role);

-- Sessions Table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- ============================================================================
-- POLICY MANAGEMENT
-- ============================================================================

-- Policies Table
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(50) UNIQUE NOT NULL,
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    holder_first_name VARCHAR(100) NOT NULL,
    holder_last_name VARCHAR(100) NOT NULL,
    holder_email VARCHAR(255),
    holder_phone VARCHAR(20),
    holder_address JSONB NOT NULL, -- {street, city, state, zip}
    effective_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    status policy_status DEFAULT 'ACTIVE',
    annual_premium DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_carrier_id ON policies(carrier_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_dates ON policies(effective_date, expiration_date);

-- Coverages Table
CREATE TABLE coverages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    type coverage_type NOT NULL,
    limit_per_person DECIMAL(10, 2),
    limit_per_accident DECIMAL(10, 2),
    limit_property DECIMAL(10, 2),
    deductible DECIMAL(10, 2),
    uninsured_motorist BOOLEAN DEFAULT false,
    underinsured_motorist BOOLEAN DEFAULT false,
    medical_payments DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coverages_policy_type ON coverages(policy_id, type);

-- Vehicles Table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    vin VARCHAR(17) UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    trim VARCHAR(50),
    color VARCHAR(30),
    mileage INTEGER,
    msrp DECIMAL(10, 2),
    current_acv DECIMAL(10, 2),
    last_valuation_date DATE,
    has_sensors BOOLEAN DEFAULT false,
    has_adas BOOLEAN DEFAULT false,
    fuel_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_policy_id ON vehicles(policy_id);

-- ============================================================================
-- CLAIM MANAGEMENT (CORE)
-- ============================================================================

-- Claims Table
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    policy_id UUID NOT NULL REFERENCES policies(id),
    vehicle_id UUID REFERENCES vehicles(id),
    adjuster_id UUID REFERENCES users(id),

    -- Incident Details
    loss_date DATE NOT NULL,
    reported_date TIMESTAMPTZ DEFAULT NOW(),
    loss_location JSONB NOT NULL, -- {address, city, state, zip, coordinates}
    loss_description TEXT NOT NULL,

    -- Classification
    claim_type claim_type NOT NULL,
    loss_type loss_type NOT NULL,
    severity severity NOT NULL,
    complexity complexity NOT NULL,

    -- Status
    status claim_status DEFAULT 'INTAKE',
    sub_status VARCHAR(50),

    -- Financial
    estimated_loss DECIMAL(10, 2),
    reserve_amount DECIMAL(10, 2),
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    deductible DECIMAL(10, 2),

    -- Flags
    is_total_loss BOOLEAN DEFAULT false,
    is_fraudulent BOOLEAN DEFAULT false,
    fraud_score INTEGER DEFAULT 0,
    requires_human_review BOOLEAN DEFAULT false,
    auto_approval_eligible BOOLEAN DEFAULT false,

    -- Routing
    routing_decision routing_decision,
    escalation_reason TEXT,

    -- Timestamps
    acknowledged_at TIMESTAMPTZ,
    investigated_at TIMESTAMPTZ,
    evaluated_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_claim_number ON claims(claim_number);
CREATE INDEX idx_claims_carrier_id ON claims(carrier_id);
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_loss_date ON claims(loss_date);
CREATE INDEX idx_claims_fraud_score ON claims(fraud_score);
CREATE INDEX idx_claims_requires_human_review ON claims(requires_human_review);

-- ============================================================================
-- CLAIM PARTICIPANTS
-- ============================================================================

CREATE TABLE claim_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    role participant_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address JSONB,
    license_number VARCHAR(50),
    license_state VARCHAR(2),
    vehicle_info JSONB, -- {vin, year, make, model, plate}
    insurance_carrier VARCHAR(255),
    insurance_policy_number VARCHAR(50),
    injury_description TEXT,
    medical_treatment BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claim_participants_claim_role ON claim_participants(claim_id, role);

-- ============================================================================
-- DOCUMENTS & EVIDENCE
-- ============================================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_url TEXT NOT NULL,
    extracted_text TEXT,
    extracted_data JSONB,
    ocr_confidence REAL,
    ai_analysis JSONB,
    damage_areas TEXT[],
    estimated_cost DECIMAL(10, 2),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_claim_type ON documents(claim_id, type);

-- ============================================================================
-- COMMUNICATIONS
-- ============================================================================

CREATE TABLE communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    type communication_type NOT NULL,
    direction comm_direction NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_name VARCHAR(200),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    template VARCHAR(100),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    status comm_status DEFAULT 'DRAFT',
    state_requirements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_communications_claim_type ON communications(claim_id, type);

-- ============================================================================
-- FRAUD DETECTION
-- ============================================================================

CREATE TABLE fraud_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID UNIQUE NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    overall_score INTEGER DEFAULT 0, -- 0-100
    risk_level risk_level DEFAULT 'LOW',

    -- Pattern Flags
    repeated_claimant BOOLEAN DEFAULT false,
    overlapping_loss BOOLEAN DEFAULT false,
    staging_indicators BOOLEAN DEFAULT false,
    inconsistent_story BOOLEAN DEFAULT false,

    -- Medical Flags
    medical_fraud_flags JSONB,
    billing_anomalies BOOLEAN DEFAULT false,

    -- Behavioral Flags
    rapid_reporting BOOLEAN DEFAULT false,
    excessive_claims BOOLEAN DEFAULT false,

    -- Analysis Details
    flagged_reasons TEXT[],
    siu_recommendation TEXT,

    -- SIU Review
    siu_reviewed BOOLEAN DEFAULT false,
    siu_reviewed_at TIMESTAMPTZ,
    siu_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_analyses_overall_score ON fraud_analyses(overall_score);
CREATE INDEX idx_fraud_analyses_risk_level ON fraud_analyses(risk_level);

-- Fraud Rules Table
CREATE TABLE fraud_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    rule_logic JSONB NOT NULL,
    score_impact INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    triggered_count INTEGER DEFAULT 0,
    true_positive_rate REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_rules_carrier_active ON fraud_rules(carrier_id, is_active);

-- ============================================================================
-- VALUATION & SETTLEMENT
-- ============================================================================

CREATE TABLE valuations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID UNIQUE NOT NULL REFERENCES claims(id) ON DELETE CASCADE,

    -- Vehicle Value
    pre_accident_value DECIMAL(10, 2) NOT NULL,
    post_accident_value DECIMAL(10, 2),
    diminished_value DECIMAL(10, 2),

    -- Total Loss
    is_total_loss BOOLEAN DEFAULT false,
    total_loss_threshold REAL,
    salvage_value DECIMAL(10, 2),

    -- Repair Costs
    estimated_repair_cost DECIMAL(10, 2),
    actual_repair_cost DECIMAL(10, 2),
    labor_cost DECIMAL(10, 2),
    parts_cost DECIMAL(10, 2),

    -- API Sources
    valuation_source VARCHAR(100),
    api_response JSONB,
    comparables JSONB,

    valued_at TIMESTAMPTZ DEFAULT NOW(),
    valued_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settlements Table
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID UNIQUE NOT NULL REFERENCES claims(id) ON DELETE CASCADE,

    -- Settlement Amounts
    total_paid DECIMAL(10, 2) NOT NULL,
    damage_amount DECIMAL(10, 2),
    medical_amount DECIMAL(10, 2),
    rental_amount DECIMAL(10, 2),
    other_amount DECIMAL(10, 2),
    deductible_applied DECIMAL(10, 2),

    -- Payment Details
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'PENDING',
    check_number VARCHAR(50),
    transaction_id VARCHAR(100),
    paid_at TIMESTAMPTZ,

    -- Documentation
    release_obtained BOOLEAN DEFAULT false,
    release_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settlements_payment_status ON settlements(payment_status);

-- ============================================================================
-- AGENT SYSTEM LOGS
-- ============================================================================

CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    agent_group VARCHAR(50) NOT NULL,
    phase VARCHAR(50) NOT NULL,
    action VARCHAR(255) NOT NULL,
    input JSONB,
    output JSONB,
    confidence REAL,
    status agent_status DEFAULT 'SUCCESS',
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_claim_agent ON agent_logs(claim_id, agent_name);
CREATE INDEX idx_agent_logs_phase_status ON agent_logs(phase, status);

-- ============================================================================
-- AUDIT & COMPLIANCE
-- ============================================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) NOT NULL, -- 'USER', 'SYSTEM', 'AGENT'
    action VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_claim_id ON audit_logs(claim_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- ============================================================================
-- KNOWLEDGE BASE & HANDBOOKS
-- ============================================================================

CREATE TABLE handbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    title VARCHAR(255) NOT NULL,
    type handbook_type NOT NULL,
    version VARCHAR(20) NOT NULL,
    effective_date DATE NOT NULL,
    content TEXT NOT NULL,
    sections JSONB NOT NULL,
    indexed BOOLEAN DEFAULT false,
    vector_embeddings JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_handbooks_carrier_type_active ON handbooks(carrier_id, type, is_active);

-- ============================================================================
-- STATE REGULATIONS
-- ============================================================================

CREATE TABLE state_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(2) UNIQUE NOT NULL,
    total_loss_threshold REAL NOT NULL,
    total_loss_formula VARCHAR(50) NOT NULL,
    allows_dv BOOLEAN DEFAULT false,
    dv_limitations TEXT,
    acknowledgment_days INTEGER NOT NULL,
    investigation_days INTEGER NOT NULL,
    payment_days INTEGER NOT NULL,
    requires_ror BOOLEAN DEFAULT false,
    special_notices JSONB,
    doi_website VARCHAR(255),
    doi_phone VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_state_regulations_state ON state_regulations(state);

-- ============================================================================
-- ANALYTICS & REPORTING
-- ============================================================================

CREATE TABLE claim_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    carrier_id UUID NOT NULL REFERENCES carriers(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Volume
    total_claims INTEGER NOT NULL,
    new_claims INTEGER NOT NULL,
    closed_claims INTEGER NOT NULL,

    -- Financials
    total_incurred DECIMAL(15, 2) NOT NULL,
    total_paid DECIMAL(15, 2) NOT NULL,
    average_claim_cost DECIMAL(10, 2) NOT NULL,

    -- Automation
    auto_approved_count INTEGER NOT NULL,
    auto_approval_rate REAL NOT NULL,
    avg_cycle_time_hours REAL NOT NULL,

    -- Fraud
    fraud_flags_count INTEGER NOT NULL,
    fraud_confirmed_count INTEGER NOT NULL,
    fraud_savings DECIMAL(10, 2),

    -- Quality
    error_rate REAL NOT NULL,
    customer_sat_score REAL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claim_metrics_carrier_period ON claim_metrics(carrier_id, period_start);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_carriers_updated_at BEFORE UPDATE ON carriers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coverages_updated_at BEFORE UPDATE ON coverages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claim_participants_updated_at BEFORE UPDATE ON claim_participants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_analyses_updated_at BEFORE UPDATE ON fraud_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fraud_rules_updated_at BEFORE UPDATE ON fraud_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_valuations_updated_at BEFORE UPDATE ON valuations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settlements_updated_at BEFORE UPDATE ON settlements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_handbooks_updated_at BEFORE UPDATE ON handbooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE carriers IS 'Insurance carrier organizations using the platform';
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE claims IS 'Core claims with full lifecycle tracking';
COMMENT ON TABLE fraud_analyses IS 'AI-powered fraud detection results';
COMMENT ON TABLE valuations IS 'Vehicle valuation and total loss determinations';
COMMENT ON TABLE agent_logs IS 'AI agent execution logs for audit trail';
COMMENT ON TABLE state_regulations IS '50-state compliance requirements';
