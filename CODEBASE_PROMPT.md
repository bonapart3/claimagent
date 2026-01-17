# ClaimAgent™ - Comprehensive Codebase Documentation Prompt

## 🎯 Executive Overview

**ClaimAgent™** is an enterprise-grade, AI-augmented autonomous claims processing platform designed specifically for Property & Casualty (P&C) insurance carriers with annual written premiums between $5M and $500M. This is a production-ready Next.js 14+ application that handles automotive insurance claims from First Notice of Loss (FNOL) through final settlement with 80%+ straight-through processing capability.

### Core Value Proposition

- **Cycle Time**: Reduces claim processing from 5-7 days to 2-4 hours
- **Cost Efficiency**: Drops per-claim cost from $900 to $140
- **Accuracy**: Maintains <1% error rate
- **Fraud Prevention**: 40% reduction in fraud losses
- **Workload**: 90% reduction in adjuster manual work

---

## 🏗️ Technical Architecture

### Technology Stack

**Frontend & Framework:**

- Next.js 14.2+ (App Router architecture)
- React 18.2+ with TypeScript 5.3+
- Tailwind CSS 3.4+ for styling
- Radix UI for accessible component primitives
- React Query (@tanstack/react-query 5.17+) for server state management
- Zustand 4.4+ for client state management

**Backend:**

- Next.js API Routes (App Router /api directory)
- PostgreSQL 15+ as primary database
- Prisma 5.8+ as ORM with full TypeScript support
- NextAuth.js 4.24+ for authentication
- Express Rate Limiting for API protection

**AI/ML Integration:**

- OpenAI GPT-4 API (openai 4.24+)
- Claude integration capability
- Custom ML models for fraud detection
- Tesseract.js 5.0+ for OCR (document extraction)

**Security & Infrastructure:**

- Helmet.js for security headers
- Jose for JWT handling
- bcryptjs for password hashing
- Rate limiting & DDoS protection
- HTTPS enforcement
- Audit logging for all critical operations

**Development Tools:**

- TypeScript for type safety
- ESLint & Prettier for code quality
- Jest for unit/integration testing
- Playwright for E2E testing
- Prisma Studio for database inspection

---

## 📂 Project Structure & Organization

### Root Level Files

```bash
next-env.d.ts           # Next.js TypeScript declarations
next.config.js          # Next.js configuration
package.json            # Dependencies and scripts (v3.0.0)
README.md               # Project documentation
tailwind.config.js      # Tailwind CSS configuration
tsconfig.json           # TypeScript compiler configuration
```

### Database Layer (`/prisma`)

**Schema File:** `schema.prisma` (713 lines)

- PostgreSQL datasource configuration
- Complete data models for the entire application
- Audit trail support
- Multi-state compliance structure

**Key Data Models:**

1. **User & Authentication:**
   - `User`: User accounts with role-based access (ADMIN, SUPERVISOR, ADJUSTER, SIU_SPECIALIST, UNDERWRITER, MARKETING, READONLY)
   - `UserSession`: JWT session management with IP/user agent tracking
   - Password hashing with bcryptjs
   - License number tracking for adjusters

2. **Policy Management:**
   - `Policy`: Core policy data with coverage limits and deductibles
   - Fields: policyNumber, effectiveDate, expirationDate, state
   - Coverage limits stored in cents for precision
   - Status tracking (ACTIVE, EXPIRED, CANCELLED, SUSPENDED)
   - Policyholder information (name, address, contact)
   - Multiple coverage types: liability, collision, comprehensive, UM/UIM, medical payments

3. **Vehicle Management:**
   - `Vehicle`: VIN-based vehicle tracking
   - Year, make, model, trim, color
   - License plate with state
   - Usage classification (PERSONAL, BUSINESS, RIDESHARE, DELIVERY)
   - Sensor detection flag (for ADAS/autonomous features)

4. **Claims Processing:**
   - `Claim`: Central claim record with 50+ fields
   - Incident details (date, time, location, description)
   - Multiple claim types: COLLISION, COMPREHENSIVE, LIABILITY, UNINSURED_MOTORIST, MEDICAL_PAYMENTS, PERSONAL_INJURY
   - Severity levels: LOW, MEDIUM, HIGH, CRITICAL
   - Status workflow: SUBMITTED → UNDER_REVIEW → INVESTIGATING → APPROVED/REJECTED → PAYMENT_PENDING → PAID → CLOSED
   - Financial tracking (all in cents): estimatedAmount, approvedAmount, paidAmount, reserveAmount, deductibleAmount
   - Fraud scoring (0-100 float)
   - Auto-approval eligibility flag
   - Routing decisions for human escalation

5. **Supporting Models:**
   - `Document`: File storage with OCR metadata
   - `ClaimNote`: Timeline/audit trail of actions
   - `Payment`: Payment processing and tracking
   - `AuditLog`: Comprehensive audit trail for compliance
   - `AgentExecution`: AI agent run tracking and performance metrics
   - `FraudIndicator`: Detected fraud patterns and flags
   - `StateRegulation`: 50-state compliance rules

**Database Scripts:**

- `seed.ts`: Database seeding with sample data
- Migrations managed via Prisma

---

## 🤖 Multi-Agent AI Architecture

### Agent Organization

The system uses a sophisticated **Master Orchestrator** pattern that coordinates 27+ specialized AI agents organized into 7 functional groups plus a final validator.

**File Location:** `src/lib/agents/master_orchestrator.ts` (771 lines)

### Agent Groups & Workflow

#### **GROUP A: Intake & Triage (4 agents)**

Located in: `src/lib/agents/intake/`

1. **Data Parser** (`data_parser.ts`)
   - Extracts structured data from FNOL submissions
   - Parses unstructured text, emails, voice transcripts
   - Normalizes date/time formats
   - Geocodes incident locations

2. **Data Validator** (`dataValidator.ts`)
   - Validates policy numbers and coverage dates
   - Checks for duplicate claims
   - Verifies VIN and vehicle information
   - Ensures required fields are complete

3. **Document Analyzer** (`documentAnalyzer.ts`)
   - Categorizes uploaded documents (photos, PDFs, police reports)
   - Triggers OCR for text extraction
   - Identifies missing critical documents
   - Quality checks for photo clarity

4. **Severity Scorer** (`severityScorer.ts`)
   - Calculates initial severity (LOW/MEDIUM/HIGH/CRITICAL)
   - Considers: injury presence, vehicle damage extent, liability complexity
   - Determines initial reserve amounts
   - Routes to appropriate handling tier

5. **Acknowledgment Writer** (`acknowledgmentWriter.ts`)
   - Generates state-compliant FNOL acknowledgment
   - Customizes based on state regulations
   - Sets expectations for processing time
   - Provides claim number and contact info

#### **GROUP B: Investigation & Documentation (4 agents)**

Located in: `src/lib/agents/investigation/`

1. **Evidence Collector** (`evidenceCollector.ts`)
   - Aggregates photos, police reports, witness statements
   - Checks for inconsistencies across documents
   - Creates evidence timeline
   - Flags missing critical evidence

2. **Vehicle Inspector** (`vehicleInspector.ts`)
   - Analyzes vehicle damage photos using computer vision
   - Identifies damaged components and areas
   - Estimates pre-loss vehicle value (integrates with valuation APIs)
   - Determines if total loss threshold is met
   - Checks for ADAS/sensor damage (expensive)

3. **Liability Analyst** (`liabilityAnalyst.ts` / `liabilityAssessor.ts`)
   - Analyzes incident narrative and police reports
   - Determines comparative negligence percentages
   - Identifies potential subrogation opportunities
   - Assesses third-party involvement
   - Applies state-specific liability rules

4. **Checklist Manager** (`checklistManager.ts`)
   - Maintains investigation checklist
   - Tracks completion of required tasks
   - Identifies information gaps
   - Triggers follow-up requests

#### **GROUP C: Fraud & Risk Detection (3 agents)**

Located in: `src/lib/agents/fraud/`

1. **Medical Fraud Screener** (`medicalFraudScreener.ts`)
   - Detects suspicious medical billing patterns
   - Flags unnecessary treatments
   - Identifies provider mills
   - Checks treatment timing and frequency

2. **Pattern Detector** (`patternDetector.ts`)
   - Detects organized fraud rings
   - Identifies collusion patterns
   - Checks for prior fraud history
   - Analyzes social network connections
   - Flags suspicious timing patterns

3. **SIU Briefing Writer** (`siuBriefingWriter.ts`)
   - Generates comprehensive fraud investigation reports
   - Summarizes red flags and evidence
   - Provides recommended actions
   - Formats for Special Investigation Unit (SIU) handoff

**Fraud Scoring System:**

- 0-30: Low risk (auto-approve eligible)
- 31-60: Medium risk (enhanced review)
- 61-80: High risk (human review required)
- 81-100: Critical risk (immediate SIU escalation)

#### **GROUP D: Evaluation & Settlement (4 agents)**

Located in: `src/lib/agents/evaluation/`

1. **Valuation Specialist** (`valuationSpecialist.ts`)
   - Integrates with third-party valuation APIs (CCC, Mitchell, etc.)
   - Determines Actual Cash Value (ACV)
   - Calculates total loss thresholds by state
   - Estimates salvage value
   - Applies depreciation schedules

2. **Coverage Calculator** (`coverageCalculator.ts`)
   - Parses policy language for coverage determinations
   - Applies deductibles correctly
   - Calculates per-occurrence limits
   - Handles aggregate limits
   - Applies state-specific coverage rules

3. **Reserve Analyst** (`reserveAnalyst.ts`)
   - Sets initial reserves based on severity and liability
   - Adjusts reserves as new information arrives
   - Considers jurisdiction venue risk
   - Accounts for legal costs
   - Maintains reserve adequacy

4. **Settlement Drafter** (`settlementDrafter.ts`)
   - Generates settlement offer letters
   - Calculates settlement amounts
   - Applies liability percentages
   - Includes required state disclosures
   - Formats payment instructions

#### **GROUP E: Communications & Compliance (4 agents)**

Located in: `src/lib/agents/communications/`

1. **Customer Writer** (`customerWriter.ts`)
   - Generates customer-facing communications
   - Adapts tone based on situation (empathy for denials)
   - Simplifies technical language
   - Provides clear next steps

2. **Internal Doc Specialist** (`internalDocSpecialist.ts`)
   - Creates internal memos and file notes
   - Generates management reports
   - Documents decision rationale
   - Maintains audit trail

3. **Compliance Monitor** (`complianceMonitor.ts`)
   - Validates against state-specific regulations
   - Enforces time-to-acknowledge requirements
   - Checks required disclosures
   - Monitors payment timing compliance
   - Flags potential violations

4. **Handbook Helper** (`handbookHelper.ts`)
   - References carrier-specific policies
   - Applies underwriting guidelines
   - Ensures consistency with carrier standards
   - Checks for policy endorsements

#### **GROUP F: Analytics & Learning (4 agents)**

Located in: `src/lib/agents/analytics/`

1. **Performance Tracker**
   - Measures claim processing time
   - Tracks auto-approval rate
   - Monitors escalation reasons
   - Calculates cost per claim

2. **Accuracy Auditor**
   - Reviews closed claims for errors
   - Identifies decision quality issues
   - Recommends process improvements

3. **Pattern Learner**
   - Identifies trends in claim characteristics
   - Learns from adjuster overrides
   - Improves fraud detection models
   - Adapts severity scoring

4. **Reporting Engine**
   - Generates executive dashboards
   - Creates carrier performance reports
   - Produces regulatory compliance reports

#### **GROUP G: Quality Assurance (3 agents)**

Located in: `src/lib/agents/qa/`

1. **QA Reviewer** (`qaReviewer.ts`)
   - Final pre-approval quality check
   - Validates all calculations
   - Ensures compliance requirements met
   - Confirms documentation is complete

2. **Legal Firewall Enforcer**
   - Implements "Draft & Hold" system
   - Prevents unauthorized denials
   - Requires supervisor approval for denials
   - Enforces bad faith prevention rules

3. **Audit Trail Validator**
   - Ensures complete audit logging
   - Validates timeline completeness
   - Confirms all agent decisions documented

#### **AGENT Z: Final Validator (1 agent)**

**Final Validator** (`src/lib/agents/validator/finalValidator.ts`)

- Ultimate pre-submission validation
- Checks all phases completed successfully
- Verifies no escalation triggers present
- Confirms all compliance requirements met
- Validates financial calculations
- Makes final auto-approve vs. escalate decision

### Orchestration Logic

**Master Orchestrator Internal Checklist:**

```typescript
{
  phase1_IntakeAndTriage: boolean
  phase2_InvestigationAndDocumentation: boolean
  phase3_EvaluationAndSettlement: boolean
  phase4_CommunicationsAndCompliance: boolean
  phase5_QualityAssurance: boolean
  phase6_FinalValidation: boolean
  phase7_SubmissionOrApproval: boolean
  startTime: Date
  completedPhases: string[]
  currentPhase: string
}
```

**Escalation Triggers:**

- Fraud score > 60
- Total loss determination
- Injury claims
- Liability disputes
- Policy coverage questions
- Missing critical documents
- Compliance violations
- Agent confidence < 85%
- Payment amount > $10,000 (configurable by carrier)

**Risk-Based Routing:**

- Low risk + high confidence → Auto-approve
- Medium risk → Enhanced review by QA agents
- High risk → Human adjuster review
- Critical risk → Supervisor + SIU escalation

---

## 🌐 API Architecture

### API Route Structure (`src/app/api/`)

#### **Authentication Routes** (`/api/auth/`)

1. **Login** (`/auth/login/`)
   - POST: Authenticate user with email/password
   - Returns JWT token
   - Tracks session with IP and user agent

2. **Logout** (`/auth/logout/`)
   - POST: Invalidate session token

3. **Me** (`/auth/me/`)
   - GET: Get current user profile
   - Returns user details and permissions

#### **Claims Routes** (`/api/claims/`)

**Main Routes:**

- GET `/api/claims`: List claims with filtering and pagination
  - Query params: `status`, `policyId`, `page`, `limit`
  - Returns claims with policy and vehicle details
  - Includes total count for pagination

- POST `/api/claims`: Create new claim (submit FNOL)
  - Validates policy existence and coverage
  - Triggers Master Orchestrator
  - Returns claim ID and initial status

- GET `/api/claims/[id]`: Get single claim details
  - Includes all related data (policy, vehicle, documents, notes, agent executions)

- PATCH `/api/claims/[id]`: Update claim
  - Allows status changes
  - Updates financial amounts
  - Adds notes to timeline

- DELETE `/api/claims/[id]`: Soft delete claim (admin only)

**Specialized Claim Routes:**

- POST `/api/claims/submit`: FNOL submission with validation
- GET `/api/claims/stats`: Dashboard statistics
  - Total claims by status
  - Average processing time
  - Auto-approval rate
  - Total paid amounts

#### **Documents Routes** (`/api/documents/`)

- POST `/api/documents/upload`: Upload claim documents
  - Supports multiple files
  - Validates file types and sizes
  - Triggers OCR for PDFs and images
  - Stores in cloud storage (configuration dependent)

- GET `/api/documents/[id]`: Download/view document
  - Serves file with appropriate content type
  - Logs access for audit trail

#### **Fraud Routes** (`/api/fraud/`)

- POST `/api/fraud/score`: Calculate fraud score for claim
  - Runs fraud detection agents
  - Returns score and flag details
  - Logs results to database

#### **Policy Routes** (`/api/policy/`)

- POST `/api/policy/validate`: Validate policy coverage
  - Checks effective dates
  - Verifies coverage types
  - Returns coverage limits

#### **Webhooks** (`/api/webhooks/`)

- POST `/api/webhooks/route.ts`: External system integrations
  - Receives events from third-party systems
  - Validates webhook signatures
  - Processes payment confirmations, valuation updates

#### **Health Check** (`/api/health/`)

- GET `/api/health`: System health endpoint
  - Database connectivity check
  - Returns version and status

### API Security & Middleware

**Middleware** (`src/middleware.ts`):

- Authentication verification for protected routes
- Role-based access control (RBAC)
- Public routes whitelist: `/`, `/login`, `/register`, `/api/health`, `/api/webhooks`
- Role-specific route restrictions
- JWT validation on every request

**Rate Limiting:**

- Configured per endpoint
- Prevents abuse and DDoS
- Configurable thresholds

**Response Format:**

```typescript
{
  success: boolean
  data?: any
  error?: string
  message?: string
}
```

---

## 🎨 Frontend Application Structure

### App Router Pages (`src/app/`)

#### **Root Layout** (`layout.tsx`)

- Global HTML structure
- Loads global CSS (`globals.css`)
- Wraps app with providers
- Configures fonts and metadata

#### **Home Page** (`page.tsx`)

- Landing page
- Redirects authenticated users to dashboard
- Marketing content for unauthenticated visitors

#### **Login Page** (`/login/page.tsx`)

- User authentication form
- Email/password input
- Error handling
- Redirects to dashboard on success

#### **Claims Management**

1. **Claims Dashboard** (`/claims/dashboard/page.tsx`)
   - Overview of all claims
   - Filtering by status
   - Search functionality
   - Pagination
   - Quick stats cards

2. **New Claim** (`/claims/new/page.tsx`)
   - FNOL submission form
   - Policy validation on the fly
   - File upload for initial documents
   - Incident details capture
   - Submits to Master Orchestrator

3. **Claim Detail** (`/claims/[id]/page.tsx`)
   - Full claim information display
   - Timeline of all actions
   - Document gallery
   - Agent execution log
   - Status update controls
   - Payment information
   - Fraud score display

### Component Library (`src/components/`)

#### **Layout Components** (`/layout/`)

1. **Header** (`Header.tsx`)
   - Navigation bar
   - User profile dropdown
   - Notifications bell
   - Logout button

2. **Sidebar** (`Sidebar.tsx`)
   - Navigation menu
   - Role-based menu items
   - Active route highlighting

3. **MainLayout** (`MainLayout.tsx`)
   - Combines Header + Sidebar + main content area
   - Responsive layout

#### **Claims Components** (`/claims/`)

1. **ClaimCard** (`ClaimCard.tsx`)
   - Summary card for claim list view
   - Shows claim number, status, amount, date
   - Click to view details

2. **ClaimTimeline** (`ClaimTimeline.tsx`)
   - Visual timeline of claim lifecycle
   - Shows all notes and status changes
   - Agent execution milestones
   - Color-coded by event type

3. **DocumentUploader** (`DocumentUploader.tsx`)
   - Drag-and-drop file upload
   - Multiple file support
   - Progress indicators
   - File type validation
   - Integration with document API

4. **FraudIndicator** (`FraudIndicator.tsx`)
   - Visual fraud score display
   - Color-coded (green/yellow/red)
   - List of fraud flags
   - SIU escalation button

#### **UI Primitives** (`/ui/`)

Built on Radix UI for accessibility:

- **Alert** (`Alert.tsx`): Info/warning/error messages
- **Badge** (`Badge.tsx`): Status badges with variants
- **Button** (`Button.tsx`): Primary/secondary/destructive variants
- **Card** (`Card.tsx`): Container component with header/content/footer
- **Input** (`Input.tsx`): Form input with validation states
- **Modal** (`Modal.tsx`): Dialog/modal overlay
- **Select** (`Select.tsx`): Dropdown select with search
- **Spinner** (`Spinner.tsx`): Loading indicator
- **Table** (`Table.tsx`): Data table with sorting
- **Tabs** (`Tabs.tsx`): Tabbed navigation
- **Toaster** (`Toaster.tsx`): Toast notifications

#### **Providers** (`Providers.tsx`)

- React Query client provider
- Toast notification provider
- Theme provider (if applicable)

---

## 🔧 Backend Services & Utilities

### Services Layer (`src/lib/services/`)

1. **AI Damage Analysis** (`aiDamageAnalysis.ts`)
   - Computer vision for vehicle damage assessment
   - Identifies damaged parts from photos
   - Estimates repair costs

2. **Coverage Analyzer** (`coverageAnalyzer.ts`)
   - Parses complex policy language
   - Determines coverage applicability
   - Handles policy endorsements

3. **Document OCR** (`documentOCR.ts`)
   - Uses Tesseract.js for text extraction
   - Processes PDFs and images
   - Extracts structured data from forms

4. **Fraud Detection** (`fraudDetection.ts`)
   - Machine learning model for fraud scoring
   - Pattern recognition
   - Risk factor weighting

5. **Payment Processor** (`paymentProcessor.ts`)
   - Integration with payment APIs
   - ACH and check generation
   - Payment tracking

6. **Policy Validation** (`policyValidation.ts`)
   - Real-time policy lookup
   - Coverage verification
   - Effective date validation

7. **State Compliance Rules** (`StateComplianceRules.ts`)
   - 50-state regulation database
   - Time limits by state
   - Required disclosures by state
   - Bad faith law considerations

8. **Valuation API** (`valuationAPI.ts`)
   - Integration with CCC, Mitchell, NADA
   - Vehicle value lookup
   - Salvage value estimation

9. **Vehicle Valuation** (`vehicleValuation.ts`)
   - Local valuation logic
   - Depreciation calculations
   - Market adjustments

### Utilities (`src/lib/utils/`)

1. **Audit Logger** (`auditLogger.ts`)
   - Logs all critical actions
   - Immutable audit trail
   - Compliance-ready logging
   - Structured log format

2. **CN** (`cn.ts`)
   - Tailwind class name utility
   - Merges class names with tailwind-merge

3. **Database** (`database.ts`)
   - Prisma client singleton
   - Connection pooling
   - Error handling

4. **Encryption** (`encryption.ts`)
   - PII encryption functions
   - Field-level encryption
   - Secure key management

5. **Rate Limit** (`rateLimit.ts`)
   - API rate limiting implementation
   - Configurable per endpoint
   - Redis-backed (optional)

6. **Validation** (`validation.ts`)
   - Zod schemas for input validation
   - Reusable validation functions
   - Type-safe form validation

### Constants (`src/lib/constants/`)

1. **State Regulations** (`stateRegulations.ts`)
   - 50-state compliance data
   - Time limits for acknowledgments
   - Required disclosures
   - Comparative negligence rules
   - Total loss thresholds by state

2. **Thresholds** (`thresholds.ts`)
   - Auto-approval thresholds
   - Fraud score boundaries
   - Severity classification rules
   - Reserve adequacy requirements
   - Escalation triggers

### Hooks (`src/lib/hooks/`)

1. **useAuth** (`useAuth.ts`)
   - Authentication state management
   - Login/logout functions
   - User role checking

2. **useClaims** (`useClaims.ts`)
   - Claims data fetching with React Query
   - CRUD operations for claims
   - Real-time claim updates

3. **useNotifications** (`useNotifications.ts`)
   - Toast notification management
   - Success/error message display

### Types (`src/lib/types/`)

1. **Agent** (`agent.ts`)
   - Agent execution interfaces
   - Agent result types
   - Orchestrator status types

2. **Claim** (`claim.ts`)
   - Complete claim type definitions
   - Enums for status, type, severity
   - ClaimData interface
   - VehicleData, ParticipantData, InjuryData interfaces

3. **Policy** (`policy.ts`)
   - Policy type definitions
   - Coverage type enums
   - Limit and deductible structures

---

## 🔒 Security & Compliance

### Security Features

1. **Authentication & Authorization**
   - NextAuth.js for secure authentication
   - JWT tokens with expiration
   - Session management with DB storage
   - Role-based access control (7 roles)
   - Password hashing with bcryptjs

2. **Data Protection**
   - Field-level encryption for PII
   - HTTPS enforcement
   - Secure cookie settings
   - Input sanitization
   - SQL injection protection via Prisma

3. **API Security**
   - Rate limiting per endpoint
   - DDoS protection with Helmet.js
   - CORS configuration
   - Webhook signature validation
   - Request validation with Zod

4. **Audit Trail**
   - All actions logged to AuditLog table
   - Immutable log records
   - User, timestamp, IP address captured
   - Before/after state tracking

### Compliance Features

1. **State Regulations**
   - 50-state compliance rules built-in
   - Automated deadline tracking
   - Required disclosure insertion
   - Bad faith prevention (Draft & Hold)

2. **Audit Requirements**
   - Complete claim lifecycle tracking
   - Agent decision logging
   - Human override documentation
   - Timestamp precision

3. **Privacy**
   - PII encryption
   - Access logging
   - Data retention policies
   - GDPR-ready architecture

---

## 📊 Key Business Logic

### Auto-Approval Decision Tree

```
1. Initial Intake Validation
   ├─ Policy active? No → REJECT
   ├─ Coverage applies? No → REJECT
   └─ Within limits? No → ESCALATE

2. Fraud Check
   ├─ Fraud score > 80? Yes → SIU ESCALATION
   ├─ Fraud score 61-80? Yes → HUMAN REVIEW
   └─ Fraud score ≤ 60? Continue

3. Liability Assessment
   ├─ Disputed liability? Yes → ESCALATE
   ├─ Third party involved? Yes → ESCALATE
   └─ Clear liability? Continue

4. Severity Check
   ├─ Injury present? Yes → ESCALATE
   ├─ Total loss? Yes → ESCALATE
   ├─ Amount > $10k? Yes → ESCALATE
   └─ Low severity? Continue

5. Documentation Check
   ├─ Photos present? No → REQUEST
   ├─ Police report (if required)? No → REQUEST
   └─ All docs present? Continue

6. Compliance Validation
   ├─ State regs met? No → HOLD
   ├─ Timeline compliant? No → PRIORITY
   └─ Compliant? Continue

7. QA Validation
   ├─ Calculation errors? Yes → ESCALATE
   ├─ Missing data? Yes → REQUEST
   └─ QA passed? Continue

8. Final Decision
   ├─ Confidence > 95%? AUTO-APPROVE
   ├─ Confidence 85-95%? SUPERVISOR REVIEW
   └─ Confidence < 85%? ADJUSTER REVIEW
```

### Financial Calculations

**All amounts stored in cents (integer) for precision**

1. **Actual Cash Value (ACV)**

   ```
   ACV = Market Value - Depreciation - Pre-existing Damage
   ```

2. **Settlement Amount**

   ```
   Settlement = MIN(Repair Cost, ACV) - Deductible
   ```

3. **Total Loss Determination**

   ```
   Total Loss if: Repair Cost > (ACV * State Threshold)
   State Threshold typically 70-80% depending on state
   ```

4. **Reserve Setting**

   ```
   Initial Reserve = Estimated Damages + Legal Buffer + Medical Estimate
   Updated dynamically as new info arrives
   ```

5. **Subrogation Potential**

   ```
   If third party at fault AND recovered:
   Net Cost = Paid Amount - Subrogation Recovery
   ```

### State-Specific Logic

**Time to Acknowledge:**

- Most states: 15 days
- Florida: 14 days
- California: 15 days
- New York: 30 days (commercial), 10 days (personal)

**Total Loss Thresholds:**

- Alabama: 75%
- Colorado: 100%
- Florida: 80%
- Texas: 100%
- (All 50 states configurable in constants)

**Comparative Negligence:**

- Pure comparative: e.g., California (reduce by %)
- Modified 50%: e.g., Colorado (no recovery if >50% at fault)
- Modified 51%: e.g., Illinois (no recovery if >51% at fault)
- Contributory: e.g., Alabama (no recovery if any fault)

---

## 🚀 Development Workflow

### Available Scripts

```json
{
  "dev": "next dev",                    // Local development server
  "build": "next build",                // Production build
  "start": "next start",                // Production server
  "lint": "next lint",                  // ESLint check
  "type-check": "tsc --noEmit",         // TypeScript validation
  "test": "jest --coverage",            // Run all tests
  "test:unit": "jest --testPathPattern=tests/unit",
  "test:integration": "jest --testPathPattern=tests/integration",
  "test:e2e": "playwright test",        // End-to-end tests
  "db:generate": "prisma generate",     // Generate Prisma client
  "db:migrate": "prisma migrate dev",   // Run migrations
  "db:push": "prisma db push",          // Push schema changes
  "db:seed": "prisma db seed",          // Seed database
  "db:studio": "prisma studio",         // Open Prisma Studio GUI
  "security:audit": "npm audit --audit-level=moderate"
}
```

### Environment Variables Required

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/claimagent"

# Authentication
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="sk-..."
CLAUDE_API_KEY="sk-..."  # Optional

# External APIs
VALUATION_API_KEY="..."  # CCC/Mitchell/etc
SALVAGE_API_KEY="..."
POLICY_VALIDATION_API_KEY="..."

# Email (optional)
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="..."
SMTP_PASSWORD="..."

# Storage (optional)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="claimagent-docs"

# Rate Limiting (optional)
REDIS_URL="redis://localhost:6379"

# Environment
NODE_ENV="development"
```

### Development Setup Steps

1. **Clone and Install**

   ```bash
   git clone https://github.com/bonapart3/claimagent.git
   cd claimagent
   npm install
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Initialize Database**

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. **Run Development Server**

   ```bash
   npm run dev
   # Open http://localhost:3000
   ```

5. **Open Prisma Studio** (optional)

   ```bash
   npm run db:studio
   ```

---

## 🎯 Key Features & User Flows

### 1. FNOL Submission Flow

**User Journey:**

1. Claimant/Agent navigates to `/claims/new`
2. Enters policy number → validated in real-time
3. Selects vehicle from policy
4. Enters incident details (date, time, location, description)
5. Uploads photos/documents
6. Submits form

**Backend Process:**

1. API validates policy and coverage
2. Creates Claim record in database
3. Triggers Master Orchestrator
4. Orchestrator runs all agent groups in sequence
5. Returns initial status and claim number
6. Auto-sends acknowledgment email to claimant

### 2. Auto-Adjudication Flow

**Autonomous Processing:**

1. Master Orchestrator executes all phases
2. Each agent logs results to AgentExecution table
3. Fraud agents calculate fraud score
4. Evaluation agents determine settlement amount
5. QA agents validate all calculations
6. Final Validator makes approve/escalate decision

**If Auto-Approved:**

- Payment record created
- Settlement letter generated
- Payment sent to claimant
- Claim status → PAYMENT_PENDING
- After payment clears → PAID → CLOSED
- Total time: 2-4 hours

**If Escalated:**

- Claim assigned to human adjuster
- Escalation reasons documented
- Notification sent to adjuster
- Claim status → UNDER_REVIEW
- Adjuster reviews and makes decision

### 3. Fraud Detection Flow

**Automatic Screening:**

1. Pattern Detector runs on all claims
2. Checks for red flags:
   - Suspicious timing (claim filed immediately after policy purchase)
   - Multiple claims from same address
   - Inconsistent narratives across documents
   - Known fraud rings
   - High-risk providers
3. Calculates fraud score 0-100
4. If > 60, escalates for enhanced review
5. If > 80, sends to SIU

**SIU Escalation:**

- SIU Briefing Writer generates report
- Includes all evidence and red flags
- Assigns to SIU specialist
- Pauses payment pending investigation

### 4. Dashboard & Reporting

**Adjuster Dashboard:**

- List of assigned claims
- Filters: status, date range, severity
- Quick stats: pending, approved, paid
- Performance metrics

**Supervisor Dashboard:**

- Team performance metrics
- Auto-approval rate trends
- Fraud detection stats
- Cost savings analytics
- Claims requiring approval

**Admin Dashboard:**

- System-wide statistics
- Agent performance metrics
- Error rate tracking
- Compliance adherence
- Financial reports

---

## 📈 Performance Metrics & Monitoring

### Key Performance Indicators (KPIs)

1. **Auto-Approval Rate**
   - Target: 80%+
   - Tracked per claim type
   - Trended over time

2. **Cycle Time**
   - Auto-approved claims: 2-4 hours
   - Human-reviewed claims: 1-3 days
   - Average end-to-end time

3. **Accuracy**
   - Error rate: <1%
   - Adjuster override rate
   - Claim reopening rate

4. **Fraud Detection**
   - Fraud detection rate
   - False positive rate
   - Loss prevention savings

5. **Customer Satisfaction**
   - Response time
   - Communication clarity
   - Payment speed

### Monitoring & Logging

**AuditLog Table:**

- Captures all critical actions
- User, timestamp, action, before/after state
- Searchable and reportable

**AgentExecution Table:**

- Every agent run logged
- Execution time tracked
- Confidence scores recorded
- Errors captured

**Performance Metrics:**

- Database query performance
- API response times
- Agent execution times
- Memory/CPU usage

---

## 🔄 Integration Points

### External Systems

1. **Valuation APIs**
   - CCC ONE
   - Mitchell International
   - NADA Guides
   - Purpose: Vehicle value determination

2. **Policy Management Systems**
   - Real-time policy validation
   - Coverage lookups
   - Endorsement checking

3. **Payment Systems**
   - ACH processing
   - Check printing services
   - Payment tracking

4. **SIU Systems**
   - Fraud reporting
   - Investigation management
   - Law enforcement coordination

5. **Document Storage**
   - AWS S3 or equivalent
   - Secure document storage
   - OCR processing

6. **Email/SMS Services**
   - SendGrid, Twilio, etc.
   - Customer communications
   - Internal notifications

### Webhook Support

**Inbound Webhooks:**

- Payment confirmations
- Valuation updates
- Policy changes
- SIU investigation results

**Outbound Webhooks:**

- Claim status changes
- Payment issued
- Fraud detected
- Settlement finalized

---

## 🧪 Testing Strategy

### Test Coverage

1. **Unit Tests** (Jest)
   - Agent logic
   - Utility functions
   - Business calculations
   - Validation schemas

2. **Integration Tests** (Jest)
   - API endpoints
   - Database operations
   - Service integrations

3. **E2E Tests** (Playwright)
   - User workflows
   - FNOL submission
   - Claim review process
   - Payment processing

### Test Data

**Seed Data Provided:**

- Sample policies (various states and coverage types)
- Sample vehicles
- Sample claims (various types and severities)
- Test users (all roles)

---

## 🚢 Deployment

### Recommended Platforms

1. **Vercel** (Primary recommendation)
   - Native Next.js support
   - Automatic deployments
   - Edge network
   - Serverless functions

2. **Docker** (Self-hosted)
   - Dockerfile provided
   - Container orchestration ready
   - Suitable for on-premises deployment

3. **AWS / Azure / GCP**
   - Full control
   - Scalable infrastructure
   - Suitable for large carriers

### Database Hosting

- **Vercel Postgres** (development/small deployments)
- **AWS RDS** (production)
- **Azure Database for PostgreSQL** (production)
- **Google Cloud SQL** (production)
- **Self-hosted PostgreSQL 15+**

### Environment Considerations

**Production Requirements:**

- SSL/TLS certificates
- Environment variables configured
- Database connection pooling
- Rate limiting with Redis
- CDN for static assets
- Monitoring and alerting
- Backup and disaster recovery

---

## 📚 Domain Knowledge Required

### Insurance Terminology

- **FNOL**: First Notice of Loss (initial claim report)
- **ACV**: Actual Cash Value
- **TL**: Total Loss
- **UM/UIM**: Uninsured/Underinsured Motorist coverage
- **SIU**: Special Investigation Unit (fraud investigation)
- **Subrogation**: Recovery from at-fault parties
- **Reserve**: Amount set aside for claim payment
- **Bad Faith**: Insurer acting unreasonably against policyholder interests
- **Adjudication**: The decision-making process for claims

### Regulatory Knowledge

- **50-State Compliance**: Each state has unique regulations
- **Time Limits**: Statutory acknowledgment and payment deadlines
- **Required Disclosures**: State-mandated language in communications
- **Comparative Negligence**: How fault is allocated (varies by state)
- **Total Loss Thresholds**: When vehicle is deemed total loss (varies by state)

### Claims Handling Principles

- **Good Faith**: Insurer must act reasonably and fairly
- **Prompt Payment**: Timely processing required by law
- **Thorough Investigation**: Cannot deny without proper investigation
- **Clear Communication**: Claimants entitled to understand process
- **Documentation**: Every decision must be documented

---

## 🎓 Code Quality & Standards

### TypeScript Standards

- Strict mode enabled
- No implicit any
- Full type coverage
- Interfaces for all data structures

### Code Organization

- Clear separation of concerns
- DRY principles
- Single responsibility per file
- Reusable components and utilities

### Naming Conventions

- PascalCase for components, classes, types
- camelCase for functions, variables
- UPPER_SNAKE_CASE for constants
- Descriptive, self-documenting names

### Documentation

- JSDoc comments for all functions
- README files in complex directories
- Inline comments for complex logic
- API documentation

---

## 🔮 Future Enhancements (Roadmap)

### Planned Features

1. **Multi-Line Support**
   - Homeowners claims
   - General liability
   - Workers compensation

2. **Advanced Analytics**
   - Predictive modeling
   - Cost forecasting
   - Fraud prediction

3. **Mobile App**
   - Native iOS/Android
   - Photo capture optimized
   - Push notifications

4. **Voice Integration**
   - Phone FNOL capture
   - Voice-to-text processing
   - Automated acknowledgments

5. **Blockchain**
   - Immutable claim records
   - Smart contract payments
   - Multi-carrier collaboration

---

## 📄 License & Legal

- **Version**: 3.0.0
- **License**: Private/Proprietary
- **Owner**: bonapart3
- **Repository**: <https://github.com/bonapart3/claimagent>

---

## 🎯 Summary for AI Prompt Usage

When working with this codebase, understand that:

1. **This is a production insurance application** with real-world business logic, not a toy project
2. **Multi-agent AI architecture** is the core innovation - 27+ agents coordinated by a master orchestrator
3. **Compliance is paramount** - every decision must be auditable and state-compliant
4. **Financial precision matters** - all amounts in cents, calculations must be exact
5. **Security is critical** - PII encryption, audit trails, role-based access
6. **The goal is automation with safety** - 80% auto-approval with robust escalation for edge cases
7. **TypeScript types are gospel** - trust the type system for data structure understanding
8. **Database schema is comprehensive** - 713 lines covering entire claim lifecycle
9. **Follow the orchestrator** - understand the master_orchestrator.ts flow to understand the entire system
10. **State-specific logic is everywhere** - never assume one-size-fits-all regulations

This codebase represents an enterprise-grade, production-ready AI-augmented insurance claims platform designed to reduce costs, improve speed, and maintain accuracy while ensuring full regulatory compliance.
