# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- OAuth and Magic Link authentication (replacing email/password)
- Visual regression test suite with 66 comprehensive fixtures
  - Resolution variations (QVGA to 24MP, mismatched before/after)
  - Aspect ratio extremes (21:9, 9:16, 3:1, 3:2, 2:3, 4:3)
  - Off-center subject positioning (edge positions, rule of thirds, quadrant tests)
- Shoulder alignment fallback for cropped head scenarios
- HTML report improvements for visual regression tests
- Framing variation test fixtures (cropped heads, tight headroom, off-center)
- MagicLinkForm and OAuthButtons UI components

### Changed

- CI workflow now uses manual promotion (develop → staging → main) with Husky gates
- Improved alignment UX with enhanced grid overlay
- Updated pricing to £7.99/month and £79/year
- Increased visual test timeout for 66 fixtures

### Fixed

- Removed unused variables in visual test files
- Build errors and ESLint warnings resolved

### Technical

- 63 TypeScript/TSX source files
- 5 custom React hooks
- 11 UI components (up from 9)
- 7 API routes (up from 6)
- 66 visual test fixtures across 9 categories
- Comprehensive 4-phase alignment algorithm with dynamic crop

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
