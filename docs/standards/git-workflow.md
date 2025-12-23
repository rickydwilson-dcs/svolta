# Git Workflow & Deployment

**Version:** 1.0.0
**Last Updated:** 2025-12-23
**Scope:** PoseProof branching strategy, CI/CD, and deployment

---

## Overview

PoseProof uses a multi-stage deployment pipeline with **automatic promotion**. Push to `develop` and the CI handles promotion to `staging` and `main` automatically when all tests pass.

## Branch Structure

```
main (production) ← poseproof.com
  ↑ auto-promoted when staging CI passes
staging (preview) ← staging.poseproof.com
  ↑ auto-promoted when develop CI passes
develop (development) ← preview URLs
```

## Automatic Promotion

**All promotions happen automatically** when CI passes:

| Push to   | CI Checks                    | Auto-promotes to | Deploys to             |
| --------- | ---------------------------- | ---------------- | ---------------------- |
| `develop` | Quality + Unit + Smoke Tests | `staging`        | Auto-generated preview |
| `staging` | Quality + Unit + E2E Tests   | `main`           | staging.poseproof.com  |
| `main`    | Quality + Unit + E2E Tests   | (production)     | poseproof.com          |

**You only need to push to `develop`.** The CI workflow handles the rest.

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

### 3. Push to develop

```bash
# Pre-push hooks run automatically (lint, type-check, build)
git push origin develop
```

### 4. Monitor Automatic Promotion

```bash
gh run watch
```

After pushing to `develop`:

1. **CI runs**: Quality checks, unit tests, smoke tests
2. **Auto-promote**: If all pass, `develop` merges into `staging`
3. **Staging CI runs**: Quality checks, unit tests, E2E tests
4. **Auto-promote**: If all pass, `staging` merges into `main`
5. **Production deploys**: Vercel deploys `main` to poseproof.com

---

## Pre-Push Hooks

The following checks run automatically before each push:

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
npm run build         # Production build
```

If any check fails, the push is blocked.

### Bypassing Hooks (Emergency Only)

```bash
git push --no-verify  # Only use in emergencies
```

---

## Quality Gates

| Branch  | Local (Pre-push)        | CI Checks                    | Auto-promotes to |
| ------- | ----------------------- | ---------------------------- | ---------------- |
| develop | lint, type-check, build | Quality + Unit + Smoke Tests | staging          |
| staging | lint, type-check, build | Quality + Unit + E2E Tests   | main             |
| main    | lint, type-check, build | Quality + Unit + E2E Tests   | (production)     |

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

After automatic promotion to production:

- [ ] Site loads successfully
- [ ] Authentication working
- [ ] Core editor functionality works
- [ ] Stripe checkout loads
- [ ] Monitor for 30 minutes post-deploy

---

## Manual Promotion (If Needed)

In rare cases where auto-promotion fails:

```bash
# Promote develop to staging manually
git checkout staging && git pull origin staging
git merge develop
git push origin staging

# Promote staging to main manually
git checkout main && git pull origin main
git merge staging
git push origin main

# Return to develop
git checkout develop
```

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
npm run test:e2e      # Full E2E tests
npm run test:e2e:smoke # Smoke E2E tests

# Monitor CI
gh run watch          # Watch current CI run
gh run list           # List recent runs
```

---

## What NOT to Do

| Anti-Pattern             | Why It's Wrong      | Correct Approach       |
| ------------------------ | ------------------- | ---------------------- |
| Skip pre-push hooks      | May break CI        | Let hooks run          |
| Force push to any branch | Loses history       | Never force push       |
| Push directly to main    | Bypasses tests      | Always push to develop |
| Deploy on Friday evening | No support coverage | Deploy early in day    |

---

## Critical Rules

1. **Never force push** to any branch
2. **Always pull** before starting work
3. **Let pre-push hooks run** - they catch issues before CI
4. **Push to develop only** - auto-promotion handles the rest
5. **Write meaningful commit messages**
6. **Monitor CI** - check that auto-promotion succeeds
