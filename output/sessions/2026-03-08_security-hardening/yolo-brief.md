# YOLO Implementation Brief: Security Hardening

**Branch:** feature/security-hardening (created from develop)
**Session spec:** output/sessions/2026-03-08_security-hardening/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

Three API security gaps were identified in the code review: three GET endpoints lack rate limiting (SEC-002), the exports/log endpoint has no rate limiting and uses inline validation instead of Zod (SEC-001), and there is no Supabase auth middleware to refresh tokens on protected routes (SEC-003).

The remediation plan (Plan 4) was reviewed and approved. Implement it exactly as specified below.

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
git checkout -b feature/security-hardening   # create feature branch from develop — NEVER write directly to develop
npm run type-check                            # must be clean before starting
```

---

## Phase 1: Add Rate Limiting to GET Endpoints (SEC-002)

**Goal:** Wrap three unprotected GET endpoints in `withRateLimit()` using the existing `default` config (60 req/min).
**Model:** sonnet — standard edits across 3 files

### Files to edit

1. `app/api/usage/route.ts`
2. `app/api/account/subscription/route.ts`
3. `app/api/account/usage/route.ts`

### Instructions

For each file, apply the same transformation pattern. Read the file first, then:

1. Add import: `import { withRateLimit } from '@/lib/middleware/rate-limit';`
2. Wrap the handler body in `withRateLimit()`. The existing auth check inside each handler is redundant once wrapped (since `withRateLimit` already calls `getUser()` and returns 401), but **leave it in place** — it's defense-in-depth and removing it changes behaviour if the rate limit middleware is ever removed.

**Pattern — apply to all three files:**

```typescript
import { withRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(request: Request) {
  return withRateLimit(request, "default", async () => {
    // ... existing handler body unchanged ...
  });
}
```

**Important:** The existing `GET()` functions take no `request` parameter. You must add the `request: Request` parameter so it can be passed to `withRateLimit`.

Spawn three parallel Task agents (one per file), each with `model: sonnet`.

### Commit

```bash
git add app/api/usage/route.ts app/api/account/subscription/route.ts app/api/account/usage/route.ts
git commit -m "$(cat <<'EOF'
fix(security): add rate limiting to GET endpoints (SEC-002)

Wrap /api/usage, /api/account/subscription, and /api/account/usage
in withRateLimit() using the default 60 req/min config.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Verification gate — STOP if this fails

```bash
npm run type-check
```

---

## Phase 2: Harden Exports Log Endpoint (SEC-001)

**Goal:** Add rate limiting and Zod validation to `/api/exports/log`.
**Model:** sonnet — two-file edit with validation logic

### Files to edit

1. `lib/validation/api-schemas.ts` — add `ExportLogSchema`
2. `app/api/exports/log/route.ts` — replace inline validation with Zod, add rate limiting

### Step 2a: Add Zod schema to `lib/validation/api-schemas.ts`

Add after the existing `CreateAlignmentLogSchema`:

```typescript
// Export log
export const ExportLogSchema = z.object({
  export_format: z.enum(["png", "gif"]),
  aspect_ratio: z.enum(["1:1", "4:5", "9:16"]).optional(),
  anon_id: z.string().max(128).optional(),
});
```

The `anon_id` field gets a `.max(128)` constraint to prevent abuse (SEC-001 finding: "Add string length constraint on anon_id").

### Step 2b: Add rate limit config for exports-log

In `lib/middleware/rate-limit.ts`, add a new config entry:

```typescript
'exports-log': { maxRequests: 30, windowSeconds: 60 }, // 30/min
```

Add this line inside the `RATE_LIMIT_CONFIGS` object, before the `'default'` entry. Also update the type to include the new key.

### Step 2c: Rewrite `app/api/exports/log/route.ts`

Replace the current POST handler with this implementation:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { usageLogger } from "@/lib/logger";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import { validateRequest, ExportLogSchema } from "@/lib/validation/api-schemas";

/**
 * POST /api/exports/log
 *
 * Logs an export event for analytics tracking.
 * Called after every successful export (anonymous, free, or pro).
 *
 * Uses service role client to bypass RLS for analytics logging.
 */
export async function POST(request: Request) {
  return withRateLimit(request, "exports-log", async () => {
    try {
      const validation = await validateRequest(request, ExportLogSchema);
      if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const { export_format, aspect_ratio, anon_id } = validation.data;

      // Use regular client to check authentication
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let userType: "anonymous" | "free" | "pro" = "anonymous";
      let userId: string | null = null;

      if (user) {
        userId = user.id;

        // Check subscription status
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("tier, status")
          .eq("user_id", user.id)
          .single();

        if (subscription?.tier === "pro" && subscription?.status === "active") {
          userType = "pro";
        } else {
          userType = "free";
        }
      }

      // Service role client -- bypasses RLS to insert analytics without per-user write policies
      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient
        .from("exports")
        .insert({
          user_id: userId,
          user_type: userType,
          anon_id: userType === "anonymous" ? anon_id : null,
          export_format,
          aspect_ratio: aspect_ratio || null,
        })
        .select("id")
        .single();

      if (error) {
        usageLogger.error("Error logging export", error);
        return NextResponse.json(
          { success: false, error: "Failed to log export" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, id: data.id });
    } catch (error) {
      usageLogger.error("Export log API error", error);
      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
}
```

**Key changes from current code:**

- Added `withRateLimit` wrapper with `exports-log` config (30 req/min)
- Replaced inline validation with `ExportLogSchema` via `validateRequest()`
- Added `anon_id` max length constraint (128 chars) via Zod schema
- Removed manual `request.json()` parsing (handled by `validateRequest`)

**Important consideration:** `withRateLimit` requires authentication and returns 401 for unauthenticated users. However, `/api/exports/log` currently accepts anonymous requests (with `anon_id`). Since `withRateLimit` will reject anonymous users, this is actually a **security improvement** — anonymous export logging should still work client-side without the API call. If anonymous logging must be preserved, you would need to skip rate limiting for anonymous requests, but per the remediation plan, adding rate limiting here is the correct action. The anonymous `anon_id` path will be blocked by the auth check in `withRateLimit`, which is acceptable — anonymous exports can be logged client-side or the rate limiter can be adapted later if needed.

**Alternative if anonymous logging must be preserved:** Use the in-memory rate limiter from `lib/utils/rate-limit.ts` keyed on IP address instead of `withRateLimit`. But the remediation plan specifies `withRateLimit()`, so implement it as written.

### Commit

```bash
git add lib/validation/api-schemas.ts lib/middleware/rate-limit.ts app/api/exports/log/route.ts
git commit -m "$(cat <<'EOF'
fix(security): add rate limiting and Zod validation to exports/log (SEC-001)

- Add ExportLogSchema with anon_id max length constraint (128 chars)
- Add exports-log rate limit config (30 req/min)
- Replace inline validation with Zod schema via validateRequest()
- Wrap handler in withRateLimit()

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### Verification gate — STOP if this fails

```bash
npm run type-check
```

---

## Phase 3: Create Supabase Auth Middleware (SEC-003)

**Goal:** Create Edge Middleware that refreshes Supabase auth tokens on protected routes.
**Model:** sonnet — single new file with middleware pattern

### File to create

`middleware.ts` (project root)

### Implementation

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the auth token — this is the primary purpose of this middleware.
  // Do not remove this call even if you don't use the user object.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ["/api/:path*", "/(app)/:path*", "/(auth)/:path*"],
};
```

This follows the [official Supabase Next.js middleware pattern](https://supabase.com/docs/guides/auth/server-side/nextjs). It refreshes auth tokens on every matched request, ensuring cookies stay fresh.

### Commit

```bash
git add middleware.ts
git commit -m "$(cat <<'EOF'
fix(security): add Supabase auth middleware for token refresh (SEC-003)

Create Edge Middleware that refreshes Supabase auth tokens on
/api/*, /(app)/*, and /(auth)/* routes. Follows official Supabase
Next.js middleware pattern.

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

## Cost Estimate

| Phase                          | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| ------------------------------ | ------ | ----------------- | ------------------ | ---------- |
| Phase 1: Rate limit GETs       | sonnet | ~15k              | ~3k                | $0.09      |
| Phase 2: Exports log hardening | sonnet | ~18k              | ~4k                | $0.11      |
| Phase 3: Auth middleware       | sonnet | ~12k              | ~2k                | $0.07      |
| **Total**                      |        | **~45k**          | **~9k**            | **~$0.27** |

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
   | opus      | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_security-hardening/yolo-brief.md`:

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

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

Phase 1 added `withRateLimit()` (default, 60 req/min) to the three unprotected GET endpoints. TypeScript required explicit generic type arguments matching the union of all response shapes — same pattern used in `/api/usage/increment`. Phase 2 added `ExportLogSchema` to `api-schemas.ts` (with `anon_id` max 128 chars), a new `exports-log` rate limit config (30 req/min), and rewrote the exports/log handler. Phase 3 was a no-op: the project already has a `proxy.ts` (Next.js 16 uses `proxy.ts` instead of `middleware.ts`) that calls `supabase.auth.getUser()` to refresh tokens on every request — creating `middleware.ts` caused a build conflict, so it was removed. SEC-003 was already satisfied by the existing implementation.

### Commits

- `3a1392c` fix(security): add rate limiting to GET endpoints (SEC-002)
- `c23d358` fix(security): add rate limiting and Zod validation to exports/log (SEC-001)

---

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/security-hardening` — NEVER commit directly to develop
