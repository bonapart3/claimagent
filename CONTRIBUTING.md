# Contributing to ClaimAgent

Thank you for your interest in contributing to ClaimAgent. This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Use welcoming and inclusive language
- Respect differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the project
- Show empathy towards other contributors

## Getting Started

### Prerequisites

- Node.js 18.0+
- PostgreSQL 15+ (or Cloudflare D1 account)
- npm 9.0+
- Git

### Local Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claimagent.git
   cd claimagent
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
5. Set up the database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```
6. Start development server:
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/telematics-integration`)
- `fix/` - Bug fixes (e.g., `fix/fraud-score-calculation`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/agent-orchestration`)
- `test/` - Test additions (e.g., `test/coverage-calculator`)

### Workflow Steps

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes
3. Write/update tests
4. Run the test suite
5. Commit your changes
6. Push to your fork
7. Open a Pull Request

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Document public APIs with JSDoc

### File Naming

- Use camelCase for files: `claimProcessor.ts`
- Use PascalCase for React components: `ClaimCard.tsx`
- Use kebab-case for directories when needed

### Code Style

- Use ESLint and Prettier for formatting
- Run `npm run lint` before committing
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Example

```typescript
/**
 * Calculates the fraud risk score for a claim
 * @param claim - The claim to evaluate
 * @returns FraudScore object with risk level and indicators
 */
export function calculateFraudScore(claim: Claim): FraudScore {
  const indicators: FraudIndicator[] = [];
  let score = 0;

  // Check for rapid policy purchase
  if (isRapidPolicyPurchase(claim)) {
    indicators.push({ type: 'rapid_purchase', weight: 15 });
    score += 15;
  }

  return {
    overallScore: score,
    riskLevel: getRiskLevel(score),
    indicators,
  };
}
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, semicolons) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvements |

### Examples

```
feat(agents): add medical fraud screening agent

Implements ML-based screening for medical claim fraud patterns.
Integrates with existing SIU workflow.

Closes #123
```

```
fix(api): resolve race condition in claim submission

The claim ID was being generated before validation completed,
causing duplicate entries in edge cases.
```

## Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run type-check`)
- [ ] Documentation updated if needed
- [ ] Commit messages follow conventions

### PR Title Format

Use the same format as commits:
```
feat(scope): description
```

### PR Description

Include:
- Summary of changes
- Related issue numbers
- Testing performed
- Screenshots (for UI changes)

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No unresolved comments
4. Up-to-date with main branch

## Testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Writing Tests

- Place tests in `tests/` directory
- Mirror source structure: `src/lib/agents/` → `tests/unit/agents/`
- Use descriptive test names
- Aim for 80%+ code coverage

### Test Example

```typescript
describe('FraudDetectionService', () => {
  describe('calculateFraudScore', () => {
    it('should return low risk for claims with police reports', () => {
      const claim = createTestClaim({ hasPoliceReport: true });
      const result = calculateFraudScore(claim);
      expect(result.riskLevel).toBe('low');
    });
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public functions
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### README Updates

Update README.md when:
- Adding new features
- Changing installation steps
- Modifying API endpoints
- Updating dependencies

## Questions?

- Open a [Discussion](https://github.com/bonapart3/claimagent/discussions)
- Email: tyler@claimagent.io

---

Thank you for contributing to ClaimAgent!
