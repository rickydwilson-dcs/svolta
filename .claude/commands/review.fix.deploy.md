# Review → Fix → Deploy

Autonomous pipeline that reviews the codebase, fixes findings, commits, and deploys — all in one command.

## Arguments

Parse `$ARGUMENTS` to determine fix scope (passed to `/fix.findings`):

- **No arguments** → default: fix `high` severity (CRITICAL + HIGH findings)
- **Severity level** → `critical`, `high`, `medium` (passed directly to `/fix.findings`)
- **`trivial`** → quick wins only (all trivial-effort findings)
- **`all`** → fix everything up to MEDIUM severity

## Pre-flight

```bash
git branch --show-current
```

Must be on `develop`. If not, STOP.

```bash
git status --porcelain
```

If dirty, STOP: "You have uncommitted changes. Commit or stash before running the pipeline."

## Phase 1: Review

Run `/review.code` (full review, all 5 domains).

Wait for it to complete. Read the aggregated report to confirm findings were generated.

If no findings are found (all zeros), skip Phase 2 and go directly to Phase 3.

## Phase 2: Fix

Run `/fix.findings` with the scope determined from `$ARGUMENTS`:

| Input      | Passed to `/fix.findings` |
| ---------- | ------------------------- |
| (none)     | `high --auto`             |
| `critical` | `critical --auto`         |
| `high`     | `high --auto`             |
| `medium`   | `medium --auto`           |
| `trivial`  | `trivial --auto`          |
| `all`      | `medium --auto`           |

**Always pass `--auto`** — the user already opted into full autonomy by running `/review.fix.deploy`. The `--auto` flag skips the confirmation gate and dirty-tree warning in `/fix.findings`.

After `/fix.findings` completes, check if any fixes were applied:

```bash
git status --porcelain
```

If no changes were made (all findings were stale, skipped, or failed), inform the user and STOP. Nothing to deploy.

## Phase 3: Deploy

Run `/deploy.changes` to commit and push through develop → staging → main.

`/deploy.changes` handles everything from here:

1. Runs `/update.docs` to verify documentation
2. Commits all uncommitted changes (the fixes from Phase 2)
3. Runs pre-commit verification (`npm run type-check`, `npm run lint`, `npm run build`)
4. Pushes through develop → staging → main with CI checks
5. Uses `./scripts/deploy-to-production.sh` for the final main deployment

## Phase 4: Report

Present a final summary:

```
Pipeline Complete

Review:    [N] findings across 5 domains
Fixed:     [N] findings ([list IDs])
Skipped:   [N] ([reasons])
Failed:    [N] ([IDs + brief errors])
Committed: [commit SHA]
Deployed:  develop → staging → main

Session:   output/sessions/YYYY-MM-DD_code-review/
```

## Rules

- **Fully autonomous** — no human checkpoints. The user opted in by running this command.
- **Never skip the review** — even if you think you know what's wrong, always run `/review.code` first for a fresh assessment.
- **Never deploy failed fixes** — if `/fix.findings` reports failures, only the successful fixes are committed.
- **Never force through CI failures** — if `/deploy.changes` encounters a CI failure, STOP and report.
- **Clean working tree required** — refuse to start if there are uncommitted changes.
- If any phase fails catastrophically, STOP immediately and report what happened. Do not attempt to recover automatically.
