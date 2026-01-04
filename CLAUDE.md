# Svolta - Claude Code Configuration

## Project Overview

**Svolta** is a fitness photo alignment SaaS that helps coaches create professional before/after comparisons using AI pose detection.

- **Domain:** www.svolta.app
- **Tagline:** "The Turning Point"
- **Stack:** Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe

## Project Management

- **Linear Project:** https://linear.app/rickydwilson/project/svolta-832cc9c427e2

---

## Claude Skills Integration

This project uses the Claude Skills ecosystem located at `~/.claude-skills/`.

### Skills Location

```
/Users/ricky/.claude-skills/
├── agents/           # 30 specialized cs-* agents
├── skills/           # Team skill packages with Python tools
├── docs/             # Documentation and standards
└── templates/        # Reusable templates
```

---

## Recommended Agents for Svolta

### Primary Development Agents

| Agent                   | Use Case                         | Type                   | Execution   |
| ----------------------- | -------------------------------- | ---------------------- | ----------- |
| `cs-fullstack-engineer` | End-to-end feature development   | Implementation (Green) | Coordinated |
| `cs-frontend-engineer`  | React/Next.js components, UI/UX  | Implementation (Green) | Coordinated |
| `cs-backend-engineer`   | API routes, Supabase integration | Implementation (Green) | Coordinated |

### Quality & Review Agents

| Agent                  | Use Case                      | Type          | Execution           |
| ---------------------- | ----------------------------- | ------------- | ------------------- |
| `cs-code-reviewer`     | Code quality assessment       | Quality (Red) | **Sequential only** |
| `cs-qa-engineer`       | Test automation, E2E tests    | Quality (Red) | **Sequential only** |
| `cs-security-engineer` | Security audits, OWASP checks | Quality (Red) | **Sequential only** |

### Architecture & Planning Agents

| Agent              | Use Case                           | Type                  | Execution   |
| ------------------ | ---------------------------------- | --------------------- | ----------- |
| `cs-architect`     | System design, patterns            | Coordination (Purple) | Lightweight |
| `cs-ui-designer`   | Design tokens, component libraries | Strategic (Blue)      | Parallel    |
| `cs-ux-researcher` | User flows, usability              | Strategic (Blue)      | Parallel    |

### Product & Strategy Agents

| Agent                    | Use Case                       | Type             | Execution |
| ------------------------ | ------------------------------ | ---------------- | --------- |
| `cs-product-manager`     | RICE prioritization, discovery | Strategic (Blue) | Parallel  |
| `cs-agile-product-owner` | User stories, backlog grooming | Strategic (Blue) | Parallel  |

---

## Agent Usage Examples

### Feature Development

```bash
# Use fullstack engineer for complete features
@cs-fullstack-engineer "Implement the DropZone component with drag-and-drop photo upload, HEIC conversion, and image scaling"

# Use frontend engineer for UI components
@cs-frontend-engineer "Build the AlignmentControls component with Apple-style segmented control using Radix UI"

# Use backend engineer for API work
@cs-backend-engineer "Create the usage tracking API routes with Supabase RPC integration"
```

### Code Review (Run Sequentially)

```bash
# IMPORTANT: Quality agents must run one at a time
@cs-code-reviewer "Review the editor store implementation for best practices"

# After code reviewer completes:
@cs-qa-engineer "Generate Vitest tests for the alignment calculation logic"

# After QA completes:
@cs-security-engineer "Audit the auth flow for OWASP vulnerabilities"
```

### Architecture Decisions

```bash
@cs-architect "Design the state management architecture for the editor using Zustand"
```

---

## Execution Safety Rules

### Safe - Parallel Execution (Strategic Agents)

```bash
# Can run 4-5 strategic agents together
@cs-product-manager &
@cs-ux-researcher &
@cs-ui-designer &
```

### Safe - Coordinated Execution (Implementation Agents)

```bash
# Run 2-3 implementation agents with coordination
@cs-frontend-engineer --component editor-canvas &
@cs-backend-engineer --api usage-tracking &
wait
```

### UNSAFE - Never Run Quality Agents in Parallel

```bash
# DANGEROUS - Will cause system overload
@cs-qa-engineer &
@cs-code-reviewer &
@cs-security-engineer &
# DON'T DO THIS
```

**Quality agents spawn multiple sub-processes (test runners, linters, scanners) that exhaust system resources.**

---

## Available Slash Commands

Use these commands throughout development:

| Command               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `/commit.changes`     | Commit following git workflow (develop → staging → main) |
| `/create.pr`          | Create PR with auto-generated description                |
| `/review.code`        | Analyze code for quality, security, performance          |
| `/generate.tests`     | Generate comprehensive test cases                        |
| `/audit.security`     | OWASP Top 10 scan + secrets detection                    |
| `/audit.dependencies` | Check for outdated/vulnerable dependencies               |
| `/update.docs`        | Auto-update README and CHANGELOG                         |

---

## Git Workflow

This project follows a strict branching strategy:

```
develop → staging → main
```

- **develop:** Active development
- **staging:** Pre-production testing
- **main:** Production releases

Use `/commit.changes` to commit with proper workflow.

---

## Tech Stack Reference

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 with Apple-style design tokens
- **UI:** Radix UI primitives
- **Animation:** Framer Motion
- **State:** Zustand
- **Canvas:** Fabric.js

### Backend

- **Auth/DB:** Supabase (PostgreSQL)
- **Payments:** Stripe (integrated)
- **Pose Detection:** MediaPipe (client-side)

### Testing

- **Unit/Integration:** Vitest
- **E2E:** Playwright

### Deploy

- **Hosting:** Vercel
- **Domain:** www.svolta.app

---

## Key Design Principles

### Apple-Style Design

- Large display typography (72px headlines)
- Generous whitespace (120-200px section padding)
- Subtle animations with Apple easing curves
- Layered shadows, generous border radius

### Privacy First

- Photos processed client-side only
- Never uploaded to servers
- Prominent privacy messaging

### Progressive Enhancement

- Free tier with watermark (5 exports/month)
- Pro tier unlocks all features
- Clear upgrade prompts at conversion points

---

## Phase Overview

| Phase | Focus            | Key Deliverables                                        | Status         |
| ----- | ---------------- | ------------------------------------------------------- | -------------- |
| 1     | Foundation       | Next.js setup, Tailwind config, Supabase, UI primitives | ✅ Complete    |
| 2     | Core Editor      | DropZone, MediaPipe, Canvas, Landmarks, State           | ✅ Complete    |
| 3     | Alignment        | Calculation logic, Controls UI, Real-time preview       | ✅ Complete    |
| 4     | Auth & Payments  | Login/Signup, User store, Stripe, Upgrade page          | ✅ Complete    |
| 5     | Usage & Export   | Usage tracking, Export modal, Watermark, Settings       | ✅ Complete    |
| 6     | Landing & Polish | Hero, Features, Pricing, Animations, PWA, Deploy        | 🔄 In Progress |

## Current Scope

**Source Files:** 97 TypeScript/TSX files
**Custom Hooks:** 7 (useAlignment, useBackgroundRemoval, useCanvasExport, useGifExport, useKeyboardShortcuts, usePoseDetection, useUsageLimit)
**State Stores:** 2 (editor-store, user-store)
**UI Components:** 13 primitives (Button, BottomSheet, Card, ErrorBoundary, Input, MagicLinkForm, Modal, OAuthButtons, SegmentedControl, Slider, SvoltaLogo, Toggle, UpgradePrompt)
**API Routes:** 8 (account/delete, backgrounds/upload, debug/alignment-log, stripe/checkout, stripe/portal, stripe/webhook, usage, usage/increment)
**Test Files:** 9 test files
**Visual Test Fixtures:** 134 fixtures
**New Features:** Animated GIF export (3 styles), Background removal with @imgly/background-removal
**Documentation:** See `docs/` folder for technical documentation

---

## Quick Reference

### Agent Locations

```
/Users/ricky/.claude-skills/agents/engineering/cs-fullstack-engineer.md
/Users/ricky/.claude-skills/agents/engineering/cs-frontend-engineer.md
/Users/ricky/.claude-skills/agents/engineering/cs-backend-engineer.md
/Users/ricky/.claude-skills/agents/engineering/cs-code-reviewer.md
/Users/ricky/.claude-skills/agents/engineering/cs-qa-engineer.md
/Users/ricky/.claude-skills/agents/engineering/cs-security-engineer.md
/Users/ricky/.claude-skills/agents/engineering/cs-architect.md
/Users/ricky/.claude-skills/agents/product/cs-ui-designer.md
/Users/ricky/.claude-skills/agents/product/cs-ux-researcher.md
/Users/ricky/.claude-skills/agents/product/cs-product-manager.md
/Users/ricky/.claude-skills/agents/product/cs-agile-product-owner.md
```

### Skill Packages

```
/Users/ricky/.claude-skills/skills/engineering-team/senior-fullstack/
/Users/ricky/.claude-skills/skills/engineering-team/senior-frontend/
/Users/ricky/.claude-skills/skills/engineering-team/senior-backend/
/Users/ricky/.claude-skills/skills/engineering-team/code-reviewer/
/Users/ricky/.claude-skills/skills/engineering-team/senior-qa/
/Users/ricky/.claude-skills/skills/engineering-team/senior-security/
/Users/ricky/.claude-skills/skills/engineering-team/senior-architect/
/Users/ricky/.claude-skills/skills/product-team/ui-design-system/
/Users/ricky/.claude-skills/skills/product-team/ux-researcher-designer/
/Users/ricky/.claude-skills/skills/product-team/product-manager-toolkit/
/Users/ricky/.claude-skills/skills/product-team/agile-product-owner/
```

### Documentation

```
/Users/ricky/.claude-skills/docs/USAGE.md
/Users/ricky/.claude-skills/docs/WORKFLOW.md
/Users/ricky/.claude-skills/agents/CLAUDE.md
```

---

**Last Updated:** 2026-01-04
