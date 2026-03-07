# Fix Findings

Fix code review findings from the most recent `/review.code` session. Reads structured findings, applies fixes (batched for small items, planned + sub-agent-executed for large items), and verifies with a clean build.

## Arguments

Parse `$ARGUMENTS` to determine scope:

- **No arguments** → interactive: show findings summary, ask user what to fix
- **Severity level** → `critical` (CRITICAL only), `high` (CRITICAL + HIGH), `medium` (CRITICAL + HIGH + MEDIUM)
- **Finding ID** → fix specific finding: `SEC-001`
- **Comma-separated IDs** → fix multiple: `SEC-001,SEC-002,ARCH-005`
- **Domain name** → fix all in domain: `security`, `code-quality`, `accessibility`, `performance`, `architecture`
- **Effort level** → `trivial` (all trivial-effort findings — quick wins)
- **`--auto` flag** → skip the confirmation gate and dirty-tree warning. Used when called from `/review.fix.deploy` pipeline. Can be combined with any scope: `high --auto`, `trivial --auto`

## Step 1: Locate Review Session

Find the most recent code review session:

```bash
ls -d output/sessions/*_code-review 2>/dev/null | sort -r | head -1
```

If no session exists, STOP and tell the user: "No review session found. Run `/review.code` first."

Read `aggregated-report.md` from that session. Also read the individual findings files to get full detail:

- `findings-security.md`
- `findings-code-quality.md`
- `findings-accessibility-seo.md`
- `findings-performance.md`
- `findings-architecture.md`

Parse each finding to extract: ID, severity, file path, line numbers, issue, fix instructions, effort level.

## Step 2: Parse Scope & Present Plan

Based on `$ARGUMENTS`, filter the findings list.

Present to the user:

- Total findings matching the filter
- Breakdown by effort level (trivial/small/medium/large)
- List of finding IDs that will be fixed directly (trivial/small/medium)
- List of finding IDs that will be planned + executed via sub-agent (large)
- Any findings that will be skipped (with reason)

**Unless `--auto` is set**, ask for confirmation before proceeding. If `--auto` is set, log the plan summary but proceed without asking. Example:

> **Fix Plan:**
>
> - 8 findings to fix directly (5 trivial, 2 small, 1 medium)
> - 2 large findings to plan + execute via sub-agent
> - 0 skipped
>
> Proceed?

## Step 3: Pre-flight Checks

```bash
git branch --show-current
```

Must be on `develop`. If not, STOP and inform the user.

```bash
git status --porcelain
```

If working tree is dirty and `--auto` is **not** set, warn the user: "You have uncommitted changes. Recommend committing or stashing before proceeding." Ask whether to continue or stop. If `--auto` is set, skip the dirty-tree warning (the caller has already verified).

## Step 4: Execute Fixes

### Phase 1: Direct Fixes (trivial/small/medium effort)

Group findings into batches:

**Batching rules:**

- Group findings targeting the **same file** together (regardless of domain)
- Within a batch, fix from **bottom of file upward** (highest line number first) to avoid line number shifts
- Max **5 trivial/small** findings per batch
- Max **1 medium** finding per batch (medium fixes are more complex)

**For each batch:**

1. Read the detailed finding(s) from the appropriate domain findings file
2. Read the target file(s) using the Read tool — verify the code at the specified lines matches what the finding describes. If the code has changed since the review, skip the finding and log as "stale"
3. Apply the fix as described in the finding's **Fix** field using the Edit tool
4. After applying the batch, run incremental verification — **all three must pass**. Run each as a separate command (do NOT chain with `&&`):

```bash
npm run type-check
```

```bash
npm run lint
```

```bash
npm run build
```

5. **If all three pass:** log the findings as "Fixed" and continue to the next batch
6. **If any step fails:** revert all changes in the batch using `git checkout -- [files]`, log the findings as "Failed" with the error (include which step failed and the output), and continue to the next batch

**Why all three:** Type-check alone misses ESLint violations, missing imports that only surface at build time, and MDX/content issues. Catching these per-batch is far cheaper than debugging a combined diff later.

### Phase 2: Large Fixes (large effort — plan + sub-agent execution)

For each large-effort finding:

**Step A: Generate the plan**

1. Read the finding's full detail (Issue, Impact, Fix, related files)
2. Read the target file(s) and any files referenced in the Fix instructions
3. Identify all files that will need to change and any dependencies between changes
4. Write a plan file to the session directory:

Write to `output/sessions/[session-name]/plan-[FINDING-ID].md`:

```markdown
# Fix Plan: [FINDING-ID] — [Short Title]

**Severity:** [level]
**Effort:** large
**Finding:** [original issue description from the review]

## Prerequisites

- [any other findings that must be fixed first]
- [any environment setup needed]

## Tasks

### Task 1: [description]

**File:** `path/to/file.ts`
**Change:** [specific modification — what to add/remove/modify]
**Verify:** `npm run type-check` passes

### Task 2: [description]

**File:** `path/to/file.ts`
**Change:** [specific modification]
**Verify:** `npm run type-check` passes

### Task N: [description]

...

## Final Verification

- `npm run type-check` passes
- `npm run lint` passes
- `npm run build` succeeds
- [any domain-specific checks]

## Risks

- [what could break if this fix is applied incorrectly]
```

**Step B: Execute the plan via sub-agent**

Spawn a Task agent to execute the plan. Choose the sub-agent type based on the finding's domain:

| Finding prefix          | Sub-agent type           |
| ----------------------- | ------------------------ |
| `SEC-*`                 | `cs-security-engineer`   |
| `CQ-*`                  | `cs-code-reviewer`       |
| `A11Y-*` / `SEO-*`      | `cs-frontend-engineer`   |
| `PERF-*`                | `cs-frontend-engineer`   |
| `ARCH-*`                | `cs-architect`           |

**Prompt for the sub-agent:**

> You are executing a fix plan for a code review finding. The plan is below.
>
> **Instructions:**
>
> 1. Execute each task in order
> 2. After each task, run `npm run type-check`, then `npm run lint`, then `npm run build` (each as a separate command — do NOT chain with `&&`)
> 3. If any verification step fails after a task, revert that task's changes with `git checkout -- [files]` and mark it as FAILED
> 4. Continue to the next task regardless of whether the previous one succeeded or failed
> 5. After all tasks, run the Final Verification commands
> 6. Write a results summary to `output/sessions/[session-name]/plan-[FINDING-ID]-results.md` with:
>    - Each task marked as DONE or FAILED
>    - Final verification results (PASS/FAIL for each command)
>    - Any errors encountered
>
> **The plan:**
> [insert plan file content here]
>
> **Important rules:**
>
> - Do NOT modify files outside the scope of this plan
> - Do NOT auto-commit changes
> - If a task's instructions are ambiguous, make the minimal safe change
> - Always read the target file first to verify it matches expectations

**Parallelism:** If multiple large findings target completely different files (no overlap), spawn their sub-agents in a single message so they run in parallel. If they share any files, run them sequentially.

After each sub-agent completes, read its results file and incorporate into the main `fixes-applied.md`.

### Phase 3: Final Verification

After all phases complete, run full verification from the project root:

```bash
npm run type-check
```

```bash
npm run lint
```

```bash
npm run build
```

```bash
npm run test
```

If any verification step fails, identify which fix caused the failure by checking `git diff` against the findings. Revert the offending change and log it.

## Step 5: Log Results

Write `output/sessions/[session-name]/fixes-applied.md`:

```markdown
# Fixes Applied

**Date:** YYYY-MM-DD
**Scope:** [what was requested — e.g., "all HIGH findings", "SEC-001,SEC-002"]
**Review session:** [session directory name]

## Applied (Direct Fixes)

| ID      | Severity | Effort  | File                                     | Notes                               |
| ------- | -------- | ------- | ---------------------------------------- | ----------------------------------- |
| SEC-004 | HIGH     | trivial | app/api/stripe/webhook/route.ts          | Added webhook signature verification |
| CQ-002  | MEDIUM   | small   | stores/editor-store.ts                   | Replaced full store access with selector |

## Applied (Large Fixes via Sub-Agent)

| ID       | Severity | Plan File        | Tasks Total | Tasks Done | Tasks Failed |
| -------- | -------- | ---------------- | ----------- | ---------- | ------------ |
| ARCH-003 | CRITICAL | plan-ARCH-003.md | 4           | 3          | 1            |

## Stale (Code Changed Since Review)

| ID  | Severity | File | Reason                                            |
| --- | -------- | ---- | ------------------------------------------------- |
| ... | ...      | ...  | Code at specified lines no longer matches finding |

## Failed (Verification Error)

| ID  | Severity | File | Error                              |
| --- | -------- | ---- | ---------------------------------- |
| ... | ...      | ...  | type-check failed: [error message] |

## Skipped

| ID  | Severity | Reason   |
| --- | -------- | -------- |
| ... | ...      | [reason] |

## Final Verification

- Type check: PASS / FAIL
- Lint: PASS / FAIL
- Build: PASS / FAIL
- Unit tests: PASS / FAIL

## Changes Summary

[output of `git diff --stat`]
```

Also run `git diff --stat` and include the output in the report.

## Step 6: Report to User

Present a concise summary:

- Findings fixed directly: N (list IDs)
- Large findings executed via sub-agent: N (list IDs with task success/fail counts)
- Stale findings skipped: N (code changed since review)
- Failed findings: N (list IDs with brief error)
- Final verification: PASS/FAIL for type-check, lint, build
- Changes are **uncommitted** — review with `git diff`, then commit or use `/deploy.changes`

## Rules

- **Ask for confirmation** before applying fixes (Step 2 gate) — unless `--auto` flag is set
- **Never auto-commit** — leave all changes uncommitted for user review
- **Large findings are planned then auto-executed** via sub-agents — plan files are written for audit trail
- If a fix breaks type-check, **revert that batch** and log it as failed — never cascade failures
- **Verify code is current** before fixing — if lines don't match the finding, mark as "stale" and skip
- Follow the project's change philosophy: minimal targeted changes, never remove features
- **Never modify test files** unless the finding specifically targets a test
- Replace `YYYY-MM-DD` and `[session-name]` with actual values
