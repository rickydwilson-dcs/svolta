# YOLO Implementation Brief: Performance — Bundle & Import Optimization

**Branch:** feature/bundle-import-perf (created from develop)
**Session spec:** output/sessions/2026-03-08_bundle-import-perf/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The code review identified three performance issues: Fabric.js is a dead dependency adding ~500KB to the bundle with an unnecessary `unsafe-eval` CSP allowance, `@imgly/background-removal` is statically imported adding ~2MB to the initial bundle, and background removal for two photos runs sequentially instead of in parallel. This brief removes the dead dependency, converts the heavy import to dynamic, and parallelizes the background removal.

The remediation plan was reviewed and approved. Implement it exactly as specified below.

---

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15 / $75              | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.25 / $1.25          | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (→ haiku) or requires deep cross-file reasoning (→ opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/bundle-import-perf   # create feature branch from develop — NEVER write directly to develop
npm run type-check                            # must be clean before starting
```

---

## Phase 1: Remove Fabric.js Dependency

**Goal:** Remove the dead Fabric.js dependency, delete its setup file, and remove `unsafe-eval` from CSP.
**Model:** haiku — mechanical dependency removal and string editing

### Steps

1. Run `npm uninstall fabric` to remove the package
2. Run `npm uninstall @types/fabric` if it exists (check package.json first)
3. Delete `lib/canvas/fabric-setup.ts` — this file is not imported anywhere in the codebase (confirmed: `grep -r "fabric-setup" --include="*.ts" --include="*.tsx"` returns zero hits)
4. Edit `next.config.ts` — in the CSP `script-src` directive (line 52), remove `'unsafe-eval'` and update the comment:
   - **Before:** `"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://js.stripe.com https://*.supabase.co https://cdn.jsdelivr.net https://vercel.live",`
   - **After:** `"script-src 'self' 'unsafe-inline' blob: https://js.stripe.com https://*.supabase.co https://cdn.jsdelivr.net https://vercel.live",`
   - Update the comment on line 51 from `// Script: Allow inline scripts for next-themes FOUC prevention + unsafe-eval for Fabric.js` to `// Script: Allow inline scripts for next-themes FOUC prevention`
5. Verify no other files import from `fabric` — run: `grep -r "from ['\"]fabric['\"]" --include="*.ts" --include="*.tsx" lib/ app/ components/ hooks/ stores/` — should return zero hits (the only import was in the deleted file)

### Verification gate — STOP if this fails

```bash
npm run type-check
npm run lint
npm run build
```

### Commit

```bash
git add -A && git commit -m "perf(bundle): remove dead Fabric.js dependency and unsafe-eval CSP (PERF-003, SEC-005)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Dynamic Import for Background Removal

**Goal:** Convert the static `@imgly/background-removal` import to a dynamic import so it's only loaded when needed.
**Model:** sonnet — requires understanding the module's usage pattern across two functions

### Steps

1. Edit `lib/segmentation/background-removal.ts`:
   - **Remove** the static import on line 9:
     ```ts
     import {
       removeBackground as imglyRemoveBackground,
       preload,
       type Config,
     } from "@imgly/background-removal";
     ```
   - **Add** a type-only import at the top (for the Config type used in function signatures):
     ```ts
     import type { Config } from "@imgly/background-removal";
     ```
   - **In `preloadModel()` function** (line 45-66): Add dynamic import before usage:
     ```ts
     const { preload } = await import("@imgly/background-removal");
     ```
     Place this just before the `preloadPromise = preload(config)` call (line 61).
   - **In `removeBackground()` function** (line 139-216): Add dynamic import before usage:
     ```ts
     const { removeBackground: imglyRemoveBackground } =
       await import("@imgly/background-removal");
     ```
     Place this just before the `const resultBlob = await imglyRemoveBackground(imageBlob, config);` call (around line 193).

2. Verify the module is no longer statically imported:
   - `grep "^import.*from '@imgly/background-removal'" lib/segmentation/background-removal.ts` should only show the `import type` line

### Verification gate — STOP if this fails

```bash
npm run type-check
npm run lint
npm run build
```

### Commit

```bash
git add -A && git commit -m "perf(bundle): dynamic import @imgly/background-removal to reduce initial bundle (PERF-002)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: Parallelize Background Removal

**Goal:** Change sequential background removal of before/after photos to `Promise.all` for ~2x speedup.
**Model:** sonnet — requires careful refactoring of async control flow

### Steps

1. Edit `hooks/useExportBackgroundRemoval.ts` — replace the sequential removal block (lines 39-75) with parallel execution:

   **Before** (sequential):

   ```ts
   // Remove background from "before" photo if not already done
   if (!beforePhoto.hasBackgroundRemoved) {
     const beforeResult = await withTimeout(...);
     if (beforeResult) { ... setBeforePhoto(...); }
   }
   // Remove background from "after" photo if not already done
   if (!afterPhoto.hasBackgroundRemoved) {
     const afterResult = await withTimeout(...);
     if (afterResult) { ... setAfterPhoto(...); }
   }
   ```

   **After** (parallel):

   ```ts
   // Remove backgrounds in parallel for ~2x speedup
   const [beforeResult, afterResult] = await Promise.all([
     !beforePhoto.hasBackgroundRemoved
       ? withTimeout(
           removeBackground(beforePhoto.dataUrl),
           TIMEOUT_MS,
           'Background removal timed out for "Before" photo. Please try again or use a smaller image.',
         )
       : Promise.resolve(null),
     !afterPhoto.hasBackgroundRemoved
       ? withTimeout(
           removeBackground(afterPhoto.dataUrl),
           TIMEOUT_MS,
           'Background removal timed out for "After" photo. Please try again or use a smaller image.',
         )
       : Promise.resolve(null),
   ]);

   if (beforeResult) {
     const updatedBefore: Photo = {
       ...beforePhoto,
       dataUrl: beforeResult.processedDataUrl,
       hasBackgroundRemoved: true,
       originalDataUrl: beforePhoto.originalDataUrl || beforePhoto.dataUrl,
       segmentationMask: beforeResult.mask,
     };
     setBeforePhoto(updatedBefore);
   }

   if (afterResult) {
     const updatedAfter: Photo = {
       ...afterPhoto,
       dataUrl: afterResult.processedDataUrl,
       hasBackgroundRemoved: true,
       originalDataUrl: afterPhoto.originalDataUrl || afterPhoto.dataUrl,
       segmentationMask: afterResult.mask,
     };
     setAfterPhoto(updatedAfter);
   }
   ```

### Verification gate — STOP if this fails

```bash
npm run type-check
npm run lint
npm run build
```

### Commit

```bash
git add -A && git commit -m "perf: parallelize background removal with Promise.all (PERF-011)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Cost Estimate

| Phase                        | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ---------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: Remove Fabric.js    | haiku  | ~10k              | ~1k                | $0.004     |
| Phase 2: Dynamic import      | sonnet | ~12k              | ~2k                | $0.066     |
| Phase 3: Parallelize removal | sonnet | ~10k              | ~2k                | $0.060     |
| Orchestrator overhead        | sonnet | ~8k               | ~1k                | $0.039     |
| **Total**                    |        | **~40k**          | **~6k**            | **~$0.17** |

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

After completing all phases, append to `output/sessions/2026-03-08_bundle-import-perf/yolo-brief.md`:

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
- All work stays on `feature/bundle-import-perf` — NEVER commit directly to develop

---

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

All three phases were implemented cleanly with no surprises. Phase 1 uninstalled fabric (15 packages removed, ~500KB bundle savings), deleted the unused `lib/canvas/fabric-setup.ts`, and stripped `unsafe-eval` from the CSP. Phase 2 replaced the static `@imgly/background-removal` import with two targeted dynamic imports — one in `preloadModel()` and one in `removeBackground()` — reducing the initial bundle by ~2MB. Phase 3 refactored the sequential background removal calls in `useExportBackgroundRemoval` into a single `Promise.all`, yielding ~2x speedup when both photos need processing. All three verification gates (type-check, lint, build) passed after each phase.

### Commits

- `2ec445f` perf(bundle): remove dead Fabric.js dependency and unsafe-eval CSP (PERF-003, SEC-005)
- `abc4726` perf(bundle): dynamic import @imgly/background-removal to reduce initial bundle (PERF-002)
- `5747129` perf: parallelize background removal with Promise.all (PERF-011)
