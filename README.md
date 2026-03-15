# Svolta

**The Turning Point** - A fitness photo alignment SaaS that helps coaches create professional before/after comparisons using AI pose detection.

## Overview

Svolta enables fitness professionals and coaches to create perfectly aligned before/after comparison photos. Using AI-powered pose detection, the app automatically identifies body landmarks and provides real-time alignment guidance.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS 4 with Apple-style design tokens
- **UI Components:** Radix UI primitives
- **Animation:** Framer Motion
- **State Management:** Zustand
- **Canvas Rendering:** Native Canvas API
- **Pose Detection:** MediaPipe Tasks Vision
- **Auth & Database:** Supabase
- **Payments:** Stripe (integrated)
- **Testing:** Vitest, Playwright

## Project Structure

```
app/
├── (app)/          # Authenticated app routes
│   ├── editor/     # Main photo editor
│   ├── settings/   # User settings
│   └── upgrade/    # Subscription upgrade
├── (auth)/         # Authentication routes
│   ├── login/      # Login page
│   ├── signup/     # Signup page
│   └── callback/   # OAuth callback
├── (marketing)/    # Public marketing pages
└── api/            # API routes
    ├── account/    # Account management
    ├── backgrounds/# Background upload (Pro)
    ├── debug/      # Debug utilities
    ├── exports/    # Export tracking
    ├── logos/      # Logo assets
    ├── stripe/     # Stripe webhooks & checkout
    └── usage/      # Usage tracking

components/
├── features/       # Feature-specific components
│   └── editor/     # Editor components (Canvas, Controls, etc.)
├── providers/      # React context providers
└── ui/             # Reusable UI primitives

hooks/              # Custom React hooks
├── useAlignment.ts                # Alignment calculations
├── useBackgroundRemoval.ts        # Background removal with @imgly
├── useCanvasExport.ts             # Canvas export functionality
├── useExportBackgroundRemoval.ts  # Export-specific background removal
├── useExportDownload.ts           # Download orchestration
├── useGifExport.ts                # Animated GIF export
├── useKeyboardShortcuts.ts
├── usePoseDetection.ts            # MediaPipe integration
├── useUsageLimit.ts               # Usage limit tracking
└── useZoomPanGestures.ts          # Zoom/pan gesture handling

lib/
├── canvas/         # Canvas utilities & watermark
├── mediapipe/      # Pose detection setup
├── stripe/         # Stripe configuration
├── supabase/       # Supabase clients
└── utils/          # General utilities

stores/             # Zustand state stores
├── editor-store.ts # Editor state
└── user-store.ts   # User & subscription state
```

## Current Status

| Phase | Focus                                                   | Status         |
| ----- | ------------------------------------------------------- | -------------- |
| 1     | Foundation (Next.js, Tailwind, Supabase, UI primitives) | ✅ Complete    |
| 2     | Core Editor (DropZone, MediaPipe, Canvas, Landmarks)    | ✅ Complete    |
| 3     | Alignment System (Calculations, Controls, Preview)      | ✅ Complete    |
| 4     | Auth & Payments (Login/Signup, User store, Stripe)      | ✅ Complete    |
| 5     | Usage & Export (Tracking, Export modal, Watermark)      | ✅ Complete    |
| 6     | Landing & Polish (Hero, Features, Animations, PWA)      | 🔄 In Progress |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/svolta.git
cd svolta

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local

# Update .env.local with your credentials
```

### Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Key Features

- **AI Pose Detection** - Automatic body landmark detection using MediaPipe
- **Real-time Alignment** - Live alignment guides and feedback
- **Background Removal** - AI-powered background removal with smooth edges
- **Animated GIF Export** - Create before/after animations with 3 styles
- **Client-side Processing** - Photos never leave your device
- **Professional Export** - High-quality image exports with optional watermark
- **Usage Tracking** - Free tier with 5 exports/month, Pro unlimited

## Privacy

Svolta prioritizes user privacy:

- All photo processing happens client-side
- Images are never uploaded to servers
- No photos are stored in our database

## License

MIT

## Current Scope

| Metric               | Count              |
| -------------------- | ------------------ |
| Source Files         | 121 TypeScript/TSX |
| Custom Hooks         | 10                 |
| State Stores         | 2                  |
| UI Components        | 13                 |
| API Routes           | 7                  |
| Test Files           | 7                  |
| Visual Test Fixtures | 170                |

---

**Domain:** www.svolta.app
**Last Updated:** 2026-03-15
