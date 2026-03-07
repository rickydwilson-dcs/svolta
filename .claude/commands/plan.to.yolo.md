# Plan to YOLO

Converts the approved `synthesis.md` from the most recent codex peer review into a YOLO implementation brief, then outputs a terminal command to launch an autonomous session.

---

## Step 1: Find the Active Review Folder

```bash
ls -dt output/sessions/20*/ | head -1
```

Use the most recently modified subfolder.

Read `[active-folder]/synthesis.md`. If it does not exist, STOP: "No synthesis.md found in `[active-folder]`. Run `/plan.with.codex synthesise` first."

## Step 2: Derive the Session Folder Path

Parse the review folder name to get: `YYYY-MM-DD_topic-slug`

Target session folder: `output/sessions/YYYY-MM-DD_topic-slug/`

Create it if it doesn't exist:
```bash
mkdir -p output/sessions/YYYY-MM-DD_topic-slug
```

## Step 3: Write the YOLO Brief

Produce `output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md` by expanding the synthesis into an executable implementation brief.

**Model tiers — include this table verbatim in every generated brief:**

```markdown
## Model Tiers

| Tier | Alias | Cost (in/out per MTok) | Use for |
|------|-------|----------------------|---------|
| Opus | `opus` | $5 / $25 | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15 | Standard implementation — file edits, feature wiring, most phases |
| Haiku | `haiku` | $1 / $5 | Mechanical tasks: find-replace, import additions, grep checks, content validation |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).
```

Use this table when assigning models to each phase below.

The brief must:

**3a. Open with standard headers:**

Derive the feature branch name from the topic slug: `feature/topic-slug`

```markdown
# YOLO Implementation Brief: [Title from synthesis]

**Branch:** feature/topic-slug (created from develop)
**Session spec:** output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

[2–3 sentence summary: what the problem is, what the plan does, why it was approved]

The synthesis was reviewed and approved. Implement it exactly as specified below.
```

**3b. Pre-flight block:**
```markdown
## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/topic-slug   # create feature branch from develop — NEVER write directly to develop
npm run type-check                    # must be clean before starting
```
```

**3c. Expand each phase from the synthesis into a numbered section:**

For each phase:
- Retain the goal, files, and verification gate exactly from the synthesis
- Annotate each phase with a `**Model:**` line immediately after `**Goal:**`, using the tier table. For Task agents within a phase, include `model: [tier]` in the agent spawn block. Example:
  ```
  **Goal:** Add alignment calculation to canvas export hook
  **Model:** sonnet — standard hook modification across 2-3 files

  Spawn two agents in parallel:
  Task: Update useCanvasExport hook
  model: sonnet
  Prompt: [...]
  ```
- Add explicit parallelism instructions wherever work is independent:
  - Reading multiple files → use parallel reads
  - Editing independent files in the same phase → use parallel Task agents
  - Running independent checks (lint, type-check, build) → note which can run together
- If any phase produces new TypeScript files or modifies existing ones, the final phase MUST include a verification gate that runs `npm run type-check` across the project
- Include the commit command at the end of each phase, exactly as specified in the synthesis
- Format verification gates as a named bash block that must pass before continuing:
  ```bash
  # Verification gate — STOP if this fails
  npm run type-check
  npm run lint
  npm run build
  ```

**3d. Cost Estimate section (after all phases, before Final Report):**

After expanding all phases, include a cost estimate table. Populate it by scanning the synthesis for file counts and approximate sizes.

```markdown
## Cost Estimate

| Phase | Model | Est. input tokens | Est. output tokens | Est. cost |
|-------|-------|------------------|--------------------|-----------|
| Phase 1: [short name] | sonnet | ~12k | ~2k | $0.07 |
| Phase 2: [short name] | haiku | ~8k | ~1k | $0.01 |
| ... | | | | |
| **Total** | | **~Xk** | **~Yk** | **~$Z.ZZ** |

Rates: Opus $5/$25, Sonnet $3/$15, Haiku $1/$5 per MTok.
Estimation: ~5 tokens per line of code. Input = files read + brief (~3k) + system prompt (~3k). Output = code written + verification output (~500/gate).
```

To populate: a file with ~100 lines ≈ 500 input tokens. A phase editing 3 medium files might output ~1k tokens. Be conservative (round up).

**3e. Final report section:**
```markdown
## Final Report

After all phases complete, output:
1. Phases completed — list each with commit SHA
2. Build status — confirm `npm run lint && npm run type-check && npm run build` passes
3. Any exceptions or intentional deviations from the plan
4. Token usage and cost estimate:

   | Model | Est. input tokens | Est. output tokens | Est. cost |
   |-------|------------------|--------------------|-----------|
   | sonnet | [total across phases] | | $X.XX |
   | haiku | [if used] | | $X.XX |
   | opus | [if used] | | $X.XX |
   | **Total** | | | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.
```

**3f. Session file update section:**
```markdown
## Update Session File

After completing all phases, append to `output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md`:

```markdown
## Completed

**Date:** [today]
**Status:** All phases executed successfully

[1-paragraph summary: what was implemented, any surprises]

### Commits
[list each commit SHA and message]
```

Confirm this was done in the final report.
```

**3g. Execution rules footer:**
```markdown
## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/topic-slug` — NEVER commit directly to develop
```

## Step 4: Output the Terminal Command, Cost Summary, and Next Steps

Print this block for the user to copy-paste:

---

**Paste into terminal:**

```
claude --dangerously-skip-permissions --model sonnet -p "Read output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md in full, then implement every phase it describes exactly as written."
```

---

Then print a **Cost & Model Summary** so the user can review before running:

```
Brief saved to: output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md

## Cost & Model Summary

Estimated total cost: ~$X.XX

| Phase | Model | Goal |
|-------|-------|------|
| Phase 1 | sonnet | [one-line goal] |
| Phase 2 | haiku | [one-line goal] |
| Phase 3 | sonnet | [one-line goal] |
| ... | | |

To override the orchestrator model: change `--model sonnet` to `--model opus`
To set a hard budget ceiling: add `--max-budget-usd N` to the command

Review the brief before running if you want to make any manual adjustments.

## After the YOLO session completes

All work will be on the `feature/topic-slug` branch — nothing has been pushed.
Back in VS Code / your IDE, you need to:

  1. git checkout feature/topic-slug   (if not already on it)
  2. Review the changes: git log --oneline develop..HEAD
  3. Merge into develop: git checkout develop && git merge feature/topic-slug
  4. Then run /deploy.changes to push develop → staging → main
```
