# ClaimAgent™ Developer Integration Guide

**Technical Scope of Work for Engineering Teams**

---

## Overview

This document outlines the technical integration scope for implementing ClaimAgent™ within your insurance carrier's technology stack. ClaimAgent™ is a modern, API-first claims automation platform built on enterprise-grade architecture.

---

## Technical Architecture

### Platform Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Next.js 14+ (App Router) | Server-side rendering, API routes |
| **Language** | TypeScript 5.0+ (strict) | Type-safe development |
| **Database** | PostgreSQL 15+ / Cloudflare D1 | Relational data storage |
| **ORM** | Prisma 5.0+ | Database abstraction |
| **AI/ML** | OpenAI GPT-4, Claude, Custom Models | Intelligent processing |
| **Auth** | NextAuth.js + JWT | Session management |
| **Queue** | Background jobs with async processing | Long-running tasks |
| **Cache** | Built-in caching layer | Performance optimization |

### Multi-Agent Architecture

ClaimAgent™ employs 26+ specialized AI agents organized in a master orchestrator pattern:

```
Master Orchestrator
├── GROUP A: Intake & Triage
│   ├── A1: Data Parser (FNOL normalization, OCR)
│   ├── A2: Validation Specialist (policy verification)
│   ├── A3: Severity Scorer (risk classification)
│   └── A4: Acknowledgment Writer (customer comms)
│
├── GROUP B: Investigation & Documentation
│   ├── B1: Evidence Collector
│   ├── B2: Data Extractor
│   ├── B3: Liability Analyst
│   └── B4: Checklist Manager
│
├── GROUP C: Fraud & Risk Detection
│   ├── C1: Pattern Detector
│   ├── C2: Medical Fraud Screener
│   └── C3: SIU Briefing Writer
│
├── GROUP D: Evaluation & Settlement
│   ├── D1: Valuation Specialist (ACV calculation)
│   ├── D2: Reserve Analyst
│   ├── D3: Coverage Calculator
│   └── D4: Settlement Drafter
│
├── GROUP E: Communications & Compliance
│   ├── E1: Customer Communications Writer
│   ├── E2: Internal Documentation Specialist
│   ├── E3: Regulatory Compliance Monitor
│   └── E4: Handbook Helper
│
├── GROUP F: Analytics & Learning
│   ├── F1: Trend Analyzer
│   ├── F2: Feedback Generator
│   ├── F3: Marketing Creator
│   └── F4: Rule Refiner
│
├── GROUP G: Quality Assurance
│   ├── G1: Technical QA
│   ├── G2: Compliance QA
│   └── G3: Business Logic QA
│
└── AGENT Z: Final Validator (approval gating)
```

---

## Integration Points

### 1. Claims Submission API

**Endpoint**: `POST /api/claims/submit`

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer {api_key}
X-Carrier-ID: {carrier_id}
```

**Request Schema**:
```typescript
interface ClaimSubmission {
  // Required
  policyNumber: string;
  incidentDate: string;  // ISO 8601 format
  vehicleVIN: string;
  damageDescription: string;

  // Recommended
  photos?: string[];  // Base64 encoded images
  policeReportNumber?: string;
  incidentLocation?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };

  // Participants
  participants?: Array<{
    role: 'insured' | 'claimant' | 'witness' | 'other_driver';
    name: string;
    phone?: string;
    email?: string;
    injuries?: boolean;
    statement?: string;
  }>;

  // Vehicle details (if not auto-populated from VIN)
  vehicleDetails?: {
    year: number;
    make: string;
    model: string;
    mileage: number;
    preExistingDamage?: string;
  };

  // Telematics (if available)
  telematics?: {
    impactSpeed: number;
    impactDirection: string;
    harshBraking: boolean;
    blackBoxData?: object;
  };
}
```

**Response**:
```typescript
interface ClaimResponse {
  claimId: string;           // CLM-2024-XXXXXX
  status: ClaimStatus;
  estimatedCompletion: string;
  nextSteps: string[];
  acknowledgedAt: string;
  trackingUrl: string;
}

type ClaimStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'UNDER_REVIEW'
  | 'INVESTIGATION'
  | 'PENDING_INFO'
  | 'APPROVED'
  | 'DENIED'
  | 'PAID'
  | 'CLOSED';
```

### 2. Webhook Integration

Configure webhooks to receive real-time claim status updates:

**Webhook Payload**:
```typescript
interface WebhookEvent {
  eventId: string;
  eventType: WebhookEventType;
  claimId: string;
  timestamp: string;
  data: object;
  signature: string;  // HMAC-SHA256 for verification
}

type WebhookEventType =
  | 'claim.submitted'
  | 'claim.acknowledged'
  | 'claim.processing'
  | 'claim.info_requested'
  | 'claim.approved'
  | 'claim.escalated'
  | 'claim.payment_initiated'
  | 'claim.closed'
  | 'fraud.alert'
  | 'siu.referral';
```

**Signature Verification**:
```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

### 3. Policy Administration Integration

ClaimAgent™ requires real-time policy validation. Integration options:

**Option A: API Pull (Recommended)**
```typescript
// Configure your policy lookup endpoint
POST /api/config/policy-source
{
  "type": "api",
  "endpoint": "https://your-pas.com/api/policies/{policyNumber}",
  "authType": "bearer",
  "authToken": "your-api-key",
  "timeout": 5000
}
```

**Option B: Webhook Push**
```typescript
// ClaimAgent calls your webhook with policy details
interface PolicyValidationRequest {
  policyNumber: string;
  incidentDate: string;
  vehicleVIN: string;
}

interface PolicyValidationResponse {
  valid: boolean;
  status: 'active' | 'expired' | 'cancelled' | 'not_found';
  coverages: Coverage[];
  deductible: number;
  limits: {
    collision: number;
    comprehensive: number;
    liability: number;
  };
  insured: {
    name: string;
    email: string;
    phone: string;
  };
}
```

**Option C: Batch Sync**
```typescript
// Daily policy file upload (SFTP or API)
POST /api/policies/bulk-sync
Content-Type: application/json

{
  "policies": [
    {
      "policyNumber": "AUTO-123456",
      "effectiveDate": "2024-01-01",
      "expirationDate": "2025-01-01",
      "status": "active",
      ...
    }
  ]
}
```

### 4. Document Upload API

**Endpoint**: `POST /api/documents/upload`

```typescript
interface DocumentUpload {
  claimId: string;
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  content: string;  // Base64 encoded
}

type DocumentType =
  | 'damage_photo'
  | 'police_report'
  | 'repair_estimate'
  | 'medical_record'
  | 'proof_of_ownership'
  | 'drivers_license'
  | 'witness_statement'
  | 'other';
```

### 5. Fraud Score API

**Endpoint**: `POST /api/fraud/score`

```typescript
interface FraudScoreRequest {
  claimId: string;
  additionalIndicators?: {
    claimantHistory?: object;
    providerHistory?: object;
    customFlags?: string[];
  };
}

interface FraudScoreResponse {
  score: number;          // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendation: 'auto_approve' | 'review' | 'siu_referral';
}

interface FraudIndicator {
  code: string;
  description: string;
  weight: number;
  evidence: string;
}
```

---

## Database Schema

### Core Tables

```sql
-- Claims
CREATE TABLE claims (
  id UUID PRIMARY KEY,
  claim_number VARCHAR(20) UNIQUE NOT NULL,
  policy_id UUID REFERENCES policies(id),
  status claim_status NOT NULL,
  incident_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Amounts
  reserve_amount DECIMAL(12,2),
  settlement_amount DECIMAL(12,2),
  deductible_amount DECIMAL(12,2),

  -- AI Processing
  fraud_score INTEGER,
  confidence_score INTEGER,
  routing_decision routing_decision,
  processing_phase processing_phase,

  -- Audit
  assigned_adjuster_id UUID,
  last_activity_at TIMESTAMP
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  document_type document_type NOT NULL,
  file_name VARCHAR(255),
  mime_type VARCHAR(100),
  storage_url TEXT,
  ocr_text TEXT,
  ai_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assessments (Agent outputs)
CREATE TABLE assessments (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id),
  agent_id VARCHAR(10) NOT NULL,
  phase processing_phase NOT NULL,
  analysis JSONB NOT NULL,
  confidence_score INTEGER,
  recommendations TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Fraud Watchlist
CREATE TABLE fraud_watchlist (
  id UUID PRIMARY KEY,
  entity_type watchlist_entity_type,
  entity_value VARCHAR(255),
  risk_score INTEGER,
  reason TEXT,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Enums

```typescript
enum ClaimStatus {
  SUBMITTED = 'SUBMITTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  INVESTIGATION = 'INVESTIGATION',
  PENDING_INFO = 'PENDING_INFO',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  PAID = 'PAID',
  CLOSED = 'CLOSED'
}

enum RoutingDecision {
  AUTO_APPROVED = 'AUTO_APPROVED',
  HUMAN_REVIEW = 'HUMAN_REVIEW',
  SIU_ESCALATION = 'SIU_ESCALATION',
  DRAFT_HOLD_DENIAL = 'DRAFT_HOLD_DENIAL',
  SALVAGE_SPECIALIST = 'SALVAGE_SPECIALIST',
  LEGAL_REVIEW = 'LEGAL_REVIEW'
}

enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  ADJUSTER = 'ADJUSTER',
  SIU_SPECIALIST = 'SIU_SPECIALIST',
  UNDERWRITER = 'UNDERWRITER',
  READONLY = 'READONLY'
}
```

---

## Authentication & Security

### API Authentication

```typescript
// Bearer token authentication
const response = await fetch('https://api.claimagent.io/claims', {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'X-Carrier-ID': CARRIER_ID
  }
});
```

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full system access, user management |
| `SUPERVISOR` | Override decisions, team management |
| `ADJUSTER` | Process claims, approve within limits |
| `SIU_SPECIALIST` | Fraud investigation, SIU workflows |
| `UNDERWRITER` | View claims, policy validation |
| `READONLY` | View-only access to claims data |

### Security Requirements

- TLS 1.3 for all API communications
- AES-256 encryption for data at rest
- API keys rotated every 90 days
- IP allowlisting available
- Rate limiting: 100 requests/minute per API key

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/claimagent

# AI Services
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Carrier Configuration
CARRIER_ID=your-carrier-id
CARRIER_API_KEY=your-api-key

# External Services
VALUATION_API_KEY=your-valuation-key
SALVAGE_API_KEY=your-salvage-key

# Feature Flags
ENABLE_AUTO_APPROVAL=true
AUTO_APPROVAL_LIMIT=2500
FRAUD_SCORE_THRESHOLD=50
```

---

## Deployment Options

### Option 1: Managed SaaS (Recommended)

- Hosted on Vercel/AWS infrastructure
- Automatic scaling and updates
- 99.9% uptime SLA
- No infrastructure management required

### Option 2: Private Cloud

- Deployed in your AWS/Azure/GCP account
- Carrier-managed infrastructure
- Data residency compliance
- Custom security configurations

### Option 3: On-Premise

- Docker containers for your data center
- Air-gapped deployment available
- Full control over infrastructure
- Requires dedicated DevOps resources

---

## Testing

### Sandbox Environment

```
Base URL: https://sandbox.claimagent.io/api
API Key: Request from developer portal
```

### Test Claim Submission

```bash
curl -X POST https://sandbox.claimagent.io/api/claims/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SANDBOX_KEY" \
  -d '{
    "policyNumber": "TEST-AUTO-001",
    "incidentDate": "2024-01-15T10:30:00Z",
    "vehicleVIN": "1HGCM82633A123456",
    "damageDescription": "Front-end collision test"
  }'
```

### Test Scenarios

| Scenario | Policy Number | Expected Result |
|----------|--------------|-----------------|
| Auto-Approve | `TEST-AUTO-001` | `AUTO_APPROVED` |
| Human Review | `TEST-REVIEW-001` | `HUMAN_REVIEW` |
| Fraud Alert | `TEST-FRAUD-001` | `SIU_ESCALATION` |
| Total Loss | `TEST-TOTAL-001` | `SALVAGE_SPECIALIST` |
| Invalid Policy | `INVALID-001` | `400 Bad Request` |

---

## SDK & Libraries

### JavaScript/TypeScript SDK

```bash
npm install @claimagent/sdk
```

```typescript
import { ClaimAgent } from '@claimagent/sdk';

const client = new ClaimAgent({
  apiKey: process.env.CLAIMAGENT_API_KEY,
  carrierId: process.env.CARRIER_ID
});

// Submit a claim
const claim = await client.claims.submit({
  policyNumber: 'AUTO-123456',
  incidentDate: new Date(),
  vehicleVIN: '1HGCM82633A123456',
  damageDescription: 'Front-end collision'
});

// Get claim status
const status = await client.claims.getStatus(claim.claimId);

// Upload document
await client.documents.upload(claim.claimId, {
  type: 'damage_photo',
  file: photoBuffer
});
```

---

## Support & Resources

| Resource | Link |
|----------|------|
| **API Documentation** | https://docs.claimagent.io/api |
| **Developer Portal** | https://developers.claimagent.io |
| **Status Page** | https://status.claimagent.io |
| **GitHub Examples** | https://github.com/claimagent/examples |

### Technical Support

- **Email**: developers@claimagent.io
- **Slack**: Request access via developer portal
- **Emergency**: 1-800-CLAIM-AI ext. 2

---

## Implementation Checklist

- [ ] Obtain API credentials from developer portal
- [ ] Configure policy administration integration
- [ ] Set up webhook endpoints
- [ ] Test claim submission in sandbox
- [ ] Validate fraud scoring integration
- [ ] Configure user roles and permissions
- [ ] Set up monitoring and alerting
- [ ] Complete security review
- [ ] Perform load testing
- [ ] Execute UAT with business team
- [ ] Deploy to production
- [ ] Enable production monitoring

---

*For technical questions, contact developers@claimagent.io*
