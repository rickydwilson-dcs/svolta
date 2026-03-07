# Component API Reference

Comprehensive API documentation for all UI and feature components in Svolta.

**Version:** 1.2.0
**Last Updated:** 2026-01-04
**Scope:** UI primitives and editor feature components

> **Design System:** See [brand-guidelines.md](../standards/brand-guidelines.md) and [design-tokens.md](../standards/design-tokens.md) for visual style, colors, and spacing tokens.

---

## Table of Contents

- [Component Patterns](#component-patterns)
- [UI Components](#ui-components)
  - [Button](#button)
  - [BottomSheet](#bottomsheet)
  - [Card](#card)
  - [ErrorBoundary](#errorboundary)
  - [Input](#input)
  - [MagicLinkForm](#magiclinkform)
  - [Modal](#modal)
  - [OAuthButtons](#oauthbuttons)
  - [SegmentedControl](#segmentedcontrol)
  - [Slider](#slider)
  - [SvoltaLogo](#svoltalogo)
  - [Toggle](#toggle)
  - [UpgradePrompt](#upgradeprompt)
- [Feature Components](#feature-components)
  - [DropZone](#dropzone)
  - [ExportModal](#exportmodal)
  - [AlignmentControls](#alignmentcontrols)
  - [PhotoPanel](#photopanel)
  - [LandmarkOverlay](#landmarkoverlay)
  - [AlignedPreview](#alignedpreview)
  - [BackgroundSettings](#backgroundsettings)
  - [GifPreview](#gifpreview)
  - [MediaPipeLoader](#mediapipeloader)

---

## Component Patterns

### Composition

All components support composition through children:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

### Forwarding Refs

Components forward refs for direct DOM access:

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);
<Button ref={buttonRef}>Click Me</Button>;
```

### Radix UI Integration

UI components use Radix UI primitives for:

- Modal (Dialog)
- SegmentedControl (ToggleGroup)
- BottomSheet (Dialog)
- UpgradePrompt (Dialog)

### State Integration

Feature components connect to Zustand stores:

- `useEditorStore` - Editor state management
- `useUserStore` - User and subscription state

---

## UI Components

### Button

Primary action button with multiple variants and loading states.

#### Props

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}
```

#### Props Table

| Prop        | Type                                               | Required | Default     | Description          |
| ----------- | -------------------------------------------------- | -------- | ----------- | -------------------- |
| `variant`   | `'primary' \| 'secondary' \| 'ghost' \| 'outline'` | No       | `'primary'` | Visual style variant |
| `size`      | `'sm' \| 'md' \| 'lg'`                             | No       | `'md'`      | Button size          |
| `loading`   | `boolean`                                          | No       | `false`     | Show loading spinner |
| `fullWidth` | `boolean`                                          | No       | `false`     | Expand to full width |
| `children`  | `React.ReactNode`                                  | Yes      | -           | Button content       |
| `disabled`  | `boolean`                                          | No       | `false`     | Disable button       |
| `onClick`   | `() => void`                                       | No       | -           | Click handler        |

#### Variants

- **primary:** Instagram gradient, white text, rounded pill
- **secondary:** Gray background, hover state
- **ghost:** Transparent, hover background
- **outline:** Border only, hover background

#### Usage

```tsx
import { Button } from '@/components/ui/Button';

// Primary button (default)
<Button onClick={handleClick}>
  Click Me
</Button>

// Secondary with loading
<Button variant="secondary" loading>
  Processing...
</Button>

// Full width outline button
<Button variant="outline" fullWidth>
  Cancel
</Button>

// Large ghost button
<Button variant="ghost" size="lg">
  Skip
</Button>
```

#### Accessibility

- Keyboard navigation with Enter/Space
- Focus ring on keyboard focus
- Disabled state prevents interaction
- Loading state disables interaction

---

### Card

Container component for grouping related content with elevation.

#### Props

```tsx
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  variant?: "default" | "elevated" | "outlined";
}
```

#### Props Table

| Prop       | Type                                     | Required | Default     | Description          |
| ---------- | ---------------------------------------- | -------- | ----------- | -------------------- |
| `children` | `React.ReactNode`                        | Yes      | -           | Card content         |
| `hover`    | `boolean`                                | No       | `false`     | Enable hover effects |
| `padding`  | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | No       | `'lg'`      | Internal padding     |
| `variant`  | `'default' \| 'elevated' \| 'outlined'`  | No       | `'default'` | Card style variant   |

#### Subcomponents

- **CardHeader:** Header section with spacing
- **CardTitle:** Title heading (h3)
- **CardDescription:** Subtitle text
- **CardContent:** Main content area
- **CardFooter:** Footer actions area

#### Usage

```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";

<Card hover variant="elevated">
  <CardHeader>
    <CardTitle>Feature Title</CardTitle>
    <CardDescription>Brief description</CardDescription>
  </CardHeader>
  <CardContent>Main content goes here</CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>;
```

---

### ErrorBoundary

React error boundary component with retry functionality for graceful error handling.

#### Props

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}
```

#### Props Table

| Prop       | Type                                           | Required | Default | Description        |
| ---------- | ---------------------------------------------- | -------- | ------- | ------------------ |
| `children` | `React.ReactNode`                              | Yes      | -       | Protected content  |
| `fallback` | `React.ReactNode`                              | No       | -       | Custom fallback UI |
| `onError`  | `(error: Error, errorInfo: ErrorInfo) => void` | No       | -       | Error callback     |
| `onReset`  | `() => void`                                   | No       | -       | Reset callback     |

#### Usage

```tsx
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Basic usage
<ErrorBoundary>
  <ProblematicComponent />
</ErrorBoundary>

// With custom fallback and error handling
<ErrorBoundary
  fallback={<div>Something went wrong</div>}
  onError={(error) => console.error('Caught error:', error)}
  onReset={() => window.location.reload()}
>
  <App />
</ErrorBoundary>
```

#### Features

- Catches JavaScript errors in child component tree
- Displays fallback UI when error occurs
- Retry button to attempt recovery
- Error logging callback for monitoring
- Reset callback for cleanup

---

### Input

Text input field with label, error states, and icon support.

#### Props

```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
```

#### Props Table

| Prop          | Type              | Required | Default  | Description        |
| ------------- | ----------------- | -------- | -------- | ------------------ |
| `label`       | `string`          | No       | -        | Input label        |
| `error`       | `string`          | No       | -        | Error message      |
| `leftIcon`    | `React.ReactNode` | No       | -        | Icon on left side  |
| `rightIcon`   | `React.ReactNode` | No       | -        | Icon on right side |
| `type`        | `string`          | No       | `'text'` | Input type         |
| `placeholder` | `string`          | No       | -        | Placeholder text   |
| `disabled`    | `boolean`         | No       | `false`  | Disable input      |

#### Usage

```tsx
import { Input } from '@/components/ui/Input';

// Basic input
<Input
  label="Email"
  placeholder="you@example.com"
  type="email"
/>

// With error
<Input
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
/>

// With icons
<Input
  label="Search"
  placeholder="Search..."
  leftIcon={<SearchIcon />}
/>
```

#### Accessibility

- Label associated with input via htmlFor
- Error announced to screen readers via aria-describedby
- Error state indicated via aria-invalid
- Keyboard navigation support

---

### MagicLinkForm

Email-based magic link authentication form for passwordless login.

#### Props

```tsx
interface MagicLinkFormProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  className?: string;
}
```

#### Props Table

| Prop         | Type                     | Required | Default | Description            |
| ------------ | ------------------------ | -------- | ------- | ---------------------- |
| `onSuccess`  | `() => void`             | No       | -       | Success callback       |
| `onError`    | `(error: Error) => void` | No       | -       | Error callback         |
| `redirectTo` | `string`                 | No       | -       | Post-auth redirect URL |
| `className`  | `string`                 | No       | -       | Additional CSS classes |

#### Usage

```tsx
import { MagicLinkForm } from "@/components/ui/MagicLinkForm";

<MagicLinkForm
  onSuccess={() => toast.success("Check your email!")}
  onError={(error) => toast.error(error.message)}
  redirectTo="/editor"
/>;
```

#### Features

- Email input with validation
- Loading state during submission
- Success message after sending link
- Error handling with user feedback
- Integrates with Supabase Auth

---

### Modal

Centered dialog overlay for focused interactions.

#### Props

```tsx
interface ModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}
```

#### Props Table

| Prop           | Type                      | Required | Default | Description               |
| -------------- | ------------------------- | -------- | ------- | ------------------------- |
| `open`         | `boolean`                 | No       | -       | Controlled open state     |
| `onOpenChange` | `(open: boolean) => void` | No       | -       | Open state change handler |
| `children`     | `React.ReactNode`         | Yes      | -       | Modal content             |
| `title`        | `string`                  | No       | -       | Modal title               |
| `description`  | `string`                  | No       | -       | Modal description         |
| `className`    | `string`                  | No       | -       | Additional CSS classes    |

#### Usage

```tsx
import { Modal, ModalTrigger, ModalClose } from "@/components/ui/Modal";

const [isOpen, setIsOpen] = useState(false);

<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Confirm Action"
  description="This action cannot be undone."
>
  <div className="space-y-4">
    <p>Are you sure you want to proceed?</p>
    <div className="flex gap-2">
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </div>
  </div>
</Modal>;
```

#### Accessibility

- Focus trap within modal
- Escape key to close
- Click outside to close
- Screen reader announcements
- Close button in top-right

---

### OAuthButtons

Social login buttons for OAuth authentication providers.

#### Props

```tsx
interface OAuthButtonsProps {
  providers?: ("google" | "apple" | "github")[];
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  redirectTo?: string;
  className?: string;
}
```

#### Props Table

| Prop         | Type                                  | Required | Default               | Description             |
| ------------ | ------------------------------------- | -------- | --------------------- | ----------------------- |
| `providers`  | `('google' \| 'apple' \| 'github')[]` | No       | `['google', 'apple']` | OAuth providers to show |
| `onSuccess`  | `() => void`                          | No       | -                     | Success callback        |
| `onError`    | `(error: Error) => void`              | No       | -                     | Error callback          |
| `redirectTo` | `string`                              | No       | -                     | Post-auth redirect URL  |
| `className`  | `string`                              | No       | -                     | Additional CSS classes  |

#### Usage

```tsx
import { OAuthButtons } from "@/components/ui/OAuthButtons";

<OAuthButtons
  providers={["google", "apple"]}
  onError={(error) => toast.error(error.message)}
  redirectTo="/editor"
/>;
```

#### Features

- Google OAuth integration
- Apple Sign-In integration
- Provider-specific icons and styling
- Loading states during auth flow
- Error handling
- Integrates with Supabase Auth

---

### Slider

Range input slider for numeric value adjustment.

#### Props

```tsx
interface SliderProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}
```

#### Props Table

| Prop             | Type                        | Required | Default | Description           |
| ---------------- | --------------------------- | -------- | ------- | --------------------- |
| `label`          | `string`                    | No       | -       | Slider label          |
| `showValue`      | `boolean`                   | No       | `false` | Display current value |
| `valueFormatter` | `(value: number) => string` | No       | -       | Format value display  |
| `min`            | `number`                    | No       | `0`     | Minimum value         |
| `max`            | `number`                    | No       | `100`   | Maximum value         |
| `step`           | `number`                    | No       | `1`     | Step increment        |
| `value`          | `number`                    | No       | -       | Controlled value      |
| `defaultValue`   | `number`                    | No       | `min`   | Default value         |

#### Usage

```tsx
import { Slider } from '@/components/ui/Slider';

// Basic slider
<Slider
  label="Opacity"
  min={0}
  max={100}
  defaultValue={100}
/>

// With value display and formatter
<Slider
  label="Scale"
  showValue
  min={0.5}
  max={2}
  step={0.01}
  value={scale}
  onChange={(e) => setScale(Number(e.target.value))}
  valueFormatter={(val) => `${(val * 100).toFixed(0)}%`}
/>
```

---

### SvoltaLogo

Brand logo component with size variants and optional text.

#### Props

```tsx
interface SvoltaLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  className?: string;
}
```

#### Props Table

| Prop        | Type                           | Required | Default | Description            |
| ----------- | ------------------------------ | -------- | ------- | ---------------------- |
| `size`      | `'sm' \| 'md' \| 'lg' \| 'xl'` | No       | `'md'`  | Logo size              |
| `showText`  | `boolean`                      | No       | `true`  | Show "Svolta" text     |
| `className` | `string`                       | No       | -       | Additional CSS classes |

#### Size Variants

| Size | Icon Size | Use Case              |
| ---- | --------- | --------------------- |
| `sm` | 24px      | Navbar, compact areas |
| `md` | 32px      | Default, headers      |
| `lg` | 48px      | Hero sections         |
| `xl` | 64px      | Landing page          |

#### Usage

```tsx
import { SvoltaLogo } from '@/components/ui/SvoltaLogo';

// Default with text
<SvoltaLogo />

// Large icon only
<SvoltaLogo size="lg" showText={false} />

// Small in navbar
<SvoltaLogo size="sm" />
```

#### Features

- SVG-based for crisp rendering at all sizes
- Instagram gradient brand colors
- Optional text with custom font
- Dark mode support

---

### Toggle

Switch component for boolean states.

#### Props

```tsx
interface ToggleProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  description?: string;
}
```

#### Props Table

| Prop             | Type                       | Required | Default | Description              |
| ---------------- | -------------------------- | -------- | ------- | ------------------------ |
| `label`          | `string`                   | No       | -       | Toggle label             |
| `description`    | `string`                   | No       | -       | Helper text              |
| `checked`        | `boolean`                  | No       | -       | Controlled checked state |
| `defaultChecked` | `boolean`                  | No       | `false` | Default checked state    |
| `onChange`       | `(e: ChangeEvent) => void` | No       | -       | Change handler           |
| `disabled`       | `boolean`                  | No       | `false` | Disable toggle           |

#### Usage

```tsx
import { Toggle } from '@/components/ui/Toggle';

// Basic toggle
<Toggle
  label="Show Landmarks"
  checked={showLandmarks}
  onChange={(e) => setShowLandmarks(e.target.checked)}
/>

// With description
<Toggle
  label="Email Notifications"
  description="Receive email updates about your exports"
  defaultChecked
/>
```

#### Accessibility

- Checkbox semantics with switch styling
- Label associated with input
- Keyboard toggle with Space
- Focus indicator

---

### SegmentedControl

Apple-style segmented control for tab-like selection.

#### Props

```tsx
interface SegmentedControlOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}
```

#### Props Table

| Prop            | Type                       | Required | Default | Description              |
| --------------- | -------------------------- | -------- | ------- | ------------------------ |
| `options`       | `SegmentedControlOption[]` | Yes      | -       | Available options        |
| `value`         | `string`                   | No       | -       | Controlled value         |
| `defaultValue`  | `string`                   | No       | -       | Default selected value   |
| `onValueChange` | `(value: string) => void`  | No       | -       | Selection change handler |
| `size`          | `'sm' \| 'md'`             | No       | `'md'`  | Control size             |
| `fullWidth`     | `boolean`                  | No       | `true`  | Expand to full width     |

#### Usage

```tsx
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const alignmentOptions = [
  { value: "shoulders", label: "Shoulders" },
  { value: "hips", label: "Hips" },
  { value: "feet", label: "Feet" },
];

<SegmentedControl
  options={alignmentOptions}
  value={alignment}
  onValueChange={setAlignment}
/>;
```

---

### BottomSheet

Mobile-optimized slide-up drawer dialog.

#### Props

```tsx
interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}
```

#### Props Table

| Prop           | Type                      | Required | Default | Description               |
| -------------- | ------------------------- | -------- | ------- | ------------------------- |
| `open`         | `boolean`                 | No       | -       | Controlled open state     |
| `onOpenChange` | `(open: boolean) => void` | No       | -       | Open state change handler |
| `children`     | `React.ReactNode`         | Yes      | -       | Sheet content             |
| `title`        | `string`                  | No       | -       | Sheet title               |
| `description`  | `string`                  | No       | -       | Sheet description         |

#### Usage

```tsx
import { BottomSheet } from "@/components/ui/BottomSheet";

<BottomSheet open={isOpen} onOpenChange={setIsOpen} title="Export Options">
  <div className="space-y-4">{/* Sheet content */}</div>
</BottomSheet>;
```

#### Features

- Drag handle at top
- Glassmorphism background
- Slide-up animation
- Backdrop blur
- Mobile-optimized

---

### UpgradePrompt

Modal prompting users to upgrade to Pro plan.

#### Props

```tsx
interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: "limit" | "watermark" | "format" | "logo";
}
```

#### Props Table

| Prop      | Type                                           | Required | Default | Description     |
| --------- | ---------------------------------------------- | -------- | ------- | --------------- |
| `isOpen`  | `boolean`                                      | Yes      | -       | Open state      |
| `onClose` | `() => void`                                   | Yes      | -       | Close handler   |
| `trigger` | `'limit' \| 'watermark' \| 'format' \| 'logo'` | Yes      | -       | Trigger context |

#### Trigger Messages

- **limit:** "You've used all 5 free exports this month"
- **watermark:** "Remove the Svolta watermark"
- **format:** "Unlock all export formats"
- **logo:** "Add your own logo to exports"

#### Usage

```tsx
import { UpgradePrompt } from "@/components/ui/UpgradePrompt";

<UpgradePrompt
  isOpen={showUpgrade}
  onClose={() => setShowUpgrade(false)}
  trigger="limit"
/>;
```

#### Features

- Context-aware messaging
- Pro features list
- Call-to-action button
- Link to upgrade page

---

## Feature Components

### DropZone

Drag-and-drop photo upload with HEIC conversion and validation.

#### Props

```tsx
interface DropZoneProps {
  label: string;
  onImageLoad: (photo: Photo) => void;
  photo?: Photo | null;
  className?: string;
}
```

#### Props Table

| Prop          | Type                     | Required | Default | Description                      |
| ------------- | ------------------------ | -------- | ------- | -------------------------------- |
| `label`       | `string`                 | Yes      | -       | Drop zone label (e.g., "Before") |
| `onImageLoad` | `(photo: Photo) => void` | Yes      | -       | Photo load callback              |
| `photo`       | `Photo \| null`          | No       | -       | Current photo                    |
| `className`   | `string`                 | No       | -       | Additional CSS classes           |

#### Usage

```tsx
import { DropZone } from "@/components/features/editor/DropZone";

<DropZone label="Before" onImageLoad={handleBeforePhoto} photo={beforePhoto} />;
```

#### Features

- Drag-and-drop file upload
- Click to select file
- HEIC to JPEG conversion (client-side)
- Image validation (type, size)
- Automatic scaling to max 2048px
- Loading state during processing
- Error handling and display

#### Validation Rules

- Supported formats: JPEG, PNG, WebP, HEIC
- Maximum file size: 10MB
- Automatic downscaling if too large
- Error messages for invalid files

---

### ExportModal

Export dialog with format selection and watermark options.

#### Props

```tsx
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

#### Props Table

| Prop      | Type         | Required | Default | Description      |
| --------- | ------------ | -------- | ------- | ---------------- |
| `isOpen`  | `boolean`    | Yes      | -       | Modal open state |
| `onClose` | `() => void` | Yes      | -       | Close handler    |

#### Format Options

| Format | Aspect Ratio | Free/Pro |
| ------ | ------------ | -------- |
| 4:5    | Portrait     | Free     |
| 1:1    | Square       | Free     |
| 9:16   | Story        | Pro      |

#### Usage

```tsx
import { ExportModal } from "@/components/features/editor/ExportModal";

<ExportModal isOpen={showExport} onClose={() => setShowExport(false)} />;
```

#### Features

- Format selection (4:5, 1:1, 9:16)
- Label toggle (Before/After text)
- Usage limit display
- Pro feature gating
- Watermark for free users
- Download with filename
- Error handling

#### State Integration

Connects to:

- `useEditorStore` - Photo and alignment data
- `useUserStore` - Pro status
- `useUsageLimit` - Export tracking
- `useCanvasExport` - Export logic

---

### AlignmentControls

Comprehensive alignment controls panel for photo adjustment.

#### Props

```tsx
interface AlignmentControlsProps {
  className?: string;
  onAutoAlign?: () => void;
}
```

#### Props Table

| Prop          | Type         | Required | Default | Description            |
| ------------- | ------------ | -------- | ------- | ---------------------- |
| `className`   | `string`     | No       | -       | Additional CSS classes |
| `onAutoAlign` | `() => void` | No       | -       | Auto-align callback    |

#### Usage

```tsx
import { AlignmentControls } from "@/components/features/editor/AlignmentControls";

<AlignmentControls onAutoAlign={handleAutoAlign} />;
```

#### Sections

1. **Anchor Selection**
   - Shoulders, Hips, or Feet alignment
   - SegmentedControl UI

2. **Scale Adjustment**
   - Slider with value display (0.5x - 2.0x)
   - +/- buttons with fine-tuning (Shift + Click)
   - Direct numeric input

3. **Position Adjustment**
   - X/Y offset controls
   - Arrow buttons with fine-tuning
   - Direct numeric input
   - Reset button

4. **Display Options**
   - Show Landmarks toggle
   - Show Grid toggle
   - Linked Zoom toggle

#### Keyboard Shortcuts

- **Arrow Keys:** Adjust position (1px)
- **Shift + Arrows:** Adjust position (10px)
- **+/-:** Adjust scale (0.01)
- **Shift +/-:** Adjust scale (0.1)

#### State Integration

Connects to `useEditorStore`:

- `alignment` - Current alignment settings
- `showLandmarks` - Landmark visibility
- `showGrid` - Grid visibility
- `linkedZoom` - Linked zoom state

---

### PhotoPanel

Single photo display panel with landmark overlay.

#### Props

```tsx
interface PhotoPanelProps {
  label: string;
  photo: Photo | null;
  onPhotoChange: (photo: Photo | null) => void;
  onLandmarksDetected: (landmarks: Landmark[] | null) => void;
  showLandmarks: boolean;
  className?: string;
}
```

#### Props Table

| Prop                  | Type                                      | Required | Default | Description                  |
| --------------------- | ----------------------------------------- | -------- | ------- | ---------------------------- |
| `label`               | `string`                                  | Yes      | -       | Panel label (e.g., "Before") |
| `photo`               | `Photo \| null`                           | Yes      | -       | Current photo                |
| `onPhotoChange`       | `(photo: Photo \| null) => void`          | Yes      | -       | Photo change handler         |
| `onLandmarksDetected` | `(landmarks: Landmark[] \| null) => void` | Yes      | -       | Landmarks detected handler   |
| `showLandmarks`       | `boolean`                                 | Yes      | -       | Show landmark overlay        |
| `className`           | `string`                                  | No       | -       | Additional CSS classes       |

#### Usage

```tsx
import { PhotoPanel } from "@/components/features/editor/PhotoPanel";

<PhotoPanel
  label="Before"
  photo={beforePhoto}
  onPhotoChange={setBeforePhoto}
  onLandmarksDetected={setBeforeLandmarks}
  showLandmarks={showLandmarks}
/>;
```

#### Features

- DropZone integration for photo upload
- Automatic pose detection on photo load
- Landmark overlay rendering
- Alignment transformation (for "After" photo)
- Responsive container sizing
- Error handling for pose detection

#### Alignment Transform

The "After" photo applies alignment transform:

- Scale based on `alignment.scale`
- Translate based on `alignment.offsetX/offsetY`
- Anchor-based positioning

---

### LandmarkOverlay

SVG overlay displaying pose landmarks and skeleton.

#### Props

```tsx
interface LandmarkOverlayProps {
  landmarks: Landmark[] | null;
  width: number;
  height: number;
  visible: boolean;
  className?: string;
  style?: React.CSSProperties;
}
```

#### Props Table

| Prop        | Type                  | Required | Default | Description            |
| ----------- | --------------------- | -------- | ------- | ---------------------- |
| `landmarks` | `Landmark[] \| null`  | Yes      | -       | MediaPipe landmarks    |
| `width`     | `number`              | Yes      | -       | Overlay width          |
| `height`    | `number`              | Yes      | -       | Overlay height         |
| `visible`   | `boolean`             | Yes      | -       | Visibility toggle      |
| `className` | `string`              | No       | -       | Additional CSS classes |
| `style`     | `React.CSSProperties` | No       | -       | Inline styles          |

#### Usage

```tsx
import { LandmarkOverlay } from "@/components/features/editor/LandmarkOverlay";

<LandmarkOverlay
  landmarks={landmarks}
  width={containerWidth}
  height={containerHeight}
  visible={showLandmarks}
/>;
```

#### Visualization

**Landmarks:**

- Green circles (visibility > 0.7)
- Yellow circles (visibility > 0.5)
- Red circles (visibility ≤ 0.5)
- 6px radius with 2px white border

**Skeleton Lines:**

- Shoulders connection
- Torso (shoulders to hips)
- Hips connection
- Left/right legs (hip → knee → ankle)
- 2px stroke width
- White color with 50% opacity

#### Landmark Indices

Key landmarks for alignment:

- **Shoulders:** Left (11), Right (12)
- **Hips:** Left (23), Right (24)
- **Ankles:** Left (27), Right (28)
- **Knees:** Left (25), Right (26)

#### Visibility Thresholds

- **High:** > 0.7 (green)
- **Medium:** > 0.5 (yellow)
- **Low:** ≤ 0.5 (red)
- Minimum visibility for rendering: 0.5

---

### AlignedPreview

Combined before/after preview component with side-by-side or split view modes.

#### Props

```tsx
interface AlignedPreviewProps {
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  alignment: AlignmentSettings;
  className?: string;
}
```

#### Props Table

| Prop          | Type                | Required | Default | Description             |
| ------------- | ------------------- | -------- | ------- | ----------------------- |
| `beforePhoto` | `Photo \| null`     | Yes      | -       | Before photo            |
| `afterPhoto`  | `Photo \| null`     | Yes      | -       | After photo             |
| `alignment`   | `AlignmentSettings` | Yes      | -       | Alignment configuration |
| `className`   | `string`            | No       | -       | Additional CSS classes  |

#### Usage

```tsx
import { AlignedPreview } from "@/components/features/editor/AlignedPreview";

<AlignedPreview
  beforePhoto={beforePhoto}
  afterPhoto={afterPhoto}
  alignment={alignment}
/>;
```

#### Features

- Side-by-side comparison view
- Synchronized zoom and pan
- Alignment transformation applied
- Responsive layout

---

### BackgroundSettings

Background removal and custom background controls with image upload.

#### Props

```tsx
interface BackgroundSettingsProps {
  className?: string;
}
```

#### Props Table

| Prop        | Type     | Required | Default | Description            |
| ----------- | -------- | -------- | ------- | ---------------------- |
| `className` | `string` | No       | -       | Additional CSS classes |

#### Usage

```tsx
import { BackgroundSettings } from "@/components/features/editor/BackgroundSettings";

<BackgroundSettings />;
```

#### Features

- Toggle background removal on/off
- Custom background image upload
- Background color picker
- Pro feature gating
- Integrates with @imgly/background-removal
- State managed via useEditorStore

#### State Integration

Connects to `useEditorStore`:

- `removeBackground` - Background removal toggle
- `customBackground` - Custom background image/color
- `setRemoveBackground()` - Toggle handler
- `setCustomBackground()` - Background setter

---

### GifPreview

Animated GIF preview component with style selection and export controls.

#### Props

```tsx
interface GifPreviewProps {
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  alignment: AlignmentSettings;
  className?: string;
}
```

#### Props Table

| Prop          | Type                | Required | Default | Description             |
| ------------- | ------------------- | -------- | ------- | ----------------------- |
| `beforePhoto` | `Photo \| null`     | Yes      | -       | Before photo            |
| `afterPhoto`  | `Photo \| null`     | Yes      | -       | After photo             |
| `alignment`   | `AlignmentSettings` | Yes      | -       | Alignment configuration |
| `className`   | `string`            | No       | -       | Additional CSS classes  |

#### Usage

```tsx
import { GifPreview } from "@/components/features/editor/GifPreview";

<GifPreview
  beforePhoto={beforePhoto}
  afterPhoto={afterPhoto}
  alignment={alignment}
/>;
```

#### Features

- 3 animation styles: Fade, Slide, Flip
- Real-time GIF preview
- Export to animated GIF
- Pro feature gating
- Integrates with useGifExport hook

#### Animation Styles

- **Fade:** Cross-fade transition between photos
- **Slide:** Horizontal slide transition
- **Flip:** 3D flip effect

---

### MediaPipeLoader

Loading state component for MediaPipe initialization with progress indication.

#### Props

```tsx
interface MediaPipeLoaderProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}
```

#### Props Table

| Prop        | Type             | Required | Default | Description            |
| ----------- | ---------------- | -------- | ------- | ---------------------- |
| `isLoading` | `boolean`        | Yes      | -       | Loading state          |
| `error`     | `string \| null` | No       | -       | Error message          |
| `onRetry`   | `() => void`     | No       | -       | Retry callback         |
| `className` | `string`         | No       | -       | Additional CSS classes |

#### Usage

```tsx
import { MediaPipeLoader } from "@/components/features/editor/MediaPipeLoader";

<MediaPipeLoader
  isLoading={isLoadingMediaPipe}
  error={mediaPipeError}
  onRetry={handleRetry}
/>;
```

#### Features

- Loading spinner with message
- Error state with retry button
- Progress indication
- Self-hosting status display
- Integrates with MediaPipeProvider

---

## Related Documentation

- [Architecture Overview](/docs/architecture/README.md)
- [Editor State Management](/docs/architecture/state-management.md)
- [Alignment Algorithm](/docs/alignment-algorithm.md)
- [Design Standards](/docs/standards/design-system.md)

---

**Last Updated:** 2026-01-04
**Maintained By:** Development Team
**Questions:** See project README or Linear board
