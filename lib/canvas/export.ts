/**
 * Canvas Export Functionality
 *
 * Exports side-by-side before/after photos with automatic head alignment
 * and body scaling. Uses a three-phase algorithm:
 *
 * 1. **Scale**: Match body heights (bodyScale = before/after, clamped 0.8-1.25)
 * 2. **Constrain**: Find image with least headroom, set as alignment target
 * 3. **Position**: Align heads at target, smart-clamp for visibility
 *
 * @see docs/features/alignment-export.md for full algorithm documentation
 * @see docs/architecture/overview.md for system architecture
 */

import { addWatermark, type WatermarkOptions } from './watermark';
import type { Landmark } from '@/types/landmarks';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';

export type ExportFormat = '1:1' | '4:5' | '9:16';
export type ExportResolution = 1080 | 1440 | 2160;

export interface ExportOptions {
  format: ExportFormat;
  resolution?: ExportResolution; // default 1080
  includeLabels?: boolean; // "Before" / "After" labels
  watermark: {
    isPro: boolean;
    customLogoUrl?: string;
  };
  quality?: number; // 0.8-1.0, default 0.92
  backgroundSettings?: BackgroundSettings; // Optional background replacement settings
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

/**
 * Load an image from a data URL
 *
 * @param dataUrl - Data URL of the image to load
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    img.src = dataUrl;
  });
}

/**
 * Calculate canvas dimensions based on format and resolution
 *
 * @param format - Export format ratio
 * @param resolution - Target width in pixels
 * @returns Object with width, height, and halfWidth
 */
function calculateDimensions(
  format: ExportFormat,
  resolution: ExportResolution
): { width: number; height: number; halfWidth: number } {
  const width = resolution * 2; // Double width for side-by-side
  let height: number;

  switch (format) {
    case '1:1':
      height = resolution;
      break;
    case '4:5':
      height = Math.round(resolution * 1.25);
      break;
    case '9:16':
      height = Math.round((resolution * 16) / 9);
      break;
    default:
      height = resolution;
  }

  return {
    width,
    height,
    halfWidth: resolution,
  };
}

/**
 * Get aspect ratio (width/height) for a given format
 */
function getAspectRatio(format: ExportFormat): number {
  switch (format) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 0.8;
    case '9:16':
      return 9 / 16; // 0.5625
    default:
      return 1.0;
  }
}

/**
 * Calculate how an image would be drawn to cover a target area (simple cover-fit)
 * Returns the draw parameters for cover-fit behavior with center crop
 *
 * @param imgWidth - Original image width
 * @param imgHeight - Original image height
 * @param targetWidth - Target area width
 * @param targetHeight - Target area height
 */
function calculateCoverFit(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { drawX: number; drawY: number; drawWidth: number; drawHeight: number } {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > targetAspect) {
    // Image is WIDER than target - fit to height, crop sides
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    // Image is TALLER than target - fit to width, crop top/bottom
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2; // center vertically
  }

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Get shoulder center Y position from landmarks
 * Returns normalized Y (0-1) or null if shoulders not visible
 */
function getShoulderCenterY(
  landmarks: Landmark[] | undefined,
  visibilityThreshold: number = 0.5
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const hasLeft = (leftShoulder?.visibility ?? 0) >= visibilityThreshold;
  const hasRight = (rightShoulder?.visibility ?? 0) >= visibilityThreshold;

  if (hasLeft && hasRight) {
    return (leftShoulder.y + rightShoulder.y) / 2;
  } else if (hasLeft) {
    return leftShoulder.y;
  } else if (hasRight) {
    return rightShoulder.y;
  }
  return null;
}

/**
 * Get hip center Y position from landmarks
 * Returns normalized Y (0-1) or null if hips not visible
 */
function getHipCenterY(
  landmarks: Landmark[] | undefined,
  visibilityThreshold: number = 0.5
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasLeft = (leftHip?.visibility ?? 0) >= visibilityThreshold;
  const hasRight = (rightHip?.visibility ?? 0) >= visibilityThreshold;

  if (hasLeft && hasRight) {
    return (leftHip.y + rightHip.y) / 2;
  } else if (hasLeft) {
    return leftHip.y;
  } else if (hasRight) {
    return rightHip.y;
  }
  return null;
}

/**
 * Get shoulder-to-hip height from landmarks
 * Used as fallback when nose is not visible (cropped head)
 */
function getShoulderToHipHeight(
  landmarks: Landmark[] | undefined,
  visibilityThreshold: number = 0.5
): number {
  const shoulderY = getShoulderCenterY(landmarks, visibilityThreshold);
  const hipY = getHipCenterY(landmarks, visibilityThreshold);

  if (shoulderY !== null && hipY !== null) {
    return Math.abs(hipY - shoulderY);
  }
  return 0.35; // default shoulder-to-hip ratio
}

/**
 * Get normalized body height from landmarks (nose to hip center)
 * Returns value in 0-1 range representing proportion of image height
 * Falls back to shoulder-to-hip if nose is not visible or head is cropped (Y < 0.02)
 */
function getBodyHeight(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 33) return 0.5; // default

  const VISIBILITY_THRESHOLD = 0.5;
  const HEAD_CROPPED_THRESHOLD = 0.02;
  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  // Check if we have visible landmarks
  const hasNose = (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const noseIsCropped = nose && nose.y < HEAD_CROPPED_THRESHOLD;
  const hasLeftHip = (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRightHip = (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  // If nose not visible OR head is cropped (Y < 0.02), use shoulder-to-hip as fallback
  if (!hasNose || noseIsCropped) {
    return getShoulderToHipHeight(landmarks, VISIBILITY_THRESHOLD);
  }

  let hipY: number;
  if (hasLeftHip && hasRightHip) {
    hipY = (leftHip.y + rightHip.y) / 2;
  } else if (hasLeftHip) {
    hipY = leftHip.y;
  } else if (hasRightHip) {
    hipY = rightHip.y;
  } else {
    return 0.5; // no hip visible
  }

  return Math.abs(hipY - nose.y);
}

/**
 * Clamp drawY to ensure head is visible while avoiding white space
 * Priority: 1) Head visible, 2) No white space at top, 3) No white space at bottom
 */
function clampForHeadVisibility(
  drawY: number,
  drawHeight: number,
  targetHeight: number,
  headY: number
): number {
  const headPixelInImage = headY * drawHeight;
  const headPixelOnCanvas = drawY + headPixelInImage;

  // Ensure head is at least 5% from top (visible with padding)
  const minHeadOnCanvas = targetHeight * 0.05;
  if (headPixelOnCanvas < minHeadOnCanvas) {
    drawY = minHeadOnCanvas - headPixelInImage;
  }

  // Ensure no white space at top (drawY <= 0)
  drawY = Math.min(0, drawY);

  // Note: We do NOT clamp for bottom white space here.
  // The export function will crop to the shortest image's bottom,
  // then trim width to maintain aspect ratio. This preserves head alignment.

  return drawY;
}

/**
 * Calculate aligned draw parameters for BOTH images together
 *
 * THREE-PHASE APPROACH (Separated Concerns):
 *
 * Phase 1: Assess scaling required
 * - Calculate body scale to match body heights
 *
 * Phase 2: Assess headroom constraint
 * - Calculate cover-fit dimensions at final scales
 * - Determine where heads would be if images aligned to top
 * - Find the image with LEAST headroom (smallest head pixel position)
 * - Apply min/max bounds for target head position
 *
 * Phase 3: Position both images
 * - Position so heads align at the constrained position
 * - Smart clamp that prioritizes head visibility
 */
function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  targetWidth: number,
  targetHeight: number
): {
  before: { drawX: number; drawY: number; drawWidth: number; drawHeight: number };
  after: { drawX: number; drawY: number; drawWidth: number; drawHeight: number };
  useShoulderAlignment?: boolean;
  cropTopOffset?: number;
} {
  const VISIBILITY_THRESHOLD = 0.5;
  const HEAD_CROPPED_THRESHOLD = 0.02; // Head is considered cropped if Y < 2%

  // Get head Y positions (normalized 0-1, where 0 = top of image)
  const beforeNose = beforeLandmarks?.[0];
  const afterNose = afterLandmarks?.[0];
  const beforeNoseVisible = (beforeNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const afterNoseVisible = (afterNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  // Detect if head is cropped (Y < 0.02 or not visible)
  const beforeHeadCropped = !beforeNoseVisible || (beforeNose && beforeNose.y < HEAD_CROPPED_THRESHOLD);
  const afterHeadCropped = !afterNoseVisible || (afterNose && afterNose.y < HEAD_CROPPED_THRESHOLD);
  const useShoulderAlignment = beforeHeadCropped || afterHeadCropped;

  // Get anchor Y position - use shoulders if either head is cropped
  let beforeAnchorY: number;
  let afterAnchorY: number;

  if (useShoulderAlignment) {
    // Use shoulder center as alignment anchor
    const beforeShoulderY = getShoulderCenterY(beforeLandmarks, VISIBILITY_THRESHOLD);
    const afterShoulderY = getShoulderCenterY(afterLandmarks, VISIBILITY_THRESHOLD);
    beforeAnchorY = beforeShoulderY ?? 0.25; // default shoulder position
    afterAnchorY = afterShoulderY ?? 0.25;
    console.log('[Alignment] Using SHOULDER alignment (head cropped):', {
      beforeHeadCropped,
      afterHeadCropped,
      beforeAnchorY,
      afterAnchorY
    });
  } else {
    // Use head (nose) as alignment anchor
    beforeAnchorY = beforeNose!.y;
    afterAnchorY = afterNose!.y;
  }

  // Legacy variable names for compatibility with rest of function
  const beforeHeadY = beforeAnchorY;
  const afterHeadY = afterAnchorY;

  // ========================================
  // PHASE 1: Assess scaling required
  // ========================================
  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);

  // Calculate scale: make after body match before body height
  // Use tighter clamp (0.8 - 1.25) for more natural results
  let bodyScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  bodyScale = Math.max(0.8, Math.min(1.25, bodyScale));

  console.log('[Phase1] Body heights:', { beforeBodyH, afterBodyH, bodyScale });

  // ========================================
  // PHASE 2: Assess headroom constraint
  // ========================================

  // Calculate cover-fit dimensions at final scales
  const beforeFit = calculateCoverFit(beforeImg.width, beforeImg.height, targetWidth, targetHeight);
  const afterFit = calculateCoverFit(afterImg.width, afterImg.height, targetWidth, targetHeight);

  // ========================================
  // PHASE 1.5: Normalize overflow between images
  // ========================================
  // Ensure both images have similar flexibility for alignment
  // This fixes the issue where a square image has no overflow when
  // exported to square format, while a portrait image has plenty
  const beforeOverflow = beforeFit.drawHeight / targetHeight;
  const afterOverflow = afterFit.drawHeight / targetHeight;

  // Target overflow is the max of both images, with a minimum of 15%
  const targetOverflow = Math.max(beforeOverflow, afterOverflow, 1.15);

  let beforeScale = 1;
  let afterScale = 1;

  if (beforeOverflow < targetOverflow) {
    beforeScale = targetOverflow / beforeOverflow;
  }
  if (afterOverflow < targetOverflow) {
    afterScale = targetOverflow / afterOverflow;
  }

  console.log('[Phase1.5] Overflow normalization:', {
    beforeOverflow,
    afterOverflow,
    targetOverflow,
    beforeScale,
    afterScale
  });

  // Apply overflow normalization to before image
  const beforeScaledWidth = beforeFit.drawWidth * beforeScale;
  const beforeScaledHeight = beforeFit.drawHeight * beforeScale;

  // Apply overflow normalization + body scale to after image
  const afterScaledWidth = afterFit.drawWidth * afterScale * bodyScale;
  const afterScaledHeight = afterFit.drawHeight * afterScale * bodyScale;

  // Where would heads be if images are positioned with top at canvas top (drawY=0)?
  const beforeHeadAtTop = beforeHeadY * beforeScaledHeight;
  const afterHeadAtTop = afterHeadY * afterScaledHeight;

  console.log('[Phase2] Head positions if aligned to top:', { beforeHeadAtTop, afterHeadAtTop });

  // The image with SMALLER headAtTop has LESS headroom available
  // Use this as our constraint - both heads will align here
  const constraintHeadPixelY = Math.min(beforeHeadAtTop, afterHeadAtTop);

  // Apply min/max bounds (5% to 20% of target height)
  const minHeadY = targetHeight * 0.05;
  const maxHeadY = targetHeight * 0.20;
  const targetHeadPixelY = Math.max(minHeadY, Math.min(maxHeadY, constraintHeadPixelY));

  console.log('[Phase2] Head constraint:', {
    constraintHeadPixelY,
    minHeadY,
    maxHeadY,
    targetHeadPixelY
  });

  // ========================================
  // PHASE 3: Position both images
  // ========================================

  // Position images so their anchor points (heads or shoulders) align at targetHeadPixelY
  let beforeDrawY = targetHeadPixelY - beforeHeadAtTop;
  let afterDrawY = targetHeadPixelY - afterHeadAtTop;

  // Calculate crop top offset for matching top edges when using shoulder alignment
  // When one head is cropped and the other isn't, we need to crop from the top
  // so both images have matching top edges
  let cropTopOffset = 0;
  if (useShoulderAlignment) {
    // Find where each image's top edge is relative to canvas top
    // If drawY is negative, that's how much of the image extends above canvas
    const beforeTopCrop = Math.abs(Math.min(0, beforeDrawY));
    const afterTopCrop = Math.abs(Math.min(0, afterDrawY));

    // Calculate how much top crop each image has naturally
    // The image with MORE negative drawY has more content cropped at top
    const maxTopCrop = Math.max(beforeTopCrop, afterTopCrop);

    // Apply consistent top crop to both by shifting both down by the same amount
    // This ensures both images show the same amount from the top
    if (beforeTopCrop < maxTopCrop) {
      // Before image has less crop - shift it down to match
      const adjustment = maxTopCrop - beforeTopCrop;
      beforeDrawY -= adjustment;
    }
    if (afterTopCrop < maxTopCrop) {
      // After image has less crop - shift it down to match
      const adjustment = maxTopCrop - afterTopCrop;
      afterDrawY -= adjustment;
    }

    // Record the crop offset for reporting
    cropTopOffset = maxTopCrop;

    console.log('[Phase3] Shoulder alignment crop adjustment:', {
      beforeTopCrop,
      afterTopCrop,
      maxTopCrop,
      cropTopOffset
    });
  }

  // Apply smart clamping that prioritizes anchor visibility (skip if using shoulder alignment
  // as we've already manually adjusted positions)
  if (!useShoulderAlignment) {
    beforeDrawY = clampForHeadVisibility(beforeDrawY, beforeScaledHeight, targetHeight, beforeHeadY);
    afterDrawY = clampForHeadVisibility(afterDrawY, afterScaledHeight, targetHeight, afterHeadY);
  }

  // Center horizontally
  const beforeDrawX = (targetWidth - beforeScaledWidth) / 2;
  const afterDrawX = (targetWidth - afterScaledWidth) / 2;

  console.log('[Phase3] Final positions:', {
    before: { drawX: beforeDrawX, drawY: beforeDrawY, drawWidth: beforeScaledWidth, drawHeight: beforeScaledHeight },
    after: { drawX: afterDrawX, drawY: afterDrawY, drawWidth: afterScaledWidth, drawHeight: afterScaledHeight },
    useShoulderAlignment,
    cropTopOffset
  });

  return {
    before: {
      drawX: beforeDrawX,
      drawY: beforeDrawY,
      drawWidth: beforeScaledWidth,
      drawHeight: beforeScaledHeight,
    },
    after: {
      drawX: afterDrawX,
      drawY: afterDrawY,
      drawWidth: afterScaledWidth,
      drawHeight: afterScaledHeight,
    },
    useShoulderAlignment,
    cropTopOffset,
  };
}

/**
 * Draw a photo on the canvas with specific draw parameters
 *
 * @param ctx - Canvas rendering context
 * @param img - Image element to draw
 * @param x - X offset for the target area (e.g., halfWidth for right side)
 * @param y - Y offset for the target area
 * @param params - Pre-calculated draw parameters
 */
function drawPhotoWithParams(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  params: { drawX: number; drawY: number; drawWidth: number; drawHeight: number }
): void {
  ctx.save();
  ctx.drawImage(img, x + params.drawX, y + params.drawY, params.drawWidth, params.drawHeight);
  ctx.restore();
}

/**
 * Draw "Before" and "After" labels on the canvas
 *
 * @param ctx - Canvas rendering context
 * @param width - Total canvas width
 * @param height - Canvas height
 * @param halfWidth - Width of each half (before/after)
 */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  halfWidth: number
): void {
  // Calculate font size based on canvas resolution
  const fontSize = Math.round(halfWidth * 0.04); // 4% of half width
  const padding = Math.round(fontSize * 1.5);

  // Save context state
  ctx.save();

  // Configure text styling
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // Text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Draw "Before" label on left half
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText('Before', halfWidth / 2, padding);

  // Draw "After" label on right half
  ctx.fillText('After', halfWidth + halfWidth / 2, padding);

  // Restore context state
  ctx.restore();
}

/**
 * Export canvas with aligned photos to different formats
 *
 * @param beforePhoto - Before photo data with landmarks
 * @param afterPhoto - After photo data with landmarks
 * @param anchor - Anchor type for alignment calculation
 * @param options - Export options
 * @returns Promise<ExportResult> - Export result with blob and metadata
 */
export async function exportCanvas(
  beforePhoto: { dataUrl: string; width: number; height: number; landmarks?: Landmark[] },
  afterPhoto: { dataUrl: string; width: number; height: number; landmarks?: Landmark[] },
  _anchor: 'head' | 'shoulders' | 'hips' | 'full', // Currently unused - alignment uses head + body height
  options: ExportOptions
): Promise<ExportResult> {
  // Set default values
  const resolution = options.resolution ?? 1080;
  const quality = options.quality ?? 0.92;
  const includeLabels = options.includeLabels ?? false;

  // Validate quality range
  if (quality < 0.8 || quality > 1.0) {
    throw new Error('Quality must be between 0.8 and 1.0');
  }

  // Calculate initial target dimensions for alignment calculation
  const { height: targetHeight, halfWidth: targetHalfWidth } = calculateDimensions(
    options.format,
    resolution
  );

  // Load both images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforePhoto.dataUrl),
    loadImage(afterPhoto.dataUrl),
  ]);

  // Calculate aligned draw parameters for both images
  // This ensures:
  // 1. Heads are at the same distance from top (using the one with least headroom)
  // 2. Bodies are scaled to match heights
  const alignParams = calculateAlignedDrawParams(
    { width: beforeImg.width, height: beforeImg.height },
    { width: afterImg.width, height: afterImg.height },
    beforePhoto.landmarks,
    afterPhoto.landmarks,
    targetHalfWidth,
    targetHeight
  );

  // Calculate where each image ends (bottom edge)
  const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
  const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;

  // Crop to the shortest image's bottom to avoid white space
  // Also don't exceed the target height
  const visibleHeight = Math.round(Math.min(beforeBottom, afterBottom, targetHeight));

  // Calculate width to maintain aspect ratio
  const aspectRatio = getAspectRatio(options.format);
  const finalHalfWidth = Math.round(visibleHeight * aspectRatio);
  const finalWidth = finalHalfWidth * 2;
  const finalHeight = visibleHeight;

  console.log('[Export] Dynamic dimensions:', {
    targetHeight,
    beforeBottom,
    afterBottom,
    visibleHeight,
    aspectRatio,
    finalWidth,
    finalHeight
  });

  // Create offscreen canvas at calculated dimensions
  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context');
  }

  // Set high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Calculate how much width we're trimming from each side
  // The alignParams were calculated for targetHalfWidth, but we're now using finalHalfWidth
  // Crop equally from both sides by shifting the draw position
  const widthTrimPerSide = (targetHalfWidth - finalHalfWidth) / 2;

  console.log('[Export] Width trim:', {
    targetHalfWidth,
    finalHalfWidth,
    widthTrimPerSide
  });

  // Create adjusted params with the trimmed X offset
  // We shift left by widthTrimPerSide to crop equally from both sides
  const beforeAdjustedParams = {
    ...alignParams.before,
    drawX: alignParams.before.drawX - widthTrimPerSide
  };
  const afterAdjustedParams = {
    ...alignParams.after,
    drawX: alignParams.after.drawX - widthTrimPerSide
  };

  // Draw before photo on left half with clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  drawPhotoWithParams(ctx, beforeImg, 0, 0, beforeAdjustedParams);
  ctx.restore();

  // Draw after photo on right half with clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(finalHalfWidth, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  drawPhotoWithParams(ctx, afterImg, finalHalfWidth, 0, afterAdjustedParams);
  ctx.restore();

  // Add labels if requested
  if (includeLabels) {
    drawLabels(ctx, finalWidth, finalHeight, finalHalfWidth);
  }

  // Add watermark
  const watermarkOptions: WatermarkOptions = {
    isPro: options.watermark.isPro,
    customLogoUrl: options.watermark.customLogoUrl,
    position: 'bottom-right',
    opacity: 0.7,
  };

  await addWatermark(ctx, finalWidth, finalHeight, watermarkOptions);

  // Convert to PNG blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      'image/png',
      quality
    );
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `svolta-export-${timestamp}.png`;

  return {
    blob,
    filename,
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * Trigger browser download of a blob
 *
 * @param blob - Blob to download
 * @param filename - Filename for the download
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
