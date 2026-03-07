# Codex Peer Review Prompt

Paste this entire file into Codex in VS Code.

---

## Your task

You are doing an independent architectural peer review. Read the brief below, then produce your own implementation plan.

Save your plan as `codex-plan.md` in this folder:
`output/sessions/2026-03-07_export-aspect-ratio-fix/`

When done, output this exact command so the user can copy-paste it into Claude Code:

```
/plan.with.codex synthesise
```

---

## Brief: Export Aspect Ratio Fix — Apply Format to Total Output, Not Individual Panels

**Date:** 2026-03-07
**Project:** Svolta — fitness photo alignment SaaS (Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe)
**Note:** This brief is sent to both Claude and Codex independently. Your plans will be synthesised into a final implementation spec. Do not look at `claude-plan.md` before writing your own plan.

### Problem Statement

The export aspect ratios (1:1, 4:5, 9:16) currently apply to each individual photo panel rather than the final merged output. This means a "9:16" export produces a 2160x1920 image (two 1080x1920 panels side-by-side), which is far wider than a phone screen. Users expect the aspect ratio to describe the final exported file — a 9:16 export should produce a single portrait image that fits a mobile phone screen (e.g., an Instagram Story slot) with both photos contained within it.

### Goals

- The selected aspect ratio (1:1, 4:5, 9:16) defines the dimensions of the **total exported image**, not each individual panel
- Each photo panel maintains high resolution (1080px wide) — total canvas width increases to 2160px to preserve quality
- The exported file fits standard mobile/social media slots (e.g., 9:16 = Instagram Stories, 4:5 = Instagram Feed)
- Both PNG and GIF exports adopt the new sizing behavior
- The in-editor AlignedPreview reflects the new dimensions in real time

### Non-Goals

- No new aspect ratio options (keep 1:1, 4:5, 9:16)
- No layout changes (photos remain side-by-side, not stacked vertically)
- No changes to the alignment algorithm itself (body scaling, shoulder centering, head visibility)
- No changes to watermark, label, or logo placement logic beyond adapting to new canvas dimensions

### Acceptance Criteria

- Given format 9:16 at 1080px resolution, when exported, then the final image is 2160x3840 (total aspect ratio is 9:16)
- Given format 4:5 at 1080px resolution, when exported, then the final image is 2160x2700 (total aspect ratio is 4:5)
- Given format 1:1 at 1080px resolution, when exported, then the final image is 2160x2160 (total aspect ratio is 1:1)
- Given any format, each photo panel occupies exactly half the width (1080px each)
- Given GIF export at 540px resolution, the same aspect ratio logic applies (e.g., 9:16 = 1080x1920 total)
- Given the AlignedPreview component, the preview matches the final export dimensions/aspect ratio
- Existing alignment logic (body scaling, shoulder centering, head visibility) continues to work correctly within the new panel dimensions

### Constraints

- The `calculateDimensions()` function in `lib/canvas/export.ts` is the central place where width/height are computed — this is the primary change point
- The alignment algorithm in `lib/canvas/aligned-draw-params.ts` receives `targetWidth` and `targetHeight` per panel — these inputs change but the algorithm itself should not
- GIF export (`lib/canvas/export-gif.ts`) uses half resolution (540px) — the same ratio fix must apply there
- `AlignedPreview.tsx` and `GifPreview.tsx` must be updated to reflect the new sizing
- The dynamic height cropping logic (lines 278-290 of `export.ts`) that avoids white space must be reviewed — it currently recalculates `finalHalfWidth` from `visibleHeight * aspectRatio`, which may need adjustment since the aspect ratio now applies to the whole canvas

### Relevant Architecture

**How dimensions are calculated today:**

1. **`calculateDimensions(format, resolution)`** in `lib/canvas/export.ts` (lines 72-98):
   - `width = resolution * 2` (e.g., 2160 for two 1080px panels)
   - `height` is calculated from the **per-panel** aspect ratio (e.g., 9:16 → `resolution * 16/9 = 1920`)
   - Returns `{ width, height, halfWidth: resolution }`
   - Result: 9:16 at 1080px → 2160x1920 (each panel is 1080x1920, total is NOT 9:16)

2. **`getAspectRatio(format)`** (lines 103-114): Returns width/height ratio (e.g., 9:16 → 0.5625). Used in dynamic height cropping to maintain per-panel ratio.

3. **Dynamic height cropping** in `exportCanvas()` (lines 278-290):
   - After alignment, calculates `visibleHeight = min(beforeBottom, afterBottom, targetHeight)`
   - Recalculates `finalHalfWidth = visibleHeight * aspectRatio` (per-panel ratio)
   - This maintains the per-panel aspect ratio even after cropping

4. **GIF export** (`lib/canvas/export-gif.ts`, lines 196-200):
   - Uses `resolution = 540` with `width = resolution`, `height = width / aspectRatio`
   - **CRITICAL**: GIF exports are NOT side-by-side — they show a single image at a time (slider wipe, crossfade, or toggle between before/after). The aspect ratio applies to the single animation canvas.

5. **AlignedPreview** (`components/features/editor/AlignedPreview.tsx`, lines 68-86):
   - Calculates `sideBySideAspect = singlePanelAspect * 2` to fit the side-by-side canvas into the container
   - Passes `halfWidth` and `targetHeight` to the alignment algorithm

6. **GifPreview** (`components/features/editor/GifPreview.tsx`, lines 78-88):
   - Uses single-canvas aspect ratio (not side-by-side)
   - Passes `targetWidth` and `targetHeight` to the alignment algorithm

7. **Alignment algorithm** (`lib/canvas/aligned-draw-params.ts`):
   - `calculateAlignedDrawParams(beforeImg, afterImg, beforeLandmarks, afterLandmarks, targetWidth, targetHeight)`
   - Receives per-panel `targetWidth` and `targetHeight`
   - Returns `{ before: DrawParams, after: DrawParams }` with draw positions/sizes
   - Does NOT need to change — only its inputs change

### Codebase Snapshot

| File                                            | Lines | Purpose                                                                                            |
| ----------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------- |
| `lib/canvas/export.ts`                          | 420   | PNG export: `calculateDimensions()`, `getAspectRatio()`, `exportCanvas()`, dynamic height cropping |
| `lib/canvas/export-gif.ts`                      | 362   | GIF export: `exportGif()`, dimension calculation at lines 196-200                                  |
| `lib/canvas/aligned-draw-params.ts`             | 409   | Shared alignment algorithm (4 phases). No changes needed.                                          |
| `lib/canvas/gif-animations.ts`                  | 380   | Frame generators: `generateSliderFrame()`, `generateCrossfadeFrame()`, `generateToggleFrame()`     |
| `components/features/editor/AlignedPreview.tsx` | 244   | PNG preview with side-by-side layout                                                               |
| `components/features/editor/GifPreview.tsx`     | 290   | GIF animation preview (single canvas, not side-by-side)                                            |
| `components/features/editor/ExportModal.tsx`    | ~1200 | Export UI: format selector, preview, export triggers                                               |
| `hooks/useCanvasExport.ts`                      | 106   | PNG export hook                                                                                    |
| `hooks/useGifExport.ts`                         | 208   | GIF export hook with progress                                                                      |

### What a Good Plan Should Cover

1. **How should `calculateDimensions()` change?** The height formula needs to apply the aspect ratio to the total canvas (width=2\*resolution), not per-panel.

2. **How should `getAspectRatio()` and the dynamic height cropping logic change?** Currently `finalHalfWidth = visibleHeight * aspectRatio` maintains per-panel ratio. With the new model, the ratio applies to the total canvas.

3. **What happens to GIF exports?** GIFs show a single image at a time (not side-by-side). The acceptance criteria say "9:16 = 1080x1920 total" — but for GIFs, the "total" IS the single canvas. How does the ratio change apply here? Does it even need to change?

4. **How should the AlignedPreview update?** It currently uses `sideBySideAspect = singlePanelAspect * 2`. This needs to change so the overall canvas matches the target ratio.

5. **How should the GifPreview update?** It currently uses the aspect ratio for a single canvas. Does this change?

6. **Should the dynamic height cropping be removed or adjusted?** With the new sizing, the target dimensions are already the final dimensions. Cropping to avoid white space could break the exact target ratio. Should we pad instead of crop, or keep cropping and accept slight ratio deviation?

7. **Are there any downstream effects?** Watermark/label placement uses `finalWidth`/`finalHeight`/`halfWidth` — these values change. Any regressions?

---

## Deliverable

Produce a numbered implementation plan with:

- Clear phases/steps
- Which files are created or modified at each step
- Verification gates between steps (how to confirm each step succeeded before moving on)
- Any risks or trade-offs worth calling out

Save your response as `codex-plan.md` in `output/sessions/2026-03-07_export-aspect-ratio-fix/`.

Then output this command for the user to copy-paste into Claude Code:
`/plan.with.codex synthesise`
