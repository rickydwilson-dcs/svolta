# Brief Me

Turns a rough verbal description into a structured spec document through a clarification interview, then saves it ready for `/plan.with.codex`.

Use this before `/plan.with.codex` for any substantial piece of work — especially when the ask involves user interactions, integrations, or multiple phases.

---

## Step 1: Parse the Rough Brief

Extract the topic slug and description from `$ARGUMENTS`.

- **Topic slug** — first hyphenated word or short phrase (e.g. `gif-export`, `pro-upgrade-flow`)
- **Description** — everything else

If no arguments provided, ask: "What do you want to build? Describe it however comes naturally — don't worry about structure."

---

## Step 2: Challenge Pass

Before writing anything, read the brief and identify 3–5 gaps. Ask targeted questions — one per gap — drawn from these categories:

| Category | What to probe |
|----------|---------------|
| **Scope** | "You mentioned X — does this include Y, or is that out of scope?" |
| **Success criteria** | "How will you know this is working well? Walk me through the happy path end-to-end." |
| **Non-goals** | "What are we explicitly NOT building in this iteration?" |
| **User interaction** | "Who triggers this? What do they see or do? What happens on failure or edge cases?" |
| **Constraints** | "Does this need to work with [existing system]? Any hard limits on approach or tech?" |

**Rules for questions:**
- Be specific to the brief — never ask generic questions
- Maximum 5 questions — prioritise the biggest gaps
- Each question should be answerable in 1–3 sentences
- Do not propose solutions in the questions — stay in problem space

Ask all questions in one message. Wait for answers before continuing.

---

## Step 3: Await Answers

Wait for the user to respond. Do not continue until they have answered.

---

## Step 4: Write `brief.md`

Create the session folder and write the brief:

```bash
DATE=$(date +%Y-%m-%d)
FOLDER="output/sessions/${DATE}_[topic-slug]"
mkdir -p "$FOLDER"
```

Write `$FOLDER/brief.md`:

```markdown
# Brief: [Topic Title]

**Date:** YYYY-MM-DD
**Status:** Clarified — ready for dual-model peer review

---

## Problem Statement

[2–3 sentences: the pain point this solves and why it matters now. No solution yet.]

## Goals

- [What success looks like — 3–5 concrete outcomes]

## Non-Goals

- [What is explicitly out of scope for this iteration]

## User Interactions / Happy Path

[Step-by-step: who does what, what they see, what the system does in response. Include failure cases if relevant.]

## Acceptance Criteria

- Given [context], when [action], then [outcome]
- [2–5 testable criteria — specific enough to verify]

## Constraints

- [Hard constraints from existing architecture, timeline, dependencies, or approach]

## Open Questions

- [Anything still unresolved — flag for the planning models to address, not to block this brief]
```

Populate every section from the original brief + answers. Do not leave placeholder text — if a section is genuinely empty, remove it.

---

## Step 5: Report to User

Show the brief content inline in the response (formatted as markdown).

Then tell the user:

- Brief saved to: `output/sessions/[DATE]_[topic]/brief.md`
- Review it — if anything needs adjusting, edit the file directly
- When ready: run `/plan.with.codex [topic]` — the brief will be picked up automatically

---

## Rules

- Stay in problem space during the challenge pass — never propose solutions
- Brief.md must be complete enough that a technical planner could produce an implementation plan without asking you anything
- The folder name must match what `/plan.with.codex` will create (same `DATE_topic` format) so the brief is found automatically
