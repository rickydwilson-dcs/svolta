# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- 97 TypeScript/TSX source files
- 7 custom React hooks
- 13 UI components (Button, BottomSheet, Card, ErrorBoundary, Input, MagicLinkForm, Modal, OAuthButtons, SegmentedControl, Slider, SvoltaLogo, Toggle, UpgradePrompt)
- 8 API routes (added debug endpoint)
- 9 test files (added API tests)
- 134 visual test fixtures
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

[Unreleased]: https://github.com/yourusername/svolta/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/svolta/releases/tag/v0.1.0
