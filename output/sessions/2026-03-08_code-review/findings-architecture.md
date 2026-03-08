# Architecture Review Findings

**Reviewer:** cs-architect
**Scope:** Full architecture review covering stores (2), hooks (10), API routes (11 endpoints across 7 directories), editor components (17), providers (3), lib modules, and type definitions. Verified against documented architecture in `docs/architecture/architecture.md` and `docs/architecture/database.md`.
**Date:** 2026-03-08

## Summary

The Svolta codebase largely adheres to its documented privacy-first, client-side processing architecture. Photos never leave the browser for processing, stores have clear ownership boundaries, and API routes are well-structured with auth checks and rate limiting. However, there are several issues: a data synchronization gap between the `profiles` and `subscriptions` tables that could cause the RPC usage-limit function to use stale data, an anti-pattern in Zustand selector usage that defeats reactivity, missing `'use client'` directives on hooks that use React primitives, and a `console.log` left in production export code.

## Findings

### [HIGH] ARCH-001: Profiles table subscription fields not synced by webhook handler

- **File:** `app/api/stripe/webhook/route.ts` (lines 132-345)
- **Issue:** The webhook handler updates the `subscriptions` table on all subscription lifecycle events (checkout.completed, subscription.updated, subscription.deleted, payment events) but never updates `profiles.subscription_tier` or `profiles.subscription_status`. The database schema documents these fields on `profiles`, and critically, the `increment_export_count` RPC function (documented in `database.md` lines 406-443) reads `subscription_tier` from the `profiles` table to determine if a user is Pro. If this RPC is used, a user who upgrades to Pro would still have `profiles.subscription_tier = 'free'`, causing the RPC to enforce free-tier limits on a paying customer.
- **Impact:** Pro users could be incorrectly rate-limited on exports if the `increment_export_count` RPC is invoked. The server-side `/api/usage/increment` route separately queries the `subscriptions` table (line 68-73), so the current API path works -- but any future code or direct RPC call using the documented pattern would fail.
- **Fix:** Either (a) update `profiles.subscription_tier` and `profiles.subscription_status` in `handleCheckoutCompleted`, `updateSubscriptionStatus`, and `handleSubscriptionDeleted`, or (b) modify the `increment_export_count` RPC to read from the `subscriptions` table instead of `profiles`, or (c) remove the stale `subscription_tier`/`subscription_status` columns from `profiles` entirely to eliminate the dual-source-of-truth.
- **Effort:** medium

### [HIGH] ARCH-002: Zustand selector calls getter function inside selector, defeating reactivity

- **File:** `hooks/useExportDownload.ts` (line 46), `components/features/editor/ExportModal.tsx` (line 38), `components/features/editor/BackgroundSettings.tsx` (line 56)
- **Issue:** The pattern `useUserStore((state) => state.isPro())` calls the getter function `isPro()` inside the selector. In Zustand, selectors should return a value from state, not invoke a function. Because `isPro` is defined as a function on the store (not a derived value), Zustand's shallow equality check compares the return value of `isPro()` rather than tracking the underlying `subscription` state. If `subscription` changes but the boolean result of `isPro()` doesn't change (which is the common case: null -> null), re-renders work; but the selector creates a new function closure on every state change, potentially causing unnecessary re-renders in the opposite direction.
- **Impact:** Components may re-render unnecessarily on every store update (any field change triggers the selector to re-evaluate), or in edge cases may miss updates if Zustand's reference equality short-circuits. This is a correctness and performance concern.
- **Fix:** Either (a) change `isPro` from a function to a derived computed value using Zustand middleware, or (b) select the underlying data (`subscription`) and compute `isPro` in the component/hook: `const subscription = useUserStore(s => s.subscription); const isPro = subscription?.tier === 'pro' && subscription?.status === 'active';`
- **Effort:** small

### [MEDIUM] ARCH-003: Missing `'use client'` directive on hooks that use React hooks

- **File:** `hooks/useCanvasExport.ts`, `hooks/useAlignment.ts`, `hooks/useGifExport.ts`
- **Issue:** These hook files use React primitives (`useState`, `useCallback`, `useEffect`, `useMemo`, `useRef`) but lack the `'use client'` directive. While they currently work because they are only imported from other `'use client'` components, this is fragile -- if any of these hooks were imported from a Server Component or a file without `'use client'`, it would cause a build error. Other hooks in the project (`usePoseDetection.ts`, `useBackgroundRemoval.ts`, `useUsageLimit.ts`, `useExportDownload.ts`, `useExportBackgroundRemoval.ts`) correctly include the directive.
- **Impact:** Fragile imports. A future refactor importing one of these hooks from a server context would produce a confusing build error.
- **Fix:** Add `'use client';` as the first line in `hooks/useCanvasExport.ts`, `hooks/useAlignment.ts`, and `hooks/useGifExport.ts`.
- **Effort:** trivial

### [MEDIUM] ARCH-004: `console.log` left in production export path

- **File:** `lib/canvas/export.ts` (line 262)
- **Issue:** A `console.log('[Export] Dynamic dimensions:', {...})` statement is present in the `exportCanvas` function. This runs on every single PNG export in production, logging internal dimension calculations to the browser console.
- **Impact:** Information leakage (internal dimensions, alignment data visible in browser console), console noise for end users, minor performance overhead on every export.
- **Fix:** Remove the `console.log` or replace it with the project's `canvasLogger.debug()` pattern which respects log levels.
- **Effort:** trivial

### [MEDIUM] ARCH-005: `exports` table used in API but not documented in database schema

- **File:** `app/api/exports/log/route.ts` (line 72-82), `docs/architecture/database.md`
- **Issue:** The `/api/exports/log` endpoint inserts into an `exports` table with columns `user_id`, `user_type`, `anon_id`, `export_format`, `aspect_ratio`. This table is not documented in the database schema documentation, which only describes `profiles`, `subscriptions`, `usage`, and `webhook_events`. There is no migration file, no TypeScript type definition, and no RLS policy documentation for this table.
- **Impact:** Undocumented schema makes it difficult for developers to understand the full data model. Missing RLS documentation means the security posture of this table is unclear. The route uses `createServiceClient()` to bypass RLS, which is appropriate for analytics but the table's RLS policies (or lack thereof) should be documented.
- **Fix:** Document the `exports` table in `docs/architecture/database.md` including its schema, purpose, RLS policies, and add a TypeScript type definition in `types/database.ts`.
- **Effort:** small

### [MEDIUM] ARCH-006: `useKeyboardShortcuts` hook creates stale closure over `alignment` state

- **File:** `hooks/useKeyboardShortcuts.ts` (lines 30, 56-90)
- **Issue:** The hook subscribes to the full `alignment` object from the store (line 30) and uses it in the keyboard event handler. The event handler is re-created whenever `alignment` changes (it's in the dependency array on line 139). This means every alignment change (e.g., every arrow key press) tears down and sets up the global `keydown` listener. More critically, the `alignment` object reference changes on every store update, causing the effect to re-run on every keystroke, which adds/removes event listeners rapidly.
- **Impact:** Performance degradation during rapid keyboard input. Each keystroke triggers: store update -> re-render -> effect cleanup -> new listener registration. This causes a one-frame delay and potential dropped keystrokes.
- **Fix:** Use a ref to hold the current alignment values and read from the ref inside the handler, similar to the pattern used in `useZoomPanGestures.ts` (which uses `optionsRef` + `useLayoutEffect` to avoid re-registering listeners). The effect should only depend on `enabled` and the store action functions (which are stable references).
- **Effort:** small

### [MEDIUM] ARCH-007: Upload API routes use session-scoped client for storage operations

- **File:** `app/api/backgrounds/upload/route.ts` (line 29), `app/api/logos/upload/route.ts` (line 29)
- **Issue:** Both upload routes use `createClient()` from `@/lib/supabase/server` (session-scoped anon client) for Supabase Storage operations. The architecture docs state that API routes should use the service client for admin operations. While the session client works for user-scoped storage operations if storage RLS policies are configured correctly, the subscription check on line 42-46 queries the `subscriptions` table using the session client. If the `subscriptions` table RLS policy only allows SELECT (as documented), this works -- but using the session client for storage uploads depends on Storage bucket policies being correctly configured for authenticated users.
- **Impact:** If Storage bucket policies are not correctly configured, uploads would silently fail. Using the service client would be more reliable and consistent with the webhook handler pattern.
- **Fix:** Consider using `createServiceClient()` for the storage operations (upload, delete, list) while keeping the session client for auth verification. This ensures storage operations are not dependent on storage RLS configuration.
- **Effort:** small

### [LOW] ARCH-008: `AlignmentControls` component not used in the editor layout

- **File:** `components/features/editor/AlignmentControls.tsx`, `app/(app)/editor/_components/EditorContent.tsx`
- **Issue:** The `AlignmentControls` component is a fully-built 525-line component with anchor selection, scale/offset controls, keyboard shortcuts reference, and a help modal. However, `EditorContent.tsx` does not render it. The editor layout shows two `PhotoPanel` components and an `ExportModal`, but no alignment controls are visible to the user. The `useAlignment` hook and `useKeyboardShortcuts` hook are also not used in the editor. This means users have no UI to change alignment anchor, adjust scale/offset, toggle landmarks, or auto-align -- all fundamental features of the app.
- **Impact:** Core alignment features are implemented but not accessible through the UI. The editor page has no visible controls for alignment, landmarks, or grid toggles.
- **Fix:** Integrate `AlignmentControls` into the `EditorContent` layout (e.g., as a bottom panel, sidebar, or floating controls). Wire up `useAlignment` and `useKeyboardShortcuts` hooks.
- **Effort:** medium

### [LOW] ARCH-009: Third Zustand store in lib/ breaks documented two-store architecture

- **File:** `lib/mediapipe/loading-store.ts`
- **Issue:** The architecture documentation describes exactly two Zustand stores: `editor-store.ts` (canvas/editor state) and `user-store.ts` (auth/subscription state). A third store `useMediaPipeLoading` exists in `lib/mediapipe/loading-store.ts` managing MediaPipe loading state (isLoading, progress, error). This store is not documented and sits in `lib/` rather than `stores/`, breaking the convention that all stores live in the `stores/` directory.
- **Impact:** Developers following the architecture docs would not know about this store. Its location in `lib/` rather than `stores/` breaks the organizational convention.
- **Fix:** Either (a) move it to `stores/mediapipe-loading-store.ts` and document it, or (b) fold the loading state into the editor store since MediaPipe loading is editor-related state, or (c) if it's no longer needed (the `usePoseDetection` hook manages its own state), remove it.
- **Effort:** small

### [LOW] ARCH-010: Inconsistent error handling in `useExportDownload` - `profile` accessed with unsafe cast

- **File:** `hooks/useExportDownload.ts` (lines 82-84)
- **Issue:** The `profile` from the user store is cast with `(profile as unknown as { logo_url?: string })?.logo_url` to access `logo_url`. The `Profile` type in `types/database.ts` does include `logo_url`, but the store's `Profile` type imported from `@/types/database` may not match. The double `as unknown as` cast bypasses TypeScript's type safety entirely.
- **Impact:** If the profile shape changes or `logo_url` is removed, this code would silently produce `undefined` with no compile-time warning. The unsafe cast suggests a type mismatch between the store's profile type and the actual database schema.
- **Fix:** Update the `Profile` type definition to include `logo_url` (if not already present in the runtime type), or update the store to expose `logo_url` directly so the cast is unnecessary.
- **Effort:** trivial

## Statistics

- Critical: 0
- High: 2
- Medium: 5
- Low: 3
- Total: 10
