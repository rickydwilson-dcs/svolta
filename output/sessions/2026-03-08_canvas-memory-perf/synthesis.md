# Implementation Plan: Canvas & Memory Performance

**Date:** 2026-03-08
**Status:** Ready for implementation — approved by dual-model peer review
**Source:** Synthesised from Claude and Codex independent plans

## Key Differences Between Plans

| Aspect                           | Claude                                                                                               | Codex                                                                                                  | Synthesised Decision                                                                                                                                                                                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase ordering                   | Rendering fixes first (rAF, IO), blob migration later                                                | Blob migration first, rendering fixes in Phase 4                                                       | **Claude's order** — rendering fixes are isolated, low-risk, and can ship independently. Do them first as a confidence-building warm-up before the riskier blob migration.                                                                                                 |
| Background removal scope         | Treats bg removal as minor subphase; only changes consumers (PhotoPanel, useExportBackgroundRemoval) | Elevates bg removal to full phase; modifies `background-removal.ts` itself to stop producing data URLs | **Codex's scope** — `removeBackground()` returns a data URL via `blobToDataUrl(resultBlob)` at line 200, and `applyBackground()` uses `canvas.toDataURL()` at line 295. Both must be converted to blob URLs or acceptance criterion #1 is violated after any bg operation. |
| Utility module                   | Inline `revokePhotoUrls` helper in store file                                                        | Dedicated `lib/utils/object-url.ts` with `isBlobUrl`, `revokeObjectUrl`, `revokePhotoUrls`             | **Codex's approach** — a dedicated module is cleaner, testable, and reusable across store + bg removal cleanup.                                                                                                                                                            |
| No-scale path in `scaleImage`    | Explicitly converts to blob URL via `fetch(dataUrl).then(r => r.blob())`                             | Not explicitly addressed                                                                               | **Claude's approach** — the no-scale path must also produce a blob URL for consistency. Use `fetch(dataUrl)` to convert.                                                                                                                                                   |
| `load-image.ts` param rename     | No change                                                                                            | Rename `dataUrl` param to `src` (docs only)                                                            | **Codex's approach** — zero-risk improvement, improves clarity.                                                                                                                                                                                                            |
| Field rename (`dataUrl` → `src`) | Raises as open question                                                                              | Recommends keeping `dataUrl`, adding TODO comment                                                      | **Keep `dataUrl`** — renaming 18 files is out of scope. Add JSDoc clarification on the type.                                                                                                                                                                               |
| URL dedup on revocation          | Not addressed                                                                                        | Explicitly guards `dataUrl === originalDataUrl` to prevent double-revoke                               | **Codex's approach** — double-revoke is a real bug. Add dedup check.                                                                                                                                                                                                       |

## Blind Spots Caught

**Codex caught (Claude missed):**

- `background-removal.ts` re-introduces base64 at two points: `blobToDataUrl(resultBlob)` line 200 and `canvas.toDataURL()` line 295. Without fixing these, the blob URL invariant breaks after any bg removal operation.
- Phase 0 inventory step — auditing all producers before coding prevents missed paths.
- URL dedup guard — if `photo.dataUrl === photo.originalDataUrl` (which happens when bg removal hasn't been applied), revoking both would double-revoke.

**Claude caught (Codex missed):**

- The no-scale path in `scaleImage()` needs explicit conversion to blob URL. When an image is already ≤2048px, the function returns the input data URL unchanged — this would leave a data URL in Zustand.
- `fetch(dataUrl)` as the cleanest conversion method for data URL → Blob.
- Explicit reasoning about revocation timing safety: revoke old URL _before_ setting new state is safe because Zustand's `set()` is synchronous and React batches renders.

---

## Implementation Plan

### Phase 1: PERF-005 — Add rAF guard to AlignedPreview

**Goal:** Prevent redundant synchronous canvas draws when multiple deps change in the same render frame.

**Files modified:**

- `components/features/editor/AlignedPreview.tsx`

**Steps:**

1. In Effect 2 (line 107), wrap the entire draw body in `requestAnimationFrame`
2. Store the rAF ID and cancel it in the effect cleanup

```typescript
React.useEffect(() => {
  const canvas = canvasRef.current;
  const container = containerRef.current;
  const { beforeImg, afterImg } = imagesRef.current;
  if (!canvas || !container || !beforeImg || !afterImg) return;

  const rafId = requestAnimationFrame(() => {
    // ... existing draw logic (lines 113-227) ...
    setIsRendering(false);
  });

  return () => cancelAnimationFrame(rafId);
}, [
  imagesLoaded,
  format,
  showLabels,
  backgroundSettings,
  userFraming,
  beforePhoto.landmarks,
  afterPhoto.landmarks,
]);
```

**Verification gate:**

```bash
npm run type-check
```

**Commit:**

```
perf(canvas): add requestAnimationFrame guard to AlignedPreview draw effect (PERF-005)
```

---

### Phase 2: PERF-006 — Add IntersectionObserver to GifPreview

**Goal:** Pause the GIF animation loop when the component is not visible.

**Files modified:**

- `components/features/editor/GifPreview.tsx`

**Steps:**

1. Add `isVisibleRef = React.useRef(true)`
2. Add `animateFnRef = React.useRef<((ts: number) => void) | null>(null)` to hold a stable reference to the animate function
3. Add IntersectionObserver effect that observes `containerRef.current`
4. In the animation loop, stop scheduling frames when not visible (reset `startTime = null` for smooth resume)
5. In the observer callback, restart the loop when becoming visible again

**Key implementation detail — avoid the "animate function not accessible" problem:**

The observer callback needs to call `requestAnimationFrame(animate)` to restart, but `animate` is defined inside the animation effect. Solution: store the animate function in a ref so the observer can access it.

```typescript
const isVisibleRef = React.useRef(true);
const animateFnRef = React.useRef<((ts: number) => void) | null>(null);

// IntersectionObserver effect
React.useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      const wasVisible = isVisibleRef.current;
      isVisibleRef.current = entry.isIntersecting;
      // Restart animation when becoming visible
      if (!wasVisible && entry.isIntersecting && animateFnRef.current) {
        animationRef.current = requestAnimationFrame(animateFnRef.current);
      }
    },
    { threshold: 0 },
  );

  observer.observe(container);
  return () => observer.disconnect();
}, []);

// In animation loop effect:
const animate = (timestamp: number) => {
  if (!isVisibleRef.current) {
    startTime = null; // Reset for smooth resume
    return; // Stop loop — observer will restart
  }
  // ... existing logic ...
  animationRef.current = requestAnimationFrame(animate);
};
animateFnRef.current = animate;
```

**Verification gate:**

```bash
npm run type-check
```

**Commit:**

```
perf(canvas): pause GifPreview animation when off-screen via IntersectionObserver (PERF-006)
```

---

### Phase 3: Create object URL lifecycle utility

**Goal:** Centralise blob URL creation and revocation to prevent leaks and double-revoke bugs.

**Files created:**

- `lib/utils/object-url.ts`

**Files modified:**

- `types/editor.ts` (JSDoc update only)

**Steps:**

1. Create `lib/utils/object-url.ts` with:
   - `createBlobUrl(blob: Blob): string` — wrapper around `URL.createObjectURL`
   - `isBlobUrl(src: string): boolean` — checks `src.startsWith('blob:')`
   - `revokeBlobUrl(src?: string | null): void` — safe revoke with null/undefined/non-blob guards
   - `revokePhotoUrls(photo?: Photo | null): void` — revokes `dataUrl` and `originalDataUrl`, with dedup guard (`dataUrl === originalDataUrl`)
2. Update `Photo` interface JSDoc in `types/editor.ts`:
   - `dataUrl` → add comment: `/** Image source URL (blob: URL preferred, data: URL tolerated) */`
   - `originalDataUrl` → add comment: `/** Original image source before background removal (blob: URL) */`

**Verification gate:**

```bash
npm run type-check
```

**Commit:**

```
refactor(utils): add object-url lifecycle utility for blob URL management (PERF-001)
```

---

### Phase 4: Migrate `scaleImage()` and `processImage()` to blob URLs (PERF-008 + PERF-001 core)

**Goal:** Change the image processing pipeline to produce blob URLs instead of base64 data URLs, so Photo objects stored in Zustand contain only short string references.

**Files modified:**

- `lib/utils/image.ts`
- `lib/canvas/load-image.ts` (parameter rename only: `dataUrl` → `src`)

**Steps:**

1. **`scaleImage()`** — Replace `canvas.toDataURL()` with `canvas.toBlob()` + `URL.createObjectURL()`:
   - Scaling path: `canvas.toBlob(callback, 'image/jpeg', 0.9)` → `createBlobUrl(blob)`
   - No-scaling path: convert input data URL to blob URL via `fetch(dataUrl).then(r => r.blob()).then(createBlobUrl)`
   - The function signature stays the same: `Promise<{ dataUrl: string; width: number; height: number }>`

2. **`processImage()`** — No structural change needed. It calls `readFileAsDataURL()` → `scaleImage()`. The intermediate data URL from `readFileAsDataURL` is temporary input to `scaleImage`, which now returns a blob URL. The temporary data URL is GC'd naturally.

3. **`load-image.ts`** — Rename parameter from `dataUrl` to `src` for accuracy. No behavioral change.

**Implementation for `scaleImage`:**

```typescript
import { createBlobUrl } from "./object-url";

export async function scaleImage(
  dataUrl: string,
  maxDim: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImageElement(dataUrl); // internal helper, not the shared loadImage
  const { width: ow, height: oh } = img;

  if (ow <= maxDim && oh <= maxDim) {
    // No scaling needed — convert data URL to blob URL for consistency
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return { dataUrl: createBlobUrl(blob), width: ow, height: oh };
  }

  // Calculate new dimensions (same logic as before)
  let newWidth = ow,
    newHeight = oh;
  if (ow > oh) {
    if (ow > maxDim) {
      newWidth = maxDim;
      newHeight = (oh * maxDim) / ow;
    }
  } else {
    if (oh > maxDim) {
      newHeight = maxDim;
      newWidth = (ow * maxDim) / oh;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }
        resolve({
          dataUrl: createBlobUrl(blob),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      },
      "image/jpeg",
      0.9,
    );
  });
}
```

**Verification gate:**

```bash
npm run type-check
npm run lint
```

**Commit:**

```
perf(image): replace toDataURL with toBlob + blob URLs in scaleImage (PERF-008, PERF-001)
```

---

### Phase 5: Add blob URL cleanup to editor store

**Goal:** Revoke blob URLs when photos are replaced or the editor is reset, preventing memory leaks.

**Files modified:**

- `stores/editor-store.ts`

**Steps:**

1. Import `revokePhotoUrls` from `lib/utils/object-url`
2. Update `setBeforePhoto`: revoke old photo URLs before setting new photo
3. Update `setAfterPhoto`: same
4. Update `reset()`: revoke both photos before nulling state

```typescript
import { revokePhotoUrls } from '@/lib/utils/object-url';

setBeforePhoto: (photo) => set((state) => {
  revokePhotoUrls(state.beforePhoto);
  return { beforePhoto: photo };
}),

setAfterPhoto: (photo) => set((state) => {
  revokePhotoUrls(state.afterPhoto);
  return { afterPhoto: photo };
}),

reset: () => set((state) => {
  revokePhotoUrls(state.beforePhoto);
  revokePhotoUrls(state.afterPhoto);
  return {
    beforePhoto: null,
    afterPhoto: null,
    // ... rest of initial state
  };
}),
```

**Verification gate:**

```bash
npm run type-check
```

**Commit:**

```
fix(store): revoke blob URLs on photo replacement and editor reset (PERF-001)
```

---

### Phase 6: Migrate background removal to blob URLs

**Goal:** Ensure `removeBackground()` and `applyBackground()` return blob URLs instead of data URLs, maintaining the blob URL invariant after bg operations.

**Files modified:**

- `lib/segmentation/background-removal.ts`
- `components/features/editor/PhotoPanel.tsx` (if needed for cleanup)
- `hooks/useExportBackgroundRemoval.ts` (if needed for cleanup)

**Steps:**

1. **`removeBackground()`** (line 200): Replace `blobToDataUrl(resultBlob)` with `createBlobUrl(resultBlob)`:

   ```typescript
   // Before: const processedDataUrl = await blobToDataUrl(resultBlob);
   const processedDataUrl = createBlobUrl(resultBlob);
   ```

   Note: `extractMaskFromTransparentImage` at line 203 uses `processedDataUrl` to load an image — `loadImage()` works with blob URLs, so this is transparent.

2. **`applyBackground()`** (line 295): Replace `canvas.toDataURL('image/png', 1.0)` with `canvas.toBlob()` + `createBlobUrl()`:

   ```typescript
   return new Promise((resolve, reject) => {
     canvas.toBlob(
       (blob) => {
         if (!blob) {
           reject(new Error("Failed to create background blob"));
           return;
         }
         resolve(createBlobUrl(blob));
       },
       "image/png",
       1.0,
     );
   });
   ```

   This changes `applyBackground` return type from `Promise<string>` (sync data URL in promise) to `Promise<string>` (async blob URL) — same type, just async internally.

3. **Remove `blobToDataUrl` helper** (lines 86-93) — no longer needed.

4. **Verify consumer paths:**
   - `PhotoPanel.tsx:114-121` — calls `removeBackground(photo.dataUrl)`, stores result `.processedDataUrl` as new `dataUrl` and saves `originalDataUrl`. The store setter now revokes old URLs. Confirm the old `photo.dataUrl` is being revoked via the store setter (it should be, since `setBeforePhoto`/`setAfterPhoto` now calls `revokePhotoUrls`).
   - `useExportBackgroundRemoval.ts:42-70` — same pattern. Verify cleanup.

**Verification gate:**

```bash
npm run type-check
npm run lint
```

**Commit:**

```
perf(segmentation): return blob URLs from removeBackground and applyBackground (PERF-001)
```

---

### Phase 7: Compatibility sweep and final validation

**Goal:** Verify all 18 `dataUrl` consumers compile and function correctly with blob URLs.

**Files to verify (read-only unless changes needed):**

- `hooks/useCanvasExport.ts` — passes `photo.dataUrl` to export function → transparent
- `hooks/useGifExport.ts` — passes `photo.dataUrl` to GIF export → transparent
- `hooks/usePoseDetection.ts` — passes dataUrl string to MediaPipe → transparent (loadImage accepts any src)
- `lib/canvas/export.ts` — calls `loadImage(beforePhoto.dataUrl)` → transparent
- `lib/canvas/export-gif.ts` — calls `loadImage(beforePhoto.dataUrl)` → transparent
- `lib/mediapipe/pose-detector.ts` — loads image from src string → transparent
- `components/features/editor/DropZone.tsx` — `<img src={photo.dataUrl}>` → blob URLs work in img src
- `components/features/editor/PhotoPanel.tsx` — `<img src={photo.dataUrl}>` → transparent
- `tests/visual/lib/export-adapter.ts` — constructs Photo objects for tests
- `tests/hooks/useExportDownload.test.ts` — references dataUrl in mocks

**Steps:**

1. Read each consumer file and confirm no code assumes `data:` prefix (e.g., no `.startsWith('data:')` checks, no base64 parsing)
2. Update test files if they construct Photo objects with inline data URLs — tests should still work since `loadImage()` accepts both, but mocks of `URL.createObjectURL` may be needed in jsdom
3. Run full verification:

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
npm run build
```

**Commit:**

```
test: update test fixtures for blob URL compatibility (PERF-001)
```

(Only if test changes were needed; skip commit if no changes.)

---

## Risk Summary

| Risk                                                                         | Severity | Mitigation                                                                                                                                        |
| ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double-revoke of blob URL when `dataUrl === originalDataUrl`                 | Medium   | Dedup guard in `revokePhotoUrls`                                                                                                                  |
| Component renders `<img src={blobUrl}>` after URL is revoked                 | Low      | Revocation happens inside Zustand `set()` which is sync; React batches the state update so components re-render with the new URL, not the old one |
| `URL.createObjectURL` unavailable in jsdom tests                             | Medium   | Add mock in test setup or no-op fallback in utility                                                                                               |
| `fetch(dataUrl)` for no-scale conversion adds async overhead                 | Low      | Only runs once per photo upload; negligible compared to HEIC conversion or MediaPipe detection                                                    |
| Background removal `extractMaskFromTransparentImage` needs blob URL as input | Low      | `loadImage()` already accepts blob URLs; transparent                                                                                              |
