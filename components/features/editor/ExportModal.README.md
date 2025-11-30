# ExportModal Component

The ExportModal component provides a complete export interface for PoseProof with format selection, preview, usage tracking, and upgrade prompts.

## Features

### For Free Users
- 1:1 export format (free)
- 4:5 and 9:16 formats (locked, Pro only)
- Live preview of before/after photos side by side
- PoseProof watermark on exports
- Optional "Before/After" labels
- Usage tracking: "Exports remaining: X of 5 this month"
- Upgrade prompt when limit reached
- Prominent upgrade CTA at bottom

### For Pro Users
- All export formats unlocked (1:1, 4:5, 9:16)
- No watermark
- Unlimited exports
- Custom logo option (UI ready, implementation pending)

## Usage

```tsx
import { ExportModal } from '@/components/features/editor';

function MyComponent() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsExportModalOpen(true)}>
        Export
      </Button>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </>
  );
}
```

## Integration with EditorContent

To add the ExportModal to the editor page:

```tsx
// In EditorContent.tsx
import { ExportModal } from '@/components/features/editor';
import { useState } from 'react';

export default function EditorContent() {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // ... existing code ...

  return (
    <div className="flex flex-col h-screen bg-surface-secondary">
      <header className="flex items-center justify-between px-6 py-5 ...">
        {/* ... existing header ... */}

        {/* Update Export Button */}
        <Button
          variant="primary"
          size="sm"
          disabled={!beforePhoto || !afterPhoto}
          onClick={() => setIsExportModalOpen(true)}
          className="px-6"
        >
          Export
        </Button>
      </header>

      {/* ... rest of editor ... */}

      {/* Add ExportModal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
```

## Props

```typescript
interface ExportModalProps {
  isOpen: boolean;      // Controls modal visibility
  onClose: () => void;  // Called when modal should close
}
```

## State Management

The component automatically integrates with:

- **useEditorStore**: Gets `beforePhoto` and `afterPhoto` for preview
- **useUserStore**: Checks `isPro()` status for feature access
- **useUsageLimit**: Tracks exports via `checkAndIncrement()`

## Export Flow

1. User clicks "Download PNG" button
2. `checkAndIncrement()` is called to verify and increment usage
3. If limit reached (free users), shows UpgradePrompt with `trigger='limit'`
4. If allowed, export proceeds (implementation pending)
5. Modal closes on success

## TODO: Export Logic

The actual canvas rendering and export logic needs to be implemented. When ready, add to the `handleDownload` function:

```tsx
// After checkAndIncrement() succeeds:
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions based on selectedFormat
// Render both photos side by side
// Add watermark if !isPro
// Add labels if showLabels
// Trigger download with canvas.toBlob()
```

## Accessibility

- Full keyboard navigation
- ARIA labels on all interactive elements
- Focus trapping when modal is open
- Escape key closes modal

## Styling

- Uses Radix Dialog for accessibility
- Apple-style design with generous padding
- Smooth animations with `var(--ease-apple)`
- Full dark mode support
- Responsive layout

## Dependencies

- `@radix-ui/react-dialog`
- `@/components/ui/Button`
- `@/components/ui/UpgradePrompt`
- `@/stores/editor-store`
- `@/stores/user-store`
- `@/hooks/useUsageLimit`
- `@/lib/utils` (cn)
