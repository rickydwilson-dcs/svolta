# Implementation Plan: Architecture Cleanup (Plan 8)

**Date:** 2026-03-08
**Status:** Ready for implementation — approved by dual-model peer review
**Source:** Synthesised from Claude and Codex independent plans

## Key Differences Between Plans

| Aspect                   | Claude                                         | Codex                                                                                | Synthesised Decision                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001 approach        | Remove stale profile columns immediately       | Add Phase 0 decision gate first — verify schema, check RPC dependencies, then decide | **Codex's Phase 0 gate adopted.** The brief assumed columns exist and are stale, but Codex correctly flags that RPC functions or policies could read from profiles. Verify before acting.             |
| ARCH-001 resolution      | Drop columns via migration                     | Sync-in-webhook as interim, then consider column removal later                       | **Claude's column removal adopted** (if Phase 0 confirms nothing reads them). Dual-writes add permanent complexity for zero benefit. But only after Codex's verification gate passes.                 |
| AlignmentControls layout | Collapsible `<details>` section below canvas   | Bottom sheet (mobile) + side panel (desktop)                                         | **Collapsible section for v1**, with responsive Tailwind. Bottom sheet + side panel is better UX but over-engineered for wiring dead code. Upgrade path noted.                                        |
| Execution order          | Mechanical cleanup first → ARCH-001 → ARCH-008 | ARCH-001 first (correctness) → ARCH-008 → mechanical last                            | **Hybrid: Phase 0 gate first, then mechanical cleanup (low-risk warm-up), then ARCH-001, then ARCH-008.** Correctness decision needs to be locked early, but mechanical work can proceed in parallel. |
| Webhook testing          | Not mentioned                                  | Explicit webhook test file                                                           | **Codex adopted.** Webhook correctness is critical — a test for the migration path is necessary.                                                                                                      |
| ARCH-009 (loading store) | Keep in lib/mediapipe, add JSDoc + re-export   | Not addressed                                                                        | **Claude adopted.** Small but worth documenting the co-location decision.                                                                                                                             |

## Blind Spots Caught

**Codex caught that Claude missed:**

- **Phase 0 decision gate:** Claude assumed profile columns exist and are unused. Codex flagged that RPC functions (like `increment_export_count`) might read `profiles.subscription_tier` to determine tier — this must be verified before any migration.
- **Webhook event coverage gaps:** Codex noted `invoice.payment_failed` and `invoice.payment_succeeded` events should be checked for consistency, not just `checkout.session.completed` and subscription updated/deleted.
- **Webhook test requirement:** Claude's plan had no test coverage for the migration.

**Claude caught that Codex missed:**

- **ARCH-009 (loading store location):** Codex's plan doesn't address the MediaPipe loading store at all. Claude's reasoning to keep it co-located with a JSDoc note is the right call.
- **`<details>` browser inconsistency risk:** Claude flagged that native `<details>` may need a controlled alternative. Not a blocker but worth noting.
- **CQ-006 barrel export analysis:** Claude explicitly reasoned through why barrel exports should be kept rather than removed. Codex assumed keeping them without analysis.
- **ARCH-007 documentation action:** Claude proposed adding code comments to upload routes explaining the client choice. Codex evaluated the decision but didn't propose documenting it in-code.

---

## Implementation Plan

### Phase 0: Decision Gate — Verify Schema Truth (ARCH-001 prerequisite)

**Goal:** Lock the ARCH-001 decision before any code changes.

**Steps:**

1. Search all Supabase migrations for `subscription_tier` and `subscription_status` on the `profiles` table
2. Search all RPC/SQL functions for reads from `profiles.subscription_tier` or `profiles.subscription_status`
3. Search all RLS policies for references to these columns
4. Check `types/database.ts` Profile type for these fields
5. Grep entire codebase for any runtime reads of `profile.subscription_tier` or `profile.subscription_status`

**Files inspected:**

- `supabase/migrations/*.sql`
- `types/database.ts`
- `app/api/usage/increment/route.ts` (or wherever `increment_export_count` RPC is called)
- `app/api/stripe/webhook/route.ts`
- `stores/user-store.ts`

**Decision matrix:**

| Finding                                   | Action                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| No RPC/policy reads from profiles columns | Proceed with column removal (Phase 2)                                   |
| RPC or policy reads from profiles columns | Update RPC/policy to read from subscriptions first, then remove columns |
| External system reads profiles columns    | Sync-in-webhook as interim; plan column removal for later               |

**Verification gate:** Decision documented with evidence. Proceed only when confident.

---

### Phase 1: Mechanical Cleanup (No risk, no dependencies)

Can run immediately while Phase 0 investigation is in progress.

#### Step 1.1: Add `'use client'` directives (ARCH-003)

**Files modified:**

- `hooks/useCanvasExport.ts` — add `'use client';` as line 1
- `hooks/useAlignment.ts` — add `'use client';` as line 1
- `hooks/useGifExport.ts` — add `'use client';` as line 1

**Verification:** `npx tsc --noEmit` passes.

#### Step 1.2: Export prop interfaces (CQ-011)

**Files modified:**

- `components/ui/ErrorBoundary.tsx` — `export interface ErrorBoundaryProps`
- `components/ui/MagicLinkForm.tsx` — `export interface MagicLinkFormProps`
- `components/ui/OAuthButtons.tsx` — `export interface OAuthButtonsProps`
- `components/ui/index.ts` — add `export type { ErrorBoundaryProps, MagicLinkFormProps, OAuthButtonsProps }`

**Verification:** TypeScript compiles. Types importable from `components/ui`.

#### Step 1.3: Replace `<style jsx>` with Tailwind (CQ-009)

**Files modified:**

- `components/features/editor/AlignmentControls.tsx` — remove `<style jsx>` block (~lines 464-470), add `flex-col sm:flex-row` to the wrapping container

**Verification:** Visual check at mobile and desktop widths.

#### Step 1.4: Document exports table (ARCH-005)

**Files modified:**

- `docs/architecture/database.md` — add `exports` table section with all columns from `types/database.ts` lines 134-168

**Verification:** Documentation matches TypeScript types.

#### Step 1.5: Loading store documentation (ARCH-009)

**Files modified:**

- `lib/mediapipe/loading-store.ts` — add JSDoc explaining co-location with MediaPipe module
- `lib/mediapipe/index.ts` — re-export loading store if not already exported

**Verification:** Existing imports still resolve.

**Phase 1 gate:** `npx tsc --noEmit` passes. No behavior changes.

---

### Phase 2: Resolve Billing Data Inconsistency (ARCH-001)

**Prerequisite:** Phase 0 decision is locked.

#### Step 2.1: Audit RPC functions and policies

Search results from Phase 0. If any RPC or policy reads from `profiles.subscription_tier`:

- Update RPC to join/read from `subscriptions` table instead
- Update policy to reference `subscriptions` table
- Create migration for these changes

#### Step 2.2: Create column-removal migration

**Files created:**

- `supabase/migrations/[timestamp]_remove_stale_profile_subscription_columns.sql`

```sql
-- Remove stale billing columns from profiles.
-- Canonical subscription state lives in the subscriptions table.
-- Verified: no RPC, policy, or runtime code reads these columns.
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
```

#### Step 2.3: Update TypeScript types

**Files modified:**

- `types/database.ts` — remove `subscription_tier` and `subscription_status` from `Profile` type

#### Step 2.4: Update documentation

**Files modified:**

- `docs/architecture/database.md` — remove subscription columns from profiles table, add note: "Subscription state is canonical in the `subscriptions` table. See webhook handler for sync logic."

#### Step 2.5: Verify webhook event coverage

**Files inspected:**

- `app/api/stripe/webhook/route.ts` — confirm handling of:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed` (if not handled, add TODO or handle)

#### Step 2.6: Add webhook test

**Files created:**

- `tests/api/stripe/webhook.test.ts` — test that subscription upsert works correctly after column removal. Test idempotency of webhook events.

**Phase 2 gate:**

- TypeScript compiles with no errors
- Migration runs locally without error
- Webhook test passes
- `app/api/account/subscription/route.ts` returns correct `isPro` state

---

### Phase 3: Wire AlignmentControls into Editor (ARCH-008)

#### Step 3.1: Add to barrel export

**Files modified:**

- `components/features/editor/index.ts` — add `export { AlignmentControls } from './AlignmentControls';`

#### Step 3.2: Wire into EditorContent

**Files modified:**

- `app/(app)/editor/_components/EditorContent.tsx`:
  - Import `AlignmentControls` from `components/features/editor`
  - Read alignment state from editor store: `alignment`, `setAlignment`
  - Read landmark state: both photos must have landmarks
  - Render `<AlignmentControls>` in a collapsible section below the canvas
  - Use controlled expand/collapse with React state (not native `<details>`, for cross-browser consistency)
  - Conditionally render only when both photos have landmarks detected
  - Pass props: `alignment={alignment}`, `onUpdate={setAlignment}`, `isActive={true}`

**Layout pattern (v1):**

```
┌──────────────────────────┐
│     Canvas / Preview     │
├──────────────────────────┤
│ ▶ Alignment Controls     │  ← Collapsible header (click to expand)
│   [mode] [opacity] [off] │  ← Controls (when expanded)
├──────────────────────────┤
│     Export Area           │
└──────────────────────────┘
```

- Mobile: controls stack vertically (`flex-col`)
- Desktop: controls lay out horizontally (`sm:flex-row`)
- Auto-expands when alignment mode is first activated
- Upgrade path: can be converted to bottom sheet (mobile) + side panel (desktop) in a future iteration

#### Step 3.3: Verify responsive behavior

**Verification:**

- Load two photos with detectable poses → AlignmentControls section appears
- Load one photo only → section hidden
- Adjust alignment sliders → preview updates in real-time
- Mobile viewport → controls stack vertically
- Desktop viewport → controls lay out horizontally
- Export modal still works with controls visible

---

### Phase 4: Upload Route Documentation (ARCH-007)

**Decision: No code change.** Session-scoped `createClient()` is correct — it respects RLS and follows Supabase best practices for user uploads.

**Files modified:**

- `app/api/backgrounds/upload/route.ts` — add comment above `createClient()` call:
  ```ts
  // Uses session-scoped client (not service client) so RLS policies
  // enforce user-owned storage paths. See ARCH-007 review.
  ```
- `app/api/logos/upload/route.ts` — same comment

**Verification:** Uploads still work for authenticated users.

---

## Risks and Mitigations

| Risk                                                   | Severity | Mitigation                                                                               |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------- |
| RPC or policy reads `profiles.subscription_tier`       | High     | Phase 0 gate catches this before any migration                                           |
| AlignmentControls props don't match editor store shape | Medium   | Read component props and map to store state during Step 3.2                              |
| Cross-browser `<details>` inconsistency                | Low      | Using controlled expand/collapse instead of native element                               |
| `styled-jsx` dependency left orphaned after removal    | Low      | Check if any other file uses `<style jsx>`; if not, dep can be removed from package.json |
| Webhook missing `invoice.payment_failed` handling      | Medium   | Step 2.5 catches this; add handler or document as known gap                              |

---

## Execution Order Summary

| Order | Phase                | Findings                                     | Risk   | Dependencies                 |
| ----- | -------------------- | -------------------------------------------- | ------ | ---------------------------- |
| 0     | Decision Gate        | ARCH-001 prereq                              | None   | None                         |
| 1     | Mechanical Cleanup   | ARCH-003, CQ-011, CQ-009, ARCH-005, ARCH-009 | None   | None (parallel with Phase 0) |
| 2     | Billing Consistency  | ARCH-001                                     | Medium | Phase 0 decision locked      |
| 3     | AlignmentControls    | ARCH-008, CQ-006                             | Medium | Phase 1.3 (style fix)        |
| 4     | Upload Documentation | ARCH-007                                     | None   | None                         |
