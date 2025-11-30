# PoseProof: Claude Code Implementation Brief

## Project Overview

**Product Name:** PoseProof  
**Domain:** poseproof.com  
**Tagline:** "Proof of Progress"

**What we're building:** A web-based tool that helps fitness coaches align before/after client photos using AI landmark detection for precise visual comparisons.

**Who it's for:** Personal trainers, online coaches, and fitness professionals who create transformation content.

**Core value proposition:** Turn a 15-minute manual alignment task into a 30-second automated process. Give coaches visual proof that sells.

---

## Business Model & Monetization

### Pricing Tiers

| Tier | Price | Includes |
|------|-------|----------|
| **Free** | £0 | 5 exports/month, PoseProof watermark on exports, basic alignment |
| **Pro** | £9.99/month or £79/year | Unlimited exports, no watermark, custom logo upload, all export formats, priority support |
| **Team** | £29.99/month | Pro features + 5 team seats, shared brand templates, client folders |

### Revenue Model Details

**Primary: Subscription (SaaS)**
- Monthly recurring revenue from Pro and Team tiers
- Annual discount (34% off) incentivizes upfront commitment
- Free tier creates funnel and word-of-mouth

**Secondary: Usage-Based (Future)**
- Pay-per-export option: £0.99/export for users who don't want subscription
- Background removal add-on: £0.49/image (API cost pass-through + margin)

**Tertiary: B2B White-Label (Future)**
- Gym chains / coaching platforms embed PoseProof
- Custom branding, subdomain, API access
- £199-499/month depending on volume

### Key Metrics to Track

```typescript
// Analytics events to implement
const ANALYTICS_EVENTS = {
  // Acquisition
  'landing_page_view': {},
  'waitlist_signup': { email: string },
  'free_account_created': { email: string, source: string },
  
  // Activation
  'first_photo_uploaded': { userId: string },
  'first_alignment_completed': { userId: string },
  'first_export': { userId: string, format: string },
  
  // Revenue
  'upgrade_modal_shown': { userId: string, trigger: string },
  'checkout_started': { userId: string, plan: string },
  'subscription_created': { userId: string, plan: string, price: number },
  'subscription_cancelled': { userId: string, reason: string },
  
  // Engagement
  'export_created': { userId: string, format: string, hasWatermark: boolean },
  'logo_uploaded': { userId: string },
  'share_to_social': { userId: string, platform: string }
};
```

### Conversion Triggers (Free → Pro)

Free users see upgrade prompts when they:
1. Hit 5 export limit → "Upgrade for unlimited exports"
2. Try to remove watermark → "Go Pro to remove branding"
3. Try to upload custom logo → "Add your logo with Pro"
4. Export in 4:5 or 9:16 format → "Unlock all formats with Pro"

---

## Technical Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14 (App Router) | Fast iteration, excellent image handling, Vercel-ready |
| Styling | Tailwind CSS | Rapid UI development, consistent design system |
| Pose Detection | MediaPipe Pose (via @mediapipe/tasks-vision) | Runs client-side, free, accurate landmark detection |
| Canvas Manipulation | Fabric.js | Professional-grade canvas control, transforms, exports |
| PWA | next-pwa | Installable on mobile, offline capability |
| State Management | Zustand | Lightweight, simple for this use case |
| Auth | Supabase Auth | Free tier generous, easy setup, handles OAuth |
| Database | Supabase (PostgreSQL) | User accounts, subscription status, usage tracking |
| Payments | Stripe | Industry standard, handles subscriptions |
| Analytics | PostHog or Mixpanel | Product analytics, conversion funnels |
| File Handling | Browser File API + Canvas API | Privacy-first: photos never leave device |

---

## Project Structure

```
poseproof/
├── app/
│   ├── layout.tsx                    # Root layout with PWA meta tags
│   ├── page.tsx                      # Landing/marketing page
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/page.tsx         # OAuth callback
│   ├── (app)/
│   │   ├── layout.tsx                # App shell with auth check
│   │   ├── editor/page.tsx           # Main alignment editor
│   │   ├── exports/page.tsx          # Export history
│   │   ├── settings/page.tsx         # Account settings, logo upload
│   │   └── upgrade/page.tsx          # Pricing/upgrade page
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts     # Create checkout session
│   │   │   ├── webhook/route.ts      # Handle Stripe webhooks
│   │   │   └── portal/route.ts       # Customer portal link
│   │   └── usage/route.ts            # Track export usage
│   └── globals.css
├── components/
│   ├── ui/                           # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Slider.tsx
│   │   ├── Toggle.tsx
│   │   ├── DropZone.tsx
│   │   ├── Modal.tsx
│   │   └── UpgradePrompt.tsx
│   ├── editor/
│   │   ├── Canvas.tsx                # Main Fabric.js canvas wrapper
│   │   ├── PhotoPanel.tsx            # Individual photo with landmarks
│   │   ├── AlignmentControls.tsx
│   │   ├── LandmarkSelector.tsx
│   │   ├── ExportPanel.tsx
│   │   └── WatermarkOverlay.tsx      # Adds watermark for free tier
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── Demo.tsx
│   │   ├── Pricing.tsx
│   │   ├── Testimonials.tsx
│   │   └── WaitlistForm.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── AppNav.tsx
├── lib/
│   ├── mediapipe/
│   │   ├── pose-detector.ts          # MediaPipe initialization + detection
│   │   └── landmark-utils.ts         # Landmark calculation helpers
│   ├── canvas/
│   │   ├── fabric-setup.ts           # Fabric.js canvas initialization
│   │   ├── alignment.ts              # Alignment calculation logic
│   │   ├── watermark.ts              # Watermark rendering
│   │   └── export.ts                 # Image export functions
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Auth middleware
│   ├── stripe/
│   │   ├── client.ts                 # Stripe client
│   │   └── plans.ts                  # Plan definitions
│   ├── analytics/
│   │   └── events.ts                 # Analytics event helpers
│   └── store/
│       ├── editor-store.ts           # Editor state (Zustand)
│       └── user-store.ts             # User/subscription state
├── hooks/
│   ├── usePoseDetection.ts
│   ├── useCanvasExport.ts
│   ├── useAlignment.ts
│   ├── useSubscription.ts
│   └── useUsageLimit.ts
├── types/
│   └── index.ts                      # TypeScript interfaces
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (generated)
│   ├── logo.svg                      # PoseProof logo
│   └── icons/                        # PWA icons
├── supabase/
│   └── migrations/                   # Database migrations
│       ├── 001_users.sql
│       ├── 002_subscriptions.sql
│       └── 003_usage.sql
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Database Schema

```sql
-- 001_users.sql
-- Extends Supabase auth.users

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  logo_url text,                      -- Custom logo for exports
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);


-- 002_subscriptions.sql

create type subscription_status as enum (
  'trialing', 'active', 'canceled', 'incomplete', 
  'incomplete_expired', 'past_due', 'unpaid', 'paused'
);

create type plan_type as enum ('free', 'pro', 'team');

create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan plan_type default 'free',
  status subscription_status default 'active',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);


-- 003_usage.sql

create table public.usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  period_start date not null,         -- First day of month
  exports_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, period_start)
);

-- Enable RLS
alter table public.usage enable row level security;

create policy "Users can view own usage"
  on public.usage for select
  using (auth.uid() = user_id);

-- Function to increment usage
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

---

## Core Features (MVP)

### Feature 1: Dual Photo Upload
**User story:** As a coach, I want to upload two photos (before/after) so I can compare them.

**Requirements:**
- Drag-and-drop or click-to-upload for each photo slot
- Accept JPEG, PNG, HEIC (common iPhone format)
- Preview thumbnails immediately on upload
- Handle different aspect ratios gracefully
- Maximum file size: 20MB per image

### Feature 2: Automatic Pose Detection
**User story:** As a coach, I want the app to detect body landmarks automatically so I don't have to mark them manually.

**Requirements:**
- Detect 33 pose landmarks using MediaPipe Pose
- Key landmarks for fitness: head (nose/ears), shoulders, hips, knees, ankles
- Visual overlay showing detected landmarks
- Confidence indicator (warn if detection is uncertain)
- Handle partial bodies (e.g., cropped at knees)

**Implementation:**
```typescript
// lib/mediapipe/pose-detector.ts

import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let poseLandmarker: PoseLandmarker | null = null;

export async function initializePoseDetector() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );
  
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU'
    },
    runningMode: 'IMAGE',
    numPoses: 1
  });
  
  return poseLandmarker;
}

export async function detectPose(imageElement: HTMLImageElement) {
  if (!poseLandmarker) {
    await initializePoseDetector();
  }
  
  const result = poseLandmarker!.detect(imageElement);
  return result.landmarks[0] || null;
}
```

### Feature 3: Alignment Controls
**User story:** As a coach, I want to align photos based on specific body parts so comparisons are accurate.

**Requirements:**
- Alignment anchor selector: "Match heads", "Match shoulders", "Match hips", "Match full body"
- Manual fine-tuning: scale slider, vertical offset, horizontal offset
- Real-time preview of alignment changes
- Reset to auto-detected alignment button

**Implementation:**
```typescript
// lib/canvas/alignment.ts

interface AlignmentResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function calculateAlignment(
  landmarks1: Landmark[],
  landmarks2: Landmark[],
  anchor: 'head' | 'shoulders' | 'hips' | 'full',
  imageSize1: { width: number; height: number },
  imageSize2: { width: number; height: number }
): AlignmentResult {
  
  const anchorIndices = {
    head: [0],           // nose
    shoulders: [11, 12], // left/right shoulder
    hips: [23, 24],      // left/right hip
    full: [0, 23, 24]    // nose + hips for full body
  };
  
  const indices = anchorIndices[anchor];
  
  const center1 = calculateCenter(landmarks1, indices, imageSize1);
  const center2 = calculateCenter(landmarks2, indices, imageSize2);
  
  const scale = calculateScaleFactor(landmarks1, landmarks2, imageSize1, imageSize2);
  
  const offsetX = center1.x - (center2.x * scale);
  const offsetY = center1.y - (center2.y * scale);
  
  return { scale, offsetX, offsetY };
}
```

### Feature 4: Side-by-Side Canvas
**User story:** As a coach, I want to see both photos side by side at matched scale so I can verify alignment.

**Requirements:**
- Two-panel view with adjustable divider
- Both panels zoom/pan together when linked
- Grid overlay option for precise alignment checking
- Landmark overlay toggle (show/hide detected points)

### Feature 5: Export Options
**User story:** As a coach, I want to export the aligned comparison so I can share it on social media.

**Requirements:**
- Export formats: Square (1:1), Portrait (4:5), Story (9:16)
- Resolution options: 1080px, 1440px, 2160px width
- **Free tier:** PoseProof watermark added automatically
- **Pro tier:** No watermark, custom logo upload option
- Optional: Add "Before/After" labels
- Download as PNG or JPEG

### Feature 6: Usage Tracking & Upgrade Flow
**User story:** As a free user, I want to know how many exports I have left and easily upgrade when needed.

**Requirements:**
- Show "X of 5 exports remaining this month" for free users
- Upgrade prompt when limit reached
- Stripe Checkout integration for Pro subscription
- Stripe Customer Portal for subscription management

---

## User Interface Specifications

### Landing Page (`/`)
```
┌─────────────────────────────────────────────────────────┐
│  [PoseProof Logo]                    [Login] [Try Free] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│     Proof of Progress                                   │
│                                                         │
│     Stop wasting time aligning before/after photos.     │
│     PoseProof matches them perfectly in seconds.        │
│                                                         │
│     Built for fitness coaches who mean business.        │
│                                                         │
│              [Try Free — No Card Required]              │
│                                                         │
│     ┌─────────────┐   ┌─────────────┐                  │
│     │   BEFORE    │   │    AFTER    │                  │
│     │   (demo)    │ ↔ │   (demo)    │                  │
│     └─────────────┘   └─────────────┘                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  HOW IT WORKS                                           │
│                                                         │
│  1. Upload two photos                                   │
│  2. AI detects body landmarks                           │
│  3. Auto-aligns heads, shoulders, hips                  │
│  4. Export ready for Instagram                          │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  PRICING                                                │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │    FREE     │  │     PRO     │  │    TEAM     │     │
│  │             │  │             │  │             │     │
│  │   £0/mo     │  │  £9.99/mo   │  │  £29.99/mo  │     │
│  │             │  │  £79/year   │  │             │     │
│  │ 5 exports   │  │ Unlimited   │  │ 5 seats     │     │
│  │ Watermark   │  │ Your logo   │  │ Team brands │     │
│  │             │  │ All formats │  │ Shared libs │     │
│  │             │  │             │  │             │     │
│  │ [Start]     │  │ [Go Pro]    │  │ [Contact]   │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [Logo]  © 2025 PoseProof  |  Privacy  |  Terms        │
└─────────────────────────────────────────────────────────┘
```

### Editor Page (`/editor`)
```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  PoseProof     [Exports: 3/5 ↑]  [⚙️] [Export] │
├───────────────────────────────┬─────────────────────────┤
│                               │                         │
│     ┌───────────────────┐     │     ┌───────────────┐   │
│     │                   │     │     │               │   │
│     │      BEFORE       │     │     │     AFTER     │   │
│     │    [Drop zone]    │     │     │  [Drop zone]  │   │
│     │                   │     │     │               │   │
│     │   ○ ← landmarks   │     │     │   ○           │   │
│     │   │               │     │     │   │           │   │
│     │   ○               │     │     │   ○           │   │
│     │   │               │     │     │   │           │   │
│     │   ○               │     │     │   ○           │   │
│     │                   │     │     │               │   │
│     └───────────────────┘     │     └───────────────┘   │
│                               │                         │
├───────────────────────────────┴─────────────────────────┤
│  Align by: [Head ●] [Shoulders] [Hips] [Full Body]     │
│                                                         │
│  Scale: ──────●────── 1.0x     Offset: ↑↓ ←→           │
│                                                         │
│  [✓] Show landmarks   [✓] Show grid   [ ] Link zoom    │
└─────────────────────────────────────────────────────────┘
```

### Export Modal (Free User)
```
┌─────────────────────────────────────────┐
│  Export Image                     [×]   │
├─────────────────────────────────────────┤
│                                         │
│  Format:  [1:1 ●] [4:5 🔒] [9:16 🔒]   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         Preview                  │   │
│  │      ┌───────┬───────┐          │   │
│  │      │Before │ After │          │   │
│  │      └───────┴───────┘          │   │
│  │                                  │   │
│  │      ╔═══════════════╗          │   │
│  │      ║  PoseProof    ║ ← watermark│
│  │      ╚═══════════════╝          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [ ] Add "Before/After" labels          │
│  [🔒] Remove watermark — Go Pro         │
│  [🔒] Add your logo — Go Pro            │
│                                         │
│  Exports remaining: 2 of 5 this month   │
│                                         │
│         [Download PNG]                  │
│                                         │
│  ─────────────────────────────────────  │
│  Want unlimited exports & your logo?    │
│         [Upgrade to Pro — £9.99/mo]     │
└─────────────────────────────────────────┘
```

---

## Stripe Integration

### Plan Configuration
```typescript
// lib/stripe/plans.ts

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    exports_per_month: 5,
    features: [
      '5 exports per month',
      'Basic alignment',
      'Square format (1:1)',
      'PoseProof watermark'
    ]
  },
  pro_monthly: {
    name: 'Pro',
    stripe_price_id: 'price_xxx_monthly', // Replace with actual
    price: 9.99,
    interval: 'month',
    exports_per_month: Infinity,
    features: [
      'Unlimited exports',
      'No watermark',
      'Custom logo upload',
      'All formats (1:1, 4:5, 9:16)',
      'All resolutions',
      'Priority support'
    ]
  },
  pro_yearly: {
    name: 'Pro (Annual)',
    stripe_price_id: 'price_xxx_yearly', // Replace with actual
    price: 79,
    interval: 'year',
    exports_per_month: Infinity,
    features: [
      'Everything in Pro',
      'Save 34% vs monthly'
    ]
  }
} as const;
```

### Checkout Flow
```typescript
// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { priceId } = await req.json();
  
  // Get or create Stripe customer
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();
  
  let customerId = subscription?.stripe_customer_id;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id }
    });
    customerId = customer.id;
    
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        stripe_customer_id: customerId
      });
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/editor?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
    metadata: { user_id: user.id }
  });
  
  return NextResponse.json({ url: session.url });
}
```

---

## Watermark Implementation

```typescript
// lib/canvas/watermark.ts

import { Canvas, FabricText, FabricImage } from 'fabric';

export async function addWatermark(
  canvas: Canvas,
  options: {
    isPro: boolean;
    customLogoUrl?: string;
  }
): Promise<void> {
  const { isPro, customLogoUrl } = options;
  
  if (isPro && customLogoUrl) {
    // Add custom logo for Pro users
    const logo = await FabricImage.fromURL(customLogoUrl);
    const maxWidth = canvas.width! * 0.15;
    const scale = maxWidth / logo.width!;
    
    logo.set({
      scaleX: scale,
      scaleY: scale,
      left: canvas.width! - (logo.width! * scale) - 20,
      top: canvas.height! - (logo.height! * scale) - 20,
      opacity: 0.9,
      selectable: false
    });
    
    canvas.add(logo);
  } else if (!isPro) {
    // Add PoseProof watermark for free users
    const watermark = new FabricText('PoseProof', {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 24,
      fill: 'rgba(255, 255, 255, 0.7)',
      shadow: '0 1px 2px rgba(0,0,0,0.5)',
      left: canvas.width! - 130,
      top: canvas.height! - 40,
      selectable: false
    });
    
    canvas.add(watermark);
  }
  // Pro users without custom logo = no watermark (clean export)
}
```

---

## Usage Limiting Hook

```typescript
// hooks/useUsageLimit.ts

import { useUserStore } from '@/lib/store/user-store';

interface UsageLimit {
  used: number;
  limit: number;
  canExport: boolean;
  isPro: boolean;
  checkAndIncrement: () => Promise<boolean>;
}

export function useUsageLimit(): UsageLimit {
  const { subscription, usage, incrementUsage } = useUserStore();
  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'team';
  const limit = isPro ? Infinity : 5;
  const used = usage?.exports_count || 0;
  const canExport = isPro || used < limit;
  
  const checkAndIncrement = async (): Promise<boolean> => {
    if (isPro) {
      await incrementUsage(); // Still track for analytics
      return true;
    }
    
    if (used >= limit) {
      return false; // Trigger upgrade modal
    }
    
    await incrementUsage();
    return true;
  };
  
  return { used, limit, canExport, isPro, checkAndIncrement };
}
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Configure Tailwind CSS with brand colors
- [ ] Set up project structure
- [ ] Configure Supabase (auth, database)
- [ ] Create database migrations
- [ ] Set up Stripe account and products
- [ ] Configure PWA (manifest, icons)
- [ ] Deploy to Vercel

### Phase 2: Core Editor (Days 4-7)
- [ ] Implement dual photo upload with drag-and-drop
- [ ] Integrate MediaPipe Pose detection
- [ ] Display landmark overlays
- [ ] Build side-by-side canvas view
- [ ] Implement alignment controls

### Phase 3: Alignment Logic (Days 8-10)
- [ ] Implement alignment calculation (anchor points)
- [ ] Build alignment control UI
- [ ] Add real-time preview
- [ ] Handle edge cases

### Phase 4: Auth & Payments (Days 11-13)
- [ ] Implement Supabase Auth (email + Google)
- [ ] Build login/signup pages
- [ ] Implement Stripe Checkout
- [ ] Build webhook handler
- [ ] Create upgrade page with pricing

### Phase 5: Usage & Export (Days 14-16)
- [ ] Implement usage tracking
- [ ] Build export modal with format options
- [ ] Implement watermark logic
- [ ] Add custom logo upload for Pro
- [ ] Implement upgrade prompts

### Phase 6: Landing & Polish (Days 17-20)
- [ ] Build landing page
- [ ] Add demo/animation
- [ ] Final UI polish
- [ ] Responsive design testing
- [ ] PWA testing on iOS/Android

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mediapipe/tasks-vision": "^0.10.0",
    "fabric": "^5.3.0",
    "zustand": "^4.4.0",
    "heic2any": "^0.0.4",
    "next-pwa": "^5.6.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/ssr": "^0.1.0",
    "stripe": "^14.0.0",
    "@stripe/stripe-js": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "supabase": "^1.100.0"
  }
}
```

---

## Environment Variables

```bash
# .env.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

---

## Brand Guidelines

### Colors
```css
:root {
  --brand-primary: #3B82F6;      /* Blue - trust, professional */
  --brand-secondary: #10B981;    /* Green - growth, progress */
  --brand-accent: #F59E0B;       /* Amber - energy, fitness */
  --brand-dark: #0F172A;         /* Slate 900 */
  --brand-light: #F8FAFC;        /* Slate 50 */
}
```

### Typography
- **Headings:** Inter (bold)
- **Body:** Inter (regular)

### Voice
- Professional but approachable
- Focused on results ("proof", "progress", "transformation")
- Speaks coach-to-coach

---

## Success Metrics (First 90 Days)

| Metric | Target |
|--------|--------|
| Landing page → Sign up | 15% conversion |
| Sign up → First export | 60% activation |
| Free → Pro conversion | 8% of active users |
| Monthly churn (Pro) | < 5% |
| NPS | > 50 |

---

## Notes for Claude Code

1. **Start with auth and database** — Get Supabase wired up first. Everything depends on knowing if user is free or pro.

2. **Build the free tier first** — Get full flow working with watermarks and limits before adding Stripe.

3. **Stripe webhooks are critical** — Test with Stripe CLI. Subscription status must sync reliably.

4. **MediaPipe loads async** — Show loading state. Don't let users upload before detection ready.

5. **Privacy messaging matters** — "Photos never leave your device" prominently displayed.

6. **Test upgrade flow relentlessly** — This is where money comes from.

7. **Mobile-first for editor** — Coaches use phones between sessions.

8. **Watermark placement** — Bottom-right, subtle but visible.

---

*Brief version: 2.0 — PoseProof branding with full monetization model*
