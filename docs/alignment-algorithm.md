# Alignment Algorithm Documentation

> **Note:** This document describes the **preview alignment** algorithm (CSS transforms). For the **export alignment** algorithm (canvas rendering with the four-phase approach), see [/docs/features/alignment-export.md](features/alignment-export.md) which is more comprehensive and up-to-date.

## Overview

PoseProof uses MediaPipe Pose detection to automatically align "before" and "after" fitness photos. The alignment ensures that the subject's body position matches between both photos, making progress comparisons more accurate and professional.

## Core Concepts

### Coordinate Systems

There are two coordinate systems in play:

1. **Normalized Coordinates (0-1)**: MediaPipe returns landmark positions as normalized values where (0,0) is top-left and (1,1) is bottom-right of the original image.

2. **Export Coordinates (pixels)**: When exporting, images are rendered using "cover-fit" which may crop the image differently than the preview. Alignment must be calculated in this coordinate space.

### MediaPipe Landmarks

MediaPipe Pose detection returns 33 landmarks. Key landmarks used for alignment:

| Index | Landmark       | Usage                             |
| ----- | -------------- | --------------------------------- |
| 0     | Nose           | Head anchor, vertical reference   |
| 11    | Left Shoulder  | Shoulder anchor, torso reference  |
| 12    | Right Shoulder | Shoulder anchor, torso reference  |
| 23    | Left Hip       | Hip anchor, body height reference |
| 24    | Right Hip      | Hip anchor, body height reference |

Each landmark has a `visibility` score (0-1). We use a threshold of **0.5** to determine if a landmark is reliable.

### Anchor Types

Users can select different anchor points for alignment:

- **Head**: Aligns based on nose position (index 0)
- **Shoulders**: Aligns based on shoulder center (indices 11, 12)
- **Hips**: Aligns based on hip center (indices 23, 24)
- **Full**: Aligns based on nose + hips (indices 0, 23, 24)

## Algorithm

### Step 1: Transform Landmarks to Export Coordinates

Since export uses cover-fit (image fills the target area, cropping as needed), we must transform normalized landmarks to pixel positions in the cropped view:

```typescript
function transformLandmarkToExport(
  landmark,
  imgWidth,
  imgHeight,
  targetWidth,
  targetHeight,
) {
  const fit = calculateCoverFit(imgWidth, imgHeight, targetWidth, targetHeight);
  return {
    x: fit.drawX + landmark.x * fit.drawWidth,
    y: fit.drawY + landmark.y * fit.drawHeight,
  };
}
```

### Step 2: Calculate Anchor Center

Find the center point of the selected anchor landmarks in both images (in export pixel coordinates):

```typescript
const beforeAnchor = getVisibleAnchorCenter(
  beforeLandmarks,
  indices,
  beforeImgWidth,
  beforeImgHeight,
);
const afterAnchor = getVisibleAnchorCenter(
  afterLandmarks,
  indices,
  afterImgWidth,
  afterImgHeight,
);
```

If primary anchor landmarks aren't visible, fall back to:

1. Nose (always good for vertical alignment)
2. Any visible shoulder

### Step 3: Calculate Scale Factor

Determine how much to scale the "after" image so body sizes match. Multiple strategies handle different pose types:

**Strategy 1: Nose to Hip Center (Front Poses)**

- Best accuracy for front-facing poses
- Requires: nose + both hips visible in both images
- Measures vertical distance from nose to hip center

**Strategy 2: Nose to Single Hip (Side Poses)**

- Fallback for side poses where one hip is occluded
- Requires: nose + at least one hip visible in both images
- Uses whichever hip is visible

**Strategy 3: Shoulder to Hip Same Side (Side Poses)**

- Alternative for side poses
- Requires: shoulder + hip on same side visible in both images
- Measures torso height

Scale is clamped to 0.5-2.0 range to prevent extreme transformations.

### Step 4: Calculate Offset

After scaling, calculate the pixel offset needed to align the anchor points:

```typescript
// After scaling around center, anchor moves to:
const scaledAfterX = centerX + (afterX - centerX) * scale;
const scaledAfterY = centerY + (afterY - centerY) * scale;

// Offset to align with before anchor:
const offsetX = beforeX - scaledAfterX;
const offsetY = beforeY - scaledAfterY;
```

### Step 5: Apply Transform

The "after" image is drawn with:

1. Cover-fit to fill the target area
2. Scale applied around center
3. Pixel offset applied

```typescript
const drawX = centerX - scaledWidth / 2 + offsetX;
const drawY = centerY - scaledHeight / 2 + offsetY;
ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
```

## Preview vs Export

### Preview (PhotoPanel.tsx)

Uses CSS transforms with normalized values:

```typescript
transform: `scale(${alignment.scale}) translate(${alignment.offsetX * 100}%, ${alignment.offsetY * 100}%)`;
```

Preview uses `object-contain` (no cropping).

### Export (export.ts)

Uses canvas drawing with pixel values:

- Cover-fit cropping applied
- Alignment recalculated in export coordinates
- Pixel-based offsets

**Important**: Alignment must be recalculated at export time because the cover-fit cropping changes where landmarks appear relative to the canvas.

## Known Limitations

### What Doesn't Work

1. **Side-on poses with heavy occlusion**
   - When subject is at 90° profile, MediaPipe often cannot detect landmarks
   - Visibility scores fall below threshold
   - No alignment possible without visible landmarks

2. **Using preview alignment for export**
   - Preview uses object-contain, export uses cover-fit
   - Different aspect ratios mean landmarks appear in different positions
   - Must recalculate alignment in export coordinate space

3. **Single-photo fallback strategies for scale**
   - Each strategy requires the SAME landmarks visible in BOTH images
   - If before has left hip visible but after has right hip, scale calculation fails
   - Falls back to scale=1 (no scaling)

4. **Normalized coordinates for export**
   - Original approach used normalized (0-1) alignment values
   - Failed because export cropping wasn't accounted for
   - Solution: Calculate alignment in pixel space after cover-fit

### Edge Cases

- **Very different aspect ratios**: Large differences between before/after image ratios can cause significant cropping differences
- **Subjects at different distances**: Scale calculation helps but extreme differences may exceed 0.5-2.0 clamp
- **Partial body shots**: If key landmarks (nose, hips) are outside frame, alignment degrades

## Debugging

Console logs are available during export:

```
[Alignment] Before landmarks visibility: { nose: "0.99", leftShoulder: "0.95", ... }
[Alignment] After landmarks visibility: { nose: "0.98", leftShoulder: "0.92", ... }
[Alignment] Using strategy: nose to hip center (both hips visible)
[Alignment] Body heights: { beforeBodyHeight: 450, afterBodyHeight: 480 }
[Alignment] Final result: { scale: "0.938", offsetX: "12.5", offsetY: "-8.3" }
```

Use these logs to diagnose alignment issues:

- Check if landmarks have sufficient visibility (≥0.5)
- Verify which scale strategy is being used
- Confirm reasonable scale and offset values

## Future Improvements

1. **Manual alignment mode**: For cases where pose detection fails
2. **Landmark confidence visualization**: Show users which landmarks were detected
3. **Alignment preview in export modal**: Preview before downloading
4. **Multiple anchor point combination**: Weighted average of multiple anchors
