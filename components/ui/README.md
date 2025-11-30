# UI Primitives

Core UI components for PoseProof with Apple-style design.

## Components

### Button
A versatile button component with three variants and loading states.

**Variants:** `primary`, `secondary`, `ghost`
**Sizes:** `sm`, `md`, `lg`

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md">
  Click me
</Button>

<Button variant="secondary" loading>
  Loading...
</Button>
```

### Input
Text input with optional label, error states, and icon support.

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  placeholder="Enter your email"
  error="Invalid email address"
/>

<Input
  leftIcon={<SearchIcon />}
  placeholder="Search..."
/>
```

### Modal
Accessible modal dialog using Radix UI with backdrop blur and scale animations.

```tsx
import { Modal } from '@/components/ui';

<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
>
  <div>Modal content goes here</div>
</Modal>
```

### Card
Container component with optional hover effects and flexible padding.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

<Card hover padding="lg">
  <CardHeader>
    <CardTitle>Feature Title</CardTitle>
    <CardDescription>Brief description of the feature</CardDescription>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

### Slider
Range slider with optional value display and custom formatting.

```tsx
import { Slider } from '@/components/ui';

<Slider
  label="Opacity"
  showValue
  min={0}
  max={100}
  defaultValue={50}
  valueFormatter={(val) => `${val}%`}
/>
```

### Toggle
Apple-style toggle switch with label and description support.

```tsx
import { Toggle } from '@/components/ui';

<Toggle
  label="Dark Mode"
  description="Enable dark theme"
  defaultChecked={false}
/>
```

## Design Tokens

All components use CSS custom properties for theming:

- `--surface-primary`, `--surface-secondary`, `--surface-tertiary`
- `--text-primary`, `--text-secondary`, `--text-tertiary`
- `--brand-primary`, `--brand-secondary`
- `--border-default`, `--border-focus`
- `--success`, `--error`, `--warning`, `--info`
- `--ease-apple` (cubic-bezier timing function)

## Features

- Full TypeScript support with proper types
- Dark mode support via CSS variables
- Accessible with ARIA attributes
- Apple-style animations and easing
- `forwardRef` support for all components
- Consistent API across components
