# YOLO Implementation Brief: Svolta Docs Restructure

**Branch:** feature/docs-restructure (created from develop)
**Session spec:** output/sessions/2026-03-07_docs-restructure/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

Svolta's 21 documentation files are operational/runbook-focused but lack the pedagogical "How X Works" framing, consistent templates, audience routing, and verification checklists found in the Local Business Platform docs. This restructure adopts LBP's strongest patterns — renaming architecture docs to "How X Works", creating a dedicated guides/ directory, adding Quick Start Paths, and applying consistent templates — without losing Svolta's existing strengths (the alignment algorithm spec, the troubleshooting guide).

The plan was reviewed and approved. Implement it exactly as specified below.

---

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15/$75                | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3/$15                 | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.25/$1.25            | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (-> haiku) or requires deep cross-file reasoning (-> opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/docs-restructure   # create feature branch from develop — NEVER write directly to develop
```

---

## Phase 1: Structural Moves

**Goal:** Move and rename 12 files to the new directory layout. No content changes.
**Model:** haiku — mechanical git mv operations

### Steps

1. Create new directories:

```bash
mkdir -p docs/guides docs/reference
```

2. Execute all git mv operations:

```bash
git mv docs/architecture/overview.md docs/architecture/architecture.md
git mv docs/features/alignment-export.md docs/architecture/how-alignment-works.md
git mv docs/features/pose-detection.md docs/architecture/how-pose-detection-works.md
git mv docs/features/billing.md docs/architecture/how-billing-works.md
git mv docs/features/custom-backgrounds.md docs/architecture/how-background-removal-works.md
git mv docs/development/state-hooks.md docs/architecture/how-state-management-works.md
git mv docs/development/setup.md docs/guides/local-development-setup.md
git mv docs/development/troubleshooting.md docs/guides/troubleshooting.md
git mv docs/features/mediapipe-self-hosting.md docs/guides/mediapipe-self-hosting.md
git mv docs/standards/git-workflow.md docs/guides/git-workflow.md
git mv docs/api/reference.md docs/reference/api.md
git mv docs/components/api-reference.md docs/reference/components.md
```

3. Remove empty directories:

```bash
rmdir docs/features docs/development docs/api docs/components
```

### Verification gate — STOP if this fails

```bash
# Confirm all files moved correctly
test -f docs/architecture/how-alignment-works.md && \
test -f docs/architecture/how-pose-detection-works.md && \
test -f docs/architecture/how-billing-works.md && \
test -f docs/architecture/how-background-removal-works.md && \
test -f docs/architecture/how-state-management-works.md && \
test -f docs/guides/local-development-setup.md && \
test -f docs/guides/troubleshooting.md && \
test -f docs/guides/mediapipe-self-hosting.md && \
test -f docs/guides/git-workflow.md && \
test -f docs/reference/api.md && \
test -f docs/reference/components.md && \
! test -d docs/features && \
! test -d docs/development && \
echo "Phase 1 PASSED" || echo "Phase 1 FAILED"
```

### Commit

```bash
git add -A docs/ && git commit -m "$(cat <<'EOF'
refactor(docs): restructure to architecture/guides/reference/standards layout

Move feature docs to architecture/ with "How X Works" naming.
Move operational docs to guides/.
Move API/component reference to reference/.
Remove empty directories.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Create Navigation Files

**Goal:** Create 5 new README/index files and project-history.md so every directory has navigation.
**Model:** sonnet — needs to read existing content and write coherent navigation tables

### Files to create

Spawn agents in parallel for independent files:

**Task 1: guides/README.md**
model: sonnet
Create `docs/guides/README.md` using Template D:

```markdown
# Guides

Step-by-step procedures for common development tasks.

| Guide                                                   | Purpose                          |
| ------------------------------------------------------- | -------------------------------- |
| [Local Development Setup](./local-development-setup.md) | Get running locally              |
| [Git Workflow](./git-workflow.md)                       | Branching, promotion, deployment |
| [Troubleshooting](./troubleshooting.md)                 | Debug common issues              |
| [MediaPipe Self-Hosting](./mediapipe-self-hosting.md)   | Self-host ML model assets        |
| [Stripe Integration](./stripe-integration.md)           | Configure payments and webhooks  |
```

**Task 2: reference/README.md**
model: haiku
Create `docs/reference/README.md`:

```markdown
# Reference

API and component specifications.

| Document                      | Purpose                        |
| ----------------------------- | ------------------------------ |
| [API Reference](./api.md)     | All API endpoints              |
| [Components](./components.md) | UI and feature component props |
```

**Task 3: standards/README.md**
model: sonnet
Create `docs/standards/README.md`:

```markdown
# Standards

Rules and requirements for how things should be done. Every standard includes a verification checklist.

| Standard                                  | Covers                                     |
| ----------------------------------------- | ------------------------------------------ |
| [Code Style](./code-style.md)             | TypeScript, React, Tailwind patterns       |
| [Design Tokens](./design-tokens.md)       | CSS variables, colors, typography, spacing |
| [Testing](./testing.md)                   | Unit, visual regression, E2E testing       |
| [Security](./security.md)                 | Rate limiting, input validation, OWASP     |
| [Brand Guidelines](./brand-guidelines.md) | Logo, colors, tagline usage                |
| [Documentation](./documentation.md)       | Doc templates and conventions              |
```

**Task 4: architecture/README.md**
model: sonnet
Read the current `docs/architecture/README.md`, then **fully rewrite** it (the current version references 3 non-existent files). New content:

```markdown
# Architecture

How Svolta's core systems work and why they're built the way they are.

| Document                                                          | Teaches                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| [Architecture Overview](./architecture.md)                        | High-level system design, component hierarchy, data flow |
| [How Alignment Works](./how-alignment-works.md)                   | 4-phase alignment algorithm — the core business logic    |
| [How Pose Detection Works](./how-pose-detection-works.md)         | MediaPipe integration, landmark system, client-side ML   |
| [How Billing Works](./how-billing-works.md)                       | Stripe integration, subscription model, webhook flow     |
| [How State Management Works](./how-state-management-works.md)     | Zustand stores, custom hooks, state flow                 |
| [How Background Removal Works](./how-background-removal-works.md) | AI background removal feature                            |
| [Database Schema](./database.md)                                  | Supabase schema, tables, RPC functions, RLS policies     |
```

**Task 5: project-history.md**
model: sonnet
Read `docs/README.md` and extract the "Development Phases" table and "Key Features" section. Create `docs/project-history.md`:

```markdown
# Project History

Svolta's development timeline and key milestones.

## Development Phases

[Move the phases table from the current README here]

## Key Features Shipped

[Move the features list from the current README here]

## Documentation Roadmap

[Move the documentation roadmap from the current README here]
```

### Verification gate — STOP if this fails

```bash
test -f docs/guides/README.md && \
test -f docs/reference/README.md && \
test -f docs/standards/README.md && \
test -f docs/architecture/README.md && \
test -f docs/project-history.md && \
echo "Phase 2 PASSED" || echo "Phase 2 FAILED"
```

### Commit

```bash
git add docs/guides/README.md docs/reference/README.md docs/standards/README.md docs/architecture/README.md docs/project-history.md && git commit -m "$(cat <<'EOF'
docs: add navigation READMEs and project history

Every docs subdirectory now has a README with a navigation table.
Project history extracted from root README.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Rewrite Root README

**Goal:** Replace the 277-line docs/README.md with ~80 lines using Quick Start Paths format.
**Model:** sonnet — needs judgment on what to keep vs move

### Instructions

Read the current `docs/README.md` in full. Rewrite it with this structure:

```markdown
# Svolta Documentation

> AI-powered before/after fitness photo alignment. Privacy-first, client-side processing.

## Quick Start Paths

### New to the codebase?

1. [Architecture Overview](./architecture/architecture.md) — system design and principles
2. [Local Development Setup](./guides/local-development-setup.md) — get running locally
3. [How Alignment Works](./architecture/how-alignment-works.md) — the core algorithm

### Building a feature?

1. [Code Style](./standards/code-style.md) — patterns and conventions
2. [How State Management Works](./architecture/how-state-management-works.md) — Zustand stores and hooks
3. [Components](./reference/components.md) — UI component props

### Debugging an issue?

1. [Troubleshooting](./guides/troubleshooting.md) — common issues and solutions
2. [How Pose Detection Works](./architecture/how-pose-detection-works.md) — if ML-related
3. [How Alignment Works](./architecture/how-alignment-works.md) — if export-related

### Reviewing architecture?

1. [Architecture Overview](./architecture/architecture.md) — high-level design
2. [Database Schema](./architecture/database.md) — Supabase schema and RLS
3. [Project History](./project-history.md) — phases and decisions

## Documentation Map

| Section                         | Contents                           |
| ------------------------------- | ---------------------------------- |
| [Architecture](./architecture/) | How systems work, design decisions |
| [Guides](./guides/)             | Step-by-step procedures            |
| [Reference](./reference/)       | API and component specs            |
| [Standards](./standards/)       | Rules and verification checklists  |

## Tech Stack

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| Next.js 16     | React framework (App Router)    |
| Tailwind CSS 4 | Utility-first styling           |
| Supabase       | Auth, PostgreSQL, RPC functions |
| MediaPipe      | Client-side pose detection      |
| Fabric.js      | Canvas manipulation             |
| Stripe         | Payments and subscriptions      |
| Zustand        | State management                |

## Quick Commands

[Keep the existing commands block from the current README — dev, test, lint, db sections]
```

**Critical:** Do NOT delete the project structure, features, or phases content — those were already moved to `project-history.md` in Phase 2. Just remove them from this README.

### Verification gate — STOP if this fails

```bash
# README should be significantly shorter
line_count=$(wc -l < docs/README.md)
if [ "$line_count" -lt 150 ]; then echo "Phase 3 PASSED (${line_count} lines)"; else echo "Phase 3 FAILED — README still ${line_count} lines"; fi
```

### Commit

```bash
git add docs/README.md && git commit -m "$(cat <<'EOF'
docs: rewrite root README with Quick Start Paths

Replace 277-line README with ~80-line hub featuring audience-specific
Quick Start Paths and condensed tech stack. Detailed content moved to
project-history.md and section READMEs.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Apply Template A to Architecture Docs

**Goal:** Add "Why This Matters" and normalize heading structure across all "How X Works" docs.
**Model:** sonnet — needs to read each doc and write contextual intros

### Instructions

For each of these 5 files, read the file in full, then add/restructure:

1. **`docs/architecture/how-alignment-works.md`** (crown jewel — 1314 lines)
   - Add a 2-3 sentence "Why This Matters" section after the title explaining this is the core business logic
   - Add a "Key Files" table listing: `hooks/useAlignment.ts`, `lib/canvas/alignment.ts`, `tests/visual/alignment.unit.test.ts`
   - Do NOT delete or reorder any existing algorithm content — only add framing
   - Rename the H1 to "How Alignment Works"

2. **`docs/architecture/how-pose-detection-works.md`**
   - Already has "Why Client-Side ML?" — restructure as "Why This Matters"
   - Add "Key Files" table: `hooks/usePoseDetection.ts`, `lib/mediapipe/`
   - Rename H1 to "How Pose Detection Works"

3. **`docs/architecture/how-billing-works.md`**
   - Add "Why This Matters" explaining freemium model and conversion strategy
   - Add "Key Files" table: `lib/stripe/`, `app/api/stripe/`, `stores/user-store.ts`
   - Rename H1 to "How Billing Works"
   - Keep all architecture content; the procedural Stripe setup parts will be extracted in Phase 6

4. **`docs/architecture/how-state-management-works.md`**
   - Add "Why This Matters" explaining why Zustand over Redux/Context
   - Add "Key Files" table: `stores/editor-store.ts`, `stores/user-store.ts`, all hooks
   - Rename H1 to "How State Management Works"

5. **`docs/architecture/how-background-removal-works.md`**
   - Add "Why This Matters" explaining Pro feature value and client-side processing
   - Add "Key Files" table: `hooks/useBackgroundRemoval.ts`
   - Rename H1 to "How Background Removal Works"

Also update `docs/architecture/architecture.md`:

- Rename H1 from "Architecture Overview" to "Architecture Overview" (keep as-is, this is the umbrella doc)
- Add "Key Files" table if missing

**Parallelism:** All 5 "How X Works" files can be edited in parallel as they are independent.

### Verification gate — STOP if this fails

```bash
# Every architecture doc (except database.md and README.md) should have "Why This Matters"
for f in docs/architecture/how-*.md; do
  if ! grep -q "Why This Matters" "$f"; then
    echo "Phase 4 FAILED — missing 'Why This Matters' in $f"
    exit 1
  fi
done
echo "Phase 4 PASSED"
```

### Commit

```bash
git add docs/architecture/ && git commit -m "$(cat <<'EOF'
docs(architecture): add pedagogical framing to How X Works docs

Each architecture doc now has "Why This Matters" and "Key Files" sections.
No content deleted — additions and heading normalization only.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Apply Template B to Standards Docs

**Goal:** Add Verification Checklist and "What NOT to Do" sections to all 6 standards files.
**Model:** sonnet — needs to read each doc and write relevant checklists

### Instructions

For each standards file, read it in full, then append two sections:

1. **`docs/standards/code-style.md`**
   - "What NOT to Do": `any` types, barrel exports, default exports, CSS-in-JS
   - Verification: `npm run lint` zero errors, no `any` in new code, all components use design tokens

2. **`docs/standards/design-tokens.md`**
   - "What NOT to Do": raw hex values, hardcoded spacing, non-token font sizes
   - Verification: no raw color values in new components, all spacing uses tokens

3. **`docs/standards/testing.md`**
   - "What NOT to Do": mocking Zustand in pure function tests, snapshot-only tests, skipping visual regression
   - Verification: `npm run test` passes, new hooks have unit tests, baselines updated

4. **`docs/standards/security.md`**
   - "What NOT to Do": storing photos server-side, skipping rate limiting, exposing service role key
   - Verification: rate limiting on all endpoints, security headers present, no secrets in client code

5. **`docs/standards/brand-guidelines.md`**
   - "What NOT to Do": wrong logo proportions, uppercase tagline, non-brand colors
   - Verification: logo follows mark spec, tagline always lowercase italic

6. **`docs/standards/documentation.md`**
   - "What NOT to Do": docs without cross-references, missing verification checklists, stale version dates
   - Verification: every subdirectory has README, all standards have checklists, no broken links
   - Also update this file to define Templates A/B/C/D as the canonical structure

**Parallelism:** All 6 files can be edited in parallel.

### Verification gate — STOP if this fails

```bash
for f in docs/standards/code-style.md docs/standards/design-tokens.md docs/standards/testing.md docs/standards/security.md docs/standards/brand-guidelines.md docs/standards/documentation.md; do
  if ! grep -q "Verification Checklist" "$f"; then
    echo "Phase 5 FAILED — missing checklist in $f"
    exit 1
  fi
done
echo "Phase 5 PASSED"
```

### Commit

```bash
git add docs/standards/ && git commit -m "$(cat <<'EOF'
docs(standards): add verification checklists and anti-patterns

Every standards doc now has "What NOT to Do" and "Verification Checklist"
sections following the LBP documentation pattern.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Apply Template C to Guides + Create Stripe Guide

**Goal:** Add Prerequisites/Verification to guides, create stripe-integration.md from billing procedures.
**Model:** sonnet — needs to read billing doc and extract procedures

### Instructions

**Task 1:** For each existing guide, read it and add:

- "Prerequisites" section at top (what you need before starting)
- "Verification" section at bottom (how to confirm it worked)

Files: `docs/guides/local-development-setup.md`, `docs/guides/troubleshooting.md`, `docs/guides/mediapipe-self-hosting.md`, `docs/guides/git-workflow.md`

**Task 2:** Read `docs/architecture/how-billing-works.md` and extract the procedural Stripe setup content (environment variables, webhook configuration, test mode setup, test credit cards) into a new `docs/guides/stripe-integration.md`. Use Template C:

```markdown
# Stripe Integration Setup

> Configure Stripe for local development and production payments.

## Prerequisites

- Stripe account with API keys
- Supabase project configured
- Local development environment running

## Steps

### 1. Configure Environment Variables

### 2. Set Up Webhook Endpoint

### 3. Configure Test Mode

### 4. Test the Payment Flow

## Verification

- Test card payment succeeds in dev
- Webhook events received and processed
- Usage limits enforced after payment

## Troubleshooting

- Common webhook signature errors
- Test vs live mode confusion
```

After extracting, add a cross-reference in `how-billing-works.md`:

```markdown
> For setup instructions, see [Stripe Integration Guide](../guides/stripe-integration.md).
```

### Verification gate — STOP if this fails

```bash
test -f docs/guides/stripe-integration.md && \
grep -q "Prerequisites" docs/guides/local-development-setup.md && \
grep -q "Verification" docs/guides/local-development-setup.md && \
echo "Phase 6 PASSED" || echo "Phase 6 FAILED"
```

### Commit

```bash
git add docs/guides/ docs/architecture/how-billing-works.md && git commit -m "$(cat <<'EOF'
docs(guides): add prerequisites, verification, and Stripe guide

All guides now have Prerequisites and Verification sections.
New stripe-integration.md extracted from billing architecture doc.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7: Link Audit

**Goal:** Fix all broken cross-references from the file moves.
**Model:** haiku — mechanical grep and find-replace

### Instructions

1. Search for all old paths in docs:

```bash
grep -rn 'features/' docs/
grep -rn 'development/' docs/
grep -rn 'api/reference' docs/
grep -rn 'components/api-reference' docs/
grep -rn 'components/reference' docs/
grep -rn 'architecture/overview' docs/
grep -rn 'standards/git-workflow' docs/
```

2. For each broken reference found, update to the new path. Common replacements:
   - `features/alignment-export.md` -> `architecture/how-alignment-works.md`
   - `features/pose-detection.md` -> `architecture/how-pose-detection-works.md`
   - `features/billing.md` -> `architecture/how-billing-works.md`
   - `features/custom-backgrounds.md` -> `architecture/how-background-removal-works.md`
   - `features/mediapipe-self-hosting.md` -> `guides/mediapipe-self-hosting.md`
   - `development/setup.md` -> `guides/local-development-setup.md`
   - `development/state-hooks.md` -> `architecture/how-state-management-works.md`
   - `development/troubleshooting.md` -> `guides/troubleshooting.md`
   - `api/reference.md` -> `reference/api.md`
   - `components/reference.md` or `components/api-reference.md` -> `reference/components.md`
   - `architecture/overview.md` -> `architecture/architecture.md`
   - `standards/git-workflow.md` -> `guides/git-workflow.md`

3. Also check and fix links in:
   - `CLAUDE.md` (root project file)
   - `README.md` (root project file, not docs/README.md)

### Verification gate — STOP if this fails

```bash
# Zero hits for old paths in docs/
old_refs=$(grep -rn 'features/\|development/\|api/reference\|components/api-reference\|components/reference\|architecture/overview\|standards/git-workflow' docs/ | wc -l)
if [ "$old_refs" -eq 0 ]; then echo "Phase 7 PASSED"; else echo "Phase 7 FAILED — ${old_refs} broken references remain"; grep -rn 'features/\|development/\|api/reference\|components/api-reference\|components/reference\|architecture/overview\|standards/git-workflow' docs/; fi
```

### Commit

```bash
git add -A && git commit -m "$(cat <<'EOF'
docs: fix cross-references after restructure

Update all internal links to reflect new file locations.
Fix references in CLAUDE.md and root README.md.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Cost Estimate

| Phase                         | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ----------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: Structural moves     | haiku  | ~5k               | ~1k                | $0.01      |
| Phase 2: Navigation files     | sonnet | ~15k              | ~3k                | $0.09      |
| Phase 3: Root README          | sonnet | ~8k               | ~2k                | $0.05      |
| Phase 4: Architecture framing | sonnet | ~40k              | ~5k                | $0.20      |
| Phase 5: Standards checklists | sonnet | ~25k              | ~4k                | $0.14      |
| Phase 6: Guides + Stripe      | sonnet | ~20k              | ~4k                | $0.12      |
| Phase 7: Link audit           | haiku  | ~15k              | ~2k                | $0.01      |
| **Total**                     |        | **~128k**         | **~21k**           | **~$0.62** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.25/$1.25 per MTok.
Estimation: ~5 tokens per line of code. Input = files read + brief (~3k) + system prompt (~3k). Output = code written + verification output (~500/gate).

---

## Final Report

After all phases complete, output:

1. Phases completed — list each with commit SHA
2. Build status — confirm `npm run lint && npm run type-check && npm run build` passes (note: this is a docs-only change, so build should be unaffected)
3. Any exceptions or intentional deviations from the plan
4. Token usage and cost estimate:

   | Model     | Est. input tokens     | Est. output tokens | Est. cost |
   | --------- | --------------------- | ------------------ | --------- |
   | sonnet    | [total across phases] |                    | $X.XX     |
   | haiku     | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-07_docs-restructure/yolo-brief.md`:

```markdown
## Completed

**Date:** [today]
**Status:** All phases executed successfully

[1-paragraph summary: what was implemented, any surprises]

### Commits

[list each commit SHA and message]
```

Confirm this was done in the final report.

---

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/docs-restructure` — NEVER commit directly to develop
- This is a docs-only change — no TypeScript files should be modified (except CLAUDE.md link fixes in Phase 7)
- NEVER delete existing content from alignment-export.md (now how-alignment-works.md) — it is the crown jewel doc; only add framing
