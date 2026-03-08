# Performance Review Findings

**Reviewer:** cs-frontend-engineer
**Scope:** Canvas rendering, MediaPipe integration, GIF/PNG export, background removal, image processing, Zustand selectors, memory management, bundle composition across 8 hooks, 2 stores, 12 editor components, and the Next.js config.
**Date:** 2026-03-08

## Summary

The Svolta editor has a solid architecture with good patterns (requestAnimationFrame in zoom/pan, image caching in preview components, singleton MediaPipe detector). However, there are significant memory issues from storing large base64 data URLs and ImageData objects in Zustand, a dead Fabric.js dependency inflating the bundle, synchronous `@imgly/background-removal` imports on every editor load, and production `console.log` calls in the hot export path.

## Findings

### [HIGH] PERF-001: Large base64 data URLs stored in Zustand cause excessive memory and re-render cost

- **File:** `stores/editor-store.ts` (lines 70-72), `types/editor.ts` (lines 10-25)
- **Issue:** The `Photo` type stores `dataUrl` (base64 string, ~3-8MB per photo at 2048px), `originalDataUrl` (another copy when background is removed), and `segmentationMask` (ImageData, ~16MB for a 2048x2048 image) directly in the Zustand store. When any store field changes (e.g., toggling landmarks visibility), every component subscribed to `beforePhoto` or `afterPhoto` receives a new reference even though the photo data has not changed. The `setBeforeLandmarks` action (line 74-79) spreads the entire Photo object into a new reference (`{ ...state.beforePhoto, landmarks }`) which triggers re-renders in every component that selects `beforePhoto`, even though only `landmarks` changed.
- **Impact:** Each photo state update forces React to diff components holding multi-megabyte objects. With background removal, the store can hold 4 base64 strings (before/after original + processed) totaling 12-32MB of string data in JS heap, plus up to 32MB of ImageData masks. On mobile Safari this risks OOM pressure.
- **Fix:** Move binary data (dataUrl, originalDataUrl, segmentationMask) out of Zustand into a separate `Map<string, BlobData>` ref or cache keyed by photo ID. Store only the photo ID and metadata (width, height, landmarks, flags) in Zustand. Components that need image data can look it up by ID from the cache without triggering re-renders when unrelated fields change.
- **Effort:** medium

### [HIGH] PERF-002: `@imgly/background-removal` statically imported in editor bundle

- **File:** `lib/segmentation/background-removal.ts` (line 9)
- **Issue:** `@imgly/background-removal` is imported with a top-level static `import` statement. This library is approximately 2-3MB (including ONNX runtime and model loading code). It is pulled in through `useBackgroundRemoval` -> `PhotoPanel` -> `EditorContent`, meaning the entire background-removal library is included in the editor's initial JS bundle even though most users never use background removal.
- **Impact:** Adds 2-3MB of parsed JavaScript to the editor chunk, increasing Time to Interactive by 1-3 seconds on mid-range mobile devices. The library also downloads ~40MB of WASM/model files when first used, but the JS parsing cost is paid upfront.
- **Fix:** Convert to a dynamic import: `const { removeBackground } = await import('@imgly/background-removal')` inside the `removeBackground` function, only when the user actually triggers background removal. Expose the same API surface but lazy-load the heavy dependency.
- **Effort:** small

### [HIGH] PERF-003: Fabric.js dependency installed but unused

- **File:** `package.json` (line 38), `lib/canvas/fabric-setup.ts`
- **Issue:** `fabric` (v7.1.0, ~300KB minified+gzipped) is listed as a production dependency and `lib/canvas/fabric-setup.ts` statically imports it. However, no file in the codebase imports `fabric-setup.ts`. The Fabric.js library may still be included in the bundle via tree-shaking failure depending on the bundler configuration, and it definitely inflates `node_modules` and install time.
- **Impact:** If tree-shaking eliminates it: wasted disk space and slower `npm install`. If it does not: ~300KB added to the client bundle for no reason. The `unsafe-eval` CSP directive in `next.config.ts` (line 52) is specifically noted as being needed for Fabric.js, which means removing it could also allow tightening the CSP.
- **Fix:** Remove `fabric` from `package.json`, delete `lib/canvas/fabric-setup.ts`, and test whether the `unsafe-eval` CSP directive can be removed.
- **Effort:** small

### [MEDIUM] PERF-004: GIF frame generation blocks main thread despite yield

- **File:** `lib/canvas/export-gif.ts` (lines 237-280)
- **Issue:** Each GIF frame involves: creating a canvas, drawing two images with alignment, drawing labels, adding a watermark (which itself may load a custom logo image), then adding to the GIF encoder. The `yieldToMain()` call (setTimeout(0)) between frames helps with progress UI updates but each individual frame still takes 10-50ms synchronously (canvas draw + watermark). With 30 frames (slider animation), this is 300-1500ms of main thread blocking split across microtasks, causing jank in the progress bar animation and making the UI unresponsive during GIF generation.
- **Impact:** Visible UI stutter during GIF export. Progress bar may jump instead of animating smoothly. User interactions (cancel button) may feel delayed.
- **Fix:** Move frame generation into an OffscreenCanvas Web Worker. Pass image bitmaps via `transferable` and generate frames off the main thread entirely. Alternatively, batch yield every 3-5 frames instead of every frame to reduce scheduling overhead while still maintaining responsiveness.
- **Effort:** large (Web Worker), small (batch yield improvement)

### [MEDIUM] PERF-005: AlignedPreview redraws canvas on every `userFraming` change without throttling

- **File:** `components/features/editor/AlignedPreview.tsx` (lines 106-227)
- **Issue:** The canvas drawing effect (Effect 2) lists `userFraming` in its dependency array. When the user adjusts the crop zoom slider, `userFraming` changes on every slider `onChange` event (potentially 60+ times per second). Each change triggers a full canvas redraw: getting container dimensions, recalculating alignment params, clipping, and drawing two images. There is no throttling or `requestAnimationFrame` gating on this effect.
- **Impact:** Excessive canvas redraws during slider interaction in the export preview, potentially causing frame drops on lower-end devices.
- **Fix:** Wrap the canvas drawing logic in a `requestAnimationFrame` guard (similar to how `useZoomPanGestures` already does it). Store a pending redraw flag and only execute the draw in the next animation frame.
- **Effort:** small

### [MEDIUM] PERF-006: GifPreview runs continuous requestAnimationFrame even when not visible

- **File:** `components/features/editor/GifPreview.tsx` (lines 200-293)
- **Issue:** The GifPreview animation loop runs a `requestAnimationFrame` loop continuously once `isReady` is true. This component is rendered inside the ExportModal's preview area. When the user switches from GIF to PNG export type, the ExportPreview component conditionally renders either GifPreview or AlignedPreview. However, if the modal is open and GIF is selected, the animation loop runs even if the modal is scrolled so the preview is off-screen, or while the user is interacting with other controls.
- **Impact:** Continuous GPU/CPU work (~60fps canvas compositing) even when the preview is not visible or relevant. On battery-powered devices this wastes energy.
- **Fix:** Add an IntersectionObserver or check for component visibility before running the animation loop. Alternatively, pause the animation when the user is not looking at the preview (e.g., when More Options is expanded and the preview scrolls off).
- **Effort:** small

### [MEDIUM] PERF-007: Production console.log calls in export hot path

- **File:** `lib/canvas/export-gif.ts` (lines 195, 224, 282, 323), `lib/canvas/export.ts` (line 262)
- **Issue:** Multiple `console.log` calls with object serialization in the export codepath. These are not gated behind a debug flag. `console.log` with objects forces the browser to serialize and retain references to potentially large objects (image dimensions, file sizes), and in some browsers, prevents garbage collection of those objects until the console is cleared.
- **Impact:** Minor memory retention and slight slowdown during exports. In Safari DevTools-open scenarios, this can cause noticeable GC pauses.
- **Fix:** Replace with the existing `canvasLogger` abstraction (already used in the hooks layer) which can be conditionally disabled in production, or remove entirely.
- **Effort:** trivial

### [MEDIUM] PERF-008: Image scaling in `processImage` uses `canvas.toDataURL()` which is synchronous and blocking

- **File:** `lib/utils/image.ts` (lines 57-122)
- **Issue:** The `scaleImage` function creates a canvas, draws the image, then calls `canvas.toDataURL('image/jpeg', 0.9)` on line 107. `toDataURL()` is a synchronous operation that encodes the entire image to a base64 string on the main thread. For a 2048x2048 image, this can take 50-200ms, blocking the main thread during photo upload.
- **Impact:** Visible UI freeze (50-200ms) when uploading large photos. The spinner animation in the DropZone will stutter.
- **Fix:** Replace `canvas.toDataURL()` with `canvas.toBlob()` (async, non-blocking) followed by `URL.createObjectURL()` for display, or use `createImageBitmap()` + `OffscreenCanvas` for the scaling operation.
- **Effort:** medium (requires changing the Photo type to use blob URLs instead of data URLs throughout)

### [LOW] PERF-009: `useExportDownload` hook has `callbacks` object in dependency array causing unnecessary recreation

- **File:** `hooks/useExportDownload.ts` (lines 69-151)
- **Issue:** The `handleDownload` callback includes `callbacks` in its dependency array (line 150). The `callbacks` object `{ onLimitReached, onSuccess }` is created inline in ExportModal (lines 81-91) on every render, which means `handleDownload` is recreated on every ExportModal render, which in turn destabilizes any child components that receive `handleDownload` as a prop.
- **Impact:** Unnecessary re-creation of the download handler on every ExportModal state change (e.g., toggling any option).
- **Fix:** Either memoize the callbacks object with `useMemo` in ExportModal, or destructure `onLimitReached` and `onSuccess` as separate parameters in the hook so they can be individually listed in the dependency array and stabilized with `useCallback` at the call site.
- **Effort:** trivial

### [LOW] PERF-010: `useAlignment` hook subscribes to entire `beforePhoto` and `afterPhoto` objects

- **File:** `hooks/useAlignment.ts` (lines 39-41)
- **Issue:** The `useAlignment` hook selects `beforePhoto` and `afterPhoto` from the store (the full Photo objects including multi-MB `dataUrl` strings). It only needs `landmarks` and photo existence for its `canAlign` computation, yet any change to the Photo object (e.g., background removal updating `dataUrl`) triggers a recalculation of alignment-related memos.
- **Impact:** Unnecessary recalculation of `canAlign` and `isAligned` memos when photo data changes but landmarks have not. With the current store design where `setBeforeLandmarks` creates a new Photo reference, this is a relatively minor concern since landmark updates are infrequent. However, it becomes more impactful with background removal which changes the Photo reference without changing landmarks.
- **Fix:** Create more granular selectors: `useEditorStore((s) => s.beforePhoto?.landmarks)` and `useEditorStore((s) => !!s.beforePhoto)` instead of selecting the entire photo object.
- **Effort:** trivial

### [LOW] PERF-011: Sequential background removal for before and after photos

- **File:** `hooks/useExportBackgroundRemoval.ts` (lines 38-76)
- **Issue:** When the user selects a background option that requires removal, `removeBackgrounds()` processes the before photo first, waits for it to complete, then processes the after photo. Each removal takes 5-15 seconds (AI inference), so the total wait is 10-30 seconds.
- **Impact:** Users wait twice as long as necessary for background removal. The UI shows a single "Removing backgrounds..." message with no per-photo progress.
- **Fix:** Run both removals in parallel with `Promise.all([removeBackground(before), removeBackground(after)])`. Note: this may increase peak memory usage (two concurrent ONNX inference sessions), so test on low-memory devices. If memory is a concern, at minimum show per-photo progress.
- **Effort:** small

## Statistics

- Critical: 0
- High: 3
- Medium: 5
- Low: 3
- Total: 11
