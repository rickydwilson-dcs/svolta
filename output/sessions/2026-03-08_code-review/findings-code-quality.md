# Code Quality Review Findings

**Reviewer:** cs-code-reviewer
**Scope:** Full codebase scan of `app/`, `components/`, `hooks/`, `stores/`, `lib/`, `types/` -- 95 TypeScript/TSX source files. Checked for `any` types, console.log in production code, barrel exports, default exports, prop interface exports, Zustand store patterns, hook dependency arrays, code duplication, and CSS-in-JS violations. Ran `npm run lint`.
**Date:** 2026-03-08

## Summary

The codebase is in good shape overall -- ESLint passes cleanly with zero errors, no `any` type annotations exist in source code, and Zustand stores are properly typed with selectors used consistently in most components. However, there are 18 findings across production `console.log` statements that bypass the structured logger, barrel export files that violate project standards, unsafe type casts in the Stripe webhook handler, a CSS-in-JS violation, unexported prop interfaces, and a user-store `reset()` that fails to reset `isInitialized`.

## Findings

### [HIGH] CQ-001: Production `console.log` in `lib/canvas/export.ts`

- **File:** `lib/canvas/export.ts` (line 262)
- **Issue:** Direct `console.log('[Export] Dynamic dimensions:', {...})` bypasses the structured logger (`canvasLogger`) that is already imported and used elsewhere in the codebase. This will output to the browser console in production.
- **Impact:** Leaks internal export dimensions to end-user console; violates code-style rule "No console.log in production."
- **Fix:** Replace with `canvasLogger.debug('[Export] Dynamic dimensions:', { targetHeight, beforeBottom, afterBottom, photoClipHeight, finalWidth, finalHeight })`.
- **Effort:** trivial

### [HIGH] CQ-002: Production `console.log` in `lib/canvas/export-gif.ts` (4 occurrences)

- **File:** `lib/canvas/export-gif.ts` (lines 195, 224, 282, 323)
- **Issue:** Four `console.log` calls logging GIF export start, frame generation, encoding, and completion. The file does not import or use the structured logger at all.
- **Impact:** Leaks export internals (format, dimensions, file size) to end-user console in production. Performance-sensitive GIF export path should not have synchronous console output.
- **Fix:** Import `canvasLogger` from `@/lib/logger` and replace all four `console.log` calls with `canvasLogger.debug(...)` or `canvasLogger.info(...)`.
- **Effort:** trivial

### [HIGH] CQ-003: Production `console.log` in `lib/mediapipe/pose-detector.ts` (3 occurrences)

- **File:** `lib/mediapipe/pose-detector.ts` (lines 64, 133, 138)
- **Issue:** Three `console.log` calls for asset detection and initialization status. These run on every page load when the pose detector initializes.
- **Impact:** Leaks implementation details (GPU vs CPU, self-hosted vs CDN) to end-user console.
- **Fix:** Import `poseLogger` from `@/lib/logger` and replace with `poseLogger.info(...)`. The `console.warn` on line 69 is acceptable (warnings are allowed).
- **Effort:** trivial

### [HIGH] CQ-004: Production `console.log` in `lib/debug/alignment-logger.ts`

- **File:** `lib/debug/alignment-logger.ts` (lines 39, 42, 181)
- **Issue:** `console.log` calls for debug toggle state and alignment log entries. While this is a debug module, the toggle enable/disable messages fire whenever the user interacts with debug settings and are not gated by the debug flag itself (lines 39, 42 fire unconditionally during `setEnabled`).
- **Impact:** Minor console pollution. Line 181 is gated by debug being enabled, which is acceptable.
- **Fix:** Gate the enable/disable messages behind `isAlignmentDebugEnabled()` or replace with `editorLogger.debug(...)`.
- **Effort:** trivial

### [HIGH] CQ-005: Production `console.log` in `app/api/stripe/webhook/route.ts` (6 occurrences)

- **File:** `app/api/stripe/webhook/route.ts` (lines 55, 70, 114, 148, 259, 286)
- **Issue:** Six `console.log` calls logging webhook event processing details including user IDs, subscription tiers, and event types. The file does not use the project's `webhookLogger` from `lib/logger.ts`.
- **Impact:** In a server-side route, `console.log` goes to server logs, which is less critical than client-side. However, it bypasses structured logging, making log aggregation and filtering difficult. The `webhookLogger` already exists for this purpose.
- **Fix:** Import `webhookLogger` from `@/lib/logger` and replace `console.log` calls. Keep `console.error` calls as-is (errors are acceptable).
- **Effort:** small

### [MEDIUM] CQ-006: Barrel export files violate project standards

- **File:** `components/ui/index.ts`, `components/features/editor/index.ts`, `lib/mediapipe/index.ts`, `lib/segmentation/index.ts`
- **Issue:** Four barrel export (`index.ts`) files re-export from other modules. The code-style standard explicitly states: "No barrel exports (index.ts re-exporting everything) -- import directly from source files."
- **Impact:** Barrel exports can cause larger bundle sizes due to tree-shaking limitations, and obscure the true import source during debugging.
- **Fix:** Remove barrel files and update all import sites to import directly from source files (e.g., `from '@/components/ui/Button'` instead of `from '@/components/ui'`).
- **Effort:** medium

### [MEDIUM] CQ-007: Unsafe `as unknown as` type casts in Stripe webhook handler

- **File:** `app/api/stripe/webhook/route.ts` (lines 226-229, 282, 320)
- **Issue:** Six `as unknown as` casts to access `current_period_end`, `cancel_at_period_end`, and `subscription` properties on Stripe objects. This circumvents type safety entirely.
- **Impact:** If the Stripe API changes these properties, the code will silently access `undefined` with no compile-time warning. The double-cast pattern is a code smell indicating the Stripe types may need augmentation or the API version may be mismatched.
- **Fix:** Either (a) extend the Stripe type definitions with a proper interface, (b) use Stripe's typed API properly by checking the `expand` parameter, or (c) at minimum use a helper function with runtime validation (e.g., check `'current_period_end' in subscription`) to centralize the unsafe access.
- **Effort:** small

### [MEDIUM] CQ-008: Unsafe `as unknown as` cast for profile `logo_url` in `useExportDownload`

- **File:** `hooks/useExportDownload.ts` (lines 82-84)
- **Issue:** `(profile as unknown as { logo_url?: string })?.logo_url` -- double cast to access `logo_url` on the profile object. This suggests the `Profile` type in `types/database.ts` is missing the `logo_url` field.
- **Impact:** If the column is renamed or removed, this silently returns `undefined` with no type error.
- **Fix:** Add `logo_url` to the `Profile` type in `types/database.ts` so it can be accessed type-safely.
- **Effort:** trivial

### [MEDIUM] CQ-009: CSS-in-JS `<style jsx>` in AlignmentControls

- **File:** `components/features/editor/AlignmentControls.tsx` (lines 464-470)
- **Issue:** Uses `<style jsx>` tag for a responsive media query. The code-style standard states: "No CSS-in-JS -- use Tailwind utility classes and design tokens only."
- **Impact:** Introduces a different styling paradigm; Next.js styled-jsx adds runtime CSS injection overhead.
- **Fix:** Replace with Tailwind responsive classes. The rule `@media (max-width: 640px) { .flex-wrap { flex-direction: column; } }` can be replaced by adding `sm:flex-row flex-col` classes to the wrapping div (line 359), changing from `flex-wrap` to `flex flex-col sm:flex-row`.
- **Effort:** trivial

### [MEDIUM] CQ-010: `user-store.ts` `reset()` does not reset `isInitialized`

- **File:** `stores/user-store.ts` (lines 326-335)
- **Issue:** The `reset()` action sets `user`, `profile`, `subscription`, `usage`, `isLoading`, and `error` back to defaults but omits `isInitialized` (and `anonExports`). After `signOut()` calls `reset()`, `isInitialized` remains `true`, which may prevent re-initialization on the next login in the same browser session.
- **Impact:** Could cause stale state after sign-out/sign-in without page reload. The `initialize()` method will re-run but the `isInitialized` flag staying `true` may confuse components that gate rendering on it.
- **Fix:** Add `isInitialized: false` and `anonExports: 0` to the `reset()` call.
- **Effort:** trivial

### [MEDIUM] CQ-011: Multiple prop interfaces not exported

- **File:** Multiple component files
- **Issue:** The code-style standard requires "Always export the interface" for component props. The following interfaces are not exported:
  - `components/features/editor/DropZone.tsx`: `DropZoneProps`
  - `components/features/editor/PhotoPanel.tsx`: `PhotoPanelProps`
  - `components/features/editor/LandmarkOverlay.tsx`: `LandmarkOverlayProps`
  - `components/features/editor/export/AspectRatioSelector.tsx`: `AspectRatioSelectorProps`
  - `components/features/editor/export/BackgroundSection.tsx`: `BackgroundSectionProps`
  - `components/features/editor/export/ExportButton.tsx`: `ExportButtonProps`
  - `components/features/editor/export/ExportPreview.tsx`: `ExportPreviewProps`
  - `components/features/editor/export/ExportProgressBar.tsx`: `ExportProgressBarProps`
  - `components/features/editor/export/ExportTypeToggle.tsx`: `ExportTypeToggleProps`
  - `components/features/editor/export/GifControls.tsx`: `GifControlsProps`
  - `components/features/editor/export/MoreOptionsSection.tsx`: `MoreOptionsSectionProps`
  - `components/features/editor/export/ProToggle.tsx`: `ProToggleProps`
  - `components/features/editor/export/SignupPromptModal.tsx`: `SignupPromptModalProps`
  - `components/ui/OAuthButtons.tsx`: `OAuthButtonsProps`
  - `components/ui/MagicLinkForm.tsx`: `MagicLinkFormProps`
  - `components/ui/ErrorBoundary.tsx`: `ErrorBoundaryProps`
  - `components/ui/SvoltaLogo.tsx`: `SvoltaLogoProps`, `SvoltaWordmarkProps`
  - `components/providers/index.tsx`: `ProvidersProps`
- **Impact:** Prevents consumers from importing and reusing prop types for composition or testing.
- **Fix:** Add `export` keyword to each `interface` declaration.
- **Effort:** trivial (bulk find-replace)

### [MEDIUM] CQ-012: `useLayoutEffect` without dependency array in `useZoomPanGestures`

- **File:** `hooks/useZoomPanGestures.ts` (lines 25-27)
- **Issue:** `useLayoutEffect(() => { optionsRef.current = options; });` -- no dependency array means this runs on every render. While this is an intentional pattern for keeping a ref in sync, the missing dependency array triggers React Strict Mode warnings and goes against the project's code-style rule requiring correct dependency arrays.
- **Impact:** In development with React Strict Mode, this fires twice per render. Not a bug per se (ref assignment is idempotent), but inconsistent with the project's hook patterns.
- **Fix:** Add `[options]` as the dependency array: `useLayoutEffect(() => { optionsRef.current = options; }, [options]);`. Since the intent is to run on every render when options change, this is semantically equivalent and lint-clean.
- **Effort:** trivial

### [LOW] CQ-013: `useKeyboardShortcuts` subscribes to full `alignment` object

- **File:** `hooks/useKeyboardShortcuts.ts` (line 30)
- **Issue:** `const alignment = useEditorStore((s) => s.alignment);` subscribes to the entire alignment object. When any alignment property changes (e.g., during drag), the effect re-registers the keyboard listener because `alignment` is in its dependency array (line 141).
- **Impact:** The keydown handler is removed and re-added on every alignment change. During rapid adjustments (arrow keys held down), this creates unnecessary event listener churn.
- **Fix:** Subscribe to individual properties needed by the handler (`alignment.scale`, `alignment.offsetX`, `alignment.offsetY`, `alignment.anchor`) or use `useRef` to hold the current alignment and read from the ref inside the handler, removing `alignment` from the effect deps.
- **Effort:** small

### [LOW] CQ-014: `ExportModal` missing explicit return type

- **File:** `components/features/editor/ExportModal.tsx` (line 32)
- **Issue:** `export function ExportModal({ isOpen, onClose }: ExportModalProps)` -- no explicit return type. The code-style standard requires "Always specify return types for React component functions."
- **Impact:** No type safety on what the component returns.
- **Fix:** Add `: JSX.Element` return type annotation.
- **Effort:** trivial

### [LOW] CQ-015: Multiple components missing explicit return types

- **File:** Multiple files
- **Issue:** The following exported components lack explicit return types as required by code-style standards:
  - `components/features/editor/DropZone.tsx`: `DropZone`, `EmptyState`, `ProcessingState`, `PhotoPreview`, `ErrorState`
  - `components/features/editor/PhotoPanel.tsx`: `PhotoPanel`
  - `components/features/editor/AlignedPreview.tsx`: `AlignedPreview`
  - `components/features/editor/GifPreview.tsx` (likely)
  - `components/providers/index.tsx`: `Providers`
  - Multiple `export/` sub-components
- **Impact:** Reduced type safety at component boundaries.
- **Fix:** Add `: JSX.Element` (or `: JSX.Element | null` where applicable) to each function signature.
- **Effort:** small

### [LOW] CQ-016: `AlignedPreview` uses `console.error` directly

- **File:** `components/features/editor/AlignedPreview.tsx` (line 97)
- **Issue:** `console.error('Failed to load aligned preview images:', error)` -- while `console.error` is generally acceptable, the project has `editorLogger.error(...)` available and all other editor components use it.
- **Impact:** Inconsistency in logging approach; this error bypasses structured logging.
- **Fix:** Import `editorLogger` and use `editorLogger.error('Failed to load aligned preview images', error)`.
- **Effort:** trivial

### [LOW] CQ-017: `useCanvasExport` `exportAndDownload` not wrapped in `useCallback`

- **File:** `hooks/useCanvasExport.ts` (lines 43-107)
- **Issue:** `exportAndDownload` is defined as a plain `async` function inside the hook body without `useCallback`. It is returned as part of the hook's return value.
- **Impact:** A new function reference is created on every render, which could cause unnecessary re-renders in consuming components that depend on referential equality (e.g., in `useEffect` dependency arrays or `React.memo` comparisons).
- **Fix:** Wrap in `useCallback` with `[userFraming]` dependency (matching how `useGifExport` handles it).
- **Effort:** trivial

### [LOW] CQ-018: `useCanvasExport` `clearError` not wrapped in `useCallback`

- **File:** `hooks/useCanvasExport.ts` (line 112)
- **Issue:** `const clearError = () => setError(null);` -- plain arrow function, not memoized with `useCallback`.
- **Impact:** New reference on every render; minor since `setError` is stable, but inconsistent with `useGifExport.clearError` which uses `useCallback`.
- **Fix:** Wrap in `useCallback(... , [])`.
- **Effort:** trivial

## Statistics

- Critical: 0
- High: 5
- Medium: 7
- Low: 6
- Total: 18
