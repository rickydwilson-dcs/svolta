# Brief: Export Aspect Ratio Fix — Apply Format to Total Output, Not Individual Panels

**Date:** 2026-03-07
**Status:** Clarified — ready for dual-model peer review

---

## Problem Statement

The export aspect ratios (1:1, 4:5, 9:16) currently apply to each individual photo panel rather than the final merged output. This means a "9:16" export produces a 2160x1920 image (two 1080x1920 panels side-by-side), which is far wider than a phone screen. Users expect the aspect ratio to describe the final exported file — a 9:16 export should produce a single portrait image that fits a mobile phone screen (e.g., an Instagram Story slot) with both photos contained within it.

## Goals

- The selected aspect ratio (1:1, 4:5, 9:16) defines the dimensions of the **total exported image**, not each individual panel
- Each photo panel maintains high resolution (1080px wide) — total canvas width increases to 2160px to preserve quality
- The exported file fits standard mobile/social media slots (e.g., 9:16 = Instagram Stories, 4:5 = Instagram Feed)
- Both PNG and GIF exports adopt the new sizing behavior
- The in-editor AlignedPreview reflects the new dimensions in real time

## Non-Goals

- No new aspect ratio options (keep 1:1, 4:5, 9:16)
- No layout changes (photos remain side-by-side, not stacked vertically)
- No changes to the alignment algorithm itself (body scaling, shoulder centering, head visibility)
- No changes to watermark, label, or logo placement logic beyond adapting to new canvas dimensions

## User Interactions / Happy Path

1. User uploads before/after photos and pose detection runs
2. User opens the Export Modal and selects an aspect ratio (e.g., 9:16)
3. The AlignedPreview immediately shows a tall portrait layout with both photos side-by-side within a 9:16 frame
4. User clicks Export (PNG or GIF)
5. The exported file is a 2160x3840 image (for 9:16 at 1080px per panel) — a true 9:16 rectangle with both photos inside
6. The file fits perfectly when posted to Instagram Stories or viewed on a phone in portrait orientation

## Acceptance Criteria

- Given format 9:16 at 1080px resolution, when exported, then the final image is 2160x3840 (total aspect ratio is 9:16)
- Given format 4:5 at 1080px resolution, when exported, then the final image is 2160x2700 (total aspect ratio is 4:5)
- Given format 1:1 at 1080px resolution, when exported, then the final image is 2160x2160 (total aspect ratio is 1:1)
- Given any format, each photo panel occupies exactly half the width (1080px each)
- Given GIF export at 540px resolution, the same aspect ratio logic applies (e.g., 9:16 = 1080x1920 total)
- Given the AlignedPreview component, the preview matches the final export dimensions/aspect ratio
- Existing alignment logic (body scaling, shoulder centering, head visibility) continues to work correctly within the new panel dimensions

## Constraints

- The `calculateDimensions()` function in `lib/canvas/export.ts` is the central place where width/height are computed — this is the primary change point
- The alignment algorithm in `lib/canvas/aligned-draw-params.ts` receives `targetWidth` and `targetHeight` per panel — these inputs change but the algorithm itself should not
- GIF export (`lib/canvas/export-gif.ts`) uses half resolution (540px) — the same ratio fix must apply there
- `AlignedPreview.tsx` and `GifPreview.tsx` must be updated to reflect the new sizing
- The dynamic height cropping logic (lines 278-290 of `export.ts`) that avoids white space must be reviewed — it currently recalculates `finalHalfWidth` from `visibleHeight * aspectRatio`, which may need adjustment since the aspect ratio now applies to the whole canvas

## Open Questions

- The dynamic height cropping logic currently trims height to avoid white space at the bottom, then recalculates width to maintain aspect ratio. With the new sizing, should this cropping still apply (potentially making the export slightly shorter than the target ratio), or should it fill/pad to maintain the exact target ratio?
- Should the ExportModal UI labels be updated to clarify that the ratio describes the total output (e.g., "9:16 Story" vs just "9:16")?
