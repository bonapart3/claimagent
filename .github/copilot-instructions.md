# Repository Copilot Instructions

> Save as: `.github/copilot-instructions.md` in your repository

---

## Project Context

This is an **enterprise-grade AI-augmented autonomous insurance claims processing platform** for automotive P&C insurance carriers. ClaimAgent handles automotive insurance claims from FNOL (First Notice of Loss) to settlement with 80%+ straight-through processing capability using a multi-agent AI architecture.

### Tech Stack

- **Language**: TypeScript 5.x (strict mode)
- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL 15+ with Prisma ORM 5.0+
- **AI/ML**: OpenAI GPT-4, Claude, Custom ML Models
- **Auth**: NextAuth.js with role-based access control
- **UI**: React 18, Tailwind CSS, Radix UI components
- **Testing**: Jest, React Testing Library, Playwright
- **State Management**: Zustand, React Query (TanStack Query)
- **Validation**: Zod schemas
- **Security**: Helmet, rate limiting, encryption (AES-256, TLS 1.3)

### Architecture

```
src/
├── app/                    # Next.js 14 App Router pages
│   ├── api/               # API routes
│   ├── claims/            # Claims-related pages
│   ├── login/             # Authentication pages
│   └── layout.tsx         # Root layout
├── components/            # React UI components
│   ├── ui/               # Reusable UI primitives (Button, Input, etc.)
│   ├── claims/           # Domain-specific components
│   └── layout/           # Layout components (Header, Sidebar)
├── lib/                   # Core application logic
│   ├── agents/           # Multi-agent AI system
│   │   ├── intake/       # Intake & triage agents
│   │   ├── investigation/ # Investigation agents
│   │   ├── fraud/        # Fraud detection agents
│   │   ├── evaluation/   # Evaluation & settlement agents
│   │   ├── communications/ # Communication agents
│   │   ├── qa/           # Quality assurance agents
│   │   ├── validation/   # Regulatory validation
│   │   └── orchestrator.ts # Master orchestrator
│   ├── services/         # External API integrations
│   ├── utils/            # Utility functions
│   ├── hooks/            # React custom hooks
│   ├── types/            # TypeScript type definitions
│   ├── schemas/          # Zod validation schemas
│   ├── constants/        # Constants and configuration
│   └── prisma.ts         # Prisma client instance
├── prisma/               # Database schema and migrations
└── middleware.ts         # Next.js middleware
```

## Coding Standards

### Naming Conventions
- **Files**: kebab-case (`fraud-detection.ts`, `claim-processor.ts`)
- **Components**: PascalCase (`ClaimCard.tsx`, `FraudIndicator.tsx`)
- **Functions**: camelCase (`getUserById`, `analyzeClaim`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT`)
- **Types/Interfaces**: PascalCase (`Claim`, `FraudScore`, `UserRole`)
- **Enums**: PascalCase with PascalCase values (`enum ClaimStatus { Open = 'Open', Closed = 'Closed' }`)

### File Structure
```typescript
// 1. File header comment (optional, for complex files)
/**
 * Fraud Detection Service
 * Multi-layered fraud detection combining rule-based logic and ML models
 * @module services/fraudDetection
 */

// 2. Imports (external, then internal, alphabetized within groups)
import { useState, useEffect } from 'react';
import { OpenAI } from 'openai';

import { cn } from '@/lib/utils/cn';
import { Claim } from '@/lib/types/claim';

// 3. Types/Interfaces (exported interfaces first, then internal)
export interface FraudScore {
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: FraudFlag[];
}

interface InternalConfig {
  // ...
}

// 4. Constants
const DEFAULT_TIMEOUT = 30000;
const MAX_RETRY_COUNT = 3;

// 5. Main export (component, service class, or functions)
export class FraudDetectionService {
  // ...
}

// 6. Helper functions (not exported)
function calculateScore(flags: FraudFlag[]): number {
  // ...
}
```

### Error Handling Pattern
```typescript
// Use try-catch for async operations with proper error logging
async function fetchClaim(id: string): Promise<Claim> {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { vehicle: true, claimant: true }
    });
    
    if (!claim) {
      throw new Error(`Claim not found: ${id}`);
    }
    
    await auditLog({
      action: 'CLAIM_FETCHED',
      entityType: 'claim',
      entityId: id
    });
    
    return claim;
  } catch (error) {
    await auditLog({
      action: 'CLAIM_FETCH_ERROR',
      entityType: 'claim',
      entityId: id,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    throw error;
  }
}

// For API routes, use consistent response format
export async function GET(request: Request) {
  try {
    const data = await fetchData();
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Testing Patterns
```typescript
// Use Arrange-Act-Assert pattern
describe('FraudDetectionService', () => {
  describe('analyzeClaim', () => {
    it('should flag claim with rapid policy purchase', async () => {
      // Arrange
      const fraudService = new FraudDetectionService();
      const claim: Claim = {
        id: 'CLM-001',
        lossDate: new Date('2024-01-20'),
        policy: {
          effectiveDate: new Date('2024-01-15') // 5 days before loss
        }
      };

      // Act
      const result = await fraudService.analyzeClaim(claim);

      // Assert
      expect(result.flags).toContainEqual(
        expect.objectContaining({
          type: 'rapid_policy_purchase',
          severity: 'high'
        })
      );
      expect(result.overallScore).toBeGreaterThan(0);
    });
  });
});
```

## Component Patterns

### React Components
```tsx
// Prefer function components with explicit typing
interface ClaimCardProps {
  claim: Claim;
  onEdit?: (claimId: string) => void;
  onDelete?: (claimId: string) => void;
  className?: string;
}

export function ClaimCard({ claim, onEdit, onDelete, className }: ClaimCardProps) {
  const handleEdit = useCallback(() => {
    onEdit?.(claim.id);
  }, [claim.id, onEdit]);

  const handleDelete = useCallback(() => {
    if (confirm('Are you sure you want to delete this claim?')) {
      onDelete?.(claim.id);
    }
  }, [claim.id, onDelete]);

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <h3 className="text-lg font-semibold">{claim.claimNumber}</h3>
      <p className="text-sm text-muted-foreground">{claim.description}</p>
      <div className="mt-4 flex gap-2">
        {onEdit && (
          <Button onClick={handleEdit} size="sm">Edit</Button>
        )}
        {onDelete && (
          <Button onClick={handleDelete} size="sm" variant="destructive">
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
```

### API Routes (Next.js App Router)
```typescript
// src/app/api/claims/[id]/route.ts
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { auditLog } from '@/lib/utils/auditLogger';

// GET /api/claims/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const claim = await prisma.claim.findUnique({
      where: { id: params.id },
      include: { 
        vehicle: true, 
        claimant: true,
        documents: true 
      }
    });

    if (!claim) {
      return Response.json({ error: 'Claim not found' }, { status: 404 });
    }

    await auditLog({
      action: 'CLAIM_VIEWED',
      userId: session.user.id,
      entityType: 'claim',
      entityId: claim.id
    });

    return Response.json({ data: claim });
  } catch (error) {
    console.error('Error fetching claim:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/claims/[id]
const updateSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'SETTLED', 'DENIED']).optional(),
  notes: z.string().optional(),
  estimatedAmount: z.number().positive().optional()
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const claim = await prisma.claim.update({
      where: { id: params.id },
      data: validatedData
    });

    await auditLog({
      action: 'CLAIM_UPDATED',
      userId: session.user.id,
      entityType: 'claim',
      entityId: claim.id,
      metadata: validatedData
    });

    return Response.json({ data: claim });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating claim:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Database Patterns

### Prisma Query Structure
```typescript
// Use Prisma's type-safe query builder
// Always include necessary relations for performance

// Good: Explicit includes
const claim = await prisma.claim.findUnique({
  where: { id: claimId },
  include: {
    vehicle: true,
    claimant: true,
    policy: {
      include: {
        coverages: true
      }
    },
    documents: {
      where: { 
        status: 'ACTIVE' 
      },
      orderBy: {
        createdAt: 'desc'
      }
    }
  }
});

// Good: Use transactions for related operations
const result = await prisma.$transaction(async (tx) => {
  const claim = await tx.claim.create({
    data: claimData
  });

  await tx.auditLog.create({
    data: {
      action: 'CLAIM_CREATED',
      entityType: 'claim',
      entityId: claim.id,
      userId: user.id
    }
  });

  return claim;
});

// Good: Batch operations for performance
const claims = await prisma.claim.findMany({
  where: {
    status: 'OPEN',
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  },
  take: 100,
  skip: page * 100,
  orderBy: {
    createdAt: 'desc'
  }
});
```

### Migrations
```prisma
// Always write reversible migrations with clear comments

// Create migration:
// npx prisma migrate dev --name add_fraud_score_to_claims

// In schema.prisma:
model Claim {
  // ... existing fields
  
  // Fraud detection fields
  fraudScore      Float     @default(0)
  fraudFlags      Json?     // Stored as JSONB in PostgreSQL
  requiresSIU     Boolean   @default(false)
  
  @@index([fraudScore])
  @@index([requiresSIU])
}
```

## Security Checklist

When suggesting code, ensure:
- [ ] No secrets or API keys in code (use environment variables)
- [ ] Input validation on all user data (use Zod schemas)
- [ ] SQL injection prevention (use Prisma parameterized queries)
- [ ] XSS prevention in output (React escapes by default, be careful with dangerouslySetInnerHTML)
- [ ] CSRF protection for mutations (Next.js handles this)
- [ ] Rate limiting on public endpoints (use middleware)
- [ ] Proper authentication checks (use getServerSession)
- [ ] Role-based authorization (check user.role)
- [ ] Audit logging for sensitive operations (use auditLog utility)
- [ ] PII encryption for sensitive data (use encryption utility)
- [ ] HTTPS/TLS for all communications (enforced in production)

## Common Imports

```typescript
// Utils we commonly use
import { cn } from '@/lib/utils/cn';                    // Tailwind class name merging
import { prisma } from '@/lib/prisma';                  // Prisma client instance
import { auditLog } from '@/lib/utils/auditLogger';    // Audit logging
import { validate } from '@/lib/utils/validation';      // Input validation helpers

// Type definitions
import { Claim } from '@/lib/types/claim';
import { Policy } from '@/lib/types/policy';
import { Agent } from '@/lib/types/agent';

// UI components
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

// Hooks
import { useClaims } from '@/lib/hooks/useClaims';
import { useAuth } from '@/lib/hooks/useAuth';

// Authentication
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
```

## Domain-Specific Guidelines

### Claims Processing
- All claim state changes must be audit logged
- Fraud detection should run on all new claims
- Claims over $2,500 require human review
- Settlement calculations must follow state-specific regulations
- All AI agent decisions must include confidence scores

### Fraud Detection
- Fraud scores range from 0-100
- Score ≥50 triggers SIU review
- Always log fraud analysis results
- Multiple fraud indicators increase weight exponentially
- Watchlist checks are mandatory for all participants

### Compliance & Regulations
- Check state-specific requirements before settlement
- Document all compliance checks in audit log
- Legal firewall prevents unauthorized denials
- All communications must follow state DOI requirements
- PII must be encrypted at rest and in transit

### AI Agent Architecture
- Each agent has a specific role and expertise
- Agents communicate through the orchestrator
- All agent decisions include confidence scores
- Low confidence triggers human review
- Agent results are always auditable

## Do NOT Suggest

- `any` type - use `unknown` or proper types
- `// @ts-ignore` - fix the type issue instead
- `eslint-disable` - fix the lint issue instead
- Inline styles - use Tailwind utility classes
- Direct DOM manipulation - use React patterns
- Raw SQL queries - use Prisma query builder
- Storing secrets in code - use environment variables
- Synchronous I/O in API routes - use async/await
- Mutations without audit logging - always log sensitive operations
- Skipping fraud detection - mandatory for all claims

## Best Practices

### Performance
- Use React.memo() for expensive components
- Implement proper loading states
- Use React Query for data fetching and caching
- Lazy load components with React.lazy()
- Optimize images with Next.js Image component
- Use Prisma connection pooling

### Code Quality
- Write descriptive commit messages
- Keep functions focused (single responsibility)
- Extract magic numbers into named constants
- Document complex business logic
- Write tests for critical paths
- Use TypeScript strict mode

### Error Handling
- Never swallow errors silently
- Log errors with context
- Return user-friendly error messages
- Use audit logging for debugging production issues
- Implement proper error boundaries in React

---

**Remember**: ClaimAgent handles real insurance claims with real money. Code quality, security, and accuracy are paramount. When in doubt, err on the side of caution and require human review.
