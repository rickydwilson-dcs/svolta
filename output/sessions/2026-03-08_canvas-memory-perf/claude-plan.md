# Claude Plan: Canvas & Memory Performance

**Date:** 2026-03-08

## Key Architectural Decision: Combine PERF-001 + PERF-008

After reviewing the codebase, I recommend **combining** PERF-001 and PERF-008 into a single refactor:

- `processImage()` already goes File → data URL → scale → data URL → Photo
- If we change the pipeline to File → data URL → scale → **Blob** → **blob URL** → Photo, then `Photo.dataUrl` becomes a blob URL automatically
- Since `loadImage()` in `load-image.ts` already accepts any valid image src string, all 18 downstream consumers work transparently with blob URLs
- This eliminates the base64 string from Zustand without needing a separate external cache

The key insight: **blob URLs are just short strings** (e.g., `blob:http://localhost:3000/abc-123`). Storing a blob URL in Zustand is no different from storing any short string — the binary data lives in the browser's blob store, not in JS memory.

## Risks & Trade-offs

1. **Blob URL lifecycle** — blob URLs must be revoked when no longer needed or they leak memory. Need to revoke in: `setBeforePhoto()`, `setAfterPhoto()`, `reset()`, and background removal revert.
2. **`originalDataUrl` field** — Background removal stores the pre-removal image. This also becomes a blob URL. Must revoke the old one when a new background removal is applied.
3. **`<img>` rendering** — `DropZone.tsx:220` and `PhotoPanel.tsx:229` use `<img src={photo.dataUrl}>`. Blob URLs work in `<img>` tags, no change needed.
4. **Test compatibility** — `tests/visual/lib/export-adapter.ts` creates Photo objects with data URLs in tests. Tests may need updating if they construct Photos directly.
5. **SSR safety** — `URL.createObjectURL()` is browser-only. All usage is already in client components or hooks, so this is safe.

---

## Phase 1: PERF-005 — Add rAF guard to AlignedPreview

**Goal:** Prevent redundant synchronous canvas draws when multiple deps change in the same frame.

**Files modified:**

- `components/features/editor/AlignedPreview.tsx`

**Steps:**

1. Wrap the body of Effect 2 (line 107) in a `requestAnimationFrame` call
2. Store the rAF ID in a ref or local variable
3. Cancel the pending rAF in the effect cleanup

**Implementation:**

```typescript
// Effect 2: Draw canvas
React.useEffect(
  () => {
    // ... existing setup checks ...

    const rafId = requestAnimationFrame(() => {
      // ... existing draw logic ...
      setIsRendering(false);
    });

    return () => cancelAnimationFrame(rafId);
  },
  [
    /* existing deps */
  ],
);
```

**Verification:**

- TypeScript compiles
- Preview renders correctly with both photos loaded
- No visual flicker or delay

---

## Phase 2: PERF-006 — Add IntersectionObserver to GifPreview

**Goal:** Pause the GIF animation loop when the component is not visible (e.g., scrolled out of view or on a different tab of the export modal).

**Files modified:**

- `components/features/editor/GifPreview.tsx`

**Steps:**

1. Add a `const isVisible = React.useRef(true)` ref
2. Add an `IntersectionObserver` effect that observes `containerRef.current`
3. In the animation loop (Effect 3, line 201), check `isVisible.current` before scheduling the next frame
4. When visibility changes from false → true, restart the animation loop

**Implementation:**

```typescript
// Visibility tracking
const isVisibleRef = React.useRef(true);

React.useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    },
    { threshold: 0 },
  );

  observer.observe(container);
  return () => observer.disconnect();
}, []);
```

Then in the animation loop, add early exit:

```typescript
const animate = (timestamp: number) => {
  if (!isVisibleRef.current) {
    // Pause — will be restarted when visible again
    startTime = null;
    return;
  }
  // ... existing animation logic ...
  animationRef.current = requestAnimationFrame(animate);
};
```

And add a separate effect to restart animation when visibility changes:

```typescript
// Restart animation when becoming visible
React.useEffect(
  () => {
    // The animation loop effect already handles setup/teardown via isReady
    // When isVisible changes and animation stopped, we need to kick it
  },
  [
    /* need to track visibility state changes */
  ],
);
```

Actually, simpler approach: keep the animation loop always scheduling frames, but skip the draw work when not visible. This avoids complexity around restarting:

```typescript
const animate = (timestamp: number) => {
  if (!isVisibleRef.current) {
    animationRef.current = requestAnimationFrame(animate);
    return; // Skip draw, but keep loop alive
  }
  // ... existing animation logic ...
};
```

Wait — this defeats the purpose (still burns CPU on rAF). Better: stop the loop and use the observer callback to restart:

```typescript
const animate = (timestamp: number) => {
  if (!isVisibleRef.current) {
    startTime = null; // Reset so animation resumes smoothly
    return; // Stop loop
  }
  // ... existing logic ...
  animationRef.current = requestAnimationFrame(animate);
};
```

Then in the observer callback:

```typescript
const observer = new IntersectionObserver(([entry]) => {
  const wasVisible = isVisibleRef.current;
  isVisibleRef.current = entry.isIntersecting;
  if (!wasVisible && entry.isIntersecting && canvasRef.current) {
    // Restart animation
    animationRef.current = requestAnimationFrame(animate);
  }
});
```

This requires `animate` to be stable or accessible. Since it's defined inside the animation effect, we'd need to restructure slightly — store the animate function in a ref.

**Verification:**

- GIF animation plays when visible
- Animation pauses when scrolled out of view (check via DevTools Performance tab — no rAF calls when hidden)
- Animation resumes smoothly when scrolled back into view

---

## Phase 3: PERF-008 + PERF-001 — Blob URL migration

**Goal:** Replace base64 data URLs with blob URLs throughout the Photo pipeline, eliminating large strings from Zustand state.

### Phase 3a: Update `scaleImage()` to return blob URL

**Files modified:**

- `lib/utils/image.ts`

**Steps:**

1. Change `scaleImage()` to use `canvas.toBlob()` instead of `canvas.toDataURL()`
2. Convert the blob to a blob URL via `URL.createObjectURL()`
3. Return the blob URL as the `dataUrl` field (type stays `string`)
4. For the no-scaling path (image already small enough), the input is still a data URL — convert it to a blob URL too for consistency

**Implementation sketch for scaleImage:**

```typescript
export async function scaleImage(
  dataUrl: string,
  maxDim: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width: ow, height: oh } = img;

      if (ow <= maxDim && oh <= maxDim) {
        // No scaling needed — but convert data URL to blob URL for consistency
        const blobUrl = dataUrlToBlob(dataUrl);
        resolve({ dataUrl: blobUrl, width: ow, height: oh });
        return;
      }

      // ... calculate newWidth, newHeight (same as before) ...

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          const blobUrl = URL.createObjectURL(blob);
          resolve({
            dataUrl: blobUrl,
            width: Math.round(newWidth),
            height: Math.round(newHeight),
          });
        },
        "image/jpeg",
        0.9,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
```

For the no-scale path, we need a helper:

```typescript
function dataUrlToBlobUrl(dataUrl: string): Promise<string> {
  return fetch(dataUrl)
    .then((r) => r.blob())
    .then((b) => URL.createObjectURL(b));
}
```

Actually, `fetch(dataUrl)` works for data URLs and is the cleanest way to convert. Make `scaleImage` fully async.

### Phase 3b: Add blob URL cleanup to editor store

**Files modified:**

- `stores/editor-store.ts`

**Steps:**

1. Create a helper function `revokePhotoUrls(photo: Photo | null)` that revokes `photo.dataUrl` and `photo.originalDataUrl` if they start with `blob:`
2. Call it in `setBeforePhoto`, `setAfterPhoto`, and `reset` before replacing the photo

**Implementation:**

```typescript
function revokePhotoUrls(photo: Photo | null) {
  if (!photo) return;
  if (photo.dataUrl.startsWith('blob:')) URL.revokeObjectURL(photo.dataUrl);
  if (photo.originalDataUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.originalDataUrl);
}

// In store:
setBeforePhoto: (photo) => set((state) => {
  revokePhotoUrls(state.beforePhoto);
  return { beforePhoto: photo };
}),
```

### Phase 3c: Update background removal to produce blob URLs

**Files modified:**

- `components/features/editor/PhotoPanel.tsx`
- `hooks/useExportBackgroundRemoval.ts`

**Steps:**

1. `removeBackground()` in `lib/segmentation/background-removal.ts` returns a data URL (from canvas.toDataURL). Check if it does.
2. If so, convert its output to a blob URL before storing on the Photo.
3. When storing `originalDataUrl`, revoke the old one if it exists.

### Phase 3d: Update test fixtures

**Files modified:**

- `tests/visual/lib/export-adapter.ts`
- `tests/hooks/useExportDownload.test.ts`

**Steps:**

1. Check if tests construct Photo objects with inline data URLs
2. If so, tests should continue to work since `loadImage()` accepts both data URLs and blob URLs
3. In test environments (Node.js/jsdom), `URL.createObjectURL` may not exist — may need a polyfill or mock

**Verification gate:**

```bash
npm run type-check
npm run lint
npm run build
```

---

## Phase 4: Integration verification

**Goal:** Verify the full pipeline works end-to-end.

**Steps:**

1. Run `npm run type-check` — must pass
2. Run `npm run lint` — must pass
3. Run `npm run build` — must pass
4. Manual verification checklist:
   - Drop two photos → preview renders correctly
   - Change alignment anchor → preview updates
   - Export PNG → downloads correctly
   - Export GIF → animates and downloads correctly
   - Apply background removal → photo updates, original is preserved
   - Revert background removal → original photo restored
   - Replace a photo → no memory leaks (check DevTools Memory tab)
   - Reset editor → no memory leaks

---

## Phasing Summary

| Phase | Finding  | Files                                         | Risk                                     |
| ----- | -------- | --------------------------------------------- | ---------------------------------------- |
| 1     | PERF-005 | AlignedPreview.tsx                            | Low — isolated change                    |
| 2     | PERF-006 | GifPreview.tsx                                | Low — isolated change                    |
| 3a    | PERF-008 | lib/utils/image.ts                            | Medium — changes image processing output |
| 3b    | PERF-001 | stores/editor-store.ts                        | Medium — adds cleanup logic              |
| 3c    | PERF-001 | PhotoPanel.tsx, useExportBackgroundRemoval.ts | Medium — bg removal integration          |
| 3d    | —        | test files                                    | Low — test compatibility                 |
| 4     | —        | —                                             | Verification only                        |

## Open Questions for Synthesis

1. **Should we keep the Photo.dataUrl field name?** Even though it's now a blob URL, the field name `dataUrl` is inaccurate. Renaming to `imageUrl` or `src` would be more honest but touches all 18 files. Trade-off: accuracy vs. blast radius.
2. **The `originalDataUrl` field** — same naming concern. Could rename to `originalSrc`.
3. **Test environment** — jsdom may not support `URL.createObjectURL`. Need to verify or add mock.
4. **Blob revocation timing** — If a component is still rendering an `<img src={blobUrl}>` when the store revokes the URL, the image will break. Need to ensure revocation happens only after the new photo is set (which it does in our implementation — revoke old, then set new).
5. **`readFileAsDataURL` still needed?** — After `scaleImage` returns blob URLs, the intermediate data URL from `readFileAsDataURL` is only used as input to `scaleImage`. This is fine — it's a temporary string that gets GC'd.
