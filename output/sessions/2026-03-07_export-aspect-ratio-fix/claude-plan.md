# Claude's Implementation Plan: Export Aspect Ratio Fix

**Date:** 2026-03-07
**Status:** Independent plan (pre-synthesis)

---

## Key Insight: PNG vs GIF Are Fundamentally Different

Before diving into the plan, a critical architectural distinction:

- **PNG exports** are side-by-side (two panels merged). The aspect ratio should apply to the **total** merged image.
- **GIF exports** show a **single image** at a time (slider/crossfade/toggle). There is no "sum of two" — the canvas IS the single photo. The aspect ratio already applies to the total output.

This means the GIF export logic (`export-gif.ts`) may already be correct or may need a different kind of fix than the PNG path. I'll address each independently.

---

## Phase 1: Fix `calculateDimensions()` in `export.ts`

### Step 1.1: Update height formula

**File:** `lib/canvas/export.ts` (lines 72-98)

**Current logic:**

```typescript
const width = resolution * 2;
// height based on per-panel ratio:
case '9:16': height = Math.round((resolution * 16) / 9); // = 1920
```

**New logic — apply ratio to total canvas:**

```typescript
const width = resolution * 2; // 2160 (unchanged)
const halfWidth = resolution;  // 1080 (unchanged)
// height based on TOTAL canvas ratio:
case '1:1': height = width;                              // 2160
case '4:5': height = Math.round(width * (5/4));          // 2700
case '9:16': height = Math.round(width * (16/9));        // 3840
```

The key change: height is derived from `width` (the total), not `resolution` (the half).

**Resulting dimensions at 1080px resolution:**

| Format | Old (per-panel) | New (total canvas) |
| ------ | --------------- | ------------------ |
| 1:1    | 2160x1080       | 2160x2160          |
| 4:5    | 2160x1350       | 2160x2700          |
| 9:16   | 2160x1920       | 2160x3840          |

### Step 1.2: Update `getAspectRatio()` usage

**File:** `lib/canvas/export.ts` (lines 103-114)

The `getAspectRatio()` function returns `width/height` for a single panel (e.g., 9/16 = 0.5625). It's used in the dynamic height cropping at line 288:

```typescript
const finalHalfWidth = Math.round(visibleHeight * aspectRatio);
```

This needs to change. With the new model, if we're cropping height, the total width should maintain the total ratio:

```typescript
// New: ratio applies to total canvas, not per-panel
const totalAspectRatio = getAspectRatio(options.format); // e.g., 9/16 = 0.5625
const finalWidth = Math.round(visibleHeight * totalAspectRatio);
const finalHalfWidth = Math.round(finalWidth / 2);
```

Wait — this would change both width AND height during cropping. But we want the width fixed at `resolution * 2 = 2160`. The dynamic cropping should only reduce height (to avoid white space), NOT change width.

**Decision: Simplify the dynamic cropping.** Keep width fixed at `resolution * 2`. Only crop height downward. Remove the width recalculation entirely.

```typescript
const finalWidth = resolution * 2; // Always 2160
const finalHalfWidth = resolution; // Always 1080
const finalHeight = visibleHeight; // Cropped height (may be slightly less than target)
```

This means the export might not be _exactly_ the target ratio if cropping occurs, but it will never have white space. This is the pragmatic choice — fitness photos rarely have alignment that causes significant cropping.

**Verification gate:** Unit test or manual test: export a 9:16 PNG and verify the output is 2160x3840 (or close, if cropping applied). Each panel should be 1080px wide.

---

## Phase 2: Fix Dynamic Height Cropping Logic

### Step 2.1: Simplify `exportCanvas()` cropping

**File:** `lib/canvas/export.ts` (lines 278-340)

**Current logic (lines 286-290):**

```typescript
const aspectRatio = getAspectRatio(options.format);
const finalHalfWidth = Math.round(visibleHeight * aspectRatio);
const finalWidth = finalHalfWidth * 2;
const finalHeight = visibleHeight;
```

**New logic:**

```typescript
const finalWidth = targetHalfWidth * 2; // Fixed: resolution * 2
const finalHalfWidth = targetHalfWidth; // Fixed: resolution
const finalHeight = visibleHeight; // Cropped to avoid white space
```

### Step 2.2: Remove width trim logic

**Current logic (lines 320-340):** Calculates `widthTrimPerSide` because `finalHalfWidth` could differ from `targetHalfWidth`. With the new approach, `finalHalfWidth === targetHalfWidth`, so no trim is needed.

```typescript
// Remove:
const widthTrimPerSide = (targetHalfWidth - finalHalfWidth) / 2;
const beforeAdjustedParams = {
  ...alignParams.before,
  drawX: alignParams.before.drawX - widthTrimPerSide,
};
const afterAdjustedParams = {
  ...alignParams.after,
  drawX: alignParams.after.drawX - widthTrimPerSide,
};

// Replace with direct use:
const beforeAdjustedParams = alignParams.before;
const afterAdjustedParams = alignParams.after;
```

**Verification gate:** Export a 1:1 PNG. Verify output is 2160x2160 with no horizontal cropping artifacts.

---

## Phase 3: Update AlignedPreview

### Step 3.1: Fix container fitting logic

**File:** `components/features/editor/AlignedPreview.tsx` (lines 68-86)

**Current logic:**

```typescript
const singlePanelAspect = aspectRatio; // e.g., 0.5625 for 9:16
const sideBySideAspect = singlePanelAspect * 2; // e.g., 1.125
```

This is wrong for the new model. The total canvas aspect ratio is the selected format directly.

**New logic:**

```typescript
const totalAspectRatio = getAspectRatio(format); // e.g., 0.5625 for 9:16
// This IS the total canvas ratio now — no multiplication needed
const canvasAspectRatio = totalAspectRatio;

if (containerWidth / containerHeight > canvasAspectRatio) {
  targetHeight = containerHeight;
  targetWidth = targetHeight * canvasAspectRatio;
} else {
  targetWidth = containerWidth;
  targetHeight = targetWidth / canvasAspectRatio;
}
```

Wait — `getAspectRatio` returns `width/height` (e.g., 9/16 = 0.5625). For 9:16 total canvas that's 2160x3840, the aspect ratio is 2160/3840 = 0.5625. That's the same value. So this works.

### Step 3.2: Fix alignment calculation inputs

**Current:** Passes `halfWidth` and `targetHeight` to `calculateAlignedDrawParams`.

The alignment algorithm receives per-panel dimensions. With new sizing:

- `halfWidth = targetWidth / 2` (half of the fitted total canvas width)
- `targetHeight` = fitted total canvas height

These are the correct per-panel dimensions. **No change needed here** — the halfWidth calculation at line 88 already divides by 2.

### Step 3.3: Fix dynamic cropping in preview

**Current (lines 141-173):** Same per-panel ratio cropping as export. Apply the same simplification — fix width, only crop height.

**Verification gate:** Open editor with two photos, switch between 1:1, 4:5, 9:16. Preview should show dramatically different aspect ratios (9:16 should be very tall/narrow for a side-by-side view).

---

## Phase 4: Update GIF Export

### Step 4.1: Analyze GIF behavior

**File:** `lib/canvas/export-gif.ts` (lines 196-200)

**Current:**

```typescript
const resolution = 540;
const aspectRatio = getAspectRatio(options.format);
const width = resolution;
const height = Math.round(width / aspectRatio);
```

For 9:16: `width = 540`, `height = 540 / 0.5625 = 960`. Canvas is 540x960.

**The acceptance criteria says:** "9:16 = 1080x1920 total" for GIF.

But GIF shows a single image at a time, not side-by-side. If we interpret the requirement as "the GIF canvas should be 9:16 total", then:

- 9:16 → 1080x1920 (matching a phone screen perfectly)

Currently, `width = 540` and `height = 960` which IS 9:16 ratio but at lower resolution. The acceptance criteria specifies 1080x1920, which is double the current width.

**Change needed:** Double the GIF resolution from 540 to 1080 to match the acceptance criteria? No — that would make GIFs 4x larger in file size.

**Better interpretation:** The acceptance criteria example "9:16 = 1080x1920" refers to GIF at 540px panel resolution where the total IS 1080px wide (side-by-side concept). But GIFs aren't side-by-side.

**Decision:** For GIF exports, the current behavior already produces a canvas matching the selected aspect ratio. The ratio applies to the single animation canvas. No fundamental change needed to the ratio logic. However, if we want consistency with the "total output = ratio" mental model, we should keep GIF resolution at 540 and the ratio already applies to the total (since there's only one canvas).

I believe the GIF export is already correct for the new mental model — the aspect ratio applies to the total output, and the GIF total IS the single canvas. **No change to ratio logic in GIF export.** The existing dimensions are fine:

- 1:1 → 540x540
- 4:5 → 540x675
- 9:16 → 540x960

### Step 4.2: Update GifPreview if needed

**File:** `components/features/editor/GifPreview.tsx`

The GifPreview already uses the aspect ratio for the single canvas. **No change needed.**

**Verification gate:** Export a 9:16 GIF. Verify the output dimensions match 540x960 and the aspect ratio is correct.

---

## Phase 5: Verify Downstream Consumers

### Step 5.1: Check watermark placement

**File:** `lib/canvas/watermark.ts` (referenced from export.ts)

Watermark receives `(ctx, finalWidth, finalHeight, watermarkOptions)`. Since `finalWidth` and `finalHeight` now reflect the new total canvas dimensions, watermark placement should automatically adapt. **No change needed** unless the watermark looks wrong on tall canvases.

### Step 5.2: Check label placement

**File:** `lib/canvas/export.ts` `drawLabels()` (lines 195-229)

Labels use `halfWidth` for positioning. Since `halfWidth = resolution = 1080` is unchanged, label positions remain correct. Font size is `halfWidth * 0.04 = 43px`, same as before. **No change needed.**

### Step 5.3: Check ExportModal

**File:** `components/features/editor/ExportModal.tsx`

The modal passes format to `AlignedPreview` and `GifPreview`. No dimension calculations in the modal itself. **No change needed.**

### Step 5.4: Check test fixtures

**File:** `tests/visual/lib/export-adapter.ts` (referenced in aligned-draw-params.ts)

Visual tests may use hardcoded expected dimensions. If so, they need updating.

**Verification gate:** Run `npm test` / `npx vitest` and verify all tests pass. Check visual test fixtures for hardcoded dimension expectations.

---

## Phase 6: Update Tests

### Step 6.1: Update existing dimension tests

If any tests assert output dimensions (e.g., expecting 2160x1920 for 9:16), update them to the new values (2160x3840).

### Step 6.2: Add acceptance criteria tests

Add tests verifying:

- `calculateDimensions('9:16', 1080)` returns `{ width: 2160, height: 3840, halfWidth: 1080 }`
- `calculateDimensions('4:5', 1080)` returns `{ width: 2160, height: 2700, halfWidth: 1080 }`
- `calculateDimensions('1:1', 1080)` returns `{ width: 2160, height: 2160, halfWidth: 1080 }`

**Verification gate:** All tests pass.

---

## Summary of Changes by File

| File                                            | Change                                                                                   | Risk                           |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------ |
| `lib/canvas/export.ts`                          | Fix `calculateDimensions()` height formula, simplify dynamic cropping, remove width trim | **Medium** — core export logic |
| `components/features/editor/AlignedPreview.tsx` | Fix container fitting (remove `* 2` for sideBySideAspect), simplify cropping             | **Low** — preview only         |
| `lib/canvas/export-gif.ts`                      | **No change** — GIF already applies ratio to total output                                | **None**                       |
| `components/features/editor/GifPreview.tsx`     | **No change**                                                                            | **None**                       |
| `lib/canvas/aligned-draw-params.ts`             | **No change**                                                                            | **None**                       |
| `lib/canvas/gif-animations.ts`                  | **No change**                                                                            | **None**                       |
| `components/features/editor/ExportModal.tsx`    | **No change**                                                                            | **None**                       |
| Tests                                           | Update expected dimensions, add acceptance criteria tests                                | **Low**                        |

## Risks & Trade-offs

1. **Dynamic height cropping breaks exact ratio**: By keeping width fixed and only cropping height, the export may be slightly shorter than the exact target ratio. For 9:16 this means output could be 2160x3800 instead of 2160x3840 if alignment cropping occurs. This is acceptable — no white space is more important than exact ratio.

2. **9:16 produces very tall images**: At 2160x3840, the 9:16 export is 3840px tall. This is a large image that could be slow to render in the preview on low-end devices. The preview scales to fit the container, so this should be fine in practice.

3. **GIF decision may need revisiting**: I'm asserting GIFs don't need changes because they already apply the ratio to the total output (single canvas). If the user expected GIFs to also be side-by-side in the new model, this assumption is wrong. Flagging for synthesis.

4. **Visual test fixtures**: 170 test fixtures may have hardcoded expected dimensions. This could be a significant update burden.
