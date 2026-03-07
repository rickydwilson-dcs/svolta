# Implementation Plan: User Zoom & Crop Override

**Date:** 2026-03-07
**Status:** Ready for implementation — approved by dual-model peer review
**Source:** Synthesised from Claude and Codex independent plans

## Key Differences Between Plans

| Aspect                       | Claude                                           | Codex                                                                                         | Synthesised Decision                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Naming**                   | `UserCropState` with `zoom/panX/panY`            | `UserFramingOverride` with `zoom/panX/panY/isActive`                                          | **`UserFramingOverride`** — "framing" better describes the intent (crop+pan). Drop `isActive` flag — use `zoom === 1 && panX === 0 && panY === 0` as the inactive check instead of a separate boolean. |
| **Gesture implementation**   | Dedicated `useZoomPanGestures` hook (new file)   | Inline pointer/touch/wheel handlers in PhotoPanel                                             | **Dedicated hook** (`useZoomPanGestures.ts`) — cleaner separation, reusable if we add gestures to AlignedPreview later, and keeps PhotoPanel focused on display.                                       |
| **PhotoPanel preview**       | CSS transforms on `<img>` element                | "Transform-driven framing preview" (same idea, less specific)                                 | **CSS transforms** — both agree on the approach. Claude's specifics (transform + overflow:hidden) are correct.                                                                                         |
| **Export hook plumbing**     | Pass through ExportOptions/GifExportOptions only | Also explicitly thread through `useCanvasExport.ts` and `useGifExport.ts` hooks               | **Codex's approach** — thread through the hooks too, since that's where ExportModal actually calls exports. Claude missed these intermediate hooks.                                                    |
| **Clamping strategy**        | Per-image clamp independently                    | Shared clamp — use the strictest bound across both images so panels stay linked               | **Codex's approach** — shared clamping is critical. If one image hits a pan limit, both must stop together, otherwise they desync.                                                                     |
| **Format switching**         | Keep zoom, reset pan on format change            | Not addressed                                                                                 | **Claude's approach** — keep zoom, reset pan. Zoom intent transfers; pan offset may not.                                                                                                               |
| **Testing**                  | Verification gates only                          | Explicit test phase with unit tests for `calculateAlignedDrawParams` + visual adapter updates | **Codex's approach** — add real tests, not just manual verification.                                                                                                                                   |
| **Debug metadata**           | Not mentioned                                    | Return optional `effectiveZoom/effectivePanX/effectivePanY/wasClamped` from the function      | **Include** — useful for UI feedback (e.g., showing when pan is clamped) and debugging. Add to `AlignedDrawResult`.                                                                                    |
| **`linkedZoom` store field** | Not addressed                                    | Notes it may be deprecated or repurposed                                                      | **Deprecate** — the new feature always links panels. The existing `linkedZoom` toggle was unused scaffolding. Remove `linkedZoom` and `toggleLinkedZoom` from the store.                               |

## Blind Spots Caught

**What Codex caught that Claude missed:**

- **Shared clamping across unequal aspect ratios** — when one image is wider than the other, their permissible pan ranges differ. The shared pan must be clamped to the strictest bound, not per-image independently. Without this, panels desync at edges.
- **Export hook threading** — `useCanvasExport.ts` and `useGifExport.ts` sit between the store and the export functions. Claude's plan threaded through `ExportOptions` but didn't update these hooks.
- **Debug metadata output** — returning `wasClamped` and effective values from `calculateAlignedDrawParams` enables UI hints (e.g., subtle resistance feedback when hitting pan limits).

**What Claude caught that Codex missed:**

- **Format switching behavior** — what happens to zoom/pan when user changes 1:1 → 4:5 → 9:16? Codex didn't address this. Pan reset on format change prevents disorienting jumps.
- **Accessibility** — `aria-label` on the slider, `role="application"` on gesture areas, keyboard-accessible zoom via Slider.
- **Cursor feedback** — `zoom-in`, `grab`, `grabbing` cursor states during interaction.
- **Minimum zoom is trivially 1.0** — Claude correctly identified that since the baseline is already cover-fit, zoom >= 1.0 can never create borders. The only edge case is pan at zoom 1.0, which is solved by clamping pan range to 0 at zoom 1.0.

---

## Implementation Plan

### Phase 1: Types & Store Foundation

**Step 1.1: Add UserFramingOverride type**

**Modify:** `types/editor.ts`

```typescript
export interface UserFramingOverride {
  zoom: number; // 1.0 = auto default, >1 = zoomed in. Range [1.0, 3.0]
  panX: number; // Normalized horizontal offset [-1, 1]. 0 = centered.
  panY: number; // Normalized vertical offset [-1, 1]. 0 = centered.
}

export const DEFAULT_USER_FRAMING: UserFramingOverride = {
  zoom: 1,
  panX: 0,
  panY: 0,
};
```

**Step 1.2: Add to editor store + clean up linkedZoom**

**Modify:** `stores/editor-store.ts`

- Add `userFraming: UserFramingOverride` state (initialized to `DEFAULT_USER_FRAMING`)
- Add actions: `setUserFraming(partial: Partial<UserFramingOverride>)`, `resetUserFraming()`
- Reset `userFraming` in existing `reset()` action
- Remove `linkedZoom: boolean`, `toggleLinkedZoom()` (dead scaffolding — new feature always links)

**Modify:** `components/features/editor/AlignmentControls.tsx` — remove `linkedZoom` / `toggleLinkedZoom` references

**Verification:**

- TypeScript compiles
- Existing tests pass
- No runtime errors in editor

---

### Phase 2: Core Algorithm — User Framing in `calculateAlignedDrawParams`

**Step 2.1: Extend function signature and AlignedDrawResult**

**Modify:** `lib/canvas/aligned-draw-params.ts`

Add optional parameter:

```typescript
export function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined | null,
  afterLandmarks: Landmark[] | undefined | null,
  targetWidth: number,
  targetHeight: number,
  userFraming?: { zoom: number; panX: number; panY: number },
): AlignedDrawResult;
```

Extend `AlignedDrawResult`:

```typescript
export interface AlignedDrawResult {
  before: DrawParams;
  after: DrawParams;
  useShoulderAlignment?: boolean;
  cropTopOffset?: number;
  // NEW — framing metadata
  effectiveZoom?: number;
  effectivePanX?: number;
  effectivePanY?: number;
  wasClamped?: boolean;
}
```

**Step 2.2: Implement Phase 5 — user framing override**

Add after existing Phase 4 (horizontal alignment), before the `return` statement:

```
Phase 5: User framing override (when userFraming provided and zoom > 1)

1. ZOOM: For each image (before, after):
   - Multiply drawWidth and drawHeight by zoom
   - Recenter: newDrawX = drawX - (drawWidth * (zoom - 1)) / 2
   - Recenter: newDrawY = drawY - (drawHeight * (zoom - 1)) / 2

2. PAN (shared bounds):
   - For each image, compute permissible panX range:
     maxPanShiftX = (drawWidth - targetWidth) / 2
     (ensure drawX stays <= 0 and drawX + drawWidth >= targetWidth)
   - Take the MINIMUM of both images' maxPanShiftX as the shared limit
   - Apply: drawX += panX * sharedMaxPanShiftX  (for both images)
   - Same logic for Y axis

3. CLAMP safety net:
   - Final clamp: drawX = min(0, drawX), ensure drawX + drawWidth >= targetWidth
   - Same for Y

4. Record metadata:
   - effectiveZoom = zoom
   - effectivePanX/Y = actual applied pan (may differ from requested if clamped)
   - wasClamped = true if any clamp was applied
```

**Key design: shared pan bounds.** Both images use the strictest permissible pan range so they never desync. If image A allows +-50px pan and image B allows +-30px, both use +-30px.

**Backward compatibility:** When `userFraming` is undefined or `{ zoom: 1, panX: 0, panY: 0 }`, Phase 5 is a no-op. Output is identical to before.

**Verification:**

- Add unit tests to `lib/canvas/__tests__/alignment.test.ts`:
  - Override absent → output unchanged
  - Zoom 2x → drawWidth/drawHeight doubled, centered
  - Pan at zoom 1.0 → no movement (pan range = 0)
  - Pan at zoom 2.0 → moves within bounds
  - Asymmetric images → shared clamp applied to both
- All existing alignment tests pass

---

### Phase 3: Thread Framing Through All Rendering Callers

**Step 3.1: AlignedPreview**

**Modify:** `components/features/editor/AlignedPreview.tsx`

- Read `userFraming` from `useEditorStore`
- Pass to `calculateAlignedDrawParams()` as 7th argument

**Step 3.2: PNG Export**

**Modify:** `lib/canvas/export.ts`

- Add `userFraming?: UserFramingOverride` to `ExportOptions`
- Pass through to `calculateAlignedDrawParams()` (and `calculateAlignedDrawParamsWithDebug`)

**Modify:** `hooks/useCanvasExport.ts`

- Read `userFraming` from store
- Include in options passed to `exportCanvas()`

**Step 3.3: GIF Export**

**Modify:** `lib/canvas/export-gif.ts`

- Add `userFraming?: UserFramingOverride` to `GifExportOptions`
- Pass through to `calculateAlignedDrawParams()`

**Modify:** `hooks/useGifExport.ts`

- Read `userFraming` from store
- Include in options passed to `exportGif()`

**Step 3.4: ExportModal**

**Modify:** `components/features/editor/ExportModal.tsx`

- Read `userFraming` from store (for any direct usage)
- On format change: call `setUserFraming({ panX: 0, panY: 0 })` (keep zoom, reset pan)

**Verification:**

- Set `userFraming.zoom = 2` via devtools → AlignedPreview zooms in
- Export PNG at zoom 2 → exported file is cropped tighter
- Export GIF at zoom 2 → all frames are cropped tighter
- With `userFraming` at defaults → output identical to before (regression check)

---

### Phase 4: Gesture Handling

**Step 4.1: Create `useZoomPanGestures` hook**

**Create:** `hooks/useZoomPanGestures.ts`

```typescript
interface ZoomPanGestureOptions {
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newPanX: number, newPanY: number) => void;
  getCurrentState: () => { zoom: number; panX: number; panY: number };
  minZoom?: number; // default 1.0
  maxZoom?: number; // default 3.0
  enabled?: boolean; // default true
}

export function useZoomPanGestures(
  containerRef: RefObject<HTMLElement>,
  options: ZoomPanGestureOptions,
): void;
```

**Gesture sources:**

1. **Wheel** — `e.deltaY` maps to zoom delta. Detect `e.ctrlKey` for trackpad pinch vs. scroll. `preventDefault()` on the container only.
2. **Touch** — Two-finger: track inter-finger distance for zoom, midpoint movement for pan. Single-finger: drag for pan. Use `touch-action: none` CSS on container + `{ passive: false }` listeners.
3. **Mouse** — `pointerdown` + `pointermove` + `pointerup` for drag pan. Use Pointer Events API (unified mouse/touch/pen).

**Performance:** Batch updates via `requestAnimationFrame`. Only write to store once per frame.

**No external dependency.** The gesture set (pinch + pan + wheel) is simple enough for a custom hook.

**Step 4.2: Attach to PhotoPanel**

**Modify:** `components/features/editor/PhotoPanel.tsx`

- Import `useZoomPanGestures`
- Attach to the photo container div
- Callbacks write to `setUserFraming` in store
- Both PhotoPanels share the same store state → automatically synced

**Step 4.3: CSS transform preview**

**Modify:** `components/features/editor/PhotoPanel.tsx`

Read `userFraming` from store. Apply to the photo `<img>` element:

```tsx
style={{
  transform: `scale(${userFraming.zoom}) translate(${panPixelsX}px, ${panPixelsY}px)`,
  transformOrigin: 'center',
}}
```

Convert normalized pan to pixel offset based on container dimensions. The container already has `overflow: hidden` via `rounded-2xl overflow-hidden`.

**Step 4.4: Cursor feedback**

**Modify:** `components/features/editor/PhotoPanel.tsx`

- Default cursor on photo: `cursor: zoom-in` (when `zoom < 3.0`)
- At max zoom: `cursor: grab`
- While dragging: `cursor: grabbing`

**Verification:**

- Desktop: scroll wheel zooms both panels
- Desktop: click-drag pans both panels
- Mobile: pinch zooms, single-finger drag pans
- Zoom clamped [1.0, 3.0], pan clamped to no-border bounds
- No page-level gesture conflicts (no accidental browser zoom or scroll)

---

### Phase 5: UI Controls

**Step 5.1: Add zoom slider to AlignmentControls**

**Modify:** `components/features/editor/AlignmentControls.tsx`

Add a "Framing" section separated from the existing "Align by" controls:

```
--- Framing ---
Crop Zoom: [1.0x ----slider---- 3.0x]
[Reset Framing]
```

- Slider: min 1.0, max 3.0, step 0.1, reads/writes `userFraming.zoom`
- Reset Framing button: calls `resetUserFraming()`
- Keep existing "Body Scale" and "Offset" controls in their own section, clearly labeled "Auto Alignment"
- Rename existing "Reset" button to "Reset Alignment" for clarity

**Step 5.2: Accessibility**

- Zoom slider: `aria-label="Crop zoom level"`
- Photo containers with gestures: `role="application"` and `aria-label="Before photo — scroll to zoom, drag to pan"` / similar for After
- Keyboard users can use the slider for zoom control

**Verification:**

- Slider and gestures stay bidirectionally synced
- Reset Framing returns to auto defaults
- Keyboard Tab → slider → arrow keys adjusts zoom
- Screen reader announces zoom level

---

### Phase 6: Edge Cases & Polish

**Step 6.1: No-landmarks fallback**

No code changes needed. `calculateAlignedDrawParams` falls back to cover-fit when landmarks are missing. Phase 5 (user framing) applies to the output regardless. Verify manually: upload two photos without clear poses, confirm zoom/pan works.

**Step 6.2: Format switching**

Already handled in Step 3.4: `setUserFraming({ panX: 0, panY: 0 })` on format change. Zoom is preserved.

**Step 6.3: Pan range at zoom 1.0**

At zoom 1.0, the draw dimensions equal or slightly exceed the target dimensions (due to cover-fit). The shared pan range formula `(drawWidth - targetWidth) / 2` yields ~0 at zoom 1.0, so pan is effectively locked. No special case needed — the math handles it.

**Verification:**

- Upload no-landmark photos → zoom/pan works
- Switch format 1:1 → 9:16 → zoom preserved, pan resets, no borders
- At zoom 1.0, drag does nothing (pan clamped to 0)

---

### Phase 7: Testing

**Step 7.1: Unit tests for Phase 5 algorithm**

**Modify:** `lib/canvas/__tests__/alignment.test.ts`

Add test cases:

- `calculateAlignedDrawParams` with no override → identical output (snapshot or exact comparison)
- With zoom 2.0 → drawWidth/drawHeight doubled for both images
- With pan at zoom 1.0 → effective pan is 0
- With pan at zoom 2.0 → shifts within bounds
- With asymmetric images → shared clamp is tightest bound
- `wasClamped` metadata is correct

**Step 7.2: Update visual test adapter**

**Modify:** `tests/visual/lib/export-adapter.ts` (if it exists and mirrors the draw logic)

- Pass through `userFraming` to match production code path

**Step 7.3: Integration smoke test**

Add a simple integration test or manual QA script that:

- Sets zoom 2.0 in store
- Triggers export
- Verifies exported image dimensions and crop differ from default

**Verification:**

- All tests green
- `npm run typecheck` passes
- `npm run lint` passes

---

## File Change Summary

| File                                               | Action     | Phase | Description                                                            |
| -------------------------------------------------- | ---------- | ----- | ---------------------------------------------------------------------- |
| `types/editor.ts`                                  | Modify     | 1     | Add `UserFramingOverride` type and defaults                            |
| `stores/editor-store.ts`                           | Modify     | 1     | Add `userFraming` state/actions, remove `linkedZoom`                   |
| `lib/canvas/aligned-draw-params.ts`                | Modify     | 2     | Add Phase 5 user framing logic + metadata in `AlignedDrawResult`       |
| `components/features/editor/AlignedPreview.tsx`    | Modify     | 3     | Thread `userFraming` from store to algorithm                           |
| `lib/canvas/export.ts`                             | Modify     | 3     | Accept `userFraming` in `ExportOptions`                                |
| `lib/canvas/export-gif.ts`                         | Modify     | 3     | Accept `userFraming` in `GifExportOptions`                             |
| `hooks/useCanvasExport.ts`                         | Modify     | 3     | Read `userFraming` from store, pass to export                          |
| `hooks/useGifExport.ts`                            | Modify     | 3     | Read `userFraming` from store, pass to export                          |
| `components/features/editor/ExportModal.tsx`       | Modify     | 3     | Reset pan on format change                                             |
| `hooks/useZoomPanGestures.ts`                      | **Create** | 4     | Gesture handling hook (wheel/touch/pointer)                            |
| `components/features/editor/PhotoPanel.tsx`        | Modify     | 4     | Attach gestures, CSS transform preview, cursor feedback                |
| `components/features/editor/AlignmentControls.tsx` | Modify     | 5     | Add Framing section with zoom slider + reset, remove linkedZoom toggle |
| `lib/canvas/__tests__/alignment.test.ts`           | Modify     | 7     | Add Phase 5 unit tests                                                 |
| `tests/visual/lib/export-adapter.ts`               | Modify     | 7     | Thread `userFraming` if adapter exists                                 |

## Risks & Mitigations

| Risk                                                  | Severity | Mitigation                                                                                                                                                                                                                 |
| ----------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSS transform preview doesn't match canvas export** | Medium   | PhotoPanel shows individual (non-aligned) photos. Exact WYSIWYG is in AlignedPreview (canvas). Accept the approximation — it's close enough for gesture feedback. If complaints arise, migrate PhotoPanel to canvas later. |
| **Shared pan clamping at asymmetric aspect ratios**   | High     | Core correctness issue. Use min(beforeMaxPan, afterMaxPan) for shared limit. Unit test with deliberately asymmetric images (portrait vs landscape).                                                                        |
| **Touch gesture conflicts on mobile**                 | Medium   | `touch-action: none` only on photo container. Single-finger outside container = normal scroll. Test on iOS Safari and Chrome Android.                                                                                      |
| **Two "scale" controls confuse users**                | Low      | Clear visual separation: "Auto Alignment" section (body scale, offset, anchor) vs "Framing" section (crop zoom). Consider collapsing auto-alignment controls behind a disclosure in a future iteration.                    |
| **Removing `linkedZoom` breaks something**            | Low      | Search codebase for all references before removing. It's only used in AlignmentControls toggle — no other consumers.                                                                                                       |
