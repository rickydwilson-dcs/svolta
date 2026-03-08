# Svolta Documentation

> AI-powered before/after fitness photo alignment. Privacy-first, client-side processing.

## Quick Start Paths

### New to the codebase?

1. [Architecture Overview](./architecture/architecture.md) — system design and principles
2. [Local Development Setup](./guides/local-development-setup.md) — get running locally
3. [How Alignment Works](./architecture/how-alignment-works.md) — the core algorithm

### Building a feature?

1. [Code Style](./standards/code-style.md) — patterns and conventions
2. [How State Management Works](./architecture/how-state-management-works.md) — Zustand stores and hooks
3. [Components](./reference/components.md) — UI component props

### Debugging an issue?

1. [Troubleshooting](./guides/troubleshooting.md) — common issues and solutions
2. [How Pose Detection Works](./architecture/how-pose-detection-works.md) — if ML-related
3. [How Alignment Works](./architecture/how-alignment-works.md) — if export-related

### Reviewing architecture?

1. [Architecture Overview](./architecture/architecture.md) — high-level design
2. [Database Schema](./architecture/database.md) — Supabase schema and RLS
3. [Project History](./project-history.md) — phases and decisions

## Documentation Map

| Section                         | Contents                           |
| ------------------------------- | ---------------------------------- |
| [Architecture](./architecture/) | How systems work, design decisions |
| [Guides](./guides/)             | Step-by-step procedures            |
| [Reference](./reference/)       | API and component specs            |
| [Standards](./standards/)       | Rules and verification checklists  |

## Tech Stack

| Technology     | Purpose                         |
| -------------- | ------------------------------- |
| Next.js 16     | React framework (App Router)    |
| Tailwind CSS 4 | Utility-first styling           |
| Supabase       | Auth, PostgreSQL, RPC functions |
| MediaPipe      | Client-side pose detection      |
| Canvas API     | Native canvas rendering         |
| Stripe         | Payments and subscriptions      |
| Zustand        | State management                |

## Quick Commands

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
