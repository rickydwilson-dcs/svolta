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

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $5 / $25               | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $1 / $5                | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).
```

Use this table when assigning models to each phase below.

**Delegation model — include this section verbatim in every generated brief:**

```markdown
## Delegation Model

The orchestrator is a **coordinator, not an implementer**. Its job is: read this brief,
sequence the phases, dispatch sub-agents, run verification gates, make commits, and write
the final report. It does **not** implement phase work inline by default.

**Every phase's implementation work is delegated to one or more `Task` sub-agents**, each
spawned at the phase's `**Model:**` tier. The model annotation _is_ the sub-agent's model —
it is meaningless unless the work is delegated, because the orchestrator cannot change its
own running model. A `**Model:** haiku` phase executed inline runs at full orchestrator
cost and consumes orchestrator context; delegating it keeps that work in the sub-agent and
returns only a short summary.

**Inline exception.** The orchestrator may implement a phase inline ONLY when the work is
tightly cross-coupled and correctness-critical — e.g. a deterministic engine spanning many
interdependent files with exact golden vectors — where round-tripping through a sub-agent
would lose essential context. When taken, the phase MUST declare
`**Execution:** inline (exception) — <one-line rationale>`. This is the exception, not the
default; prefer delegation whenever the work is separable.

The orchestrator's own model (set by the launch command) is **independent** of the phase
tiers. Opus orchestrating while individual phases delegate to haiku/sonnet sub-agents is
expected and correct — the orchestrator coordinates; the tiers attach to sub-agents.
```

The brief must:

**3a. Open with standard headers:**

Derive the feature branch name from the topic slug: `feature/topic-slug`

```markdown
# YOLO Implementation Brief: [Title from synthesis]

**Branch:** feature/topic-slug (created from develop)
**Session spec:** output/sessions/YYYY-MM-DD_topic-slug/yolo-brief.md
**Mode:** Autonomous execution — coordinate all phases, delegate implementation to sub-agents, verify after each, STOP on error
**Orchestrator model:** sonnet — coordinator only; per-phase `**Model:**` tiers attach to delegated sub-agents and are independent of this

---

## Context

[2–3 sentence summary: what the problem is, what the plan does, why it was approved]

The synthesis was reviewed and approved. Implement it exactly as specified below.
```

**3b. Pre-flight block:**

````markdown
## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/topic-slug   # create feature branch from develop — NEVER write directly to develop
npm run type-check                    # must be clean before starting
```
````

```

**3c. Expand each phase from the synthesis into a numbered section:**

For each phase:
- Retain the goal, files, and verification gate exactly from the synthesis
- Annotate each phase with a `**Model:**` line immediately after `**Goal:**`, using the tier table.
- Annotate each phase with an `**Execution:**` line immediately after `**Model:**`. This is REQUIRED on every phase and is one of:
  - `**Execution:** delegate to 1 [tier] sub-agent` — the sequential default. Even a single-item phase is delegated, not done inline.
  - `**Execution:** delegate to N [tier] sub-agents in one message` — when the phase has independent work items that can run in parallel.
  - `**Execution:** inline (exception) — [rationale]` — ONLY for tightly cross-coupled, correctness-critical work per the Delegation Model. State the rationale.
- For every delegated sub-agent, include `model: [tier]` in the agent spawn block. Parallel sub-agents MUST be launched in a single Task-tool message.

  **Default-delegate example (single sub-agent, sequential phase):**

```

**Goal:** Wire the squad-validation endpoint to the new budget rule
**Model:** sonnet — standard feature wiring across two files
**Execution:** delegate to 1 sonnet sub-agent

Task: Implement budget-rule wiring
model: sonnet
Prompt: [self-contained instructions — files to read, change to make, what to return]

```

**Parallel example (two sub-agents in one message):**

```

**Goal:** Add ComponentRegistry exports to lyra and atlas
**Model:** haiku — mechanical import + export additions to two independent files
**Execution:** delegate to 2 haiku sub-agents in one message

Spawn two agents in parallel (single Task-tool message):
Task: Fix lyra/index.ts registry export
model: haiku
Prompt: [...]
Task: Fix atlas/index.ts registry export
model: haiku
Prompt: [...]

````
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
````

**3d. Cost Estimate section (after all phases, before Final Report):**

After expanding all phases, include a cost estimate table. Populate it by scanning the synthesis for file counts and approximate sizes.

```markdown
## Cost Estimate

| Phase                 | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| --------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: [short name] | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 2: [short name] | haiku  | ~8k               | ~1k                | $0.01      |
| ...                   |        |                   |                    |            |
| **Total**             |        | **~Xk**           | **~Yk**            | **~$Z.ZZ** |

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

   | Model     | Est. input tokens     | Est. output tokens | Est. cost |
   | --------- | --------------------- | ------------------ | --------- |
   | sonnet    | [total across phases] |                    | $X.XX     |
   | haiku     | [if used]             |                    | $X.XX     |
   | opus      | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.
```

**3f. Session file update section:**

````markdown
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
````

Confirm this was done in the final report.

````

**3g. Execution rules footer:**
```markdown
## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- **Delegate every phase's implementation to sub-agents by default.** The orchestrator coordinates, gates, and commits — it does NOT write phase code inline. Each phase's `**Execution:**` line says how: `delegate to 1 [tier] sub-agent`, `delegate to N [tier] sub-agents in one message`, or `inline (exception) — [rationale]`. Only implement inline when the phase explicitly declared the inline exception.
- **The `**Model:**` tier names the sub-agent's model, not the orchestrator's.** The orchestrator's own model is set by the launch command and is independent of the phase tiers — it cannot change its own running model, so a `haiku`/`sonnet` phase tier is only honoured by spawning a sub-agent at that tier. A phase done inline runs at orchestrator cost and burns orchestrator context regardless of its annotation.
- **Inline is the exception, not the default.** Reserve it for tightly cross-coupled, correctness-critical work (e.g. a deterministic engine spanning many interdependent files with exact golden vectors) where round-tripping through a sub-agent loses essential context. Always state the rationale on the `**Execution:**` line.
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the **orchestrator** model (the committer), e.g. `Claude Sonnet 4.6` — not the per-phase sub-agent tier that implemented the change. If the running orchestrator differs from the brief's stated `**Orchestrator model:**`, use the actual running model.
- All work stays on `feature/topic-slug` — NEVER commit directly to develop
````

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

| Phase | Sub-agent model | Execution | Goal |
|-------|-----------------|-----------|------|
| Phase 1 | sonnet | delegate to 1 sub-agent | [one-line goal] |
| Phase 2 | haiku | delegate to 2 sub-agents | [one-line goal] |
| Phase 3 | sonnet | inline (exception) | [one-line goal] |
| ... | | | |

The "Sub-agent model" column is the tier each phase's work is **delegated** to — it is independent of the orchestrator model below. The orchestrator only coordinates, gates, and commits.

To override the orchestrator model: change `--model sonnet` to `--model opus` (this changes the coordinator only; per-phase sub-agent tiers are unaffected)
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
