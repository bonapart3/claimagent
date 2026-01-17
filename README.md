# ClaimAgent - Automotive Insurance Claims Process. Simplified. Managed. Correct.

![ClaimAgent Logo](./logo.svg)

## Overview

ClaimAgent is an enterprise-grade, AI-augmented human controlled/autonomous claims processing platform for P&C insurance carriers with annual written premiums between $5M and $500M. The system handles automotive insurance claims from FNOL to settlement with 80%+ straight-through processing capability.

<<<<<<< Updated upstream
<<<<<<< Updated upstream
By leveraging a multi-agent AI architecture, ClaimAgent automates intake, investigation, fraud detection, evaluation, and communications while ensuring compliance with state regulations and carrier policies.
=======
## Features
>>>>>>> Stashed changes
=======
## Features
>>>>>>> Stashed changes

## Features

<<<<<<< Updated upstream
<<<<<<< Updated upstream
### Core Capabilities

- **Straight-Through Processing**: 80%+ auto-adjudication for collision claims
- **Multi-Agent Architecture**: Specialized AI agents for intake, investigation, fraud detection, evaluation, and communications
=======
- **Autonomous Processing**: 80%+ auto-adjudication for collision claims
- **Multi-Agent Architecture**: Specialized AI agents for intake, investigation, fraud detection, ev    aluation, and communications
>>>>>>> Stashed changes
=======
- **Autonomous Processing**: 80%+ auto-adjudication for collision claims
- **Multi-Agent Architecture**: Specialized AI agents for intake, investigation, fraud detection, ev    aluation, and communications
>>>>>>> Stashed changes
- **Legal Firewall**: Draft & Hold system prevents unauthorized denials
- **50-State Compliance**: Built-in statutory logic for all contiguous states
- **Real-Time Validation**: Policy, coverage, and regulatory compliance checks
- **Fraud Detection**: Advanced ML-based fraud scoring with SIU integration
- **Risk-Adjusted Autonomy**: Confidence-based routing to auto-approval or human review

### Performance Metrics

| Metric | Before | After |
|--------|--------|-------|
| Cycle Time | 5-7 days | 2-4 hours |
| Cost Per Claim | $900 | $140 |
| Error Rate | - | <1% |
| Fraud Loss Reduction | - | 40% |
| Adjuster Workload | - | 90% reduction |

## Architecture

### Multi-Agent System

```
Master Orchestrator
├── GROUP A: Intake & Triage (4 agents)
├── GROUP B: Investigation & Documentation (4 agents)
├── GROUP C: Fraud & Risk Detection (3 agents)
├── GROUP D: Evaluation & Settlement (4 agents)
├── GROUP E: Communications & Compliance (4 agents)
├── GROUP F: Analytics & Learning (4 agents)
├── GROUP G: Quality Assurance (3 agents)
└── AGENT Z: Final Validator (1 agent)
```

### Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.0+
- **Database**: PostgreSQL 15+ / Cloudflare D1
- **ORM**: Prisma 5.0+
- **AI/ML**: OpenAI GPT-4, Claude, Custom ML Models
- **APIs**: Valuation, Salvage, Policy Validation, State Regulations
- **Auth**: NextAuth.js
- **Security**: HTTPS, Rate Limiting, DDoS Protection, Encryption

## Prerequisites

- Node.js 18.0+
- PostgreSQL 15+ OR Cloudflare account (for D1)
- npm or yarn
- OpenAI API Key
- Valuation API credentials (e.g., CCC, Mitchell)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/bonapart3/claimagent.git
cd claimagent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:
- Database connection string
- API keys (OpenAI, valuation services)
- Authentication secrets
- Domain configuration

### 4. Initialize Database

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

<<<<<<< Updated upstream
### 5. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Production Deployment

### Vercel (Recommended)

```bash
=======
Open http://localhost
Production Deployment
Vercel (Recommended)
bash
>>>>>>> Stashed changes
npm run build
vercel deploy --prod
```

### Docker

```bash
docker build -t claimagent .
docker run -p 3000:3000 claimagent
```

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `VALUATION_API_KEY`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

<<<<<<< Updated upstream
<<<<<<< Updated upstream
## Usage

### Submitting a Claim (API)

```http
=======
=======
>>>>>>> Stashed changes
 Usage
Submitting a Claim (API)
typescript
>>>>>>> Stashed changes
POST /api/claims/submit
Content-Type: application/json

{
  "policyNumber": "AUTO-123456",
  "incidentDate": "2024-01-15T10:30:00Z",
  "vehicleVIN": "1HGCM82633A123456",
  "damageDescription": "Front-end collision",
  "photos": ["base64..."],
  "policeReportNumber": "PR-2024-001234"
}
```

### Response

```json
{
  "claimId": "CLM-2024-001234",
  "status": "processing",
  "estimatedCompletion": "2024-01-15T14:30:00Z",
  "nextSteps": ["Investigation in progress", "Adjuster review pending"],
  "acknowledgedAt": "2024-01-15T10:31:00Z"
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
```
=======
 Security Features
>>>>>>> Stashed changes
=======
 Security Features
>>>>>>> Stashed changes

## Security Features

<<<<<<< Updated upstream
<<<<<<< Updated upstream
- **Authentication**: Multi-factor authentication for adjusters
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: At-rest (AES-256) and in-transit (TLS 1.3)
- **Audit Logs**: Complete trail of all actions with timestamps
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Sanitization of all inputs
- **DDoS Protection**: Cloudflare integration

## Decision Routing Matrix

| Claim Characteristics | Auto-Approval | Human Review | Escalation |
|-----------------------|:-------------:|:------------:|:----------:|
| Amount ≤ $2,500 + low risk | ✓ | | |
| Amount > $2,500 | | ✓ | |
| Fraud Score ≥ 50 | | | ✓ |
| Bodily Injury | | ✓ | |
| Total Loss | | ✓ | |
| Sensor Repair Risk | | ✓ | |
| Coverage Dispute | | | ✓ |
| Litigation Indicator | | | ✓ |

## Tests

### Run All Tests

```bash
=======
=======
>>>>>>> Stashed changes
 Decision Routing Matrix

Claim Characteristics Auto-Approval Human Review Escalation
Amount ≤ $2,500 + Low Risk  - -
Amount > $2,500 -  -
Fraud Score ≥ 50 - -  SIU
Bodily Injury -  -
Total Loss - lvage Specialist -
Sensor Repair Risk -  Express Desk -
Coverage Dispute - -  Specialist (Draft & Hold)
Litigation Indicator - - Legal Review

 Testing
Run All Tests
bash
>>>>>>> Stashed changes
npm test
```

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

### Coverage Report

```bash
npm run test:coverage
<<<<<<< Updated upstream
<<<<<<< Updated upstream
```
=======
 Monitoring & Analytics
>>>>>>> Stashed changes
=======
 Monitoring & Analytics
>>>>>>> Stashed changes

## Monitoring & Analytics

<<<<<<< Updated upstream
<<<<<<< Updated upstream
- **Real-Time Dashboard**: Claim volume, processing times, auto-approval rates
- **Fraud Detection**: Active fraud patterns and SIU referrals
- **Performance Metrics**: Cycle time, cost per claim, error rates
- **Regulatory Compliance**: State-specific adherence tracking
- **Audit Trail**: Complete activity log with search and export

## Compliance
=======
=======
>>>>>>> Stashed changes
 Compliance
Regulatory Certifications

     All 50 contiguous U.S. states
     NAIC model regulations
     CCPA (California Consumer Privacy Act)
     GLBA (Gramm-Leach-Bliley Act)
     State DOI requirements
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

### Regulatory Certifications

- All 50 contiguous U.S. states
- NAIC model regulations
- CCPA (California Consumer Privacy Act)
- GLBA (Gramm-Leach-Bliley Act)
- State DOI requirements

<<<<<<< Updated upstream
<<<<<<< Updated upstream
### Privacy & Data Protection
=======
=======
>>>>>>> Stashed changes
 Contributing
Development Workflow
>>>>>>> Stashed changes

- PII encryption at rest and in transit
- Data retention policies per state requirements
- Right to access, correction, and deletion (CCPA)
- Annual security audits

## Contributing

### Development Workflow

<<<<<<< Updated upstream
<<<<<<< Updated upstream
1. Create feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push branch: `git push origin feature/your-feature`
4. Submit Pull Request

### Code Standards

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- 80%+ test coverage required
- Documentation for all public APIs

## Support

- **Documentation**: https://docs.claimagent.io
- **Email**: contact@claimagent.io
- **Phone**: 1-800-CLAIM-AI (1-409-308-9357)
- **Status Page**: https://status.claimagent.io
=======
=======
>>>>>>> Stashed changes
 Support

    Documentation: https://docs.claimagent.io
    Email: contimagent.io
    Phone: (1-409-308-9357)
    Status Page: https://beta.claimagent.io

License

Proprietary - All Rights Reserved
© 2026 ClaimAgent™ / Veridicus Insurance Technology
 Roadmap
Q1 2026

     Ochestration system
    50-state compliance engine
    ✅ Fraud detection ML models
>>>>>>> Stashed changes

## License

<<<<<<< Updated upstream
<<<<<<< Updated upstream
Apache License 2.0 - See [LICENSE](./LICENSE) for details.
=======
     Multi-language support (Spanish, French)
     Mobile app (iOS/Android)
     Telematics integration
>>>>>>> Stashed changes
=======
     Multi-language support (Spanish, French)
     Mobile app (iOS/Android)
     Telematics integration
>>>>>>> Stashed changes

Copyright 2026 ClaimAgent / Veridicus Insurance Technology

<<<<<<< Updated upstream
<<<<<<< Updated upstream
## Roadmap
=======
     Advanced predictive analytics
     Blockchain settlement integration
    IoT sensor data processing
>>>>>>> Stashed changes
=======
     Advanced predictive analytics
     Blockchain settlement integration
    IoT sensor data processing
>>>>>>> Stashed changes

### Q1 2026

<<<<<<< Updated upstream
<<<<<<< Updated upstream
- [x] Orchestration system
- [x] 50-state compliance engine
- [x] Fraud detection ML models

### Q2 2026
=======
     International expansion (Canada, UK)
     Commercial auto claims support
     Catastrophe claims handling
=======
     International expansion (Canada, UK)
     Commercial auto claims support
     Catastrophe claims handling

 Documentation
>>>>>>> Stashed changes

 Documentation
>>>>>>> Stashed changes

<<<<<<< Updated upstream
- [ ] Multi-language support (Spanish, French)
- [ ] Mobile app (iOS/Android)
- [ ] Telematics integration
=======
 Achievements
>>>>>>> Stashed changes

<<<<<<< Updated upstream
### Q3 2026
=======
 Achievements
>>>>>>> Stashed changes

<<<<<<< Updated upstream
- [ ] Advanced predictive analytics
- [ ] Blockchain settlement integration
- [ ] IoT sensor data processing
=======
Built with it by the ClaimAgent™ Team
>>>>>>> Stashed changes

<<<<<<< Updated upstream
### Q4 2026
=======
Built with it by the ClaimAgent™ Team
>>>>>>> Stashed changes

- [ ] International expansion (Canada, UK)
- [ ] Commercial auto claims support
- [ ] Catastrophe claims handling

## Documentation

- [API Reference](./docs/api.md)
- [Agent Architecture](./docs/agents.md)
- [State Regulations](./docs/regulations.md)
- [Fraud Detection](./docs/fraud.md)
- [Deployment Guide](./docs/deployment.md)
- [Security Whitepaper](./docs/security.md)

## Achievements

- **2026 InsurTech Innovation Award** - Best Claims Automation Platform
- **SOC 2 Type II Certified** - Security & Availability
- **ISO 27001 Compliant** - Information Security Management

---

Built with care by the ClaimAgent Team

**Deployed at**: [claimagent.io](https://claimagent.io) | [beta.claimagent.io](https://beta.claimagent.io)
