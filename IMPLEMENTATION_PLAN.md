# PoseProof Implementation Plan

## Overview

Build PoseProof - a fitness photo alignment SaaS with Apple.com-inspired design. Fresh project, following the 6-phase roadmap from the brief.

**Key Requirements:**
- Apple-style visual execution (generous whitespace, large typography, subtle animations)
- Stripe stubbed initially (full implementation later)
- Supabase for auth/database (account exists, project needs setup)
- Deploy to Vercel via GitHub
- Email/password auth only (Google OAuth later)
- Radix UI primitives for accessible components

**Testing Stack:**
- **Vitest** - Unit and integration tests
- **Playwright** - E2E testing

**Git Workflow:**
- `develop` → `staging` → `main` (always!)
- Use `/commit.changes` command for commits
- Use `/create.pr` for pull requests

**Project Management:**
- Linear project: https://linear.app/rickydwilson/project/poseproof-832cc9c427e2/overview

**Available Claude Skills:**
- `cs-frontend-engineer` / `cs-fullstack-engineer` - Implementation
- `cs-code-reviewer` - Code review (run sequentially)
- `cs-qa-engineer` - Test automation (run sequentially)
- `/review.code`, `/generate.tests`, `/audit.security` commands

---

## Phase 1: Foundation (First Priority)

### 1.1 Project Initialization

```bash
npx create-next-app@latest poseproof --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**Dependencies to install:**
```bash
# Core
npm install zustand @supabase/supabase-js @supabase/ssr

# Canvas & Pose Detection
npm install fabric @mediapipe/tasks-vision heic2any

# UI & Animation
npm install framer-motion clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip @radix-ui/react-toggle-group

# Theming
npm install next-themes

# Testing
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test

# PWA (defer until Phase 6)
# npm install next-pwa

# Stripe (stubbed - install when needed)
# npm install stripe @stripe/stripe-js

# Dev
npm install -D supabase
```

### 1.2 Project Structure

```
poseproof/
├── app/
│   ├── (marketing)/              # Public pages
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Landing page
│   │   └── pricing/page.tsx
│   ├── (auth)/                   # Auth flows
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts
│   ├── (app)/                    # Protected app
│   │   ├── layout.tsx
│   │   ├── editor/
│   │   │   ├── page.tsx
│   │   │   └── _components/
│   │   ├── settings/page.tsx
│   │   └── upgrade/page.tsx
│   ├── api/
│   │   ├── stripe/               # Stubbed initially
│   │   └── usage/
│   ├── layout.tsx
│   ├── globals.css
│   └── error.tsx
├── components/
│   ├── ui/                       # Primitive components
│   ├── features/                 # Feature components
│   │   ├── editor/
│   │   └── subscription/
│   ├── layout/
│   └── providers/
├── lib/
│   ├── mediapipe/
│   ├── canvas/
│   ├── supabase/
│   ├── stripe/                   # Stubbed
│   └── utils/
├── stores/
├── hooks/
├── types/
├── config/
└── supabase/
    └── migrations/
```

### 1.3 Tailwind Configuration (Apple-Style)

**tailwind.config.ts** - Key customizations:

```typescript
// Typography - Large display fonts with tight tracking
fontSize: {
  'display-2xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
  'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.015em', fontWeight: '600' }],
  // ... body and UI sizes
}

// Spacing - Generous section padding
spacing: {
  'section': '7.5rem',      // 120px
  'section-lg': '10rem',    // 160px
  'section-xl': '12.5rem',  // 200px
}

// Animations - Apple-style easing
transitionTimingFunction: {
  'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  'apple-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
}

// Shadows - Layered, subtle
boxShadow: {
  'md': '0 4px 12px -4px rgb(0 0 0 / 0.1), 0 8px 24px -8px rgb(0 0 0 / 0.08)',
  'lg': '0 8px 24px -8px rgb(0 0 0 / 0.12), 0 16px 48px -12px rgb(0 0 0 / 0.1)',
}

// Border radius - Generous, consistent
borderRadius: {
  'xl': '1rem',
  '2xl': '1.25rem',
  '3xl': '1.5rem',
}
```

**globals.css** - CSS custom properties for theming:

```css
:root {
  --surface-primary: #ffffff;
  --surface-secondary: #f8fafc;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-default: #e2e8f0;
}

.dark {
  --surface-primary: #0f172a;
  --surface-secondary: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-default: #334155;
}
```

### 1.4 Supabase Setup

**User Action Required:** Create Supabase project at supabase.com

**Database Migrations:**

```sql
-- 001_profiles.sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

```sql
-- 002_subscriptions.sql
create type subscription_status as enum (
  'trialing', 'active', 'canceled', 'incomplete',
  'incomplete_expired', 'past_due', 'unpaid', 'paused'
);
create type plan_type as enum ('free', 'pro', 'team');

create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan plan_type default 'free',
  status subscription_status default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Auto-create free subscription on signup
create or replace function public.handle_new_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute procedure public.handle_new_subscription();
```

```sql
-- 003_usage.sql
create table public.usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  period_start date not null,
  exports_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_start)
);

alter table public.usage enable row level security;

create policy "Users can view own usage" on public.usage
  for select using (auth.uid() = user_id);

create or replace function increment_export_count(p_user_id uuid)
returns integer as $$
declare
  v_period_start date := date_trunc('month', current_date)::date;
  v_count integer;
begin
  insert into public.usage (user_id, period_start, exports_count)
  values (p_user_id, v_period_start, 1)
  on conflict (user_id, period_start)
  do update set
    exports_count = usage.exports_count + 1,
    updated_at = now()
  returning exports_count into v_count;
  return v_count;
end;
$$ language plpgsql security definer;
```

### 1.5 Environment Variables

**.env.local:**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe (stubbed - add later)
# STRIPE_SECRET_KEY=
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# STRIPE_WEBHOOK_SECRET=
```

---

## Phase 2: Core Editor

### 2.1 Photo Upload with Drag-and-Drop

**Component: `DropZone.tsx`**
- Accept JPEG, PNG, HEIC
- Max 20MB per image
- HEIC conversion via heic2any
- Image scaling to max 2048px dimension
- Apple-style design: dashed border, centered icon, subtle hover state

### 2.2 MediaPipe Pose Detection

**Singleton Pattern in `lib/mediapipe/pose-detector.ts`:**
- Dynamic import for code splitting
- GPU delegate for performance
- Single shared instance across components
- Graceful error handling

**Hook: `usePoseDetection`**
- Returns: `{ isReady, isDetecting, error, detect }`
- Initializes on mount
- Provides detection function

### 2.3 Landmark Overlay

**Component: `LandmarkOverlay.tsx`**
- SVG overlay positioned absolutely over photo
- Key landmarks: nose, shoulders, hips, knees, ankles
- Connecting lines between related points
- Toggle visibility
- Color-coded confidence (green = high, yellow = medium)

### 2.4 Side-by-Side Canvas View

**Component: `Canvas.tsx`**
- Fabric.js canvas wrapper
- Two photo panels (before/after)
- Manual render control for performance
- Responsive: side-by-side on desktop, stacked on mobile

### 2.5 Editor State Management

**Store: `stores/editor-store.ts`**
```typescript
interface EditorState {
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  alignment: AlignmentSettings;
  showLandmarks: boolean;
  showGrid: boolean;
  linkedZoom: boolean;
  isDetecting: boolean;
}
```

---

## Phase 3: Alignment Logic

### 3.1 Alignment Calculation

**`lib/canvas/alignment.ts`:**
- Anchor point options: head, shoulders, hips, full body
- Calculate scale factor from landmark distances
- Calculate offset to align anchor points
- Return: `{ scale, offsetX, offsetY }`

### 3.2 Alignment Controls UI

**Component: `AlignmentControls.tsx`**
- Segmented control for anchor selection (Apple-style)
- Scale slider with numeric display
- Offset controls (X/Y)
- Reset button
- Auto-align button

### 3.3 Real-Time Preview

- Debounced updates (100ms)
- Apply transforms to Fabric.js objects
- Smooth transitions

---

## Phase 4: Auth & Payments

### 4.1 Supabase Auth Implementation

**`lib/supabase/server.ts`** - Server client with cookie handling
**`lib/supabase/client.ts`** - Browser client singleton
**`middleware.ts`** - Auth middleware for protected routes

**Auth Pages:**
- `/login` - Email only (Google OAuth later)
- `/signup` - Email only (Google OAuth later)
- `/callback` - OAuth callback route handler

### 4.2 Stripe (Stubbed)

**`lib/stripe/plans.ts`:**
```typescript
export const PLANS = {
  free: { name: 'Free', exports_per_month: 5, price: 0 },
  pro_monthly: { name: 'Pro', exports_per_month: Infinity, price: 9.99 },
  pro_yearly: { name: 'Pro Annual', exports_per_month: Infinity, price: 79 },
};
```

**Stubbed API routes:**
- `/api/stripe/checkout` - Returns mock checkout URL
- `/api/stripe/webhook` - Placeholder
- `/api/stripe/portal` - Placeholder

### 4.3 Upgrade Page

**`/upgrade/page.tsx`:**
- Three pricing cards (Free/Pro/Team)
- Pro highlighted with ring
- Annual/Monthly toggle
- Feature comparison list
- CTA buttons (stubbed to show "Coming soon" toast)

---

## Phase 5: Usage & Export

### 5.1 Usage Tracking

**API Routes:**
- `GET /api/usage` - Get current month's count
- `POST /api/usage/increment` - Increment export count

**Hook: `useUsageLimit`:**
```typescript
interface UsageLimit {
  used: number;
  limit: number;  // 5 for free, Infinity for pro
  canExport: boolean;
  isPro: boolean;
  checkAndIncrement: () => Promise<boolean>;
}
```

### 5.2 Export Modal

**Component: `ExportModal.tsx`**
- Format selection: 1:1, 4:5 (Pro), 9:16 (Pro)
- Preview with watermark for free users
- "Before/After" label toggle
- Download button
- Upgrade prompt for locked features
- Usage indicator: "3 of 5 exports remaining"

### 5.3 Watermark Implementation

**`lib/canvas/watermark.ts`:**
- Free users: "PoseProof" text watermark (bottom-right)
- Pro users: Optional custom logo
- Semi-transparent, doesn't obstruct content

### 5.4 Upgrade Prompts

**Component: `UpgradePrompt.tsx`**
- Modal triggered when:
  - Export limit reached
  - Trying to remove watermark
  - Trying locked format
- Clear value proposition
- One-click upgrade (when Stripe ready)

---

## Phase 6: Landing & Polish

### 6.1 Landing Page Structure

```
[Header - Sticky with backdrop blur]
│
[Hero Section] - py-section-xl
│ - Eyebrow badge: "Built for Fitness Coaches"
│ - Large headline: "Proof of Progress"
│ - Subheadline
│ - CTA: "Try Free - No Card Required"
│ - Demo visual (animated or video)
│
[How It Works] - py-section-lg
│ - 4 steps with icons
│ - Animated on scroll
│
[Features] - py-section-lg, bg-neutral-50
│ - 3 feature cards
│ - "Photos never leave your device" privacy message
│
[Pricing] - py-section-lg
│ - 3 pricing cards
│ - Annual toggle
│
[Final CTA] - py-section-lg, gradient background
│ - Compelling headline
│ - Single CTA button
│
[Footer]
```

### 6.2 Apple-Style Design Elements

**Typography:**
- Display headlines: 72px, bold, -0.02em letter-spacing
- Body: 18-20px, 1.6 line-height
- UI elements: 15px, medium weight

**Buttons:**
- Primary: Blue fill, shadow, hover scale
- Secondary: Gray fill
- Ghost: Text only, subtle hover background

**Animations:**
- Scroll-triggered fade-in-up (Intersection Observer)
- Staggered children (100ms delay each)
- Subtle hover transforms
- Modal scale-in entrance

**Spacing:**
- Section padding: 120-200px vertical
- Content max-width: 1120px
- Generous internal card padding: 32-40px

### 6.3 Dark Mode

- System preference detection via next-themes
- Landing page: follows system
- Editor: defaults to dark (better for photo editing)
- Toggle in settings

### 6.4 PWA Configuration

- Install next-pwa
- Create manifest.json with icons
- Add meta tags for iOS/Android
- Test installability

### 6.5 Responsive Design

**Breakpoints:**
- Mobile: < 640px (stacked editor, full-width buttons)
- Tablet: 640-1024px (side-by-side with smaller panels)
- Desktop: > 1024px (full experience)

---

## Implementation Order

### Day 1-2: Project Setup
1. Initialize Next.js project
2. Configure Tailwind with Apple-style theme
3. Set up project structure
4. Create Supabase project (manual)
5. Run database migrations
6. Set up environment variables
7. Create Supabase client utilities
8. Implement auth middleware

### Day 3: UI Primitives
1. Button component (all variants)
2. Input component
3. Modal/Dialog component
4. Card component
5. Set up Providers (Theme, etc.)

### Day 4-5: Auth Flow
1. Login page
2. Signup page
3. OAuth callback
4. Protected layout with auth check
5. User store for subscription/usage state

### Day 6-8: Editor Core
1. DropZone component
2. MediaPipe integration
3. Photo processing utility
4. Landmark overlay
5. Basic canvas view
6. Editor store

### Day 9-10: Alignment
1. Alignment calculation logic
2. Alignment controls UI
3. Real-time preview
4. Fine-tuning controls

### Day 11-12: Export & Usage
1. Usage API routes
2. useUsageLimit hook
3. Export modal
4. Watermark implementation
5. Upgrade prompts

### Day 13-14: Landing Page
1. Header component
2. Hero section
3. How It Works section
4. Features section
5. Pricing section
6. Footer

### Day 15: Polish
1. Scroll animations
2. Dark mode refinement
3. Responsive testing
4. PWA setup
5. Deploy to Vercel

---

## Critical Files to Create First

1. **`tailwind.config.ts`** - Design system foundation
2. **`app/globals.css`** - CSS custom properties, base styles
3. **`lib/supabase/server.ts`** - Server client factory
4. **`middleware.ts`** - Auth protection
5. **`components/ui/Button.tsx`** - Core interactive component
6. **`stores/editor-store.ts`** - Editor state management
7. **`lib/mediapipe/pose-detector.ts`** - Pose detection singleton

---

## Notes

- **Privacy First**: Photos processed client-side only, never uploaded
- **Stripe Stubbed**: Full implementation when account ready
- **Progressive Enhancement**: Core editor works without JS for basic upload
- **Accessibility**: Use Radix UI primitives for modals, dropdowns
- **Performance**: Dynamic imports for MediaPipe and Fabric.js
