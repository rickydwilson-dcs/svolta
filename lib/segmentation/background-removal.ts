/**
 * Background Removal using @imgly/background-removal
 * Client-side processing for privacy-first photo editing
 *
 * This library provides smooth edge quality with proper alpha matting,
 * unlike binary segmentation masks.
 */

import { removeBackground as imglyRemoveBackground, preload, type Config } from '@imgly/background-removal';
import { drawBackground, type BackgroundSettings } from './backgrounds';

export interface SegmentationResult {
  /** Binary mask where person = white (255), background = black (0) */
  mask: ImageData;
  /** Image with transparent background as data URL */
  processedDataUrl: string;
  /** Original image width */
  width: number;
  /** Original image height */
  height: number;
}

export interface SegmentationOptions {
  /** Progress callback for long operations */
  onProgress?: (progress: number) => void;
  /** Confidence threshold (0-1) - not used by imgly but kept for API compatibility */
  threshold?: number;
  /** Maximum allowed image dimension (width or height) - default 4096px */
  maxDimension?: number;
}

/** Maximum image dimension for segmentation (prevents memory exhaustion) */
const DEFAULT_MAX_DIMENSION = 4096;
/** Maximum total pixels for segmentation (prevents memory exhaustion) */
const MAX_TOTAL_PIXELS = 16_777_216; // 4096 * 4096 = 16 megapixels

// Track if model has been preloaded
let isPreloaded = false;
let preloadPromise: Promise<void> | null = null;

/**
 * Preload the background removal model
 * This can be called early to speed up first-time usage
 */
export async function preloadModel(): Promise<void> {
  if (isPreloaded) return;

  if (preloadPromise) {
    return preloadPromise;
  }

  const config: Config = {
    debug: false,
    model: 'isnet', // Best quality model
    output: {
      format: 'image/png',
      quality: 1.0,
    },
  };

  preloadPromise = preload(config).then(() => {
    isPreloaded = true;
  });

  return preloadPromise;
}

/**
 * Load image from data URL
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));

    img.src = dataUrl;
  });
}

/**
 * Convert Blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract alpha channel as a mask ImageData from a transparent PNG
 * White (255) = person (opaque), Black (0) = background (transparent)
 */
async function extractMaskFromTransparentImage(
  transparentDataUrl: string,
  width: number,
  height: number
): Promise<ImageData> {
  const img = await loadImage(transparentDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  // Create mask from alpha channel
  const mask = new ImageData(width, height);
  const srcPixels = imageData.data;
  const maskPixels = mask.data;

  for (let i = 0; i < srcPixels.length; i += 4) {
    const alpha = srcPixels[i + 3]; // Alpha channel

    // Set RGB to alpha value (white = person, black = background)
    maskPixels[i] = alpha;     // R
    maskPixels[i + 1] = alpha; // G
    maskPixels[i + 2] = alpha; // B
    maskPixels[i + 3] = 255;   // A (fully opaque mask)
  }

  return mask;
}

/**
 * Main function to remove background from an image
 * Returns the segmentation mask and processed image with transparent background
 */
export async function removeBackground(
  imageDataUrl: string,
  options: SegmentationOptions = {}
): Promise<SegmentationResult> {
  const { onProgress, maxDimension = DEFAULT_MAX_DIMENSION } = options;

  try {
    // Report progress
    onProgress?.(0.05);

    // Load image to get dimensions
    const img = await loadImage(imageDataUrl);
    const { width, height } = img;

    // Validate image dimensions to prevent memory exhaustion
    if (width > maxDimension || height > maxDimension) {
      throw new Error(
        `Image dimensions (${width}x${height}) exceed maximum allowed (${maxDimension}px). Please use a smaller image.`
      );
    }

    const totalPixels = width * height;
    if (totalPixels > MAX_TOTAL_PIXELS) {
      throw new Error(
        `Image has too many pixels (${(totalPixels / 1_000_000).toFixed(1)}MP). Maximum is ${(MAX_TOTAL_PIXELS / 1_000_000).toFixed(0)}MP.`
      );
    }

    onProgress?.(0.1);

    // Configure imgly background removal
    const config: Config = {
      debug: false,
      model: 'isnet', // Best quality model with smooth edges
      output: {
        format: 'image/png',
        quality: 1.0,
      },
      progress: (key, current, total) => {
        // Map imgly progress to our 0.1-0.9 range
        if (total > 0) {
          const imglyProgress = current / total;
          onProgress?.(0.1 + imglyProgress * 0.8);
        }
      },
    };

    // Convert data URL to blob for imgly
    const response = await fetch(imageDataUrl);
    const imageBlob = await response.blob();

    onProgress?.(0.15);

    // Run background removal with imgly
    const resultBlob = await imglyRemoveBackground(imageBlob, config);

    onProgress?.(0.9);

    // Convert result blob to data URL
    const processedDataUrl = await blobToDataUrl(resultBlob);

    // Extract mask from the transparent result
    const mask = await extractMaskFromTransparentImage(processedDataUrl, width, height);

    onProgress?.(1.0);

    return {
      mask,
      processedDataUrl,
      width,
      height,
    };
  } catch (error) {
    throw new Error(
      `Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Apply a new background to a segmented image
 * Takes the original image, mask, and background settings
 */
export async function applyBackground(
  originalDataUrl: string,
  mask: ImageData,
  backgroundSettings: BackgroundSettings
): Promise<string> {
  try {
    // Load original image
    const img = await loadImage(originalDataUrl);
    const { width, height } = img;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw background first
    await drawBackground(ctx, width, height, backgroundSettings);

    // Get original image data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) {
      throw new Error('Failed to get temp canvas context');
    }

    tempCtx.drawImage(img, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);

    // Apply mask to create composite with smooth alpha blending
    const compositeData = new ImageData(width, height);
    const srcPixels = imageData.data;
    const maskPixels = mask.data;
    const dstPixels = compositeData.data;

    for (let i = 0; i < srcPixels.length; i += 4) {
      // Use the mask value directly as alpha (supports smooth edges)
      const maskValue = maskPixels[i]; // R channel of mask (0-255)

      // Copy RGB values from original
      dstPixels[i] = srcPixels[i];         // R
      dstPixels[i + 1] = srcPixels[i + 1]; // G
      dstPixels[i + 2] = srcPixels[i + 2]; // B
      dstPixels[i + 3] = maskValue;        // A (smooth alpha from mask)
    }

    // Draw the person on top of the background using composite operation
    // This properly blends the semi-transparent edges
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const compositeCtx = compositeCanvas.getContext('2d', { willReadFrequently: false });
    if (!compositeCtx) {
      throw new Error('Failed to get composite canvas context');
    }
    compositeCtx.putImageData(compositeData, 0, 0);

    // Draw composite onto background
    ctx.drawImage(compositeCanvas, 0, 0);

    // Return as data URL
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    throw new Error(
      `Failed to apply background: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if the model is ready (preloaded)
 */
export function isSegmenterReady(): boolean {
  return isPreloaded;
}

/**
 * Close and clean up resources
 * Note: imgly library handles its own cleanup, but we reset our state
 */
export function closeSegmenter(): void {
  isPreloaded = false;
  preloadPromise = null;
}
