# Plan: Adapt Claude Code Commands for Svolta

## Context

The local-business-platform project has 8 well-structured Claude Code commands that form two workflow pipelines (planning + quality). Svolta currently only has `/update.docs`. The goal is to port the remaining 7 commands, adapting them from a monorepo context to Svolta's single Next.js app architecture while preserving the session-based state management pattern that chains commands together.

## Source Commands

All source files are at `/Users/rickywilson/Sites/local-business-platform/.claude/commands/`:

- `brief.me.md`
- `plan.with.codex.md`
- `plan.to.yolo.md`
- `review.code.md`
- `fix.findings.md`
- `review.fix.deploy.md`
- `deploy.changes.md`
- `update.docs.md` (already exists in Svolta — use as style reference)

---

## Session Architecture

All commands share state through `output/sessions/YYYY-MM-DD_topic-slug/` folders. This is the key pattern that enables command chaining.

```
output/
  README.md
  sessions/
    YYYY-MM-DD_topic-slug/           # Planning sessions
      brief.md                       # /brief.me output
      codex-prompt.md                # /plan.with.codex Phase 1
      claude-plan.md                 # /plan.with.codex Phase 1
      codex-plan.md                  # User pastes from Codex
      synthesis.md                   # /plan.with.codex Phase 2
      yolo-brief.md                  # /plan.to.yolo output
    YYYY-MM-DD_code-review/          # Review sessions
      findings-security.md
      findings-code-quality.md
      findings-accessibility-seo.md
      findings-performance.md
      findings-architecture.md
      aggregated-report.md
      fixes-applied.md
      plan-{FINDING-ID}.md          # Large fix plans
```

---

## Commands to Create (7 new + setup)

### Pipeline A: Planning

```
/brief.me → /plan.with.codex (Phase 1) → [User pastes to Codex] → /plan.with.codex synthesise → /plan.to.yolo → [YOLO execution]
```

### Pipeline B: Quality

```
/review.code → /fix.findings → /deploy.changes
         └── /review.fix.deploy (orchestrates all three) ──┘
```

---

## Key Adaptations from Source

| What            | local-business-platform                                   | Svolta                                                            |
| --------------- | --------------------------------------------------------- | ----------------------------------------------------------------- |
| Package manager | `pnpm`                                                    | `npm run`                                                         |
| Scope           | Monorepo (`sites/`, `packages/`)                          | Single Next.js app                                                |
| Review domains  | 4 agents (Security, Code Quality, A11y/SEO, Architecture) | 5 agents (adds Performance & UX alongside A11y/SEO)               |
| Standards docs  | Custom locations                                          | `docs/standards/security.md`, `code-style.md`, `design-tokens.md` |
| Verification    | `pnpm type-check`, `pnpm lint`, `pnpm build`              | `npm run type-check`, `npm run lint`, `npm run build`             |
| Pipeline tools  | `pnpm pipeline:smoke`                                     | None (CI handles this)                                            |

**5th domain rationale:** Svolta is a SaaS editor app where canvas performance, MediaPipe loading, bundle size, and memory management are critical. Keep A11y/SEO for landing pages and add Performance & UX as a 5th domain.

---

## Command Details

### 1. `/brief.me` — Near-direct port

- Interactive interview to clarify specifications
- Outputs `brief.md` to session folder
- Project-agnostic — minimal changes needed (just project name)

### 2. `/plan.with.codex` — Minor adaptations

- Phase 1: Claude writes independent plan + `codex-prompt.md` with Svolta context
- Phase 2: Synthesizes Claude + Codex plans into `synthesis.md`
- Adapt: Svolta file structure in research step (`app/`, `components/`, `hooks/`, `stores/`, `lib/`)
- Adapt: Project description in codex-prompt template

### 3. `/plan.to.yolo` — Moderate adaptations

- Converts synthesis into executable YOLO brief with cost estimates
- Adapt: All `pnpm` → `npm run`, remove monorepo scoping
- Adapt: Remove `pnpm pipeline:smoke`, keep verification gates as `npm run type-check && npm run lint && npm run build`

### 4. `/review.code` — Most complex (significant adaptations)

Five parallel review agents with Svolta-specific prompts:

| #   | Agent                  | Prefix     | Standards Doc                     | Svolta Focus                                                                    |
| --- | ---------------------- | ---------- | --------------------------------- | ------------------------------------------------------------------------------- |
| 1   | `cs-security-engineer` | SEC-       | `docs/standards/security.md`      | API route validation, Supabase RLS, Stripe webhooks, CSP, photo privacy         |
| 2   | `cs-code-reviewer`     | CQ-        | `docs/standards/code-style.md`    | TypeScript strict, Zustand patterns, hook patterns, no `any`                    |
| 3   | `cs-frontend-engineer` | A11Y-/SEO- | `docs/standards/design-tokens.md` | Accessibility, semantic HTML, landing page SEO, meta tags, ARIA                 |
| 4   | `cs-frontend-engineer` | PERF-      | `docs/standards/design-tokens.md` | Canvas rendering, MediaPipe loading, bundle size, GIF export perf, memory leaks |
| 5   | `cs-architect`         | ARCH-      | `docs/architecture/overview.md`   | Client-side processing boundary, component hierarchy, state store boundaries    |

### 5. `/fix.findings` — Moderate adaptations

- Reads findings from most recent `*_code-review` session
- Batching: max 5 trivial/small, max 1 medium, bottom-to-top
- Verification: `npm run type-check`, `npm run lint`, `npm run build`
- Sub-agent mapping: SEC→security, CQ→code-reviewer, A11Y/SEO→frontend, PERF→frontend, ARCH→architect
- Large fixes get plan files + sub-agent execution

### 6. `/deploy.changes` — Moderate adaptations

- Runs `/update.docs` first
- Commits, pushes develop → staging → main
- Verification with `npm run` commands
- Uses `gh run watch` for CI monitoring before staging→main promotion

### 7. `/review.fix.deploy` — Near-direct port

- Orchestrates: `/review.code` → `/fix.findings` → `/deploy.changes`
- Optional severity filter argument
- Fully autonomous when invoked

---

## Implementation Order

**Phase 1 — Foundation (no dependencies)**

1. Create `output/` directory with `output/README.md` and `output/sessions/.gitkeep`
2. `/brief.me` — standalone, near-direct port
3. `/deploy.changes` — depends only on existing `/update.docs`

**Phase 2 — Planning chain** 4. `/plan.with.codex` — depends on `/brief.me` session convention 5. `/plan.to.yolo` — depends on `/plan.with.codex` synthesis output

**Phase 3 — Review chain** 6. `/review.code` — most complex, standalone 7. `/fix.findings` — depends on `/review.code` output format

**Phase 4 — Orchestrator** 8. `/review.fix.deploy` — depends on all three quality commands

---

## Files to Create

**New files:**

- `output/README.md` — session directory documentation
- `output/sessions/.gitkeep` — ensure directory exists
- `.claude/commands/brief.me.md`
- `.claude/commands/plan.with.codex.md`
- `.claude/commands/plan.to.yolo.md`
- `.claude/commands/review.code.md`
- `.claude/commands/fix.findings.md`
- `.claude/commands/review.fix.deploy.md`
- `.claude/commands/deploy.changes.md`

**Reference files (read, not modified):**

- `.claude/commands/update.docs.md` — existing command, use as style reference (570 lines, comprehensive)
- `docs/standards/security.md` — security review agent context
- `docs/standards/code-style.md` — code quality review agent context
- `docs/standards/design-tokens.md` — performance/a11y review agent context
- `docs/architecture/overview.md` — architecture review agent context
- `docs/standards/git-workflow.md` — deploy command reference

**Optional follow-up:**

- `docs/standards/performance.md` — performance budgets (bundle size targets, canvas FPS, MediaPipe load time) to strengthen PERF- reviews

---

## Implementation Approach

**Pre-flight:** Create a feature branch before starting implementation:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/claude-commands
```

For each command, the implementation will:

1. Read the full source file from `/Users/rickywilson/Sites/local-business-platform/.claude/commands/` (production-quality, ~200-600 lines each)
2. Read any Svolta reference files needed (standards docs, architecture docs)
3. Adapt the source to Svolta's context while preserving the session architecture and command depth
4. Write the full command file to `.claude/commands/`

Commands must match the ~500-line depth of the existing `/update.docs` command. Each must be a self-contained, production-ready instruction set.

**YOLO execution note:** The `/plan.to.yolo` command must ensure the YOLO brief includes a mandatory pre-flight step to create a feature branch from develop before any autonomous code changes begin:

```bash
git checkout develop && git pull origin develop
git checkout -b feature/{topic-slug}
```

This prevents any YOLO session from writing directly to develop.

---

## Verification

1. **Structure check:** All 7 new command files exist in `.claude/commands/`
2. **Session test:** Run `/brief.me` and verify `output/sessions/YYYY-MM-DD_topic/brief.md` is created
3. **Chain test:** Run `/review.code` and verify 5 findings files + aggregated report appear in session folder
4. **Deploy test:** Run `/deploy.changes` on a test branch and verify it calls `/update.docs`, runs verification, and follows git workflow
5. **Gitignore:** Verify `output/` contents (except README.md) are not tracked
