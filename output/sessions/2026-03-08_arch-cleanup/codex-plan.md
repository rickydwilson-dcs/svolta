# Architecture Cleanup Plan (Codex)

## Approach Summary

- Use `subscriptions` as the canonical billing state and eliminate dual-source drift.
- Wire the already-built `AlignmentControls` into `EditorContent` with a mobile-first bottom sheet + desktop side panel pattern, without touching export pipeline semantics.
- Treat upload-route client choice (`createClient` vs service client) as a security decision: keep session-scoped `createClient()` unless a concrete RLS blocker is proven.

## Phase 0: Baseline + Decision Gate (must pass before edits)

1. Validate current schema truth for `profiles` billing columns and Stripe IDs.
2. Confirm how RPC `increment_export_count` determines tier/status in live DB.
3. Capture a quick baseline for editor behavior and webhook tests.

Files / surfaces inspected

- `supabase/migrations/*.sql`
- `types/database.ts`
- `app/api/usage/increment/route.ts`
- `app/api/stripe/webhook/route.ts`

Verification gate

- Produce a short matrix: `profiles` has/doesn’t have `subscription_tier`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`; RPC reads from `profiles` or `subscriptions`.
- Decision lock:
  - If columns exist: implement sync-in-webhook now, then decide later if migration removes columns.
  - If columns do not exist: remove stale docs/assumptions and keep all reads/writes in `subscriptions`.

Risk / trade-off

- Skipping this gate risks implementing the wrong model because repo docs/types/migrations currently conflict.

## Phase 1: ARCH-001 Billing Consistency (correctness-critical)

1. Refactor webhook to centralize subscription persistence in one helper that writes `subscriptions` and (conditionally) `profiles` fields when present.
2. Ensure all relevant Stripe events map consistently: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.
3. Add/adjust tests for both idempotency and profile-sync behavior (or explicit non-use if columns removed).
4. If decision is “remove stale profile columns,” add a migration to drop columns and update any DB function/policy depending on them.

Modify/create

- `app/api/stripe/webhook/route.ts`
- `tests/api/stripe/webhook.test.ts`
- `supabase/migrations/<new>_billing_source_of_truth_cleanup.sql` (if column-removal path)
- `types/database.ts` (only if schema path requires it)

Verification gate

- `vitest tests/api/stripe/webhook.test.ts` passes.
- Simulated event sequence leaves canonical state coherent (`subscriptions` always correct; `profiles` either synced or removed by design).
- `app/api/account/subscription/route.ts` continues returning correct `isPro` state.

Risk / trade-off

- Syncing both tables preserves compatibility but keeps dual writes.
- Removing profile billing columns is cleaner long-term but requires careful DB-function/policy audit.

## Phase 2: ARCH-008 Wire AlignmentControls Into Editor

1. Integrate `AlignmentControls` into `EditorContent` and export barrel.
2. Gate rendering by readiness: both photos present + both landmark sets detected.
3. Connect `useAlignment` for `canAlign/autoAlign`; pass `onAutoAlign`.
4. Enable keyboard shortcuts while editor is active and controls are relevant.
5. Responsive layout:
   - Mobile: controls in a collapsible bottom sheet.
   - Desktop: right-side fixed-width panel beside editor canvas.
6. Keep existing export flow and store contracts unchanged.

Modify/create

- `app/(app)/editor/_components/EditorContent.tsx`
- `components/features/editor/index.ts`
- `components/features/editor/AlignmentControls.tsx` (remove `<style jsx>`; replace with Tailwind responsive classes)

Verification gate

- Manual: controls hidden until both photos + landmarks exist; then visible and functional.
- Manual: mobile viewport uses bottom-sheet interaction without clipping core editor actions.
- Manual: desktop viewport shows stable side panel; export modal still works.
- Optional: smoke test around alignment updates not regressing canvas export inputs.

Risk / trade-off

- Additional UI density on small screens can hurt usability; bottom-sheet pattern minimizes this.

## Phase 3: Mechanical Cleanup (ARCH-003/005/009 + CQ items)

1. Add `'use client'` to hooks that use client React APIs:
   - `hooks/useCanvasExport.ts`
   - `hooks/useAlignment.ts`
   - `hooks/useGifExport.ts`
2. Document `exports` table in DB architecture docs.
3. Export missing prop interfaces/types from UI components.
4. Align barrel exports so `AlignmentControls` is first-class export.

Modify

- `hooks/useCanvasExport.ts`
- `hooks/useAlignment.ts`
- `hooks/useGifExport.ts`
- `docs/architecture/database.md`
- `components/ui/ErrorBoundary.tsx`
- `components/ui/MagicLinkForm.tsx`
- `components/ui/OAuthButtons.tsx`
- `components/ui/index.ts`
- `components/features/editor/index.ts`

Verification gate

- Type-check/build succeeds for App Router client/server boundaries.
- Docs contain `exports` schema, purpose, and usage notes aligned to `types/database.ts`.
- Public type exports are importable without path-deep imports.

Risk / trade-off

- Mostly low-risk mechanical edits; primary risk is accidental client/server boundary regression.

## Phase 4: ARCH-007 Upload Route Client Strategy (security review + optional change)

1. Evaluate whether upload routes actually require service-role access.
2. Keep `createClient()` by default (least privilege, session/RLS aligned).
3. Only switch specific operations to service client if a verified functional blocker exists, and scope service use to minimal calls.

Primary files

- `app/api/backgrounds/upload/route.ts`
- `app/api/logos/upload/route.ts`
- `lib/supabase/server.ts`
- `lib/supabase/service.ts`

Verification gate

- Pro user upload/delete succeeds; non-Pro blocked; unauthenticated blocked.
- No broadened write capability beyond current authenticated user.

Risk / trade-off

- Service client simplifies bypassing RLS but increases blast radius if auth checks regress.

## Recommended Execution Order

1. Phase 0 (schema/RPC decision gate)
2. Phase 1 (billing correctness)
3. Phase 2 (AlignmentControls wiring)
4. Phase 3 (mechanical cleanup)
5. Phase 4 (upload-client review, likely no code change)

## Final Acceptance Checklist Mapping

1. `profiles.subscription_tier` synced **or** removed with migration: covered by Phase 1 + Phase 0 decision.
2. `AlignmentControls` rendered when both photos + landmarks exist: Phase 2.
3. `'use client'` on `useCanvasExport`/`useAlignment`/`useGifExport`: Phase 3.
4. `exports` table documented in `docs/architecture/database.md`: Phase 3.
5. `<style jsx>` removed from `AlignmentControls` and replaced with Tailwind classes: Phase 2.
6. Unexported prop interfaces exported: Phase 3.
