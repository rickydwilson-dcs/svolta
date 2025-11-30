# AlignmentControls Component

Apple-style UI component for controlling photo alignment settings in the PoseProof editor.

## Features

### 1. Anchor Selection (Segmented Control)
- **Head**: Align photos by head position
- **Shoulders**: Align photos by shoulder position (default)
- **Hips**: Align photos by hip position
- **Full Body**: Align using full body landmarks

Uses `@radix-ui/react-toggle-group` for accessible segmented control with Apple-style design.

### 2. Scale Control (Slider)
- Range: 0.5x to 2.0x
- Step: 0.1
- Shows current value with "x" suffix (e.g., "1.2x")
- Uses custom Slider component with Apple easing

### 3. Offset Controls
- **X-axis**: Horizontal positioning with ← → buttons
- **Y-axis**: Vertical positioning with ↑ ↓ buttons
- Step: 10px per click
- Shows current offset values

### 4. Display Toggles
- **Show landmarks**: Toggle visibility of pose landmarks
- **Show grid**: Toggle alignment grid overlay
- **Link zoom**: Synchronize zoom between before/after photos

### 5. Action Buttons
- **Reset**: Returns all settings to default values
  - Anchor: shoulders
  - Scale: 1.0x
  - Offset X: 0px
  - Offset Y: 0px
- **Auto-align**: Triggers automatic alignment calculation (optional prop)

## Usage

```tsx
import { AlignmentControls } from '@/components/features/editor';

function Editor() {
  const handleAutoAlign = async () => {
    // Implement auto-alignment logic
    // Calculate optimal anchor and scale from landmarks
  };

  return (
    <AlignmentControls
      onAutoAlign={handleAutoAlign}
      className="sticky top-6"
    />
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | No | `undefined` | Additional CSS classes |
| `onAutoAlign` | `() => void` | No | `undefined` | Callback for auto-align button. If undefined, button is disabled |

## State Management

The component connects directly to the Zustand editor store:

```typescript
// Read state
const { alignment, showLandmarks, showGrid, linkedZoom } = useEditorStore();

// Update state
const { updateAlignment, toggleLandmarks, toggleGrid, toggleLinkedZoom } = useEditorStore();
```

## Design Features

- **Apple-style UI**: Generous padding, rounded corners, subtle shadows
- **Smooth animations**: Uses `--ease-apple` custom easing curve
- **Responsive**: Stacks vertically on mobile (<640px)
- **Accessible**: Proper ARIA labels, keyboard navigation
- **Dark mode**: Automatically adapts using CSS custom properties

## Layout

### Desktop (>640px)
```
┌─────────────────────────────────────────────────────────┐
│  Align by: [Head ●] [Shoulders] [Hips] [Full Body]     │
│                                                         │
│  Scale: ──────●────── 1.0x                             │
│                                                         │
│  Offset:  Y: ↓ 0px ↑    X: ← 0px →                    │
│                                                         │
│  [✓] Show landmarks                                    │
│  [✓] Show grid                                         │
│  [ ] Link zoom                                         │
│                                                         │
│  [Reset] [Auto-align]                                   │
└─────────────────────────────────────────────────────────┘
```

### Mobile (<640px)
Controls stack vertically for better usability on small screens.

## Integration Example

```tsx
import { AlignmentControls } from '@/components/features/editor';
import { PhotoPanel } from '@/components/features/editor';
import { useEditorStore } from '@/stores/editor-store';

export function EditorPage() {
  const { beforePhoto, afterPhoto } = useEditorStore();

  const handleAutoAlign = async () => {
    if (!beforePhoto?.landmarks || !afterPhoto?.landmarks) return;

    // Calculate optimal alignment based on landmarks
    // Update store with calculated values
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <PhotoPanel label="Before" />
      <PhotoPanel label="After" />
      <AlignmentControls
        onAutoAlign={
          beforePhoto?.landmarks && afterPhoto?.landmarks
            ? handleAutoAlign
            : undefined
        }
      />
    </div>
  );
}
```

## Dependencies

- `@radix-ui/react-toggle-group`: Segmented control
- `zustand`: State management
- Custom UI components:
  - `Button`
  - `Slider`
  - `Toggle`

## File Location

```
components/features/editor/
├── AlignmentControls.tsx       # Main component
├── AlignmentControls.example.tsx  # Usage examples
└── index.ts                     # Export
```

## Related Components

- `PhotoPanel`: Displays before/after photos
- `LandmarkOverlay`: Shows pose landmarks
- `DropZone`: Handles photo uploads

## Next Steps

1. Implement auto-alignment algorithm
2. Add keyboard shortcuts for offset controls
3. Add preset alignment profiles
4. Add undo/redo functionality
5. Add alignment animation/preview

---

**Created:** 2025-11-30
**Task:** RIC-18 - Build AlignmentControls UI component
