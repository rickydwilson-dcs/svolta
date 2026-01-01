# Background Removal - Usage Examples

Practical examples for integrating background removal into Svolta.

## Example 1: Basic Background Removal

Remove background and export as transparent PNG.

```typescript
import { removeBackground } from "@/lib/segmentation";

async function removeBackgroundFromPhoto(photoDataUrl: string) {
  try {
    // Show loading state
    setLoading(true);
    setProgress(0);

    // Remove background with progress tracking
    const result = await removeBackground(photoDataUrl, {
      threshold: 0.5,
      onProgress: (progress) => {
        setProgress(Math.round(progress * 100));
      },
    });

    // Store the mask for reuse
    setSegmentationMask(result.mask);

    // Use transparent image
    return result.processedDataUrl;
  } catch (error) {
    console.error("Background removal failed:", error);
    toast.error("Failed to remove background. Please try again.");
    return null;
  } finally {
    setLoading(false);
  }
}
```

## Example 2: Background Picker Component

Let users choose from preset backgrounds.

```typescript
import {
  GRADIENT_PRESETS,
  createGradientBackground,
  applyBackground,
} from '@/lib/segmentation';

function BackgroundPicker({
  originalImageUrl,
  segmentationMask,
  onBackgroundChange,
}: {
  originalImageUrl: string;
  segmentationMask: ImageData;
  onBackgroundChange: (imageUrl: string) => void;
}) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handlePresetClick = async (presetId: string) => {
    setSelectedPreset(presetId);

    // Apply the selected background
    const settings = createGradientBackground(presetId);
    if (settings) {
      const withBackground = await applyBackground(
        originalImageUrl,
        segmentationMask,
        settings
      );
      onBackgroundChange(withBackground);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.values(GRADIENT_PRESETS).map((preset) => (
        <button
          key={preset.id}
          onClick={() => handlePresetClick(preset.id)}
          className={cn(
            'aspect-video rounded-lg overflow-hidden',
            selectedPreset === preset.id && 'ring-2 ring-blue-500'
          )}
        >
          <div
            className="w-full h-full"
            style={{
              background:
                preset.type === 'linear'
                  ? `linear-gradient(${preset.angle}deg, ${preset.colors.join(', ')})`
                  : `radial-gradient(circle, ${preset.colors.join(', ')})`,
            }}
          />
          <span className="text-xs">{preset.name}</span>
        </button>
      ))}
    </div>
  );
}
```

## Example 3: Export Modal with Background Options

Export photos with different background options.

```typescript
import {
  getDefaultBackgroundSettings,
  createGradientBackground,
  createSolidBackground,
  applyBackground,
  type BackgroundSettings,
} from '@/lib/segmentation';

type BackgroundOption = 'original' | 'transparent' | 'gradient' | 'solid';

function ExportModal({
  beforeImageUrl,
  afterImageUrl,
  beforeMask,
  afterMask,
}: {
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeMask?: ImageData;
  afterMask?: ImageData;
}) {
  const [backgroundOption, setBackgroundOption] = useState<BackgroundOption>('original');
  const [selectedGradient, setSelectedGradient] = useState('clean-studio');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let beforeImageToExport = beforeImageUrl;
      let afterImageToExport = afterImageUrl;

      // Apply backgrounds if masks are available
      if (backgroundOption !== 'original' && beforeMask && afterMask) {
        let settings: BackgroundSettings;

        switch (backgroundOption) {
          case 'transparent':
            settings = getDefaultBackgroundSettings();
            break;
          case 'gradient':
            settings = createGradientBackground(selectedGradient)!;
            break;
          case 'solid':
            settings = createSolidBackground(selectedColor);
            break;
          default:
            settings = { type: 'original' };
        }

        // Apply background to both images
        [beforeImageToExport, afterImageToExport] = await Promise.all([
          applyBackground(beforeImageUrl, beforeMask, settings),
          applyBackground(afterImageUrl, afterMask, settings),
        ]);
      }

      // Export the comparison
      await exportComparison(beforeImageToExport, afterImageToExport);

      toast.success('Export successful!');
    } catch (error) {
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal>
      <h2>Export Options</h2>

      {/* Background Option Selector */}
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={backgroundOption === 'original'}
            onChange={() => setBackgroundOption('original')}
          />
          Keep Original Background
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={backgroundOption === 'transparent'}
            onChange={() => setBackgroundOption('transparent')}
            disabled={!beforeMask || !afterMask}
          />
          Transparent Background (PNG)
          {(!beforeMask || !afterMask) && (
            <span className="text-xs text-gray-500">
              (Pro feature - requires background removal)
            </span>
          )}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={backgroundOption === 'gradient'}
            onChange={() => setBackgroundOption('gradient')}
            disabled={!beforeMask || !afterMask}
          />
          Gradient Background
        </label>

        {backgroundOption === 'gradient' && (
          <select
            value={selectedGradient}
            onChange={(e) => setSelectedGradient(e.target.value)}
          >
            {Object.values(GRADIENT_PRESETS).map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={backgroundOption === 'solid'}
            onChange={() => setBackgroundOption('solid')}
            disabled={!beforeMask || !afterMask}
          />
          Solid Color
        </label>

        {backgroundOption === 'solid' && (
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          />
        )}
      </div>

      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Export Comparison'}
      </button>
    </Modal>
  );
}
```

## Example 4: Store Integration

Integrate with Zustand store for state management.

```typescript
// stores/editor-store.ts
import { create } from "zustand";
import type { BackgroundSettings } from "@/lib/segmentation";

interface SegmentationData {
  mask: ImageData;
  timestamp: number;
}

interface EditorState {
  // Segmentation data
  beforeSegmentation?: SegmentationData;
  afterSegmentation?: SegmentationData;
  backgroundSettings: BackgroundSettings;

  // Actions
  setBeforeSegmentation: (mask: ImageData) => void;
  setAfterSegmentation: (mask: ImageData) => void;
  setBackgroundSettings: (settings: BackgroundSettings) => void;
  clearSegmentation: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  beforeSegmentation: undefined,
  afterSegmentation: undefined,
  backgroundSettings: { type: "original" },

  setBeforeSegmentation: (mask) =>
    set({
      beforeSegmentation: {
        mask,
        timestamp: Date.now(),
      },
    }),

  setAfterSegmentation: (mask) =>
    set({
      afterSegmentation: {
        mask,
        timestamp: Date.now(),
      },
    }),

  setBackgroundSettings: (settings) => set({ backgroundSettings: settings }),

  clearSegmentation: () =>
    set({
      beforeSegmentation: undefined,
      afterSegmentation: undefined,
    }),
}));
```

## Example 5: Hook for Background Removal

Create a custom hook for easy integration.

```typescript
// hooks/useBackgroundRemoval.ts
import { useState, useCallback } from 'react';
import { removeBackground, type SegmentationResult } from '@/lib/segmentation';

interface UseBackgroundRemovalReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;
  result: SegmentationResult | null;
  processImage: (imageDataUrl: string) => Promise<SegmentationResult | null>;
  clearResult: () => void;
}

export function useBackgroundRemoval(): UseBackgroundRemovalReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SegmentationResult | null>(null);

  const processImage = useCallback(async (imageDataUrl: string) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const segmentationResult = await removeBackground(imageDataUrl, {
        threshold: 0.5,
        onProgress: (p) => setProgress(Math.round(p * 100)),
      });

      setResult(segmentationResult);
      return segmentationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Background removal failed';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    isProcessing,
    progress,
    error,
    result,
    processImage,
    clearResult,
  };
}

// Usage in component
function PhotoEditor() {
  const { isProcessing, progress, result, processImage } = useBackgroundRemoval();

  const handleRemoveBackground = async () => {
    const segmentationResult = await processImage(photoDataUrl);
    if (segmentationResult) {
      // Store mask for later use
      useEditorStore.getState().setBeforeSegmentation(segmentationResult.mask);
    }
  };

  return (
    <div>
      <button onClick={handleRemoveBackground} disabled={isProcessing}>
        Remove Background
      </button>
      {isProcessing && <progress value={progress} max={100} />}
      {result && <img src={result.processedDataUrl} alt="No background" />}
    </div>
  );
}
```

## Example 6: Pro Feature Gate

Show upgrade prompt for free users.

```typescript
import { useUserStore } from '@/stores/user-store';
import { removeBackground } from '@/lib/segmentation';

function BackgroundRemovalButton() {
  const { isPro } = useUserStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleRemoveBackground = async () => {
    // Check if pro user
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    // Process for pro users
    try {
      const result = await removeBackground(imageUrl);
      // Use result...
    } catch (error) {
      toast.error('Background removal failed');
    }
  };

  return (
    <>
      <Button
        onClick={handleRemoveBackground}
        variant={isPro ? 'primary' : 'secondary'}
      >
        Remove Background
        {!isPro && <span className="text-xs">🔒 Pro</span>}
      </Button>

      {showUpgradeModal && (
        <UpgradePrompt
          feature="Background Removal"
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
}
```

## Example 7: Batch Processing

Process multiple images at once.

```typescript
import { removeBackground } from "@/lib/segmentation";

async function batchRemoveBackgrounds(imageUrls: string[]) {
  const results = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];

    try {
      const result = await removeBackground(imageUrl, {
        onProgress: (progress) => {
          const overallProgress = ((i + progress) / imageUrls.length) * 100;
          setProgress(overallProgress);
        },
      });

      results.push({
        original: imageUrl,
        processed: result.processedDataUrl,
        mask: result.mask,
      });
    } catch (error) {
      console.error(`Failed to process image ${i + 1}:`, error);
      results.push({
        original: imageUrl,
        processed: null,
        mask: null,
        error: true,
      });
    }
  }

  return results;
}
```

## Example 8: Live Preview with Canvas

Show real-time preview as user adjusts settings.

```typescript
import { applyBackground, createGradientBackground } from '@/lib/segmentation';
import { useEffect, useRef } from 'react';

function LiveBackgroundPreview({
  imageUrl,
  mask,
  backgroundSettings,
}: {
  imageUrl: string;
  mask: ImageData;
  backgroundSettings: BackgroundSettings;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;

    async function updatePreview() {
      if (!canvasRef.current) return;

      const withBackground = await applyBackground(
        imageUrl,
        mask,
        backgroundSettings
      );

      if (!isMounted) return;

      // Draw to canvas
      const img = new Image();
      img.onload = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          canvasRef.current!.width = img.width;
          canvasRef.current!.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = withBackground;
    }

    updatePreview();

    return () => {
      isMounted = false;
    };
  }, [imageUrl, mask, backgroundSettings]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full h-auto"
    />
  );
}
```

## Best Practices

### 1. Store Masks for Reuse

```typescript
// Don't re-segment for every background change
const { mask } = await removeBackground(imageUrl); // Expensive
await applyBackground(imageUrl, mask, settings1); // Fast
await applyBackground(imageUrl, mask, settings2); // Fast
await applyBackground(imageUrl, mask, settings3); // Fast
```

### 2. Show Progress Indicators

```typescript
const result = await removeBackground(imageUrl, {
  onProgress: (progress) => {
    setProgress(Math.round(progress * 100));
  },
});
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await removeBackground(imageUrl);
} catch (error) {
  // Show user-friendly error
  toast.error("Could not remove background. Please try a different photo.");
  // Log for debugging
  console.error("Background removal error:", error);
}
```

### 4. Pro Feature Gating

```typescript
if (!isPro) {
  return <UpgradePrompt feature="Background Removal" />;
}
```

### 5. Privacy Messaging

```typescript
<div className="text-sm text-gray-500">
  Your photos are processed entirely in your browser.
  Nothing is uploaded to our servers.
</div>
```

---

**Next Steps:**

- Implement background removal UI component
- Add to export options
- Create upgrade prompt for free users
- Add usage analytics (track feature usage)
