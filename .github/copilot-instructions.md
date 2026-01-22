# ClaimAgent – AI Coding Agent Instructions

These instructions summarize how this Next.js 14 + TypeScript app is structured and how to work productively within it.

## Architecture & Key Paths
- Framework: Next.js 14 (App Router) with TypeScript strict mode. See [tsconfig.json](../tsconfig.json) and [next.config.js](../next.config.js).
- Source layout: [src](src) with aliases: `@/*`, `@/components/*`, `@/lib/*`, `@/agents/*`, `@/services/*` (see `paths` in [tsconfig.json](../tsconfig.json)).
- App Router: routes under [src/app](src/app); server routes under [src/app/api/**](src/app/api).
- Data layer: Prisma + PostgreSQL. Schema in [prisma/schema.prisma](prisma/schema.prisma); seed in [prisma/seed.ts](prisma/seed.ts).
- Agents: Orchestration and specialized agents in [src/lib/agents](src/lib/agents), e.g., [master_orchestrator.ts](src/lib/agents/master_orchestrator.ts), [orchestrator.ts](src/lib/agents/orchestrator.ts).
- Domain services: [src/lib/services](src/lib/services) (e.g., [policyValidation.ts](src/lib/services/policyValidation.ts), [aiDamageAnalysis.ts](src/lib/services/aiDamageAnalysis.ts)).
- Middleware: Auth/routing in [src/middleware.ts](src/middleware.ts).
- Public assets: [public](public).

## Developer Workflows
- Install: `npm install` (Node 18+). Postinstall runs `prisma generate`.
- Dev server: `npm run dev` → http://localhost:3000
- Build/start: `npm run build` then `npm run start` (Next output: `standalone`).
- Lint/format/type-check: `npm run lint`, `npm run format`, `npm run type-check`.
- Tests: Jest (`npm test`, `npm run test:unit`, `npm run test:integration`) + Playwright E2E (`npm run test:e2e`). Coverage: `npm run test:coverage`.
- Database: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`. Configure envs from [.env.example](.env.example).

## Patterns & Conventions
- API routes: Use App Router `route.ts` files under [src/app/api](src/app/api). Typical flow: validate → service call(s) → Prisma ops → structured response. Examples live under [src/app/api/claims](src/app/api/claims) and [src/app/api/fraud](src/app/api/fraud).
- Services: Keep side-effects isolated and return typed results. Example policy validation uses Prisma and maps DB models to `Policy` interface ([policyValidation.ts](src/lib/services/policyValidation.ts)). AI damage analysis logs via `auditLog`, validates inputs, and falls back when external AI is unavailable ([aiDamageAnalysis.ts](src/lib/services/aiDamageAnalysis.ts)).
- Agents & orchestration: The master orchestrator coordinates phased processing (Intake → Investigation/Fraud → Evaluation → Communications → QA → Final Validation → Decision). See auto-approval criteria and escalation triggers in [master_orchestrator.ts](src/lib/agents/master_orchestrator.ts). A lighter, types-driven version is in [orchestrator.ts](src/lib/agents/orchestrator.ts).
- Auth & middleware: Public routes and API exceptions defined in [src/middleware.ts](src/middleware.ts). Session token expected via cookie; middleware passes `x-session-token` downstream.
- Path aliases: Prefer `@/...` imports per [tsconfig.json](tsconfig.json) `paths`. Example: `import { aiDamageAnalysis } from '@/lib/services/aiDamageAnalysis'`.
- Security headers & CSP: Managed in [next.config.js](next.config.js) (`headers()`), including `Content-Security-Policy`, `Permissions-Policy`, and image domains. Avoid introducing client-side packages that break CSP.

## Integration Points
- External AI: OpenAI via envs (`OPENAI_*`) and custom endpoints (`AI_DAMAGE_MODEL_ENDPOINT`) referenced in services.
- Compliance/State rules: Encapsulated in services like [StateComplianceRules.ts](src/lib/services/StateComplianceRules.ts) and Prisma models in [prisma/schema.prisma](prisma/schema.prisma).
- Valuation/fraud/payment: Service boundaries in [src/lib/services](src/lib/services) (e.g., `valuationAPI.ts`, `fraudDetection.ts`, `paymentProcessor.ts`).

## Example Flows
- Submit claim: Handler lives under [src/app/api/claims/submit](src/app/api/claims/submit). Pattern: parse + validate → call `policyValidation` → compute severity → persist → return processing status.
- Automate claim: [src/app/api/claims/[id]/automate](src/app/api/claims/[id]/automate) triggers orchestrator phases and records escalation triggers.
- Fraud score: [src/app/api/fraud/score](src/app/api/fraud/score) invokes detection service and updates `FraudAnalysis`.

## Adding Features Safely
- New API endpoint: Create `route.ts` under appropriate `src/app/api/...` path, validate input (e.g., Zod), call services, and persist via Prisma. Honor auth middleware expectations.
- New agent/service: Place files under [src/lib/agents](src/lib/agents) or [src/lib/services](src/lib/services), export typed functions/classes, and log via audit trail when applicable. Wire into orchestrator phases if part of core processing.
- DB changes: Update [prisma/schema.prisma](prisma/schema.prisma), then `npm run db:migrate`. Reflect interface mappings in services.

## Environment & Ops Notes
- Configure secrets in `.env` per [.env.example](.env.example): `DATABASE_URL`, `NEXTAUTH_*`, `OPENAI_API_KEY`, `SENTRY_DSN`, etc.
- Next.js config enforces ESLint during build and uses `output: 'standalone'` for Docker/Vercel.
- Rate limiting and security flags are env-driven (see `.env.example` keys like `RATE_LIMIT_*`, `DDOS_PROTECTION_ENABLED`).

If any sections feel incomplete or you need deeper examples (e.g., specific route handlers or agent interfaces), tell me which areas to expand and I’ll iterate.