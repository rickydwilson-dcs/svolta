# Codex Peer Review Prompt

Paste this entire file into Codex in VS Code.

---

## Your task

You are doing an independent architectural peer review. Read the brief below, then produce your own implementation plan.

Save your plan as `codex-plan.md` in this folder:
`output/sessions/2026-03-08_canvas-memory-perf/`

When done, output this exact command so the user can copy-paste it into Claude Code:

```
/plan.with.codex synthesise
```

---

## Brief: Canvas & Memory Performance

**Date:** 2026-03-08
**Project:** Svolta — fitness photo alignment SaaS (Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe)
**Note:** This brief is sent to both Claude and Codex independently. Your plans will be synthesised into a final implementation spec. Do not look at `claude-plan.md` before writing your own plan.

### Problem Statement

The Svolta editor stores full base64-encoded photo data (data URLs) directly inside the Zustand store, causing large state objects that trigger unnecessary re-renders and consume excessive memory. Additionally, the canvas preview components re-render without requestAnimationFrame guards, and the GIF preview animation runs even when off-screen. The `scaleImage()` function uses `canvas.toDataURL()` which creates large base64 strings synchronously instead of using the async `canvas.toBlob()` API.

These issues combine to create memory pressure and rendering jank, especially with high-resolution photos (up to 2048px).

Note: no clarified brief was produced for this topic. Challenge assumptions accordingly and flag any scope gaps you identify.

### Goals

1. Extract binary photo data (base64 data URLs) out of Zustand state to reduce store size and prevent unnecessary re-renders
2. Replace `canvas.toDataURL()` with `canvas.toBlob()` + `URL.createObjectURL()` to reduce memory pressure during image processing
3. Add `requestAnimationFrame` guard to `AlignedPreview.tsx` canvas drawing effect to prevent redundant draw calls
4. Add `IntersectionObserver` to `GifPreview.tsx` to pause animation when the component is not visible

### Non-Goals

- Changing the canvas export pipeline (export.ts, export-gif.ts) — these already work correctly
- Modifying the MediaPipe pose detection pipeline
- Changing the Supabase or Stripe integrations
- Any UI/UX changes beyond what's needed for the performance fixes

### Acceptance Criteria

1. `Photo.dataUrl` is no longer stored as a base64 string inside Zustand — blob URLs or an external cache is used instead
2. `scaleImage()` in `lib/utils/image.ts` uses `canvas.toBlob()` instead of `canvas.toDataURL()`
3. `AlignedPreview.tsx` drawing effect is wrapped in `requestAnimationFrame`
4. `GifPreview.tsx` animation pauses when the component scrolls out of view
5. All 18 files that reference `dataUrl` continue to work correctly
6. TypeScript compiles with no errors
7. Export flow (PNG and GIF) works end-to-end

### Constraints

- **Client-side only** — all photo processing happens in the browser, never uploaded to servers
- **Photo type** is defined in `types/editor.ts` and re-exported from `lib/utils/image.ts` — the `Photo` interface is consumed by 18 files
- **Zustand store** (`stores/editor-store.ts`) stores `beforePhoto: Photo | null` and `afterPhoto: Photo | null` — the entire Photo object including `dataUrl` is in state
- **`loadImage()` utility** (`lib/canvas/load-image.ts`) accepts a string (data URL or blob URL) and returns an HTMLImageElement — this is the central point where images are loaded for canvas operations
- **Background removal** stores `originalDataUrl` on the Photo for reverting — this also needs to be handled
- **GIF export** reads `photo.dataUrl` to load images — must continue working with blob URLs
- **`<img src={photo.dataUrl}>` usage** — DropZone.tsx and PhotoPanel.tsx render photos directly via img src, which works with both data URLs and blob URLs
- **Memory cleanup** — blob URLs created via `URL.createObjectURL()` must be revoked via `URL.revokeObjectURL()` when photos are replaced or the editor is reset, or they leak memory

### Relevant Architecture

**Photo flow:**

1. User drops image → `DropZone.tsx` calls `processImage()` from `lib/utils/image.ts`
2. `processImage()` reads file as data URL, scales it, returns `Photo` object with `dataUrl` string
3. Photo is stored in Zustand via `setBeforePhoto()`/`setAfterPhoto()`
4. Components read `photo.dataUrl` for: canvas rendering (AlignedPreview, GifPreview, export.ts, export-gif.ts), img display (DropZone, PhotoPanel), pose detection, background removal

**Canvas rendering chain:**

- `AlignedPreview.tsx` — Effect 1 loads images from dataUrl, Effect 2 draws to canvas. No rAF guard on Effect 2.
- `GifPreview.tsx` — Effect 1 loads images, Effect 2 pre-renders canvases, Effect 3 runs animation loop (already uses rAF). No visibility check.

**Key dependency: `loadImage()`** — All canvas operations go through `loadImage(dataUrl: string)` in `lib/canvas/load-image.ts`. This function accepts any valid image src (data URL or blob URL), so switching from data URLs to blob URLs is transparent to canvas consumers.

### Codebase Snapshot

| File                                            | Role                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `types/editor.ts`                               | Defines `Photo` interface with `dataUrl: string`, `originalDataUrl?: string`                      |
| `lib/utils/image.ts`                            | `processImage()` — reads file, scales, returns Photo. `scaleImage()` uses `canvas.toDataURL()`    |
| `stores/editor-store.ts`                        | Zustand store holding `beforePhoto`/`afterPhoto` as full Photo objects                            |
| `lib/canvas/load-image.ts`                      | `loadImage(dataUrl: string)` — loads image from any src string                                    |
| `components/features/editor/AlignedPreview.tsx` | Canvas preview — loads images from dataUrl, draws aligned preview                                 |
| `components/features/editor/GifPreview.tsx`     | Animated GIF preview — loads images, runs animation loop with rAF                                 |
| `components/features/editor/DropZone.tsx`       | Photo upload — calls processImage(), renders `<img src={photo.dataUrl}>`                          |
| `components/features/editor/PhotoPanel.tsx`     | Photo display panel — renders `<img src={photo.dataUrl}>`, triggers pose detection and bg removal |
| `hooks/useCanvasExport.ts`                      | PNG export — reads `photo.dataUrl` to pass to export function                                     |
| `hooks/useGifExport.ts`                         | GIF export — reads `photo.dataUrl` to pass to export function                                     |
| `hooks/useExportBackgroundRemoval.ts`           | Background removal for export — reads `photo.dataUrl`                                             |
| `hooks/usePoseDetection.ts`                     | Pose detection — accepts dataUrl string                                                           |
| `lib/canvas/export.ts`                          | PNG export — calls `loadImage(beforePhoto.dataUrl)`                                               |
| `lib/canvas/export-gif.ts`                      | GIF export — calls `loadImage(beforePhoto.dataUrl)`                                               |
| `lib/segmentation/background-removal.ts`        | Background removal — accepts dataUrl string                                                       |
| `lib/mediapipe/pose-detector.ts`                | MediaPipe wrapper — accepts dataUrl string                                                        |
| `tests/visual/lib/export-adapter.ts`            | Test adapter — calls `loadImage(beforePhoto.dataUrl)`                                             |
| `tests/hooks/useExportDownload.test.ts`         | Test file — references dataUrl                                                                    |

### What a Good Plan Should Cover

1. **PERF-001 (Zustand extraction):** How to extract binary data from Zustand without breaking the 18-file contract. Should the Photo type change, or should a parallel cache be used? How are blob URLs cleaned up?
2. **PERF-008 (toBlob migration):** Should `scaleImage()` return a blob URL instead of a data URL? Or should it return a Blob and let the caller decide? How does this interact with PERF-001?
3. **Should PERF-001 and PERF-008 be combined?** If Photo.dataUrl becomes a blob URL, does that already solve PERF-001 (no more large base64 strings in Zustand)?
4. **Migration path:** Can we support both data URLs and blob URLs during transition, or is a big-bang change needed?
5. **GIF export impact:** `export-gif.ts` reads `photo.dataUrl` and passes it to `loadImage()`. Since `loadImage()` works with blob URLs, is this transparent?
6. **Background removal:** `originalDataUrl` stores the pre-removal image. If we switch to blob URLs, this field also needs a blob URL. How is cleanup handled for both current and original?
7. **Memory lifecycle:** When are blob URLs created and revoked? What happens on photo replacement? On editor reset?
8. **PERF-005 (rAF guard):** Simple — wrap AlignedPreview Effect 2 in rAF. But consider: does the effect already run synchronously after layout? Is rAF actually helpful here?
9. **PERF-006 (IntersectionObserver):** Where does the observer attach? How does it interact with the existing animation loop cleanup?

---

## Deliverable

Produce a numbered implementation plan with:

- Clear phases/steps
- Which files are created or modified at each step
- Verification gates between steps (how to confirm each step succeeded before moving on)
- Any risks or trade-offs worth calling out

Save your response as `codex-plan.md` in `output/sessions/2026-03-08_canvas-memory-perf/`.

Then output this command for the user to copy-paste into Claude Code:
`/plan.with.codex synthesise`
