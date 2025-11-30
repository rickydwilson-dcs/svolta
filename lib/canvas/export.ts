/**
 * Canvas Export Functionality
 * Handles exporting the canvas with aligned photos to different formats
 */

import { addWatermark, type WatermarkOptions } from './watermark';

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
  // Save context state
  ctx.save();

  // Calculate aspect ratio to fit image within bounds
  const imgAspect = img.width / img.height;
  const targetAspect = width / height;

  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;

  if (imgAspect > targetAspect) {
    // Image is wider - fit to height
    drawHeight = height;
    drawWidth = height * imgAspect;
    drawX = x + (width - drawWidth) / 2;
    drawY = y;
  } else {
    // Image is taller - fit to width
    drawWidth = width;
    drawHeight = width / imgAspect;
    drawX = x;
    drawY = y + (height - drawHeight) / 2;
  }

  // Draw the image
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  // Restore context state
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
 * Apply alignment transforms to the after photo
 *
 * @param ctx - Canvas rendering context
 * @param img - After photo image element
 * @param x - Base X position
 * @param y - Base Y position
 * @param width - Target width
 * @param height - Target height
 * @param alignment - Alignment settings
 */
function drawAlignedPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  alignment: { scale: number; offsetX: number; offsetY: number }
): void {
  // Save context state
  ctx.save();

  // Apply transformations
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  // Translate to center, apply scale and offset, then translate back
  ctx.translate(centerX, centerY);
  ctx.scale(alignment.scale, alignment.scale);
  ctx.translate(-centerX + alignment.offsetX, -centerY + alignment.offsetY);

  // Draw the photo with transformations applied
  drawPhoto(ctx, img, x, y, width, height);

  // Restore context state
  ctx.restore();
}

/**
 * Export canvas with aligned photos to different formats
 *
 * @param beforePhoto - Before photo data
 * @param afterPhoto - After photo data
 * @param alignment - Alignment settings
 * @param options - Export options
 * @returns Promise<ExportResult> - Export result with blob and metadata
 */
export async function exportCanvas(
  beforePhoto: { dataUrl: string; width: number; height: number },
  afterPhoto: { dataUrl: string; width: number; height: number },
  alignment: { scale: number; offsetX: number; offsetY: number },
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

  // Draw before photo on left half
  drawPhoto(ctx, beforeImg, 0, 0, halfWidth, height);

  // Draw after photo on right half with alignment
  drawAlignedPhoto(
    ctx,
    afterImg,
    halfWidth,
    0,
    halfWidth,
    height,
    alignment
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
