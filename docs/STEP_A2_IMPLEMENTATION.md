# Step A2: Background Removal Hook & Photo Type Updates

## Summary

This implementation creates the React hook for background removal and updates the Photo type to support segmentation data.

## Files Created

### 1. `hooks/useBackgroundRemoval.ts`

**Purpose:** React hook for background removal and replacement with progress tracking, cancellation, and efficient mask reuse.

**Key Features:**

- Progress tracking (0-1) for long operations
- Cancellation support via ref-based token
- Efficient mask reuse for fast background changes
- Automatic cleanup on unmount
- User-friendly error handling

**API:**

```typescript
interface UseBackgroundRemovalReturn {
  isProcessing: boolean;
  progress: number;
  error: string | null;

  // Remove background (expensive AI operation)
  processImage: (imageDataUrl: string) => Promise<SegmentationResult | null>;

  // Change background using cached mask (fast)
  changeBackground: (
    originalDataUrl: string,
    mask: ImageData,
    settings: BackgroundSettings,
  ) => Promise<string | null>;

  cancel: () => void;
  clearError: () => void;
}
```

**Usage Example:**

```typescript
const { processImage, changeBackground, isProcessing, progress } =
  useBackgroundRemoval();

// Step 1: Remove background once (AI processing)
const result = await processImage(photoDataUrl);

// Step 2: Quickly change backgrounds using cached mask
const whiteBackground = await changeBackground(originalDataUrl, result.mask, {
  type: "solid",
  color: "#ffffff",
});

const gradientBackground = await changeBackground(
  originalDataUrl,
  result.mask,
  { type: "gradient", gradient: GRADIENT_PRESETS["sunset-glow"] },
);
```

### 2. `hooks/__tests__/useBackgroundRemoval.test.ts`

**Purpose:** Comprehensive test suite for the hook.

**Test Coverage:**

- Default state initialization
- Successful image processing
- Error handling during processing
- Background changing with existing mask
- Cancellation support
- Error clearing
- Progress tracking

**Run Tests:**

```bash
npm test hooks/__tests__/useBackgroundRemoval.test.ts
```

## Files Modified

### 1. `types/editor.ts`

**Changes:** Added background removal fields to Photo interface.

```typescript
export interface Photo {
  // ... existing fields
  id: string;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  landmarks: Landmark[] | null;

  // NEW: Background removal fields
  hasBackgroundRemoved?: boolean;
  originalDataUrl?: string; // Original before BG removal
  segmentationMask?: ImageData | null; // For re-applying backgrounds
}
```

**Purpose:**

- `hasBackgroundRemoved`: Track if background has been removed
- `originalDataUrl`: Store original image for reverting or re-applying different backgrounds
- `segmentationMask`: Cache the AI-generated mask for fast background changes

### 2. `stores/editor-store.ts`

**Changes:** Added background settings state and action.

```typescript
interface EditorState {
  // ... existing fields

  // NEW: Background removal settings for export
  backgroundSettings: BackgroundSettings;
  setBackgroundSettings: (settings: BackgroundSettings) => void;
}

// Default: Don't modify background
const defaultBackgroundSettings: BackgroundSettings = {
  type: "original",
};
```

**Purpose:**

- Store user's background preference for export
- Default to 'original' (no modification)
- Can be changed to solid, gradient, transparent, or custom

## Implementation Details

### Progress Tracking

The hook reports progress at key stages:

```typescript
// For processImage (AI processing):
0.1 - Starting
0.2 - Segmenter initialized
0.3 - Image loaded
0.4 - Image data extracted
0.6 - Segmentation complete
0.7 - Mask generated
0.8 - Processed image created
1.0 - Complete

// For changeBackground (fast operation):
0.3 - Starting
1.0 - Complete
```

### Cancellation Support

Uses a ref-based cancellation token that persists across renders:

```typescript
const cancelledRef = useRef(false);

// Check cancellation during processing
if (cancelledRef.current) {
  throw new Error("Operation cancelled by user");
}

// Cancel button calls this
const cancel = () => {
  cancelledRef.current = true;
};
```

### Memory Management

**ImageData Considerations:**

- ImageData objects can be large (4 bytes per pixel)
- For a 4000x3000 photo: ~48MB of memory
- Store in Photo object (in memory, not serialized)
- Clear when photo is removed or reset

### Error Handling

User-friendly error messages:

```typescript
try {
  await removeBackground(imageDataUrl);
} catch (err) {
  const errorMessage =
    err instanceof Error ? err.message : "Failed to process image";
  setError(errorMessage);
}
```

## Integration Points

### With Editor UI

```typescript
// In BackgroundRemovalPanel component:
const { processImage, changeBackground, isProcessing, progress } =
  useBackgroundRemoval();
const { beforePhoto, afterPhoto, setBeforePhoto, setAfterPhoto } =
  useEditorStore();

// Process before photo
const handleRemoveBackground = async () => {
  if (!beforePhoto) return;

  const result = await processImage(beforePhoto.dataUrl);
  if (result) {
    setBeforePhoto({
      ...beforePhoto,
      dataUrl: result.processedDataUrl,
      hasBackgroundRemoved: true,
      originalDataUrl: beforePhoto.dataUrl,
      segmentationMask: result.mask,
    });
  }
};

// Change background quickly
const handleChangeBackground = async (settings: BackgroundSettings) => {
  if (!beforePhoto?.segmentationMask || !beforePhoto.originalDataUrl) return;

  const newDataUrl = await changeBackground(
    beforePhoto.originalDataUrl,
    beforePhoto.segmentationMask,
    settings,
  );

  if (newDataUrl) {
    setBeforePhoto({
      ...beforePhoto,
      dataUrl: newDataUrl,
    });
  }
};
```

### With Export Flow

```typescript
// In ExportModal component:
const { backgroundSettings } = useEditorStore();
const { changeBackground } = useBackgroundRemoval();

// Apply background during export
const handleExport = async () => {
  let beforePhotoDataUrl = beforePhoto.dataUrl;
  let afterPhotoDataUrl = afterPhoto.dataUrl;

  // Apply background if needed
  if (backgroundSettings.type !== "original") {
    if (beforePhoto.segmentationMask && beforePhoto.originalDataUrl) {
      beforePhotoDataUrl =
        (await changeBackground(
          beforePhoto.originalDataUrl,
          beforePhoto.segmentationMask,
          backgroundSettings,
        )) ?? beforePhotoDataUrl;
    }

    if (afterPhoto.segmentationMask && afterPhoto.originalDataUrl) {
      afterPhotoDataUrl =
        (await changeBackground(
          afterPhoto.originalDataUrl,
          afterPhoto.segmentationMask,
          backgroundSettings,
        )) ?? afterPhotoDataUrl;
    }
  }

  // Export with modified backgrounds
  await exportAndDownload(
    { ...beforePhoto, dataUrl: beforePhotoDataUrl },
    { ...afterPhoto, dataUrl: afterPhotoDataUrl },
    alignment,
    exportOptions,
  );
};
```

## Performance Considerations

### First Processing (Expensive)

- MediaPipe AI segmentation: ~2-4 seconds
- Memory allocation for mask: ~48MB for 4000x3000 image
- Only run once per photo

### Background Changes (Fast)

- Canvas compositing only: ~100-200ms
- No AI processing
- Uses cached mask

### Memory Optimization

```typescript
// Clear segmentation data when photo is removed
const removePhoto = () => {
  // Explicitly null the mask to allow garbage collection
  setBeforePhoto(null);
};

// Reset clears all photos and masks
const reset = () => {
  set({
    beforePhoto: null,
    afterPhoto: null,
    // ... other resets
  });
};
```

## Next Steps

**Step A3:** Update ExportModal to use background settings

- Add background selector UI
- Apply backgrounds during export
- Show preview of selected background

**Step A4:** Create BackgroundPanel component

- Background type selector (original, transparent, solid, gradient, custom)
- Preset pickers for gradients and colors
- Custom background upload
- Live preview

## Testing Checklist

- [x] Hook initializes with correct default state
- [x] processImage returns segmentation result
- [x] processImage handles errors gracefully
- [x] changeBackground applies new background
- [x] changeBackground handles errors
- [x] Cancellation stops processing
- [x] clearError resets error state
- [x] Progress updates correctly
- [ ] Integration with editor store
- [ ] Memory cleanup on unmount
- [ ] Multiple rapid background changes

## References

- **Background Removal API:** `/lib/segmentation/background-removal.ts`
- **Background Types:** `/lib/segmentation/backgrounds.ts`
- **Similar Hooks:** `/hooks/usePoseDetection.ts`, `/hooks/useCanvasExport.ts`
- **Editor Store:** `/stores/editor-store.ts`
- **Photo Type:** `/types/editor.ts`

---

**Status:** Complete
**Date:** 2026-01-01
**Branch:** feature/pro-export-options
