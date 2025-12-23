# PoseProof Documentation Hub

**Version:** 1.0.0
**Last Updated:** 2025-12-22
**Project:** PoseProof - Fitness Photo Alignment SaaS

## Overview

PoseProof is a fitness photo alignment SaaS that helps coaches create professional before/after comparisons using AI pose detection. Photos are processed entirely client-side, ensuring user privacy while delivering powerful alignment tools.

**Tagline:** "Proof of Progress"
**Domain:** [poseproof.com](https://poseproof.com)

## Quick Navigation

### Architecture Documentation

- **[System Overview](./architecture/overview.md)** - High-level architecture, component hierarchy, and data flow
- **[Database Schema](./architecture/database.md)** - Supabase schema, tables, RPC functions, and policies

### Development Guides

- **[Tech Stack](#tech-stack)** - Framework, libraries, and tools
- **[Getting Started](#getting-started)** - Setup and development workflow
- **[Project Structure](#project-structure)** - Directory organization

### Standards & Workflow

- **[Git Workflow](./workflow/git.md)** - Branching strategy (develop → staging → main)
- **[Deployment](./workflow/deployment.md)** - Vercel deployment process

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

| Tool           | Purpose                      |
| -------------- | ---------------------------- |
| **Vitest**     | Unit and integration testing |
| **Playwright** | End-to-end testing           |

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for database and auth)
- Stripe account (for payments)
- Vercel account (for deployment)

### Local Development

```bash
# Clone repository
git clone https://github.com/yourusername/poseproof.git
cd poseproof

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
poseproof/
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
└── tests/                   # Test files
    ├── unit/               # Unit tests
    └── e2e/                # End-to-end tests
```

## Key Features

### Core Editor Features

1. **Drag-and-Drop Upload** - Upload before/after photos with HEIC conversion
2. **AI Pose Detection** - MediaPipe pose landmarks detected client-side
3. **Smart Alignment** - Anchor-based alignment (shoulders, hips, face)
4. **Real-Time Preview** - Side-by-side comparison with linked zoom
5. **Professional Export** - High-quality PNG export with optional watermark

### Subscription Tiers

| Tier     | Monthly Exports | Watermark           | Price       |
| -------- | --------------- | ------------------- | ----------- |
| **Free** | 5 exports       | PoseProof watermark | £0          |
| **Pro**  | Unlimited       | No watermark        | £7.99/month |

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
| 4 - Auth & Payments  | 🔄 In Progress | Login/Signup, User store, Stripe integration |
| 5 - Usage & Export   | 🔄 In Progress | Usage tracking, Export modal, Watermark      |
| 6 - Landing & Polish | ⏳ Pending     | Hero, Features, Pricing, PWA, Deploy         |

## Documentation Roadmap

### Planned Documentation

- [ ] API Reference (`api-reference.md`)
- [ ] Component Library Guide (`components.md`)
- [ ] Testing Guide (`testing.md`)
- [ ] Deployment Guide (detailed)
- [ ] Contributing Guidelines (`CONTRIBUTING.md`)
- [ ] Security Policy (`SECURITY.md`)

## Support & Resources

### Internal Resources

- **Linear Project:** [PoseProof Board](https://linear.app/rickydwilson/project/poseproof-832cc9c427e2)
- **Claude Skills:** `~/.claude-skills/` (agents and skill packages)
- **Design Tokens:** See `DESIGN_TOKENS.md` in project root

### External Documentation

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS 4 Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [MediaPipe Pose Detection](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
- [Fabric.js Docs](http://fabricjs.com/docs/)
- [Stripe Docs](https://stripe.com/docs)

## Quick Links

- **Repository:** [GitHub](https://github.com/yourusername/poseproof)
- **Live Site:** [poseproof.com](https://poseproof.com)
- **Staging:** [poseproof-staging.vercel.app](https://poseproof-staging.vercel.app)
- **Design System:** See `DESIGN_TOKENS.md`

---

**Note:** This documentation is living and continuously updated as the project evolves. Last major update: 2025-12-22.
