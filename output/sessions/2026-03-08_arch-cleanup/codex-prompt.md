# Codex Peer Review Prompt

Paste this entire file into Codex in VS Code.

---

## Your task

You are doing an independent architectural peer review. Read the brief below, then produce your own implementation plan.

Save your plan as `codex-plan.md` in this folder:
`output/sessions/2026-03-08_arch-cleanup/`

When done, output this exact command so the user can copy-paste it into Claude Code:

```
/plan.with.codex synthesise
```

---

## Brief: Architecture Cleanup (Plan 8)

**Date:** 2026-03-08
**Project:** Svolta — fitness photo alignment SaaS (Next.js 16, Tailwind CSS 4, Supabase, MediaPipe, Fabric.js, Stripe)
**Note:** This brief is sent to both Claude and Codex independently. Your plans will be synthesised into a final implementation spec. Do not look at `claude-plan.md` before writing your own plan.

### Problem Statement

The codebase has accumulated architectural debt across three categories:

1. **Stale data sync (ARCH-001):** The Stripe webhook handler syncs subscription data to the `subscriptions` table but never updates `profiles.subscription_tier` or `profiles.subscription_status`. These profile columns exist but are stale. The user-store reads from `subscriptions`, not `profiles`, so the app works — but the data inconsistency is a correctness risk.

2. **Dead UI code (ARCH-008):** `AlignmentControls` is a fully implemented component (~525 lines) with alignment mode selection, opacity/offset sliders, and landmark toggles — but it is not imported or rendered anywhere. It's dead code that was built but never wired into the editor layout.

3. **Miscellaneous cleanup (ARCH-003, ARCH-005, ARCH-007, ARCH-009, CQ-006, CQ-009, CQ-011):** Missing `'use client'` directives, undocumented database table, inconsistent barrel exports, JSX styles that should be Tailwind, and unexported prop types.

### Goals

- Resolve the `profiles` vs `subscriptions` data inconsistency
- Wire `AlignmentControls` into the editor with a sensible layout pattern
- Complete the mechanical cleanup items (directives, docs, exports, styles)

### Non-Goals

- Redesigning the subscription billing model
- Building new alignment features (only wiring existing component)
- Migrating to a different state management library
- Full redesign of the editor layout

### Acceptance Criteria

1. `profiles.subscription_tier` is either kept in sync by the webhook OR the stale columns are removed with a migration
2. `AlignmentControls` renders in the editor when both photos are loaded and landmarks are detected
3. All three hooks (`useCanvasExport`, `useAlignment`, `useGifExport`) have `'use client'` directives
4. The `exports` table is documented in `docs/architecture/database.md`
5. `<style jsx>` in AlignmentControls is replaced with Tailwind classes
6. Component prop interfaces that are currently unexported are exported

### Constraints

- **Next.js 16 App Router:** All hooks using React client APIs must have `'use client'` at the top
- **Zustand stores:** `stores/editor-store.ts` and `stores/user-store.ts` are the two global stores. The editor store holds photo state, alignment state, and canvas state
- **Supabase auth:** The webhook handler uses `createServiceClient()` from `lib/supabase/service.ts` for RLS bypass. Upload routes use `createClient()` (session-scoped)
- **Mobile-first editor:** The editor must work on mobile. Any layout changes for AlignmentControls must be responsive
- **No breaking changes to existing export flow** — the export pipeline reads from editor store

### Relevant Architecture

**Subscription data flow:**

- Stripe webhook (`app/api/stripe/webhook/route.ts`) handles `checkout.session.completed`, `customer.subscription.updated/deleted`
- Webhook upserts to `subscriptions` table (lines 152-167, 219-239)
- User store (`stores/user-store.ts`) loads subscription from `subscriptions` table via `fetchProfile()` (lines 197-219)
- `profiles` table has `subscription_tier` and `subscription_status` columns (documented in `docs/architecture/database.md` line 106-107) but they are NEVER written to by the webhook

**Editor layout:**

- Editor page: `app/(app)/editor/page.tsx`
- Editor content: `app/(app)/editor/_components/EditorContent.tsx`
- AlignmentControls: `components/features/editor/AlignmentControls.tsx` (~525 lines, fully implemented, never imported)
- AlignmentControls props expect: `alignment` state object, `onUpdate` callback, `isActive` boolean
- Editor store has alignment state: `alignment`, `setAlignment`, `resetAlignment`

**Supabase clients:**

- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server component client
- `lib/supabase/service.ts` — service role client (RLS bypass, used in webhooks)
- Upload routes (`app/api/backgrounds/upload/route.ts`, `app/api/logos/upload/route.ts`) use `createClient()` from server.ts

**Barrel exports:**

- `components/features/editor/index.ts` — 6 exports (AlignmentControls missing)
- `components/ui/index.ts` — 16 exports + types
- `lib/mediapipe/index.ts` — 5 exports
- `lib/segmentation/index.ts` — 14 exports + types

### Codebase Snapshot

| File                                               | Description                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| `app/api/stripe/webhook/route.ts`                  | Stripe webhook handler — syncs to subscriptions table only                |
| `stores/user-store.ts`                             | User store — reads subscription from subscriptions table                  |
| `stores/editor-store.ts`                           | Editor store — photo state, alignment state, canvas state                 |
| `types/database.ts`                                | TypeScript types for all Supabase tables (exports table at lines 134-168) |
| `docs/architecture/database.md`                    | Database documentation — missing exports table                            |
| `components/features/editor/AlignmentControls.tsx` | Fully implemented but unused alignment UI component                       |
| `app/(app)/editor/_components/EditorContent.tsx`   | Editor layout — where AlignmentControls should be wired                   |
| `hooks/useCanvasExport.ts`                         | Missing 'use client' directive                                            |
| `hooks/useAlignment.ts`                            | Missing 'use client' directive                                            |
| `hooks/useGifExport.ts`                            | Missing 'use client' directive                                            |
| `lib/mediapipe/loading-store.ts`                   | MediaPipe loading Zustand store (in lib/, not stores/)                    |
| `components/features/editor/index.ts`              | Barrel export — missing AlignmentControls                                 |
| `components/ui/ErrorBoundary.tsx`                  | Props interface not exported                                              |
| `components/ui/MagicLinkForm.tsx`                  | Props interface not exported                                              |
| `components/ui/OAuthButtons.tsx`                   | Props interface not exported                                              |
| `app/api/backgrounds/upload/route.ts`              | Uses createClient(), not service client                                   |
| `app/api/logos/upload/route.ts`                    | Uses createClient(), not service client                                   |

### What a Good Plan Should Cover

- **ARCH-001:** Should we sync profiles columns in the webhook, remove the stale columns with a migration, or change the user-store to write to profiles? What's the safest approach given that the app currently works?
- **ARCH-008:** Where should AlignmentControls render — bottom sheet on mobile, sidebar on desktop, floating panel, or collapsible section within the existing editor layout? What props need to be connected?
- **ARCH-007:** Is switching upload routes to service client actually necessary? What are the security/functionality trade-offs?
- **Ordering:** Which steps should be done first? Are there any dependencies between ARCH-001 and the other changes?

---

## Deliverable

Produce a numbered implementation plan with:

- Clear phases/steps
- Which files are created or modified at each step
- Verification gates between steps (how to confirm each step succeeded before moving on)
- Any risks or trade-offs worth calling out

Save your response as `codex-plan.md` in `output/sessions/2026-03-08_arch-cleanup/`.

Then output this command for the user to copy-paste into Claude Code:
`/plan.with.codex synthesise`
