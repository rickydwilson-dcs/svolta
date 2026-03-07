# Codex Implementation Plan: Export Aspect Ratio Fix (Total Canvas Ratio)

## 1. Align ratio model and lock expected dimensions

1. Add a shared mental model in code comments and plan assumptions:
   - PNG side-by-side export: `totalWidth = 2 * panelWidth`, selected format ratio applies to **total canvas**.
   - GIF export/preview: single-canvas output, ratio already applies to total canvas.
2. Define canonical targets used in implementation and tests:
   - PNG @1080: `1:1 => 2160x2160`, `4:5 => 2160x2700`, `9:16 => 2160x3840`.
   - GIF @540: `1:1 => 540x540`, `4:5 => 540x675`, `9:16 => 540x960`.

Files touched:

- None (analysis gate only)

Verification gate:

- Team agrees that GIF acceptance should be interpreted as single-canvas equivalent (`540x960` for 9:16 at 540), while PNG uses side-by-side total dimensions.

## 2. Refactor PNG dimension calculation to total-canvas ratio

1. Update `calculateDimensions()` in `lib/canvas/export.ts`:
   - Keep `halfWidth = resolution` and `width = halfWidth * 2`.
   - Compute `height` from **total** aspect ratio: `height = round(width / totalAspectRatio)`.
2. Rename/re-scope ratio helper for clarity (e.g., `getFormatAspectRatio`), explicitly meaning **total width/height**.
3. Ensure all callers in `export.ts` use the updated semantics.

Files modified:

- `lib/canvas/export.ts`

Verification gate:

- Unit-level sanity via logs or temporary assertions: for `resolution=1080`, dimensions resolve exactly to acceptance values above.

## 3. Remove ratio-breaking dynamic width trim and keep fixed output size

1. Rework dynamic cropping in `exportCanvas()` (`lib/canvas/export.ts`):
   - Keep `finalWidth`, `finalHeight`, `finalHalfWidth` fixed to `calculateDimensions()` result.
   - Keep `visibleHeight = min(beforeBottom, afterBottom, targetHeight)` only as optional vertical clip limit.
   - Remove `finalHalfWidth = visibleHeight * aspectRatio` and `widthTrimPerSide` logic that mutates width from target ratio.
2. Implement ratio-safe whitespace handling:
   - Draw into fixed half-panels (`resolution` each).
   - Clip drawing rect to `visibleHeight` if needed to suppress bottom whitespace, but do not alter exported canvas dimensions.
   - Fill remaining area with configured background (white/transparent behavior remains unchanged by existing settings path).
3. Keep label/watermark placement logic unchanged, but now driven by stable final dimensions.

Files modified:

- `lib/canvas/export.ts`

Verification gate:

- Manual export checks (PNG): output metadata and actual image size match exact target dimensions for all 3 formats.
- No horizontal squeeze/trim artifacts relative to current alignment behavior.

## 4. Update AlignedPreview to mirror new fixed-ratio export behavior

1. In `components/features/editor/AlignedPreview.tsx`:
   - Treat selected format as total-canvas aspect ratio directly.
   - Compute container fit using total ratio (remove `singlePanelAspect * 2` model).
   - Derive `halfWidth = targetWidth / 2` and run alignment with `(halfWidth, targetHeight)`.
2. Remove preview-side dynamic width recalculation (`finalHalfWidth = visibleHeight * aspectRatio`) and width trimming.
3. Keep optional vertical clipping behavior consistent with PNG export so preview is WYSIWYG.

Files modified:

- `components/features/editor/AlignedPreview.tsx`

Verification gate:

- Visual check in editor: preview bounding box shape matches export format (not extra-wide for 9:16).
- Spot-check label positions and left/right split at exactly 50/50 width.

## 5. Keep GIF export/preview ratio semantics consistent, with minimal change

1. Confirm `lib/canvas/export-gif.ts` already applies format ratio to total (single) canvas:
   - `width=540`, `height=round(width/aspectRatio)` is correct for GIF use case.
2. Only make changes if needed for naming clarity and consistency with shared ratio helper semantics.
3. Confirm `components/features/editor/GifPreview.tsx` remains correct (single-canvas fit by selected ratio).

Files modified (only if needed):

- `lib/canvas/export-gif.ts`
- `components/features/editor/GifPreview.tsx`

Verification gate:

- Export GIF in each format and verify dimensions: `540x540`, `540x675`, `540x960`.
- Preview shape matches exported GIF dimensions.

## 6. Update mirrored test adapter and regression suite

1. Update `tests/visual/lib/export-adapter.ts` to mirror `export.ts` changes:
   - Total-canvas ratio dimension calc.
   - Remove width recomputation from `visibleHeight`.
2. Update/add assertions in visual tests (`tests/visual/alignment.visual.test.ts` or dedicated test file) to enforce exact output dimensions per format.
3. Regenerate baselines if pixel output intentionally changes due to removed width trim.

Files modified:

- `tests/visual/lib/export-adapter.ts`
- `tests/visual/alignment.visual.test.ts` (and/or new dimension-focused test)
- `tests/visual/baselines/*` (if regenerated)

Verification gate:

- `npm run test:visual` passes.
- Any baseline diff is reviewed and attributable to intended canvas dimension behavior changes.

## 7. Integration validation and regression sweep

1. Run focused checks for:
   - PNG export dimensions and visual framing for all formats/resolutions.
   - GIF export dimensions and animation styles (`slider`, `crossfade`, `toggle`).
   - Export modal preview parity with exported files.
2. Validate no regressions in watermark/logo/labels placement across portrait and square formats.
3. Optional: add lightweight runtime telemetry/log line for one release cycle to confirm real-world export dimensions.

Files modified:

- Potentially none (validation phase)

Verification gate:

- Acceptance criteria all pass.
- No regression found in alignment algorithm behavior (head/body/shoulder constraints remain intact since algorithm inputs remain per-panel).

## Risks and trade-offs

1. **Dynamic crop behavior change**: preserving exact ratio may reintroduce visible blank area in edge cases; trade-off is strict format correctness vs maximal auto-crop.
2. **Baseline churn**: visual regression baselines likely change after removing width trim; requires deliberate review to avoid masking unintended diffs.
3. **Semantic drift between PNG and GIF**: PNG is side-by-side total canvas, GIF is single canvas; naming/documentation must be explicit to avoid future confusion.
4. **Preview/export mismatch risk**: if clipping rules diverge between `AlignedPreview.tsx` and `export.ts`, users will see non-WYSIWYG framing; keep logic intentionally parallel.
