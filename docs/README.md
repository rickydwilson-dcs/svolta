# Svolta Documentation Hub

**Version:** 1.0.0
**Last Updated:** 2025-12-29
**Project:** Svolta - Fitness Photo Alignment SaaS

## Overview

Svolta is a fitness photo alignment SaaS that helps coaches create professional before/after comparisons using AI pose detection. Photos are processed entirely client-side, ensuring user privacy while delivering powerful alignment tools.

**Tagline:** "The Turning Point"
**Domain:** [www.svolta.app](https://www.svolta.app)

## Quick Navigation

### Architecture

- **[System Overview](./architecture/overview.md)** - High-level architecture, component hierarchy, and data flow
- **[Database Schema](./architecture/database.md)** - Supabase schema, tables, RPC functions, and policies

### Features

- **[Alignment & Export Algorithm](./features/alignment-export.md)** - Core business logic: 4-phase alignment algorithm
- **[Pose Detection](./features/pose-detection.md)** - MediaPipe integration and landmark system
- **[Billing](./features/billing.md)** - Stripe integration and usage tracking

### Development

- **[Setup Guide](./development/setup.md)** - Local development setup
- **[State & Hooks](./development/state-hooks.md)** - Zustand stores and custom hooks
- **[Troubleshooting](./development/troubleshooting.md)** - Common issues and solutions

### Reference

- **[API Reference](./api/reference.md)** - All 6 API endpoints documented
- **[Components](./components/reference.md)** - UI and feature components

### Standards

- **[Git Workflow & Deployment](./standards/git-workflow.md)** - Branching, auto-promotion, CI/CD, Vercel
- **[Code Style](./standards/code-style.md)** - TypeScript, React, and Tailwind patterns
- **[Design Tokens](./standards/design-tokens.md)** - CSS variables, colors, typography, spacing
- **[Testing Standards](./standards/testing.md)** - Unit, visual regression, and E2E testing

## Tech Stack Summary

### Frontend

| Technology        | Purpose                                              | Version |
| ----------------- | ---------------------------------------------------- | ------- |
| **Next.js**       | React framework (App Router)                         | 16      |
| **Tailwind CSS**  | Utility-first styling with Apple-style design tokens | 4       |
| **Radix UI**      | Accessible UI primitives                             | Latest  |
| **Framer Motion** | Animation library                                    | Latest  |
| **Fabric.js**     | Canvas manipulation for photo alignment              | Latest  |
| **MediaPipe**     | Client-side pose detection (Google)                  | Latest  |

### State Management

| Library           | Purpose                                     |
| ----------------- | ------------------------------------------- |
| **Zustand**       | Global state management                     |
| `editor-store.ts` | Editor state (photos, landmarks, alignment) |
| `user-store.ts`   | User authentication and subscription state  |

### Backend & Infrastructure

| Technology   | Purpose                                        |
| ------------ | ---------------------------------------------- |
| **Supabase** | Auth, PostgreSQL database, RPC functions       |
| **Stripe**   | Payment processing and subscription management |
| **Vercel**   | Hosting and serverless functions               |

### Testing

| Tool           | Purpose                                        |
| -------------- | ---------------------------------------------- |
| **Vitest**     | Unit, integration, and visual regression tests |
| **Pixelmatch** | Pixel-level image comparison                   |
| **Playwright** | End-to-end testing                             |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and auth)
- Stripe account (for payments)
- Vercel account (for deployment)

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/svolta.git
cd svolta

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure environment variables
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - STRIPE_SECRET_KEY
# - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Run development server
npm run dev

# Open http://localhost:3000
```

### Key Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Testing
npm run test             # Run Vitest unit tests
npm run test:visual      # Run visual regression tests
npm run test:visual:unit # Run alignment unit tests only
npm run test:e2e         # Run Playwright E2E tests
npm run test:watch       # Watch mode for tests

# Linting & Formatting
npm run lint             # ESLint check
npm run lint:fix         # Auto-fix lint issues

# Database
npm run db:types         # Generate TypeScript types from Supabase schema
```

## Project Structure

```
svolta/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes (login, signup)
│   ├── (protected)/         # Protected routes (editor, settings)
│   ├── api/                 # API routes (Stripe webhooks, usage tracking)
│   └── layout.tsx           # Root layout
│
├── components/
│   ├── features/            # Feature-specific components
│   │   └── editor/         # Editor components (DropZone, Canvas, Controls)
│   ├── providers/           # React context providers
│   └── ui/                  # Reusable UI primitives (Button, Card, Modal)
│
├── hooks/                   # Custom React hooks
│   ├── useAlignment.ts      # Alignment calculation logic
│   ├── useCanvasExport.ts   # Canvas export with watermark
│   ├── useKeyboardShortcuts.ts
│   ├── usePoseDetection.ts  # MediaPipe pose detection
│   └── useUsageLimit.ts     # Export limit enforcement
│
├── lib/                     # Utility libraries
│   ├── canvas/             # Fabric.js utilities (alignment, export, watermark)
│   ├── mediapipe/          # MediaPipe pose detection
│   ├── stripe/             # Stripe integration
│   ├── supabase/           # Supabase client/server setup
│   └── utils/              # Helper functions
│
├── stores/                  # Zustand state management
│   ├── editor-store.ts      # Editor state (photos, alignment, settings)
│   └── user-store.ts        # User auth and subscription state
│
├── types/                   # TypeScript types
│   ├── database.ts          # Supabase database types
│   ├── editor.ts            # Editor-specific types
│   └── landmarks.ts         # MediaPipe landmark types
│
├── docs/                    # Documentation (you are here)
│   ├── architecture/        # Architecture documentation
│   └── workflow/            # Development workflow guides
│
├── tests/                   # Test files
│   ├── visual/             # Visual regression tests
│   │   ├── alignment.unit.test.ts   # Algorithm unit tests
│   │   ├── alignment.visual.test.ts # Pixel comparison tests
│   │   ├── baselines/      # Golden reference images
│   │   ├── fixtures/       # Test input images
│   │   └── lib/            # Test utilities
│   └── setup.ts            # Vitest setup
│
└── e2e/                     # End-to-end tests
```

## Key Features

### Core Editor Features

1. **Drag-and-Drop Upload** - Upload before/after photos with HEIC conversion
2. **AI Pose Detection** - MediaPipe pose landmarks detected client-side
3. **Smart Alignment** - Anchor-based alignment (shoulders, hips, face)
4. **Real-Time Preview** - Side-by-side comparison with linked zoom
5. **Professional Export** - High-quality PNG export with optional watermark

### Subscription Tiers

| Tier     | Monthly Exports | Watermark        | Price       |
| -------- | --------------- | ---------------- | ----------- |
| **Free** | 5 exports       | Svolta watermark | £0          |
| **Pro**  | Unlimited       | No watermark     | £7.99/month |

### Privacy-First Design

- Photos never uploaded to servers
- All processing happens in browser
- MediaPipe runs client-side
- Export generated client-side

## Development Phases

| Phase                | Status         | Focus                                        |
| -------------------- | -------------- | -------------------------------------------- |
| 1 - Foundation       | ✅ Complete    | Next.js, Tailwind, Supabase, UI primitives   |
| 2 - Core Editor      | ✅ Complete    | DropZone, MediaPipe, Canvas, Landmarks       |
| 3 - Alignment        | ✅ Complete    | Calculation logic, Controls UI, Preview      |
| 4 - Auth & Payments  | ✅ Complete    | Login/Signup, User store, Stripe integration |
| 5 - Usage & Export   | ✅ Complete    | Usage tracking, Export modal, Watermark      |
| 6 - Landing & Polish | 🔄 In Progress | Hero, Features, Pricing, PWA, Deploy         |

## Documentation Roadmap

### Completed Documentation

- [x] API Reference (`api/reference.md`)
- [x] Component Library Guide (`components/reference.md`)
- [x] Alignment Algorithm (`features/alignment-export.md`)
- [x] Pose Detection (`features/pose-detection.md`)
- [x] Billing & Usage (`features/billing.md`)
- [x] Development Setup (`development/setup.md`)
- [x] State Management (`development/state-hooks.md`)
- [x] Code Style Standards (`standards/code-style.md`)

### Planned Documentation

- [ ] Contributing Guidelines (`CONTRIBUTING.md`)
- [ ] Security Policy (`SECURITY.md`)

## Support & Resources

### Internal Resources

- **Linear Project:** [Svolta Board](https://linear.app/rickydwilson/project/svolta-832cc9c427e2)
- **Claude Skills:** `~/.claude-skills/` (agents and skill packages)
- **Design Tokens:** See [standards/design-tokens.md](./standards/design-tokens.md)

### External Documentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS 4 Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [MediaPipe Pose Detection](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [Fabric.js Docs](http://fabricjs.com/docs/)
- [Stripe Docs](https://stripe.com/docs)

## Quick Links

- **Repository:** [GitHub](https://github.com/yourusername/svolta)
- **Live Site:** [www.svolta.app](https://www.svolta.app)
- **Staging:** [staging.svolta.app](https://staging.svolta.app)
- **Design System:** See [Design Tokens](./standards/design-tokens.md)

---

**Note:** This documentation is living and continuously updated as the project evolves. Last major update: 2025-12-29.
