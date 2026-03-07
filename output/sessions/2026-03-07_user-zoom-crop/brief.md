# Brief: User Zoom & Crop Override for Before/After Panels

**Date:** 2026-03-07
**Status:** Clarified — ready for dual-model peer review

---

## Problem Statement

When Svolta creates before/after comparisons, the alignment system automatically determines how much headroom to leave and how tightly to crop each photo based on pose landmarks. Users have no control over this framing — they can't zoom in to show more detail on a specific body area or zoom out to show more context. This forces a one-size-fits-all crop that doesn't match every coach's intent (e.g., wanting a tight torso crop vs. a full-body view with breathing room).

## Goals

- Users can pinch-to-zoom (mobile) or scroll-wheel zoom (desktop) on either the before or after panel to control crop level
- The opposite panel automatically mirrors the zoom level so both photos stay consistently framed
- A slider fallback provides precise zoom control on all devices
- Zoom override works across all surfaces: PhotoPanel editor view, AlignedPreview, and final exports (PNG/GIF)
- Panning (drag to reframe) is supported alongside zoom so users can fine-tune both vertical and horizontal positioning
- A reset button restores the auto-calculated framing

## Non-Goals

- Independent zoom levels per panel (both panels always share the same zoom)
- Changing the underlying landmark detection or body-scale matching algorithm
- Adding crop presets or templates (just freeform zoom + pan)

## User Interactions / Happy Path

1. User loads before and after photos into the editor. Auto-alignment runs as it does today — landmarks are detected, body scale is matched, headroom is calculated.
2. User sees the side-by-side PhotoPanel view with the auto-framed result.
3. User pinches outward on either panel (or scrolls up on desktop) to zoom in. Both panels zoom in together, centered on the current anchor point.
4. User drags on either panel to pan/reframe. Both panels pan together maintaining their landmark-aligned relationship.
5. The AlignedPreview in the ExportModal reflects the user's zoom and pan overrides — WYSIWYG.
6. User exports (PNG or GIF). The exported image uses the user-defined zoom and pan, not the auto-calculated defaults.
7. At any point, user taps a reset button to snap back to the auto-calculated framing.

**Edge cases:**

- If user zooms out beyond the auto-calculated level, images should not show blank/white borders — clamp to the minimum zoom where both images still fill their panels.
- If user pans too far, clamp so the image edge doesn't pull away from the panel edge.
- If landmarks aren't detected (no auto-alignment), zoom and pan still work — they just operate on the raw cover-fit images.

## Acceptance Criteria

- Given two aligned photos in the editor, when the user pinch-zooms on either panel, then both panels zoom in/out by the same factor simultaneously
- Given the editor on desktop, when the user scrolls the mouse wheel over either panel, then both panels zoom in/out smoothly
- Given any zoom level, when the user drags on either panel, then both panels pan together maintaining alignment
- Given a user-defined zoom/pan override, when the user opens the ExportModal, then the AlignedPreview matches the editor framing exactly
- Given a user-defined zoom/pan override, when the user exports a PNG or GIF, then the exported file reflects the override — not the auto defaults
- Given any zoom/pan state, when the user taps the reset button, then framing returns to the auto-calculated alignment
- Given a zoom level at minimum (fully zoomed out), when the user tries to zoom out further, then the zoom is clamped — no blank borders appear

## Constraints

- The zoom/pan state must flow through `calculateAlignedDrawParams` in [aligned-draw-params.ts](lib/canvas/aligned-draw-params.ts) — this is the single source of truth for all rendering (preview, PNG export, GIF export)
- Zoom/pan values must be stored in the Zustand editor store so they persist across the editor session and are accessible to the ExportModal
- The current auto-alignment logic (`calculateAlignment` in [alignment.ts](lib/canvas/alignment.ts)) should remain untouched — user zoom is applied as a post-processing step on top of auto-alignment output
- Touch gesture handling must not conflict with mobile browser gestures (prevent default on the canvas, not the page)
- Performance: zoom/pan updates must feel instant (< 16ms frame time) — avoid re-running landmark detection or heavy recalculation on each frame

## Open Questions

- Should the zoom slider appear inline in the editor toolbar or only in the ExportModal controls? (Likely both — but placement TBD during implementation)
- What should the maximum zoom level be? (Suggest 3x as a starting point — can be tuned)
- Should zoom/pan state persist when switching between export formats (1:1, 4:5, 9:16) or reset per format?
