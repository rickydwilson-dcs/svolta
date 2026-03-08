# YOLO Implementation Brief: Architecture Cleanup (Plan 8)

**Branch:** feature/arch-cleanup (created from develop)
**Session spec:** output/sessions/2026-03-08_arch-cleanup/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The codebase has accumulated architectural debt: stale `profiles.subscription_tier` columns that are never written to by the webhook, a fully-built `AlignmentControls` component (~525 lines) that is dead code, and miscellaneous cleanup items (missing `'use client'` directives, unexported prop types, JSX styles, undocumented database table). A dual-model peer review (Claude + Codex) produced a synthesis with a Phase 0 decision gate before the migration, mechanical cleanup in parallel, and a simple collapsible layout for wiring AlignmentControls.

The synthesis was reviewed and approved. Implement it exactly as specified below.

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
git checkout -b feature/arch-cleanup   # create feature branch from develop — NEVER write directly to develop
npm run type-check                      # must be clean before starting
```

---

## Phase 0: Decision Gate — Verify Schema Truth (ARCH-001 prerequisite)

**Goal:** Lock the ARCH-001 decision before any code changes.
**Model:** haiku — grep searches and content validation only

**Steps:**

1. Search all Supabase migrations for `subscription_tier` and `subscription_status` on the `profiles` table:

   ```bash
   grep -r "subscription_tier\|subscription_status" supabase/migrations/ --include="*.sql"
   ```

2. Search all RPC/SQL functions for reads from `profiles.subscription_tier` or `profiles.subscription_status`:

   ```bash
   grep -r "profiles.*subscription_tier\|profiles.*subscription_status" supabase/ --include="*.sql"
   ```

3. Search all RLS policies for references to these columns (check Supabase dashboard or migration files).

4. Check `types/database.ts` Profile type for these fields:

   ```bash
   grep -A 5 "subscription_tier\|subscription_status" types/database.ts
   ```

5. Grep entire codebase for any runtime reads of `profile.subscription_tier` or `profile.subscription_status`:
   ```bash
   grep -r "subscription_tier\|subscription_status" app/ components/ hooks/ stores/ lib/ --include="*.ts" --include="*.tsx"
   ```

**Decision matrix:**

| Finding                                   | Action                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| No RPC/policy reads from profiles columns | Proceed with column removal in Phase 2                                               |
| RPC or policy reads from profiles columns | Update RPC/policy to read from `subscriptions` first in Phase 2, then remove columns |
| External system reads profiles columns    | STOP and report — sync-in-webhook needed, outside this brief's scope                 |

**Verification gate:**

```bash
# Verification gate — document decision before proceeding
# Write decision to stdout: "DECISION: [remove columns | update RPC first | STOP]"
# Evidence: list every file that references these columns
```

No commit for this phase — investigation only.

---

## Phase 1: Mechanical Cleanup (ARCH-003, CQ-011, CQ-009, ARCH-005, ARCH-009)

**Goal:** Complete all low-risk cleanup items.
**Model:** haiku — mechanical find-replace and content additions

Can run immediately (no dependency on Phase 0).

### Step 1.1: Add `'use client'` directives (ARCH-003)

Spawn three parallel edits:

**Files modified:**

- `hooks/useCanvasExport.ts` (120 lines) — add `'use client';` as line 1 (before any JSDoc or imports)
- `hooks/useAlignment.ts` (153 lines) — add `'use client';` as line 1
- `hooks/useGifExport.ts` (212 lines) — add `'use client';` as line 1

### Step 1.2: Export prop interfaces (CQ-011)

Spawn three parallel edits:

**Files modified:**

- `components/ui/ErrorBoundary.tsx` (139 lines) — change `interface ErrorBoundaryProps` to `export interface ErrorBoundaryProps`
- `components/ui/MagicLinkForm.tsx` (117 lines) — change `interface MagicLinkFormProps` to `export interface MagicLinkFormProps`
- `components/ui/OAuthButtons.tsx` (84 lines) — change `interface OAuthButtonsProps` to `export interface OAuthButtonsProps`
- `components/ui/index.ts` (27 lines) — add type re-exports: `export type { ErrorBoundaryProps } from './ErrorBoundary';`, `export type { MagicLinkFormProps } from './MagicLinkForm';`, `export type { OAuthButtonsProps } from './OAuthButtons';`

### Step 1.3: Replace `<style jsx>` with Tailwind (CQ-009)

**Files modified:**

- `components/features/editor/AlignmentControls.tsx` (525 lines) — read the file, find the `<style jsx>` block (~lines 464-470), remove it entirely. Find the wrapping container that the media query targeted and add `flex-col sm:flex-row` Tailwind classes to it.
- After removal, check if any other file in the project uses `<style jsx>`:
  ```bash
  grep -r "style jsx" components/ app/ --include="*.tsx"
  ```
  If AlignmentControls was the only user, note this in the commit message (styled-jsx dep may be removable).

### Step 1.4: Document exports table (ARCH-005)

**Files modified:**

- `docs/architecture/database.md` (905 lines) — add an `## exports` section after the existing table documentation. Include all columns from `types/database.ts` lines 134-168: `id` (uuid), `user_id` (uuid, nullable), `user_type` ('anonymous' | 'free' | 'pro'), `anon_id` (text, nullable), `export_format` ('png' | 'gif'), `aspect_ratio` ('1:1' | '4:5' | '9:16'), `exported_at` (timestamptz), `converted_to_signup` (boolean), `converted_at` (timestamptz, nullable).

### Step 1.5: Loading store documentation (ARCH-009)

**Files modified:**

- `lib/mediapipe/loading-store.ts` (19 lines) — add JSDoc at the top explaining co-location: this is a domain-specific Zustand store for MediaPipe loading state, intentionally co-located with the MediaPipe module rather than in `stores/` (which holds global app stores).
- `lib/mediapipe/index.ts` (7 lines) — check if loading store is already exported. If not, add `export { useMediaPipeLoading } from './loading-store';` (or whatever the store's export name is — read the file first).

### Verification gate

```bash
# Verification gate — STOP if this fails
npm run type-check
```

### Commit

```bash
git add hooks/useCanvasExport.ts hooks/useAlignment.ts hooks/useGifExport.ts \
  components/ui/ErrorBoundary.tsx components/ui/MagicLinkForm.tsx components/ui/OAuthButtons.tsx \
  components/ui/index.ts components/features/editor/AlignmentControls.tsx \
  docs/architecture/database.md lib/mediapipe/loading-store.ts lib/mediapipe/index.ts

git commit -m "$(cat <<'EOF'
fix: mechanical cleanup — use client directives, prop exports, JSX→Tailwind, docs

- ARCH-003: Add 'use client' to useCanvasExport, useAlignment, useGifExport
- CQ-011: Export ErrorBoundaryProps, MagicLinkFormProps, OAuthButtonsProps
- CQ-009: Replace <style jsx> in AlignmentControls with Tailwind responsive classes
- ARCH-005: Document exports table in database.md
- ARCH-009: Add JSDoc to MediaPipe loading store, ensure re-export

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Resolve Billing Data Inconsistency (ARCH-001)

**Goal:** Remove stale `subscription_tier` and `subscription_status` columns from `profiles` table (or update RPC/policies first if Phase 0 found dependencies).
**Model:** sonnet — cross-file reasoning needed for migration + type update + webhook audit

**Prerequisite:** Phase 0 decision is locked.

### Step 2.1: Conditional — Update RPC/policies if needed

If Phase 0 found any RPC function or policy reading from `profiles.subscription_tier`:

- Read the relevant migration file
- Create a new migration that alters the RPC/policy to read from `subscriptions` table instead
- File created: `supabase/migrations/[timestamp]_update_rpc_to_use_subscriptions.sql`

If Phase 0 found no dependencies, skip this step.

### Step 2.2: Create column-removal migration

**Files created:**

- `supabase/migrations/[timestamp]_remove_stale_profile_subscription_columns.sql`

Use the current timestamp formatted as `YYYYMMDDHHMMSS`. Content:

```sql
-- Remove stale billing columns from profiles.
-- Canonical subscription state lives in the subscriptions table.
-- Verified: no RPC, policy, or runtime code reads these columns.
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_tier;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
```

### Step 2.3: Update TypeScript types

**Files modified:**

- `types/database.ts` (225 lines) — remove `subscription_tier` and `subscription_status` fields from the `Profile` type. Read the file first to find exact field names and lines.

### Step 2.4: Update documentation

**Files modified:**

- `docs/architecture/database.md` — find the profiles table section, remove `subscription_tier` and `subscription_status` from the column list. Add a note: "Subscription state is canonical in the `subscriptions` table. See `app/api/stripe/webhook/route.ts` for sync logic."

### Step 2.5: Verify webhook event coverage

**Files inspected:**

- `app/api/stripe/webhook/route.ts` (346 lines) — read and verify handling of:
  - `checkout.session.completed` ✓
  - `customer.subscription.updated` ✓
  - `customer.subscription.deleted` ✓
  - `invoice.payment_failed` — if not handled, add a TODO comment noting it should be handled for grace periods

Do NOT add new event handlers — just verify and document gaps.

### Step 2.6: Add webhook test

**Files created:**

- `tests/api/stripe/webhook.test.ts` — write a Vitest test that:
  1. Tests that `handleCheckoutCompleted` correctly upserts to `subscriptions` table
  2. Tests that `updateSubscriptionStatus` correctly updates subscription status
  3. Tests idempotency (same event processed twice produces same result)
  4. Does NOT test `profiles` columns (they're being removed)

Read `app/api/stripe/webhook/route.ts` first to understand the helper function signatures and what can be unit-tested vs what needs mocking.

### Verification gate

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run test -- tests/api/stripe/webhook.test.ts
```

### Commit

```bash
git add supabase/migrations/ types/database.ts docs/architecture/database.md \
  app/api/stripe/webhook/route.ts tests/api/stripe/webhook.test.ts

git commit -m "$(cat <<'EOF'
fix(billing): remove stale profile subscription columns, add webhook tests (ARCH-001)

- Drop profiles.subscription_tier and profiles.subscription_status via migration
- Update Profile type in database.ts
- Update database.md documentation
- Verify webhook event coverage (document any gaps)
- Add webhook test for subscription upsert idempotency

Canonical subscription state now exclusively in subscriptions table.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Wire AlignmentControls into Editor (ARCH-008)

**Goal:** Wire the existing AlignmentControls component into EditorContent with a collapsible section layout.
**Model:** sonnet — component wiring across 3 files, needs to understand props and store shape

### Step 3.1: Add to barrel export

**Files modified:**

- `components/features/editor/index.ts` (6 lines) — add `export { AlignmentControls } from './AlignmentControls';`

### Step 3.2: Wire into EditorContent

**Files modified:**

- `app/(app)/editor/_components/EditorContent.tsx` (206 lines) — read first, then:
  1. Import `AlignmentControls` from `@/components/features/editor`
  2. Import alignment state from editor store: `alignment`, `setAlignment` (read `stores/editor-store.ts` to confirm exact selector names)
  3. Read `components/features/editor/AlignmentControls.tsx` to understand the exact props interface (`AlignmentControlsProps`)
  4. Add state for collapse toggle: `const [controlsExpanded, setControlsExpanded] = useState(false)`
  5. Derive visibility: both photos must exist AND both must have landmarks
  6. Render below the canvas area, above any export section:

```tsx
{
  bothPhotosHaveLandmarks && (
    <div className="border-t border-[var(--border-primary)]">
      <button
        onClick={() => setControlsExpanded(!controlsExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <span>Alignment Controls</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${controlsExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {controlsExpanded && (
        <div className="px-4 pb-4">
          <AlignmentControls
            alignment={alignment}
            onUpdate={setAlignment}
            isActive={true}
          />
        </div>
      )}
    </div>
  );
}
```

Adapt this to match the actual props interface — read AlignmentControls.tsx first. If `ChevronDown` isn't available, use a simple `▶`/`▼` text toggle or import from lucide-react if already in the project.

### Step 3.3: Verify build

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run build
```

### Commit

```bash
git add components/features/editor/index.ts \
  app/\(app\)/editor/_components/EditorContent.tsx

git commit -m "$(cat <<'EOF'
feat(editor): wire AlignmentControls into EditorContent layout (ARCH-008)

- Add AlignmentControls to editor barrel export
- Render as collapsible section below canvas when both photos have landmarks
- Controlled expand/collapse for cross-browser consistency
- Mobile: controls stack vertically; desktop: horizontal layout

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Upload Route Documentation (ARCH-007)

**Goal:** Document the decision to keep session-scoped `createClient()` in upload routes.
**Model:** haiku — two comment additions

**Files modified:**

- `app/api/backgrounds/upload/route.ts` (296 lines) — read first, find the `createClient()` call, add comment above it:
  ```ts
  // Uses session-scoped client (not service client) so RLS policies
  // enforce user-owned storage paths. See ARCH-007 review.
  ```
- `app/api/logos/upload/route.ts` (308 lines) — same comment above `createClient()` call

### Verification gate

```bash
# Verification gate — STOP if this fails
npm run type-check
```

### Commit

```bash
git add app/api/backgrounds/upload/route.ts app/api/logos/upload/route.ts

git commit -m "$(cat <<'EOF'
docs: document session-scoped client choice in upload routes (ARCH-007)

Adds inline comments explaining why upload routes use createClient() (session-scoped)
instead of createServiceClient() — RLS policies enforce user-owned storage paths.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Final Verification

```bash
# Final verification gate — all checks must pass
npm run type-check && npm run build
npm run test 2>/dev/null || echo "Tests: check manually if test runner not configured"
```

---

## Cost Estimate

| Phase                          | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ------------------------------ | ------ | ----------------- | ------------------ | ---------- |
| Phase 0: Decision Gate         | haiku  | ~8k               | ~500               | $0.01      |
| Phase 1: Mechanical Cleanup    | haiku  | ~12k              | ~2k                | $0.02      |
| Phase 2: Billing Consistency   | sonnet | ~15k              | ~4k                | $0.11      |
| Phase 3: AlignmentControls     | sonnet | ~10k              | ~3k                | $0.08      |
| Phase 4: Upload Docs           | haiku  | ~5k               | ~500               | $0.01      |
| Brief + system prompt overhead | sonnet | ~8k               | ~0                 | $0.02      |
| **Total**                      |        | **~58k**          | **~10k**           | **~$0.25** |

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
   | opus      | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_arch-cleanup/yolo-brief.md`:

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

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/arch-cleanup` — NEVER commit directly to develop

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

All four phases were implemented cleanly. Phase 0 confirmed the DECISION: remove columns — no RPC, policy, or runtime code referenced `profiles.subscription_tier` or `profiles.subscription_status`. Notable surprises: (1) the webhook test file `tests/api/stripe/webhook.test.ts` already existed with 13 comprehensive tests, so Step 2.6 required no new file; (2) `lucide-react` is not in the project, so the collapsible toggle uses a plain `▼` text character; (3) `AlignmentControls.tsx` already had `'use client'` and already exported its props interface — no changes needed there; (4) the `SubscriptionTier` and `SubscriptionStatus` helper types were inlined as literal union types rather than deleted, preserving any downstream consumers; (5) `usage.test.ts` has 7 pre-existing failures unrelated to this session (confirmed by stash test).

### Commits

- `623a718` fix: mechanical cleanup — use client directives, prop exports, JSX→Tailwind, docs
- `9f44a23` fix(billing): remove stale profile subscription columns, add webhook tests (ARCH-001)
- `c2fe702` feat(editor): wire AlignmentControls into EditorContent layout (ARCH-008)
- `302fdaf` docs: document session-scoped client choice in upload routes (ARCH-007)
