# Code Style Standards

**Version:** 1.0.0
**Last Updated:** 2025-12-22
**Scope:** All TypeScript, React, and CSS code in Svolta project

## Overview

This document defines coding standards for Svolta to ensure consistency, maintainability, and quality across the codebase. Following these standards improves code readability, reduces bugs, and accelerates development.

**Key Principles:**

- **Consistency over preference** - Follow established patterns
- **Readability first** - Code is read more than written
- **Type safety** - Leverage TypeScript's full power
- **Performance** - Optimize for production build
- **Accessibility** - Build inclusive user experiences

## Table of Contents

1. [TypeScript](#typescript)
2. [React Components](#react-components)
3. [Tailwind CSS](#tailwind-css)
4. [State Management](#state-management)
5. [File Organization](#file-organization)
6. [Code Quality](#code-quality)

---

## TypeScript

### Strict Mode Requirements

**Svolta uses TypeScript strict mode** (`"strict": true` in tsconfig.json). This enforces:

- No implicit `any` types
- Strict null checks
- Strict function types
- Strict bind/call/apply

✅ **CORRECT:**

```typescript
// Explicit types, no implicit any
interface User {
  id: string;
  name: string;
  email: string | null;
}

function getUser(id: string): User | null {
  // Implementation
}
```

❌ **WRONG:**

```typescript
// Implicit any, loose typing
function getUser(id) {
  // Implementation
}

let user = getUser("123"); // user is implicitly any
```

### Interface vs Type Usage

**Rule:** Use `interface` for object shapes, `type` for unions, intersections, and primitives.

✅ **CORRECT:**

```typescript
// Interface for object shapes
interface ButtonProps {
  variant: "primary" | "secondary";
  size: "sm" | "md" | "lg";
  onClick?: () => void;
}

// Type for unions and utility types
type AlignmentAnchor = "shoulders" | "hips" | "knees" | "ankles";
type Nullable<T> = T | null;
type ReadonlyPhoto = Readonly<Photo>;
```

❌ **WRONG:**

```typescript
// Type instead of interface for objects
type ButtonProps = {
  variant: string;
  size: string;
};

// Interface for union types
interface AlignmentAnchor {
  value: "shoulders" | "hips";
}
```

### Type Inference Guidelines

**Rule:** Let TypeScript infer types when obvious, be explicit when needed for clarity or API boundaries.

✅ **CORRECT:**

```typescript
// Infer simple assignments
const count = 0; // inferred as number
const isActive = true; // inferred as boolean

// Explicit types for function parameters and returns
function calculateOffset(
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: width / 2, y: height / 2 };
}

// Explicit types for exported APIs
export const ALIGNMENT_ANCHORS: readonly AlignmentAnchor[] = [
  "shoulders",
  "hips",
  "knees",
  "ankles",
] as const;
```

❌ **WRONG:**

```typescript
// Over-explicit on obvious types
const count: number = 0;
const isActive: boolean = true;

// Missing return types on public functions
export function calculateOffset(width, height) {
  return { x: width / 2, y: height / 2 };
}
```

### Explicit Return Types

**Rule:** Always specify return types for:

- Exported functions
- React component functions
- Store actions
- Utility functions

✅ **CORRECT:**

```typescript
// Exported functions with explicit return type
export function detectPose(
  image: HTMLImageElement
): Promise<Landmark[] | null> {
  // Implementation
}

// React components with explicit return type
export function Button({ children, ...props }: ButtonProps): JSX.Element {
  return <button {...props}>{children}</button>;
}
```

❌ **WRONG:**

```typescript
// No return type on exported function
export function detectPose(image: HTMLImageElement) {
  // Return type unclear
}

// No return type on component
export function Button({ children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>;
}
```

---

## React Components

### Function Components Only

**Rule:** Use function components exclusively. No class components.

✅ **CORRECT:**

```typescript
import * as React from 'react';

interface PhotoCardProps {
  photo: Photo;
  onSelect: () => void;
}

export function PhotoCard({ photo, onSelect }: PhotoCardProps): JSX.Element {
  return (
    <div onClick={onSelect}>
      <img src={photo.url} alt={photo.name} />
    </div>
  );
}
```

❌ **WRONG:**

```typescript
// Class components are not allowed
class PhotoCard extends React.Component<PhotoCardProps> {
  render() {
    return <div>...</div>;
  }
}
```

### Props Interface Naming

**Rule:** Name props interfaces as `ComponentNameProps`. Always export the interface.

✅ **CORRECT:**

```typescript
// Consistent naming pattern
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant,
  size,
  loading,
  children,
}: ButtonProps): JSX.Element {
  // Implementation
}
```

❌ **WRONG:**

```typescript
// Inconsistent naming
interface IButton {
  variant?: string;
}

// Inline props without interface
export function Button({ variant, size }: { variant?: string; size?: string }) {
  // Implementation
}
```

### Component File Structure

**Rule:** Follow this consistent structure in all component files:

```typescript
// 1. Imports
import * as React from 'react';
import { cn } from '@/lib/utils';

// 2. Types/Interfaces
export interface ComponentNameProps {
  // Props definition
}

// 3. Constants (if needed)
const VARIANTS = {
  primary: 'bg-gradient...',
  secondary: 'bg-gray-100...',
} as const;

// 4. Component Implementation
export function ComponentName({
  prop1,
  prop2,
  ...props
}: ComponentNameProps): JSX.Element {
  // 4a. Hooks (in order: state, effects, custom)
  const [state, setState] = React.useState(initialValue);

  React.useEffect(() => {
    // Side effects
  }, [dependencies]);

  const customHook = useCustomHook();

  // 4b. Event handlers
  const handleClick = () => {
    // Handler logic
  };

  // 4c. Computed values
  const computedValue = React.useMemo(() => {
    return expensive(prop1);
  }, [prop1]);

  // 4d. Render
  return (
    <div className={cn('base-styles', className)}>
      {children}
    </div>
  );
}

// 5. Display name (for forwardRef components)
ComponentName.displayName = 'ComponentName';
```

✅ **CORRECT:**

```typescript
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', loading, children, ...props }, ref) => {
    // Hooks first
    const [isPending, setIsPending] = React.useState(false);

    // Event handlers
    const handleClick = () => {
      setIsPending(true);
    };

    // Computed values
    const styles = React.useMemo(() => ({
      primary: 'bg-gradient...',
      secondary: 'bg-gray-100...',
    }[variant]), [variant]);

    // Render
    return (
      <button
        ref={ref}
        className={cn(styles, className)}
        onClick={handleClick}
        disabled={loading || isPending}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

❌ **WRONG:**

```typescript
// Disorganized structure, hooks after conditionals
export function Button(props) {
  const handleClick = () => {
    // Event handler before hooks
  };

  if (!props.variant) return null; // Early return before hooks

  const [state, setState] = useState(0); // Hooks after conditional

  return <button>...</button>;
}
```

### Hooks Order

**Rule:** Always declare hooks in this order:

1. `useState`
2. `useReducer`
3. `useEffect` / `useLayoutEffect`
4. `useMemo`
5. `useCallback`
6. Custom hooks
7. `useRef`

✅ **CORRECT:**

```typescript
export function PhotoEditor(): JSX.Element {
  // 1. State hooks
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  // 2. Effects
  React.useEffect(() => {
    // Side effect
  }, []);

  // 3. Memoized values
  const transformedImage = React.useMemo(() => {
    return applyTransform(image, zoom, offset);
  }, [image, zoom, offset]);

  // 4. Callbacks
  const handleZoom = React.useCallback((delta: number) => {
    setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
  }, []);

  // 5. Custom hooks
  const { landmarks, isDetecting } = usePoseDetection(image);

  // 6. Refs
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  return (
    <canvas ref={canvasRef} />
  );
}
```

❌ **WRONG:**

```typescript
export function PhotoEditor() {
  // Wrong order - custom hook before useState
  const { landmarks } = usePoseDetection(image);
  const [zoom, setZoom] = useState(1);

  // Ref before callback
  const canvasRef = useRef(null);
  const handleZoom = useCallback(() => {}, []);

  return <canvas />;
}
```

---

## Tailwind CSS

### Class Ordering Convention

**Rule:** Order Tailwind classes following this pattern:

1. Layout (display, position)
2. Box model (width, height, padding, margin)
3. Typography (font, text)
4. Visual (background, border, shadow)
5. Interactions (hover, focus, active)
6. Animations (transition, animate)

✅ **CORRECT:**

```tsx
// Logical class ordering
<button
  className={cn(
    // Layout
    "relative inline-flex items-center justify-center",
    // Box model
    "h-12 px-6",
    // Typography
    "font-semibold text-base",
    // Visual
    "bg-instagram-gradient text-white rounded-full shadow-soft",
    // Interactions
    "hover:shadow-glow active:scale-[0.98]",
    // Animations
    "transition-all duration-200 ease-out",
    // State variants
    "disabled:opacity-50 disabled:pointer-events-none",
    // Custom
    className,
  )}
>
  {children}
</button>
```

❌ **WRONG:**

```tsx
// Random ordering - hard to maintain
<button className="text-white shadow-soft inline-flex px-6 bg-instagram-gradient rounded-full h-12 font-semibold hover:shadow-glow items-center">
  {children}
</button>
```

### Design Tokens Usage

**Rule:** Use CSS custom properties (design tokens) instead of hardcoded values. Reference `app/globals.css` for available tokens.

✅ **CORRECT:**

```tsx
// Use design tokens from globals.css
<div className="bg-surface-primary text-text-primary border-border-default">
  <h1 className="text-gray-900 dark:text-gray-50">Title</h1>
</div>

// Or use Tailwind's semantic classes
<div className="bg-white dark:bg-black text-text border-border">
  Content
</div>
```

❌ **WRONG:**

```tsx
// Hardcoded colors instead of tokens
<div className="bg-[#FFFFFF] text-[#262626] border-[#DBDBDB]">
  Content
</div>

// Missing dark mode variants
<div className="bg-white text-black">
  Content
</div>
```

### Apple-Style Design Patterns

**Rule:** Follow Svolta's Instagram-inspired, Apple-style design system:

- **Pill buttons:** Use `rounded-full` for buttons
- **Generous spacing:** `p-8`, `p-12`, `gap-6`
- **Subtle animations:** `transition-all duration-200 ease-out`
- **Layered shadows:** `shadow-soft`, `shadow-glow`
- **Gradient accents:** `bg-instagram-gradient`

✅ **CORRECT:**

```tsx
// Instagram-style pill button with gradient
<button className={cn(
  'inline-flex items-center justify-center',
  'h-12 px-6 rounded-full',
  'bg-instagram-gradient text-white font-semibold',
  'shadow-soft hover:shadow-glow',
  'transition-all duration-200 ease-out',
  'active:scale-[0.98]'
)}>
  Get Started
</button>

// Generous spacing card
<div className="p-8 space-y-6 bg-surface-primary rounded-2xl shadow-soft">
  <h2 className="text-2xl font-bold">Card Title</h2>
  <p className="text-text-secondary">Description</p>
</div>
```

❌ **WRONG:**

```tsx
// Sharp corners, no spacing, harsh transitions
<button className="px-2 py-1 bg-blue-500 rounded">
  Button
</button>

// Tight spacing, no shadows
<div className="p-2 bg-white">
  <h2>Title</h2>
  <p>Text</p>
</div>
```

### Responsive Design Approach

**Rule:** Mobile-first responsive design. Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

✅ **CORRECT:**

```tsx
// Mobile-first with progressive enhancement
<div
  className={cn(
    // Mobile (base)
    "flex flex-col gap-4 p-4",
    // Tablet (md: 768px+)
    "md:flex-row md:gap-6 md:p-6",
    // Desktop (lg: 1024px+)
    "lg:gap-8 lg:p-8",
    // Large desktop (xl: 1280px+)
    "xl:max-w-7xl xl:mx-auto",
  )}
>
  <div className="w-full md:w-1/2">Left</div>
  <div className="w-full md:w-1/2">Right</div>
</div>
```

❌ **WRONG:**

```tsx
// Desktop-first (hard to override on mobile)
<div className="flex-row gap-8 p-8 sm:flex-col sm:gap-2 sm:p-2">
  Content
</div>

// Missing responsive variants
<div className="flex gap-8 p-8">
  Content
</div>
```

---

## State Management

### Zustand Store Patterns

**Rule:** Use Zustand for global state. Follow this store structure:

✅ **CORRECT:**

```typescript
import { create } from "zustand";

// 1. Define state interface
interface EditorState {
  // State properties
  beforePhoto: Photo | null;
  afterPhoto: Photo | null;
  alignment: AlignmentSettings;

  // Actions (with explicit return types)
  setBeforePhoto: (photo: Photo | null) => void;
  setAfterPhoto: (photo: Photo | null) => void;
  updateAlignment: (settings: Partial<AlignmentSettings>) => void;
  reset: () => void;
}

// 2. Define initial state
const initialAlignment: AlignmentSettings = {
  anchor: "shoulders",
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

// 3. Create store
export const useEditorStore = create<EditorState>((set) => ({
  // Initial values
  beforePhoto: null,
  afterPhoto: null,
  alignment: initialAlignment,

  // Actions with immutable updates
  setBeforePhoto: (photo) => set({ beforePhoto: photo }),

  setAfterPhoto: (photo) => set({ afterPhoto: photo }),

  updateAlignment: (settings) =>
    set((state) => ({
      alignment: { ...state.alignment, ...settings },
    })),

  reset: () =>
    set({
      beforePhoto: null,
      afterPhoto: null,
      alignment: initialAlignment,
    }),
}));
```

❌ **WRONG:**

```typescript
// Untyped store
export const useEditorStore = create((set) => ({
  beforePhoto: null,
  setBeforePhoto: (photo) => set({ beforePhoto: photo }),
}));

// Mutable updates
export const useEditorStore = create((set) => ({
  alignment: {},
  updateAlignment: (key, value) =>
    set((state) => {
      state.alignment[key] = value; // Mutating state directly
      return state;
    }),
}));
```

### Selector Patterns

**Rule:** Use selectors to extract specific state values and prevent unnecessary re-renders.

✅ **CORRECT:**

```typescript
// Select only needed state
function PhotoCanvas() {
  const beforePhoto = useEditorStore((state) => state.beforePhoto);
  const alignment = useEditorStore((state) => state.alignment);

  return <canvas>{/* Use beforePhoto and alignment */}</canvas>;
}

// Memoized selector for computed values
const selectIsAlignmentReady = (state: EditorState) =>
  state.beforePhoto !== null && state.afterPhoto !== null;

function ExportButton() {
  const isReady = useEditorStore(selectIsAlignmentReady);

  return <button disabled={!isReady}>Export</button>;
}
```

❌ **WRONG:**

```typescript
// Selecting entire state (causes unnecessary re-renders)
function PhotoCanvas() {
  const state = useEditorStore();

  return <canvas>{/* Uses entire state object */}</canvas>;
}

// No memoization for computed values
function ExportButton() {
  const state = useEditorStore();
  const isReady = state.beforePhoto && state.afterPhoto; // Recomputed on every render

  return <button disabled={!isReady}>Export</button>;
}
```

---

## File Organization

### Naming Conventions

**Rule:** Follow these naming patterns consistently:

| File Type  | Convention                      | Example                                  |
| ---------- | ------------------------------- | ---------------------------------------- |
| Components | PascalCase                      | `Button.tsx`, `PhotoEditor.tsx`          |
| Hooks      | camelCase with `use` prefix     | `useAlignment.ts`, `usePoseDetection.ts` |
| Utilities  | camelCase                       | `canvas.ts`, `imageProcessing.ts`        |
| Types      | PascalCase                      | `editor.ts`, `landmarks.ts`              |
| Stores     | kebab-case with `-store` suffix | `editor-store.ts`, `user-store.ts`       |
| Constants  | SCREAMING_SNAKE_CASE            | `ALIGNMENT_ANCHORS`, `MAX_FILE_SIZE`     |

✅ **CORRECT:**

```
components/
  ui/
    Button.tsx
    Modal.tsx
  features/
    editor/
      PhotoEditor.tsx
      AlignmentControls.tsx

hooks/
  useAlignment.ts
  usePoseDetection.ts
  useKeyboardShortcuts.ts

lib/
  canvas/
    export.ts
    landmarks.ts
  utils/
    imageProcessing.ts
    validation.ts

types/
  editor.ts
  landmarks.ts

stores/
  editor-store.ts
  user-store.ts
```

❌ **WRONG:**

```
components/
  button.tsx           # Should be Button.tsx
  photo_editor.tsx     # Should be PhotoEditor.tsx

hooks/
  alignment.ts         # Should be useAlignment.ts
  UseKeyboard.ts       # Should be useKeyboardShortcuts.ts

stores/
  EditorStore.ts       # Should be editor-store.ts
```

### Directory Structure

**Rule:** Organize files by feature and type:

```
app/                      # Next.js app router
  (auth)/                 # Route groups
  editor/                 # Feature routes
  api/                    # API routes

components/
  ui/                     # Reusable UI primitives
  features/               # Feature-specific components
    editor/
    landing/

hooks/                    # Custom React hooks

lib/                      # Utility functions
  canvas/                 # Canvas utilities
  api/                    # API clients
  utils/                  # General utilities

stores/                   # Zustand stores

types/                    # TypeScript types

public/                   # Static assets
```

### Import Ordering

**Rule:** Order imports in this sequence:

1. External libraries (React, Next.js, third-party)
2. Internal aliases (`@/components`, `@/lib`)
3. Relative imports
4. Type imports
5. Styles

✅ **CORRECT:**

```typescript
// 1. External libraries
import * as React from "react";
import { useRouter } from "next/navigation";
import { create } from "zustand";

// 2. Internal aliases (alphabetical)
import { Button } from "@/components/ui/Button";
import { useAlignment } from "@/hooks/useAlignment";
import { cn } from "@/lib/utils";

// 3. Relative imports
import { PhotoCanvas } from "./PhotoCanvas";
import { AlignmentControls } from "./AlignmentControls";

// 4. Types
import type { Photo, AlignmentSettings } from "@/types/editor";
import type { Landmark } from "@/types/landmarks";

// 5. Styles (if any)
import "./styles.css";
```

❌ **WRONG:**

```typescript
// Mixed ordering
import { Button } from "@/components/ui/Button";
import * as React from "react";
import type { Photo } from "@/types/editor";
import { useRouter } from "next/navigation";
import { PhotoCanvas } from "./PhotoCanvas";
```

---

## Code Quality

### ESLint Rules

**Rule:** Follow Next.js ESLint configuration with TypeScript support.

Current ESLint setup:

```javascript
// eslint.config.mjs
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
```

**Key rules enforced:**

- No unused variables
- No console.log in production (use console.error, console.warn)
- Explicit return types on exported functions
- React hooks rules (exhaustive deps, order)
- Accessibility rules (jsx-a11y)

### Pre-commit Hooks

**Rule:** All code must pass quality checks before commit.

Current pre-commit hook (`.git/hooks/pre-commit`):

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# Type checking
npm run type-check || exit 1

# Linting
npm run lint || exit 1

# Format checking
npm run format:check || exit 1

echo "Pre-commit checks passed!"
```

### Pre-push Hook

**Rule:** Full lint check before pushing to remote.

Current pre-push hook (`.git/hooks/pre-push`):

```bash
#!/bin/bash

echo "Running pre-push checks..."

# Full lint check (includes unused exports)
npm run lint:full || exit 1

echo "Pre-push checks passed!"
```

### Quality Gates

**Automated checks:**

- ✅ TypeScript compilation (`npm run type-check`)
- ✅ ESLint validation (`npm run lint`)
- ✅ Prettier formatting (`npm run format:check`)
- ✅ Build success (`npm run build`)

**Manual code review checklist:**

- [ ] Component follows naming conventions
- [ ] Props interface exported and typed
- [ ] Hooks in correct order
- [ ] Tailwind classes ordered logically
- [ ] Responsive design implemented
- [ ] Dark mode support added
- [ ] Accessibility attributes present
- [ ] Error states handled
- [ ] Loading states shown
- [ ] No console.log statements

---

## Examples

### Complete Component Example

Following all standards:

```typescript
/**
 * Photo upload component with drag-and-drop support
 * Handles HEIC conversion and image scaling
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/stores/editor-store';
import { convertHeicToJpeg, scaleImage } from '@/lib/utils/imageProcessing';
import { cn } from '@/lib/utils';

import type { Photo } from '@/types/editor';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic'] as const;

// Props interface
export interface PhotoUploadProps {
  type: 'before' | 'after';
  className?: string;
  onUpload?: (photo: Photo) => void;
}

/**
 * PhotoUpload component for uploading and processing photos
 */
export function PhotoUpload({
  type,
  className,
  onUpload,
}: PhotoUploadProps): JSX.Element {
  // State hooks
  const [isDragging, setIsDragging] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Store actions
  const setBeforePhoto = useEditorStore((state) => state.setBeforePhoto);
  const setAfterPhoto = useEditorStore((state) => state.setAfterPhoto);

  // Refs
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Memoized values
  const uploadAction = React.useMemo(
    () => (type === 'before' ? setBeforePhoto : setAfterPhoto),
    [type, setBeforePhoto, setAfterPhoto]
  );

  // Event handlers
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileSelect = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await processFile(files[0]);
      }
    },
    []
  );

  const processFile = React.useCallback(
    async (file: File): Promise<void> => {
      setError(null);
      setIsProcessing(true);

      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          throw new Error('File size exceeds 10MB limit');
        }

        // Convert HEIC if needed
        let processedFile = file;
        if (file.type === 'image/heic') {
          processedFile = await convertHeicToJpeg(file);
        }

        // Scale image
        const scaledImage = await scaleImage(processedFile);

        // Create photo object
        const photo: Photo = {
          id: crypto.randomUUID(),
          url: scaledImage,
          name: file.name,
          uploadedAt: new Date(),
          landmarks: null,
        };

        // Update store
        uploadAction(photo);

        // Callback
        onUpload?.(photo);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setError(message);
      } finally {
        setIsProcessing(false);
      }
    },
    [uploadAction, onUpload]
  );

  // Render
  return (
    <div
      className={cn(
        // Layout
        'relative flex flex-col items-center justify-center',
        // Box model
        'w-full h-64 p-8',
        // Visual
        'bg-surface-secondary rounded-2xl border-2 border-dashed',
        isDragging ? 'border-brand-pink' : 'border-border-default',
        // Interactions
        'transition-colors duration-200',
        // Custom
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        aria-label={`Upload ${type} photo`}
      />

      <Upload
        className={cn(
          'w-12 h-12 mb-4',
          isDragging ? 'text-brand-pink' : 'text-text-secondary'
        )}
      />

      <p className="text-text-primary font-medium mb-2">
        Drop your {type} photo here
      </p>

      <p className="text-text-secondary text-sm mb-4">
        or
      </p>

      <Button
        variant="primary"
        size="md"
        loading={isProcessing}
        onClick={() => fileInputRef.current?.click()}
      >
        Choose File
      </Button>

      {error && (
        <p className="absolute bottom-4 text-error text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

PhotoUpload.displayName = 'PhotoUpload';
```

---

## Enforcement

### Automated Enforcement

- ESLint catches style violations
- Prettier enforces formatting
- TypeScript enforces type safety
- Pre-commit hooks prevent bad commits

### Code Review Checklist

Use this checklist during PR reviews:

**TypeScript:**

- [ ] Strict mode compliance
- [ ] Explicit return types on exported functions
- [ ] Proper interface vs type usage
- [ ] No `any` types (unless justified)

**React:**

- [ ] Function components only
- [ ] Props interface named `ComponentNameProps`
- [ ] Hooks in correct order
- [ ] Proper component file structure

**Tailwind:**

- [ ] Classes ordered logically
- [ ] Design tokens used
- [ ] Responsive variants included
- [ ] Dark mode support

**State:**

- [ ] Zustand store properly typed
- [ ] Selectors used to prevent re-renders
- [ ] Immutable updates

**Organization:**

- [ ] Files named correctly
- [ ] Imports ordered properly
- [ ] No circular dependencies

---

**Version:** 1.0.0
**Last Updated:** 2025-12-22
**Maintainer:** Svolta Engineering Team

---

## What NOT to Do

- **No `any` types** — use `unknown` and narrow, or define a proper type
- **No barrel exports** (`index.ts` re-exporting everything) — import directly from source files
- **No default exports** — all exports must be named
- **No CSS-in-JS** — use Tailwind utility classes and design tokens only

## Verification Checklist

- [ ] `npm run lint` returns zero errors
- [ ] No `any` type in new code (TypeScript strict mode passes)
- [ ] All new components use design tokens, not raw hex or pixel values
- [ ] All exports are named (no `export default`)
- [ ] No new barrel export files created
