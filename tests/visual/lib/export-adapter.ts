/**
 * Node.js Canvas Export Adapter
 *
 * Provides a Node.js-compatible version of the export functionality
 * using the 'canvas' package instead of browser APIs.
 *
 * This adapter replicates the core alignment logic from lib/canvas/export.ts
 * to enable headless testing without a browser environment.
 */

import { createCanvas, loadImage, type Canvas, type Image } from 'canvas';
import type { Landmark } from '@/types/landmarks';

// ============================================================================
// Types (mirrored from export.ts)
// ============================================================================

export type ExportFormat = '1:1' | '4:5' | '9:16';
export type ExportResolution = 1080 | 1440 | 2160;

export interface PhotoInput {
  dataUrl: string;
  width: number;
  height: number;
  landmarks?: Landmark[];
}

export interface ExportResult {
  buffer: Buffer;
  width: number;
  height: number;
  alignParams: {
    before: DrawParams;
    after: DrawParams;
  };
}

export interface DrawParams {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

// ============================================================================
// Helper Functions (mirrored from export.ts)
// ============================================================================

const VISIBILITY_THRESHOLD = 0.5;

/**
 * Calculate canvas dimensions based on format and resolution
 */
function calculateDimensions(
  format: ExportFormat,
  resolution: ExportResolution
): { width: number; height: number; halfWidth: number } {
  const width = resolution * 2;
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

  return { width, height, halfWidth: resolution };
}

/**
 * Get aspect ratio for a given format
 */
function getAspectRatio(format: ExportFormat): number {
  switch (format) {
    case '1:1':
      return 1.0;
    case '4:5':
      return 0.8;
    case '9:16':
      return 9 / 16;
    default:
      return 1.0;
  }
}

/**
 * Calculate cover-fit dimensions
 */
function calculateCoverFit(
  imgWidth: number,
  imgHeight: number,
  targetWidth: number,
  targetHeight: number
): DrawParams {
  const imgAspect = imgWidth / imgHeight;
  const targetAspect = targetWidth / targetHeight;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > targetAspect) {
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Get body height from landmarks
 */
function getBodyHeight(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 33) return 0.5;

  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasNose = (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasLeftHip = (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRightHip = (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (!hasNose) return 0.5;

  let hipY: number;
  if (hasLeftHip && hasRightHip) {
    hipY = (leftHip.y + rightHip.y) / 2;
  } else if (hasLeftHip) {
    hipY = leftHip.y;
  } else if (hasRightHip) {
    hipY = rightHip.y;
  } else {
    return 0.5;
  }

  return Math.abs(hipY - nose.y);
}

/**
 * Clamp drawY for head visibility
 */
function clampForHeadVisibility(
  drawY: number,
  drawHeight: number,
  targetHeight: number,
  headY: number
): number {
  const headPixelInImage = headY * drawHeight;
  const headPixelOnCanvas = drawY + headPixelInImage;

  const minHeadOnCanvas = targetHeight * 0.05;
  if (headPixelOnCanvas < minHeadOnCanvas) {
    drawY = minHeadOnCanvas - headPixelInImage;
  }

  drawY = Math.min(0, drawY);

  return drawY;
}

/**
 * Calculate aligned draw parameters for both images
 * This is the core 4-phase alignment algorithm
 */
export function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  targetWidth: number,
  targetHeight: number
): { before: DrawParams; after: DrawParams } {
  // Get head Y positions
  const beforeNose = beforeLandmarks?.[0];
  const afterNose = afterLandmarks?.[0];
  const beforeHeadY = (beforeNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD ? beforeNose!.y : 0.1;
  const afterHeadY = (afterNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD ? afterNose!.y : 0.1;

  // Phase 1: Assess scaling required
  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);

  let bodyScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  bodyScale = Math.max(0.8, Math.min(1.25, bodyScale));

  // Phase 1.5: Normalize overflow
  const beforeFit = calculateCoverFit(beforeImg.width, beforeImg.height, targetWidth, targetHeight);
  const afterFit = calculateCoverFit(afterImg.width, afterImg.height, targetWidth, targetHeight);

  const beforeOverflow = beforeFit.drawHeight / targetHeight;
  const afterOverflow = afterFit.drawHeight / targetHeight;
  const targetOverflow = Math.max(beforeOverflow, afterOverflow, 1.15);

  let beforeScale = 1;
  let afterScale = 1;

  if (beforeOverflow < targetOverflow) {
    beforeScale = targetOverflow / beforeOverflow;
  }
  if (afterOverflow < targetOverflow) {
    afterScale = targetOverflow / afterOverflow;
  }

  // Apply scales
  const beforeScaledWidth = beforeFit.drawWidth * beforeScale;
  const beforeScaledHeight = beforeFit.drawHeight * beforeScale;
  const afterScaledWidth = afterFit.drawWidth * afterScale * bodyScale;
  const afterScaledHeight = afterFit.drawHeight * afterScale * bodyScale;

  // Phase 2: Assess headroom constraint
  const beforeHeadAtTop = beforeHeadY * beforeScaledHeight;
  const afterHeadAtTop = afterHeadY * afterScaledHeight;

  const constraintHeadPixelY = Math.min(beforeHeadAtTop, afterHeadAtTop);
  const minHeadY = targetHeight * 0.05;
  const maxHeadY = targetHeight * 0.20;
  const targetHeadPixelY = Math.max(minHeadY, Math.min(maxHeadY, constraintHeadPixelY));

  // Phase 3: Position both images
  let beforeDrawY = targetHeadPixelY - beforeHeadAtTop;
  let afterDrawY = targetHeadPixelY - afterHeadAtTop;

  beforeDrawY = clampForHeadVisibility(beforeDrawY, beforeScaledHeight, targetHeight, beforeHeadY);
  afterDrawY = clampForHeadVisibility(afterDrawY, afterScaledHeight, targetHeight, afterHeadY);

  const beforeDrawX = (targetWidth - beforeScaledWidth) / 2;
  const afterDrawX = (targetWidth - afterScaledWidth) / 2;

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
  };
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Export aligned before/after images using Node.js canvas
 */
export async function exportCanvasNode(
  beforePhoto: PhotoInput,
  afterPhoto: PhotoInput,
  format: ExportFormat,
  resolution: ExportResolution = 1080
): Promise<ExportResult> {
  // Calculate initial dimensions
  const { height: targetHeight, halfWidth: targetHalfWidth } = calculateDimensions(format, resolution);

  // Load images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforePhoto.dataUrl),
    loadImage(afterPhoto.dataUrl),
  ]);

  // Calculate alignment parameters
  const alignParams = calculateAlignedDrawParams(
    { width: beforeImg.width, height: beforeImg.height },
    { width: afterImg.width, height: afterImg.height },
    beforePhoto.landmarks,
    afterPhoto.landmarks,
    targetHalfWidth,
    targetHeight
  );

  // Phase 4: Dynamic crop
  const beforeBottom = alignParams.before.drawY + alignParams.before.drawHeight;
  const afterBottom = alignParams.after.drawY + alignParams.after.drawHeight;
  const visibleHeight = Math.round(Math.min(beforeBottom, afterBottom, targetHeight));

  const aspectRatio = getAspectRatio(format);
  const finalHalfWidth = Math.round(visibleHeight * aspectRatio);
  const finalWidth = finalHalfWidth * 2;
  const finalHeight = visibleHeight;

  // Create canvas
  const canvas = createCanvas(finalWidth, finalHeight);
  const ctx = canvas.getContext('2d');

  // High quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Width trim for centering
  const widthTrimPerSide = (targetHalfWidth - finalHalfWidth) / 2;

  const beforeAdjustedParams = {
    ...alignParams.before,
    drawX: alignParams.before.drawX - widthTrimPerSide,
  };
  const afterAdjustedParams = {
    ...alignParams.after,
    drawX: alignParams.after.drawX - widthTrimPerSide,
  };

  // Draw before photo (left half)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  ctx.drawImage(
    beforeImg,
    beforeAdjustedParams.drawX,
    beforeAdjustedParams.drawY,
    beforeAdjustedParams.drawWidth,
    beforeAdjustedParams.drawHeight
  );
  ctx.restore();

  // Draw after photo (right half)
  ctx.save();
  ctx.beginPath();
  ctx.rect(finalHalfWidth, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  ctx.drawImage(
    afterImg,
    finalHalfWidth + afterAdjustedParams.drawX,
    afterAdjustedParams.drawY,
    afterAdjustedParams.drawWidth,
    afterAdjustedParams.drawHeight
  );
  ctx.restore();

  return {
    buffer: canvas.toBuffer('image/png'),
    width: finalWidth,
    height: finalHeight,
    alignParams,
  };
}

/**
 * Load a PNG file and convert to data URL
 */
export async function fileToDataUrl(filePath: string): Promise<string> {
  const fs = await import('fs');
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
