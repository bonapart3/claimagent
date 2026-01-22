# Quick Reference: Branch Consolidation Checklist

## Merge Order & Commands

### Phase 1: Critical Foundation (DO FIRST)

```bash
# Branch 1: Prisma Schema (MOST IMPORTANT)
git checkout copilot/consolidate-all-feature-branches
git show claude/debug-prisma-schema-zzeRe:prisma/schema.prisma > prisma/schema.prisma
git show claude/debug-prisma-schema-zzeRe:prisma/seed.ts > prisma/seed.ts
git show claude/debug-prisma-schema-zzeRe:src/lib/prisma.ts > src/lib/prisma.ts
# Test: npx prisma generate && npx prisma migrate dev

# Branch 2: Environment Config
git show claude/migrate-neon-postgres-7X6aL:.env.example > .env.example
# Review and merge any unique settings

# Branch 3: Layout Fixes
git show copilot/fix-deploy-issue-agent-io:src/app/layout.tsx > src/app/layout.tsx
# Test: npm run build && npm run dev
```

### Phase 2: Repository Governance

```bash
# Branch 4: GitHub Workflows & CODEOWNERS
mkdir -p .github/workflows
git show copilot/improve-github-actions-workflow:.github/workflows/neon_db.yaml > .github/workflows/neon_db.yaml
git show copilot/improve-github-actions-workflow:.github/CODEOWNERS > .github/CODEOWNERS

# Branch 5: Copilot Instructions & Templates
git show copilot/setup-copilot-instructions:.github/copilot-instructions.md > .github/copilot-instructions.md
git show copilot/setup-copilot-instructions:.github/ISSUE_TEMPLATE/bug_report.md > .github/ISSUE_TEMPLATE/bug_report.md
git show copilot/setup-copilot-instructions:.github/ISSUE_TEMPLATE/feature_request.md > .github/ISSUE_TEMPLATE/feature_request.md
git show copilot/setup-copilot-instructions:.github/PULL_REQUEST_TEMPLATE.md > .github/PULL_REQUEST_TEMPLATE.md

# Branch 6: Security & Contributing
git show claude/full-system-diagnostic-pya32:SECURITY.md > SECURITY.md
git show claude/full-system-diagnostic-pya32:CONTRIBUTING.md > CONTRIBUTING.md
```

### Phase 3: Deployment Configurations

```bash
# Branch 7: Cloudflare Workers (Complete Implementation)
mkdir -p workers
git show claude/update-cloudflare-workers-ui-aeLKg:workers/index.ts > workers/index.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/handler.ts > workers/handler.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/api.ts > workers/api.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/assets.ts > workers/assets.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/security.ts > workers/security.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/rateLimit.ts > workers/rateLimit.ts
git show claude/update-cloudflare-workers-ui-aeLKg:workers/tsconfig.json > workers/tsconfig.json

# Branch 8: Railway Config
git show claude/debug-railway-deployment-qqpdI:railway.toml > railway.toml

# Branch 9: Cloudflare Pages (review for conflicts with #7)
# Only if wrangler.toml doesn't exist or needs Pages-specific config
git show claude/cloudflare-deployment-setup-jiuuC:wrangler.toml > wrangler.toml
```

### Phase 4: Documentation

```bash
# Branch 10: Enhanced README (merge carefully)
# Manual merge recommended - compare with current README.md
git show claude/review-codebase-scope-mAOfF:README.md > README_new.md
# Review both, merge manually

# Branch 11: Repository Analysis
git show claude/github-repo-analysis-x4BzL:REPOSITORY_ANALYSIS.md > REPOSITORY_ANALYSIS.md
```

### Phase 5: Testing & Cleanup

```bash
# Branch 12: Test Infrastructure
mkdir -p tests/setup tests/setup/mocks tests/fixtures
git show claude/build-claims-assistant-TU2Uu:tests/setup/jest.setup.ts > tests/setup/jest.setup.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/globalTeardown.ts > tests/setup/globalTeardown.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/testDb.ts > tests/setup/testDb.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/mocks/aiDamageAnalysis.mock.ts > tests/setup/mocks/aiDamageAnalysis.mock.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/mocks/documentOCR.mock.ts > tests/setup/mocks/documentOCR.mock.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/mocks/paymentProcessor.mock.ts > tests/setup/mocks/paymentProcessor.mock.ts
git show claude/build-claims-assistant-TU2Uu:tests/setup/mocks/vehicleValuation.mock.ts > tests/setup/mocks/vehicleValuation.mock.ts
git show claude/build-claims-assistant-TU2Uu:tests/fixtures/index.ts > tests/fixtures/index.ts

# Branch 13: Bug Fixes (cherry-pick as needed)
# Review individual commits from claude/analyze-claimsagent-repo-LDAes
```

## Verification After Each Phase

### Phase 1 Verification
- [ ] `npm install` succeeds
- [ ] `npx prisma generate` works
- [ ] `npx prisma migrate dev` runs cleanly
- [ ] `npm run build` completes
- [ ] `npm run dev` starts server
- [ ] http://localhost:3000 loads
- [ ] No console errors about fonts

### Phase 2 Verification
- [ ] `.github/workflows/neon_db.yaml` syntax is valid
- [ ] `.github/CODEOWNERS` is properly formatted
- [ ] Issue templates render on GitHub
- [ ] PR template renders on GitHub
- [ ] Copilot can read instructions

### Phase 3 Verification
- [ ] `workers/` directory has all TypeScript files
- [ ] `railway.toml` is valid TOML format
- [ ] `wrangler.toml` is valid (if added)
- [ ] No syntax errors in worker files

### Phase 4 Verification
- [ ] README.md renders correctly
- [ ] All links in README work
- [ ] REPOSITORY_ANALYSIS.md renders
- [ ] No broken markdown syntax

### Phase 5 Verification
- [ ] Test files import correctly
- [ ] Jest config loads
- [ ] `npm test` runs (tests may fail, but command should work)

## Files to Clean Up (Delete These)

After verifying Prisma schema works:
```bash
# These are orphan/duplicate files
rm prisma/Untitled-2.js
rm prisma/schema.prism
```

## Post-Consolidation Tasks

1. **Update package.json URLs**
   - Change repository URL to correct GitHub repo
   - Update homepage and bug report URLs

2. **Choose License**
   - Decide: Apache 2.0 or Proprietary
   - Add LICENSE file

3. **Update CODEOWNERS**
   - Replace `@bonapart3` with actual team handles when available
   - Or keep as-is for now

4. **Verify Security Contact**
   - Confirm `security@claimagent.io` is correct
   - Update in SECURITY.md if needed

5. **Create .gitignore**
   - See BRANCH_ANALYSIS_REPORT.md for recommended .gitignore

6. **Test All Deployment Platforms**
   - Test Vercel deployment
   - Test Railway deployment (if using)
   - Test Cloudflare Workers (if using)
   - Test Cloudflare Pages (if using)

## Rollback Plan

If something goes wrong:
```bash
# Check current state
git status

# If committed but not pushed
git reset --hard HEAD~1

# If pushed but broken
git revert HEAD

# If multiple commits to undo
git log --oneline -10
git reset --hard <commit-hash>
git push --force
```

## Commit Strategy

After each phase:
```bash
git add .
git commit -m "Phase N: <description>"
git push origin copilot/consolidate-all-feature-branches
```

Example commit messages:
- "Phase 1: Add complete Prisma schema, environment config, and layout fixes"
- "Phase 2: Add GitHub workflows, CODEOWNERS, templates, and Copilot instructions"
- "Phase 3: Add Cloudflare Workers, Railway, and deployment configurations"
- "Phase 4: Update README and add repository analysis documentation"
- "Phase 5: Add test infrastructure and bug fixes"

## Emergency Contacts

If you encounter issues:
- Database schema problems → Review `claude/debug-prisma-schema-zzeRe` branch directly
- Build failures → Review `copilot/fix-deploy-issue-agent-io` branch
- Deployment issues → Review respective deployment branch
- Merge conflicts → See BRANCH_ANALYSIS_REPORT.md conflict resolution section
