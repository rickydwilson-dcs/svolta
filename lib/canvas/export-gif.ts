/**
 * GIF Export Functionality
 *
 * Exports animated GIF comparisons with three animation styles:
 * - Slider: Vertical wipe revealing after image
 * - Crossfade: Smooth opacity transition
 * - Toggle: Quick snap between before/after
 *
 * Uses the shared alignment algorithm from lib/canvas/aligned-draw-params.ts
 * for consistent results across PNG, GIF, and preview.
 *
 * All processing is client-side using gif.js with Web Workers.
 *
 * @see lib/canvas/aligned-draw-params.ts for alignment algorithm
 * @see lib/canvas/gif-animations.ts for frame generation
 */

import GIF from 'gif.js';
import { addWatermark, type WatermarkOptions } from './watermark';
import type { Landmark } from '@/types/landmarks';
import type { ExportFormat } from './export';
import {
  generateSliderFrame,
  generateCrossfadeFrame,
  generateToggleFrame,
  type DrawParams,
} from './gif-animations';
import type { BackgroundSettings } from '@/lib/segmentation/backgrounds';
import { calculateAlignedDrawParams } from './aligned-draw-params';

/**
 * Animation style types for GIF export
 */
export type AnimationStyle = 'slider' | 'crossfade' | 'toggle';

/**
 * Configuration options for GIF export
 */
export interface GifExportOptions {
  format: ExportFormat; // '1:1' | '4:5' | '9:16'
  animationStyle: AnimationStyle;
  duration?: number; // Total animation duration in seconds (default 2)
  includeLabels?: boolean;
  watermark: {
    isPro: boolean;
    customLogoUrl?: string;
  };
  backgroundSettings?: BackgroundSettings; // Optional background replacement settings
  onProgress?: (progress: number, status: 'frames' | 'encoding') => void;
}

/**
 * Result of GIF export operation
 */
export interface GifExportResult {
  blob: Blob;
  filename: string;
  width: number;
  height: number;
  frameCount: number;
  fileSize: number;
}

/**
 * Photo data with landmarks for alignment
 */
export interface PhotoData {
  dataUrl: string;
  width: number;
  height: number;
  landmarks?: Landmark[] | null;
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
 * Get frame count and delay for animation style
 */
function getAnimationParams(
  style: AnimationStyle,
  duration: number
): { frameCount: number; frameDelays: number[] } {
  switch (style) {
    case 'slider':
      // Smooth 30fps slider animation
      return {
        frameCount: 30,
        frameDelays: Array(30).fill(Math.round((duration * 1000) / 30)),
      };

    case 'crossfade':
      // Smooth 24fps crossfade animation
      return {
        frameCount: 24,
        frameDelays: Array(24).fill(Math.round((duration * 1000) / 24)),
      };

    case 'toggle':
      // Toggle with hold times:
      // Frames 0-4 (40%): hold before = 800ms each
      // Frame 5 (10%): transition = instant
      // Frames 6-10 (40%): hold after = 800ms each
      // Frame 11 (10%): transition = instant
      return {
        frameCount: 12,
        frameDelays: [
          800, 800, 800, 800, // Hold before (frames 0-3)
          0, // Transition (frame 4)
          800, 800, 800, 800, // Hold after (frames 5-8)
          800, // Hold after (frame 9)
          0, // Transition (frame 10)
          800, // Hold before (frame 11)
        ],
      };

    default:
      // Default to crossfade
      return {
        frameCount: 24,
        frameDelays: Array(24).fill(Math.round((duration * 1000) / 24)),
      };
  }
}

/**
 * Get frame generator function for animation style
 */
function getFrameGenerator(style: AnimationStyle): typeof generateSliderFrame {
  switch (style) {
    case 'slider':
      return generateSliderFrame;
    case 'crossfade':
      return generateCrossfadeFrame;
    case 'toggle':
      return generateToggleFrame;
    default:
      return generateCrossfadeFrame;
  }
}

/**
 * Export animated GIF comparison with alignment
 *
 * Process:
 * 1. Load images and calculate alignment (same as PNG export)
 * 2. Generate animation frames using selected style
 * 3. Add watermark to each frame
 * 4. Encode frames to GIF using Web Workers
 * 5. Return blob and metadata
 *
 * @param beforePhoto - Before photo data with landmarks
 * @param afterPhoto - After photo data with landmarks
 * @param options - Export configuration options
 * @returns Promise<GifExportResult> - Export result with blob and metadata
 */
export async function exportGif(
  beforePhoto: PhotoData,
  afterPhoto: PhotoData,
  options: GifExportOptions
): Promise<GifExportResult> {
  // Set default values
  const duration = options.duration ?? 2;
  const includeLabels = options.includeLabels ?? false;

  // Calculate dimensions (half of PNG resolution for reasonable file size)
  const resolution = 540; // ~1-2MB file size
  const aspectRatio = getAspectRatio(options.format);
  const width = resolution;
  const height = Math.round(width / aspectRatio);

  console.log('[GIF Export] Starting export:', {
    format: options.format,
    animationStyle: options.animationStyle,
    width,
    height,
    duration,
  });

  // Load both images
  const [beforeImg, afterImg] = await Promise.all([
    loadImage(beforePhoto.dataUrl),
    loadImage(afterPhoto.dataUrl),
  ]);

  // Calculate aligned draw parameters using the shared function
  const alignParams = calculateAlignedDrawParams(
    { width: beforeImg.width, height: beforeImg.height },
    { width: afterImg.width, height: afterImg.height },
    beforePhoto.landmarks,
    afterPhoto.landmarks,
    width,
    height
  );

  // Get animation parameters
  const { frameCount, frameDelays } = getAnimationParams(options.animationStyle, duration);
  const frameGenerator = getFrameGenerator(options.animationStyle);

  console.log('[GIF Export] Generating frames:', { frameCount });

  // Create GIF encoder first
  const gif = new GIF({
    workers: 2,
    quality: 10, // 1-30 (lower is better quality but slower)
    width,
    height,
    workerScript: '/gif.worker.js',
  });

  // Generate frames and add to encoder immediately to reduce peak memory usage
  // This allows gif.js to copy frame data before we clean up the canvas
  for (let i = 0; i < frameCount; i++) {
    // Report frame generation progress (0-50%)
    if (options.onProgress) {
      options.onProgress((i / frameCount) * 0.5, 'frames');
    }

    const frame = frameGenerator({
      beforeImg,
      afterImg,
      beforeParams: alignParams.before as DrawParams,
      afterParams: alignParams.after as DrawParams,
      width,
      height,
      frameIndex: i,
      totalFrames: frameCount,
      includeLabels,
    });

    // Add watermark to frame
    const ctx = frame.getContext('2d');
    if (ctx) {
      const watermarkOptions: WatermarkOptions = {
        isPro: options.watermark.isPro,
        customLogoUrl: options.watermark.customLogoUrl,
        position: 'bottom-right',
        opacity: 0.7,
      };
      await addWatermark(ctx, width, height, watermarkOptions);
    }

    // Add frame to encoder immediately (gif.js copies the data)
    gif.addFrame(frame, {
      delay: frameDelays[i],
      copy: true,
    });

    // Clean up canvas immediately after adding to encoder
    // This reduces peak memory from holding all frames to ~1 frame at a time
    frame.width = 0;
    frame.height = 0;
  }

  console.log('[GIF Export] Encoding GIF with gif.js');

  // Encode GIF with timeout to prevent hanging on worker failures
  const ENCODING_TIMEOUT = 60000; // 60 seconds max

  const blob = await new Promise<Blob>((resolve, reject) => {
    let renderStarted = false;
    const timeoutId = setTimeout(() => {
      if (!renderStarted) {
        reject(new Error('GIF encoding timeout - worker may have failed to load'));
      }
    }, ENCODING_TIMEOUT);

    gif.on('start', () => {
      renderStarted = true;
    });

    gif.on('progress', (p) => {
      // Report encoding progress (50-100%)
      if (options.onProgress) {
        options.onProgress(0.5 + p * 0.5, 'encoding');
      }
    });

    gif.on('finished', (blob) => {
      clearTimeout(timeoutId);
      resolve(blob);
    });

    try {
      gif.render();
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error(`GIF encoding failed: ${error}`));
    }
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `svolta-${options.animationStyle}-${timestamp}.gif`;

  console.log('[GIF Export] Export complete:', {
    filename,
    fileSize: blob.size,
    fileSizeMB: (blob.size / 1024 / 1024).toFixed(2),
  });

  return {
    blob,
    filename,
    width,
    height,
    frameCount,
    fileSize: blob.size,
  };
}

/**
 * Trigger browser download of a GIF blob
 *
 * @param blob - Blob to download
 * @param filename - Filename for the download
 */
export function triggerGifDownload(blob: Blob, filename: string): void {
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
