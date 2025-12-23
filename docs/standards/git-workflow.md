# Git Workflow & Deployment

**Version:** 2.0.0
**Last Updated:** 2025-12-23
**Scope:** PoseProof branching strategy, CI/CD, and deployment

---

## Overview

PoseProof uses a multi-stage deployment pipeline with **manual promotion** and **Husky-enforced quality gates**. You control when changes promote between branches, with automated checks ensuring quality at each stage.

## Branch Structure

```
main (production) ← poseproof.com
  ↑ manual merge (Husky blocks until staging E2E passes)
staging (preview) ← staging.poseproof.com
  ↑ manual merge (after develop CI passes)
develop (development) ← preview URLs
```

## Workflow Summary

| Step                    | Command                                                 | What Happens                                      |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------- |
| 1. Push to develop      | `git push origin develop`                               | CI runs (quality, unit, smoke, visual tests)      |
| 2. Promote to staging   | `git checkout staging && git merge develop && git push` | E2E tests run                                     |
| 3. Deploy to production | `./scripts/deploy-to-production.sh`                     | Husky verifies staging E2E passed, merges to main |

---

## Daily Development Workflow

### 1. Start Work

```bash
git checkout develop
git pull origin develop
```

### 2. Make Changes

```bash
git add .
git commit -m "feat: add new feature"
```

### 3. Push to Develop

```bash
# Pre-push hooks run automatically (lint, type-check, build)
git push origin develop
```

### 4. Monitor CI

```bash
gh run watch
```

### 5. Promote to Staging (After CI Passes)

```bash
git checkout staging
git merge develop
git push origin staging
# E2E tests run automatically
```

### 6. Deploy to Production (After E2E Passes)

```bash
# Option A: Use the deploy script
./scripts/deploy-to-production.sh

# Option B: Manual merge (Husky checks staging E2E first)
git checkout main
git merge staging
git push origin main  # Blocked if staging E2E hasn't passed
```

---

## Pre-Push Hooks

The following checks run automatically before each push:

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run build         # Production build
```

### Additional Check for Main Branch

When pushing to `main`, Husky also verifies:

```bash
# Checks that staging E2E tests have passed
gh run list --branch staging --workflow ci.yml --limit 1 --json conclusion
```

If staging E2E hasn't passed, the push to main is **blocked**.

### Bypassing Hooks (Emergency Only)

```bash
git push --no-verify  # Only use in emergencies
```

---

## Quality Gates

| Branch  | Local (Pre-push)                    | CI Checks                       | Required for Next Stage     |
| ------- | ----------------------------------- | ------------------------------- | --------------------------- |
| develop | lint, type-check, build             | Quality + Unit + Smoke + Visual | Must pass for staging merge |
| staging | lint, type-check, build             | Quality + Unit + E2E            | Must pass for main merge    |
| main    | lint, type-check, build + E2E check | Quality + Unit + E2E            | Deploys to production       |

---

## Deploy Script

The `scripts/deploy-to-production.sh` script provides a convenient way to deploy:

```bash
./scripts/deploy-to-production.sh
```

It will:

1. Show commits since last deployment
2. Verify staging E2E tests passed
3. Prompt for confirmation
4. Merge staging → main
5. Vercel auto-deploys to production

---

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

### Types

| Type       | Description                        |
| ---------- | ---------------------------------- |
| `feat`     | New feature                        |
| `fix`      | Bug fix                            |
| `docs`     | Documentation only                 |
| `style`    | Formatting, no code change         |
| `refactor` | Code change, no new feature or fix |
| `perf`     | Performance improvement            |
| `test`     | Adding or updating tests           |
| `chore`    | Build process, dependencies        |

### Examples

```bash
feat(editor): add alignment grid overlay
fix(auth): resolve session refresh loop
docs: update deployment guide
refactor(canvas): simplify landmark rendering
```

---

## Vercel Configuration

| Branch  | Environment | URL                    |
| ------- | ----------- | ---------------------- |
| develop | Development | Auto-generated preview |
| staging | Preview     | staging.poseproof.com  |
| main    | Production  | poseproof.com          |

---

## Environment Variables

### Local Development

Copy `.env.example` to `.env.local` and fill in values.

### Vercel (Production/Preview)

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable                        | Scope               |
| ------------------------------- | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | All                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Production, Preview |
| `STRIPE_SECRET_KEY`             | Production, Preview |
| `STRIPE_WEBHOOK_SECRET`         | Production, Preview |
| `NEXT_PUBLIC_APP_URL`           | Per environment     |

---

## Post-Deployment Verification

After deploying to production:

- [ ] Site loads successfully
- [ ] Authentication working
- [ ] Core editor functionality works
- [ ] Stripe checkout loads
- [ ] Monitor for 30 minutes post-deploy

---

## Rollback Procedures

### Immediate Rollback

Use Vercel's instant rollback:
Vercel Dashboard → Deployments → Previous deployment → Promote to Production

### Via Git

```bash
git checkout main
git revert HEAD
git push origin main
```

---

## Commands Reference

```bash
# Local development
npm run dev           # Start dev server
npm run build         # Production build

# Pre-push checks (run automatically)
npm run lint          # ESLint check
npm run type-check    # TypeScript validation

# Testing
npm test              # Unit tests
npm run test:visual   # Visual regression tests
npm run test:e2e      # Full E2E tests
npm run test:e2e:smoke # Smoke E2E tests

# Monitor CI
gh run watch          # Watch current CI run
gh run list           # List recent runs
gh run list --branch staging  # Check staging CI status

# Deployment
./scripts/deploy-to-production.sh  # Deploy to production
```

---

## What NOT to Do

| Anti-Pattern                     | Why It's Wrong            | Correct Approach             |
| -------------------------------- | ------------------------- | ---------------------------- |
| Skip pre-push hooks              | May break CI              | Let hooks run                |
| Force push to any branch         | Loses history             | Never force push             |
| Push directly to main            | Bypasses E2E verification | Merge from staging           |
| Deploy on Friday evening         | No support coverage       | Deploy early in day          |
| Push to main without staging E2E | Quality issues            | Wait for staging E2E to pass |

---

## Critical Rules

1. **Never force push** to any branch
2. **Always pull** before starting work
3. **Let pre-push hooks run** - they catch issues before CI
4. **Push to develop first** - then promote to staging → main
5. **Write meaningful commit messages**
6. **Wait for E2E** - don't push to main until staging E2E passes
7. **Use the deploy script** - it handles verification automatically
