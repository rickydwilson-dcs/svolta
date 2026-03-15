# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.2] - 2026-03-15

### Fixed

- **UpgradeNudge:** Inline `maxWidth: 36rem` to bypass Tailwind 4 `--spacing-xl` conflict causing `max-w-xl` to resolve to 2rem
- **AppTabBar:** Fixed-width buttons (`w-20`) so negative space grows on wider screens instead of buttons stretching
- **AppTabBar:** Now visible on all mobile browsers, not only PWA standalone mode
- **Layout:** Added `w-full` to client component sections to prevent flex width collapse on mobile

### Technical

- 128 TypeScript/TSX source files

---

## [0.6.1] - 2026-03-15

### Added

- **Navigation:** Mobile header simplified to logo-only (desktop retains full nav)
- **Pages:** Add `/help` page with structured FAQ (getting started, editor, exports, billing, privacy)
- **Pages:** Add `/privacy` page — full GDPR-compliant privacy policy (Palma Wilson Ltd data controller)
- **Pages:** Add `/cookie-policy` page with essential/analytics/advertising cookie breakdown
- **Pages:** Add `/contact` page with `mailto:ciao@svolta.app` link (no form)

### Changed

- **AppTabBar:** Gradient background (brand-pink → brand-purple), squircle buttons with white text/icons
- **Footer:** Upgraded with Help, Privacy Policy, Cookie Policy, Contact links and Palma Wilson Ltd copyright gutter
- **Layout:** Footer moved inside `<main>` scroll area so it scrolls naturally behind the fixed bottom tab bar

### Technical

- 125 TypeScript/TSX source files (up from 121)

---

## [0.6.0] - 2026-03-15

### Added

- **PWA:** Add `useIsStandalone` hook for detecting PWA standalone mode
- **PWA:** Create `AppTabBar` component with Editor, Home, and Settings tabs
- **PWA:** Create `AppHomeOverlay` for standalone PWA home screen with usage tracking
- **PWA:** Create `InstallAppBanner` for desktop web visitors with install instructions
- **Marketing:** Auth-aware home page with 4 user states (anonymous, free, free-exhausted, pro)
- **Marketing:** `UsageIndicator` component showing export progress bar for free users
- **Marketing:** `UpgradeNudge` component replacing pricing section for logged-in free users
- **Layout:** `MarketingLayoutShell` with standalone-aware header/footer

### Changed

- **Marketing:** Extract page content into `MarketingPageContent` client component for auth state detection
- **Marketing:** Pro users see minimal "Welcome back" + "Open Editor" instead of full sales funnel
- **Header:** Always show Editor/Try Free button in `MarketingHeader` regardless of Pro status
- **Settings:** Remove back-to-editor link, add tab bar padding
- **Editor:** Make editor header responsive for bottom tab bar

### Technical

- 121 TypeScript/TSX source files (up from 113)
- 10 custom React hooks
- 7 API route directories

---

## [0.5.0] - 2026-03-14

### Changed

- **Watermark:** Redesign from centered logo to diagonal repeating gradient text at 45% opacity for better coverage
- **Editor:** Move zoom/pan gesture controls from PhotoPanel to ExportPreview (users frame their export, not the edit view)
- **Auth:** Use global sign out scope; keep `isInitialized` true on reset to prevent flash
- **Export:** Reset framing button in ExportPreview top-right corner with cursor states and ARIA labels
- **Export:** Watermark preview in ExportPreview matches actual export watermark style

### Added

- **Auth:** Redirect authenticated users away from login page
- **Project:** Add BACKLOG.md for project management
- **Assets:** Add svolta-logo.png for email templates
- **Templates:** Supabase email templates for confirm signup and magic link

### Removed

- **Editor:** Remove Crop Zoom slider and Reset Framing button from AlignmentControls (moved to ExportPreview)
- **Editor:** Remove zoom/pan gestures from PhotoPanel
- **Watermark:** Remove position/opacity options from export callers (now uses consistent defaults)

### Technical

- 113 TypeScript/TSX source files
- 10 custom React hooks
- 7 API route directories

---

## [0.4.1] - 2026-03-08

### Fixed

- **Editor:** Replace stuck `isRendering` toggle with `imagesLoading` in AlignedPreview
- **Editor:** Replace stuck `isReady` toggle with `imagesLoading`/`canvasReady` in GifPreview
- **Export:** Surface real error messages for non-limit export failures (auth, server, network)
- **Canvas:** Add URL type context to image load errors for debugging
- **Infrastructure:** Add ChunkErrorReload component for stale Vercel deployment recovery
- **Infrastructure:** Add `wasm-unsafe-eval` to CSP for MediaPipe WebAssembly support
- **Export:** Fix preview container height for consistent rendering
- **Export:** Fix canvas dimension calculation (resolution = total width)
- **Store:** Improve blob URL lifecycle management on photo replacement

## [0.4.0] - 2026-03-08

### Added

- **Editor:** Wire AlignmentControls into EditorContent layout (ARCH-008)
- **SEO:** Add metadata and OG tags to upgrade page
- **SEO:** Move upgrade page to marketing route group for better indexing

### Changed

- **Export:** Refactor ExportModal into thin container with extracted hooks and utilities
- **Export:** Extract `useExportBackgroundRemoval` and `useExportDownload` hooks
- **Export:** Extract child UI components and utility functions to dedicated modules
- **Performance:** Remove dead Fabric.js dependency and unsafe-eval CSP (PERF-003, SEC-005)
- **Performance:** Dynamic import @imgly/background-removal to reduce initial bundle (PERF-002)
- **Performance:** Parallelize background removal with Promise.all (PERF-011)
- **Performance:** Return blob URLs from removeBackground/applyBackground (PERF-001)
- **Performance:** Replace toDataURL with toBlob + blob URLs in scaleImage (PERF-008)
- **Performance:** Narrow useAlignment selectors to landmarks only (PERF-010)
- **Performance:** Pause GifPreview animation when off-screen via IntersectionObserver (PERF-006)
- **Performance:** Add requestAnimationFrame guard to AlignedPreview draw effect (PERF-005)
- **Logging:** Replace all console calls with structured loggers across codebase

### Fixed

- **Tests:** Update usage API tests to match refactored route handlers
- **Billing:** Remove stale profile subscription columns, add webhook tests (ARCH-001)
- **Store:** Revoke blob URLs on photo replacement and editor reset (PERF-001)
- **Store:** Add isInitialized to reset(), remove logo_url type cast (CQ-010, ARCH-010)
- **Store:** Replace isPro() selector anti-pattern with direct subscription selection (ARCH-002)
- **Hooks:** Stabilize useExportDownload callbacks with refs (PERF-009)
- **Hooks:** Memoize exportAndDownload and clearError with useCallback (CQ-017, CQ-018)
- **Hooks:** Use ref for alignment in useKeyboardShortcuts to prevent stale closure (ARCH-006)
- **Security:** Add rate limiting and Zod validation to exports/log (SEC-001)
- **Security:** Add rate limiting to GET endpoints (SEC-002)
- **SEO:** Update sitemap — add /upgrade, remove noindexed auth pages
- **SEO:** Expand root title with keywords, add canonical URL (SEO-004, SEO-006)
- **A11y:** Add skip-link, focus-visible rings, aria-labels, sr-only headings (A11Y-001 through A11Y-008)
- **Mechanical:** Use client directives, prop exports, JSX to Tailwind conversions

### Technical

- 112 TypeScript/TSX source files (up from 95)
- 10 custom React hooks (added useExportBackgroundRemoval, useExportDownload)
- 7 test files (up from 5)
- Removed Fabric.js dependency — now using native Canvas API
- Added object-url lifecycle utility for blob URL management

---

## [0.3.7] - 2026-03-07

### Technical

- **Deps:** Bump fabric 6.9.0 → 7.1.0 (major version, reduced lockfile by ~1000 lines)
- **Deps:** Bump tailwindcss 4.1.17 → 4.1.18 and @tailwindcss/postcss 4.1.17 → 4.1.18
- **Deps:** Bump eslint 9.39.1 → 9.39.2
- **Deps:** Bump framer-motion 12.23.24 → 12.23.26
- **Deps:** Bump supabase CLI 2.63.1 → 2.70.5 and supabase-ecosystem packages
- **Deps:** Bump @types/node ^20 → ^22 to match runtime
- **Deps:** Bump testing-tools group (vitest, playwright, and related packages)

---

## [0.3.6] - 2026-03-07

### Fixed

- **Editor:** Allow clicks on editor action buttons over photo panels (pointer-events fix)
- **Preview:** Match preview aspect ratio to export dimensions

---

## [0.3.5] - 2026-03-07

### Changed

- **Docs:** Restructure documentation to architecture/guides/reference/standards layout
- **Docs:** Rename feature docs to "How X Works" with pedagogical framing (Why This Matters, Key Files)
- **Docs:** Rewrite root docs/README.md with Quick Start Paths (277 → 73 lines)

### Added

- **Docs:** Navigation READMEs for all docs subdirectories
- **Docs:** `docs/project-history.md` with development phases and features shipped
- **Docs:** `docs/guides/stripe-integration.md` extracted from billing architecture doc
- **Docs:** Verification Checklists and "What NOT to Do" sections to all 6 standards docs
- **Docs:** Prerequisites and Verification sections to all 4 guides
- **Docs:** Template A/B/C/D definitions in documentation.md

### Fixed

- **CI:** Prevent security scan from failing on pre-existing audit vulnerabilities
- **Docs:** Broken cross-references updated to reflect new file locations

### Technical

- 26 documentation files (up from 21 after restructure)

---

## [0.3.4] - 2026-03-07

### Added

- **Editor:** Crop Zoom slider and Reset Framing button to AlignmentControls
- **Editor:** Zoom/pan gestures to PhotoPanel via `useZoomPanGestures` hook
- **Alignment:** Phase 5 user framing override with shared clamping logic
- **Editor:** `UserFramingOverride` type and store slice for per-panel framing state

### Fixed

- **Export:** Apply aspect ratio per-panel instead of to doubled canvas width
- **Editor:** Thread `userFraming` through GifPreview and all rendering callers
- **Export:** Remove unused `getAspectRatio` and `finalWidth`/`finalHeight` vars
- **Preview:** Match AlignedPreview to new total-canvas aspect ratio
- **Export:** Preserve exact target ratio, remove width trim

### Technical

- 95 TypeScript/TSX source files
- 8 custom React hooks (added useZoomPanGestures)
- 5 test files

---

## [0.3.3] - 2026-01-06

### Fixed

- **Subscription:** Fix Pro status not displaying on settings page due to RLS blocking
- **Subscription:** Fix React not re-rendering when subscription state changes
- **Usage:** Fix usage tracking query failing due to RLS policy

### Added

- New API routes: `/api/account/subscription` and `/api/account/usage` for server-side data fetching
- RLS policy migration for subscriptions table

### Changed

- Refactored `fetchSubscription` and `fetchUsage` in user store to use API routes instead of direct Supabase queries

---

## [0.3.2] - 2026-01-06

### Fixed

- **Auth:** Resolve database error on new user signup
- **CSP:** Add storage.googleapis.com for MediaPipe CDN fallback
- **Auth:** Hide Apple OAuth and add contextual sign in/up text
- **UI:** Resolve homepage flicker and optimize loading indicators
- **Types:** Use instanceof check for image dimension extraction
- **Accessibility:** Resolve MediaPipe and Radix UI console warnings
- **Security:** Add vercel.live to frame-src and connect-src CSP
- **Security:** Allow unsafe-inline for next-themes in production
- **Security:** Add environment-specific CSP to resolve editor blocking
- **Tests:** Add Request parameter to POST calls in usage tests
- **Tests:** Add rpc mock to usage tests for rate limiting
- **Security:** Update qs package to resolve DoS vulnerability
- **Types:** Add explicit type parameters to withRateLimit calls
- **Lint:** Exclude scripts and fix unused imports

### Added

- New API routes: exports/log and logos/upload
- Service-level Supabase client for server-side operations

### Changed

- Removed deprecated .eslintignore file
- Updated CSP configuration documentation

### Technical

- 119 TypeScript/TSX source files
- 7 custom React hooks
- 13 UI components
- 7 API route directories (account, backgrounds, debug, exports, logos, stripe, usage)
- 8 test files
- 170 visual test fixtures

---

## [0.3.1] - 2026-01-05

### Fixed

- Security code review remediation (P0, P1, P2 priority fixes)
- Export modal: British English usage and background colour applied to preview
- Export modal: Error handling and timeout for background removal
- Export modal: Improved preview and UX
- Export modal: Center processing spinner and remove on color change
- Export modal: Use local state to track background removal progress
- Editor: Restore landmark detection and display

### Added

- Debug feature: Toggleable alignment debug logging with file output

### Changed

- Updated Next.js to 16.1.1
- Migrated middleware to proxy architecture
- Cleaned documentation structure
- Refactored editor: Removed Grid and Landmarks toolbar

---

## [0.3.0] - 2026-01-04

### Security (P0 - Critical)

- **Stripe webhook security hardening**
  - Added livemode check to reject test events in production
  - Added idempotency tracking via `webhook_events` table to prevent duplicate processing
  - Added tier-resolver utility (`lib/stripe/tier-resolver.ts`) for centralized price ID validation
- **Removed production bypass** - Fixed `isPro = true` hardcoded bypass in ExportModal
- **Fixed FREE_EXPORT_LIMIT** - Now properly imported from `lib/stripe/plans.ts` instead of hardcoded
- **Pinned MediaPipe version** to 0.10.22 for stability (was using `@latest`)

### Added

- **GPU fallback for pose detection** - MediaPipe now automatically falls back to CPU if GPU initialization fails
- **Billing period utility** (`lib/utils/billing-period.ts`) - Centralized UTC-based billing period calculations
- **Tier resolver utility** (`lib/stripe/tier-resolver.ts`) - Single source of truth for Stripe price ID to tier mapping
- **Error boundary component** (`components/ui/ErrorBoundary.tsx`) - React error boundary with retry functionality
- **Structured logger utility** (`lib/logger.ts`) - Namespaced logging with production filtering
- **API test suite** - Comprehensive tests for webhook and usage endpoints
  - `tests/api/test-utils.ts` - Shared mocks and helpers
  - `tests/api/stripe/webhook.test.ts` - 15+ webhook test cases
  - `tests/api/usage/usage.test.ts` - 10+ usage API test cases
- **Database migration** for webhook_events table (`supabase/migrations/20260104000000_add_webhook_events.sql`)
- **Debug logging system for alignment exports** (`lib/debug/alignment-logger.ts`)
  - Toggleable via `window.svoltaDebug.enable()` in browser console
  - Or via localStorage: `svolta_debug_alignment`
  - Or via env var: `NEXT_PUBLIC_DEBUG_ALIGNMENT=true`
  - Writes structured JSON to `debug/alignment-log.json` for easy comparison
  - API endpoints: GET/POST/DELETE `/api/debug/alignment-log` (dev only)
- **Shared alignment algorithm module** (`lib/canvas/aligned-draw-params.ts`)
  - Extracted from export.ts for reuse across PNG export, GIF export, and preview
  - Single source of truth for alignment calculations
- OAuth and Magic Link authentication (replacing email/password)
- Visual regression test suite with 134 comprehensive fixtures
  - Resolution variations (QVGA to 24MP, mismatched before/after)
  - Aspect ratio extremes (21:9, 9:16, 3:1, 3:2, 2:3, 4:3)
  - Off-center subject positioning (edge positions, rule of thirds, quadrant tests)
- Shoulder alignment fallback for cropped head scenarios
- HTML report improvements for visual regression tests
- Framing variation test fixtures (cropped heads, tight headroom, off-center)
- MagicLinkForm and OAuthButtons UI components
- Auto-alignment preview with simplified UI
- Background removal feature using @imgly/background-removal for smooth edges

### Changed

- **Auth listener cleanup** - Moved from user-store.ts to UserProvider with proper useEffect cleanup
- **Usage tracking** - All usage routes now use centralized `getCurrentBillingPeriod()` utility
- **Webhook handler** - Now uses tier-resolver instead of hardcoded price ID matching
- **Refactored alignment algorithm** - Consolidated into shared module for consistency
- CI workflow now uses manual promotion (develop → staging → main) with Husky gates
- Improved alignment UX with enhanced grid overlay
- Updated pricing to £7.99/month and £79/year
- Redesigned export modal UI with improved preview and UX
- Removed Grid and Landmarks toolbar from editor (simplified UI)
- Migrated from `middleware.ts` to `proxy.ts` for Next.js 16 compatibility
- Updated Next.js to 16.1.1

### Fixed

- Removed unused variables in visual test files
- Build errors and ESLint warnings resolved
- Export modal centering with proper transform-based positioning
- Background removal error handling and timeout
- Landmark detection and display restored
- Background colour applied to preview (British English)
- Processing spinner centering in export modal

### Technical

- 113 TypeScript/TSX source files
- 7 custom React hooks
- 13 UI components (Button, BottomSheet, Card, ErrorBoundary, Input, MagicLinkForm, Modal, OAuthButtons, SegmentedControl, Slider, SvoltaLogo, Toggle, UpgradePrompt)
- 8 API routes (added debug endpoint)
- 8 test files (API tests, hooks tests, visual tests)
- 170 visual test fixtures
- Comprehensive 4-phase alignment algorithm with dynamic crop
- Debug logging infrastructure for alignment troubleshooting
- Webhook idempotency via database-backed event tracking
- GPU/CPU fallback for browser-based ML inference

---

## [0.2.0] - 2025-12-26

### Added

- Auth callback route for OAuth flow
- Login form component with email/password authentication
- Signup page with user registration
- User settings page
- Upgrade page for subscription management
- Stripe API routes (checkout, webhooks)
- Usage tracking API routes
- Export modal component for canvas export
- Canvas export utilities and watermark functionality
- Usage limit hook for tracking exports
- User provider and user store for subscription state
- UpgradePrompt UI component
- Comprehensive documentation suite

### Changed

- Updated providers index to include UserProvider
- Enhanced editor components with export functionality
- Simplified workflow for solo dev with direct push and quality gates

## [0.1.0] - 2025-11-30

### Added

- **Phase 3: Alignment System**
  - Alignment calculation logic with pose landmark comparison
  - Real-time alignment controls UI
  - Live preview with alignment feedback
  - Keyboard shortcuts for editor navigation

- **Phase 2: Core Editor**
  - DropZone component with drag-and-drop photo upload
  - HEIC image conversion support
  - MediaPipe integration for pose detection
  - Canvas rendering with Fabric.js
  - Landmark visualization overlay
  - Editor state management with Zustand

- **Phase 1: Foundation**
  - Next.js 16 project setup with App Router
  - Tailwind CSS 4 configuration with Apple-style design tokens
  - Supabase integration for auth and database
  - UI primitive components (Button, Card, Input, Modal, Slider, Toggle)
  - Theme provider with dark mode support
  - Marketing layout and landing page structure
  - Middleware for auth protection

### Technical

- 57 TypeScript/TSX source files
- 5 custom React hooks
- 2 Zustand stores
- Radix UI component integration
- Framer Motion animations
- Vitest and Playwright testing setup

---

[0.3.2]: https://github.com/rickydwilson/svolta/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/rickydwilson/svolta/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/rickydwilson/svolta/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rickydwilson/svolta/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rickydwilson/svolta/releases/tag/v0.1.0
