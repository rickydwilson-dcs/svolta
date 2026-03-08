# YOLO Implementation Brief: Canvas & Memory Performance

**Branch:** feature/canvas-memory-perf (created from develop)
**Session spec:** output/sessions/2026-03-08_canvas-memory-perf/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The Svolta editor stores full base64-encoded photo data URLs directly inside the Zustand store, causing large state objects (~2-4MB per photo) that trigger unnecessary re-renders and consume excessive memory. Additionally, the canvas preview components lack rendering guards (no rAF batching, no visibility-based pausing). The plan replaces base64 data URLs with lightweight blob URLs throughout the photo pipeline, adds rAF guards to AlignedPreview, and adds IntersectionObserver to GifPreview.

The synthesis was reviewed and approved via dual-model peer review (Claude + Codex). Implement it exactly as specified below.

---

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15 / $75              | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.80 / $4             | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/canvas-memory-perf   # create feature branch from develop — NEVER write directly to develop
npm run type-check                            # must be clean before starting
```

---

## Phase 1: PERF-005 — Add rAF guard to AlignedPreview

**Goal:** Prevent redundant synchronous canvas draws when multiple deps change in the same render frame.
**Model:** sonnet — single file edit with canvas rendering logic

**Files modified:**

- `components/features/editor/AlignedPreview.tsx` (246 lines)

**Steps:**

1. Read `components/features/editor/AlignedPreview.tsx`
2. In Effect 2 (starts at approximately line 107), wrap the entire draw body in `requestAnimationFrame`
3. The null checks (`if (!canvas || !container || !beforeImg || !afterImg) return;`) must remain **outside** the rAF callback — return early before scheduling if preconditions aren't met
4. Store the rAF ID in a local variable and cancel it in the effect cleanup

**Implementation pattern:**

```typescript
React.useEffect(() => {
  const canvas = canvasRef.current;
  const container = containerRef.current;
  const { beforeImg, afterImg } = imagesRef.current;
  if (!canvas || !container || !beforeImg || !afterImg) return;

  const rafId = requestAnimationFrame(() => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ... all existing draw logic from lines ~117-227 ...

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

**Verification gate — STOP if this fails:**

```bash
npm run type-check
```

**Commit:**

```bash
git add components/features/editor/AlignedPreview.tsx
git commit -m "$(cat <<'EOF'
perf(canvas): add requestAnimationFrame guard to AlignedPreview draw effect (PERF-005)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: PERF-006 — Add IntersectionObserver to GifPreview

**Goal:** Pause the GIF animation loop when the component is not visible, saving CPU.
**Model:** sonnet — single file edit with animation loop restructuring

**Files modified:**

- `components/features/editor/GifPreview.tsx` (318 lines)

**Steps:**

1. Read `components/features/editor/GifPreview.tsx`
2. Add two new refs after the existing refs (around line 63-70):
   ```typescript
   const isVisibleRef = React.useRef(true);
   const animateFnRef = React.useRef<((ts: number) => void) | null>(null);
   ```
3. Add a new IntersectionObserver effect **before** the animation loop effect (before line 201). This effect:
   - Observes `containerRef.current` with `threshold: 0`
   - On intersection change: update `isVisibleRef.current`
   - When transitioning from hidden → visible: restart animation via `requestAnimationFrame(animateFnRef.current)`

   ```typescript
   React.useEffect(() => {
     const container = containerRef.current;
     if (!container) return;

     const observer = new IntersectionObserver(
       ([entry]) => {
         const wasVisible = isVisibleRef.current;
         isVisibleRef.current = entry.isIntersecting;
         if (!wasVisible && entry.isIntersecting && animateFnRef.current) {
           animationRef.current = requestAnimationFrame(animateFnRef.current);
         }
       },
       { threshold: 0 },
     );

     observer.observe(container);
     return () => observer.disconnect();
   }, []);
   ```

4. In the animation loop effect (Effect 3, starting around line 201), modify the `animate` function:
   - At the top of `animate`, check `if (!isVisibleRef.current)` → reset `startTime = null` and return (stop loop)
   - After defining `animate`, store it: `animateFnRef.current = animate;`
5. In the cleanup of the animation loop effect, also nullify: `animateFnRef.current = null;`

**Verification gate — STOP if this fails:**

```bash
npm run type-check
```

**Commit:**

```bash
git add components/features/editor/GifPreview.tsx
git commit -m "$(cat <<'EOF'
perf(canvas): pause GifPreview animation when off-screen via IntersectionObserver (PERF-006)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Create object URL lifecycle utility

**Goal:** Centralise blob URL creation and revocation to prevent leaks and double-revoke bugs.
**Model:** sonnet — new utility file + JSDoc update

**Files created:**

- `lib/utils/object-url.ts`

**Files modified:**

- `types/editor.ts` (JSDoc update only, 57 lines)

Spawn two agents in parallel:

**Task A: Create object-url.ts**
model: sonnet
Prompt: Create `lib/utils/object-url.ts` with these exports:

```typescript
import type { Photo } from "@/types/editor";

/** Create a blob URL from a Blob */
export function createBlobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** Check if a string is a blob URL */
export function isBlobUrl(src: string): boolean {
  return src.startsWith("blob:");
}

/** Safely revoke a blob URL (no-op for null, undefined, or non-blob strings) */
export function revokeBlobUrl(src?: string | null): void {
  if (src && isBlobUrl(src)) {
    URL.revokeObjectURL(src);
  }
}

/**
 * Revoke all blob URLs on a Photo object.
 * Guards against double-revoke when dataUrl === originalDataUrl.
 */
export function revokePhotoUrls(photo?: Photo | null): void {
  if (!photo) return;
  revokeBlobUrl(photo.dataUrl);
  // Only revoke originalDataUrl if it's different from dataUrl (prevent double-revoke)
  if (photo.originalDataUrl && photo.originalDataUrl !== photo.dataUrl) {
    revokeBlobUrl(photo.originalDataUrl);
  }
}
```

**Task B: Update Photo JSDoc**
model: haiku
Prompt: Read `types/editor.ts`. Update the JSDoc comments on the `Photo` interface:

- `dataUrl` → `/** Image source URL (blob: URL preferred, data: URL tolerated) */`
- `originalDataUrl` → `/** Original image source before background removal (blob: URL) */`
  Do NOT change any types or field names.

**Verification gate — STOP if this fails:**

```bash
npm run type-check
```

**Commit:**

```bash
git add lib/utils/object-url.ts types/editor.ts
git commit -m "$(cat <<'EOF'
refactor(utils): add object-url lifecycle utility for blob URL management (PERF-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Migrate scaleImage() to blob URLs (PERF-008 + PERF-001 core)

**Goal:** Change `scaleImage()` to produce blob URLs instead of base64 data URLs.
**Model:** sonnet — core pipeline change across 2 files

**Files modified:**

- `lib/utils/image.ts` (185 lines)
- `lib/canvas/load-image.ts` (18 lines)

Spawn two agents in parallel:

**Task A: Rewrite scaleImage in image.ts**
model: sonnet
Prompt: Read `lib/utils/image.ts`. Make these changes:

1. Add import: `import { createBlobUrl } from './object-url';`
2. Rewrite `scaleImage()` to use `canvas.toBlob()` instead of `canvas.toDataURL()`:

   **Scaling path** (image exceeds maxDim):
   - Keep existing dimension calculation logic exactly as-is
   - Replace `const scaledDataUrl = canvas.toDataURL('image/jpeg', 0.9);` with:
     ```typescript
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
     ```

   **No-scaling path** (image already ≤ maxDim):
   - Replace the early return that passes through the data URL unchanged with:
     ```typescript
     const response = await fetch(dataUrl);
     const blob = await response.blob();
     return {
       dataUrl: createBlobUrl(blob),
       width: originalWidth,
       height: originalHeight,
     };
     ```

3. The function must become fully async (no longer wrapped in `new Promise` with `img.onload`). Refactor to use a local image-loading helper:

   ```typescript
   function loadImageElement(src: string): Promise<HTMLImageElement> {
     return new Promise((resolve, reject) => {
       const img = new Image();
       img.onload = () => resolve(img);
       img.onerror = () => reject(new Error("Failed to load image"));
       img.src = src;
     });
   }
   ```

4. Keep the function signature exactly: `scaleImage(dataUrl: string, maxDim: number): Promise<{ dataUrl: string; width: number; height: number }>`

5. Do NOT change `processImage()`, `readFileAsDataURL()`, `generateId()`, or `validateImageFile()`.

**Task B: Rename param in load-image.ts**
model: haiku
Prompt: Read `lib/canvas/load-image.ts`. Rename the parameter `dataUrl` to `src` in both the JSDoc and function signature. Update the JSDoc `@param` line accordingly. No behavioral change.

**Verification gate — STOP if this fails:**

```bash
npm run type-check
npm run lint
```

**Commit:**

```bash
git add lib/utils/image.ts lib/canvas/load-image.ts
git commit -m "$(cat <<'EOF'
perf(image): replace toDataURL with toBlob + blob URLs in scaleImage (PERF-008, PERF-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Add blob URL cleanup to editor store

**Goal:** Revoke blob URLs when photos are replaced or the editor is reset.
**Model:** sonnet — single store file modification

**Files modified:**

- `stores/editor-store.ts` (126 lines)

**Steps:**

1. Read `stores/editor-store.ts`
2. Add import: `import { revokePhotoUrls } from '@/lib/utils/object-url';`
3. Update `setBeforePhoto`:
   ```typescript
   setBeforePhoto: (photo) => set((state) => {
     revokePhotoUrls(state.beforePhoto);
     return { beforePhoto: photo };
   }),
   ```
4. Update `setAfterPhoto`:
   ```typescript
   setAfterPhoto: (photo) => set((state) => {
     revokePhotoUrls(state.afterPhoto);
     return { afterPhoto: photo };
   }),
   ```
5. Update `reset()`:
   ```typescript
   reset: () => set((state) => {
     revokePhotoUrls(state.beforePhoto);
     revokePhotoUrls(state.afterPhoto);
     return {
       beforePhoto: null,
       afterPhoto: null,
       alignment: initialAlignment,
       showLandmarks: true,
       showGrid: false,
       userFraming: DEFAULT_USER_FRAMING,
       backgroundSettings: defaultBackgroundSettings,
       isDetecting: false,
       error: null,
     };
   }),
   ```

**Verification gate — STOP if this fails:**

```bash
npm run type-check
```

**Commit:**

```bash
git add stores/editor-store.ts
git commit -m "$(cat <<'EOF'
fix(store): revoke blob URLs on photo replacement and editor reset (PERF-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Migrate background removal to blob URLs

**Goal:** Ensure `removeBackground()` and `applyBackground()` return blob URLs instead of data URLs.
**Model:** sonnet — modifying library with async canvas pattern, verifying consumers

**Files modified:**

- `lib/segmentation/background-removal.ts` (317 lines)
- `components/features/editor/PhotoPanel.tsx` (377 lines) — verify only, edit if needed
- `hooks/useExportBackgroundRemoval.ts` (93 lines) — verify only, edit if needed

**Steps:**

1. Read `lib/segmentation/background-removal.ts`
2. Add import: `import { createBlobUrl } from '@/lib/utils/object-url';`
3. In `removeBackground()` (line 200): Replace `const processedDataUrl = await blobToDataUrl(resultBlob);` with:

   ```typescript
   const processedDataUrl = createBlobUrl(resultBlob);
   ```

   Note: `extractMaskFromTransparentImage(processedDataUrl, ...)` on line 203 uses this as an image src — blob URLs work with `loadImage()`, so this is transparent.

4. In `applyBackground()` (line 295): Replace `return canvas.toDataURL('image/png', 1.0);` with:

   ```typescript
   return new Promise<string>((resolve, reject) => {
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

   This makes the function body async at this point. The function already returns `Promise<string>`, so the return type is unchanged.

5. Delete the `blobToDataUrl` helper function (lines 86-93) — no longer needed.

6. Read `components/features/editor/PhotoPanel.tsx` and `hooks/useExportBackgroundRemoval.ts`. Verify that:
   - They call `removeBackground(photo.dataUrl)` and use the result's `.processedDataUrl` — this now returns a blob URL, which is correct
   - They store `originalDataUrl: photo.originalDataUrl || photo.dataUrl` — this correctly preserves the original blob URL
   - The store setter (`setBeforePhoto`/`setAfterPhoto`) handles revocation of the old URL — confirmed in Phase 5
   - No code assumes `data:` prefix on these values

**Verification gate — STOP if this fails:**

```bash
npm run type-check
npm run lint
```

**Commit:**

```bash
git add lib/segmentation/background-removal.ts
git commit -m "$(cat <<'EOF'
perf(segmentation): return blob URLs from removeBackground and applyBackground (PERF-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7: Compatibility sweep and final validation

**Goal:** Verify all 18 `dataUrl` consumers compile and function correctly with blob URLs.
**Model:** haiku — mechanical grep + read verification; sonnet if test edits needed

**Files to verify (read-only unless changes needed):**

| File                                        | Lines | What to check                                      |
| ------------------------------------------- | ----- | -------------------------------------------------- |
| `hooks/useCanvasExport.ts`                  | 120   | passes photo.dataUrl to export → transparent       |
| `hooks/useGifExport.ts`                     | 212   | passes photo.dataUrl to GIF export → transparent   |
| `hooks/usePoseDetection.ts`                 | 141   | passes dataUrl string to MediaPipe → transparent   |
| `lib/canvas/export.ts`                      | 367   | calls loadImage(beforePhoto.dataUrl) → transparent |
| `lib/canvas/export-gif.ts`                  | 339   | calls loadImage(beforePhoto.dataUrl) → transparent |
| `lib/mediapipe/pose-detector.ts`            | 279   | loads image from src string → transparent          |
| `components/features/editor/DropZone.tsx`   | 285   | `<img src={photo.dataUrl}>` → works with blob URLs |
| `components/features/editor/PhotoPanel.tsx` | 377   | `<img src={photo.dataUrl}>` → works with blob URLs |
| `tests/visual/lib/export-adapter.ts`        | 518   | constructs Photo objects for tests                 |
| `tests/hooks/useExportDownload.test.ts`     | 180   | references dataUrl in mocks                        |

**Steps:**

1. Run grep to confirm no code assumes `data:` prefix:

   ```bash
   rg "startsWith\(['\"]data:" lib/ hooks/ components/ --type ts --type tsx
   ```

   Should return zero matches.

2. Read test files (`tests/visual/lib/export-adapter.ts`, `tests/hooks/useExportDownload.test.ts`). Check if they construct Photo objects with inline data URLs. If so:
   - Tests should still work since `loadImage()` accepts both data URLs and blob URLs
   - If tests use `URL.createObjectURL`, check if jsdom provides it. If not, add a mock in the test setup or at the top of the test file:
     ```typescript
     if (typeof URL.createObjectURL === "undefined") {
       URL.createObjectURL = jest.fn(() => "blob:mock-url");
       URL.revokeObjectURL = jest.fn();
     }
     ```

3. Read all consumer files listed above in parallel. Confirm none parse or inspect the data URL string content.

4. Run full verification:

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
npm run build
```

**Commit (only if test changes were needed):**

```bash
git add tests/
git commit -m "$(cat <<'EOF'
test: update test fixtures for blob URL compatibility (PERF-001)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If no test changes were needed, skip this commit.

---

## Cost Estimate

| Phase                         | Model          | Est. input tokens             | Est. output tokens | Est. cost  |
| ----------------------------- | -------------- | ----------------------------- | ------------------ | ---------- |
| Pre-flight                    | sonnet         | ~3k                           | ~0.5k              | ~$0.02     |
| Phase 1: rAF guard            | sonnet         | ~8k (246L file + brief)       | ~1.5k              | ~$0.05     |
| Phase 2: IntersectionObserver | sonnet         | ~9k (318L file + brief)       | ~2k                | ~$0.06     |
| Phase 3: object-url utility   | sonnet + haiku | ~7k (new file + 57L type)     | ~1.5k              | ~$0.04     |
| Phase 4: scaleImage migration | sonnet + haiku | ~10k (185L + 18L + brief)     | ~2.5k              | ~$0.07     |
| Phase 5: store cleanup        | sonnet         | ~8k (126L file + brief)       | ~1.5k              | ~$0.05     |
| Phase 6: bg removal migration | sonnet         | ~14k (317L + 377L + 93L)      | ~2k                | ~$0.07     |
| Phase 7: compatibility sweep  | haiku + sonnet | ~20k (10 files, ~2.8kL total) | ~1k                | ~$0.06     |
| **Total**                     |                | **~79k**                      | **~12.5k**         | **~$0.42** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.80/$4 per MTok.
Estimation: ~5 tokens per line of code. Input = files read + brief (~3k) + system prompt (~3k). Output = code written + verification output (~500/gate).

---

## Final Report

After all phases complete, output:

1. Phases completed — list each with commit SHA
2. Build status — confirm `npm run lint && npm run type-check && npm run build` passes
3. Any exceptions or intentional deviations from the plan
4. Token usage and cost estimate:

   | Model     | Est. input tokens     | Est. output tokens | Est. cost |
   | --------- | --------------------- | ------------------ | --------- |
   | sonnet    | [total across phases] |                    | $X.XX     |
   | haiku     | [if used]             |                    | $X.XX     |
   | opus      | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_canvas-memory-perf/yolo-brief.md`:

```markdown
## Completed

**Date:** [today]
**Status:** All phases executed successfully

[1-paragraph summary: what was implemented, any surprises]

### Commits

[list each commit SHA and message]
```

Confirm this was done in the final report.

---

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

All 7 phases were implemented as specified with no deviations. Phase 1 added a `requestAnimationFrame` guard to `AlignedPreview` Effect 2 (null checks remain outside rAF, rafId cancelled in cleanup). Phase 2 added `IntersectionObserver` + `isVisibleRef`/`animateFnRef` to `GifPreview` to pause the animation loop when off-screen. Phase 3 created the `lib/utils/object-url.ts` utility with `createBlobUrl`, `isBlobUrl`, `revokeBlobUrl`, and `revokePhotoUrls`, and updated `Photo` JSDoc. Phase 4 rewrote `scaleImage()` to be fully async using a `loadImageElement` helper and `canvas.toBlob()`, and renamed the `loadImage` param to `src`. Phase 5 added `revokePhotoUrls` calls to `setBeforePhoto`, `setAfterPhoto`, and `reset` in the editor store. Phase 6 removed `blobToDataUrl` and replaced it with `createBlobUrl(resultBlob)` in `removeBackground`, and swapped `toDataURL` for `toBlob` in `applyBackground`. Phase 7 confirmed zero `startsWith('data:')` matches in photo pipeline code (one unrelated CORS helper in backgrounds.ts) and that all consumers are transparent to blob URLs. All three verification gates (type-check, lint, build) passed throughout.

### Commits

- `3b4b46b` perf(canvas): add requestAnimationFrame guard to AlignedPreview draw effect (PERF-005)
- `a7ba94a` perf(canvas): pause GifPreview animation when off-screen via IntersectionObserver (PERF-006)
- `efe67f3` refactor(utils): add object-url lifecycle utility for blob URL management (PERF-001)
- `250057b` perf(image): replace toDataURL with toBlob + blob URLs in scaleImage (PERF-008, PERF-001)
- `352a690` fix(store): revoke blob URLs on photo replacement and editor reset (PERF-001)
- `2cb00b4` perf(segmentation): return blob URLs from removeBackground and applyBackground (PERF-001)

---

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/canvas-memory-perf` — NEVER commit directly to develop
