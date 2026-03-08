# Security Review Findings

**Reviewer:** cs-security-engineer
**Scope:** Full security audit of API routes (`app/api/**/*.ts`), security headers (`next.config.ts`), Supabase client configuration (`lib/supabase/*.ts`), Stripe integration (`app/api/stripe/**/*.ts`, `lib/stripe/server.ts`), account deletion (`app/api/account/delete/route.ts`), rate limiting (`lib/middleware/rate-limit.ts`), input validation (`lib/validation/api-schemas.ts`), environment variable handling (`.env*`, `.gitignore`), client-side photo privacy (components, hooks), and dependency vulnerabilities (`npm audit`).
**Date:** 2026-03-08

## Summary

The Svolta codebase demonstrates a strong security posture overall. Stripe webhook signature verification, input validation with Zod schemas, Supabase RLS enforcement, rate limiting, and audit logging are all implemented correctly across most routes. However, three findings were identified: two API routes lack rate limiting and input validation (one of which is unauthenticated), and the project is missing a Next.js middleware file for Supabase auth session refresh. No hardcoded secrets, no committed `.env` files, and zero npm audit vulnerabilities were found.

## Findings

### [MEDIUM] SEC-001: Unauthenticated exports/log endpoint lacks rate limiting

- **File:** `app/api/exports/log/route.ts` (lines 24-95)
- **Issue:** The `POST /api/exports/log` endpoint accepts requests from anonymous users (no auth required) and has no rate limiting applied. Unlike every other mutating API route in the codebase, this route does not use `withRateLimit()`. It also uses manual inline validation instead of Zod schema validation, inconsistent with the project standard.
- **Impact:** An attacker could flood the exports table with arbitrary analytics rows by sending rapid unauthenticated POST requests. This could inflate analytics data, increase Supabase database costs, and potentially cause disk exhaustion on the database. The `anon_id` field accepts arbitrary strings from the client without length constraints.
- **Fix:** Wrap the handler in `withRateLimit()` with an appropriate config (e.g., 30 requests/minute). Since this endpoint allows anonymous users and `withRateLimit` requires auth, consider adding IP-based rate limiting for anonymous callers, or require authentication. Add a Zod schema for the request body with string length constraints on `anon_id`.
- **Effort:** small

### [MEDIUM] SEC-002: GET endpoints for usage and subscription lack rate limiting

- **File:** `app/api/usage/route.ts` (lines 11-73), `app/api/account/subscription/route.ts` (lines 4-38), `app/api/account/usage/route.ts` (lines 6-42)
- **Issue:** Three authenticated GET endpoints (`/api/usage`, `/api/account/subscription`, `/api/account/usage`) do not use the `withRateLimit()` wrapper. While they do require authentication, they have no request throttling.
- **Impact:** An authenticated user could abuse these endpoints with rapid polling, causing unnecessary database load. Risk is lower than SEC-001 since authentication is required, but it violates the project's own security standard that "all API endpoints are rate limited."
- **Fix:** Wrap each handler in `withRateLimit()` using the `default` config (60 requests/minute). These are read-only endpoints so the default limit is appropriate.
- **Effort:** trivial

### [MEDIUM] SEC-003: Missing Next.js middleware for Supabase auth session refresh

- **File:** (missing) `middleware.ts` at project root
- **Issue:** The project has no `middleware.ts` file. The Supabase SSR documentation recommends a Next.js middleware that calls `supabase.auth.getUser()` on each request to refresh expired auth tokens via cookie exchange. Without this, users with expired JWT tokens may experience silent auth failures or stale sessions until they perform a full page reload.
- **Impact:** Users could encounter intermittent 401 errors on API routes when their JWT expires (typically after 1 hour) if they have been on the app without a full navigation. The server-side `createClient()` reads cookies but never proactively refreshes them between requests. This is a UX degradation more than a direct security vulnerability, but stale sessions can lead to confusing authorization behavior.
- **Fix:** Add a `middleware.ts` at the project root following the Supabase SSR guide that creates a server client and calls `getUser()` to trigger token refresh. Apply it to relevant paths using a matcher config.
- **Effort:** small

### [LOW] SEC-004: Debug alignment-log endpoint relies solely on NODE_ENV guard

- **File:** `app/api/debug/alignment-log/route.ts` (lines 14-16, 89-91, 126-128)
- **Issue:** The debug endpoint is protected only by a `process.env.NODE_ENV !== 'development'` check. While this is effective in standard Next.js deployments (Vercel sets NODE_ENV to `production`), it provides no authentication, rate limiting, or input validation via Zod schemas. The POST handler accepts arbitrary JSON and writes it to the local filesystem.
- **Impact:** In development environments, any network client can write arbitrary data to the filesystem. In production this is blocked by the NODE_ENV check, so the practical risk is low. However, if NODE_ENV were ever misconfigured, the endpoint would allow unauthenticated filesystem writes.
- **Fix:** No immediate action required for production. For defense-in-depth, consider adding authentication to the debug endpoint even in development, or moving it to a separate debug-only project configuration.
- **Effort:** trivial

### [LOW] SEC-005: CSP allows unsafe-eval globally

- **File:** `next.config.ts` (line 52)
- **Issue:** The Content-Security-Policy `script-src` directive includes `'unsafe-eval'` which is documented as required for Fabric.js canvas operations. This weakens XSS protections by allowing `eval()` and similar dynamic code execution.
- **Impact:** If an XSS vector were found elsewhere in the application, `unsafe-eval` would make exploitation easier by allowing dynamic script construction. This is a known trade-off documented in the security standards, but worth noting for the record.
- **Fix:** No immediate fix available -- Fabric.js requires `unsafe-eval`. Monitor Fabric.js releases for a version that supports CSP-strict mode. Consider scoping `unsafe-eval` to only the pages that use the canvas editor if Next.js routing-level CSP becomes available.
- **Effort:** large (depends on upstream library)

## Positive Findings (Not Issues)

The following areas were reviewed and found to be correctly implemented:

- **Stripe webhook verification:** `constructWebhookEvent()` in `lib/stripe/server.ts` properly calls `stripe.webhooks.constructEvent()` with the raw body and signature before any processing occurs. The webhook route also implements idempotency via the `webhook_events` table and rejects test events in production.
- **Photo privacy:** No client-side code uploads photo/image data to external endpoints. The only uploads are logos and backgrounds to first-party Supabase storage via `/api/logos/upload` and `/api/backgrounds/upload`. Core photo processing (alignment, export) is entirely client-side using canvas/blob URLs.
- **Supabase RLS:** API routes use the session-scoped `createClient()` (anon key) for user-facing queries, which enforces RLS policies. The `createServiceClient()` (service role) is used only where explicitly needed: webhook processing, analytics logging, and admin account deletion. The service client is never exposed to the browser.
- **Security headers:** All required headers are present in `next.config.ts` -- HSTS (2 years with preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy, and a comprehensive CSP. The CSP correctly includes `storage.googleapis.com` and `cdn.jsdelivr.net` for MediaPipe.
- **No committed secrets:** `.gitignore` covers `.env*` (except `.env.example`). The `.env.example` contains only placeholder values. No hardcoded API keys, tokens, or credentials were found in source files.
- **Input validation:** All mutating API routes (except SEC-001) use Zod schema validation via `validateRequest()`.
- **Rate limiting:** All mutating API routes (except SEC-001) use `withRateLimit()` with appropriate per-endpoint configurations.
- **Account deletion:** Properly authenticated, rate-limited, audit-logged before deletion, uses service role only for admin operations.
- **npm audit:** 0 vulnerabilities found.

## Statistics

- Critical: 0
- High: 0
- Medium: 3
- Low: 2
- Total: 5
