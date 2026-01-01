/**
 * GIF Export Functionality
 *
 * Exports animated GIF comparisons with three animation styles:
 * - Slider: Vertical wipe revealing after image
 * - Crossfade: Smooth opacity transition
 * - Toggle: Quick snap between before/after
 *
 * Uses the same alignment algorithm as PNG export for consistent results.
 * All processing is client-side using gif.js with Web Workers.
 *
 * @see lib/canvas/export.ts for PNG export and alignment algorithm
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
 * Calculate how an image would be drawn to cover a target area (simple cover-fit)
 * Returns the draw parameters for cover-fit behavior with center crop
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
  landmarks: Landmark[] | null | undefined,
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
  landmarks: Landmark[] | null | undefined,
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
  landmarks: Landmark[] | null | undefined,
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
function getBodyHeight(landmarks: Landmark[] | null | undefined): number {
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

  return drawY;
}

/**
 * Calculate aligned draw parameters for BOTH images
 * Uses the same three-phase algorithm as PNG export for consistency
 *
 * @see lib/canvas/export.ts for detailed algorithm documentation
 */
function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | null | undefined,
  afterLandmarks: Landmark[] | null | undefined,
  targetWidth: number,
  targetHeight: number
): {
  before: DrawParams;
  after: DrawParams;
} {
  const VISIBILITY_THRESHOLD = 0.5;
  const HEAD_CROPPED_THRESHOLD = 0.02;

  // Get head Y positions
  const beforeNose = beforeLandmarks?.[0];
  const afterNose = afterLandmarks?.[0];
  const beforeNoseVisible = (beforeNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const afterNoseVisible = (afterNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  // Detect if head is cropped
  const beforeHeadCropped = !beforeNoseVisible || (beforeNose && beforeNose.y < HEAD_CROPPED_THRESHOLD);
  const afterHeadCropped = !afterNoseVisible || (afterNose && afterNose.y < HEAD_CROPPED_THRESHOLD);
  const useShoulderAlignment = beforeHeadCropped || afterHeadCropped;

  // Get anchor Y position - use shoulders if either head is cropped
  let beforeAnchorY: number;
  let afterAnchorY: number;

  if (useShoulderAlignment) {
    const beforeShoulderY = getShoulderCenterY(beforeLandmarks, VISIBILITY_THRESHOLD);
    const afterShoulderY = getShoulderCenterY(afterLandmarks, VISIBILITY_THRESHOLD);
    beforeAnchorY = beforeShoulderY ?? 0.25;
    afterAnchorY = afterShoulderY ?? 0.25;
  } else {
    beforeAnchorY = beforeNose!.y;
    afterAnchorY = afterNose!.y;
  }

  const beforeHeadY = beforeAnchorY;
  const afterHeadY = afterAnchorY;

  // Phase 1: Calculate body scale
  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);

  let bodyScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  bodyScale = Math.max(0.8, Math.min(1.25, bodyScale));

  // Phase 2: Calculate cover-fit dimensions
  const beforeFit = calculateCoverFit(beforeImg.width, beforeImg.height, targetWidth, targetHeight);
  const afterFit = calculateCoverFit(afterImg.width, afterImg.height, targetWidth, targetHeight);

  // Phase 1.5: Normalize overflow
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

  // Calculate head positions if aligned to top
  const beforeHeadAtTop = beforeHeadY * beforeScaledHeight;
  const afterHeadAtTop = afterHeadY * afterScaledHeight;

  // Find constraint
  const constraintHeadPixelY = Math.min(beforeHeadAtTop, afterHeadAtTop);
  const minHeadY = targetHeight * 0.05;
  const maxHeadY = targetHeight * 0.20;
  const targetHeadPixelY = Math.max(minHeadY, Math.min(maxHeadY, constraintHeadPixelY));

  // Phase 3: Position both images
  let beforeDrawY = targetHeadPixelY - beforeHeadAtTop;
  let afterDrawY = targetHeadPixelY - afterHeadAtTop;

  // Apply crop adjustment for shoulder alignment
  if (useShoulderAlignment) {
    const beforeTopCrop = Math.abs(Math.min(0, beforeDrawY));
    const afterTopCrop = Math.abs(Math.min(0, afterDrawY));
    const maxTopCrop = Math.max(beforeTopCrop, afterTopCrop);

    if (beforeTopCrop < maxTopCrop) {
      beforeDrawY -= maxTopCrop - beforeTopCrop;
    }
    if (afterTopCrop < maxTopCrop) {
      afterDrawY -= maxTopCrop - afterTopCrop;
    }
  }

  // Apply smart clamping if not using shoulder alignment
  if (!useShoulderAlignment) {
    beforeDrawY = clampForHeadVisibility(beforeDrawY, beforeScaledHeight, targetHeight, beforeHeadY);
    afterDrawY = clampForHeadVisibility(afterDrawY, afterScaledHeight, targetHeight, afterHeadY);
  }

  // Center horizontally
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

  // Calculate aligned draw parameters
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
      beforeParams: alignParams.before,
      afterParams: alignParams.after,
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
