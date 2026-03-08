# Aggregated Code Review Report

**Date:** 2026-03-08
**Branch:** develop
**Scope:** full (all 5 domains, all 95 source files)

---

## Executive Summary

| Severity  | Security | Code Quality | A11y/SEO | Performance | Architecture | **Total** |
| --------- | -------- | ------------ | -------- | ----------- | ------------ | --------- |
| Critical  | 0        | 0            | 0        | 0           | 0            | **0**     |
| High      | 0        | 5            | 6        | 3           | 2            | **16**    |
| Medium    | 3        | 7            | 9        | 5           | 5            | **29**    |
| Low       | 2        | 6            | 5        | 3           | 3            | **19**    |
| **Total** | **5**    | **18**       | **20**   | **11**      | **10**       | **64**    |

**No CRITICAL findings.** The codebase is in good shape overall — zero npm vulnerabilities, ESLint passes cleanly, no `any` types, and the privacy architecture (client-side photo processing) is correctly implemented throughout. The 16 High findings are actionable improvements, not production blockers.

---

## Cross-Domain Issues

Findings flagged by 2+ agents targeting the same file or root cause.

### 1. console.log in Export Hot Path (Code Quality + Performance + Architecture)

**Severity:** HIGH | **Files:** `lib/canvas/export.ts`, `lib/canvas/export-gif.ts`

- **Finding IDs:** CQ-001, CQ-002, PERF-007, ARCH-004
- **Summary:** `console.log` calls in the PNG and GIF export paths bypass the structured `canvasLogger` and prevent garbage collection of large objects (image dimensions, frame data) in some browsers. Impacts export performance and leaks internal data to the browser console in production.
- **Fix:** Replace with `canvasLogger.debug(...)` (already imported in nearby files)
- **Effort:** trivial

### 2. useKeyboardShortcuts Re-registers Listener on Every Keystroke (Code Quality + Architecture)

**Severity:** HIGH | **File:** `hooks/useKeyboardShortcuts.ts`

- **Finding IDs:** CQ-013, ARCH-006
- **Summary:** The hook subscribes to the full `alignment` object and lists it in its effect dependency array, causing the global `keydown` listener to be torn down and re-added on every alignment change. During rapid arrow-key input this causes one-frame delays and potential dropped keystrokes.
- **Fix:** Use a `useRef` to hold current alignment values and read from the ref inside the handler (same pattern as `useZoomPanGestures`)
- **Effort:** small

### 3. Unsafe Double-Cast for `profile.logo_url` (Code Quality + Architecture)

**Severity:** MEDIUM | **File:** `hooks/useExportDownload.ts`

- **Finding IDs:** CQ-008, ARCH-010
- **Summary:** `(profile as unknown as { logo_url?: string })?.logo_url` bypasses TypeScript entirely. If `logo_url` is removed or renamed the code silently returns `undefined`. Root cause is a mismatch between the runtime `Profile` type and what the store exposes.
- **Fix:** Add `logo_url` to the `Profile` type in `types/database.ts`
- **Effort:** trivial

### 4. Pricing Page Behind noindex (A11y/SEO + Architecture)

**Severity:** HIGH | **File:** `app/(app)/layout.tsx`, `app/(app)/upgrade/page.tsx`

- **Finding IDs:** SEO-002, SEO-003
- **Summary:** The upgrade/pricing page lives under the `(app)` route group which blanket-applies `noindex, nofollow`. A conversion-critical pricing page receiving zero organic search traffic is a significant business impact.
- **Fix:** Move `/upgrade` to the `(marketing)` route group and add `generateMetadata`
- **Effort:** small

---

## All Findings by Severity

### HIGH (16)

| ID       | Domain       | File                                                  | Issue                                              |
| -------- | ------------ | ----------------------------------------------------- | -------------------------------------------------- |
| CQ-001   | Code Quality | `lib/canvas/export.ts` (line 262)                     | console.log bypassing structured logger            |
| CQ-002   | Code Quality | `lib/canvas/export-gif.ts` (lines 195, 224, 282, 323) | 4× console.log in GIF export path                  |
| CQ-003   | Code Quality | `lib/mediapipe/pose-detector.ts` (lines 64, 133, 138) | console.log on every detector init                 |
| CQ-004   | Code Quality | `lib/debug/alignment-logger.ts` (lines 39, 42)        | Unconditional console.log in debug module          |
| CQ-005   | Code Quality | `app/api/stripe/webhook/route.ts` (lines 55–286)      | 6× console.log bypassing webhookLogger             |
| A11Y-001 | A11y/SEO     | `app/(app)/editor/…/EditorContent.tsx` (line 152)     | Skip link target `#main-content` missing           |
| A11Y-002 | A11y/SEO     | `app/globals.css` (lines 304–354)                     | CSS-class buttons have no `:focus-visible` style   |
| A11Y-003 | A11y/SEO     | `components/ui/SegmentedControl.tsx` (lines 37–74)    | Missing `aria-label` on ToggleGroup                |
| SEO-001  | A11y/SEO     | `app/sitemap.ts` (lines 1–26)                         | Sitemap missing `/upgrade`, `/privacy`, `/terms`   |
| SEO-002  | A11y/SEO     | `app/(app)/upgrade/page.tsx`                          | Upgrade page missing `generateMetadata`            |
| SEO-003  | A11y/SEO     | `app/(app)/layout.tsx` (line 13)                      | All `(app)` routes noindexed including `/upgrade`  |
| PERF-001 | Performance  | `stores/editor-store.ts` (lines 70–72)                | 12–32MB base64 data URLs stored in Zustand         |
| PERF-002 | Performance  | `lib/segmentation/background-removal.ts` (line 9)     | `@imgly/background-removal` statically imported    |
| PERF-003 | Performance  | `package.json` (line 38)                              | Fabric.js (~300KB) installed but unused            |
| ARCH-001 | Architecture | `app/api/stripe/webhook/route.ts` (lines 132–345)     | `profiles.subscription_tier` not synced by webhook |
| ARCH-002 | Architecture | `hooks/useExportDownload.ts` (line 46) + 2 others     | `isPro()` called inside Zustand selector           |

### MEDIUM (29)

| ID       | Domain       | Issue Summary                                                    |
| -------- | ------------ | ---------------------------------------------------------------- |
| SEC-001  | Security     | `exports/log` endpoint: no rate limiting, no Zod validation      |
| SEC-002  | Security     | 3 GET endpoints missing `withRateLimit()` wrapper                |
| SEC-003  | Security     | No `middleware.ts` for Supabase auth session refresh             |
| CQ-006   | Code Quality | 4 barrel export `index.ts` files violate no-barrel-exports rule  |
| CQ-007   | Code Quality | 6× unsafe `as unknown as` casts in Stripe webhook handler        |
| CQ-008   | Code Quality | Unsafe double-cast for `profile.logo_url` in useExportDownload   |
| CQ-009   | Code Quality | `<style jsx>` in AlignmentControls violates Tailwind-only rule   |
| CQ-010   | Code Quality | `user-store.reset()` does not reset `isInitialized`              |
| CQ-011   | Code Quality | 18 component prop interfaces not exported                        |
| CQ-012   | Code Quality | `useLayoutEffect` missing dependency array in useZoomPanGestures |
| A11Y-004 | A11y/SEO     | Editor page has no `<h1>` heading                                |
| A11Y-005 | A11y/SEO     | Upgrade page decorative SVGs missing `aria-hidden="true"`        |
| A11Y-006 | A11y/SEO     | Toggle component has no visible focus indicator                  |
| A11Y-007 | A11y/SEO     | MarketingHeader `<nav>` missing `aria-label`                     |
| A11Y-008 | A11y/SEO     | DropZone error not announced via live region (`role="alert"`)    |
| SEO-004  | A11y/SEO     | Root layout title only 22 chars — underutilised for SEO          |
| SEO-005  | A11y/SEO     | OG title may truncate on Twitter/X                               |
| SEO-006  | A11y/SEO     | Missing `canonical` URL on marketing landing page                |
| SEO-007  | A11y/SEO     | Login/signup in sitemap but noindexed — conflicting signals      |
| PERF-004 | Performance  | GIF frame generation blocks main thread                          |
| PERF-005 | Performance  | AlignedPreview redraws canvas without rAF throttling             |
| PERF-006 | Performance  | GifPreview rAF loop runs even when not visible                   |
| PERF-007 | Performance  | Production console.log in export hot path (see cross-domain)     |
| PERF-008 | Performance  | `scaleImage` uses synchronous `canvas.toDataURL()` (~200ms)      |
| ARCH-003 | Architecture | 3 hooks missing `'use client'` directive                         |
| ARCH-004 | Architecture | console.log in production export path (see cross-domain)         |
| ARCH-005 | Architecture | `exports` table undocumented in database schema docs             |
| ARCH-006 | Architecture | useKeyboardShortcuts re-registers listener on every keystroke    |
| ARCH-007 | Architecture | Upload routes use session client for storage operations          |

### LOW (19)

| ID       | Domain       | Issue Summary                                                        |
| -------- | ------------ | -------------------------------------------------------------------- |
| SEC-004  | Security     | Debug endpoint relies solely on NODE_ENV guard                       |
| SEC-005  | Security     | CSP allows `unsafe-eval` globally (Fabric.js trade-off)              |
| CQ-013   | Code Quality | useKeyboardShortcuts subscribes to full `alignment` object           |
| CQ-014   | Code Quality | ExportModal missing explicit return type                             |
| CQ-015   | Code Quality | Multiple components missing explicit return types                    |
| CQ-016   | Code Quality | AlignedPreview uses `console.error` instead of `editorLogger`        |
| CQ-017   | Code Quality | `useCanvasExport.exportAndDownload` not wrapped in `useCallback`     |
| CQ-018   | Code Quality | `useCanvasExport.clearError` not wrapped in `useCallback`            |
| A11Y-009 | A11y/SEO     | `text-secondary` dark mode contrast barely passes WCAG AA            |
| A11Y-010 | A11y/SEO     | `role="application"` on photo panel suppresses screen reader keys    |
| A11Y-011 | A11y/SEO     | Settings page heading skips h1→h3 (no h2 elements)                   |
| SEO-008  | A11y/SEO     | OG image and Apple icon are TODO placeholders                        |
| SEO-009  | A11y/SEO     | No `hreflang` alternates (relevant if i18n planned)                  |
| PERF-009 | Performance  | `callbacks` object in useExportDownload dep array causes recreation  |
| PERF-010 | Performance  | useAlignment subscribes to full Photo objects (needs only landmarks) |
| PERF-011 | Performance  | Background removal runs sequentially instead of in parallel          |
| ARCH-008 | Architecture | AlignmentControls (525 lines) not rendered anywhere in editor        |
| ARCH-009 | Architecture | Third Zustand store in `lib/` breaks documented two-store arch       |
| ARCH-010 | Architecture | Unsafe type cast in useExportDownload for profile access             |

---

## Per-Domain Breakdown

### Security (5 findings)

**Key themes:** Rate limiting gaps on analytics and read endpoints; missing Supabase middleware for session refresh.

**Quick wins:**

- SEC-002: Add `withRateLimit()` to 3 GET endpoints — trivial
- SEC-001: Add rate limiting + Zod validation to exports/log — small

**Priority fixes:**

- SEC-003: Add `middleware.ts` for Supabase auth token refresh — small

---

### Code Quality (18 findings)

**Key themes:** Production `console.log` statements bypassing the structured logger (5 files, ~16 call sites); barrel exports; unsafe type casts; unexported prop interfaces.

**Quick wins (all trivial):**

- CQ-001 to CQ-004: Replace console.log → canvasLogger/poseLogger
- CQ-008: Add `logo_url` to `Profile` type
- CQ-010: Add `isInitialized: false` to `user-store.reset()`
- CQ-011: Add `export` to 18 prop interfaces (bulk find-replace)
- CQ-012: Add `[options]` dep array to useLayoutEffect
- CQ-017/018: Wrap useCanvasExport functions in useCallback

**Priority fixes:**

- CQ-005: Replace webhook console.log with webhookLogger — small
- CQ-006: Remove barrel exports — medium
- CQ-009: Replace style-jsx with Tailwind classes — trivial

---

### Accessibility & SEO (20 findings)

**Key themes:** Skip link broken on non-marketing pages; no focus-visible on CSS-class buttons; pricing page noindexed; sitemap incomplete.

**Quick wins (all trivial/small):**

- A11Y-001: Add `id="main-content"` to 2 `<main>` elements
- A11Y-004: Add `<h1 className="sr-only">Photo Editor</h1>` to editor
- A11Y-005: Add `aria-hidden="true"` to upgrade page SVGs
- A11Y-006: Add `peer-focus-visible:ring-2` to Toggle track
- A11Y-007: Add `aria-label="Main"` to header nav
- A11Y-008: Add `role="alert"` to DropZone error div
- SEO-001: Add `/upgrade` to sitemap, remove `/login`/`/signup`
- SEO-004: Expand root title to include primary keywords
- SEO-006: Add `alternates.canonical` to marketing page metadata
- SEO-007: Remove noindexed pages from sitemap

**Priority fixes:**

- A11Y-002: Add `:focus-visible` styles to CSS-class buttons — small
- A11Y-003: Add `ariaLabel` prop to SegmentedControl — small
- SEO-002/003: Move `/upgrade` to `(marketing)` route group — small

---

### Performance (11 findings)

**Key themes:** Large binary data in Zustand causing memory pressure; unused Fabric.js inflating bundle; background-removal library synchronously imported.

**Quick wins:**

- PERF-003: Remove unused `fabric` dependency — small (also fixes CSP unsafe-eval)
- PERF-009: Destructure callbacks in useExportDownload — trivial
- PERF-010: Narrow useAlignment selectors — trivial
- PERF-011: Parallel background removal — small

**Priority fixes:**

- PERF-002: Dynamic import for `@imgly/background-removal` — small
- PERF-001: Move base64 data out of Zustand store — medium
- PERF-005: Add rAF guard to AlignedPreview canvas draws — small
- PERF-008: Replace toDataURL() with toBlob() — medium

---

### Architecture (10 findings)

**Key themes:** Subscription sync gap between tables; Zustand reactivity anti-pattern; core AlignmentControls component not wired into UI.

**Quick wins:**

- ARCH-003: Add `'use client'` to 3 hooks — trivial
- ARCH-004: Remove console.log in export.ts — trivial
- ARCH-009: Move or document mediapipe loading store — small
- ARCH-010: Fix Profile type to avoid double-cast — trivial

**Priority fixes:**

- ARCH-001: Sync `profiles.subscription_tier` in webhook handler — medium
- ARCH-002: Fix `isPro()` selector anti-pattern — small
- ARCH-006: Fix useKeyboardShortcuts stale closure — small
- ARCH-008: Wire AlignmentControls into EditorContent — medium

---

## Recommended Remediation Order

### Immediate (High Impact, Low Effort — Ship This Sprint)

1. **PERF-003** — Remove unused Fabric.js dependency — also eliminates the `unsafe-eval` CSP requirement (SEC-005)
2. **SEO-002/003 + SEO-001** — Move `/upgrade` to marketing group, fix sitemap — recovers organic search traffic to pricing page
3. **A11Y-001** — Add `id="main-content"` to auth and app layouts — trivial, fixes broken skip navigation
4. **A11Y-002** — Add `:focus-visible` to CSS-class buttons — WCAG 2.4.7 compliance
5. **A11Y-003** — Add `aria-label` to SegmentedControl — screen reader usability
6. **ARCH-002** — Fix `isPro()` Zustand selector anti-pattern — correctness + performance
7. **CQ-001/002/003** — Replace console.log with structured logger in export/mediapipe paths
8. **SEC-002** — Add `withRateLimit()` to 3 GET endpoints — trivial

### This Sprint (High Impact, Medium Effort)

9. **ARCH-001** — Sync `profiles.subscription_tier` in webhook handler — prevents Pro users from hitting free-tier limits
10. **PERF-002** — Lazy-load `@imgly/background-removal` — saves 2-3MB from initial editor bundle
11. **ARCH-006 + CQ-013** — Fix useKeyboardShortcuts stale closure (same root cause)
12. **SEC-001/003** — Rate-limit exports/log; add Supabase auth middleware
13. **CQ-010** — Fix user-store reset() to include `isInitialized`
14. **A11Y-004 through A11Y-008** — Remaining accessibility quick wins (all trivial)
15. **ARCH-008** — Wire AlignmentControls into the editor UI — core feature currently inaccessible

### Next Sprint (Technical Debt)

16. **PERF-001** — Move base64 data URLs out of Zustand — requires broader type refactoring
17. **PERF-008** — Replace toDataURL() with toBlob() — requires Photo type changes
18. **CQ-006** — Remove barrel exports — medium refactoring
19. **CQ-011** — Export all prop interfaces — bulk trivial change
20. **ARCH-009** — Document or relocate mediapipe loading store

---

## Files

- `findings-security.md` — Full security review details
- `findings-code-quality.md` — Full code quality review details
- `findings-accessibility-seo.md` — Full accessibility and SEO review details
- `findings-performance.md` — Full performance review details
- `findings-architecture.md` — Full architecture review details

---

_Generated by parallel code review agents on 2026-03-08_
