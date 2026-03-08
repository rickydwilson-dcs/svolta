# YOLO Implementation Brief: Zustand & Hook Fixes

**Branch:** feature/zustand-hook-fixes (created from develop)
**Session spec:** output/sessions/2026-03-08_zustand-hook-fixes/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The code review identified 11 findings related to Zustand selector anti-patterns, stale closures, missing memoization, and type safety issues across hooks and stores. The isPro() selector pattern creates unnecessary re-renders, useCanvasExport lacks useCallback wrapping, user-store reset() doesn't clear isInitialized, and Profile type casts are used to work around a missing field.

The remediation plan was reviewed and approved. Implement it exactly as specified below.

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
git checkout -b feature/zustand-hook-fixes   # create feature branch from develop — NEVER write directly to develop
npm run type-check                            # must be clean before starting
```

---

## Phase 1: Fix isPro() Zustand Selector Anti-Pattern (ARCH-002)

**Goal:** Replace `state.isPro()` computed getter selector with direct state selection in 3 consumer files.
**Model:** sonnet — modifying 3 files with the same pattern

**Why:** Calling `state.isPro()` inside a selector invokes a function on every render. Instead, select `state.subscription` directly and derive `isPro` locally, so Zustand only re-renders when `subscription` actually changes.

### Files to modify (can edit in parallel):

**Task 1:** `hooks/useExportDownload.ts` (163 lines)
model: sonnet

- Line 46: Replace `const isPro = useUserStore((state) => state.isPro());`
- With:
  ```typescript
  const subscription = useUserStore((s) => s.subscription);
  const isPro =
    subscription?.tier === "pro" && subscription?.status === "active";
  ```
- Update all usages of `isPro()` (function call) to `isPro` (boolean value) throughout the file (lines 82, 98, 114, 143)

**Task 2:** `components/features/editor/ExportModal.tsx` (351 lines)
model: sonnet

- Line 38: Same replacement pattern as Task 1
- Update all usages of `isPro()` to `isPro` throughout the file (lines 100, 103, 112, 121, 266, 271)

**Task 3:** `components/features/editor/BackgroundSettings.tsx` (356 lines)
model: sonnet

- Line 56: Same replacement pattern as Task 1
- Update all usages of `isPro()` to `isPro` throughout the file (line 61: `const isLocked = !isPro;`)

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add hooks/useExportDownload.ts components/features/editor/ExportModal.tsx components/features/editor/BackgroundSettings.tsx
git commit -m "$(cat <<'EOF'
fix(store): replace isPro() selector anti-pattern with direct subscription selection (ARCH-002)

Select subscription state directly from Zustand and derive isPro locally,
avoiding function call inside selector that causes unnecessary re-renders.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Fix useKeyboardShortcuts Stale Closure (ARCH-006, CQ-013)

**Goal:** Prevent stale closure by storing alignment in a ref instead of reading from closure.
**Model:** sonnet — single file, moderate reasoning required

### File: `hooks/useKeyboardShortcuts.ts` (148 lines)

1. Add `useRef` and `useLayoutEffect` imports if not already present
2. Create a ref to store alignment:
   ```typescript
   const alignmentRef = useRef(alignment);
   useLayoutEffect(() => {
     alignmentRef.current = alignment;
   }, [alignment]);
   ```
3. Inside the keydown handler (the effect callback), replace all reads of `alignment` with `alignmentRef.current`
4. Remove `alignment` from the effect's dependency array (line 141) — the ref keeps it fresh without re-registering the listener

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add hooks/useKeyboardShortcuts.ts
git commit -m "$(cat <<'EOF'
fix(hooks): use ref for alignment in useKeyboardShortcuts to prevent stale closure (ARCH-006, CQ-013)

Store alignment in a ref updated via useLayoutEffect so the keydown
handler always reads fresh state without re-registering on every change.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Fix user-store reset() and Type Safety (CQ-010, CQ-008, ARCH-010)

**Goal:** Fix reset() missing isInitialized, add logo_url to Profile type safety.
**Model:** sonnet — 2 independent files

### Task 1: `stores/user-store.ts` (338 lines)

model: sonnet

- In the `reset()` action (lines 327-336), add `isInitialized: false` to the set() call

### Task 2: `hooks/useExportDownload.ts` (163 lines) + `types/database.ts` (226 lines)

model: haiku — mechanical verification

- First verify: `types/database.ts` already has `logo_url: string | null` in Profile type (line 18) — confirmed it does
- In `hooks/useExportDownload.ts`, lines 82-83: remove the `as unknown as { logo_url?: string }` casts
- Replace with direct access: `const customLogoUrl = isPro && profile?.logo_url ? profile.logo_url : null;`

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add stores/user-store.ts hooks/useExportDownload.ts
git commit -m "$(cat <<'EOF'
fix(store): add isInitialized to reset(), remove logo_url type cast (CQ-010, CQ-008, ARCH-010)

Reset isInitialized to false in user-store reset() action.
Remove unnecessary 'as unknown as' cast for logo_url since the Profile
type already includes the field.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Memoize useCanvasExport Functions (CQ-017, CQ-018)

**Goal:** Wrap exportAndDownload and clearError in useCallback to prevent unnecessary re-renders in consumers.
**Model:** sonnet — single file, standard React memoization

### File: `hooks/useCanvasExport.ts` (121 lines)

1. Add `useCallback` to the React import
2. Wrap `exportAndDownload` (lines 43-107) in `useCallback` with appropriate dependencies
3. Wrap `clearError` (line 112) in `useCallback`:
   ```typescript
   const clearError = useCallback(() => setError(null), []);
   ```

**Note:** For `exportAndDownload`, carefully identify all external values read inside the function body and include them in the dependency array. This includes any store selectors, refs, and state values.

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add hooks/useCanvasExport.ts
git commit -m "$(cat <<'EOF'
fix(hooks): memoize exportAndDownload and clearError with useCallback (CQ-017, CQ-018)

Wrap both functions in useCallback to maintain referential stability
and prevent unnecessary re-renders in consuming components.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Fix useExportDownload Callback Stability (PERF-009)

**Goal:** Destructure onLimitReached and onSuccess as separate params to improve callback stability.
**Model:** sonnet — single file

### File: `hooks/useExportDownload.ts` (163 lines)

The hook currently receives callbacks in an object parameter (line 38-39). Destructure them so consumers can pass stable references:

1. Change the function signature from accepting a callbacks object to destructured parameters, or use individual `useRef` values to avoid re-creating the internal closure when callbacks change:
   ```typescript
   const onLimitReachedRef = useRef(callbacks.onLimitReached);
   const onSuccessRef = useRef(callbacks.onSuccess);
   useLayoutEffect(() => {
     onLimitReachedRef.current = callbacks.onLimitReached;
     onSuccessRef.current = callbacks.onSuccess;
   }, [callbacks.onLimitReached, callbacks.onSuccess]);
   ```
2. Inside the hook body, call `onLimitReachedRef.current(...)` and `onSuccessRef.current()` instead of `callbacks.onLimitReached(...)` and `callbacks.onSuccess()`

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add hooks/useExportDownload.ts
git commit -m "$(cat <<'EOF'
fix(hooks): stabilize useExportDownload callbacks with refs (PERF-009)

Store onLimitReached and onSuccess in refs to prevent the internal
effect from re-running when parent re-renders with new callback references.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Narrow useAlignment Selectors (PERF-010)

**Goal:** Select only landmarks and photo existence from the editor store, not full Photo objects.
**Model:** sonnet — single file, requires understanding store shape

### File: `hooks/useAlignment.ts` (152 lines)

Currently (lines 39-42):

```typescript
const beforePhoto = useEditorStore((state) => state.beforePhoto);
const afterPhoto = useEditorStore((state) => state.afterPhoto);
```

These select entire Photo objects including dataUrl (large base64 strings), causing re-renders when any photo property changes.

Replace with narrower selectors:

```typescript
const beforeLandmarks = useEditorStore(
  (state) => state.beforePhoto?.landmarks ?? null,
);
const afterLandmarks = useEditorStore(
  (state) => state.afterPhoto?.landmarks ?? null,
);
const hasBeforePhoto = useEditorStore((state) => !!state.beforePhoto);
const hasAfterPhoto = useEditorStore((state) => !!state.afterPhoto);
```

Update all references in the hook body:

- Replace `beforePhoto?.landmarks` with `beforeLandmarks`
- Replace `afterPhoto?.landmarks` with `afterLandmarks`
- Replace `!!beforePhoto` / `!!afterPhoto` with `hasBeforePhoto` / `hasAfterPhoto`
- Check `canAlign` and `isAligned` useMemo blocks (lines 50-80) for any other Photo property access — if only landmarks are used, the narrower selectors are sufficient

### Verification gate — STOP if this fails

```bash
npm run type-check
```

### Commit

```bash
git add hooks/useAlignment.ts
git commit -m "$(cat <<'EOF'
perf(hooks): narrow useAlignment selectors to landmarks only (PERF-010)

Select only landmarks and photo existence instead of full Photo objects,
avoiding re-renders from unrelated photo property changes.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7: Final Verification

**Goal:** Confirm the entire project builds cleanly after all changes.
**Model:** haiku — mechanical check

### Verification gate — STOP if this fails

```bash
npm run type-check
npm run lint
npm run build
```

---

## Cost Estimate

| Phase                            | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| -------------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: isPro selector fix      | sonnet | ~15k              | ~3k                | $0.09      |
| Phase 2: keyboard shortcuts ref  | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 3: reset + type safety     | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 4: useCallback memoization | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 5: callback stability      | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 6: narrow selectors        | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 7: final verification      | haiku  | ~5k               | ~0.5k              | $0.01      |
| **Total**                        |        | **~72k**          | **~13.5k**         | **~$0.41** |

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
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_zustand-hook-fixes/yolo-brief.md`:

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

All 6 implementation phases completed without error. One minor deviation in Phase 3: the brief specified `null` as the fallback for `customLogoUrl`, but the watermark config type expects `string | undefined`, so `undefined` was used instead — functionally equivalent and type-safe. The `useAlignment` hook's `autoAlign` callback was also updated to use narrowed selectors in its dependency array. All verification gates passed cleanly; `npm run type-check`, `npm run lint`, and `npm run build` all exit 0.

### Commits

- `82a253b` fix(store): replace isPro() selector anti-pattern with direct subscription selection (ARCH-002)
- `c6c2254` fix(hooks): use ref for alignment in useKeyboardShortcuts to prevent stale closure (ARCH-006, CQ-013)
- `4de7870` fix(store): add isInitialized to reset(), remove logo_url type cast (CQ-010, CQ-008, ARCH-010)
- `39cdd8c` fix(hooks): memoize exportAndDownload and clearError with useCallback (CQ-017, CQ-018)
- `962e938` fix(hooks): stabilize useExportDownload callbacks with refs (PERF-009)
- `20c2579` perf(hooks): narrow useAlignment selectors to landmarks only (PERF-010)

---

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/zustand-hook-fixes` — NEVER commit directly to develop
