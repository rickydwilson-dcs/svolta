# YOLO Implementation Brief: A11y & SEO Quick Wins (Remediation Round 2)

**Branch:** feature/a11y-seo-quick-wins (created from develop)
**Session spec:** output/sessions/2026-03-08_session2-quick-wins/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The code review identified 10 accessibility and SEO findings (A11Y-001 through A11Y-008, SEO-004, SEO-006). A previous session partially addressed some items, but 8 of 10 remain completely unfixed and 2 are only partially done. This brief implements all remaining fixes — skip-link targets, focus-visible styles, ARIA labels, screen-reader headings, canonical URLs, and semantic metadata improvements.

The remediation plan was reviewed and approved. Implement it exactly as specified below.

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15 / $75              | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.80 / $4             | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/a11y-seo-quick-wins   # create feature branch from develop — NEVER write directly to develop
npm run type-check                              # must be clean before starting
```

---

## Phase 1: Skip-link targets (A11Y-001)

**Goal:** Add `id="main-content"` to `<main>` elements in app and auth layouts so skip-links work.
**Model:** haiku — mechanical attribute addition across 2 files

**Files:**

- `app/(app)/layout.tsx` — if no `<main>` element exists, wrap the children in `<main id="main-content">`
- `app/(auth)/layout.tsx` — add `id="main-content"` to the existing `<main>` element

**Steps:**

1. Read both layout files in parallel
2. Edit each file to ensure `<main id="main-content">` wraps the page content
3. Verify the marketing layout (`app/(marketing)/layout.tsx`) already has this — no changes needed there

```bash
# Verification gate — STOP if this fails
grep -r 'id="main-content"' app/\(app\)/layout.tsx app/\(auth\)/layout.tsx app/\(marketing\)/layout.tsx
# Should return 3 matches
npm run type-check
```

```bash
git add app/\(app\)/layout.tsx app/\(auth\)/layout.tsx
git commit -m "$(cat <<'EOF'
fix(a11y): add skip-link target id="main-content" to app and auth layouts (A11Y-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Focus-visible styles (A11Y-002) + Toggle focus ring (A11Y-006)

**Goal:** Add `:focus-visible` ring styles to CSS-class buttons and the Toggle component.
**Model:** sonnet — CSS styling requires judgment on ring color/offset

**Files:**

- `app/globals.css` — add `:focus-visible` styles to button classes (around lines 304-354)
- `components/ui/Toggle.tsx` — add `peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2` to the track element

**Steps:**

1. Read both files in parallel
2. In `globals.css`, add `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2` to button component classes
3. In `Toggle.tsx`, add focus-visible ring classes to the toggle track div

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
```

```bash
git add app/globals.css components/ui/Toggle.tsx
git commit -m "$(cat <<'EOF'
fix(a11y): add focus-visible ring styles to buttons and Toggle (A11Y-002, A11Y-006)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: ARIA labels on SegmentedControl and MarketingHeader (A11Y-003, A11Y-007)

**Goal:** Add aria-label support to SegmentedControl and label the marketing nav.
**Model:** sonnet — requires adding prop and wiring it through

**Files:**

- `components/ui/SegmentedControl.tsx` — accept `aria-label` prop on the component, pass it to the Radix ToggleGroup root
- `components/layout/MarketingHeader.tsx` — add `aria-label="Main navigation"` to the `<nav>` element

**Steps:**

1. Read both files in parallel
2. In `SegmentedControl.tsx`, add `ariaLabel?: string` to props interface, pass as `aria-label` to `ToggleGroup.Root`
3. In `MarketingHeader.tsx`, add `aria-label="Main navigation"` to the `<nav>` element
4. Find all usages of `<SegmentedControl` and add appropriate `ariaLabel` props

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
```

```bash
git add components/ui/SegmentedControl.tsx components/layout/MarketingHeader.tsx
# Also add any files where SegmentedControl usages were updated
git commit -m "$(cat <<'EOF'
fix(a11y): add aria-label to SegmentedControl and MarketingHeader nav (A11Y-003, A11Y-007)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Screen-reader heading + decorative SVGs + DropZone alert (A11Y-004, A11Y-005, A11Y-008)

**Goal:** Add sr-only h1 to editor, hide decorative SVGs, add role="alert" to DropZone errors.
**Model:** haiku — mechanical attribute additions across 3 files

**Files:**

- `app/(app)/editor/page.tsx` or `app/(app)/editor/_components/EditorContent.tsx` — add `<h1 className="sr-only">Photo Editor</h1>`
- `app/(app)/upgrade/page.tsx` — add `aria-hidden="true"` to all decorative SVG elements
- `components/features/editor/DropZone.tsx` — add `role="alert"` to the error display div

**Steps:**

1. Read all 3 files in parallel
2. Add the sr-only h1 at the top of the editor page content
3. Add `aria-hidden="true"` to each decorative SVG on the upgrade page
4. Add `role="alert"` to the error message container in DropZone

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
```

```bash
git add app/\(app\)/editor/ app/\(app\)/upgrade/page.tsx components/features/editor/DropZone.tsx
git commit -m "$(cat <<'EOF'
fix(a11y): sr-only h1 on editor, hide decorative SVGs, alert role on DropZone (A11Y-004, A11Y-005, A11Y-008)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: SEO metadata improvements (SEO-004, SEO-006)

**Goal:** Expand root layout title with keywords and add canonical URL to marketing page.
**Model:** haiku — mechanical metadata additions

**Files:**

- `app/layout.tsx` — update `title` in metadata to include primary keywords (e.g., "Svolta — Before & After Photo Alignment for Fitness Coaches")
- `app/(marketing)/page.tsx` — add `alternates: { canonical: 'https://www.svolta.app' }` to the metadata export

**Steps:**

1. Read both files in parallel
2. Update the root layout title to be more keyword-rich while keeping it natural
3. Add canonical URL to marketing page metadata

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
npm run build
```

```bash
git add app/layout.tsx app/\(marketing\)/page.tsx
git commit -m "$(cat <<'EOF'
fix(seo): expand root title with keywords, add canonical URL (SEO-004, SEO-006)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Cost Estimate

| Phase                              | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ---------------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: Skip-link targets         | haiku  | ~8k               | ~1k                | $0.01      |
| Phase 2: Focus-visible styles      | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 3: ARIA labels               | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 4: SR heading + SVGs + alert | haiku  | ~15k              | ~2k                | $0.02      |
| Phase 5: SEO metadata              | haiku  | ~8k               | ~1k                | $0.01      |
| Orchestrator overhead              | sonnet | ~20k              | ~5k                | $0.14      |
| **Total**                          |        | **~75k**          | **~13k**           | **~$0.32** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.80/$4 per MTok.
Estimation: ~5 tokens per line of code. Input = files read + brief (~3k) + system prompt (~3k). Output = code written + verification output (~500/gate).

---

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

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_session2-quick-wins/yolo-brief.md`:

```markdown
## Completed

**Date:** 2026-03-08
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
- All work stays on `feature/a11y-seo-quick-wins` — NEVER commit directly to develop

---

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

All 5 phases implemented cleanly on `feature/a11y-seo-quick-wins`. Phase 1 added `id="main-content"` to app and auth layouts (marketing already had it). Phase 2 added `:focus-visible` ring to button CSS classes and `peer-focus-visible:ring-*` classes to the Toggle track. Phase 3 added `ariaLabel` prop to SegmentedControl (wired to Radix ToggleGroup root), `aria-label="Main navigation"` to MarketingHeader nav, and applied `ariaLabel="Background type"` to the one SegmentedControl usage in BackgroundSettings. Phase 4 added `<h1 className="sr-only">Photo Editor</h1>` to the editor page, `aria-hidden="true"` to all 6 decorative SVGs on the upgrade page, and `role="alert"` to the DropZone error div. Phase 5 expanded the root layout title to keyword-rich text and added `alternates.canonical` to the marketing page metadata. All verification gates (type-check, lint, build) passed cleanly at every phase.

### Commits

- `d6e9175` fix(a11y): add skip-link target id="main-content" to app and auth layouts (A11Y-001)
- `db578bb` fix(a11y): add focus-visible ring styles to buttons and Toggle (A11Y-002, A11Y-006)
- `6b9240c` fix(a11y): add aria-label to SegmentedControl and MarketingHeader nav (A11Y-003, A11Y-007)
- `3dd1065` fix(a11y): sr-only h1 on editor, hide decorative SVGs, alert role on DropZone (A11Y-004, A11Y-005, A11Y-008)
- `346116f` fix(seo): expand root title with keywords, add canonical URL (SEO-004, SEO-006)
