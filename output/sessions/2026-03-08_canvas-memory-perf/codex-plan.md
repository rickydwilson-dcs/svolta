# Codex Implementation Plan: Canvas & Memory Performance

## 1. Architectural stance (independent review)

1. Keep the `Photo` API surface stable (`photo.dataUrl` remains the field name) and change semantics from "always base64 data URL" to "image src string (`blob:` preferred, `data:` tolerated)".
2. Combine PERF-001 and PERF-008 into one migration path: generating blob-backed image sources at ingest time (`processImage`/`scaleImage`) removes large base64 payloads from Zustand and avoids synchronous `toDataURL` memory spikes.
3. Add a central object URL lifecycle utility and enforce cleanup on replacement/reset/background swaps; this is required to avoid trading one memory issue for another.
4. Treat GIF/PNG export and canvas loaders as compatibility consumers of `src` strings; because `loadImage()` already accepts any URL-like source, export should remain transparent.

## 2. Scope gaps to resolve before coding

1. Background-removal currently reintroduces base64 via `processedDataUrl` and `applyBackground(...)->toDataURL`; this must be included in scope or acceptance criterion #1 will be violated after a user clicks "Remove background".
2. `Photo.file` currently keeps original binary in state (small metadata + File reference, not base64 string). Confirm this is acceptable for PERF-001; if not, a deeper store normalization is needed.
3. SSR/test environment assumptions for `URL.createObjectURL`/`URL.revokeObjectURL` must be explicitly handled in tests.

## 3. Phase plan

### Phase 0: Baseline and guardrails

1. Inventory all `dataUrl` and `originalDataUrl` mutations/reads; classify as producer vs consumer.
2. Add temporary instrumentation (dev-only logs/assertions) to detect when `Photo.dataUrl` is still a large `data:` string after migration paths.

Files

1. `/Users/rickywilson/Sites/svolta/lib/utils/image.ts`
2. `/Users/rickywilson/Sites/svolta/hooks/useExportBackgroundRemoval.ts`
3. `/Users/rickywilson/Sites/svolta/components/features/editor/PhotoPanel.tsx`
4. `/Users/rickywilson/Sites/svolta/stores/editor-store.ts`

Verification gate

1. `rg -n "dataUrl|originalDataUrl"` map reviewed and no producer path missed before edits proceed.

### Phase 1: Introduce object URL lifecycle primitives

1. Create a dedicated utility for URL handling:
   - `createObjectUrl(blob: Blob): string`
   - `isBlobUrl(src: string): boolean`
   - `revokeObjectUrl(src?: string | null): void`
   - `revokePhotoUrls(photo?: Photo | null): void` (revokes current and original if blob URLs, de-duped)
2. Keep utility browser-safe and no-op gracefully when URL APIs unavailable in tests.

Files

1. Create `/Users/rickywilson/Sites/svolta/lib/utils/object-url.ts`
2. Update `/Users/rickywilson/Sites/svolta/types/editor.ts` (comment/docs only: `dataUrl` now "image source URL")

Verification gate

1. Unit tests for utility edge cases (duplicate URL revocation, undefined/null, non-blob `data:` input).

### Phase 2: Migrate ingest/scaling to `toBlob` + blob URL (PERF-008 + core PERF-001)

1. Refactor `scaleImage` contract to produce blob-backed source:
   - Load input src as before.
   - Draw to canvas.
   - Use async `canvas.toBlob('image/jpeg', 0.9)`.
   - Convert Blob to object URL.
2. Update `processImage` to avoid keeping base64 in final `Photo`:
   - Read file as object URL (preferred) or temporary data URL only as internal transitional input.
   - Ensure any temporary object URLs are revoked once superseded.
3. Maintain backward compatibility in function signatures where needed (`string` src in/out) to avoid touching all 18 consumers at once.

Files

1. `/Users/rickywilson/Sites/svolta/lib/utils/image.ts`
2. `/Users/rickywilson/Sites/svolta/lib/canvas/load-image.ts` (parameter name/docs from `dataUrl` to `src`, no behavioral change)
3. Any affected tests under `/Users/rickywilson/Sites/svolta/tests` and `/Users/rickywilson/Sites/svolta/hooks`

Verification gate

1. Uploaded image yields `photo.dataUrl.startsWith('blob:') === true` in runtime check.
2. No `canvas.toDataURL(` remains in `lib/utils/image.ts`.
3. TypeScript compile passes for updated signatures.

### Phase 3: Store cleanup policy + background-removal integration

1. Enforce revocation in `stores/editor-store.ts` setters:
   - Before replacing `beforePhoto`/`afterPhoto`, revoke blob URLs from previous photo.
   - On `reset()`, revoke both photos before nulling state.
   - Guard against revoking reused URLs if identical.
2. Update background-removal outputs to stay blob-backed:
   - In `lib/segmentation/background-removal.ts`, replace blob->dataURL conversion with object URL for `processed` output.
   - For `applyBackground`, switch `canvas.toDataURL` to `toBlob` + object URL.
3. Update photo update paths (`PhotoPanel`, `useExportBackgroundRemoval`) so `originalDataUrl` and `dataUrl` both follow blob URL lifecycle rules and old replaced URLs are revoked through store setters.

Files

1. `/Users/rickywilson/Sites/svolta/stores/editor-store.ts`
2. `/Users/rickywilson/Sites/svolta/lib/segmentation/background-removal.ts`
3. `/Users/rickywilson/Sites/svolta/hooks/useBackgroundRemoval.ts` (types/comments)
4. `/Users/rickywilson/Sites/svolta/hooks/useExportBackgroundRemoval.ts`
5. `/Users/rickywilson/Sites/svolta/components/features/editor/PhotoPanel.tsx`

Verification gate

1. Replace/remove/reset flows do not leak URLs (manual check + test spy on `URL.revokeObjectURL`).
2. Background remove/restore keeps working and `photo.dataUrl` remains blob-backed.
3. No behavioral regressions in export hooks consuming `photo.dataUrl`.

### Phase 4: Rendering loop controls (PERF-005, PERF-006)

1. `AlignedPreview.tsx`:
   - Wrap canvas draw effect body in `requestAnimationFrame`.
   - Cancel pending frame on effect cleanup to prevent stacked draws.
2. `GifPreview.tsx`:
   - Add `IntersectionObserver` on container to derive `isVisible`.
   - Gate animation loop start on `isReady && isVisible`.
   - Cancel frame immediately when hidden; resume fresh when visible.
3. Keep existing image pre-render behavior unchanged unless profiling proves additional benefit.

Files

1. `/Users/rickywilson/Sites/svolta/components/features/editor/AlignedPreview.tsx`
2. `/Users/rickywilson/Sites/svolta/components/features/editor/GifPreview.tsx`

Verification gate

1. Hidden GIF preview has no active rAF loop.
2. Scrolling preview back into view resumes animation without duplicated loops.
3. Aligned preview produces same visual output while reducing redundant draws.

### Phase 5: Compatibility sweep across all `dataUrl` consumers + final validation

1. Verify all 18 listed consumers still compile and run with blob-backed `photo.dataUrl`.
2. Update tests/mocks that assume literal `data:*` strings where behavior now expects `blob:*` permissively.
3. Run full project checks and targeted manual export flow.

Files

1. `/Users/rickywilson/Sites/svolta/hooks/useCanvasExport.ts`
2. `/Users/rickywilson/Sites/svolta/hooks/useGifExport.ts`
3. `/Users/rickywilson/Sites/svolta/hooks/useExportBackgroundRemoval.ts`
4. `/Users/rickywilson/Sites/svolta/hooks/usePoseDetection.ts`
5. `/Users/rickywilson/Sites/svolta/lib/canvas/export.ts`
6. `/Users/rickywilson/Sites/svolta/lib/canvas/export-gif.ts`
7. `/Users/rickywilson/Sites/svolta/tests/visual/lib/export-adapter.ts`
8. `/Users/rickywilson/Sites/svolta/tests/hooks/useExportDownload.test.ts`
9. Other touched tests as required

Verification gate

1. `npm run typecheck` passes.
2. Relevant test suites pass.
3. Manual end-to-end check: upload two large images, align preview smooth, GIF preview pauses off-screen, export PNG+GIF succeeds.

## 4. Risks and trade-offs

1. `dataUrl` naming mismatch: keeping field name avoids large churn but can confuse future contributors; mitigate via explicit type docs and TODO for eventual rename to `src`.
2. URL revocation timing: revoking too early causes broken image loads; centralize revocation only at ownership boundaries (store replacement/reset).
3. Background-removal output format changes may affect tests relying on deterministic data URL strings.
4. Object URL APIs are browser-only; unit tests need mocks and no-op fallback to avoid flaky CI.
5. rAF guard likely helps during rapid state churn, but measurable gains should be confirmed with React Profiler/perf timeline before further complexity.
