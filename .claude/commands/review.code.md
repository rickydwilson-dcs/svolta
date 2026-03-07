# Review Code

Run a comprehensive parallel code review of this codebase using specialized sub-agents across five domains: security, code quality, accessibility/SEO, performance, and architecture. This is a **read-only** review — findings are reported, not auto-fixed.

## Arguments

Parse `$ARGUMENTS` to determine scope:

- **No arguments** → full review (all 5 domains, all files)
- **Domain name** → single domain only: `security`, `code-quality`, `accessibility`, `performance`, `architecture`
- **Path** → all 5 domains scoped to that directory (e.g., `app/editor`, `components/ui`)

## Step 1: Setup

Verify you are on the `develop` branch:

```bash
git branch --show-current
```

If not on `develop`, STOP and inform the user.

Create the session directory:

```bash
SESSION_DIR="output/sessions/$(date +%Y-%m-%d)_code-review"
mkdir -p "$SESSION_DIR"
```

Write `session.md`:

```markdown
# Session: Code Review

**Date:** YYYY-MM-DD
**Status:** Active
**Scope:** [full | domain-name | path]
**Domains:** [security, code-quality, accessibility/seo, performance, architecture]

## Agents

| Domain              | Status  | Findings File                  |
| ------------------- | ------- | ------------------------------ |
| Security            | Pending | findings-security.md           |
| Code Quality        | Pending | findings-code-quality.md       |
| Accessibility & SEO | Pending | findings-accessibility-seo.md  |
| Performance         | Pending | findings-performance.md        |
| Architecture        | Pending | findings-architecture.md       |
```

## Step 1.5: Check for Previously Fixed Findings

Look for the most recent `fixes-applied.md` from a previous `/fix.findings` run:

```bash
find output/sessions -name "fixes-applied.md" -type f 2>/dev/null | sort -r | head -1
```

If found, read it and extract the list of finding IDs that were successfully applied (from the "Applied" sections). Build a short summary like:

```
Previously fixed finding IDs: SEC-001, SEC-004, CQ-001, CQ-002, ARCH-001, ARCH-002, A11Y-001, PERF-003
```

Also check the most recent `aggregated-report.md` for the previous finding descriptions, so agents understand what was already addressed.

This context will be injected into each agent's prompt below.

## Step 2: Spawn Parallel Review Agents

Use the **Task tool** to spawn the agents below. Launch all applicable agents in a **single message** with `run_in_background: true` so they execute in parallel.

If `$ARGUMENTS` is a domain name, spawn only that domain's agent.
If `$ARGUMENTS` is a path, include `SCOPE: Only examine files under [path]` in each agent's prompt.

**If previously fixed findings were found in Step 1.5**, append the following to **each** agent's prompt:

> **Previously fixed findings (do NOT re-report these):**
> [list of finding IDs and one-line descriptions]
>
> These findings were addressed in a prior fix session. Only re-report a previously fixed finding if the fix was incomplete or introduced a new issue. In that case, use a NEW finding ID and reference the old one (e.g., "SEC-010: Incomplete fix for SEC-001 — ...").

---

### Agent 1: Security Review

```
Task tool parameters:
  description: "Security review audit"
  subagent_type: "cs-security-engineer"
  run_in_background: true
```

**Prompt for the agent:**

> You are reviewing the Svolta codebase for security issues. Svolta is a fitness photo alignment SaaS — photos are processed client-side only and never uploaded to servers.
>
> **Step 1: Read the project's security standards**
> Read the file `docs/standards/security.md` — this is your review checklist.
>
> **Step 2: Examine the codebase**
> Review these areas for security issues:
>
> - `app/api/**/*.ts` — input validation, authentication checks, CSRF protection, rate limiting
> - `middleware.ts` — security headers (CSP, HSTS, X-Frame-Options, permissions policy)
> - `next.config.ts` — CSP configuration, image domains, dangerouslyAllowSVG
> - `lib/supabase*.ts` — Supabase client configuration, RLS enforcement, auth token handling
> - `app/api/stripe/**/*.ts` — webhook signature verification, idempotency, plan entitlement checks
> - `app/api/account/delete/route.ts` — authorization before destructive operations
> - `.env*` files checked into git (there should be none with real secrets)
> - Any hardcoded API keys, tokens, or credentials in source files
>
> Also run `npm audit` and include any HIGH/CRITICAL vulnerability findings.
>
> **Svolta-specific concerns:**
> - Photo privacy: verify no client-side code ever uploads image data to any external endpoint
> - Supabase RLS: check that API routes enforce Row Level Security, not just client-side checks
> - Stripe webhooks: verify `stripe.webhooks.constructEvent()` is called before processing any webhook payload
> - CSP: verify `storage.googleapis.com` and MediaPipe CDN are allowed for client-side pose detection
>
> **Scoping rule:** Do NOT flag `.env.local` files that are properly gitignored. Environment file storage location is outside the scope of a code review — only flag secrets that are actually committed to version control or hardcoded in source files.
>
> **Step 3: Write findings**
> Write your findings to `output/sessions/YYYY-MM-DD_code-review/findings-security.md` using this exact format:
>
> ```
> # Security Review Findings
>
> **Reviewer:** cs-security-engineer
> **Scope:** [describe what was reviewed]
> **Date:** YYYY-MM-DD
>
> ## Summary
>
> [2-3 sentence overview]
>
> ## Findings
>
> ### [SEVERITY] SEC-NNN: Short Title
> - **File:** `path/to/file.ts` (lines X-Y)
> - **Issue:** Clear description
> - **Impact:** What could go wrong
> - **Fix:** Specific remediation steps
> - **Effort:** trivial | small | medium | large
>
> ## Statistics
>
> - Critical: N
> - High: N
> - Medium: N
> - Low: N
> - Total: N
> ```
>
> Severity levels: CRITICAL (exploitable now), HIGH (significant risk), MEDIUM (should fix), LOW (minor/informational).
> Number findings sequentially: SEC-001, SEC-002, etc.
> If there are no findings for a severity level, omit that section.

---

### Agent 2: Code Quality Review

```
Task tool parameters:
  description: "Code quality review"
  subagent_type: "cs-code-reviewer"
  run_in_background: true
```

**Prompt for the agent:**

> You are reviewing the Svolta codebase for code quality issues.
>
> **Step 1: Read the project standards**
> Read this file — it defines the project's coding standards:
>
> - `docs/standards/code-style.md` — TypeScript conventions, component patterns, naming rules
>
> Also read `CLAUDE.md` for architecture rules and constraints.
>
> **Step 2: Examine the codebase**
> Review for:
>
> - **TypeScript `any` types** — Svolta targets strict TypeScript; flag all `any` occurrences (except `// eslint-disable` exemptions with justification)
> - **TypeScript prop interfaces** — all component props must have TypeScript interfaces
> - **Zustand store patterns** — check `stores/editor-store.ts` and `stores/user-store.ts` for selector usage, action naming, and avoid unnecessary re-renders (store slices should be used, not entire store)
> - **Hook patterns** — check `hooks/` for single-responsibility hooks, correct dependency arrays, no missing deps in useEffect/useCallback/useMemo
> - **No `console.log`** in production code — check `app/`, `components/`, `hooks/`, `stores/`, `lib/`
> - **Unused imports/variables** — scan for dead code
> - **Code duplication** — repeated logic across hooks or components that should be extracted
> - **Named exports** — prefer named exports over default exports (except Next.js framework files: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`)
>
> Also run `npm run lint` and include any ESLint violations.
>
> **Scoping rules:**
>
> - Do NOT flag framework-mandated patterns as violations. Next.js requires default exports for `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and route handlers. These are exempt.
> - Only report problems. Do NOT include positive observations or "correctly implemented" notes as findings.
>
> **Step 3: Write findings**
> Write to `output/sessions/YYYY-MM-DD_code-review/findings-code-quality.md` using this format:
>
> ```
> # Code Quality Review Findings
>
> **Reviewer:** cs-code-reviewer
> **Scope:** [describe what was reviewed]
> **Date:** YYYY-MM-DD
>
> ## Summary
>
> [2-3 sentence overview]
>
> ## Findings
>
> ### [SEVERITY] CQ-NNN: Short Title
> - **File:** `path/to/file.ts` (lines X-Y)
> - **Issue:** Clear description
> - **Impact:** What could go wrong
> - **Fix:** Specific remediation steps
> - **Effort:** trivial | small | medium | large
>
> ## Statistics
>
> - Critical: N
> - High: N
> - Medium: N
> - Low: N
> - Total: N
> ```
>
> Severity: CRITICAL (build-breaking or type-unsafe), HIGH (significant quality issue), MEDIUM (should fix), LOW (style/minor).
> Number findings: CQ-001, CQ-002, etc.

---

### Agent 3: Accessibility & SEO Review

```
Task tool parameters:
  description: "Accessibility and SEO review"
  subagent_type: "cs-frontend-engineer"
  run_in_background: true
```

**Prompt for the agent:**

> You are reviewing the Svolta codebase for accessibility and SEO issues.
>
> **Step 1: Read the project standards**
> Read this file — it contains design tokens and UI standards:
>
> - `docs/standards/design-tokens.md` — colour palette, spacing, typography tokens
>
> Also read `CLAUDE.md` for project context.
>
> **Step 2: Examine the codebase**
>
> _Accessibility:_
>
> - Semantic HTML: heading hierarchy (one h1 per page, h2 → h3 nesting) in layout and page components
> - ARIA attributes on interactive elements: modals, dropdowns, bottom sheets, toggle controls, segmented controls
> - Form components in `components/ui/`: labels linked to inputs, error announcements, required field indicators
> - Focus management: skip links, focus traps in modals, visible focus indicators (not just `:focus-visible` ring removal)
> - Image alt text: check all `<Image>` and `<img>` components for meaningful alt attributes
> - Canvas accessibility: the Fabric.js canvas in `components/editor/` — is there an accessible fallback or description for screen readers?
> - Colour contrast: verify design token colour pairs in `docs/standards/design-tokens.md` meet WCAG AA (4.5:1 for text)
>
> _SEO (landing pages):_
>
> - Meta tags: landing pages should generate title and description (check `generateMetadata` in `app/page.tsx`, `app/layout.tsx`)
> - Title format: 50-60 characters, description: 120-160 characters
> - OpenGraph and Twitter card meta tags
> - `robots.ts` — correct allow/disallow rules (editor routes should be noindex)
> - `sitemap.ts` — includes all public-facing pages
>
> **Step 3: Write findings**
> Write to `output/sessions/YYYY-MM-DD_code-review/findings-accessibility-seo.md` using this format:
>
> ```
> # Accessibility & SEO Review Findings
>
> **Reviewer:** cs-frontend-engineer
> **Scope:** [describe what was reviewed]
> **Date:** YYYY-MM-DD
>
> ## Summary
>
> [2-3 sentence overview]
>
> ## Findings
>
> ### [SEVERITY] A11Y-NNN: Short Title
> - **File:** `path/to/file.ts` (lines X-Y)
> - **Issue:** Clear description
> - **Impact:** What could go wrong
> - **Fix:** Specific remediation steps
> - **Effort:** trivial | small | medium | large
>
> ## Statistics
>
> - Critical: N
> - High: N
> - Medium: N
> - Low: N
> - Total: N
> ```
>
> Severity: CRITICAL (completely inaccessible or missing critical SEO), HIGH (significant a11y/SEO gap), MEDIUM (should improve), LOW (enhancement).
> Number findings: A11Y-001, A11Y-002, etc. Use SEO-001, SEO-002 for SEO-specific findings.

---

### Agent 4: Performance Review

```
Task tool parameters:
  description: "Performance review"
  subagent_type: "cs-frontend-engineer"
  run_in_background: true
```

**Prompt for the agent:**

> You are reviewing the Svolta codebase for performance issues. Svolta is a canvas-based editor that uses MediaPipe for pose detection and Fabric.js for image manipulation — performance is critical.
>
> **Step 1: Read the project standards**
> Read these files for context:
>
> - `docs/standards/design-tokens.md` — UI standards and component patterns
> - `docs/features/pose-detection.md` — how MediaPipe is integrated
> - `docs/features/alignment-export.md` — how canvas export and GIF export work
>
> Also read `CLAUDE.md` for architecture context.
>
> **Step 2: Examine the codebase**
> Review for:
>
> - **Canvas rendering performance** — check `hooks/useCanvasExport.ts`, `hooks/useGifExport.ts`, and `components/editor/` for:
>   - Unnecessary re-renders caused by unstable Zustand selectors
>   - Missing `requestAnimationFrame` usage for canvas updates
>   - Synchronous canvas operations that could block the main thread
> - **MediaPipe loading** — check `hooks/usePoseDetection.ts` for:
>   - Lazy loading of the MediaPipe WASM/model files
>   - Correct use of `useEffect` with cleanup to avoid memory leaks
>   - Whether the detector is properly disposed of on unmount
> - **Bundle size** — check `next.config.ts` for bundle analysis config; look for large synchronous imports in client components that should be dynamic imports (`next/dynamic`)
> - **GIF export performance** — check `hooks/useGifExport.ts` for:
>   - Frame encoding done off the main thread if possible (Web Worker usage or chunked processing)
>   - Memory leaks from accumulated canvas frames
> - **Background removal** — check `hooks/useBackgroundRemoval.ts` for Web Worker usage and cleanup
> - **Image processing** — check for HEIC conversion, image scaling — are these done asynchronously without blocking render?
> - **React re-render hotspots** — look for components subscribing to large Zustand slices when they only need a small part
> - **Memory management** — object URL revocation (`URL.revokeObjectURL`), canvas cleanup on unmount
>
> **Scoping rules:**
>
> - Only report problems. Do NOT include positive observations or "correctly implemented" notes as findings.
> - Focus on measurable performance impacts, not theoretical concerns.
>
> **Step 3: Write findings**
> Write to `output/sessions/YYYY-MM-DD_code-review/findings-performance.md` using this format:
>
> ```
> # Performance Review Findings
>
> **Reviewer:** cs-frontend-engineer
> **Scope:** [describe what was reviewed]
> **Date:** YYYY-MM-DD
>
> ## Summary
>
> [2-3 sentence overview]
>
> ## Findings
>
> ### [SEVERITY] PERF-NNN: Short Title
> - **File:** `path/to/file.ts` (lines X-Y)
> - **Issue:** Clear description
> - **Impact:** User-visible effect (FPS drop, slow load, memory leak, etc.)
> - **Fix:** Specific remediation steps
> - **Effort:** trivial | small | medium | large
>
> ## Statistics
>
> - Critical: N
> - High: N
> - Medium: N
> - Low: N
> - Total: N
> ```
>
> Severity: CRITICAL (causes visible freezing or OOM), HIGH (measurable perf degradation), MEDIUM (should improve), LOW (minor optimisation).
> Number findings: PERF-001, PERF-002, etc.

---

### Agent 5: Architecture Review

```
Task tool parameters:
  description: "Architecture review"
  subagent_type: "cs-architect"
  run_in_background: true
```

**Prompt for the agent:**

> You are reviewing the Svolta codebase for architecture violations and structural issues.
>
> **Step 1: Read the project architecture docs**
> Read these files — they describe how the system is designed to work:
>
> - `docs/architecture/overview.md` — high-level system overview
> - `docs/architecture/database.md` — Supabase schema and RLS design
>
> Also read the project root `CLAUDE.md` for the key architecture rules and constraints.
>
> **Step 2: Examine the codebase**
> Review for:
>
> - **Client-side processing boundary**: Photos must never be uploaded to a server. Verify that all image/canvas operations in `hooks/` and `components/editor/` stay client-side. Flag any `fetch` or API call that sends image data.
> - **Zustand store boundaries**: `editor-store.ts` should own canvas/editor state. `user-store.ts` should own auth/subscription state. Flag cross-store dependencies or business logic leaking into components.
> - **Component hierarchy**: check that `components/editor/` components are properly composed — no God components doing too much, no business logic in presentational components
> - **API route structure**: check `app/api/` — each route should have a single responsibility, use Supabase service client (not anon client), and validate inputs before acting
> - **Hook responsibilities**: each hook in `hooks/` should have a single concern. Flag hooks that mix unrelated concerns (e.g., combining pose detection with canvas state).
> - **Dependency direction**: components should not import from `stores/` directly (use Zustand hooks); `lib/` should not import from `components/` or `hooks/`
> - **Server vs client split**: verify `'use client'` directives are appropriate — server components should not import client-heavy libraries (Fabric.js, MediaPipe)
>
> **Step 3: Write findings**
> Write to `output/sessions/YYYY-MM-DD_code-review/findings-architecture.md` using this format:
>
> ```
> # Architecture Review Findings
>
> **Reviewer:** cs-architect
> **Scope:** [describe what was reviewed]
> **Date:** YYYY-MM-DD
>
> ## Summary
>
> [2-3 sentence overview]
>
> ## Findings
>
> ### [SEVERITY] ARCH-NNN: Short Title
> - **File:** `path/to/file.ts` (lines X-Y)
> - **Issue:** Clear description
> - **Impact:** What could go wrong
> - **Fix:** Specific remediation steps
> - **Effort:** trivial | small | medium | large
>
> ## Statistics
>
> - Critical: N
> - High: N
> - Medium: N
> - Low: N
> - Total: N
> ```
>
> Severity: CRITICAL (breaks the architecture model), HIGH (significant violation), MEDIUM (should refactor), LOW (minor improvement).
> Number findings: ARCH-001, ARCH-002, etc.
> Only report problems. Do NOT include positive observations or "correctly implemented" notes as findings.

---

## Step 3: Wait for Agents and Aggregate

After launching agents, check on each background agent using the TaskOutput tool. Wait for all to complete.

If any agent fails, log it in `session.md` and continue with the others.

Once all agents are done, read all findings files:

- `findings-security.md`
- `findings-code-quality.md`
- `findings-accessibility-seo.md`
- `findings-performance.md`
- `findings-architecture.md`

Aggregate into `aggregated-report.md` using this template:

```markdown
# Aggregated Code Review Report

**Date:** YYYY-MM-DD
**Branch:** develop
**Scope:** [full | domain-name | path]

---

## Executive Summary

| Severity  | Security | Code Quality | A11y/SEO | Performance | Architecture | **Total** |
| --------- | -------- | ------------ | -------- | ----------- | ------------ | --------- |
| Critical  | N        | N            | N        | N           | N            | **N**     |
| High      | N        | N            | N        | N           | N            | **N**     |
| Medium    | N        | N            | N        | N           | N            | **N**     |
| Low       | N        | N            | N        | N           | N            | **N**     |
| **Total** | **N**    | **N**        | **N**    | **N**       | **N**        | **N**     |

**Immediate attention required:** [summary of critical findings]

---

## Cross-Domain Issues

Findings flagged by 2+ agents targeting the same file (within 5 lines), merged under the highest severity.

### 1. Issue Title (Domain A + Domain B)

**Severity:** [highest] | **Files:** `path/to/file.ts`

- **Finding IDs:** [list]
- **Summary:** [description]
- **Effort:** [estimate]

---

## All Findings by Severity

### CRITICAL (N)

| ID  | Domain | File | Issue |
| --- | ------ | ---- | ----- |
| ... | ...    | ...  | ...   |

### HIGH (N)

| ID  | Domain | File | Issue |
| --- | ------ | ---- | ----- |
| ... | ...    | ...  | ...   |

### MEDIUM (N)

| ID  | Domain | Issue Summary |
| --- | ------ | ------------- |
| ... | ...    | ...           |

### LOW (N)

| ID  | Domain | Issue Summary |
| --- | ------ | ------------- |
| ... | ...    | ...           |

---

## Per-Domain Breakdown

### [Domain] (N findings)

**Key themes:** [summary]

**Quick wins:**

- [trivial/small effort findings]

**Priority fixes:**

- [high-impact findings]

---

## Recommended Remediation Order

### Immediate (Blocking CI/Production Issues)

1. [finding] — _reason_

### This Sprint (High Impact)

2. [finding] — _reason_

### Next Sprint (Technical Debt)

3. [finding] — _reason_

---

## Previously Fixed (Excluded from Counts)

[If Step 1.5 found previously fixed findings, list them here. Otherwise omit this section.]

| ID      | Original Issue                          | Status                 |
| ------- | --------------------------------------- | ---------------------- |
| SEC-001 | Missing webhook signature verification  | Fixed in prior session |
| ...     | ...                                     | ...                    |

---

## Files

- `findings-security.md` - Full security review details
- `findings-code-quality.md` - Full code quality review details
- `findings-accessibility-seo.md` - Full accessibility and SEO review details
- `findings-performance.md` - Full performance review details
- `findings-architecture.md` - Full architecture review details

---

_Generated by parallel code review agents on YYYY-MM-DD_
```

Write the report to `output/sessions/YYYY-MM-DD_code-review/aggregated-report.md`.

## Step 4: Present Results

Report to the user:

- Total findings count per severity level
- Top 5 most critical/high findings with file paths
- Path to the session directory for full details
- Any domains that were skipped due to agent failures
- Recommendation: whether immediate attention is needed (any CRITICAL findings)

## Rules

- **READ-ONLY** — do NOT modify any source files. This is a review, not a fix.
- Do NOT auto-commit anything.
- If a sub-agent fails, continue with the others and note the failure in the report.
- **Findings format is non-negotiable** — future commands (`/fix.findings`) will parse the output.
- Always include the session directory path in the final output.
- Replace `YYYY-MM-DD` with the actual date in all file paths and content.
- Follow the project's change philosophy: never remove features, prefer minimal targeted changes.
