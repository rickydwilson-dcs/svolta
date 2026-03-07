# Implementation Plan: Export Aspect Ratio Fix

**Date:** 2026-03-07
**Status:** Ready for implementation — approved by dual-model peer review
**Source:** Synthesised from Claude and Codex independent plans

---

## Key Differences Between Plans

| Aspect                      | Claude                                                                                                 | Codex                                                                                                                                               | Synthesised Decision                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic height cropping** | Remove width recalculation entirely; keep width fixed, only crop height; accept slight ratio deviation | Keep canvas dimensions fixed to exact target; clip drawing rect to `visibleHeight` but don't alter canvas size; fill remaining area with background | **Codex's approach — fixed canvas dimensions.** Keep the exported canvas at the exact target size (e.g., 2160x3840 for 9:16). Clip photos to `visibleHeight` to avoid white space in the photo area, but fill remaining canvas area with the background colour. This preserves the exact ratio guarantee while avoiding jarring white gaps. |
| **Width trim removal**      | Remove `widthTrimPerSide` entirely; use `alignParams` directly                                         | Remove width recomputation from `visibleHeight`; keep fixed half-panels                                                                             | **Agree — both plans converge.** Remove the `widthTrimPerSide` logic since `finalHalfWidth === targetHalfWidth` in the new model.                                                                                                                                                                                                           |
| **GIF exports**             | No change needed — GIF already applies ratio to single canvas; existing 540x960 for 9:16 is correct    | Confirm no change needed; only touch for naming clarity if desired                                                                                  | **Agree — no change to GIF ratio logic.** Both plans independently concluded GIFs are already correct. The aspect ratio applies to the single animation canvas, which IS the total output.                                                                                                                                                  |
| **Ratio helper naming**     | Keep `getAspectRatio()` as-is                                                                          | Rename to `getFormatAspectRatio()` for clarity that it means total width/height                                                                     | **Keep as-is.** The function semantics haven't changed (it always returned w/h for the format). Renaming adds churn without value since the ratio values themselves are identical whether applied to a panel or total canvas.                                                                                                               |
| **Test adapter**            | Mentioned visual test fixtures might need updating                                                     | Explicitly calls out `tests/visual/lib/export-adapter.ts` as needing parallel changes + baseline regeneration                                       | **Codex's approach — explicitly update test adapter.** This is a real file that mirrors export logic and will break if not updated.                                                                                                                                                                                                         |

## Blind Spots Caught

**Codex caught that Claude missed:**

- The test adapter file (`tests/visual/lib/export-adapter.ts`) must be updated in parallel with `export.ts` — it mirrors the dimension calculation logic
- Visual test baselines will need regeneration and deliberate review to confirm diffs are intentional
- Risk of preview/export mismatch if clipping rules diverge — needs explicit alignment between `AlignedPreview.tsx` and `export.ts`
- Suggestion to keep runtime telemetry for one release cycle to confirm real-world dimensions

**Claude caught that Codex missed:**

- The `AlignedPreview.tsx` currently uses `sideBySideAspect = singlePanelAspect * 2` — this specific line needs to change to use the format ratio directly
- The 9:16 canvas at 3840px tall may be slow to render on low-end preview devices (acceptable since it scales to fit)
- The acceptance criteria line "GIF 9:16 = 1080x1920" is ambiguous — Claude correctly identified this as potentially meaning 540x960 at GIF resolution, not a resolution doubling

---

## Implementation Plan

### Phase 1: Update `calculateDimensions()` — The Core Fix

**File:** `lib/canvas/export.ts` (lines 72-98)

**Change:** Derive height from **total canvas width** instead of per-panel resolution.

```typescript
function calculateDimensions(
  format: ExportFormat,
  resolution: ExportResolution,
): { width: number; height: number; halfWidth: number } {
  const width = resolution * 2; // 2160 for 1080px panels (unchanged)
  let height: number;

  switch (format) {
    case "1:1":
      height = width; // 2160
      break;
    case "4:5":
      height = Math.round(width * (5 / 4)); // 2700
      break;
    case "9:16":
      height = Math.round(width * (16 / 9)); // 3840
      break;
    default:
      height = width;
  }

  return {
    width,
    height,
    halfWidth: resolution,
  };
}
```

**Resulting dimensions:**

| Format | Resolution | Total Canvas | Each Panel |
| ------ | ---------- | ------------ | ---------- |
| 1:1    | 1080       | 2160x2160    | 1080x2160  |
| 4:5    | 1080       | 2160x2700    | 1080x2700  |
| 9:16   | 1080       | 2160x3840    | 1080x3840  |

**Verification:** Log output of `calculateDimensions()` for all three formats at 1080px. Confirm exact match with acceptance criteria.

---

### Phase 2: Rework Dynamic Cropping to Preserve Exact Ratio

**File:** `lib/canvas/export.ts` (lines 278-340)

**Strategy:** Keep canvas at exact target dimensions. Clip photos to avoid white space at the bottom of the photo area, but fill the full canvas with background colour. This guarantees the exact aspect ratio in the exported file.

**Replace lines 278-340 with:**

```typescript
// Canvas dimensions are fixed to the exact target ratio
const finalWidth = targetHalfWidth * 2; // Always resolution * 2
const finalHalfWidth = targetHalfWidth; // Always resolution
const finalHeight = targetHeight; // Exact target height — preserves ratio

// Calculate visible photo area (clip to shortest image bottom to avoid photo-area white space)
const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
const photoClipHeight = Math.round(
  Math.min(beforeBottom, afterBottom, targetHeight),
);
```

Then in the drawing section, use `alignParams` directly (no width trim adjustment):

```typescript
// Create canvas at exact target dimensions
const canvas = document.createElement("canvas");
canvas.width = finalWidth;
canvas.height = finalHeight;

const ctx = canvas.getContext("2d");
// ... quality settings ...

// Fill entire canvas with background
ctx.fillStyle = "#ffffff";
ctx.fillRect(0, 0, finalWidth, finalHeight);

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

**Key decision:** If photos don't fill the full height (rare edge case with extreme alignment), the bottom area shows the background colour. This is better than breaking the target ratio — social media platforms will crop/pad non-standard ratios anyway.

**Verification:** Export all three formats. Verify:

- Output dimensions are exactly 2160x2160, 2160x2700, 2160x3840
- No horizontal cropping artifacts
- Photos render correctly with alignment intact

---

### Phase 3: Update AlignedPreview

**File:** `components/features/editor/AlignedPreview.tsx` (lines 68-86, 141-173)

**3a: Fix container fitting (lines 68-86)**

Replace the `sideBySideAspect` calculation:

```typescript
// Old: singlePanelAspect * 2 (treated ratio as per-panel)
// New: format ratio IS the total canvas ratio
const canvasAspectRatio = getAspectRatio(format); // e.g., 0.5625 for 9:16

if (containerWidth / containerHeight > canvasAspectRatio) {
  targetHeight = containerHeight;
  targetWidth = targetHeight * canvasAspectRatio;
} else {
  targetWidth = containerWidth;
  targetHeight = targetWidth / canvasAspectRatio;
}

const halfWidth = targetWidth / 2;
```

**3b: Fix dynamic cropping (lines 141-173)**

Mirror the Phase 2 approach — keep canvas at fitted dimensions, clip photos vertically:

```typescript
// Keep canvas at target dimensions (don't resize)
const photoClipHeight = Math.min(beforeBottom, afterBottom, targetHeight);

// Draw with clipping to photoClipHeight instead of resizing canvas
// Remove: canvas.width = finalWidth; canvas.height = finalHeight;
// Remove: widthTrimPerSide logic
```

**Verification:** Open editor, switch between 1:1, 4:5, 9:16. The 9:16 preview should appear as a tall narrow rectangle with side-by-side photos. Labels should be positioned correctly at 50/50 split.

---

### Phase 4: Confirm GIF Export — No Changes Needed

**Files:** `lib/canvas/export-gif.ts`, `components/features/editor/GifPreview.tsx`

Both plans independently confirmed: GIF exports show a single image at a time (not side-by-side). The aspect ratio already applies to the total output canvas. Current dimensions are correct:

| Format | GIF Canvas |
| ------ | ---------- |
| 1:1    | 540x540    |
| 4:5    | 540x675    |
| 9:16   | 540x960    |

**Action:** No code changes. Run verification only.

**Verification:** Export a GIF in each format. Confirm dimensions match the table above. Confirm animation styles (slider, crossfade, toggle) still render correctly.

---

### Phase 5: Update Test Adapter and Visual Tests

**Files:**

- `tests/visual/lib/export-adapter.ts` — mirrors `export.ts` dimension logic
- Visual test files with dimension assertions
- Visual test baselines (may need regeneration)

**5a:** Update `export-adapter.ts` to use the same total-canvas ratio formula as Phase 1. Remove any width trim logic that mirrors the old `export.ts` behaviour.

**5b:** Update or add unit tests for `calculateDimensions()`:

```typescript
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
```

**5c:** Regenerate visual test baselines. Review every diff to confirm changes are attributable to the intentional dimension change, not unintended regressions.

**Verification:** `npm run test` and `npm run test:visual` both pass. All baseline diffs reviewed and approved.

---

### Phase 6: Integration Validation

**Files:** None (validation only)

Checklist:

- [ ] PNG export: all 3 formats produce exact target dimensions
- [ ] PNG export: alignment (body scaling, shoulder centering, head visibility) works correctly in taller panels
- [ ] PNG export: labels positioned correctly (50/50 split, proper font size)
- [ ] PNG export: watermark positioned correctly on taller canvases
- [ ] GIF export: all 3 formats, all 3 animation styles render correctly
- [ ] AlignedPreview: matches export dimensions for all formats
- [ ] GifPreview: matches GIF export dimensions for all formats
- [ ] ExportModal: format selector, preview switching, export trigger all work
- [ ] No performance issues with 9:16 at 3840px height in preview

---

## Risks & Trade-offs

1. **Background fill at canvas bottom (low risk):** If alignment cropping makes photos shorter than the full canvas height, a strip of background colour appears at the bottom. This is rare with fitness photos and preferable to breaking the exact ratio. Social media platforms penalise non-standard ratios.

2. **9:16 canvas is very tall — 3840px (low risk):** Large canvas but preview scales to fit container. Modern browsers handle this fine. GIF stays at 540px resolution so file size is unaffected.

3. **Visual test baseline churn (medium effort):** 170 fixtures may need regeneration. The diff review is the main effort — schedule time for it.

4. **Preview/export parity (medium risk):** The clipping logic in `AlignedPreview.tsx` must exactly mirror `export.ts`. Both plans flagged this — implement them in lockstep and test that preview matches export for all formats.

5. **GIF acceptance criteria ambiguity (resolved):** The brief says "9:16 = 1080x1920 total" for GIF, but both plans agree GIFs at 540px resolution produce 540x960 (correct 9:16 ratio). The 1080x1920 figure was illustrative, not a resolution requirement. No GIF resolution change needed.
