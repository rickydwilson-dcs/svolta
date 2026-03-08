# Code Review Remediation Plan

**Date:** 2026-03-08
**Source:** aggregated-report.md (64 findings)
**Format:** YOLO-ready plans — each session is self-contained and can be run as a `/plan.to.yolo`

---

## Needs Codex Peer Review?

| Plan                                  | Codex?    | Reason                                                                       |
| ------------------------------------- | --------- | ---------------------------------------------------------------------------- |
| Plan 1: Console Log Cleanup           | No        | Mechanical find-replace                                                      |
| Plan 2: A11y + SEO Quick Wins         | No        | Small targeted fixes                                                         |
| Plan 3: SEO Route Restructure         | No        | Straightforward move                                                         |
| Plan 4: Security Hardening            | No        | Apply existing patterns                                                      |
| Plan 5: Zustand & Hook Fixes          | **Maybe** | ARCH-001 webhook sync has correctness implications                           |
| Plan 6: Performance - Bundle & Import | No        | Remove dep + dynamic import                                                  |
| Plan 7: Performance - Canvas & Memory | **Yes**   | PERF-001 (store refactor) and PERF-008 (Photo type change) are architectural |
| Plan 8: Architecture Cleanup          | **Yes**   | ARCH-008 (wiring AlignmentControls) needs UX/layout decision                 |

---

## Plan 1: Console Log Cleanup (Trivial — ~15 min)

**Findings:** CQ-001, CQ-002, CQ-003, CQ-004, CQ-005, PERF-007, ARCH-004, CQ-016

**Goal:** Replace all production `console.log` calls with structured loggers.

### Steps

1. `lib/canvas/export.ts` line 262 — replace `console.log` with `canvasLogger.debug`
2. `lib/canvas/export-gif.ts` lines 195, 224, 282, 323 — replace 4× `console.log` with `canvasLogger.debug`
3. `lib/mediapipe/pose-detector.ts` lines 64, 133, 138 — replace with `poseLogger.debug` (create if needed, or use existing logger)
4. `lib/debug/alignment-logger.ts` lines 39, 42 — gate behind debug flag or replace with structured logger
5. `app/api/stripe/webhook/route.ts` — replace 6× `console.log` with `webhookLogger` (already exists in file)
6. `components/features/editor/AlignedPreview.tsx` — replace `console.error` with `editorLogger.error`

### Verify

- `grep -r "console\.\(log\|error\)" lib/ app/api/ components/ --include="*.ts" --include="*.tsx"` should return zero hits (excluding test files)

---

## Plan 2: Accessibility & SEO Quick Wins (~20 min)

**Findings:** A11Y-001, A11Y-003, A11Y-004, A11Y-005, A11Y-006, A11Y-007, A11Y-008, A11Y-002, SEO-004, SEO-006

**Goal:** Fix all trivial/small a11y and SEO issues.

### Steps

1. **A11Y-001** — Add `id="main-content"` to `<main>` in `app/(app)/layout.tsx` and `app/(auth)/layout.tsx` (skip link target)
2. **A11Y-002** — Add `:focus-visible` styles to CSS-class buttons in `app/globals.css` (lines 304-354)
3. **A11Y-003** — Add `aria-label` prop to `SegmentedControl` in `components/ui/SegmentedControl.tsx` and pass it to the ToggleGroup root
4. **A11Y-004** — Add `<h1 className="sr-only">Photo Editor</h1>` to the editor page
5. **A11Y-005** — Add `aria-hidden="true"` to decorative SVGs on upgrade page
6. **A11Y-006** — Add `peer-focus-visible:ring-2` to Toggle component track
7. **A11Y-007** — Add `aria-label="Main navigation"` to `<nav>` in MarketingHeader
8. **A11Y-008** — Add `role="alert"` to DropZone error display div
9. **SEO-004** — Expand root layout title to include primary keywords (e.g., "Svolta — Before & After Photo Alignment for Fitness Coaches")
10. **SEO-006** — Add `alternates: { canonical: 'https://www.svolta.app' }` to marketing page metadata

### Verify

- Visual check of focus indicators on buttons
- Screen reader test on editor page (h1 present)
- Check `<meta name="robots">` is not `noindex` on upgrade page (covered in Plan 3)

---

## Plan 3: SEO Route Restructure (~15 min)

**Findings:** SEO-001, SEO-002, SEO-003, SEO-007

**Goal:** Fix pricing page SEO and sitemap accuracy.

### Steps

1. Move `app/(app)/upgrade/` to `app/(marketing)/upgrade/` so it inherits the marketing layout (no `noindex`)
2. Add `generateMetadata` to the upgrade page with proper title, description, OG tags
3. Update `app/sitemap.ts`:
   - Add `/upgrade`, `/privacy`, `/terms`
   - Remove `/login` and `/signup` (these are noindexed)
4. Verify the `(app)` layout still applies `noindex` only to app routes (editor, settings)
5. Update any internal links to `/upgrade` if the route path changes (it shouldn't — route groups don't affect URL)

### Verify

- `curl -s https://localhost:3000/upgrade | grep "noindex"` — should return nothing
- `curl -s https://localhost:3000/sitemap.xml` — should include `/upgrade`, exclude `/login`

---

## Plan 4: Security Hardening (~20 min)

**Findings:** SEC-001, SEC-002, SEC-003

**Goal:** Close rate limiting gaps and add Supabase auth middleware.

### Steps

1. **SEC-002** — Wrap 3 GET endpoints in `withRateLimit()`:
   - `app/api/usage/route.ts`
   - `app/api/account/subscription/route.ts`
   - `app/api/account/usage/route.ts`
2. **SEC-001** — In `app/api/exports/log/route.ts`:
   - Add `withRateLimit()` wrapper (30 req/min for anonymous)
   - Replace inline validation with Zod schema
   - Add string length constraint on `anon_id`
3. **SEC-003** — Create `middleware.ts` at project root:
   - Import Supabase server client
   - Call `supabase.auth.getUser()` to refresh tokens
   - Apply matcher to `/api/:path*`, `/(app)/:path*`, `/(auth)/:path*`

### Verify

- All API routes should have rate limiting (grep for `withRateLimit` in each route file)
- `middleware.ts` exists and matches expected paths

---

## Plan 5: Zustand & Hook Fixes (~30 min)

**Findings:** ARCH-002, ARCH-006, CQ-013, CQ-010, CQ-012, CQ-008, ARCH-010, CQ-017, CQ-018, PERF-009, PERF-010

**Goal:** Fix Zustand selector anti-patterns, stale closures, and hook issues.

### Steps

1. **ARCH-002** — Fix `isPro()` selector pattern in 3 files:
   - `hooks/useExportDownload.ts` line 46
   - `components/features/editor/ExportModal.tsx` line 38
   - `components/features/editor/BackgroundSettings.tsx` line 56
   - Change to: `const subscription = useUserStore(s => s.subscription); const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';`
2. **ARCH-006 + CQ-013** — Fix `useKeyboardShortcuts.ts`:
   - Store alignment in a `useRef` updated via `useLayoutEffect`
   - Remove `alignment` from effect dependency array
   - Read from ref inside the handler
3. **CQ-010** — In `stores/user-store.ts`, add `isInitialized: false` to the `reset()` action
4. **CQ-012** — In `hooks/useZoomPanGestures.ts`, add `[options]` to the `useLayoutEffect` dependency array
5. **CQ-008 + ARCH-010** — Add `logo_url` to `Profile` type in `types/database.ts`, remove the `as unknown as` cast in `useExportDownload.ts`
6. **CQ-017 + CQ-018** — Wrap `exportAndDownload` and `clearError` in `useCallback` in `hooks/useCanvasExport.ts`
7. **PERF-009** — Destructure `onLimitReached` and `onSuccess` as separate params in `useExportDownload` hook
8. **PERF-010** — Narrow `useAlignment` selectors to only select `landmarks` and photo existence, not full Photo objects

### Verify

- TypeScript compiles with no errors
- Export flow works end-to-end
- Keyboard shortcuts respond without dropped keystrokes

---

## Plan 6: Performance — Bundle & Import (~15 min)

**Findings:** PERF-002, PERF-003, SEC-005

**Goal:** Remove dead dependency and lazy-load heavy library.

### Steps

1. **PERF-003 + SEC-005** — Remove Fabric.js:
   - `npm uninstall fabric`
   - Delete `lib/canvas/fabric-setup.ts`
   - Remove `'unsafe-eval'` from CSP in `next.config.ts` (test that nothing breaks)
2. **PERF-002** — Dynamic import for background removal:
   - In `lib/segmentation/background-removal.ts`, change static import to:
     ```ts
     const { removeBackground } = await import("@imgly/background-removal");
     ```
   - Move the import inside the function body
3. **PERF-011** — In `hooks/useExportBackgroundRemoval.ts`, change sequential removal to `Promise.all`

### Verify

- `npm ls fabric` should show "not found"
- Build succeeds without `unsafe-eval` CSP error
- Background removal still works (test with both photos)
- Check bundle size reduction with `npx next-bundle-analyzer` or similar

---

## Plan 7: Performance — Canvas & Memory (Medium — Needs Codex) ⚠️

**Findings:** PERF-001, PERF-005, PERF-006, PERF-008

**Goal:** Fix canvas rendering performance and memory pressure.

### Why Codex?

PERF-001 (moving base64 out of Zustand) and PERF-008 (replacing toDataURL with toBlob) both require changing the `Photo` type, which ripples through ~20 files. This needs architectural review before execution.

### Steps

1. **PERF-005** — Add `requestAnimationFrame` guard to `AlignedPreview.tsx` canvas drawing effect
2. **PERF-006** — Add `IntersectionObserver` to `GifPreview.tsx` to pause animation when not visible
3. **PERF-008** — Replace `canvas.toDataURL()` with `canvas.toBlob()` + `URL.createObjectURL()` in `lib/utils/image.ts`
   - Requires updating `Photo.dataUrl` to support blob URLs
   - Audit all consumers of `Photo.dataUrl`
4. **PERF-001** — Extract binary data from Zustand store:
   - Create `Map<string, BlobData>` cache outside Zustand
   - Store only photo ID + metadata in Zustand
   - Update all components that read `photo.dataUrl`

### Codex Review Questions

- Should PERF-001 and PERF-008 be combined into a single refactor?
- What is the migration path — can we support both data URLs and blob URLs during transition?
- Impact on GIF export which reads `dataUrl` directly?

---

## Plan 8: Architecture Cleanup (Medium — Needs Codex for ARCH-008) ⚠️

**Findings:** ARCH-001, ARCH-003, ARCH-005, ARCH-007, ARCH-008, ARCH-009, CQ-006, CQ-009, CQ-011

**Goal:** Fix architectural issues and wire up missing UI.

### Why Codex?

ARCH-008 (wiring AlignmentControls into the editor) is a UX/layout decision — where should controls go? Bottom panel? Sidebar? Floating? This needs design input.

### Steps (Non-Codex — can YOLO)

1. **ARCH-003** — Add `'use client'` to `useCanvasExport.ts`, `useAlignment.ts`, `useGifExport.ts`
2. **ARCH-005** — Document `exports` table in `docs/architecture/database.md` and add TypeScript type
3. **ARCH-009** — Move `lib/mediapipe/loading-store.ts` to `stores/mediapipe-loading-store.ts` and document
4. **CQ-006** — Remove 4 barrel export `index.ts` files, update imports
5. **CQ-009** — Replace `<style jsx>` in AlignmentControls with Tailwind classes
6. **CQ-011** — Export 18 component prop interfaces (bulk add `export` keyword)

### Steps (Needs Codex)

7. **ARCH-001** — Sync `profiles.subscription_tier` in webhook handler (correctness-critical)
8. **ARCH-007** — Evaluate switching upload routes to service client for storage operations
9. **ARCH-008** — Wire `AlignmentControls` into `EditorContent` layout

### Codex Review Questions

- ARCH-008: What layout pattern for alignment controls? Bottom sheet (mobile)? Sidebar (desktop)? Floating panel?
- ARCH-001: Which fix approach — sync profiles, change RPC, or remove stale columns?

---

## Execution Order (Recommended)

| Order | Plan                              | Time Est. | Dependencies |
| ----- | --------------------------------- | --------- | ------------ |
| 1     | Plan 1: Console Log Cleanup       | ~15 min   | None         |
| 2     | Plan 6: Bundle & Import           | ~15 min   | None         |
| 3     | Plan 2: A11y & SEO Quick Wins     | ~20 min   | None         |
| 4     | Plan 3: SEO Route Restructure     | ~15 min   | None         |
| 5     | Plan 4: Security Hardening        | ~20 min   | None         |
| 6     | Plan 5: Zustand & Hook Fixes      | ~30 min   | None         |
| 7     | Plan 8a: Arch Cleanup (non-Codex) | ~20 min   | None         |
| —     | **Codex Review**                  | —         | Plans 7, 8b  |
| 8     | Plan 7: Canvas & Memory           | ~1-2 hrs  | Codex review |
| 9     | Plan 8b: Arch (ARCH-001, 008)     | ~1 hr     | Codex review |

**Total YOLO-able now:** Plans 1-6 + 8a (~2 hrs, 50 of 64 findings)
**Needs Codex first:** Plans 7 + 8b (~2-3 hrs, 14 remaining findings)

---

## LOW findings deferred (no plan needed)

| ID         | Reason                                                       |
| ---------- | ------------------------------------------------------------ |
| SEC-004    | NODE_ENV guard is fine for production; defense-in-depth only |
| SEC-005    | Resolved when Fabric.js removed (Plan 6)                     |
| A11Y-009   | Contrast barely passes — monitor, no action                  |
| A11Y-010   | `role="application"` is intentional for canvas editor        |
| A11Y-011   | Heading skip h1→h3 — minor, fix when touching settings page  |
| SEO-005    | OG title truncation — cosmetic                               |
| SEO-008    | OG image/Apple icon are TODO — separate design task          |
| SEO-009    | hreflang — only needed if i18n is planned                    |
| CQ-014/015 | Missing return types — style preference, not a bug           |

---

_Generated 2026-03-08 from aggregated code review report_
