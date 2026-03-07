# Project History

Svolta's development timeline and key milestones.

## Development Phases

| Phase                | Status         | Focus                                        |
| -------------------- | -------------- | -------------------------------------------- |
| 1 - Foundation       | ✅ Complete    | Next.js, Tailwind, Supabase, UI primitives   |
| 2 - Core Editor      | ✅ Complete    | DropZone, MediaPipe, Canvas, Landmarks       |
| 3 - Alignment        | ✅ Complete    | Calculation logic, Controls UI, Preview      |
| 4 - Auth & Payments  | ✅ Complete    | Login/Signup, User store, Stripe integration |
| 5 - Usage & Export   | ✅ Complete    | Usage tracking, Export modal, Watermark      |
| 6 - Landing & Polish | 🔄 In Progress | Hero, Features, Pricing, PWA, Deploy         |

## Key Features Shipped

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

## Documentation Roadmap

### Completed Documentation

- [x] API Reference (`reference/api.md`)
- [x] Component Library Guide (`reference/components.md`)
- [x] Alignment Algorithm (`architecture/how-alignment-works.md`)
- [x] Pose Detection (`architecture/how-pose-detection-works.md`)
- [x] Billing & Usage (`architecture/how-billing-works.md`)
- [x] Development Setup (`guides/local-development-setup.md`)
- [x] State Management (`architecture/how-state-management-works.md`)
- [x] Code Style Standards (`standards/code-style.md`)

### Planned Documentation

- [ ] Contributing Guidelines (`CONTRIBUTING.md`)
- [ ] Security Policy (`SECURITY.md`)
