#!/bin/bash

# Production Deployment Script
# Merges staging → main after verifying E2E tests passed

set -e  # Exit on any error

echo "🚀 Starting production deployment process..."

# Ensure we're on staging branch and up to date
echo "📥 Syncing staging branch..."
git checkout staging
git pull origin staging

# Get the latest commit on main for comparison
git fetch origin main

# Generate commit information since last production deployment
echo "📊 Analyzing changes since last production deployment..."

# Get commits that are in staging but not in main
COMMITS=$(git log origin/main..staging --oneline --no-merges)
COMMIT_COUNT=$(git rev-list --count origin/main..staging)

if [ $COMMIT_COUNT -eq 0 ]; then
    echo "❌ No new commits to deploy. staging and main are in sync."
    exit 0
fi

# Check staging E2E status
echo "🔍 Checking staging E2E status..."
STATUS=$(gh run list --branch staging --workflow ci.yml --limit 1 --json conclusion -q '.[0].conclusion')

if [ "$STATUS" != "success" ]; then
    echo "❌ Cannot deploy: staging E2E tests have not passed"
    echo "   Latest staging CI status: $STATUS"
    echo "   Run: gh run list --branch staging"
    exit 1
fi

echo "✅ Staging E2E passed"

# Get the date range
SINCE_DATE=$(git log origin/main -1 --format=%cd --date=short 2>/dev/null || echo "N/A")
TODAY=$(date +%Y-%m-%d)

echo ""
echo "📋 Production Deployment Summary:"
echo "=================================="
echo "📅 Deployment Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📊 Changes: $COMMIT_COUNT commits since last production release"
echo "📆 Period: $SINCE_DATE to $TODAY"
echo ""
echo "🔄 Changes to be deployed:"
echo "$COMMITS"
echo ""

# Confirm deployment
echo "⚠️  Ready to deploy to production?"
echo "   This will merge staging → main"
echo ""
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 0
fi

echo ""
echo "🚀 Deploying to production..."

# Switch to main and merge staging
echo "📤 Switching to main branch and merging staging..."
git checkout main
git pull origin main
git merge staging --no-edit
git push origin main

echo ""
echo "🎉 Production deployment completed successfully!"
echo ""
echo "📊 Deployment Summary:"
echo "====================="
echo "✅ $COMMIT_COUNT commits deployed to production"
echo "✅ Staging E2E tests verified"
echo "✅ Staging → Main complete"
echo ""
echo "🔗 Vercel will now auto-deploy to production"
