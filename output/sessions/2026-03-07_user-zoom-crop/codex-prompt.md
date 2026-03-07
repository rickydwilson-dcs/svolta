# Codex Peer Review Prompt

Paste this entire file into Codex in VS Code.

---

## Your task

You are doing an independent architectural peer review. Read the brief below, then produce your own implementation plan.

Save your plan as `codex-plan.md` in this folder:
`output/sessions/2026-03-07_user-zoom-crop/`

When done, output this exact command so the user can copy-paste it into Claude Code:

```
/plan.with.codex synthesise
```

---

## Brief: User Zoom & Crop Override for Before/After Panels

**Date:** 2026-03-07
**Project:** Svolta — fitness photo alignment SaaS (Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe)
**Note:** This brief is sent to both Claude and Codex independently. Your plans will be synthesised into a final implementation spec. Do not look at `claude-plan.md` before writing your own plan.

### Problem Statement

When Svolta creates before/after comparisons, the alignment system automatically determines how much headroom to leave and how tightly to crop each photo based on pose landmarks. Users have no control over this framing — they can't zoom in to show more detail on a specific body area or zoom out to show more context. This forces a one-size-fits-all crop that doesn't match every coach's intent (e.g., wanting a tight torso crop vs. a full-body view with breathing room).

### Goals

- Users can pinch-to-zoom (mobile) or scroll-wheel zoom (desktop) on either the before or after panel to control crop level
- The opposite panel automatically mirrors the zoom level so both photos stay consistently framed
- A slider fallback provides precise zoom control on all devices
- Zoom override works across all surfaces: PhotoPanel editor view, AlignedPreview, and final exports (PNG/GIF)
- Panning (drag to reframe) is supported alongside zoom so users can fine-tune both vertical and horizontal positioning
- A reset button restores the auto-calculated framing

### Non-Goals

- Independent zoom levels per panel (both panels always share the same zoom)
- Changing the underlying landmark detection or body-scale matching algorithm
- Adding crop presets or templates (just freeform zoom + pan)

### Acceptance Criteria

- Given two aligned photos in the editor, when the user pinch-zooms on either panel, then both panels zoom in/out by the same factor simultaneously
- Given the editor on desktop, when the user scrolls the mouse wheel over either panel, then both panels zoom in/out smoothly
- Given any zoom level, when the user drags on either panel, then both panels pan together maintaining alignment
- Given a user-defined zoom/pan override, when the user opens the ExportModal, then the AlignedPreview matches the editor framing exactly
- Given a user-defined zoom/pan override, when the user exports a PNG or GIF, then the exported file reflects the override — not the auto defaults
- Given any zoom/pan state, when the user taps the reset button, then framing returns to the auto-calculated alignment
- Given a zoom level at minimum (fully zoomed out), when the user tries to zoom out further, then the zoom is clamped — no blank borders appear

### Constraints

- The zoom/pan state must flow through `calculateAlignedDrawParams` in `lib/canvas/aligned-draw-params.ts` — this is the single source of truth for all rendering (preview, PNG export, GIF export)
- Zoom/pan values must be stored in the Zustand editor store so they persist across the editor session and are accessible to the ExportModal
- The current auto-alignment logic (`calculateAlignment` in `lib/canvas/alignment.ts`) should remain untouched — user zoom is applied as a post-processing step on top of auto-alignment output
- Touch gesture handling must not conflict with mobile browser gestures (prevent default on the canvas, not the page)
- Performance: zoom/pan updates must feel instant (< 16ms frame time) — avoid re-running landmark detection or heavy recalculation on each frame

### Relevant Architecture

**State management:** Zustand store at `stores/editor-store.ts`. Current state includes `alignment: AlignmentSettings` with `{ anchor, scale, offsetX, offsetY }`, plus `linkedZoom: boolean` and a `toggleLinkedZoom` action. There is NO existing user zoom/pan state — the alignment scale/offset is auto-calculated from landmarks, not user-controlled.

**Alignment pipeline (two systems):**

1. `lib/canvas/alignment.ts` — `calculateAlignment()` computes normalized scale + offset from landmarks. Used by `hooks/useAlignment.ts` for the real-time editor preview. Stores result in `alignment.scale/offsetX/offsetY` in editor store.
2. `lib/canvas/aligned-draw-params.ts` — `calculateAlignedDrawParams()` computes pixel-level draw parameters for rendering. This is the single source of truth used by PNG export (`lib/canvas/export.ts`), GIF export (`lib/canvas/export-gif.ts`), and `AlignedPreview.tsx`. It does NOT read from the editor store — it receives landmarks and dimensions as arguments.

**Key insight:** These are two separate alignment systems. System 1 (alignment.ts) feeds the editor store but System 2 (aligned-draw-params.ts) ignores the store and recalculates from scratch. The user zoom feature needs to affect System 2's output since that's what controls all rendering.

**PhotoPanel** (`components/features/editor/PhotoPanel.tsx`): Displays individual photos with landmark overlay. Currently shows photos with object-contain fit — no zoom/pan gestures. This component does NOT use the alignment system — it shows raw photos.

**AlignedPreview** (`components/features/editor/AlignedPreview.tsx`): Canvas-based side-by-side preview used in the ExportModal. Calls `calculateAlignedDrawParams()` directly. Recently updated to use exact aspect ratio without post-hoc canvas resizing. Clips photos at `photoClipHeight` to avoid white space at bottom.

**Export pipeline:** `lib/canvas/export.ts` (`exportCanvas()`) and `lib/canvas/export-gif.ts` (`exportGif()`) both call `calculateAlignedDrawParams()` independently. They receive photo data as arguments, not from the store.

**EditorContent** (`app/(app)/editor/_components/EditorContent.tsx`): Main editor layout — two PhotoPanel instances in a 2-column grid, plus ExportModal.

**AlignmentControls** (`components/features/editor/AlignmentControls.tsx`): Existing panel with anchor selector (full/head/shoulders/hips), scale slider (0.5-2x), offset X/Y controls, and landmark/grid toggles. These control the System 1 alignment, not the export rendering.

**Types:** `AlignmentSettings` in `types/editor.ts`: `{ anchor, scale, offsetX, offsetY }`.

### Codebase Snapshot

| File                                               | Purpose                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/editor-store.ts`                           | Zustand store — photos, alignment, backgroundSettings, linkedZoom                                                                           |
| `types/editor.ts`                                  | AlignmentSettings type definition                                                                                                           |
| `lib/canvas/aligned-draw-params.ts`                | Single source of truth for render calculations (4 phases: body scaling, overflow normalization, vertical positioning, horizontal alignment) |
| `lib/canvas/alignment.ts`                          | Landmark-based alignment calculator (editor preview system)                                                                                 |
| `lib/canvas/export.ts`                             | PNG export — calls `calculateAlignedDrawParams()`                                                                                           |
| `lib/canvas/export-gif.ts`                         | GIF export — calls `calculateAlignedDrawParams()`                                                                                           |
| `components/features/editor/AlignedPreview.tsx`    | Canvas preview in ExportModal — calls `calculateAlignedDrawParams()`                                                                        |
| `components/features/editor/PhotoPanel.tsx`        | Individual photo display with landmark overlay                                                                                              |
| `components/features/editor/AlignmentControls.tsx` | Existing alignment UI controls                                                                                                              |
| `components/features/editor/ExportModal.tsx`       | Export dialog with format/animation/background options                                                                                      |
| `hooks/useAlignment.ts`                            | Hook bridging alignment.ts calculations to editor store                                                                                     |
| `app/(app)/editor/_components/EditorContent.tsx`   | Main editor layout with PhotoPanel grid                                                                                                     |

### What a Good Plan Should Cover

1. **Where does user zoom/pan state live?** New store fields vs extending AlignmentSettings vs a separate slice?
2. **How does user zoom/pan interact with `calculateAlignedDrawParams`?** Should it be a new parameter to the function, or a post-processing wrapper that transforms the output?
3. **How do PhotoPanels get zoom/pan gestures?** They currently show raw photos, not aligned renders. Should they switch to canvas-based rendering, or can CSS transforms achieve the preview?
4. **How is the "minimum zoom" (no blank borders) calculated?** The minimum depends on image dimensions, aspect ratio, and alignment — this is non-trivial.
5. **How does the slider integrate?** Where in the UI, and does it replace or coexist with the existing AlignmentControls scale slider?
6. **How do exports receive the user zoom/pan state?** The export functions don't read from the store — they receive arguments.
7. **Touch gesture implementation** — which library (if any), how to prevent default without breaking page scroll, pinch vs scroll detection.
8. **What happens when landmarks aren't detected?** Zoom/pan should still work on raw cover-fit images.

---

## Deliverable

Produce a numbered implementation plan with:

- Clear phases/steps
- Which files are created or modified at each step
- Verification gates between steps (how to confirm each step succeeded before moving on)
- Any risks or trade-offs worth calling out

Save your response as `codex-plan.md` in `output/sessions/2026-03-07_user-zoom-crop/`.

Then output this command for the user to copy-paste into Claude Code:

```
/plan.with.codex synthesise
```
