/**
 * Background Removal using MediaPipe Selfie Segmentation
 * Client-side processing for privacy-first photo editing
 */

import {
  ImageSegmenter,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

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
  /** Confidence threshold (0-1) - minimum confidence to consider pixel as person */
  threshold?: number;
  /** Maximum allowed image dimension (width or height) - default 4096px */
  maxDimension?: number;
}

/** Maximum image dimension for segmentation (prevents memory exhaustion) */
const DEFAULT_MAX_DIMENSION = 4096;
/** Maximum total pixels for segmentation (prevents memory exhaustion) */
const MAX_TOTAL_PIXELS = 16_777_216; // 4096 * 4096 = 16 megapixels

// Singleton instance
let imageSegmenter: ImageSegmenter | null = null;
let initializationPromise: Promise<ImageSegmenter> | null = null;

/**
 * Initialize the ImageSegmenter singleton with selfie segmentation model
 */
async function initializeSegmenter(): Promise<ImageSegmenter> {
  // Return existing instance if available
  if (imageSegmenter) {
    return imageSegmenter;
  }

  // Return pending initialization if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start new initialization
  initializationPromise = (async () => {
    try {
      // Load the vision tasks WASM files
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create the image segmenter with selfie segmentation model
      imageSegmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
          delegate: 'GPU', // Use GPU acceleration for better performance
        },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });

      return imageSegmenter;
    } catch (error) {
      // Reset state on failure
      imageSegmenter = null;
      initializationPromise = null;

      throw new Error(
        `Failed to initialize background removal: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  })();

  return initializationPromise;
}

/**
 * Convert segmentation mask to ImageData
 * Creates a binary mask where person pixels are white (255) and background is black (0)
 */
function maskToImageData(
  mask: Uint8Array,
  width: number,
  height: number,
  threshold: number = 0.5
): ImageData {
  const imageData = new ImageData(width, height);
  const pixels = imageData.data;

  for (let i = 0; i < mask.length; i++) {
    const isPerson = mask[i] / 255 > threshold;
    const pixelIndex = i * 4;

    // Set RGBA values
    pixels[pixelIndex] = isPerson ? 255 : 0; // R
    pixels[pixelIndex + 1] = isPerson ? 255 : 0; // G
    pixels[pixelIndex + 2] = isPerson ? 255 : 0; // B
    pixels[pixelIndex + 3] = 255; // A (fully opaque)
  }

  return imageData;
}

/**
 * Apply segmentation mask to image to create transparent background
 */
function applyMaskToImage(
  imageData: ImageData,
  mask: ImageData
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const srcPixels = imageData.data;
  const maskPixels = mask.data;
  const dstPixels = result.data;

  for (let i = 0; i < srcPixels.length; i += 4) {
    const maskValue = maskPixels[i]; // R channel of mask (0 or 255)

    // Copy RGB values
    dstPixels[i] = srcPixels[i]; // R
    dstPixels[i + 1] = srcPixels[i + 1]; // G
    dstPixels[i + 2] = srcPixels[i + 2]; // B

    // Set alpha based on mask
    dstPixels[i + 3] = maskValue; // Person = 255 (opaque), Background = 0 (transparent)
  }

  return result;
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
 * Convert ImageData to data URL
 */
function imageDataToDataUrl(
  imageData: ImageData,
  format: string = 'image/png',
  quality: number = 1.0
): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(format, quality);
}

/**
 * Main function to remove background from an image
 * Returns the segmentation mask and processed image with transparent background
 */
export async function removeBackground(
  imageDataUrl: string,
  options: SegmentationOptions = {}
): Promise<SegmentationResult> {
  const { onProgress, threshold = 0.5, maxDimension = DEFAULT_MAX_DIMENSION } = options;

  try {
    // Report progress
    onProgress?.(0.1);

    // Initialize segmenter
    const segmenter = await initializeSegmenter();
    onProgress?.(0.2);

    // Load image
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

    onProgress?.(0.3);

    // Create canvas to get image data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image to canvas
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    onProgress?.(0.4);

    // Perform segmentation
    const result = segmenter.segment(img);
    onProgress?.(0.6);

    if (!result.categoryMask) {
      throw new Error('Segmentation failed: no mask generated');
    }

    // Convert mask to ImageData
    const maskArray = result.categoryMask.getAsUint8Array();
    const mask = maskToImageData(maskArray, width, height, threshold);
    onProgress?.(0.7);

    // Apply mask to create transparent background
    const processedImageData = applyMaskToImage(imageData, mask);
    onProgress?.(0.8);

    // Convert to data URL
    const processedDataUrl = imageDataToDataUrl(processedImageData);
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
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: false });
    if (!tempCtx) {
      throw new Error('Failed to get temp canvas context');
    }

    tempCtx.drawImage(img, 0, 0, width, height);
    const imageData = tempCtx.getImageData(0, 0, width, height);

    // Apply mask to create composite
    const compositeData = new ImageData(width, height);
    const srcPixels = imageData.data;
    const maskPixels = mask.data;
    const dstPixels = compositeData.data;

    for (let i = 0; i < srcPixels.length; i += 4) {
      const maskValue = maskPixels[i]; // R channel of mask (0 or 255)
      const alpha = maskValue / 255;

      // Copy RGB values from original
      dstPixels[i] = srcPixels[i]; // R
      dstPixels[i + 1] = srcPixels[i + 1]; // G
      dstPixels[i + 2] = srcPixels[i + 2]; // B
      dstPixels[i + 3] = Math.round(alpha * 255); // A
    }

    // Draw the person on top of the background
    ctx.putImageData(compositeData, 0, 0);

    // Return as data URL
    return canvas.toDataURL('image/png', 1.0);
  } catch (error) {
    throw new Error(
      `Failed to apply background: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if the segmenter is ready
 */
export function isSegmenterReady(): boolean {
  return imageSegmenter !== null;
}

/**
 * Close and clean up the segmenter
 */
export function closeSegmenter(): void {
  if (imageSegmenter) {
    imageSegmenter.close();
    imageSegmenter = null;
    initializationPromise = null;
  }
}
