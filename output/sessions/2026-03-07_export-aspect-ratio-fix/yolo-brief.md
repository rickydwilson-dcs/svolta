# YOLO Implementation Brief: Export Aspect Ratio Fix

**Branch:** feature/export-aspect-ratio-fix (created from develop)
**Session spec:** output/sessions/2026-03-07_export-aspect-ratio-fix/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

Export aspect ratios (1:1, 4:5, 9:16) currently apply to each individual photo panel rather than the total merged output. A "9:16" export produces a 2160x1920 image instead of 2160x3840. This fix changes the height formula in `calculateDimensions()` to derive from total canvas width, updates the dynamic cropping to preserve exact target dimensions, and updates the AlignedPreview to match.

The synthesis was reviewed and approved. Implement it exactly as specified below.

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15/$75                | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3/$15                 | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.80/$4               | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (-> haiku) or requires deep cross-file reasoning (-> opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/export-aspect-ratio-fix   # create feature branch from develop — NEVER write directly to develop
npm run type-check                                  # must be clean before starting
```

---

## Phase 1: Update `calculateDimensions()` — The Core Fix

**Goal:** Change height formula to derive from total canvas width instead of per-panel resolution
**Model:** sonnet — single file edit with clear spec

**File:** `lib/canvas/export.ts`

Read the file first. Then edit `calculateDimensions()` (around lines 72-98):

Change the height calculation in the switch statement:

- `'1:1'`: `height = width;` (was `height = resolution;`)
- `'4:5'`: `height = Math.round(width * (5 / 4));` (was `height = Math.round(resolution * 1.25);`)
- `'9:16'`: `height = Math.round(width * (16 / 9));` (was `height = Math.round((resolution * 16) / 9);`)
- `default`: `height = width;` (was `height = resolution;`)

Everything else in the function stays the same: `width = resolution * 2`, `halfWidth = resolution`.

```bash
# Verification gate — STOP if this fails
npm run type-check
```

Commit:

```bash
git add lib/canvas/export.ts
git commit -m "$(cat <<'EOF'
fix(export): apply aspect ratio to total canvas, not per-panel

Change calculateDimensions() to derive height from total canvas width
(resolution * 2) instead of per-panel resolution. This makes 9:16 at
1080px produce 2160x3840 (true 9:16) instead of 2160x1920.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Rework Dynamic Cropping to Preserve Exact Ratio

**Goal:** Keep canvas at exact target dimensions; remove width trim logic; clip photos vertically
**Model:** sonnet — single file, moderate logic rewrite

**File:** `lib/canvas/export.ts`

Read the file again (it was modified in Phase 1). Then edit the `exportCanvas()` function:

**2a: Replace the dynamic dimension calculation (around lines 278-300):**

Remove:

```typescript
const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
const visibleHeight = Math.round(
  Math.min(beforeBottom, afterBottom, targetHeight),
);
const aspectRatio = getAspectRatio(options.format);
const finalHalfWidth = Math.round(visibleHeight * aspectRatio);
const finalWidth = finalHalfWidth * 2;
const finalHeight = visibleHeight;
```

Replace with:

```typescript
// Canvas dimensions are fixed to the exact target ratio
const finalWidth = targetHalfWidth * 2;
const finalHalfWidth = targetHalfWidth;
const finalHeight = targetHeight;

// Calculate visible photo area (clip to shortest image bottom to avoid photo-area white space)
const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
const photoClipHeight = Math.round(
  Math.min(beforeBottom, afterBottom, targetHeight),
);
```

**2b: Remove width trim logic (around lines 320-340):**

Remove:

```typescript
const widthTrimPerSide = (targetHalfWidth - finalHalfWidth) / 2;
const beforeAdjustedParams = {
  ...alignParams.before,
  drawX: alignParams.before.drawX - widthTrimPerSide,
};
const afterAdjustedParams = {
  ...alignParams.after,
  drawX: alignParams.after.drawX - widthTrimPerSide,
};
```

And remove the `console.log('[Export] Width trim:', ...)` block that references these variables.

**2c: Update drawing calls to use `alignParams` directly and clip to `photoClipHeight`:**

Replace the drawing section with:

```typescript
// Draw before photo on left half, clipped to photo area
ctx.save();
ctx.beginPath();
ctx.rect(0, 0, finalHalfWidth, photoClipHeight);
ctx.clip();
drawPhotoWithParams(ctx, beforeImg, 0, 0, alignParams.before);
ctx.restore();

// Draw after photo on right half, clipped to photo area
ctx.save();
ctx.beginPath();
ctx.rect(finalHalfWidth, 0, finalHalfWidth, photoClipHeight);
ctx.clip();
drawPhotoWithParams(ctx, afterImg, finalHalfWidth, 0, alignParams.after);
ctx.restore();
```

**2d: Update the console.log for dynamic dimensions** to reference the new variable names (`photoClipHeight` instead of `visibleHeight`, remove `aspectRatio` from the log).

```bash
# Verification gate — STOP if this fails
npm run type-check
```

Commit:

```bash
git add lib/canvas/export.ts
git commit -m "$(cat <<'EOF'
fix(export): preserve exact target ratio, remove width trim

Keep canvas at exact target dimensions instead of recalculating width
from cropped height. Clip photos vertically to photoClipHeight to
avoid white space while maintaining the exact aspect ratio. Remove
widthTrimPerSide logic which is no longer needed.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Update AlignedPreview

**Goal:** Make preview match new export dimensions; remove per-panel aspect ratio multiplication
**Model:** sonnet — single file, mirrors Phase 2 logic

**File:** `components/features/editor/AlignedPreview.tsx`

Read the file first. Then make these changes:

**3a: Fix container fitting (around lines 68-86):**

Replace:

```typescript
const singlePanelAspect = aspectRatio;
const sideBySideAspect = singlePanelAspect * 2;

if (containerWidth / containerHeight > sideBySideAspect) {
  targetHeight = containerHeight;
  targetWidth = targetHeight * sideBySideAspect;
} else {
  targetWidth = containerWidth;
  targetHeight = targetWidth / sideBySideAspect;
}
```

With:

```typescript
const canvasAspectRatio = aspectRatio; // Format ratio applies to total canvas

if (containerWidth / containerHeight > canvasAspectRatio) {
  targetHeight = containerHeight;
  targetWidth = targetHeight * canvasAspectRatio;
} else {
  targetWidth = containerWidth;
  targetHeight = targetWidth / canvasAspectRatio;
}
```

**3b: Fix dynamic cropping in the render callback (around lines 141-173):**

Replace:

```typescript
const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
const visibleHeight = Math.min(beforeBottom, afterBottom, targetHeight);
const finalHalfWidth = visibleHeight * aspectRatio;
const finalWidth = finalHalfWidth * 2;
const finalHeight = visibleHeight;

// Resize canvas to final dimensions
canvas.width = finalWidth;
canvas.height = finalHeight;
```

With:

```typescript
// Keep canvas at target dimensions (exact ratio)
const finalWidth = targetWidth;
const finalHeight = targetHeight;
const finalHalfWidth = halfWidth;

// Calculate photo clip height (avoid white space at bottom of photo area)
const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
const photoClipHeight = Math.min(beforeBottom, afterBottom, targetHeight);
```

Do NOT resize the canvas here — it was already set to `targetWidth`/`targetHeight` earlier.

**3c: Remove width trim logic** — replace any `widthTrimPerSide` adjustment with direct use of `alignParams`:

Replace:

```typescript
const widthTrimPerSide = (halfWidth - finalHalfWidth) / 2;
const beforeAdjustedParams = {
  ...alignParams.before,
  drawX: alignParams.before.drawX - widthTrimPerSide,
};
const afterAdjustedParams = {
  ...alignParams.after,
  drawX: alignParams.after.drawX - widthTrimPerSide,
};
```

With direct use of `alignParams.before` and `alignParams.after` in the draw calls.

**3d: Update clipping rects** to use `photoClipHeight` instead of `finalHeight`:

```typescript
ctx.rect(0, 0, finalHalfWidth, photoClipHeight);
// ... and ...
ctx.rect(finalHalfWidth, 0, finalHalfWidth, photoClipHeight);
```

**3e: Re-clear canvas** with background after the dimension change — since we're no longer resizing the canvas, the existing clear at the top of the render callback is sufficient. Remove the second `ctx.fillRect` / `ctx.clearRect` block that was after the canvas resize.

```bash
# Verification gate — STOP if this fails
npm run type-check
```

Commit:

```bash
git add components/features/editor/AlignedPreview.tsx
git commit -m "$(cat <<'EOF'
fix(preview): match AlignedPreview to new total-canvas aspect ratio

Remove sideBySideAspect multiplication — format ratio now applies to
total canvas directly. Mirror export.ts cropping: fixed canvas
dimensions with vertical photo clipping.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Confirm GIF Export — No Changes Needed

**Goal:** Verify GIF exports already apply ratio to total (single) canvas correctly
**Model:** haiku — read-only verification

Read these files and confirm no changes are needed:

- `lib/canvas/export-gif.ts` — verify `width = resolution` (540) and `height = Math.round(width / aspectRatio)` produces correct dimensions
- `components/features/editor/GifPreview.tsx` — verify it uses format ratio for single canvas fitting

Expected GIF dimensions (no change from current):

- 1:1 -> 540x540
- 4:5 -> 540x675
- 9:16 -> 540x960

No commit for this phase — verification only.

---

## Phase 5: Update Test Adapter and Tests

**Goal:** Update test adapter to mirror export.ts changes; add dimension assertion tests
**Model:** sonnet — multiple test files

**5a: Update test adapter**

**File:** `tests/visual/lib/export-adapter.ts`

Read the file. Find any dimension calculation logic that mirrors the old `calculateDimensions()` behaviour (per-panel ratio). Update it to use total-canvas ratio (same formula as Phase 1). Remove any width trim logic.

**5b: Update visual test assertions**

**File:** `tests/visual/alignment.visual.test.ts` and `tests/visual/alignment.unit.test.ts`

Read both files. Update any hardcoded expected dimensions:

- 9:16 at 1080: was 2160x1920, now 2160x3840
- 4:5 at 1080: was 2160x1350, now 2160x2700
- 1:1 at 1080: was 2160x1080, now 2160x2160

**5c: Add acceptance criteria tests**

If no existing test covers `calculateDimensions()` directly, add a test block:

```typescript
describe("calculateDimensions", () => {
  it("applies aspect ratio to total canvas, not per-panel", () => {
    expect(calculateDimensions("1:1", 1080)).toEqual({
      width: 2160,
      height: 2160,
      halfWidth: 1080,
    });
    expect(calculateDimensions("4:5", 1080)).toEqual({
      width: 2160,
      height: 2700,
      halfWidth: 1080,
    });
    expect(calculateDimensions("9:16", 1080)).toEqual({
      width: 2160,
      height: 3840,
      halfWidth: 1080,
    });
  });
});
```

Note: `calculateDimensions` is not currently exported. If it needs to be exported for testing, add `export` to the function signature in `lib/canvas/export.ts`. Otherwise, test indirectly through the export functions.

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run test 2>&1 || true   # Run tests, note failures but don't block if visual tests need baselines
```

Commit:

```bash
git add tests/ lib/canvas/export.ts
git commit -m "$(cat <<'EOF'
test(export): update test adapter and add dimension assertion tests

Update export-adapter.ts to mirror total-canvas ratio formula.
Update expected dimensions in visual tests. Add acceptance criteria
tests for calculateDimensions().

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Final Verification

**Goal:** Run full build pipeline to confirm no regressions
**Model:** haiku — mechanical verification

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
npm run build
```

No commit for this phase — verification only.

---

## Cost Estimate

| Phase                             | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| --------------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: calculateDimensions fix  | sonnet | ~8k               | ~1k                | $0.04      |
| Phase 2: Dynamic cropping rewrite | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 3: AlignedPreview update    | sonnet | ~8k               | ~2k                | $0.06      |
| Phase 4: GIF verification         | haiku  | ~6k               | ~0.5k              | $0.01      |
| Phase 5: Test adapter + tests     | sonnet | ~12k              | ~3k                | $0.08      |
| Phase 6: Final verification       | haiku  | ~4k               | ~0.5k              | $0.01      |
| **Total**                         |        | **~48k**          | **~9k**            | **~$0.26** |

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
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-07_export-aspect-ratio-fix/yolo-brief.md`:

```markdown
## Completed

**Date:** [today]
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
- All work stays on `feature/export-aspect-ratio-fix` — NEVER commit directly to develop

## Completed

**Date:** 2026-03-07
**Status:** All phases executed successfully

All 5 implementation phases completed. Phase 1 fixed `calculateDimensions()` in `lib/canvas/export.ts` to derive height from total canvas width (`resolution * 2`) instead of per-panel resolution, producing correct ratios (e.g. 9:16 at 1080px → 2160x3840). Phase 2 removed width trim logic from `exportCanvas()` and replaced dynamic aspect-ratio cropping with fixed canvas dimensions + vertical `photoClipHeight` clipping. Phase 3 mirrored the same changes in `AlignedPreview.tsx` (removed `sideBySideAspect * 2` multiplication, removed canvas resize and second clear, removed width trim). Phase 4 confirmed GIF export needed no changes (single-canvas ratio was already correct). Phase 5 updated the test adapter to match, exported `calculateDimensions` for direct testing, and added acceptance criteria tests. An additional cleanup commit removed `getAspectRatio` (now unused in both `export.ts` and `export-adapter.ts`) and unused `finalWidth`/`finalHeight` vars in `AlignedPreview`. Visual regression tests fail as expected (baselines need regeneration); all 121 unit tests pass.

### Commits

- `65fb096` fix(export): apply aspect ratio to total canvas, not per-panel
- `82eccc2` fix(export): preserve exact target ratio, remove width trim
- `fad8431` fix(preview): match AlignedPreview to new total-canvas aspect ratio
- `3e4c7f7` test(export): update test adapter and add dimension assertion tests
- `84d9c93` fix(export): remove unused getAspectRatio and finalWidth/finalHeight vars
