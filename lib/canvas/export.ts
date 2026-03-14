/**
 * Canvas Export Functionality
 *
 * Exports side-by-side before/after photos with automatic head alignment
 * and body scaling. Uses the shared alignment algorithm from
 * lib/canvas/aligned-draw-params.ts for consistent results across
 * PNG export, GIF export, and preview.
 *
 * @see lib/canvas/aligned-draw-params.ts for alignment algorithm
 * @see docs/features/alignment-export.md for full documentation
 */

import { canvasLogger } from '@/lib/logger';
import { loadImage } from './load-image';
import { addWatermark, type WatermarkOptions } from './watermark';
import type { Landmark } from '@/types/landmarks';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';
import type { UserFramingOverride } from '@/types/editor';
import {
  calculateAlignedDrawParams,
  type AlignedDrawResult,
} from './aligned-draw-params';
import {
  isAlignmentDebugEnabled,
  buildLogEntry,
  logAlignment,
} from '@/lib/debug/alignment-logger';

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
  userFraming?: UserFramingOverride;
}

export interface ExportResult {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
}

/**
 * Calculate canvas dimensions based on format and resolution
 *
 * @param format - Export format ratio
 * @param resolution - Target total canvas width in pixels
 * @returns Object with width, height, and halfWidth
 */
function calculateDimensions(
  format: ExportFormat,
  resolution: ExportResolution
): { width: number; height: number; halfWidth: number } {
  const width = resolution;
  let height: number;

  switch (format) {
    case '1:1':
      height = resolution;
      break;
    case '4:5':
      height = Math.round(resolution * (5 / 4));
      break;
    case '9:16':
      height = Math.round(resolution * (16 / 9));
      break;
    default:
      height = resolution;
  }

  return {
    width,
    height,
    halfWidth: Math.round(width / 2),
  };
}

/**
 * Debug wrapper for calculateAlignedDrawParams
 *
 * When debug logging is enabled (via localStorage or env var), this logs
 * alignment inputs and results to console and writes to debug/alignment-log.json.
 *
 * Toggle via:
 * - Browser console: window.svoltaDebug.enable() / window.svoltaDebug.disable()
 * - localStorage: localStorage.setItem('svolta_debug_alignment', 'true')
 * - Environment: NEXT_PUBLIC_DEBUG_ALIGNMENT=true
 */
function calculateAlignedDrawParamsWithDebug(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  targetWidth: number,
  targetHeight: number,
  source: 'png' | 'gif' | 'preview' = 'png',
  userFraming?: UserFramingOverride
): AlignedDrawResult {
  // Call the shared alignment function
  const result = calculateAlignedDrawParams(
    beforeImg,
    afterImg,
    beforeLandmarks,
    afterLandmarks,
    targetWidth,
    targetHeight,
    userFraming
  );

  // Only log if debug is enabled
  if (isAlignmentDebugEnabled()) {
    const entry = buildLogEntry(
      beforeImg,
      afterImg,
      beforeLandmarks,
      afterLandmarks,
      targetWidth,
      targetHeight,
      result,
      source
    );

    // Fire and forget - don't block the export
    logAlignment(entry);
  }

  return result;
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

  // White stroke/outline for visibility on any background
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.round(fontSize * 0.15);
  ctx.lineJoin = 'round';

  // Draw "Before" label on left half with stroke then fill
  ctx.strokeText('Before', halfWidth / 2, padding);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillText('Before', halfWidth / 2, padding);

  // Draw "After" label on right half with stroke then fill
  ctx.strokeText('After', halfWidth + halfWidth / 2, padding);
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

  // Calculate aligned draw parameters for both images using shared function
  const alignParams = calculateAlignedDrawParamsWithDebug(
    { width: beforeImg.width, height: beforeImg.height },
    { width: afterImg.width, height: afterImg.height },
    beforePhoto.landmarks,
    afterPhoto.landmarks,
    targetHalfWidth,
    targetHeight,
    'png',
    options.userFraming
  );

  // Canvas dimensions are fixed to the exact target ratio
  const finalWidth = targetHalfWidth * 2;
  const finalHalfWidth = targetHalfWidth;
  const finalHeight = targetHeight;

  canvasLogger.debug('[Export] Dynamic dimensions:', {
    targetHeight,
    beforeBottom: alignParams.before.drawY + alignParams.before.drawHeight,
    afterBottom: alignParams.after.drawY + alignParams.after.drawHeight,
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

  // Draw before photo on left half, clipped to photo area
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  drawPhotoWithParams(ctx, beforeImg, 0, 0, alignParams.before);
  ctx.restore();

  // Draw after photo on right half, clipped to photo area
  ctx.save();
  ctx.beginPath();
  ctx.rect(finalHalfWidth, 0, finalHalfWidth, finalHeight);
  ctx.clip();
  drawPhotoWithParams(ctx, afterImg, finalHalfWidth, 0, alignParams.after);
  ctx.restore();

  // Add labels if requested
  if (includeLabels) {
    drawLabels(ctx, finalWidth, finalHeight, finalHalfWidth);
  }

  // Add watermark
  const watermarkOptions: WatermarkOptions = {
    isPro: options.watermark.isPro,
    customLogoUrl: options.watermark.customLogoUrl,
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
