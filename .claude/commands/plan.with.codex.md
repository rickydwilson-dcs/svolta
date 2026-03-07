# Plan with Codex Peer Review

Runs the dual-model peer review workflow for complex architectural or multi-step implementation tasks.

**Two modes:**
- `/plan.with.codex [topic] [brief]` — **Phase 1**: Write the problem brief and Claude's initial plan, ready for Codex review
- `/plan.with.codex synthesise` — **Phase 2**: Read both plans, synthesise into a final spec

---

## Phase 1: Write Brief and Claude Plan

**Recommended model:** Sonnet. This phase does codebase research and structured plan writing — Opus is not needed here.

Triggered when `$ARGUMENTS` is NOT the word `synthesise`.

### Step 1: Parse Arguments

Extract the topic slug (first word) and brief (remaining text) from `$ARGUMENTS`.

If no arguments provided, ask the user: "What is the topic slug (e.g. `gif-export`) and a one-paragraph description of the problem to solve?"

### Step 2: Create Session Folder

```bash
TOPIC="[topic-slug-from-arguments]"
DATE=$(date +%Y-%m-%d)
FOLDER="output/sessions/${DATE}_${TOPIC}"
mkdir -p "$FOLDER"
```

### Step 3: Research the Codebase

Before writing anything, explore the relevant parts of the codebase:

- Read `CLAUDE.md` for architecture rules and constraints
- Read any docs files directly relevant to the topic (check `docs/architecture/` and `docs/standards/`)
- Glob and read the files most likely to be affected by the change — look in:
  - `app/` — Next.js App Router pages, layouts, and API routes
  - `components/` — React components (UI primitives in `components/ui/`, feature components in `components/editor/`, etc.)
  - `hooks/` — custom React hooks
  - `stores/` — Zustand state stores
  - `lib/` — utilities, Supabase client, Stripe plans, etc.
- Identify existing patterns this work must integrate with (canvas state, MediaPipe lifecycle, Supabase auth, Stripe billing)

### Step 4: Write the Problem Brief (`codex-prompt.md`)

**Check for a clarified brief first:**

```bash
ls $FOLDER/brief.md 2>/dev/null
```

- **If `brief.md` exists**: read it and use its Problem Statement, Goals, Non-Goals, Acceptance Criteria, and Constraints sections as the primary source for the prompt below. Do not re-derive these from arguments.
- **If `brief.md` does not exist**: derive the content from `$ARGUMENTS` as before, and add this note in the prompt: "Note: no clarified brief was produced for this topic. Challenge assumptions accordingly and flag any scope gaps you identify."

Write `$FOLDER/codex-prompt.md` as a **ready-to-paste Codex prompt** — not just the brief content. The file should open with the exact text the user pastes into Codex, including the slash command to use, the file to read, and where to save the output. Structure:

```markdown
# Codex Peer Review Prompt

Paste this entire file into Codex in VS Code.

---

## Your task

You are doing an independent architectural peer review. Read the brief below, then produce your own implementation plan.

Save your plan as `codex-plan.md` in this folder:
`output/sessions/[DATE_TOPIC]/`

When done, output this exact command so the user can copy-paste it into Claude Code:

```
/plan.with.codex synthesise output/sessions/[DATE_TOPIC]/
```

---

## Brief: [Topic Title]

**Date:** YYYY-MM-DD
**Project:** Svolta — fitness photo alignment SaaS (Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe)
**Note:** This brief is sent to both Claude and Codex independently. Your plans will be synthesised into a final implementation spec. Do not look at `claude-plan.md` before writing your own plan.

### Problem Statement

[From brief.md if present, otherwise derived from arguments]

### Goals

[From brief.md if present — what success looks like]

### Non-Goals

[From brief.md if present — what is explicitly out of scope]

### Acceptance Criteria

[From brief.md if present — concrete, testable criteria]

### Constraints

[Hard constraints from brief.md plus any architecture-specific constraints discovered during codebase research]

### Relevant Architecture

[Key facts about how the current system works that are directly relevant to this problem. Include file paths.
Examples: how Zustand stores are structured, how the canvas lifecycle works, how Supabase auth is integrated,
how Stripe plans are defined, how MediaPipe is initialised client-side.]

### Codebase Snapshot

[Key file paths and what they contain, enough for Codex to understand the starting point without reading the whole repo.
List the most relevant files discovered during Step 3 research.]

### What a Good Plan Should Cover

[The questions the plan needs to answer — not the answers themselves. Pull open questions from brief.md if present.]

---

## Deliverable

Produce a numbered implementation plan with:
- Clear phases/steps
- Which files are created or modified at each step
- Verification gates between steps (how to confirm each step succeeded before moving on)
- Any risks or trade-offs worth calling out

Save your response as `codex-plan.md` in `output/sessions/[DATE_TOPIC]/`.

Then output this command for the user to copy-paste into Claude Code:
`/plan.with.codex synthesise output/sessions/[DATE_TOPIC]/`
```

### Step 5: Write Claude's Plan (`claude-plan.md`)

Now write Claude's own plan to `$FOLDER/claude-plan.md`. This is Claude thinking through the problem independently — before seeing any Codex output.

Use the same structure as the deliverable format above (phases, files, verification gates, risks).

Be thorough. This is the plan Claude would implement if working alone.

### Step 6: Report to User

Tell the user:

1. The folder that was created: `output/sessions/[DATE_TOPIC]/`
2. Open **`codex-prompt.md`** — it is a ready-to-paste prompt. Copy the entire file content and paste it into Codex in VS Code.
3. Codex's instructions (where to save its response, what to run next) are already inside the file.
4. Once Codex has saved `codex-plan.md`, run `/plan.with.codex synthesise` to generate the final spec.

---

## Phase 2: Synthesise

**Recommended model:** Opus. The synthesis requires reasoning about conflicts between two plans and making judgment calls on trade-offs. This is the highest-value step.

Triggered when `$ARGUMENTS` is exactly `synthesise`.

### Step 1: Find the Active Review Folder

```bash
ls -dt output/sessions/20*/ | head -1
```

Use the most recently modified subfolder as the active review.

### Step 2: Read Both Plans

Read:
- `[active-folder]/codex-prompt.md` — the original brief and constraints
- `[active-folder]/claude-plan.md` — Claude's independent plan
- `[active-folder]/codex-plan.md` — Codex's independent plan

If `codex-plan.md` does not exist or is empty, STOP and tell the user: "Codex plan not found. Paste Codex's response into `[active-folder]/codex-plan.md` and run `/plan.with.codex synthesise` again."

### Step 3: Analyse Differences

Before writing the synthesis, identify:

- **Points of agreement** — where both plans converge (high confidence these are correct)
- **Complementary elements** — where one plan covers something the other missed
- **Conflicts** — where the plans disagree; reason through which is correct given the constraints
- **Blind spots caught** — constraints or edge cases one plan identified that the other missed

### Step 4: Write Synthesis (`synthesis.md`)

Write `[active-folder]/synthesis.md`:

```markdown
# Implementation Plan: [Topic]

**Date:** YYYY-MM-DD
**Status:** Ready for implementation — approved by dual-model peer review
**Source:** Synthesised from Claude and Codex independent plans

## Key Differences Between Plans

| Aspect | Claude | Codex | Synthesised Decision |
|--------|--------|-------|----------------------|
| [aspect] | [claude's approach] | [codex's approach] | [chosen approach + reason] |

## Blind Spots Caught

- [What Codex caught that Claude missed]
- [What Claude caught that Codex missed]

---

## Implementation Plan

[The synthesised plan — phases, steps, files, verification gates, risks]
```

### Step 5: Report to User

Tell the user:
1. Path to `synthesis.md`
2. The 2-3 most significant differences between the two plans and how they were resolved
3. Any blind spots caught (this is the most valuable part)
4. Recommended next step: review and approve `synthesis.md`, then run `/plan.to.yolo` to generate the executable brief

---

## Rules

- **Phase 1 never proposes a solution in the brief** — the brief states the problem and constraints only, so both models reason independently
- **Claude's plan is written before seeing Codex's output** — write it in Step 5 before any synthesis
- **The synthesis is honest about conflicts** — don't paper over disagreements, reason through them
- **Model selection:** Phase 1 (brief + claude-plan) → Sonnet. Phase 2 (synthesis) → Opus. The synthesis earns the Opus cost; Phase 1 does not.
