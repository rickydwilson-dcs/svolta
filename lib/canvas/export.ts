/**
 * Canvas Export Functionality
 * Handles exporting the canvas with aligned photos to different formats
 */

import { addWatermark, type WatermarkOptions } from './watermark';
import type { Landmark } from '@/types/landmarks';

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
 * Calculate how an image would be drawn to cover a target area
 * Returns the draw parameters for cover-fit behavior
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
    // Image is wider - fit to height (crop sides)
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    // Image is taller - fit to width (crop top/bottom)
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Draw a photo on the canvas with proper scaling and positioning
 *
 * @param ctx - Canvas rendering context
 * @param img - Image element to draw
 * @param x - X position (left edge)
 * @param y - Y position (top edge)
 * @param width - Target width
 * @param height - Target height
 */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.save();

  const fit = calculateCoverFit(img.width, img.height, width, height);
  ctx.drawImage(img, x + fit.drawX, y + fit.drawY, fit.drawWidth, fit.drawHeight);

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
 * Transform a landmark from original image coordinates to cover-fit export coordinates
 *
 * @param landmark - Landmark with x, y in 0-1 range (original image)
 * @param imgWidth - Original image width
 * @param imgHeight - Original image height
 * @param targetWidth - Export target width
 * @param targetHeight - Export target height
 * @returns Landmark position in pixels within the target area
 */
function transformLandmarkToExport(
  landmark: { x: number; y: number },
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): { x: number; y: number } {
  const fit = calculateCoverFit(imgWidth, imgHeight, targetWidth, targetHeight);

  // The landmark at (lm.x, lm.y) in original image
  // appears at (fit.drawX + lm.x * fit.drawWidth, fit.drawY + lm.y * fit.drawHeight) in the drawn image
  return {
    x: fit.drawX + landmark.x * fit.drawWidth,
    y: fit.drawY + landmark.y * fit.drawHeight,
  };
}

/**
 * Calculate alignment for export based on where landmarks appear in cover-fit view
 *
 * This calculates scale and offset to align the after photo's anchor points
 * with the before photo's anchor points in the final export.
 */
function calculateExportAlignment(
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  beforeImgWidth: number,
  beforeImgHeight: number,
  afterImgWidth: number,
  afterImgHeight: number,
  targetWidth: number,
  targetHeight: number,
  anchor: 'head' | 'shoulders' | 'hips' | 'full'
): { scale: number; offsetX: number; offsetY: number } {
  // Default: no alignment
  const defaultResult = { scale: 1, offsetX: 0, offsetY: 0 };

  if (!beforeLandmarks || !afterLandmarks || beforeLandmarks.length < 33 || afterLandmarks.length < 33) {
    console.log('[Alignment] No landmarks available');
    return defaultResult;
  }

  const VISIBILITY_THRESHOLD = 0.5;

  // Log visibility of key landmarks for debugging
  console.log('[Alignment] Before landmarks visibility:', {
    nose: beforeLandmarks[0]?.visibility?.toFixed(2),
    leftShoulder: beforeLandmarks[11]?.visibility?.toFixed(2),
    rightShoulder: beforeLandmarks[12]?.visibility?.toFixed(2),
    leftHip: beforeLandmarks[23]?.visibility?.toFixed(2),
    rightHip: beforeLandmarks[24]?.visibility?.toFixed(2),
  });
  console.log('[Alignment] After landmarks visibility:', {
    nose: afterLandmarks[0]?.visibility?.toFixed(2),
    leftShoulder: afterLandmarks[11]?.visibility?.toFixed(2),
    rightShoulder: afterLandmarks[12]?.visibility?.toFixed(2),
    leftHip: afterLandmarks[23]?.visibility?.toFixed(2),
    rightHip: afterLandmarks[24]?.visibility?.toFixed(2),
  });

  // Anchor indices - include fallbacks for when primary anchors aren't visible
  const anchorIndices: Record<string, number[]> = {
    head: [0],
    shoulders: [11, 12],
    hips: [23, 24],
    full: [0, 23, 24],
  };

  // For anchor position calculation, use any visible landmarks from the set
  // But also fall back to other visible landmarks if the requested ones aren't available
  const getVisibleAnchorCenter = (
    landmarks: Landmark[],
    primaryIndices: number[],
    imgWidth: number,
    imgHeight: number
  ): { x: number; y: number } | null => {
    // First, try primary indices
    let x = 0, y = 0, count = 0;
    for (const idx of primaryIndices) {
      const lm = landmarks[idx];
      if (lm && lm.visibility >= VISIBILITY_THRESHOLD) {
        const pos = transformLandmarkToExport(lm, imgWidth, imgHeight, targetWidth, targetHeight);
        x += pos.x;
        y += pos.y;
        count++;
      }
    }

    if (count > 0) {
      return { x: x / count, y: y / count };
    }

    // Fallback: try nose (always good for vertical alignment)
    if (landmarks[0]?.visibility >= VISIBILITY_THRESHOLD) {
      const pos = transformLandmarkToExport(landmarks[0], imgWidth, imgHeight, targetWidth, targetHeight);
      return pos;
    }

    // Fallback: try any visible shoulder
    for (const idx of [11, 12]) {
      if (landmarks[idx]?.visibility >= VISIBILITY_THRESHOLD) {
        const pos = transformLandmarkToExport(landmarks[idx], imgWidth, imgHeight, targetWidth, targetHeight);
        return pos;
      }
    }

    return null;
  };

  const indices = anchorIndices[anchor];

  const beforeAnchor = getVisibleAnchorCenter(beforeLandmarks, indices, beforeImgWidth, beforeImgHeight);
  const afterAnchor = getVisibleAnchorCenter(afterLandmarks, indices, afterImgWidth, afterImgHeight);

  if (!beforeAnchor || !afterAnchor) {
    console.log('[Alignment] Could not find visible anchor points');
    return defaultResult;
  }

  const beforeX = beforeAnchor.x;
  const beforeY = beforeAnchor.y;
  const afterX = afterAnchor.x;
  const afterY = afterAnchor.y;

  console.log('[Alignment] Anchor positions:', { beforeX, beforeY, afterX, afterY });

  // Calculate body height for scale reference
  // Try multiple strategies to handle different poses (front, side, etc.)
  let scale = 1;

  const beforeNose = beforeLandmarks[0];
  const afterNose = afterLandmarks[0];

  // Strategy 1: Use nose to hip center (best for front poses)
  const beforeLeftHip = beforeLandmarks[23];
  const beforeRightHip = beforeLandmarks[24];
  const afterLeftHip = afterLandmarks[23];
  const afterRightHip = afterLandmarks[24];

  const canUseBothHips =
    beforeNose?.visibility >= VISIBILITY_THRESHOLD &&
    beforeLeftHip?.visibility >= VISIBILITY_THRESHOLD &&
    beforeRightHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterNose?.visibility >= VISIBILITY_THRESHOLD &&
    afterLeftHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterRightHip?.visibility >= VISIBILITY_THRESHOLD;

  // Strategy 2: Use nose to single visible hip (for side poses)
  const canUseLeftHip =
    beforeNose?.visibility >= VISIBILITY_THRESHOLD &&
    beforeLeftHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterNose?.visibility >= VISIBILITY_THRESHOLD &&
    afterLeftHip?.visibility >= VISIBILITY_THRESHOLD;

  const canUseRightHip =
    beforeNose?.visibility >= VISIBILITY_THRESHOLD &&
    beforeRightHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterNose?.visibility >= VISIBILITY_THRESHOLD &&
    afterRightHip?.visibility >= VISIBILITY_THRESHOLD;

  // Strategy 3: Use shoulder to hip on same side (for side poses)
  const beforeLeftShoulder = beforeLandmarks[11];
  const beforeRightShoulder = beforeLandmarks[12];
  const afterLeftShoulder = afterLandmarks[11];
  const afterRightShoulder = afterLandmarks[12];

  const canUseLeftSide =
    beforeLeftShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    beforeLeftHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterLeftShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    afterLeftHip?.visibility >= VISIBILITY_THRESHOLD;

  const canUseRightSide =
    beforeRightShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    beforeRightHip?.visibility >= VISIBILITY_THRESHOLD &&
    afterRightShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    afterRightHip?.visibility >= VISIBILITY_THRESHOLD;

  if (canUseBothHips) {
    console.log('[Alignment] Using strategy: nose to hip center (both hips visible)');
    // Best case: both hips visible - use hip center
    const beforeNosePos = transformLandmarkToExport(beforeNose, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight);
    const beforeHipY = (transformLandmarkToExport(beforeLeftHip, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight).y +
        transformLandmarkToExport(beforeRightHip, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight).y) / 2;

    const afterNosePos = transformLandmarkToExport(afterNose, afterImgWidth, afterImgHeight, targetWidth, targetHeight);
    const afterHipY = (transformLandmarkToExport(afterLeftHip, afterImgWidth, afterImgHeight, targetWidth, targetHeight).y +
        transformLandmarkToExport(afterRightHip, afterImgWidth, afterImgHeight, targetWidth, targetHeight).y) / 2;

    const beforeBodyHeight = Math.abs(beforeHipY - beforeNosePos.y);
    const afterBodyHeight = Math.abs(afterHipY - afterNosePos.y);

    console.log('[Alignment] Body heights:', { beforeBodyHeight, afterBodyHeight });

    if (afterBodyHeight > 0) {
      scale = beforeBodyHeight / afterBodyHeight;
    }
  } else if (canUseLeftHip || canUseRightHip) {
    console.log('[Alignment] Using strategy: nose to single hip', canUseLeftHip ? 'left' : 'right');
    // Side pose fallback: use whichever hip is visible
    const useLeftHip = canUseLeftHip;
    const beforeHip = useLeftHip ? beforeLeftHip : beforeRightHip;
    const afterHip = useLeftHip ? afterLeftHip : afterRightHip;

    const beforeNosePos = transformLandmarkToExport(beforeNose, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight);
    const beforeHipPos = transformLandmarkToExport(beforeHip, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight);

    const afterNosePos = transformLandmarkToExport(afterNose, afterImgWidth, afterImgHeight, targetWidth, targetHeight);
    const afterHipPos = transformLandmarkToExport(afterHip, afterImgWidth, afterImgHeight, targetWidth, targetHeight);

    const beforeBodyHeight = Math.abs(beforeHipPos.y - beforeNosePos.y);
    const afterBodyHeight = Math.abs(afterHipPos.y - afterNosePos.y);

    console.log('[Alignment] Body heights:', { beforeBodyHeight, afterBodyHeight });

    if (afterBodyHeight > 0) {
      scale = beforeBodyHeight / afterBodyHeight;
    }
  } else if (canUseLeftSide || canUseRightSide) {
    console.log('[Alignment] Using strategy: shoulder to hip on', canUseLeftSide ? 'left' : 'right', 'side');
    // Alternative: use shoulder-to-hip on visible side
    const useLeftSide = canUseLeftSide;
    const beforeShoulder = useLeftSide ? beforeLeftShoulder : beforeRightShoulder;
    const beforeHip = useLeftSide ? beforeLeftHip : beforeRightHip;
    const afterShoulder = useLeftSide ? afterLeftShoulder : afterRightShoulder;
    const afterHip = useLeftSide ? afterLeftHip : afterRightHip;

    const beforeShoulderPos = transformLandmarkToExport(beforeShoulder, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight);
    const beforeHipPos = transformLandmarkToExport(beforeHip, beforeImgWidth, beforeImgHeight, targetWidth, targetHeight);

    const afterShoulderPos = transformLandmarkToExport(afterShoulder, afterImgWidth, afterImgHeight, targetWidth, targetHeight);
    const afterHipPos = transformLandmarkToExport(afterHip, afterImgWidth, afterImgHeight, targetWidth, targetHeight);

    const beforeTorsoHeight = Math.abs(beforeHipPos.y - beforeShoulderPos.y);
    const afterTorsoHeight = Math.abs(afterHipPos.y - afterShoulderPos.y);

    console.log('[Alignment] Torso heights:', { beforeTorsoHeight, afterTorsoHeight });

    if (afterTorsoHeight > 0) {
      scale = beforeTorsoHeight / afterTorsoHeight;
    }
  } else {
    console.log('[Alignment] No scale strategy matched - using scale=1');
  }

  // Clamp scale to reasonable range
  scale = Math.max(0.5, Math.min(2, scale));

  // Calculate offset to align anchors
  // The after image will be scaled around its center, then offset
  const afterCenterX = targetWidth / 2;
  const afterCenterY = targetHeight / 2;

  // After scaling, the anchor moves: scaledAnchor = center + (anchor - center) * scale
  const scaledAfterX = afterCenterX + (afterX - afterCenterX) * scale;
  const scaledAfterY = afterCenterY + (afterY - afterCenterY) * scale;

  // Offset to move scaled anchor to before anchor position
  const offsetX = beforeX - scaledAfterX;
  const offsetY = beforeY - scaledAfterY;

  console.log('[Alignment] Final result:', { scale: scale.toFixed(3), offsetX: offsetX.toFixed(1), offsetY: offsetY.toFixed(1) });

  return { scale, offsetX, offsetY };
}

/**
 * Draw the after photo with alignment applied
 *
 * @param ctx - Canvas rendering context
 * @param img - After photo image element
 * @param x - Left edge of target area
 * @param y - Top edge of target area
 * @param width - Target width
 * @param height - Target height
 * @param scale - Scale factor
 * @param offsetX - Pixel offset X
 * @param offsetY - Pixel offset Y
 */
function drawAlignedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number
): void {
  ctx.save();

  // Clip to target area
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // Calculate base cover-fit
  const fit = calculateCoverFit(img.width, img.height, width, height);

  // Apply scale
  const scaledWidth = fit.drawWidth * scale;
  const scaledHeight = fit.drawHeight * scale;

  // Center of target area
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Position: center the scaled image, then apply pixel offset
  const drawX = centerX - scaledWidth / 2 + offsetX;
  const drawY = centerY - scaledHeight / 2 + offsetY;

  ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);

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
  anchor: 'head' | 'shoulders' | 'hips' | 'full',
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

  // Calculate canvas dimensions
  const { width, height, halfWidth } = calculateDimensions(
    options.format,
    resolution
  );

  // Create offscreen canvas at target resolution
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context');
  }

  // Set high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Load both images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforePhoto.dataUrl),
    loadImage(afterPhoto.dataUrl),
  ]);

  // Calculate alignment for export view
  // This accounts for cover-fit cropping when determining where landmarks appear
  const exportAlignment = calculateExportAlignment(
    beforePhoto.landmarks,
    afterPhoto.landmarks,
    beforePhoto.width,
    beforePhoto.height,
    afterPhoto.width,
    afterPhoto.height,
    halfWidth,
    height,
    anchor
  );

  // Draw before photo on left half (no alignment - this is the reference)
  drawPhoto(ctx, beforeImg, 0, 0, halfWidth, height);

  // Draw after photo on right half with calculated alignment
  drawAlignedPhoto(
    ctx,
    afterImg,
    halfWidth,
    0,
    halfWidth,
    height,
    exportAlignment.scale,
    exportAlignment.offsetX,
    exportAlignment.offsetY
  );

  // Add labels if requested
  if (includeLabels) {
    drawLabels(ctx, width, height, halfWidth);
  }

  // Add watermark
  const watermarkOptions: WatermarkOptions = {
    isPro: options.watermark.isPro,
    customLogoUrl: options.watermark.customLogoUrl,
    position: 'bottom-right',
    opacity: 0.7,
  };

  await addWatermark(ctx, width, height, watermarkOptions);

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
  const filename = `poseproof-export-${timestamp}.png`;

  return {
    blob,
    filename,
    width,
    height,
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
