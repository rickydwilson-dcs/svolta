# Claude's Implementation Plan: User Zoom & Crop Override

**Date:** 2026-03-07
**Author:** Claude (independent plan — written before seeing Codex's plan)

---

## Architecture Decision: Where User Zoom Lives

The user zoom/pan is conceptually separate from auto-alignment. Auto-alignment matches body scale and position between photos. User zoom is an additional layer that crops/reframes the already-aligned result.

**Decision:** Add a new `userCrop` state object to the editor store, separate from `AlignmentSettings`. Pass it as a new parameter to `calculateAlignedDrawParams()` so the single source of truth applies it during rendering.

```typescript
interface UserCropState {
  zoom: number; // 1.0 = auto default, >1 = zoomed in. Range [1.0, 3.0]
  panX: number; // Normalized offset from center [-1, 1]. 0 = centered.
  panY: number; // Normalized offset from center [-1, 1]. 0 = centered.
}
```

**Why not extend AlignmentSettings?** AlignmentSettings is auto-computed from landmarks. Mixing user-driven values into it creates confusion about what's calculated vs. user-chosen. A separate slice is clearer.

**Why normalized values?** The same zoom/pan values work across different export resolutions and aspect ratios without recalculation.

---

## Phase 1: Store & Type Foundation

### Step 1.1: Add UserCropState type

**Modify:** `types/editor.ts`

Add:

```typescript
export interface UserCropState {
  zoom: number; // 1.0 = default (auto framing), max 3.0
  panX: number; // -1 to 1, normalized horizontal offset
  panY: number; // -1 to 1, normalized vertical offset
}

export const DEFAULT_USER_CROP: UserCropState = {
  zoom: 1,
  panX: 0,
  panY: 0,
};
```

### Step 1.2: Add to editor store

**Modify:** `stores/editor-store.ts`

Add state:

- `userCrop: UserCropState` (initialized to DEFAULT_USER_CROP)

Add actions:

- `setUserCrop(crop: Partial<UserCropState>)` — merges partial updates
- `resetUserCrop()` — resets to DEFAULT_USER_CROP

Reset `userCrop` in the existing `reset()` action.

### Verification Gate

- TypeScript compiles with no errors
- Existing tests pass — no regressions from type additions

---

## Phase 2: Integrate User Zoom into Alignment Pipeline

### Step 2.1: Add userCrop parameter to `calculateAlignedDrawParams`

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
  userCrop?: { zoom: number; panX: number; panY: number }, // NEW
): AlignedDrawResult;
```

**Implementation:** After the existing 4 phases complete, apply user crop as Phase 5:

```
Phase 5: User crop override
- Multiply both drawWidth/drawHeight by userCrop.zoom
- Recenter: adjust drawX/drawY so the zoom is centered on the current view center
- Apply pan: offset drawX by panX * (drawWidth - targetWidth) * 0.5
- Apply pan: offset drawY by panY * (drawHeight - targetHeight) * 0.5
- Clamp: ensure image edges don't pull away from panel edges
```

The key insight: zoom multiplies the already-computed draw dimensions. Pan shifts within the zoomed view. Both operate on the output of phases 1-4, not replacing them.

**Clamping logic:**

- After zoom: `drawX` must be <= 0 and `drawX + drawWidth` must be >= targetWidth (no left/right borders)
- Same for Y axis
- If zoom = 1 and pan = 0, output is identical to before (backward compatible)

### Step 2.2: Thread userCrop through all callers

**Modify:** `components/features/editor/AlignedPreview.tsx`

- Read `userCrop` from editor store via `useEditorStore`
- Pass to `calculateAlignedDrawParams()` as the new parameter

**Modify:** `lib/canvas/export.ts` (`exportCanvas`)

- Add `userCrop?: UserCropState` to `ExportOptions`
- Pass through to `calculateAlignedDrawParams()`

**Modify:** `lib/canvas/export-gif.ts` (`exportGif`)

- Add `userCrop?: UserCropState` to `GifExportOptions`
- Pass through to `calculateAlignedDrawParams()`

**Modify:** `components/features/editor/ExportModal.tsx`

- Read `userCrop` from editor store
- Pass to export functions via options

### Verification Gate

- With `userCrop` undefined or `{ zoom: 1, panX: 0, panY: 0 }`, all rendering is pixel-identical to before
- Manually set `userCrop.zoom = 2` in store — preview and export both zoom in
- TypeScript compiles, existing tests pass

---

## Phase 3: Gesture Handling on PhotoPanel

### Step 3.1: Create `useZoomPanGestures` hook

**Create:** `hooks/useZoomPanGestures.ts`

A custom hook that attaches gesture handlers to a container ref:

```typescript
export function useZoomPanGestures(
  containerRef: RefObject<HTMLElement>,
  options: {
    onZoom: (zoomDelta: number) => void;
    onPan: (dx: number, dy: number) => void;
    enabled: boolean;
  },
);
```

**Gesture sources:**

1. **Wheel events** — `deltaY` maps to zoom. Use `e.ctrlKey` to distinguish pinch-on-trackpad from scroll. `e.preventDefault()` on the container only.
2. **Touch events** — Two-finger pinch: track distance between touches, map delta to zoom. Single-finger drag: map to pan. Use `{ passive: false }` to allow `preventDefault()`.
3. **Mouse drag** — `mousedown` + `mousemove` + `mouseup` for desktop pan.

**No external library needed.** The gestures are simple enough (zoom + 2D pan) that a custom hook keeps the bundle small and avoids dependency risk.

**Performance:** Gesture handlers update store via `requestAnimationFrame` throttling to cap at 60fps.

### Step 3.2: Attach gestures to PhotoPanel

**Modify:** `components/features/editor/PhotoPanel.tsx`

- Import and use `useZoomPanGestures` hook
- The hook writes to `setUserCrop` in the editor store
- Both PhotoPanels write to the same shared `userCrop` state, so they're automatically synced

**Zoom behavior:**

- Zoom is relative: `newZoom = clamp(currentZoom * (1 + delta), 1.0, 3.0)`
- Pan is relative: `newPanX = clamp(currentPanX + dx, minPanX, maxPanX)`
- Min pan is dynamic: at zoom 1.0, pan range is 0 (can't pan when not zoomed). At zoom 2.0, pan range is wider.

### Step 3.3: Visual feedback in PhotoPanel

**Modify:** `components/features/editor/PhotoPanel.tsx`

Apply CSS transforms to the photo `<img>` element to preview the zoom/pan:

```css
transform: scale(${userCrop.zoom}) translate(${panX}px, ${panY}px);
transform-origin: center;
```

This gives instant visual feedback without canvas re-rendering. The `overflow: hidden` on the container clips the zoomed image.

**Why CSS transforms instead of canvas?** PhotoPanel shows individual photos (not aligned composites). CSS transforms are simpler, faster, and don't require a canvas. The aligned rendering (AlignedPreview, exports) uses the canvas pipeline in Phase 2.

### Verification Gate

- Scroll wheel on either photo panel zooms both panels visually
- Drag pans both panels
- On mobile (or trackpad): pinch gesture zooms
- Zoom is clamped at 1.0 (min) and 3.0 (max)
- Pan is clamped — image never shows borders

---

## Phase 4: UI Controls

### Step 4.1: Add zoom slider to AlignmentControls

**Modify:** `components/features/editor/AlignmentControls.tsx`

Add a "Crop Zoom" slider below the existing scale controls:

- Label: "Crop Zoom"
- Range: 1.0x to 3.0x
- Step: 0.1
- Reads/writes `userCrop.zoom` from store
- Reset button already exists — extend it to also call `resetUserCrop()`

### Step 4.2: Add reset crop button

**Modify:** `components/features/editor/AlignmentControls.tsx`

Add a "Reset Crop" button (or extend the existing "Reset" button to also reset user crop).

Alternatively, the existing Auto-align button could also reset user crop, since "auto-align" implies "go back to automatic framing."

### Step 4.3: Cursor feedback

**Modify:** `components/features/editor/PhotoPanel.tsx`

- When hovering over photo: `cursor: zoom-in` (when zoom < max)
- When dragging: `cursor: grabbing`
- When at max zoom and hovering: `cursor: grab`

### Verification Gate

- Slider controls zoom level, synced with gesture-driven zoom
- Reset returns to auto framing
- Cursor changes appropriately

---

## Phase 5: Edge Cases & Polish

### Step 5.1: No-landmarks fallback

When landmarks are not detected, `calculateAlignedDrawParams` currently falls back to cover-fit. User zoom should still work in this case — Phase 2's zoom logic applies to the drawParams output regardless of whether landmarks were used.

**Verify:** Upload two photos without clear poses. Zoom and pan should still work on the cover-fit result.

### Step 5.2: Format switching behavior

**Decision:** When user switches export format (1:1 -> 4:5 -> 9:16), keep the zoom level but reset pan to (0, 0). Rationale: the user's zoom intent ("I want a tight crop") transfers across formats, but the pan offset may not make sense in a different aspect ratio.

**Modify:** `components/features/editor/ExportModal.tsx` — on format change, call `setUserCrop({ panX: 0, panY: 0 })` (keep zoom).

### Step 5.3: Minimum zoom calculation

At zoom = 1.0, the image must still fill the panel (no borders). This is already guaranteed by the existing cover-fit + overflow normalization in `calculateAlignedDrawParams`. The user zoom multiplier starts at 1.0, so anything >= 1.0 only makes the image larger — it can never create borders.

**Exception:** If pan is applied at exactly zoom 1.0. Solution: at zoom 1.0, pan range is 0 (clamped). Pan range scales with `(zoom - 1)`.

### Step 5.4: Accessibility

- Zoom slider is keyboard-accessible via existing Slider component
- Add `aria-label="Crop zoom level"` to the slider
- Gesture areas have `role="application"` to indicate custom interaction

### Verification Gate

- All acceptance criteria from brief pass
- No-landmark photos work with zoom/pan
- Format switching keeps zoom, resets pan
- Keyboard-only users can control zoom via slider

---

## Risks & Trade-offs

| Risk                                                                | Mitigation                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CSS transform in PhotoPanel doesn't match canvas output exactly** | The PhotoPanel preview is an approximation. Exact WYSIWYG is in AlignedPreview (canvas). This is acceptable because PhotoPanel shows individual photos, not the composite.                                                                                                                                                |
| **Performance on low-end mobile**                                   | Gesture handlers are throttled to rAF. CSS transforms are GPU-accelerated. The heavy work (canvas rendering) only happens in AlignedPreview, not on every gesture frame.                                                                                                                                                  |
| **Touch gesture conflicts with page scroll**                        | Only prevent default on the photo container element, not the page. Two-finger gestures on the container = zoom. Single finger outside containers = normal scroll.                                                                                                                                                         |
| **Existing AlignmentControls scale slider confusion**               | The existing scale slider controls auto-alignment scale (System 1). The new crop zoom slider controls user crop (System 2). These could confuse users. Mitigation: rename existing one to "Body Scale" and new one to "Crop Zoom", or consider hiding the existing one since most users don't manually adjust body scale. |
| **Backward compatibility of `calculateAlignedDrawParams`**          | The new `userCrop` parameter is optional with default `undefined` (= no crop override). All existing callers continue to work without modification until explicitly updated.                                                                                                                                              |

---

## File Change Summary

| File                                               | Action | Description                                            |
| -------------------------------------------------- | ------ | ------------------------------------------------------ |
| `types/editor.ts`                                  | Modify | Add UserCropState type                                 |
| `stores/editor-store.ts`                           | Modify | Add userCrop state + actions                           |
| `lib/canvas/aligned-draw-params.ts`                | Modify | Add Phase 5 user crop logic                            |
| `hooks/useZoomPanGestures.ts`                      | Create | Gesture handling hook                                  |
| `components/features/editor/PhotoPanel.tsx`        | Modify | Add zoom/pan gestures + CSS transform preview          |
| `components/features/editor/AlignmentControls.tsx` | Modify | Add crop zoom slider + reset                           |
| `components/features/editor/AlignedPreview.tsx`    | Modify | Thread userCrop from store                             |
| `components/features/editor/ExportModal.tsx`       | Modify | Thread userCrop to exports, reset pan on format change |
| `lib/canvas/export.ts`                             | Modify | Accept userCrop in ExportOptions                       |
| `lib/canvas/export-gif.ts`                         | Modify | Accept userCrop in GifExportOptions                    |
