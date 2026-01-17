# Audit Readiness Checklist (ClaimAgent)

This checklist maps common professional audit expectations to concrete artifacts, controls, and tests in this repo.

## Security & Compliance

- Policies: Document access control, incident response, and change management.
- Encryption: TLS in transit; at-rest controls for DB and object storage.
- Dependencies: Vulnerability scanning and remediation.
- Secrets: No secrets in source; managed via environment.

### Verify

```bash
# Dependencies
npm run security:audit

# Lint & types
npm run lint
npm run type-check

# Build
npm run build

# Tests
npm test
npm run test:integration
npm run test:e2e

# Prisma
npm run db:generate
npm run db:migrate
```

## Authentication & Authorization

- Middleware protects non-public routes and APIs.
- Role-based access enforced in route handlers/pages.

### Inspect

- Middleware rules: see [src/middleware.ts](../src/middleware.ts).
- Public vs protected APIs: see [src/app/api](../src/app/api).

### Suggested Tests

- Unauthenticated requests to protected pages redirect to `/login`.
- Unauthenticated requests to protected APIs return 401.
- Role-restricted paths only allow specified roles.

## Audit Trail & Logging

- Actions logged with metadata (actor, entity, timestamp).
- Immutable logs with indices for audits.

### Inspect

- Prisma models: `AuditLog`, `AgentLog` in [prisma/schema.prisma](../prisma/schema.prisma).
- Service logging: e.g., `auditLog` usage in [src/lib/services/aiDamageAnalysis.ts](../src/lib/services/aiDamageAnalysis.ts).

### Suggested Tests

- Assert audit log entries are created for key operations (AI analysis start/complete/error).
- Verify DB indices exist for audit lookup performance.

## Data Protection & Privacy

- PII handled securely and minimally.
- Data retention policies per state.

### Inspect

- Compliance models: `StateRegulation`, retention settings in env: see [.env.example](../.env.example).

### Suggested Tests

- Validate export and purge flows; ensure PII encryption configuration present.

## Secure Headers & CSP

- Strong security headers applied globally.

### Inspect

- Headers/CSP: see `headers()` in [next.config.js](../next.config.js).

### Suggested Tests

- Integration test to assert presence of `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy` keys.

## Rate Limiting & DDoS

- Configurable rate limits, DDoS flags.

### Inspect

- Env flags: `RATE_LIMIT_*`, `DDOS_PROTECTION_ENABLED` in [.env.example](../.env.example).

### Suggested Tests

- Simulate burst traffic; assert 429 where configured.

## Database Governance

- Schema migration history, reproducible environments.
- Seed data for non-prod.

### Inspect

- Prisma schema: [prisma/schema.prisma](../prisma/schema.prisma).
- Seeds: [prisma/seed.ts](../prisma/seed.ts).

### Suggested Tests

- `prisma migrate status` shows applied migrations and no drift.
- Seed populates minimal fixtures in non-prod.

## SDLC & Change Management

- Branching, code review, CI checks.
- Test coverage thresholds.

### Inspect

- Scripts: see [package.json](../package.json) (`test`, coverage, lint, type-check).

### Suggested Tests

- Enforce coverage targets; fail below threshold.

## Observability & Monitoring

- Error tracking and performance metrics.

### Inspect

- Sentry/DataDog envs in [.env.example](../.env.example).

### Suggested Tests

- Simulate error path; ensure Sentry capture (in non-prod with test DSN).

## External Integrations

- Valuation, fraud, payments, OCR, VIN, telematics.

### Inspect

- Services: [src/lib/services](../src/lib/services) (`valuationAPI.ts`, `fraudDetection.ts`, `paymentProcessor.ts`, `documentOCR.ts`).

### Suggested Tests

- Mock external services; assert timeouts, retries, and fallback paths.

## AI Governance

- Model usage, confidence thresholds, human-in-the-loop.

### Inspect

- Orchestration phases and auto-approval criteria: [src/lib/agents/master_orchestrator.ts](../src/lib/agents/master_orchestrator.ts), [src/lib/agents/orchestrator.ts](../src/lib/agents/orchestrator.ts).

### Suggested Tests

- Auto-approval requires all criteria (amount, fraud score, BI, sensors, confidence, disputes) to pass.
- Escalation emits structured triggers and audit entries.

## Deployment & DR

- Standalone output, containerization, env-based config, health checks.

### Inspect

- Next output: `output: 'standalone'` in [next.config.js](../next.config.js).
- Health: `HEALTH_CHECK_ENDPOINT` in [.env.example](../.env.example).

### Suggested Tests

- Health endpoint returns 200 and key metadata.

---

If you want, we can scaffold initial integration tests (security headers, auth middleware, auto-approval criteria) and add a CI workflow to run this checklist.
