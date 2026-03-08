# Claude Plan: Architecture Cleanup (Plan 8)

**Date:** 2026-03-08
**Status:** Independent plan — written before seeing Codex output

---

## Phase 1: Mechanical Cleanup (No risk, no dependencies)

These items are straightforward and can be done first to reduce noise.

### Step 1.1: Add `'use client'` directives (ARCH-003)

**Files modified:**

- `hooks/useCanvasExport.ts` — add `'use client';` as line 1
- `hooks/useAlignment.ts` — add `'use client';` as line 1
- `hooks/useGifExport.ts` — add `'use client';` as line 1

**Verification:** `npx tsc --noEmit` passes. These hooks are already only used in client components, so this is a correctness fix, not a behavior change.

### Step 1.2: Export prop interfaces (CQ-011)

**Files modified:**

- `components/ui/ErrorBoundary.tsx` — change `interface ErrorBoundaryProps` to `export interface ErrorBoundaryProps`
- `components/ui/MagicLinkForm.tsx` — change `interface MagicLinkFormProps` to `export interface MagicLinkFormProps`
- `components/ui/OAuthButtons.tsx` — change `interface OAuthButtonsProps` to `export interface OAuthButtonsProps`
- `components/ui/index.ts` — add `export type { ErrorBoundaryProps }`, `export type { MagicLinkFormProps }`, `export type { OAuthButtonsProps }`

**Verification:** TypeScript compiles. Barrel exports include the new types.

### Step 1.3: Replace `<style jsx>` with Tailwind (CQ-009)

**Files modified:**

- `components/features/editor/AlignmentControls.tsx` — remove the `<style jsx>` block (lines ~464-470) and replace with responsive Tailwind classes (`flex-col sm:flex-row` on the wrapping container)

**Verification:** Visual check that alignment controls wrap correctly on mobile widths.

### Step 1.4: Document exports table (ARCH-005)

**Files modified:**

- `docs/architecture/database.md` — add `exports` table section documenting columns: `id`, `user_id`, `user_type`, `anon_id`, `export_format`, `aspect_ratio`, `exported_at`, `converted_to_signup`, `converted_at`

**Verification:** Documentation matches `types/database.ts` lines 134-168.

---

## Phase 2: Resolve profiles vs subscriptions data inconsistency (ARCH-001)

### Analysis

Three options:

1. **Sync profiles in webhook** — add `UPDATE profiles SET subscription_tier, subscription_status` in the webhook handler
2. **Remove stale columns** — drop `profiles.subscription_tier` and `profiles.subscription_status` via migration
3. **Change nothing** — document that these columns are deprecated

### Recommended approach: Option 2 — Remove stale columns

**Reasoning:**

- The app already reads from `subscriptions` table exclusively (user-store lines 197-219)
- Keeping stale columns invites future bugs where someone reads from profiles instead of subscriptions
- A migration is clean and permanent
- Option 1 adds complexity (another write in the webhook) to maintain data that nothing reads

### Step 2.1: Verify no code reads profiles.subscription_tier

**Action:** Search entire codebase for references to `subscription_tier` on profiles (not subscriptions).

**Expected:** Only `docs/architecture/database.md` and `types/database.ts` reference these columns on profiles. No runtime code reads them.

### Step 2.2: Create Supabase migration

**Files created:**

- `supabase/migrations/[timestamp]_remove_stale_profile_subscription_columns.sql`

```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
```

### Step 2.3: Update TypeScript types

**Files modified:**

- `types/database.ts` — remove `subscription_tier` and `subscription_status` from the `Profile` type

### Step 2.4: Update documentation

**Files modified:**

- `docs/architecture/database.md` — remove subscription columns from profiles table documentation, add note that subscription data lives in `subscriptions` table

**Verification:**

- TypeScript compiles (no code was reading these columns)
- Migration runs without error locally
- User store still loads subscription correctly from subscriptions table

---

## Phase 3: Wire AlignmentControls into editor (ARCH-008)

### Layout Decision

**Recommended: Collapsible section below the canvas, above the export area.**

**Reasoning:**

- Bottom sheet (mobile) + sidebar (desktop) is too complex for a first pass
- Floating panel obscures the canvas preview — bad UX for alignment
- A collapsible section is simple, responsive by default with Tailwind, and doesn't require new layout primitives
- It can be enhanced to a bottom sheet later if needed

**Behavior:**

- Hidden when fewer than 2 photos are loaded
- Hidden when no landmarks are detected
- Auto-expands when alignment mode is activated
- Collapses to a header bar showing current alignment mode

### Step 3.1: Add AlignmentControls to barrel export

**Files modified:**

- `components/features/editor/index.ts` — add `export { AlignmentControls } from './AlignmentControls';`

### Step 3.2: Wire into EditorContent

**Files modified:**

- `app/(app)/editor/_components/EditorContent.tsx`:
  - Import `AlignmentControls` from `components/features/editor`
  - Import alignment state from editor store: `alignment`, `setAlignment`
  - Import landmark detection state (both photos must have landmarks)
  - Render `<AlignmentControls>` in a collapsible `<details>` element below the canvas area
  - Conditionally render only when both photos have landmarks
  - Pass props: `alignment={alignment}`, `onUpdate={setAlignment}`, `isActive={bothPhotosHaveLandmarks}`

### Step 3.3: Ensure responsive layout

**Files modified:**

- `components/features/editor/AlignmentControls.tsx` — verify Tailwind responsive classes work in the new container context. The `<style jsx>` removal from Phase 1 should already handle this.

**Verification:**

- Load two photos with detectable poses → AlignmentControls appears
- Load one photo → AlignmentControls hidden
- Adjust alignment sliders → preview updates in real-time
- Mobile viewport → controls stack vertically
- Desktop viewport → controls lay out horizontally

---

## Phase 4: Evaluate service client for uploads (ARCH-007)

### Analysis

**Current state:** Upload routes use `createClient()` which scopes to the authenticated user's session. This is actually correct — uploads go to user-scoped storage paths, and RLS policies enforce ownership.

**Recommendation: No change needed.**

**Reasoning:**

- Session-scoped client respects RLS — users can only upload to their own paths
- Service client would bypass RLS, requiring manual auth checks (more error-prone)
- The current pattern is the Supabase-recommended approach for user uploads

**Action:** Document the decision in a code comment in both upload routes explaining why `createClient()` is used instead of service client.

**Files modified:**

- `app/api/backgrounds/upload/route.ts` — add comment above `createClient()` call
- `app/api/logos/upload/route.ts` — add comment above `createClient()` call

---

## Phase 5: Loading store location (ARCH-009)

### Analysis

`lib/mediapipe/loading-store.ts` is a domain-specific Zustand store for MediaPipe loading state. Moving it to `stores/` would separate it from the MediaPipe module it belongs to.

**Recommendation: Keep in `lib/mediapipe/` but re-export from `lib/mediapipe/index.ts`.**

**Reasoning:**

- It's a domain store, not a global app store like editor-store or user-store
- Co-location with the MediaPipe module makes the dependency clear
- Moving it would just create a cross-cutting reference back to lib/mediapipe

**Files modified:**

- `lib/mediapipe/index.ts` — add export for loading store if not already exported
- Add JSDoc comment to `loading-store.ts` explaining why it lives here and not in `stores/`

**Verification:** Existing imports still resolve.

---

## Phase 6: Barrel export cleanup (CQ-006)

### Analysis

The remediation plan says "remove 4 barrel export index.ts files." However, research shows the barrel exports are well-organized and useful:

- `components/ui/index.ts` — 16 exports, actively used
- `components/features/editor/index.ts` — 6 exports, actively used
- `lib/mediapipe/index.ts` — 5 exports, clean public API
- `lib/segmentation/index.ts` — 14 exports, clean public API

**Recommendation: Keep barrel exports.** They provide clean public APIs for each module. Removing them would scatter imports across dozens of files.

**Action:** No removal. Just ensure AlignmentControls is added (Step 3.1) and loading-store is exported (Phase 5).

---

## Risks and Trade-offs

| Risk                                                                              | Mitigation                                                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Migration drops profile columns that some external system reads                   | Search for `subscription_tier` in all SQL, RPC functions, and Supabase policies before migrating            |
| AlignmentControls component has props that don't match current editor store shape | Read component props carefully and map to store state before wiring                                         |
| `<details>` element may have inconsistent styling across browsers                 | Use a controlled expand/collapse with state instead of native `<details>` if needed                         |
| Removing `<style jsx>` may break a Next.js styled-jsx dependency                  | Verify that styled-jsx is not used elsewhere; if AlignmentControls is the only user, the dep can be removed |

---

## Execution Order Summary

| Step    | Finding  | Risk   | Dependencies            |
| ------- | -------- | ------ | ----------------------- |
| 1.1     | ARCH-003 | None   | None                    |
| 1.2     | CQ-011   | None   | None                    |
| 1.3     | CQ-009   | Low    | None                    |
| 1.4     | ARCH-005 | None   | None                    |
| 2.1-2.4 | ARCH-001 | Medium | Verify no readers first |
| 3.1-3.3 | ARCH-008 | Medium | Phase 1.3 (style fix)   |
| 4       | ARCH-007 | None   | None                    |
| 5       | ARCH-009 | None   | None                    |
| 6       | CQ-006   | None   | Phase 3.1               |
