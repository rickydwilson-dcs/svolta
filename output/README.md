# Output Directory

Local-only workspace for agent outputs, implementation plans, code review sessions, and debug logs.

**Git status:** All files in this directory are `.gitignore`d except this README.

---

## Session Architecture

Claude Code commands share state through `output/sessions/` folders. This enables command chaining across the planning and quality pipelines.

```
output/
  README.md                          # This file (tracked in git)
  sessions/
    YYYY-MM-DD_topic-slug/           # Planning sessions (/brief.me → /plan.with.codex → /plan.to.yolo)
      brief.md                       # /brief.me output — clarified spec
      codex-prompt.md                # /plan.with.codex Phase 1 — ready-to-paste Codex prompt
      claude-plan.md                 # /plan.with.codex Phase 1 — Claude's independent plan
      codex-plan.md                  # User pastes Codex's response here
      synthesis.md                   # /plan.with.codex Phase 2 — synthesised final plan
      yolo-brief.md                  # /plan.to.yolo — executable YOLO brief with cost estimates
    YYYY-MM-DD_code-review/          # Review sessions (/review.code → /fix.findings)
      session.md                     # Session state and agent status
      findings-security.md           # SEC-NNN findings from cs-security-engineer
      findings-code-quality.md       # CQ-NNN findings from cs-code-reviewer
      findings-accessibility-seo.md  # A11Y-/SEO-NNN findings from cs-frontend-engineer
      findings-performance.md        # PERF-NNN findings from cs-frontend-engineer
      findings-architecture.md       # ARCH-NNN findings from cs-architect
      aggregated-report.md           # Cross-domain summary with remediation order
      fixes-applied.md               # /fix.findings results log
      plan-{FINDING-ID}.md          # Large fix plans (one per large-effort finding)
      plan-{FINDING-ID}-results.md  # Sub-agent execution results for large fixes
```

---

## Pipelines

### Planning Pipeline

```
/brief.me [topic]
  → output/sessions/YYYY-MM-DD_topic/brief.md

/plan.with.codex [topic]
  → output/sessions/YYYY-MM-DD_topic/codex-prompt.md  (paste into Codex)
  → output/sessions/YYYY-MM-DD_topic/claude-plan.md

[User pastes Codex response as codex-plan.md]

/plan.with.codex synthesise
  → output/sessions/YYYY-MM-DD_topic/synthesis.md

/plan.to.yolo
  → output/sessions/YYYY-MM-DD_topic/yolo-brief.md
  → terminal command to launch autonomous session
```

### Quality Pipeline

```
/review.code
  → output/sessions/YYYY-MM-DD_code-review/findings-*.md
  → output/sessions/YYYY-MM-DD_code-review/aggregated-report.md

/fix.findings [scope]
  → output/sessions/YYYY-MM-DD_code-review/fixes-applied.md

/deploy.changes
  → develops → staging → main

/review.fix.deploy [scope]
  → orchestrates all three above autonomously
```

---

## Naming Conventions

| Prefix                    | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `YYYY-MM-DD_topic-slug/`  | Planning session — use the topic slug from `/brief.me` |
| `YYYY-MM-DD_code-review/` | Code review session — created by `/review.code`        |

---

## Finding ID Prefixes

| Prefix     | Domain        | Agent                |
| ---------- | ------------- | -------------------- |
| `SEC-NNN`  | Security      | cs-security-engineer |
| `CQ-NNN`   | Code Quality  | cs-code-reviewer     |
| `A11Y-NNN` | Accessibility | cs-frontend-engineer |
| `SEO-NNN`  | SEO           | cs-frontend-engineer |
| `PERF-NNN` | Performance   | cs-frontend-engineer |
| `ARCH-NNN` | Architecture  | cs-architect         |

---

## Notes

- Files here are **never committed** — safe to write freely
- Session folders accumulate over time — this is intentional (audit trail)
- The `sessions/` subdirectory is created automatically by commands
- If you want to clean up old sessions: `rm -rf output/sessions/YYYY-MM-DD_*`
