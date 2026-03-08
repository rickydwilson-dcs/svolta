# YOLO Implementation Brief: ExportModal Decomposition & Big Ticket Fixes

**Branch:** feature/exportmodal-decomp (created from develop)
**Session spec:** output/sessions/2026-03-08_session5-exportmodal-decomp/yolo-brief.md
**Mode:** Autonomous execution — implement all phases, verify after each, STOP on error
**Orchestrator model:** sonnet

---

## Context

The `ExportModal` component is a 1,048-line god component with 10+ responsibilities, 14 state variables, and deeply nested UI logic. This plan decomposes it into a thin container (~280 lines) orchestrating 10 focused child components and 2 extracted hooks, then fixes 7 additional big-ticket issues across accessibility, SEO, and performance.

The synthesis was reviewed and approved via dual-model peer review (Claude + Codex). Implement it exactly as specified below.

---

## Model Tiers

| Tier   | Alias    | Cost (in/out per MTok) | Use for                                                                                             |
| ------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| Opus   | `opus`   | $15/$75                | Phases with >5 interdependent files, architectural rewrites, judgment calls not covered by the spec |
| Sonnet | `sonnet` | $3/$15                 | Standard implementation — file edits, feature wiring, most phases                                   |
| Haiku  | `haiku`  | $0.80/$4               | Mechanical tasks: find-replace, import additions, grep checks, content validation                   |

Default orchestrator: **sonnet**. Default sub-agent: **sonnet** unless the task is clearly mechanical (-> haiku) or requires deep cross-file reasoning (-> opus).

---

## Pre-flight

```bash
git checkout develop && git pull origin develop
git checkout -b feature/exportmodal-decomp   # create feature branch from develop — NEVER write directly to develop
npm run build                                 # must be clean before starting
```

---

## Phase 0: Baseline Capture

**Goal:** Document current ExportModal behavior for regression comparison.
**Model:** haiku — file listing and documentation only

**Tasks:**

1. Create `output/sessions/2026-03-08_session5-exportmodal-decomp/baseline/` directory
2. Read `components/features/editor/ExportModal.tsx` and create a decomposition checklist mapping each responsibility to its target file:

```markdown
# baseline/checklist.md

| Responsibility           | Current Location (lines) | Target File                         |
| ------------------------ | ------------------------ | ----------------------------------- |
| withTimeout utility      | 21-29                    | lib/export-utils.ts                 |
| getAnonId utility        | 37-47                    | lib/export-utils.ts                 |
| logExportEvent utility   | 52-71                    | lib/export-utils.ts                 |
| Types + constants        | 73-101                   | lib/export-utils.ts                 |
| Preview area JSX         | 468-527                  | export/ExportPreview.tsx            |
| Export type toggle JSX   | 530-561                  | export/ExportTypeToggle.tsx         |
| GIF controls JSX         | 563-630                  | export/GifControls.tsx              |
| Toggle rows JSX          | 810-882                  | export/ProToggle.tsx                |
| Aspect ratio JSX         | 668-689                  | export/AspectRatioSelector.tsx      |
| Background section JSX   | 691-807                  | export/BackgroundSection.tsx        |
| More options wrapper JSX | 632-887                  | export/MoreOptionsSection.tsx       |
| Progress bar JSX         | 889-902                  | export/ExportProgressBar.tsx        |
| CTA button JSX           | 904-929                  | export/ExportButton.tsx             |
| Signup prompt JSX        | 942-1044                 | export/SignupPromptModal.tsx        |
| handleRemoveBackgrounds  | 225-277                  | hooks/useExportBackgroundRemoval.ts |
| handleDownload           | 280-364                  | hooks/useExportDownload.ts          |
```

3. Note: Screenshots require a browser and cannot be captured in CLI mode. The checklist serves as the regression reference. Manual visual comparison is done after each phase.

**Verification gate:**

```bash
# Verification gate — STOP if this fails
ls output/sessions/2026-03-08_session5-exportmodal-decomp/baseline/checklist.md
```

**Commit:**

```bash
git add output/sessions/2026-03-08_session5-exportmodal-decomp/baseline/
git commit -m "$(cat <<'EOF'
chore(export): capture baseline checklist for regression testing

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1: Extract Utility Functions

**Goal:** Move pure functions, types, and constants out of ExportModal.tsx into `lib/export-utils.ts`. Zero risk — no React dependencies.
**Model:** sonnet — standard file creation and modification

**Tasks:**

1. Read `components/features/editor/ExportModal.tsx` in full
2. Create `lib/export-utils.ts` containing:
   - `withTimeout<T>` function (from lines 21-29)
   - `ANON_ID_KEY` constant and `getAnonId()` function (from lines 31-47)
   - `logExportEvent()` function (from lines 52-71)
   - `TIMEOUT_MS = 60000` constant
   - Type exports: `ExportType`, `AspectRatio`, `BackgroundType`, `BackgroundState`
   - Constant exports: `animationStyleOptions`, `imagePresets`
3. Modify `components/features/editor/ExportModal.tsx`:
   - Remove lines 21-101 (all utilities, types, constants)
   - Add: `import { withTimeout, getAnonId, logExportEvent, TIMEOUT_MS, type ExportType, type AspectRatio, type BackgroundState, animationStyleOptions, imagePresets } from '@/lib/export-utils';`

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
```

**Commit:**

```bash
git add lib/export-utils.ts components/features/editor/ExportModal.tsx
git commit -m "$(cat <<'EOF'
refactor(export): extract utility functions to lib/export-utils

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Extract Child UI Components

**Goal:** Extract presentational JSX into 10 focused components under `components/features/editor/export/`. Each receives props and renders UI only — no business logic.
**Model:** opus — 11 files created, 1 large file modified, interdependent extraction requiring deep cross-file reasoning to preserve exact JSX, class names, animations, and DOM order

**Tasks:**

1. Create directory: `mkdir -p components/features/editor/export`
2. Read `components/features/editor/ExportModal.tsx` in full (post-Phase 1 version)

Create the following components, extracting the exact JSX from ExportModal. Preserve all class names, Tailwind tokens, motion transitions, and DOM order:

**2a. `components/features/editor/export/ExportPreview.tsx`** (~80 lines)
Extract lines ~468-527 (preview area with GifPreview/AlignedPreview conditional, watermark overlay, badges).

```typescript
interface ExportPreviewProps {
  exportType: ExportType;
  aspectRatio: AspectRatio;
  isPro: boolean;
  removeWatermark: boolean;
  addLabels: boolean;
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  animationStyle: AnimationStyle;
  duration: number;
  hasBackgroundRemoved: boolean;
  backgroundSettings: BackgroundSettings;
}
```

**2b. `components/features/editor/export/ExportTypeToggle.tsx`** (~45 lines)
Extract lines ~530-561 (Image/Animation segmented control with PRO badge).

```typescript
interface ExportTypeToggleProps {
  exportType: ExportType;
  isPro: boolean;
  onChange: (type: string) => void;
}
```

**2c. `components/features/editor/export/GifControls.tsx`** (~70 lines)
Extract lines ~563-630 (animation style picker + speed slider, wrapped in AnimatePresence).

```typescript
interface GifControlsProps {
  visible: boolean;
  animationStyle: AnimationStyle;
  duration: number;
  onStyleChange: (style: AnimationStyle) => void;
  onDurationChange: (duration: number) => void;
}
```

**2d. `components/features/editor/export/ProToggle.tsx`** (~40 lines)
Reusable toggle row with optional PRO badge and gating. Replaces 3 repeated toggle patterns (Labels, Watermark, Logo).

```typescript
interface ProToggleProps {
  label: string;
  checked: boolean;
  isPro?: boolean;
  requiresPro?: boolean;
  onToggle: () => void;
}
```

**2e. `components/features/editor/export/AspectRatioSelector.tsx`** (~35 lines)
Extract lines ~668-689.

```typescript
interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}
```

Note: `setUserFraming({ panX: 0, panY: 0 })` call on aspect ratio change stays in ExportModal's onChange callback.

**2f. `components/features/editor/export/BackgroundSection.tsx`** (~120 lines)
Extract lines ~691-807 (expandable background subsection with type selector, colour picker, image presets).

```typescript
interface BackgroundSectionProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  background: BackgroundState;
  backgroundLabel: string;
  onTypeChange: (type: string) => void;
  onColorSelect: (color: string) => void;
  onImageSelect: (imageId: string) => void;
}
```

**2g. `components/features/editor/export/MoreOptionsSection.tsx`** (~30 lines)
Collapsible wrapper with AnimatePresence.

```typescript
interface MoreOptionsSectionProps {
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}
```

**2h. `components/features/editor/export/ExportProgressBar.tsx`** (~25 lines)
Extract lines ~889-902 (GIF progress bar).

```typescript
interface ExportProgressBarProps {
  visible: boolean;
  progress: number;
  status: string;
}
```

**2i. `components/features/editor/export/ExportButton.tsx`** (~35 lines)
Extract lines ~904-929 (CTA button + usage text).

```typescript
interface ExportButtonProps {
  hasPhotos: boolean;
  isAnyExporting: boolean;
  exportType: ExportType;
  usageText: string;
  onDownload: () => void;
}
```

**2j. `components/features/editor/export/SignupPromptModal.tsx`** (~90 lines)
Extract lines ~942-1044 (full Radix Dialog for anonymous users who hit export limit). Self-contained, links to `/signup`, `/upgrade`, `/login`.

```typescript
interface SignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

3. Modify `components/features/editor/ExportModal.tsx`:
   - Replace all inline JSX with component references
   - Import all 10 new components
   - `getBackgroundLabel()` helper STAYS in ExportModal (it reads local `background` state)

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
```

**Commit:**

```bash
git add components/features/editor/export/ components/features/editor/ExportModal.tsx
git commit -m "$(cat <<'EOF'
refactor(export): extract child UI components to export/ directory

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Extract Background Removal Hook

**Goal:** Move `handleRemoveBackgrounds` orchestration (53 lines) into a dedicated hook.
**Model:** sonnet — standard hook extraction from one component

**Tasks:**

1. Read `components/features/editor/ExportModal.tsx` (post-Phase 2 version)
2. Read `hooks/useBackgroundRemoval.ts` for the API surface
3. Create `hooks/useExportBackgroundRemoval.ts` (~70 lines):

```typescript
interface UseExportBackgroundRemovalReturn {
  isRemovingBackgrounds: boolean;
  error: string | null;
  clearError: () => void;
  removeBackgrounds: () => Promise<void>;
  hasBackgroundRemoved: boolean;
}

export function useExportBackgroundRemoval(): UseExportBackgroundRemovalReturn {
  // Internal state: isRemovingBackgrounds, error
  // Reads from useEditorStore via selectors: beforePhoto, afterPhoto
  // Writes to useEditorStore: setBeforePhoto, setAfterPhoto
  // Uses useBackgroundRemoval: processImage
  // Uses withTimeout, TIMEOUT_MS from lib/export-utils
  // hasBackgroundRemoved = derived: beforePhoto?.hasBackgroundRemoved || afterPhoto?.hasBackgroundRemoved
}
```

4. Modify `components/features/editor/ExportModal.tsx`:
   - Remove `handleRemoveBackgrounds` function
   - Remove `isRemovingBackgrounds` useState
   - Remove `hasBackgroundRemoved` derived value
   - Import and use `useExportBackgroundRemoval`
   - Update `handleBackgroundTypeChange` and `handleColorSelect` to call `removeBackgrounds()`
   - Update `isAnyExporting` to include hook's `isRemovingBackgrounds`
   - Update error display to include hook's `error`

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
```

**Commit:**

```bash
git add hooks/useExportBackgroundRemoval.ts components/features/editor/ExportModal.tsx
git commit -m "$(cat <<'EOF'
refactor(export): extract background removal to useExportBackgroundRemoval hook

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Extract Download Orchestration Hook

**Goal:** Move `handleDownload` (85 lines, 11 steps) into a dedicated hook.
**Model:** sonnet — standard hook extraction composing multiple existing hooks

**Tasks:**

1. Read `components/features/editor/ExportModal.tsx` (post-Phase 3 version)
2. Read `hooks/useCanvasExport.ts` and `hooks/useGifExport.ts` for API surfaces
3. Read `hooks/useUsageLimit.ts` for the checkAndIncrement API
4. Create `hooks/useExportDownload.ts` (~90 lines):

```typescript
interface ExportConfig {
  exportType: ExportType;
  aspectRatio: AspectRatio;
  animationStyle: AnimationStyle;
  duration: number;
  addLabels: boolean;
  removeWatermark: boolean;
  addLogo: boolean;
  hasBackgroundRemoved: boolean;
}

interface UseExportDownloadReturn {
  handleDownload: () => Promise<void>;
  isExporting: boolean;
  isExportingGif: boolean;
  gifProgress: number;
  gifStatus: string;
  exportError: string | null;
  clearExportError: () => void;
}

export function useExportDownload(
  config: ExportConfig,
  callbacks: {
    onLimitReached: (isAnonymous: boolean) => void;
    onSuccess: () => void;
  },
): UseExportDownloadReturn {
  // Internally composes: useCanvasExport, useGifExport, useUsageLimit
  // Reads from useEditorStore via selectors: beforePhoto, afterPhoto, alignment, backgroundSettings
  // Reads from useUserStore via selectors: isPro, profile
  // Uses logExportEvent from lib/export-utils
}
```

5. Modify `components/features/editor/ExportModal.tsx`:
   - Remove `handleDownload` function (85 lines)
   - Remove direct `useCanvasExport` and `useGifExport` usage
   - Remove `localError` state for download errors
   - Import and use `useExportDownload`
   - Wire callbacks: `onLimitReached` sets `showSignupPrompt`/`showUpgradePrompt`, `onSuccess` calls `onClose()`

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
```

**Commit:**

```bash
git add hooks/useExportDownload.ts components/features/editor/ExportModal.tsx
git commit -m "$(cat <<'EOF'
refactor(export): extract download orchestration to useExportDownload hook

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Rewire ExportModal as Thin Container

**Goal:** Final cleanup pass. ExportModal becomes a pure orchestration layer under 350 lines.
**Model:** sonnet — audit and clean up one file

**Tasks:**

1. Read `components/features/editor/ExportModal.tsx` (post-Phase 4 version)

2. Audit remaining state — ExportModal should own ONLY:
   - `exportType`, `animationStyle`, `duration` — export config
   - `aspectRatio`, `background`, `addLabels`, `removeWatermark`, `addLogo` — options
   - `isMoreOptionsExpanded`, `isBackgroundExpanded` — UI expand/collapse
   - `showUpgradePrompt`, `showSignupPrompt`, `upgradeTrigger` — modal visibility

3. Audit remaining handlers — ExportModal should own ONLY:
   - `handleExportTypeChange` — Pro-gating (8 lines)
   - `handleRemoveWatermarkToggle` — Pro-gating (7 lines)
   - `handleLogoToggle` — Pro-gating (7 lines)
   - `handleBackgroundTypeChange` — delegates to hook + updates local state
   - `handleColorSelect` — delegates to hook + updates local state
   - `handleAspectRatioChange` — wraps `setAspectRatio` + `setUserFraming`
   - `getBackgroundLabel` — derives display label from background state

4. Remove any remaining dead code, unused imports, or unnecessary state.

5. Verify line count:

```bash
wc -l components/features/editor/ExportModal.tsx
# Must be < 350 lines
```

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
wc -l components/features/editor/ExportModal.tsx | awk '{ if ($1 > 350) exit 1 }'
```

**Commit:**

```bash
git add components/features/editor/ExportModal.tsx
git commit -m "$(cat <<'EOF'
refactor(export): rewire ExportModal as thin container (~280 lines)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 6: Add Tests for Extracted Code

**Goal:** Add targeted tests for the new hooks and utilities to prevent regression.
**Model:** sonnet — standard test writing

**Tasks:**

1. Read `lib/export-utils.ts`, `hooks/useExportDownload.ts`, `hooks/useExportBackgroundRemoval.ts`
2. Check existing test patterns: read one existing test file (e.g., `tests/` directory) to match conventions

3. Create `tests/lib/export-utils.test.ts` (~60 lines):
   - Test `withTimeout` — resolves before timeout, rejects after timeout
   - Test `getAnonId` — returns consistent ID, creates new on first call
   - Test `logExportEvent` — fires fetch, doesn't throw on failure

4. Create `tests/hooks/useExportDownload.test.ts` (~80 lines):
   - Test pro-gating: GIF blocked for free users
   - Test usage limit: blocked when `checkAndIncrement` returns false
   - Test anonymous vs logged-in limit reached callbacks

**Verification gate:**

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run test
```

**Commit:**

```bash
git add tests/
git commit -m "$(cat <<'EOF'
test(export): add tests for extracted hooks and utilities

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 7: Fix Remaining Big Tickets

**Goal:** Fix 7 additional issues: A11Y-001, A11Y-003, A11Y-007, SEO-003, SEO-006, SEO-007, PERF-015.
**Model:** sonnet — standard edits across independent files

These fixes are independent of each other. Edit files in parallel where possible.

### 7a. A11Y-001: BottomSheet Missing Dialog Title/Description

**Modify:** `components/ui/BottomSheet.tsx`

Always render `Dialog.Title` and `Dialog.Description`. When props are empty/omitted, render with `className="sr-only"` and sensible defaults:

```tsx
<Dialog.Title className={cn(!title && 'sr-only', title && 'text-lg font-semibold tracking-tight')}>
  {title || 'Dialog'}
</Dialog.Title>
<Dialog.Description className={cn(!description && 'sr-only', description && 'text-sm text-text-secondary mt-1')}>
  {description || 'Dialog content'}
</Dialog.Description>
```

Remove the `{(title || description) &&` conditional wrapper so these always render.

### 7b. A11Y-003: Skip-to-Content Link

**Modify:** `app/layout.tsx`
Add inside `<body>`, before `<Providers>`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-[var(--surface-primary)] focus:text-[var(--text-primary)] focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-pink)]"
>
  Skip to content
</a>
```

**Modify:** `app/(marketing)/layout.tsx`
Add `id="main-content"` to the `<main>` element.

**Modify:** `app/(app)/layout.tsx`
Add `id="main-content"` to the app main element (if it has a `<main>`).

### 7c. A11Y-007: `--text-tertiary` Contrast Fix

**Modify:** `app/globals.css`

- Light mode: change `#C7C7C7` to `#767676` (4.5:1 on white)
- Dark mode: change `#737373` to `#8E8E8E` (5.0:1 on black)

### 7d. SEO-003: OG Image SVG to PNG

**Modify:** `app/layout.tsx`

- Change `'/og-image.svg'` to `'/og-image.png'` in openGraph images metadata
- Change `'/og-image.svg'` to `'/og-image.png'` in twitter images metadata

**Note:** `public/og-image.png` (1200x630) must be created manually from the existing SVG. If the file doesn't exist, create a placeholder PNG. Flag as **BLOCKER** in a comment: `// TODO: Replace placeholder with production og-image.png (1200x630)`

### 7e. SEO-006: Apple Touch Icon

**Modify:** `app/layout.tsx`

- Change apple icon reference to `'/apple-icon.png'` with `sizes: '180x180'`, `type: 'image/png'`

First check: `ls public/apple-icon*` — if PNG exists, just update the reference. If not, flag as blocker alongside og-image.

### 7f. SEO-007: JSON-LD Structured Data

**Modify:** `app/(marketing)/page.tsx`
Add at the top of the component return, inside the fragment:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "svolta",
      url: "https://www.svolta.app",
      description:
        "Professional before/after fitness photo alignment using AI pose detection.",
      applicationCategory: "PhotographyApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "GBP",
          name: "Free",
          description: "5 exports per month with watermark",
        },
        {
          "@type": "Offer",
          price: "7.99",
          priceCurrency: "GBP",
          name: "Pro",
          description: "Unlimited exports, no watermarks, all formats",
        },
      ],
    }),
  }}
/>
```

### 7g. PERF-015: MediaPipe Disposal

**Modify:** `app/(app)/editor/_components/EditorContent.tsx`

Add cleanup effect:

```typescript
import { closePoseDetector } from "@/lib/mediapipe/pose-detector";

useEffect(() => {
  return () => {
    closePoseDetector();
  };
}, []);
```

Re-entry reinitialises via existing `initializePoseDetector()` singleton check.

### Verification gate:

```bash
# Verification gate — STOP if this fails
npx tsc --noEmit
npm run lint
npm run build
```

**Commit:**

```bash
git add components/ui/BottomSheet.tsx app/layout.tsx "app/(marketing)/layout.tsx" "app/(app)/layout.tsx" app/globals.css "app/(marketing)/page.tsx" "app/(app)/editor/_components/EditorContent.tsx"
git commit -m "$(cat <<'EOF'
fix(a11y,seo,perf): address A11Y-001/003/007, SEO-003/006/007, PERF-015

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Cost Estimate

| Phase                            | Model  | Est. input tokens | Est. output tokens | Est. cost  |
| -------------------------------- | ------ | ----------------- | ------------------ | ---------- |
| Phase 0: Baseline capture        | haiku  | ~8k               | ~1k                | $0.01      |
| Phase 1: Extract utilities       | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 2: Extract UI components   | opus   | ~15k              | ~8k                | $0.83      |
| Phase 3: Extract bg removal hook | sonnet | ~10k              | ~2k                | $0.06      |
| Phase 4: Extract download hook   | sonnet | ~12k              | ~2k                | $0.07      |
| Phase 5: Rewire container        | sonnet | ~8k               | ~1k                | $0.04      |
| Phase 6: Add tests               | sonnet | ~10k              | ~3k                | $0.08      |
| Phase 7: Big ticket fixes        | sonnet | ~15k              | ~3k                | $0.09      |
| **Total**                        |        | **~90k**          | **~22k**           | **~$1.25** |

Rates: Opus $15/$75, Sonnet $3/$15, Haiku $0.80/$4 per MTok.
Estimation: ~5 tokens per line of code. Input = files read + brief (~3k) + system prompt (~3k). Output = code written + verification output (~500/gate).

---

## Final Report

After all phases complete, output:

1. Phases completed — list each with commit SHA
2. Build status — confirm `npm run lint && npx tsc --noEmit && npm run build` passes
3. Any exceptions or intentional deviations from the plan
4. Token usage and cost estimate:

   | Model     | Est. input tokens     | Est. output tokens | Est. cost |
   | --------- | --------------------- | ------------------ | --------- |
   | sonnet    | [total across phases] |                    | $X.XX     |
   | haiku     | [if used]             |                    | $X.XX     |
   | opus      | [if used]             |                    | $X.XX     |
   | **Total** |                       |                    | **$X.XX** |

   Estimate tokens from: files read (lines x 5) and written (lines x 5).
   Compare to the pre-flight Cost Estimate above.
   For exact figures: check console.anthropic.com.

---

## Update Session File

After completing all phases, append to `output/sessions/2026-03-08_session5-exportmodal-decomp/yolo-brief.md`:

```markdown
## Completed

**Date:** [today]
**Status:** All phases executed successfully

[1-paragraph summary: what was implemented, any surprises]

### Commits

[list each commit SHA and message]
```

Confirm this was done in the final report.

---

## Completed

**Date:** 2026-03-08
**Status:** All phases executed successfully

ExportModal.tsx was decomposed from a 1,057-line god component into a 350-line thin container orchestrating 10 focused child components (`ExportPreview`, `ExportTypeToggle`, `GifControls`, `ProToggle`, `AspectRatioSelector`, `BackgroundSection`, `MoreOptionsSection`, `ExportProgressBar`, `ExportButton`, `SignupPromptModal`), 2 extracted hooks (`useExportBackgroundRemoval`, `useExportDownload`), and a shared utility module (`lib/export-utils.ts`). Phase 7 addressed 7 additional issues: BottomSheet always renders accessible dialog title/description, skip-to-content link added to root layout, `--text-tertiary` contrast bumped to meet WCAG 4.5:1, OG/Twitter image references updated to PNG (with BLOCKER comments for manual conversion), JSON-LD WebApplication schema added to the marketing page, and MediaPipe pose detector is now disposed on editor unmount.

### Commits

- `209e3ff` chore(export): capture baseline checklist for regression testing
- `00ab3a3` refactor(export): extract utility functions to lib/export-utils
- `d33e209` refactor(export): extract child UI components to export/ directory
- `9bbd7ce` refactor(export): extract background removal to useExportBackgroundRemoval hook
- `3f4fb03` refactor(export): extract download orchestration to useExportDownload hook
- `929b08f` refactor(export): rewire ExportModal as thin container (~280 lines)
- `f1c103a` test(export): add tests for extracted hooks and utilities
- `f2cdd9f` fix(a11y,seo,perf): address A11Y-001/003/007, SEO-003/006/007, PERF-015

---

## Rules

- STOP on any failed verification gate — do not continue to next phase
- Read every file before editing it
- Never push — leave all changes on the feature branch
- Parallel reads and independent file edits should be done concurrently using Task agents
- Minimal changes only — implement what the plan says, nothing more
- Use `model: haiku` for Task agents doing mechanical work (grep, import additions, find-replace); `model: sonnet` for standard edits; `model: opus` only for deep multi-file reasoning
- The Co-Authored-By line in commits must reflect the orchestrator model used (e.g., `Claude Sonnet 4.6` not `Opus 4.6`)
- All work stays on `feature/exportmodal-decomp` — NEVER commit directly to develop
