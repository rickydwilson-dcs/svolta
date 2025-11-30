# Canvas Library

Canvas manipulation utilities for PoseProof photo alignment and export.

## Modules

### `export.ts`

Handles exporting the aligned canvas to different formats with watermarks and labels.

**Key Features:**
- Multiple aspect ratios (1:1, 4:5, 9:16)
- High resolution support (1080p, 1440p, 4K)
- Side-by-side before/after layout
- Optional "Before"/"After" labels
- Automatic watermarking based on user tier
- Browser download integration

**Main Function:**

```typescript
async function exportCanvas(
  beforePhoto: { dataUrl: string; width: number; height: number },
  afterPhoto: { dataUrl: string; width: number; height: number },
  alignment: { scale: number; offsetX: number; offsetY: number },
  options: ExportOptions
): Promise<ExportResult>
```

**Usage:**

```typescript
import { exportCanvas, triggerDownload } from '@/lib/canvas/export';

const result = await exportCanvas(
  { dataUrl: beforeDataUrl, width: 800, height: 1000 },
  { dataUrl: afterDataUrl, width: 800, height: 1000 },
  { scale: 1.05, offsetX: 10, offsetY: -5 },
  {
    format: '4:5',
    resolution: 1080,
    includeLabels: true,
    watermark: {
      isPro: false,
    },
    quality: 0.92,
  }
);

triggerDownload(result.blob, result.filename);
```

---

### `watermark.ts`

Adds watermarks to exported canvas images based on user tier.

**Key Features:**
- Text watermark for free users ("PoseProof")
- Custom logo watermark for Pro users
- No watermark for Pro users without custom logo
- Configurable position and opacity
- Automatic sizing based on canvas dimensions

**Main Function:**

```typescript
async function addWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
): Promise<void>
```

**Usage:**

```typescript
import { addWatermark } from '@/lib/canvas/watermark';

await addWatermark(ctx, 2160, 1350, {
  isPro: false,
  position: 'bottom-right',
  opacity: 0.7,
});
```

---

### `alignment.ts`

Calculates alignment values based on pose landmarks and anchor points.

**Key Features:**
- Multiple anchor points (head, shoulders, hips, full body)
- Automatic scale calculation
- Offset computation for perfect alignment
- Landmark validation

**Main Function:**

```typescript
function calculateAlignment(
  beforeLandmarks: Landmark[],
  afterLandmarks: Landmark[],
  anchor: AlignmentAnchor
): { scale: number; offsetX: number; offsetY: number } | null
```

---

### `fabric-setup.ts`

Fabric.js canvas initialization and configuration.

**Key Features:**
- Optimized rendering settings
- High-quality image smoothing
- Proper canvas sizing
- Event handler setup

---

## Export Format Reference

| Format | Ratio | Best For | Example Size (1080p) |
|--------|-------|----------|---------------------|
| `1:1` | Square | Instagram post | 2160 x 1080 |
| `4:5` | Portrait | Instagram portrait | 2160 x 1350 |
| `9:16` | Vertical | Instagram Story | 2160 x 1920 |

*Width is doubled to accommodate side-by-side layout*

## Resolution Options

- **1080**: Standard HD (1080px per photo)
- **1440**: Enhanced HD (1440px per photo)
- **2160**: 4K/UHD (2160px per photo)

## Watermark Behavior

| User Tier | Custom Logo | Result |
|-----------|-------------|--------|
| Free | N/A | "PoseProof" text watermark |
| Pro | No | No watermark (clean export) |
| Pro | Yes | Custom logo watermark |

## Technical Details

### Canvas Rendering

- Uses offscreen canvas for export
- High-quality image smoothing enabled
- PNG format with configurable quality (0.8-1.0)
- Automatic aspect ratio preservation

### Photo Positioning

- Before photo: Left half
- After photo: Right half with alignment transforms
- Both photos centered within their respective halves
- Maintains aspect ratio with letterboxing if needed

### Label Rendering

- Font: Inter (600 weight), system fallback
- Size: 4% of photo width
- Color: White with shadow for visibility
- Position: Top center of each half
- Padding: 1.5x font size from top

### Performance

- Asynchronous image loading
- Promise-based workflow
- Efficient memory management
- Automatic cleanup of object URLs

## Related Hooks

- `useCanvasExport` - React hook wrapper for export functionality
- `useAlignment` - Alignment calculation and management
- `usePoseDetection` - MediaPipe pose landmark detection

## Error Handling

All functions include comprehensive error handling:

- Invalid image data
- Missing required parameters
- Canvas context failures
- Image loading failures
- Quality out of range

Errors are thrown as standard JavaScript Error objects with descriptive messages.
