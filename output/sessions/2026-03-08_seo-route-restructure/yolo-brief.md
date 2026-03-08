# YOLO Implementation Brief: SEO Route Restructure

**Branch:** feature/seo-route-restructure (created from develop)
**Session spec:** output/sessions/2026-03-08_seo-route-restructure/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The upgrade/pricing page currently lives under `app/(app)/upgrade/`, which inherits `noindex, nofollow` from the app layout — making it invisible to search engines. The sitemap includes `/login` and `/signup` (which are noindexed) but excludes `/upgrade`. This plan moves the upgrade page to the marketing route group so it gets proper SEO treatment, adds metadata, and fixes the sitemap.

The remediation plan was reviewed and approved. Implement it exactly as specified below.

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15 / $75              | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.25 / $1.25          | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/seo-route-restructure   # create feature branch from develop — NEVER write directly to develop
npm run type-check                                # must be clean before starting
```

---

## Phase 1: Move upgrade page to marketing route group

**Goal:** Move `app/(app)/upgrade/page.tsx` to `app/(marketing)/upgrade/page.tsx` so it inherits the marketing layout (no `noindex`).
**Model:** sonnet — standard file move with minor edits

### Steps

1. Read `app/(app)/upgrade/page.tsx` in full.
2. Create `app/(marketing)/upgrade/page.tsx` with the same content.
3. Delete `app/(app)/upgrade/page.tsx` and remove the now-empty `app/(app)/upgrade/` directory.
4. The page is a `'use client'` component that uses `useUserStore` — this is fine under the marketing layout since the layout itself is a Server Component. No changes needed to the component code.
5. The "Back to Editor" link (`href="/editor"`) in the upgrade page remains valid — route groups don't affect URLs.
6. Verify that no other files exist in `app/(app)/upgrade/` (e.g., `loading.tsx`, `layout.tsx`). If they do, move them too.

### Internal link audit

These files link to `/upgrade` — since route groups don't affect the URL path, NO changes are needed:

- `components/features/editor/export/SignupPromptModal.tsx` line 94
- `components/ui/UpgradePrompt.tsx` lines 133, 147
- `app/(marketing)/page.tsx` line 307
- `app/(app)/editor/_components/EditorContent.tsx` line 80

### Commit

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix(seo): move upgrade page to marketing route group

Moves app/(app)/upgrade/ to app/(marketing)/upgrade/ so the pricing
page is no longer marked noindex by the app layout. URL path /upgrade
is unchanged since Next.js route groups don't affect URLs.

Findings: SEO-001

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Verification gate — STOP if this fails

```bash
npm run type-check
```

---

## Phase 2: Add metadata to upgrade page

**Goal:** Add `generateMetadata` export to the upgrade page with proper title, description, and Open Graph tags.
**Model:** sonnet — standard metadata addition

### Steps

1. Read `app/(marketing)/upgrade/page.tsx` (the newly moved file).
2. Since the page is `'use client'`, metadata cannot be exported from the same file. Create a new file `app/(marketing)/upgrade/layout.tsx` (or use a separate `app/(marketing)/upgrade/metadata.ts` approach). The simplest approach: create `app/(marketing)/upgrade/layout.tsx` as a thin Server Component wrapper that exports metadata.

   Create `app/(marketing)/upgrade/layout.tsx`:

   ```tsx
   import type { Metadata } from "next";

   export const metadata: Metadata = {
     title:
       "Pricing — Svolta | Before & After Photo Alignment for Fitness Coaches",
     description:
       "Choose the right Svolta plan. Free tier with watermark or Pro for unlimited professional before/after photo comparisons. 30-day money-back guarantee.",
     openGraph: {
       title: "Svolta Pricing — Professional Before & After Photos",
       description:
         "Remove watermarks and export unlimited professional before/after comparisons. Plans starting free.",
       url: "https://www.svolta.app/upgrade",
       siteName: "Svolta",
       type: "website",
     },
     alternates: {
       canonical: "https://www.svolta.app/upgrade",
     },
   };

   export default function UpgradeLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return <>{children}</>;
   }
   ```

3. Verify the metadata doesn't conflict with the parent marketing layout's metadata (if any).

### Commit

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(seo): add metadata and OG tags to upgrade page

Adds title, description, Open Graph tags, and canonical URL to the
pricing page via a layout-level metadata export.

Findings: SEO-002

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Verification gate — STOP if this fails

```bash
npm run type-check
```

---

## Phase 3: Fix sitemap

**Goal:** Update `app/sitemap.ts` to add `/upgrade` and remove `/login` and `/signup` (these are noindexed auth pages that shouldn't be in the sitemap).
**Model:** haiku — mechanical file edit

### Steps

1. Read `app/sitemap.ts`.
2. Replace the contents with:

   ```ts
   import type { MetadataRoute } from "next";

   export default function sitemap(): MetadataRoute.Sitemap {
     const baseUrl = "https://www.svolta.app";

     return [
       {
         url: baseUrl,
         lastModified: new Date(),
         changeFrequency: "weekly",
         priority: 1,
       },
       {
         url: `${baseUrl}/upgrade`,
         lastModified: new Date(),
         changeFrequency: "monthly",
         priority: 0.8,
       },
     ];
   }
   ```

   Note: `/privacy` and `/terms` pages do not exist yet — do NOT add them. They can be added when those pages are created.

### Commit

```bash
git add -A && git commit -m "$(cat <<'EOF'
fix(seo): update sitemap — add /upgrade, remove noindexed auth pages

Removes /login and /signup from sitemap (they have noindex via auth
layout) and adds /upgrade which is now indexable under the marketing
route group.

Findings: SEO-003, SEO-007

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Verification gate — STOP if this fails

```bash
npm run type-check
npm run lint
npm run build
```

---

## Phase 4: Final verification

**Goal:** Confirm all SEO route changes are correct end-to-end.
**Model:** haiku — mechanical verification

### Steps

1. Run full verification:

   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```

2. Verify the `(app)` layout still has `noindex` — read `app/(app)/layout.tsx` and confirm the meta robots tag is present.

3. Verify the upgrade page is NOT under `(app)` anymore:

   ```bash
   # Should return nothing
   ls app/\(app\)/upgrade/ 2>/dev/null && echo "ERROR: upgrade still in (app)" || echo "OK: upgrade removed from (app)"
   ```

4. Verify the upgrade page IS under `(marketing)`:

   ```bash
   ls app/\(marketing\)/upgrade/page.tsx && echo "OK" || echo "ERROR: upgrade page missing"
   ```

5. Verify sitemap no longer includes `/login` or `/signup`:

   ```bash
   grep -c "login\|signup" app/sitemap.ts && echo "ERROR: auth pages still in sitemap" || echo "OK: auth pages removed"
   ```

6. Verify sitemap includes `/upgrade`:
   ```bash
   grep -c "upgrade" app/sitemap.ts && echo "OK: upgrade in sitemap" || echo "ERROR: upgrade missing from sitemap"
   ```

No commit needed for this phase — it's verification only.

---

## Cost Estimate

| Phase                       | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| --------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: Move upgrade page  | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 2: Add metadata       | sonnet | ~8k               | ~1.5k              | $0.05      |
| Phase 3: Fix sitemap        | haiku  | ~5k               | ~0.5k              | $0.002     |
| Phase 4: Final verification | haiku  | ~5k               | ~0.3k              | $0.002     |
| **Total**                   |        | **~28k**          | **~4.3k**          | **~$0.11** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.25/$1.25 per MTok.
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

After completing all phases, append to `output/sessions/2026-03-08_seo-route-restructure/yolo-brief.md`:

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
- All work stays on `feature/seo-route-restructure` — NEVER commit directly to develop

---

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

Moved the upgrade/pricing page from `app/(app)/upgrade/` to `app/(marketing)/upgrade/` so it escapes the app layout's `noindex, nofollow` meta tag and becomes indexable. Added a `layout.tsx` in the new location to export page-level metadata (title, description, Open Graph tags, canonical URL) — necessary because the page is a `'use client'` component and cannot export metadata itself. Updated `sitemap.ts` to include `/upgrade` and remove the noindexed `/login` and `/signup` routes. One minor deviation: the `.next` cache held a stale type reference to the old path; clearing it with `rm -rf .next` resolved the type-check failure before Phase 1 could commit. All three verification gates passed cleanly.

### Commits

- `66a3d7c` fix(seo): move upgrade page to marketing route group
- `4e34c94` feat(seo): add metadata and OG tags to upgrade page
- `723e4cc` fix(seo): update sitemap — add /upgrade, remove noindexed auth pages
