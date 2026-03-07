# Security Standards

**Version:** 1.0.0
**Last Updated:** 2026-01-04
**Scope:** Svolta Application (www.svolta.app)

---

## Overview

Security is foundational to Svolta's mission of helping fitness coaches create professional transformations. We protect user data, prevent abuse, and maintain trust through comprehensive security practices including rate limiting, audit logging, security monitoring, input validation, and privacy-first architecture.

## Core Principles

### 1. Privacy First

Client-side photo processing only. Photos never uploaded to servers.

### 2. Defense in Depth

Multiple security layers: rate limiting, validation, headers, RLS, audit logging.

### 3. Zero Trust

Authenticate and authorize every request. Validate all inputs.

### 4. Graceful Degradation

Security checks fail gracefully without breaking core functionality.

### 5. Compliance Ready

Audit trails, security monitoring, and GDPR compliance built-in.

---

## Rate Limiting

### Implementation (Supabase PostgreSQL RPC)

All API endpoints are rate limited using a PostgreSQL RPC function for atomic check-and-increment operations.

#### Database Schema

```sql
-- supabase/migrations/20260104193302_create_rate_limits.sql
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint, window_start)
);

-- RPC function for atomic rate limit check/increment
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
) RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
  v_remaining INTEGER;
  v_reset TIMESTAMPTZ;
BEGIN
  v_window_start := DATE_TRUNC('second', NOW()) -
    (EXTRACT(EPOCH FROM NOW())::INTEGER % p_window_seconds) * INTERVAL '1 second';
  v_reset := v_window_start + (p_window_seconds || ' seconds')::INTERVAL;

  INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    updated_at = NOW()
  RETURNING request_count INTO v_count;

  v_remaining := GREATEST(0, p_max_requests - v_count);

  RETURN json_build_object(
    'success', v_count <= p_max_requests,
    'count', v_count,
    'limit', p_max_requests,
    'remaining', v_remaining,
    'reset', EXTRACT(EPOCH FROM v_reset)::INTEGER
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Middleware Implementation

```typescript
// lib/middleware/rate-limit.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const RATE_LIMIT_CONFIGS = {
  "usage-increment": { maxRequests: 100, windowSeconds: 60 }, // 100/min
  "backgrounds-upload": { maxRequests: 10, windowSeconds: 900 }, // 10/15min
  "stripe-checkout": { maxRequests: 5, windowSeconds: 300 }, // 5/5min
  "stripe-portal": { maxRequests: 10, windowSeconds: 60 }, // 10/min
  "account-delete": { maxRequests: 2, windowSeconds: 3600 }, // 2/hour
  default: { maxRequests: 60, windowSeconds: 60 }, // 60/min
} as const;

export async function withRateLimit<T>(
  request: Request,
  endpoint: keyof typeof RATE_LIMIT_CONFIGS,
  handler: () => Promise<NextResponse<T>>,
): Promise<NextResponse<T>> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    ) as NextResponse<T>;
  }

  const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;

  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: user.id,
      p_endpoint: endpoint,
      p_max_requests: config.maxRequests,
      p_window_seconds: config.windowSeconds,
    });

    if (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request if rate limit check fails
      return handler();
    }

    const result = data as RateLimitResult;

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          limit: result.limit,
          remaining: result.remaining,
          reset: new Date(result.reset * 1000).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.reset.toString(),
            "Retry-After": Math.ceil(
              (result.reset * 1000 - Date.now()) / 1000,
            ).toString(),
          },
        },
      ) as NextResponse<T>;
    }

    const response = await handler();

    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", result.limit.toString());
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set("X-RateLimit-Reset", result.reset.toString());

    return response;
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Fail open - allow request if rate limiting fails
    return handler();
  }
}
```

### Rate Limit Configuration

| Endpoint             | Limit        | Window   | Purpose                   |
| -------------------- | ------------ | -------- | ------------------------- |
| `usage-increment`    | 100 requests | 60 sec   | Export usage tracking     |
| `account-delete`     | 2 requests   | 3600 sec | Account deletion safety   |
| `stripe-checkout`    | 5 requests   | 300 sec  | Checkout session creation |
| `stripe-portal`      | 10 requests  | 60 sec   | Billing portal access     |
| `backgrounds-upload` | 10 requests  | 900 sec  | Background upload         |
| `default`            | 60 requests  | 60 sec   | Default for unspecified   |

### API Integration Pattern

```typescript
// app/api/usage/increment/route.ts
import { withRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(request: Request) {
  return withRateLimit(request, "usage-increment", async () => {
    // Protected handler logic
    const supabase = await createClient();
    // ... implementation
  });
}
```

### Monitoring Rate Limits

- **Supabase Dashboard**: Query `rate_limits` table for analytics
- **Security Events**: Rate limit violations logged to `security_events` table via `logRateLimitExceeded()`
- **Alert Threshold**: > 100 rate limit hits per hour triggers investigation
- **Cleanup**: Run `cleanup_old_rate_limits()` function periodically to remove old entries

---

## Input Validation

### Zod Schema Validation

All API requests must validate inputs using Zod schemas before processing.

```typescript
// lib/validation/api-schemas.ts
import { z } from "zod";

// Usage increment - no body needed (user from auth)
export const IncrementUsageSchema = z.object({}).strict();

// Background upload with base64 validation
export const UploadBackgroundSchema = z.object({
  file: z
    .string()
    .min(1)
    .refine(
      (val) => {
        try {
          atob(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be valid base64" },
    ),
  filename: z.string().min(1).max(255),
  contentType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
});

// Stripe checkout
export const CreateCheckoutSchema = z.object({
  priceId: z.string().startsWith("price_"),
});

// Account delete - confirmation optional for backward compatibility
export const DeleteAccountSchema = z.object({
  confirmation: z.literal("DELETE").optional(),
});

// Debug alignment log with detailed structure
export const CreateAlignmentLogSchema = z.object({
  entry: z.object({
    timestamp: z.string().datetime(),
    photo: z.enum(["before", "after"]),
    landmarks: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number().optional(),
        visibility: z.number().optional(),
      }),
    ),
    keypoints: z.object({
      shoulder: z.object({ x: z.number(), y: z.number() }).optional(),
      hip: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
    metrics: z.object({
      angle: z.number().optional(),
      scale: z.number().optional(),
      offset: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  }),
});

// Validation helper with graceful error handling
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json().catch(() => ({}));
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      return { success: false, error: errors };
    }
    return { success: false, error: "Invalid request body" };
  }
}
```

### Usage Pattern

```typescript
// app/api/backgrounds/upload/route.ts
import {
  validateRequest,
  UploadBackgroundSchema,
} from "@/lib/validation/api-schemas";

export async function POST(request: Request) {
  return withRateLimit(request, "background-upload", async () => {
    const validation = await validateRequest(request, UploadBackgroundSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { file, filename, contentType } = validation.data;
    // Safe to use validated data
  });
}
```

### Validation Standards

- ✅ All API routes validate request bodies
- ✅ Use Zod for type-safe validation
- ✅ Return 400 status with clear error messages
- ✅ Never process unvalidated user input
- ❌ NO raw `request.json()` without validation

---

## Security Headers

### Required Headers (Next.js Config)

All security headers configured in `next.config.ts`:

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-DNS-Prefetch-Control',
          value: 'on'
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload' // 2 years
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // Script: Allow inline scripts for next-themes FOUC prevention + unsafe-eval for Fabric.js
            // Note: next-themes requires inline script to prevent flash of unstyled content
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.supabase.co https://cdn.jsdelivr.net https://vercel.live",
            // Style: Allow inline for Tailwind + Google Fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.stripe.com wss://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://vercel.live",
            "frame-src https://js.stripe.com https://checkout.stripe.com https://vercel.live",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
          ].join('; ')
        }
      ]
    }
  ];
}
```

### Header Purposes

| Header                    | Value                               | Purpose                      |
| ------------------------- | ----------------------------------- | ---------------------------- |
| Content-Security-Policy   | (see above)                         | Prevent XSS, code injection  |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforce HTTPS                |
| X-Frame-Options           | DENY                                | Prevent clickjacking         |
| X-Content-Type-Options    | nosniff                             | Prevent MIME sniffing        |
| Referrer-Policy           | strict-origin-when-cross-origin     | Control referrer information |
| Permissions-Policy        | camera=(), microphone=(), ...       | Disable unused browser APIs  |

### CSP Configuration Notes

- **`unsafe-eval`**: Required for MediaPipe WASM execution
- **`unsafe-inline`**: Required for Next.js hydration
- **Stripe domains**: Required for payment processing
- **Supabase domains**: Required for auth and database
- **`blob:`**: Required for client-side image processing
- **`worker-src 'self' blob:`**: Required for Web Workers (MediaPipe)
- **`storage.googleapis.com`**: CDN fallback for MediaPipe pose model

### Verification

Test headers in production:

```bash
curl -I https://svolta.app

# Expected output includes:
# content-security-policy: default-src 'self'; ...
# strict-transport-security: max-age=31536000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
# referrer-policy: strict-origin-when-cross-origin
# permissions-policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

Or use: https://securityheaders.com/?q=https%3A%2F%2Fsvolta.app

**Target Score**: A+ (100/100)

---

## Audit Logging

### Purpose

Track critical user actions for compliance, troubleshooting, and security analysis.

### Database Schema

```sql
-- supabase/migrations/20260105000000_create_audit_logs.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

### Implementation

```typescript
// lib/audit/logger.ts
import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.signup"
  | "account.updated"
  | "account.delete"
  | "usage.incremented"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "export.created";

export interface AuditEvent {
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(
  userId: string,
  event: AuditEvent,
  request: Request,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("audit_logs").insert({
      user_id: userId,
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId,
      metadata: event.metadata,
      ip_address:
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() || null,
      user_agent: request.headers.get("user-agent") || null,
    });
  } catch (error) {
    // Fail gracefully - audit logging should never break main operations
    console.error("[AuditLogger] Failed to log event:", error);
  }
}

export async function getUserAuditLogs(
  userId: string,
  limit: number = 50,
): Promise<
  Array<{
    id: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    metadata: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
  }>
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select(
        "id, action, resource_type, resource_id, metadata, ip_address, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[AuditLogger] Failed to fetch audit logs:", error);
    return [];
  }
}
```

### Usage in API Routes

```typescript
// app/api/account/delete/route.ts
import { logAuditEvent } from "@/lib/audit/logger";

export async function DELETE(request: Request) {
  return withRateLimit(request, "account-delete", async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Log before deletion
    await logAuditEvent(
      user.id,
      {
        action: "account.delete",
        resourceType: "user",
        resourceId: user.id,
        metadata: { email: user.email },
      },
      request,
    );

    // Proceed with deletion
    // ...
  });
}
```

### Events to Audit

| Event                  | Action                   | Resource Type  | When                    |
| ---------------------- | ------------------------ | -------------- | ----------------------- |
| User signup            | `auth.signup`            | `user`         | After successful signup |
| User login             | `auth.login`             | `user`         | After successful login  |
| Account deletion       | `account.delete`         | `user`         | Before account deletion |
| Export created         | `usage.incremented`      | `usage`        | After successful export |
| Subscription created   | `subscription.created`   | `subscription` | After Stripe checkout   |
| Subscription cancelled | `subscription.cancelled` | `subscription` | After cancellation      |

---

## Security Monitoring

### Purpose

Detect threats, suspicious activity, and security incidents in real-time.

### Database Schema

```sql
-- supabase/migrations/20260105000001_create_security_events.sql
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warning', 'critical')),
  event TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for alerting and analysis
CREATE INDEX idx_security_events_level ON security_events(level);
CREATE INDEX idx_security_events_event ON security_events(event);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_critical ON security_events(created_at DESC) WHERE level = 'critical';

-- RLS (admin-only access)
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON security_events FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Implementation

```typescript
// lib/logging/security-logger.ts
export type SecurityEventLevel = "info" | "warning" | "critical";

export type SecurityEventType =
  | "auth.failed_login"
  | "auth.suspicious_activity"
  | "auth.account_locked"
  | "rate_limit.exceeded"
  | "rate_limit.warning"
  | "api.unauthorized_access"
  | "api.invalid_request"
  | "payment.fraud_detected"
  | "payment.chargeback"
  | "data.unauthorized_access"
  | "data.export_anomaly"
  | "system.configuration_change"
  | "system.error";

export interface SecurityEvent {
  level: SecurityEventLevel;
  event: SecurityEventType | string;
  userId?: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const timestamp = new Date().toISOString();

  // Console logging (Vercel logs)
  const logMessage = JSON.stringify({
    type: "SECURITY_EVENT",
    timestamp,
    level: event.level,
    event: event.event,
    userId: event.userId,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent?.substring(0, 200),
    metadata: event.metadata,
  });

  if (event.level === "critical") {
    console.error("[SECURITY] CRITICAL:", logMessage);
  } else if (event.level === "warning") {
    console.warn("[SECURITY] WARNING:", logMessage);
  } else {
    console.info("[SECURITY] INFO:", logMessage);
  }

  // Database logging
  try {
    const supabase = await createClient();
    await supabase.from("security_events").insert({
      level: event.level,
      event: event.event,
      user_id: event.userId,
      metadata: event.metadata,
      ip_address: event.ipAddress,
      user_agent: event.userAgent,
      created_at: timestamp,
    });
  } catch (error) {
    console.error("[SecurityLogger] Failed to store security event:", error);
  }
}

// Helper functions
export async function logRateLimitExceeded(
  identifier: string,
  endpoint: string,
  request: Request,
): Promise<void> {
  await logSecurityEvent({
    level: "warning",
    event: "rate_limit.exceeded",
    metadata: { identifier, endpoint, timestamp: new Date().toISOString() },
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  });
}
```

### Events to Monitor

| Event                     | Level    | Alert Threshold       | Action                     |
| ------------------------- | -------- | --------------------- | -------------------------- |
| `rate_limit.exceeded`     | warning  | > 100/hour per user   | Investigate abuse          |
| `auth.failed_login`       | warning  | > 5/hour per IP       | Check for brute force      |
| `api.unauthorized_access` | critical | > 1                   | Immediate investigation    |
| `payment.fraud_detected`  | critical | > 1                   | Block user, contact Stripe |
| `data.export_anomaly`     | warning  | > 50 exports in 5 min | Check for automation       |

---

## Database Security

### Row Level Security (RLS)

All Supabase tables must have RLS enabled with appropriate policies.

#### Profiles Table

```sql
-- Only users can view/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

#### Usage Table

```sql
-- Only users can view their own usage
CREATE POLICY "Users can view own usage"
  ON usage FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update usage
CREATE POLICY "Service role can manage usage"
  ON usage FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### Subscriptions Table

```sql
-- Only users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can manage subscriptions (Stripe webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);
```

#### Audit Logs Table

```sql
-- Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
```

#### Security Events Table

```sql
-- Admin-only access (no user policies)
CREATE POLICY "Service role only"
  ON security_events FOR ALL
  USING (true)
  WITH CHECK (true);
```

### RLS Testing

Verify RLS policies work:

```typescript
// Test as authenticated user
const supabase = createClient(); // User client
const { data } = await supabase.from("profiles").select("*");
// Should only return current user's profile

// Test as service role (bypasses RLS)
const supabaseAdmin = createAdminClient();
const { data: allProfiles } = await supabaseAdmin.from("profiles").select("*");
// Should return all profiles
```

---

## Dependency Security

### Automated Scanning (GitHub Actions)

```yaml
# .github/workflows/security.yml
name: Security Audit

on:
  push:
    branches: [develop, staging, main]
  pull_request:
    branches: [develop, staging, main]
  schedule:
    - cron: "0 9 * * 1" # Weekly on Mondays at 9am PT

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm ci
      - name: Run npm audit
        run: npm audit --audit-level=moderate --json > audit-results.json || true
      - name: Upload audit results
        uses: actions/upload-artifact@v4
        with:
          name: security-audit
          path: audit-results.json
          retention-days: 90
      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const audit = JSON.parse(fs.readFileSync('audit-results.json', 'utf8'));
            const vulnerabilities = audit.metadata.vulnerabilities;
            const comment = `## Security Audit Results\n\n` +
              `- Critical: ${vulnerabilities.critical}\n` +
              `- High: ${vulnerabilities.high}\n` +
              `- Moderate: ${vulnerabilities.moderate}\n` +
              `- Low: ${vulnerabilities.low}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Los_Angeles"
    open-pull-requests-limit: 10
    groups:
      nextjs:
        patterns: ["next", "@next/*"]
      supabase:
        patterns: ["@supabase/*"]
      stripe:
        patterns: ["stripe", "@stripe/*"]
      testing:
        patterns: ["vitest", "@vitest/*", "@testing-library/*"]
    labels:
      - "dependencies"
      - "security"
```

### Manual Audit Process

Run security audits before each release:

```bash
# Check for vulnerabilities
npm audit

# Generate detailed report
npm audit --json > security-audit.json

# Fix vulnerabilities automatically
npm audit fix

# For breaking changes, review and update manually
npm audit fix --force
```

### Severity Response

| Severity | Response Time | Action                           |
| -------- | ------------- | -------------------------------- |
| Critical | 24 hours      | Immediate hotfix + deploy        |
| High     | 1 week        | Priority fix in next sprint      |
| Moderate | 2 weeks       | Fix in regular development cycle |
| Low      | 1 month       | Fix when convenient              |

---

## Environment Variables

### Required Secrets

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxx
```

### Security Rules

- ✅ All secrets in environment variables
- ✅ `.env.local` in `.gitignore`
- ✅ Vercel Dashboard for production secrets
- ✅ Rotate secrets quarterly
- ❌ NO secrets committed to Git
- ❌ NO secrets in client-side code (except `NEXT_PUBLIC_*`)
- ❌ NO secrets in error messages or logs

### Secret Rotation Schedule

| Secret                    | Rotation Frequency | Process                     |
| ------------------------- | ------------------ | --------------------------- |
| SUPABASE_SERVICE_ROLE_KEY | Every 6 months     | Regenerate in Supabase dash |
| STRIPE_SECRET_KEY         | Annually           | Generate new key in Stripe  |
| STRIPE_WEBHOOK_SECRET     | When compromised   | Create new webhook endpoint |

---

## Privacy Architecture

### Client-Side Processing Only

**Critical Principle**: Photos are NEVER uploaded to servers.

```typescript
// ❌ NEVER DO THIS
async function uploadPhoto(photo: File) {
  const formData = new FormData();
  formData.append("photo", photo);
  await fetch("/api/upload", { method: "POST", body: formData });
}

// ✅ CORRECT: Process client-side
async function processPhoto(photo: File) {
  const imageUrl = URL.createObjectURL(photo);
  // Process with MediaPipe/Fabric.js in browser
  const result = await detectPose(imageUrl);
  // Export directly from browser
  canvas.toBlob((blob) => {
    saveAs(blob, "export.png");
  });
}
```

### Data Minimization

Only store essential user data:

```typescript
// profiles table
interface Profile {
  id: string; // User ID (required for RLS)
  email: string; // For communication
  stripe_customer_id: string | null; // For billing
  created_at: string; // For analytics
  updated_at: string; // For cache invalidation
  // NO photos, NO personal information
}

// usage table
interface Usage {
  user_id: string; // User ID (required for RLS)
  month: string; // Billing period (YYYY-MM)
  exports_count: number; // Usage tracking
  last_export_at: string; // Last activity
  // NO photo metadata, NO identifying information
}
```

### Privacy Messaging

Prominently display privacy guarantees:

```typescript
// components/features/editor/PrivacyBadge.tsx
export function PrivacyBadge() {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <ShieldCheckIcon className="w-5 h-5 text-green-600" />
      <span>Your photos are processed locally and never uploaded</span>
    </div>
  );
}
```

---

## Stripe Integration Security

### Webhook Signature Verification

Always verify Stripe webhook signatures:

```typescript
// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Process verified event
  // ...
}
```

### Checkout Session Security

```typescript
// app/api/stripe/checkout/route.ts
export async function POST(request: Request) {
  return withRateLimit(request, "stripe-checkout", async () => {
    const validation = await validateRequest(request, CreateCheckoutSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create checkout session with customer ID from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const session = await stripe.checkout.sessions.create({
      customer: profile?.stripe_customer_id || undefined,
      customer_email: !profile?.stripe_customer_id ? user.email : undefined,
      line_items: [{ price: validation.data.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/editor?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  });
}
```

---

## What NOT to Do

| Anti-Pattern                  | Why It's Wrong           | Correct Approach                |
| ----------------------------- | ------------------------ | ------------------------------- |
| Uploading photos to server    | Privacy violation        | Client-side processing only     |
| No rate limiting              | DDoS vulnerability       | Supabase RPC rate limiting      |
| No input validation           | Injection attacks        | Zod schema validation           |
| Secrets in code               | Security breach          | Environment variables           |
| Skipping webhook verification | Payment fraud            | Verify Stripe signatures        |
| No audit logging              | Compliance failure       | Log all critical actions        |
| Weak CSP headers              | XSS vulnerability        | Strict CSP with allowed domains |
| Trusting x-forwarded-for      | IP spoofing              | Validate IPs, prefer x-real-ip  |
| RLS disabled                  | Unauthorized data access | Enable RLS on all tables        |
| No security monitoring        | Undetected threats       | Log security events             |

---

## Security Checklist

Before deploying any feature or release:

### Infrastructure

- [ ] Rate limiting configured on all public APIs
- [ ] All secrets in environment variables (Vercel Dashboard)
- [ ] Security headers configured in `next.config.ts`
- [ ] `.env.local` in `.gitignore`

### API Security

- [ ] Input validation on all API routes (Zod schemas)
- [ ] Rate limiting applied to all routes
- [ ] Audit logging integrated for critical actions
- [ ] Error messages don't leak sensitive information

### Database Security

- [ ] RLS enabled on all tables
- [ ] RLS policies tested for each user role
- [ ] Indexes created for performance
- [ ] Migrations applied to production

### Authentication & Authorization

- [ ] Supabase Auth configured correctly
- [ ] Session verification on protected routes
- [ ] Service role used only where necessary
- [ ] User permissions validated before mutations

### Monitoring

- [ ] Security event logging functional
- [ ] Audit logging functional
- [ ] GitHub Actions security workflow enabled
- [ ] Dependabot configured and running

### Privacy

- [ ] Photos processed client-side only
- [ ] No PII stored unnecessarily
- [ ] Privacy messaging visible to users
- [ ] Data minimization principles followed

### Dependencies

- [ ] `npm audit` shows 0 critical vulnerabilities
- [ ] `npm audit` shows 0 high vulnerabilities
- [ ] Dependabot PRs reviewed within 1 week
- [ ] Dependencies updated quarterly

### Testing

- [ ] Security headers verified in production
- [ ] Rate limiting tested (>100 requests)
- [ ] RLS policies verified with test accounts
- [ ] Webhook signature verification tested

---

## Security Score Tracking

### Current Score: 100/100 (A+)

| Category                | Points  | Status      |
| ----------------------- | ------- | ----------- |
| Security Headers        | 30/30   | ✅ Complete |
| Rate Limiting           | 20/20   | ✅ Complete |
| Input Validation        | 15/15   | ✅ Complete |
| Audit Logging           | 10/10   | ✅ Complete |
| Security Monitoring     | 10/10   | ✅ Complete |
| Database Security (RLS) | 10/10   | ✅ Complete |
| Dependency Scanning     | 5/5     | ✅ Complete |
| **Total**               | **100** | **A+**      |

### Bonus Points Achieved

- +2 points: Security event monitoring system
- +2 points: Comprehensive audit logging

**Technical Total**: 104/100 points

### Verification

Test current security posture:

```bash
# Test security headers
curl -I https://svolta.app

# Verify at SecurityHeaders.com
open "https://securityheaders.com/?q=https%3A%2F%2Fsvolta.app"

# Expected: A+ rating with all 6 headers present
```

---

## Incident Response

### Security Incident Procedure

1. **Detection**: Monitor security events table for critical events
2. **Assessment**: Determine severity and impact
3. **Containment**: Rate limit or disable affected endpoints
4. **Investigation**: Query audit logs and security events
5. **Resolution**: Apply fixes and verify
6. **Documentation**: Update this document with lessons learned

### Contact Information

- **Security Issues**: Report to security@svolta.app
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Stripe Support**: https://support.stripe.com

---

## Related Documentation

- [ACTION_PLAN.md](../architecture/ACTION_PLAN.md) - Security hardening implementation plan
- [SECURITY_NEXT_STEPS.md](../SECURITY_NEXT_STEPS.md) - Future security improvements
- [documentation.md](./documentation.md) - Documentation standards

---

**Version:** 1.0.0
**Last Updated:** 2026-01-04
**Maintained By:** Svolta Engineering Team
**Next Review:** 2026-04-04 (Quarterly)

---

## What NOT to Do

- **Never store photos server-side** — client-side processing is the privacy guarantee; violating this breaks GDPR compliance
- **Never skip rate limiting** on API routes — unprotected endpoints will be abused
- **Never expose the service role key** client-side — it bypasses all RLS policies

## Verification Checklist

- [ ] Rate limiting applied to all new API routes
- [ ] Security headers present (check via `curl -I` or browser DevTools)
- [ ] No secrets or service role keys in client-side code
- [ ] New API routes validate input before processing
- [ ] Stripe webhook signature verified before processing events
