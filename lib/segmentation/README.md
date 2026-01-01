# Background Removal & Segmentation

Client-side background removal using MediaPipe Selfie Segmentation. All processing happens in the browser - photos are never uploaded to servers.

## Features

- **Privacy-First**: 100% client-side processing
- **High Quality**: MediaPipe Selfie Segmentation with GPU acceleration
- **Professional Backgrounds**: 12+ gradient presets + solid colors + custom images
- **Real-time Preview**: Apply different backgrounds without re-processing
- **Reusable Masks**: Store mask once, apply multiple backgrounds
- **Progress Tracking**: Monitor long-running operations

## Installation

MediaPipe is already installed in this project:

```json
{
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.22"
  }
}
```

## Quick Start

### Basic Background Removal

```typescript
import { removeBackground } from "@/lib/segmentation";

// Remove background from an image
const result = await removeBackground(imageDataUrl, {
  threshold: 0.5, // Confidence threshold (0-1)
  onProgress: (progress) => {
    console.log(`Progress: ${Math.round(progress * 100)}%`);
  },
});

// Use the transparent image
const transparentImage = result.processedDataUrl;

// Store the mask for later use
const mask = result.mask;
```

### Apply Custom Backgrounds

```typescript
import { applyBackground, createGradientBackground } from "@/lib/segmentation";

// Apply a gradient background
const settings = createGradientBackground("sunset-glow");
const withBackground = await applyBackground(
  originalImageUrl,
  mask, // Reuse the mask from removeBackground
  settings,
);
```

## API Reference

### Core Functions

#### `removeBackground(imageDataUrl, options?)`

Remove background from an image and return mask + transparent image.

**Parameters:**

- `imageDataUrl: string` - Data URL of the image to process
- `options?: SegmentationOptions`
  - `threshold?: number` - Confidence threshold (0-1), default 0.5
  - `onProgress?: (progress: number) => void` - Progress callback (0-1)

**Returns:** `Promise<SegmentationResult>`

```typescript
{
  mask: ImageData; // Binary mask for reuse
  processedDataUrl: string; // Transparent PNG
  width: number; // Image width
  height: number; // Image height
}
```

**Example:**

```typescript
const result = await removeBackground(imageUrl, {
  threshold: 0.6,
  onProgress: (p) => setProgress(p),
});
```

#### `applyBackground(originalDataUrl, mask, backgroundSettings)`

Apply a new background to a previously segmented image.

**Parameters:**

- `originalDataUrl: string` - Original image data URL
- `mask: ImageData` - Segmentation mask from `removeBackground`
- `backgroundSettings: BackgroundSettings` - Background configuration

**Returns:** `Promise<string>` - Data URL of the composite image

**Example:**

```typescript
const withBg = await applyBackground(
  originalUrl,
  mask,
  createSolidBackground("#ffffff"),
);
```

### Background Settings

#### Types

```typescript
type BackgroundType =
  | "original" // Keep original background
  | "transparent" // Transparent PNG
  | "solid" // Solid color
  | "gradient" // Gradient
  | "custom"; // Custom image

interface BackgroundSettings {
  type: BackgroundType;
  color?: string; // For 'solid'
  gradient?: GradientPreset; // For 'gradient'
  customUrl?: string; // For 'custom'
}
```

#### Helper Functions

```typescript
// Get default settings (transparent)
const settings = getDefaultBackgroundSettings();

// Create gradient background
const settings = createGradientBackground("sunset-glow");

// Create solid color background
const settings = createSolidBackground("#ffffff");

// Create custom background
const settings = createCustomBackground("https://example.com/bg.jpg");

// Validate settings
const isValid = validateBackgroundSettings(settings);
```

### Gradient Presets

Pre-configured professional gradient backgrounds optimized for fitness photos.

```typescript
import { GRADIENT_PRESETS, getGradientPreset } from "@/lib/segmentation";

// Available presets
const presets = [
  "clean-studio", // Light gray gradient
  "gym-vibes", // Dark blue radial
  "sunset-glow", // Pink-purple linear
  "ocean-breeze", // Blue-purple linear
  "forest-calm", // Green radial
  "energy-burst", // Red-yellow radial
  "midnight-purple", // Deep purple linear
  "coral-reef", // Coral-yellow linear
  "arctic-frost", // Light blue radial
  "volcanic-fire", // Red-yellow linear
  "deep-space", // Black-gray radial
  "rose-gold", // Rose-beige linear
];

// Get preset by ID
const preset = getGradientPreset("sunset-glow");
console.log(preset);
// {
//   id: 'sunset-glow',
//   name: 'Sunset Glow',
//   type: 'linear',
//   colors: ['#ff9a9e', '#fecfef'],
//   angle: 135
// }
```

### Solid Color Presets

```typescript
import { SOLID_COLOR_PRESETS } from "@/lib/segmentation";

// Available colors
const colors = [
  { name: "Pure White", color: "#ffffff" },
  { name: "Black", color: "#000000" },
  { name: "Light Gray", color: "#f0f0f0" },
  { name: "Medium Gray", color: "#9e9e9e" },
  { name: "Dark Gray", color: "#333333" },
  { name: "Charcoal", color: "#1a1a1a" },
  { name: "Navy Blue", color: "#001f3f" },
  { name: "Sky Blue", color: "#87ceeb" },
  { name: "Forest Green", color: "#228b22" },
  { name: "Crimson", color: "#dc143c" },
];
```

## Usage Patterns

### Pattern 1: Progressive Enhancement

Process once, apply multiple backgrounds without re-segmentation:

```typescript
// Step 1: Initial segmentation (expensive)
const { mask, width, height } = await removeBackground(imageUrl);

// Step 2: Try different backgrounds (fast)
const backgrounds = [
  createGradientBackground("sunset-glow"),
  createSolidBackground("#ffffff"),
  createGradientBackground("gym-vibes"),
];

for (const bg of backgrounds) {
  const preview = await applyBackground(imageUrl, mask, bg);
  // Show preview to user
}
```

### Pattern 2: Export with Custom Background

```typescript
async function exportWithBackground(
  imageUrl: string,
  backgroundSettings: BackgroundSettings,
): Promise<Blob> {
  // Remove background
  const { mask } = await removeBackground(imageUrl);

  // Apply chosen background
  const compositeUrl = await applyBackground(
    imageUrl,
    mask,
    backgroundSettings,
  );

  // Convert to blob for download
  const response = await fetch(compositeUrl);
  return await response.blob();
}
```

### Pattern 3: Background Picker UI

```typescript
import {
  GRADIENT_PRESETS,
  generateBackgroundPreview,
} from "@/lib/segmentation";

// Generate preview thumbnails for UI
async function generatePreviewGrid() {
  const previews = await Promise.all(
    Object.values(GRADIENT_PRESETS).map(async (preset) => {
      const previewUrl = await generateBackgroundPreview(
        { type: "gradient", gradient: preset },
        120, // width
        80, // height
      );
      return { id: preset.id, name: preset.name, previewUrl };
    }),
  );
  return previews;
}
```

## Performance

### Initialization

- **First Load**: ~2-3 seconds (downloads ~5MB model)
- **Subsequent Loads**: Instant (model cached)
- **Model Source**: Google CDN (fast, reliable)

### Processing Times

| Image Size | Segmentation | Apply Background |
| ---------- | ------------ | ---------------- |
| 1080x1920  | ~800ms       | ~100ms           |
| 1440x2560  | ~1500ms      | ~150ms           |
| 2160x3840  | ~3000ms      | ~200ms           |

**Note:** Times measured on M1 MacBook Pro with GPU acceleration.

### Optimization Tips

1. **Reuse Masks**: Store mask, don't re-segment for background changes
2. **GPU Acceleration**: Automatically enabled, no configuration needed
3. **Singleton Pattern**: Model initialized once, reused for all operations
4. **Image Smoothing**: High quality rendering built-in

## Error Handling

```typescript
try {
  const result = await removeBackground(imageUrl);
} catch (error) {
  if (error.message.includes("Failed to initialize")) {
    // Network error or WebGL not supported
    console.error("Background removal not available");
  } else if (error.message.includes("Segmentation failed")) {
    // Processing error
    console.error("Could not process this image");
  }
}
```

## Browser Compatibility

Requires WebGL support for GPU acceleration:

- Chrome 88+
- Firefox 86+
- Safari 14.1+
- Edge 88+

## Privacy & Security

- **No Server Uploads**: All processing happens in the browser
- **No Data Collection**: MediaPipe models downloaded from Google CDN
- **CORS-Friendly**: Can process images from any origin
- **Offline-Ready**: Model cached after first load

## Integration with Svolta

### Store Segmentation Data

```typescript
// In editor-store.ts
interface EditorState {
  segmentationMask?: ImageData;
  backgroundSettings?: BackgroundSettings;
}

// After segmentation
const { mask } = await removeBackground(imageUrl);
useEditorStore.setState({ segmentationMask: mask });
```

### Export with Background

```typescript
// In export flow
const { segmentationMask, backgroundSettings } = useEditorStore.getState();

if (segmentationMask && backgroundSettings) {
  const withBg = await applyBackground(
    originalImageUrl,
    segmentationMask,
    backgroundSettings,
  );
  // Export withBg instead of original
}
```

## Testing

Run the test suite:

```bash
npm test lib/segmentation/__tests__/backgrounds.test.ts
```

Tests cover:

- Gradient preset validation
- Solid color presets
- Background settings creation
- Settings validation
- Color format validation

## Future Enhancements

- [ ] Hair refinement for better edge quality
- [ ] Custom threshold per-image
- [ ] Batch processing multiple images
- [ ] Advanced edge feathering
- [ ] Real-time video segmentation

## References

- [MediaPipe Image Segmentation](https://developers.google.com/mediapipe/solutions/vision/image_segmenter)
- [Selfie Segmentation Model](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite)
- [MediaPipe Tasks Vision API](https://www.npmjs.com/package/@mediapipe/tasks-vision)

---

**Last Updated:** 2025-01-01
**Status:** Production Ready
**Version:** 1.0.0
