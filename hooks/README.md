# PoseProof Editor Hooks

Custom React hooks for managing the photo alignment editor.

## Available Hooks

### `useKeyboardShortcuts`

Provides keyboard shortcuts for editor controls with automatic state management.

**Location:** `/hooks/useKeyboardShortcuts.ts`

#### Usage

```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAlignment } from '@/hooks/useAlignment';

function EditorPage() {
  const { autoAlign } = useAlignment();

  // Enable keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onAutoAlign: autoAlign,
  });

  return (
    <div>
      {/* Your editor UI */}
    </div>
  );
}
```

#### Keyboard Shortcuts

| Key | Action | Step Size |
|-----|--------|-----------|
| `↑` `↓` `←` `→` | Move offset | 1px |
| `Shift + ↑` `↓` `←` `→` | Move offset | 10px |
| `+` / `=` | Increase scale | 0.01x |
| `-` / `_` | Decrease scale | 0.01x |
| `Shift + +` | Increase scale | 0.1x |
| `Shift + -` | Decrease scale | 0.1x |
| `R` | Reset alignment | - |
| `A` | Auto-align | - |
| `L` | Toggle landmarks | - |
| `G` | Toggle grid | - |

#### Options

```typescript
interface KeyboardShortcutsOptions {
  enabled?: boolean;        // Enable/disable shortcuts (default: true)
  onAutoAlign?: () => void; // Callback for auto-align action
}
```

#### Notes

- Shortcuts are disabled when typing in input fields or textareas
- Shortcuts work globally within the window when enabled
- Scale values are clamped between 0.5x and 2.0x
- The hook automatically cleans up event listeners on unmount

---

### `useAlignment`

Manages real-time alignment calculations with debounced updates.

**Location:** `/hooks/useAlignment.ts`

#### Usage

```tsx
import { useAlignment } from '@/hooks/useAlignment';

function AlignmentControls() {
  const { alignment, isAligned, canAlign, autoAlign, resetAlignment } = useAlignment();

  return (
    <div>
      <button onClick={autoAlign} disabled={!canAlign}>
        Auto-align
      </button>
      <button onClick={resetAlignment}>
        Reset
      </button>
      {isAligned && <span>Aligned</span>}
    </div>
  );
}
```

#### Return Values

```typescript
interface UseAlignmentReturn {
  alignment: AlignmentSettings;  // Current alignment settings
  isAligned: boolean;            // Whether photos are aligned (non-default values)
  canAlign: boolean;             // Whether auto-alignment is possible
  autoAlign: () => void;         // Trigger auto-alignment based on landmarks
  resetAlignment: () => void;    // Reset to default values
}
```

#### Features

- Automatically validates landmark data
- Debounces updates for performance (100ms)
- Calculates alignment based on anchor points
- Subscribes to editor store state

---

### `usePoseDetection`

Handles MediaPipe pose detection for uploaded photos.

**Location:** `/hooks/usePoseDetection.ts`

#### Usage

```tsx
import { usePoseDetection } from '@/hooks/usePoseDetection';

function PhotoUploader() {
  const { detectPose, isDetecting, error } = usePoseDetection();

  const handlePhotoUpload = async (file: File) => {
    const landmarks = await detectPose(file);
    if (landmarks) {
      console.log('Detected landmarks:', landmarks);
    }
  };

  return (
    <div>
      {isDetecting && <span>Detecting pose...</span>}
      {error && <span>Error: {error}</span>}
    </div>
  );
}
```

---

## Integration Example

Complete example showing how all hooks work together:

```tsx
'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAlignment } from '@/hooks/useAlignment';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { AlignmentControls } from '@/components/features/editor/AlignmentControls';

export default function EditorPage() {
  // Pose detection
  const { detectPose, isDetecting } = usePoseDetection();

  // Alignment management
  const { alignment, canAlign, autoAlign } = useAlignment();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onAutoAlign: canAlign ? autoAlign : undefined,
  });

  return (
    <div className="editor-layout">
      {/* Canvas area */}
      <div className="canvas-container">
        {/* Your canvas component */}
      </div>

      {/* Controls sidebar */}
      <aside className="controls-sidebar">
        <AlignmentControls onAutoAlign={canAlign ? autoAlign : undefined} />
      </aside>
    </div>
  );
}
```

---

## Best Practices

1. **Keyboard Shortcuts**: Only enable when the editor is active to avoid conflicts with other UI elements.

2. **Alignment**: Use the `canAlign` flag before calling `autoAlign()` to ensure valid landmark data.

3. **Pose Detection**: Handle loading and error states appropriately in the UI.

4. **Performance**: All hooks include automatic cleanup and debouncing where appropriate.

5. **Type Safety**: All hooks are fully typed with TypeScript for IDE autocomplete and type checking.
