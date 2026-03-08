# YOLO Implementation Brief: Console Log Cleanup

**Branch:** feature/console-log-cleanup (created from develop)
**Session spec:** output/sessions/2026-03-08_session5-console-log-cleanup/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The code review found ~25 production `console.log` and `console.error` calls across 6 files that bypass the project's structured logging system (`lib/logger.ts`). These leak internal data to the browser console, prevent garbage collection of large objects during exports, and violate the project's logging conventions. The fix is mechanical: import the appropriate logger and replace each call.

The structured logger system at `lib/logger.ts` exports: `canvasLogger`, `poseLogger`, `editorLogger`, `webhookLogger`, `stripeLogger`, `usageLogger`, `authLogger`. All support `.debug()`, `.info()`, `.warn()`, `.error()` methods. In production, only `warn` and `error` are emitted.

---

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15 / $75              | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3 / $15               | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $1 / $5                | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **haiku** (this is entirely mechanical find-replace work).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/console-log-cleanup   # create feature branch from develop — NEVER write directly to develop
npm run type-check                             # must be clean before starting
```

---

## Phase 1: Canvas Export Loggers (export.ts + export-gif.ts)

**Goal:** Replace 5 console.log calls in the canvas export files with `canvasLogger.debug`.
**Model:** haiku — mechanical find-replace

### Files

- `lib/canvas/export.ts`
- `lib/canvas/export-gif.ts`

### Instructions

**export.ts:**

1. Add import at top: `import { canvasLogger } from '@/lib/logger';`
2. Line 262: Replace `console.log('[Export] Dynamic dimensions:', { ... })` with `canvasLogger.debug('[Export] Dynamic dimensions:', { ... })`

**export-gif.ts:**

1. Add import at top: `import { canvasLogger } from '@/lib/logger';`
2. Line 195: Replace `console.log('[GIF Export] Starting export:', { ... })` with `canvasLogger.debug('[GIF Export] Starting export:', { ... })`
3. Line 224: Replace `console.log('[GIF Export] Generating frames:', { frameCount })` with `canvasLogger.debug('[GIF Export] Generating frames:', { frameCount })`
4. Line 282: Replace `console.log('[GIF Export] Encoding GIF with gif.js')` with `canvasLogger.debug('[GIF Export] Encoding GIF with gif.js')`
5. Line 323: Replace `console.log('[GIF Export] Export complete:', { ... })` with `canvasLogger.debug('[GIF Export] Export complete:', { ... })`

### Verification gate

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit --pretty 2>&1 | head -20
grep -n "console\.\(log\|error\)" lib/canvas/export.ts lib/canvas/export-gif.ts && echo "FAIL: console calls remain" && exit 1 || echo "PASS"
```

### Commit

```bash
git add lib/canvas/export.ts lib/canvas/export-gif.ts
git commit -m "$(cat <<'EOF'
fix(canvas): replace console.log with canvasLogger in export paths

Addresses CQ-001, CQ-002, PERF-007, ARCH-004 from code review.
Production console.log calls in export.ts and export-gif.ts were
bypassing the structured logger and preventing GC of large objects.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: MediaPipe Pose Detector Logger

**Goal:** Replace 3 console.log calls in pose-detector.ts with `poseLogger.info`.
**Model:** haiku — mechanical find-replace

### Files

- `lib/mediapipe/pose-detector.ts`

### Instructions

1. Add import at top: `import { poseLogger } from '@/lib/logger';`
2. Line 64: Replace `console.log('✓ Using self-hosted MediaPipe assets')` with `poseLogger.info('Using self-hosted MediaPipe assets')`
3. Line 133: Replace `console.log('✓ Pose detector initialized with GPU acceleration')` with `poseLogger.info('Pose detector initialized with GPU acceleration')`
4. Line 138: Replace `console.log('✓ Pose detector initialized with CPU')` with `poseLogger.info('Pose detector initialized with CPU')`

Note: These are initialization messages (not debug spam), so use `.info()` not `.debug()`. Remove the emoji checkmarks — the logger adds its own namespace prefix.

### Verification gate

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
grep -n "console\.\(log\|error\)" lib/mediapipe/pose-detector.ts && echo "FAIL" && exit 1 || echo "PASS"
```

### Commit

```bash
git add lib/mediapipe/pose-detector.ts
git commit -m "$(cat <<'EOF'
fix(mediapipe): replace console.log with poseLogger in pose-detector

Addresses CQ-003 from code review. Initialization messages now use
the structured poseLogger instead of raw console.log.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Alignment Debug Logger

**Goal:** Gate console.log calls in alignment-logger.ts behind the existing debug flag, or replace with structured logger.
**Model:** haiku — mechanical replacement

### Files

- `lib/debug/alignment-logger.ts`

### Instructions

Read the file first to understand the full context. This file already has a debug-gating mechanism (`isAlignmentDebugEnabled()`).

1. Line 39 (`console.log('🔍 Alignment debug logging ENABLED')`): This is inside `setAlignmentDebug(true)` — this is fine as a debug-only message but should use the structured logger. Replace with: `canvasLogger.debug('Alignment debug logging enabled')`
2. Line 42 (`console.log('🔍 Alignment debug logging DISABLED')`): Replace with: `canvasLogger.debug('Alignment debug logging disabled')`
3. Line 181 (`console.log('🔍 [DEBUG] Alignment Log Entry:', entry)`): This is inside `logAlignment()` which should already be gated. Replace with: `canvasLogger.debug('[Alignment] Log entry:', entry)`
4. Add import at top: `import { canvasLogger } from '@/lib/logger';`

### Verification gate

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
grep -n "console\.\(log\|error\)" lib/debug/alignment-logger.ts && echo "FAIL" && exit 1 || echo "PASS"
```

### Commit

```bash
git add lib/debug/alignment-logger.ts
git commit -m "$(cat <<'EOF'
fix(debug): replace console.log with canvasLogger in alignment-logger

Addresses CQ-004 from code review. Debug messages now use the
structured canvasLogger instead of raw console.log.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Stripe Webhook Logger

**Goal:** Replace 18 console.log/error calls in webhook route with `webhookLogger`.
**Model:** sonnet — more judgment needed (log vs error vs warn levels)

### Files

- `app/api/stripe/webhook/route.ts`

### Instructions

1. Add import at top: `import { webhookLogger } from '@/lib/logger';`
2. Replace each call using these level mappings:

| Line | Current                                                                     | Replacement                                                                     |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 29   | `console.error('Webhook signature verification failed:', err)`              | `webhookLogger.error('Webhook signature verification failed:', err)`            |
| 55   | `console.log('Duplicate event skipped:', event.id)`                         | `webhookLogger.info('Duplicate event skipped:', event.id)`                      |
| 70   | `console.log('Event already being processed by another worker:', event.id)` | `webhookLogger.info('Event already being processed:', event.id)`                |
| 74   | `console.error('Failed to record webhook event:', insertError)`             | `webhookLogger.error('Failed to record webhook event:', insertError)`           |
| 114  | `console.log(`Unhandled event type: ${event.type}`)`                        | `webhookLogger.warn('Unhandled event type:', event.type)`                       |
| 120  | `console.error('Webhook error:', error)`                                    | `webhookLogger.error('Webhook error:', error)`                                  |
| 138  | `console.error('No user_id in checkout session metadata')`                  | `webhookLogger.error('No user_id in checkout session metadata')`                |
| 148  | `console.log('Checkout completed for user:', userId, 'tier:', tier)`        | `webhookLogger.info('Checkout completed', { userId, tier })`                    |
| 165  | `console.error('Error upserting subscription:', error)`                     | `webhookLogger.error('Error upserting subscription:', error)`                   |
| 185  | `console.error('Could not find user for subscription:', subscription.id)`   | `webhookLogger.error('Could not find user for subscription:', subscription.id)` |
| 236  | `console.error('Error updating subscription:', error)`                      | `webhookLogger.error('Error updating subscription:', error)`                    |
| 255  | `console.error('Could not find user for deleted subscription')`             | `webhookLogger.error('Could not find user for deleted subscription')`           |
| 259  | `console.log('Subscription deleted for user:', profile.id)`                 | `webhookLogger.info('Subscription deleted', { userId: profile.id })`            |
| 272  | `console.error('Error downgrading subscription:', error)`                   | `webhookLogger.error('Error downgrading subscription:', error)`                 |
| 286  | `console.log('Payment failed for subscription:', subscriptionId)`           | `webhookLogger.warn('Payment failed', { subscriptionId })`                      |
| 296  | `console.error('Could not find user for failed payment')`                   | `webhookLogger.error('Could not find user for failed payment')`                 |
| 310  | `console.error('Error updating subscription status:', error)`               | `webhookLogger.error('Error updating subscription status:', error)`             |
| 343  | `console.error('Error updating subscription status:', error)`               | `webhookLogger.error('Error updating subscription status:', error)`             |

Level rules: `error` for failures/exceptions, `warn` for unhandled event types and payment failures, `info` for successful operations and expected skips.

### Verification gate

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
grep -n "console\.\(log\|error\)" app/api/stripe/webhook/route.ts && echo "FAIL" && exit 1 || echo "PASS"
```

### Commit

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "$(cat <<'EOF'
fix(stripe): replace console.log/error with webhookLogger

Addresses CQ-005 from code review. All 18 console calls in the
Stripe webhook handler now use the structured webhookLogger with
appropriate log levels (error/warn/info).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: AlignedPreview Editor Logger

**Goal:** Replace console.error in AlignedPreview with `editorLogger.error`.
**Model:** haiku — single replacement

### Files

- `components/features/editor/AlignedPreview.tsx`

### Instructions

1. Add import: `import { editorLogger } from '@/lib/logger';`
2. Line 97: Replace `console.error('Failed to load aligned preview images:', error)` with `editorLogger.error('Failed to load aligned preview images:', error)`

### Verification gate

```bash
npx tsc --noEmit --pretty 2>&1 | head -20
grep -n "console\.\(log\|error\)" components/features/editor/AlignedPreview.tsx && echo "FAIL" && exit 1 || echo "PASS"
```

### Commit

```bash
git add components/features/editor/AlignedPreview.tsx
git commit -m "$(cat <<'EOF'
fix(editor): replace console.error with editorLogger in AlignedPreview

Addresses CQ-016 from code review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Final Verification

**Goal:** Confirm zero console.log/error calls remain in source code (excluding test files and node_modules).
**Model:** haiku — grep check only

```bash
# Verification gate — STOP if this fails
npm run type-check
npm run lint
grep -rn "console\.\(log\|error\|warn\)" \
  lib/ app/api/ components/ hooks/ stores/ \
  --include="*.ts" --include="*.tsx" \
  | grep -v "node_modules" \
  | grep -v "__tests__" \
  | grep -v "\.test\." \
  | grep -v "lib/logger.ts" \
  && echo "FAIL: console calls remain in source" && exit 1 \
  || echo "PASS: all console calls replaced with structured loggers"
```

If the grep finds any remaining `console.*` calls not covered by the plan, fix them using the appropriate logger from `lib/logger.ts` before proceeding.

No commit for this phase — it is verification only.

---

## Cost Estimate

| Phase                     | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Pre-flight                | sonnet | ~4k               | ~500               | $0.02      |
| Phase 1: Canvas exports   | haiku  | ~8k               | ~1.5k              | $0.02      |
| Phase 2: Pose detector    | haiku  | ~6k               | ~1k                | $0.01      |
| Phase 3: Alignment logger | haiku  | ~6k               | ~1k                | $0.01      |
| Phase 4: Webhook          | sonnet | ~12k              | ~3k                | $0.08      |
| Phase 5: AlignedPreview   | haiku  | ~5k               | ~500               | $0.01      |
| Phase 6: Verification     | haiku  | ~4k               | ~500               | $0.01      |
| **Total**                 |        | **~45k**          | **~8k**            | **~$0.16** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $1/$5 per MTok.

---

## Final Report

After all phases complete, output:

1. Phases completed — list each with commit SHA
2. Build status — confirm `npm run lint && npm run type-check` passes
3. Any exceptions or intentional deviations from the plan
4. Token usage and cost estimate:

   | Model     | Est. input tokens     | Est. output tokens | Est. cost |
   | --------- | --------------------- | ------------------ | --------- |
   | sonnet    | [total across phases] |                    | $X.XX     |
   | haiku     | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_session5-console-log-cleanup/yolo-brief.md`:

```markdown
## Completed

**Date:** 2026-03-08
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
- All work stays on `feature/console-log-cleanup` — NEVER commit directly to develop

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

All 5 planned phases were implemented as specified. The Phase 6 final verification revealed an additional ~50 console calls across 16 more files not covered by the original plan — these were swept in a 6th commit. Two intentional exceptions were left in place: `lib/audit/logger.ts` and `lib/logging/security-logger.ts` use `console.error` as their own last-resort output mechanism (when their DB writes fail), which is appropriate for logger infrastructure. Four `console.log` calls in `*.example.tsx` demo files were also left as-is since they are non-production placeholder code.

### Commits

- `49fc43f` fix(canvas): replace console.log with canvasLogger in export paths
- `4e8a719` fix(mediapipe): replace console.log with poseLogger in pose-detector
- `677a699` fix(debug): replace console.log with canvasLogger in alignment-logger
- `b336164` fix(stripe): replace console.log/error with webhookLogger
- `d8843b9` fix(editor): replace console.error with editorLogger in AlignedPreview
- `5cac7c8` fix(logging): replace remaining console calls with structured loggers
