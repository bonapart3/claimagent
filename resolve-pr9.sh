#!/bin/bash
# Script to resolve PR #9 merge conflicts

set -e

echo "=== Resolving PR #9 Merge Conflicts ==="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: Must be run from repository root"
    exit 1
fi

# Backup current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Fetch latest from origin
echo "Fetching latest from origin..."
git fetch origin

# Checkout or create the PR branch locally
echo "Checking out copilot/setup-copilot-instructions..."
if git show-ref --verify --quiet refs/heads/copilot/setup-copilot-instructions; then
    git checkout copilot/setup-copilot-instructions
else
    git checkout -b copilot/setup-copilot-instructions origin/copilot/setup-copilot-instructions
fi

# Merge main
echo "Merging main branch..."
git merge origin/main || {
    echo "Merge conflicts detected, resolving..."
    
    # Resolve package.json
    echo "Resolving package.json..."
    # Add the @neondatabase/serverless dependency
    sed -i '/"@heroicons\/react":/a\    "@neondatabase/serverless": "^0.9.5",' package.json
    
    # Resolve railway.toml
    echo "Resolving railway.toml..."
    cat > railway.toml << 'EOF'
# Railway deployment configuration for ClaimAgent

[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npx prisma migrate deploy && npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
EOF
    
    # Accept theirs for package-lock.json
    echo "Accepting main's package-lock.json..."
    git checkout --theirs package-lock.json
    
    # Stage resolved files
    git add package.json railway.toml package-lock.json
    
    # Regenerate package-lock.json
    echo "Regenerating package-lock.json..."
    npm install
    
    # Stage updated package-lock.json
    git add package-lock.json
    
    # Complete the merge
    git commit -m "Resolve merge conflicts with main branch

- Add @neondatabase/serverless dependency from main
- Update railway.toml with migration command
- Regenerate package-lock.json"
    
    echo "✓ Conflicts resolved and committed"
}

echo ""
echo "=== Resolution Complete ==="
echo "Next steps:"
echo "1. Review the changes: git log -1 --stat"
echo "2. Test the build: npm run build"
echo "3. Push to remote: git push origin copilot/setup-copilot-instructions"
