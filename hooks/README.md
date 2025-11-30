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

### `useCanvasExport`

Manages canvas export functionality with loading states and error handling.

**Location:** `/hooks/useCanvasExport.ts`

#### Usage

```tsx
import { useCanvasExport } from '@/hooks/useCanvasExport';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';

function ExportButton() {
  const { isExporting, error, exportAndDownload, clearError } = useCanvasExport();
  const { beforePhoto, afterPhoto, alignment } = useEditorStore();
  const { user } = useUserStore();

  const handleExport = async () => {
    if (!beforePhoto || !afterPhoto) return;

    const success = await exportAndDownload(
      beforePhoto,
      afterPhoto,
      alignment,
      {
        format: '4:5',           // Instagram portrait
        resolution: 1080,         // 1080px width
        includeLabels: true,      // Show "Before" / "After"
        watermark: {
          isPro: user?.isPro ?? false,
          customLogoUrl: user?.customLogoUrl,
        },
        quality: 0.92,
      }
    );

    if (success) {
      console.log('Export completed successfully');
    }
  };

  return (
    <div>
      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Export Image'}
      </button>
      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
```

#### Return Values

```typescript
interface UseCanvasExportReturn {
  isExporting: boolean;                    // Loading state during export
  error: string | null;                    // Error message if export fails
  exportAndDownload: (                     // Export and download function
    beforePhoto: Photo,
    afterPhoto: Photo,
    alignment: AlignmentSettings,
    options: ExportOptions
  ) => Promise<boolean>;
  clearError: () => void;                  // Clear error state
}
```

#### Export Options

```typescript
interface ExportOptions {
  format: '1:1' | '4:5' | '9:16';         // Export aspect ratio
  resolution?: 1080 | 1440 | 2160;        // Target width (default: 1080)
  includeLabels?: boolean;                 // Show "Before"/"After" labels
  watermark: {
    isPro: boolean;                        // User tier (affects watermark)
    customLogoUrl?: string;                // Custom logo for Pro users
  };
  quality?: number;                        // 0.8-1.0 (default: 0.92)
}
```

#### Export Formats

| Format | Ratio | Best For | Example Size (1080p) |
|--------|-------|----------|---------------------|
| `1:1` | Square | Instagram post | 2160 x 1080 |
| `4:5` | Portrait | Instagram portrait | 2160 x 1350 |
| `9:16` | Vertical | Instagram Story | 2160 x 1920 |

*Note: Width is doubled (2x resolution) to accommodate side-by-side layout*

#### Features

- **Multiple formats**: Square, portrait, and story formats
- **High resolution**: Supports 1080p, 1440p, and 4K exports
- **Smart watermarking**: Free users get text watermark, Pro users can use custom logo
- **Label overlay**: Optional "Before" and "After" labels
- **Error handling**: Comprehensive validation and user-friendly error messages
- **Browser download**: Automatically triggers file download

---

## Integration Example

Complete example showing how all hooks work together:

```tsx
'use client';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAlignment } from '@/hooks/useAlignment';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { useCanvasExport } from '@/hooks/useCanvasExport';
import { useEditorStore } from '@/stores/editor-store';
import { useUserStore } from '@/stores/user-store';
import { AlignmentControls } from '@/components/features/editor/AlignmentControls';

export default function EditorPage() {
  // Editor state
  const { beforePhoto, afterPhoto, alignment } = useEditorStore();
  const { user } = useUserStore();

  // Pose detection
  const { detectPose, isDetecting } = usePoseDetection();

  // Alignment management
  const { canAlign, autoAlign } = useAlignment();

  // Canvas export
  const { isExporting, error, exportAndDownload } = useCanvasExport();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onAutoAlign: canAlign ? autoAlign : undefined,
  });

  const handleExport = async () => {
    if (!beforePhoto || !afterPhoto) return;

    await exportAndDownload(beforePhoto, afterPhoto, alignment, {
      format: '4:5',
      resolution: 1080,
      includeLabels: true,
      watermark: {
        isPro: user?.isPro ?? false,
        customLogoUrl: user?.customLogoUrl,
      },
    });
  };

  return (
    <div className="editor-layout">
      {/* Canvas area */}
      <div className="canvas-container">
        {/* Your canvas component */}
      </div>

      {/* Controls sidebar */}
      <aside className="controls-sidebar">
        <AlignmentControls onAutoAlign={canAlign ? autoAlign : undefined} />

        <button
          onClick={handleExport}
          disabled={!beforePhoto || !afterPhoto || isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export Image'}
        </button>

        {error && <div className="error">{error}</div>}
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
