# Codex Implementation Plan: User Zoom & Crop Override (Linked Before/After)

## 1. Define the override model and thread-safe API boundary

1. Add a dedicated user framing model (separate from landmark auto-alignment) to avoid semantic overload of `AlignmentSettings`.
2. Introduce a new type in `types/editor.ts`:
   - `UserFramingOverride` with normalized values: `zoom`, `panX`, `panY`, `isActive`.
   - `zoom` default `1` (no override), `panX/panY` default `0`.
3. Extend `calculateAlignedDrawParams(...)` signature to accept optional override input and optional clamp metadata output.
4. Keep existing alignment algorithm untouched; apply override as a post-processing phase after the existing 4 phases.

Files modified:

- `types/editor.ts`
- `lib/canvas/aligned-draw-params.ts`

Verification gate:

- TypeScript compiles with old call sites still valid (override optional).
- `calculateAlignedDrawParams` returns identical output when override is omitted or inactive.

## 2. Add Zustand state/actions for linked user zoom/pan

1. Add store slice fields in `stores/editor-store.ts`:
   - `userFraming: UserFramingOverride`
   - `setUserZoom(zoom: number)`
   - `setUserPan(panX: number, panY: number)`
   - `updateUserFraming(partial)`
   - `resetUserFraming()`
2. Keep current `alignment` state for System 1 auto alignment; do not merge with user override.
3. Ensure editor `reset()` also resets user framing.
4. Preserve `linkedZoom` behavior as always-on for this feature path (or deprecate toggle in UI if unused).

Files modified:

- `stores/editor-store.ts`
- `types/editor.ts` (if action typings are colocated/derived)

Verification gate:

- Store unit/manual checks: set zoom/pan, then reset restores defaults.
- Reloading/opening ExportModal reads same in-session values.

## 3. Implement override application inside `calculateAlignedDrawParams`

1. Add phase 5 in `lib/canvas/aligned-draw-params.ts`: `applyUserFramingOverride`.
2. Implementation strategy:
   - Use existing computed `before/after` draw rects as baseline.
   - Apply a shared zoom multiplier around panel center for both images.
   - Apply shared pan offsets in pixels for both images.
   - Clamp draw rects so panel bounds are always fully covered (no blank borders).
3. Add deterministic clamping helper:
   - Compute per-image permissible `drawX/drawY` ranges from scaled `drawWidth/drawHeight` and panel size.
   - Clamp both panels with shared requested pan, but if one panel hits limit first, use the clamped shared result so both stay linked.
4. Handle no-landmark paths naturally: baseline cover-fit still exists, so override works regardless of landmarks.
5. Expose optional debug metadata (`effectiveZoom`, `effectivePanX`, `effectivePanY`, `wasClamped`) for UI feedback if needed.

Files modified:

- `lib/canvas/aligned-draw-params.ts`

Verification gate:

- New targeted tests (or temporary harness) prove:
  - Zoom > 1 increases crop similarly for both panels.
  - Pan changes both panels together.
  - Minimum zoom clamp prevents any blank canvas at all edges.

## 4. Thread override into all rendering call sites (single source of truth)

1. Update calls to `calculateAlignedDrawParams` in:
   - `components/features/editor/AlignedPreview.tsx`
   - `lib/canvas/export.ts`
   - `lib/canvas/export-gif.ts`
2. Pass `userFraming` from store/hook into preview and export functions.
3. Extend export options payloads to carry override through hooks:
   - `ExportOptions` in `lib/canvas/export.ts`
   - `GifExportOptions` in `lib/canvas/export-gif.ts`
   - plumbing in `hooks/useCanvasExport.ts`, `hooks/useGifExport.ts`, `components/features/editor/ExportModal.tsx`.
4. Keep default behavior unchanged when no override is active.

Files modified:

- `components/features/editor/AlignedPreview.tsx`
- `lib/canvas/export.ts`
- `lib/canvas/export-gif.ts`
- `hooks/useCanvasExport.ts`
- `hooks/useGifExport.ts`
- `components/features/editor/ExportModal.tsx`

Verification gate:

- Manual parity check: editor framing == ExportModal preview == PNG output == GIF output at same format.

## 5. Add gesture-driven zoom/pan interactions to PhotoPanel

1. Add pointer/touch/wheel interactions in `components/features/editor/PhotoPanel.tsx`:
   - Desktop wheel zoom centered on cursor.
   - Touch pinch zoom centered on pinch midpoint.
   - Drag pan via pointer events.
2. Prevent browser gesture conflicts correctly:
   - Apply `touch-action: none` only on interactive photo surface.
   - `preventDefault()` on wheel/pinch handlers at panel scope only.
3. Move display from static `object-contain` image to transform-driven framing preview:
   - Keep existing image/landmark overlay stack.
   - Apply a shared transform based on store `userFraming`.
4. Maintain linked behavior:
   - Any interaction on either panel updates one shared store state.

Files modified:

- `components/features/editor/PhotoPanel.tsx`
- `app/(app)/editor/_components/EditorContent.tsx` (only if props/wiring changes)

Verification gate:

- Device checks:
  - Desktop wheel zoom smooth and clamped.
  - Mobile pinch + drag smooth, no page-level accidental zoom.
  - Both panels update simultaneously.

## 6. Add slider fallback + reset in alignment controls

1. Extend `components/features/editor/AlignmentControls.tsx` with a new “Framing” section:
   - Zoom slider (e.g. `1.00` to max derived safe bound or practical cap like `3.0`).
   - Pan X / Pan Y fine controls (optional) or keep drag-only if UI density is a concern.
   - Reset framing button calling `resetUserFraming()`.
2. Keep existing System 1 controls visible but clearly separated from user framing override to avoid confusion.
3. Show clamped state hint when user reaches min/max limits.

Files modified:

- `components/features/editor/AlignmentControls.tsx`
- `stores/editor-store.ts` (action usage)

Verification gate:

- Slider and gestures stay in sync bidirectionally.
- Reset returns exactly to auto framing (`zoom=1, pan=0,0`).

## 7. Make minimum zoom/no-blank-border behavior robust

1. Define “minimum zoom” as the smallest zoom that still guarantees full panel coverage after pan for both images.
2. Compute runtime clamp based on current draw rects and target panel size in `aligned-draw-params` post-phase.
3. Enforce pan bounds from effective zoom so users cannot drag into blank borders.
4. Decide and document max zoom cap (UX/perf guardrail), e.g. `3x`.

Files modified:

- `lib/canvas/aligned-draw-params.ts`
- `types/editor.ts` (constants/types if shared)

Verification gate:

- Edge-case tests: very wide, very tall, missing landmarks, and background-removed images all remain border-safe.

## 8. Testing and regression harness updates

1. Add/extend tests around draw-param overrides:
   - Create focused tests for `calculateAlignedDrawParams` with override on/off/clamped states.
2. Update any visual adapter mirroring draw logic if present (e.g. `tests/visual/lib/export-adapter.ts`) to include override path so exports remain testable.
3. Add integration assertions for export hooks/options carrying override to PNG/GIF.
4. Run lint/typecheck/targeted tests and fix fallout.

Files modified:

- `tests/*` (unit/integration/visual depending on existing layout)
- `tests/visual/lib/export-adapter.ts` (if required by current mirror architecture)

Verification gate:

- All relevant tests pass.
- New acceptance scenarios pass in manual QA script.

## 9. Final QA matrix and rollout notes

1. Validate acceptance criteria end-to-end:
   - Pinch zoom linked both panels.
   - Wheel zoom desktop linked.
   - Drag pan linked.
   - ExportModal preview parity.
   - PNG/GIF exports include override.
   - Reset works.
   - Min zoom clamp prevents blank borders.
2. Performance sweep:
   - Confirm interactions remain responsive (<16ms frame budget target) by avoiding pose recomputation and limiting rerenders.
3. Document behavior in editor/export docs and brief inline comments around override phase.

Files modified:

- `docs/*` (if project docs are updated)
- Minor comments in touched source files

Verification gate:

- QA checklist signed with screenshots/video captures for mobile + desktop.

## Risks and trade-offs

1. **Two alignment systems confusion**: existing `alignment.ts` controls may conflict mentally with new user framing. Mitigation: explicit UI separation and naming (`Auto alignment` vs `Framing override`).
2. **PhotoPanel fidelity mismatch**: CSS-transform preview may not perfectly match canvas export math. Mitigation: optionally migrate panel rendering to canvas/shared helper if mismatch appears during QA.
3. **Gesture complexity**: multi-touch + wheel + drag edge cases can cause jitter. Mitigation: pointer-event state machine and throttled updates via `requestAnimationFrame`.
4. **Clamping across unequal source aspect ratios**: one panel may clamp earlier than the other. Mitigation: shared effective pan derived from the strictest bounds.
5. **Backward compatibility risk**: adding parameters to core draw function impacts many callers/tests. Mitigation: optional override param with defaults and staged rollout.
