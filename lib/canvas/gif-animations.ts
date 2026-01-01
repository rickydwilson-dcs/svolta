/**
 * GIF Animation Frame Generators
 * Creates animated frames for different animation styles
 */

/**
 * Parameters for drawing a photo on the canvas
 */
export interface DrawParams {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

/**
 * Configuration for generating a single animation frame
 */
export interface FrameConfig {
  beforeImg: HTMLImageElement;
  afterImg: HTMLImageElement;
  beforeParams: DrawParams;
  afterParams: DrawParams;
  width: number;
  height: number;
  frameIndex: number;
  totalFrames: number;
  includeLabels: boolean;
}

/**
 * Function type that generates a canvas frame
 */
export type FrameGenerator = (config: FrameConfig) => HTMLCanvasElement;

/**
 * Easing function for smooth animations
 * Provides smooth acceleration and deceleration
 *
 * @param t - Progress value (0-1)
 * @returns Eased progress value (0-1)
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Draw a photo on the canvas with specific draw parameters
 *
 * @param ctx - Canvas rendering context
 * @param img - Image element to draw
 * @param params - Draw parameters (position and size)
 */
function drawPhoto(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  params: DrawParams
): void {
  ctx.drawImage(
    img,
    params.drawX,
    params.drawY,
    params.drawWidth,
    params.drawHeight
  );
}

/**
 * Draw "Before" and "After" labels on the canvas
 *
 * @param ctx - Canvas rendering context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param label - Label text to draw
 * @param position - Horizontal position ('left' | 'right' | 'center')
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  label: string,
  position: 'left' | 'right' | 'center' = 'center'
): void {
  // Calculate font size based on canvas resolution
  const fontSize = Math.round(width * 0.04); // 4% of width
  const padding = Math.round(fontSize * 1.5);

  // Save context state
  ctx.save();

  // Configure text styling
  ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = 'top';

  // Set text alignment and x position
  let x: number;
  switch (position) {
    case 'left':
      ctx.textAlign = 'left';
      x = padding;
      break;
    case 'right':
      ctx.textAlign = 'right';
      x = width - padding;
      break;
    case 'center':
    default:
      ctx.textAlign = 'center';
      x = width / 2;
      break;
  }

  // Text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Draw label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(label, x, padding);

  // Restore context state
  ctx.restore();
}

/**
 * Generate a slider wipe animation frame
 *
 * Animation style:
 * - Vertical line sweeps from left to right
 * - Reveals "after" image progressively
 * - White line with drop shadow at wipe position
 *
 * @param config - Frame configuration
 * @returns Canvas element with the rendered frame
 */
export function generateSliderFrame(config: FrameConfig): HTMLCanvasElement {
  const {
    beforeImg,
    afterImg,
    beforeParams,
    afterParams,
    width,
    height,
    frameIndex,
    totalFrames,
    includeLabels,
  } = config;

  // Calculate progress (0-1)
  const progress = frameIndex / (totalFrames - 1);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw "after" image as base (full canvas)
  drawPhoto(ctx, afterImg, afterParams);

  // Calculate wipe position
  const wipeX = progress * width;

  // Clip and draw "before" image from wipe line to right edge
  ctx.save();
  ctx.beginPath();
  ctx.rect(wipeX, 0, width - wipeX, height);
  ctx.clip();
  drawPhoto(ctx, beforeImg, beforeParams);
  ctx.restore();

  // Draw white line with drop shadow at wipe position
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = -2;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(wipeX, 0);
  ctx.lineTo(wipeX, height);
  ctx.stroke();
  ctx.restore();

  // Add labels if requested
  if (includeLabels) {
    // Label position based on wipe progress
    // "After" on left side when wipe is on left
    // "Before" on right side when wipe is on right
    if (progress < 0.5) {
      // Wipe is on left side - show "After" label on left
      drawLabel(ctx, width, height, 'After', 'left');
    } else {
      // Wipe is on right side - show "Before" label on right
      drawLabel(ctx, width, height, 'Before', 'right');
    }
  }

  return canvas;
}

/**
 * Generate a crossfade animation frame
 *
 * Animation style:
 * - Smooth opacity transition from "before" to "after"
 * - Uses cubic easing for natural motion
 * - Both images fully visible at 50% transition
 *
 * @param config - Frame configuration
 * @returns Canvas element with the rendered frame
 */
export function generateCrossfadeFrame(config: FrameConfig): HTMLCanvasElement {
  const {
    beforeImg,
    afterImg,
    beforeParams,
    afterParams,
    width,
    height,
    frameIndex,
    totalFrames,
    includeLabels,
  } = config;

  // Calculate progress with easing (0-1)
  const rawProgress = frameIndex / (totalFrames - 1);
  const easedProgress = easeInOutCubic(rawProgress);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw "before" image with decreasing opacity
  ctx.save();
  ctx.globalAlpha = 1 - easedProgress;
  drawPhoto(ctx, beforeImg, beforeParams);
  ctx.restore();

  // Draw "after" image with increasing opacity
  ctx.save();
  ctx.globalAlpha = easedProgress;
  drawPhoto(ctx, afterImg, afterParams);
  ctx.restore();

  // Reset globalAlpha
  ctx.globalAlpha = 1;

  // Add labels if requested
  if (includeLabels) {
    // Show label based on which image is more visible
    if (easedProgress < 0.5) {
      drawLabel(ctx, width, height, 'Before', 'center');
    } else {
      drawLabel(ctx, width, height, 'After', 'center');
    }
  }

  return canvas;
}

/**
 * Generate a toggle animation frame
 *
 * Animation style:
 * - Quick snap between "before" and "after"
 * - Hold time on each image
 * - Timeline: hold before (40%), transition (10%), hold after (40%), transition (10%)
 *
 * @param config - Frame configuration
 * @returns Canvas element with the rendered frame
 */
export function generateToggleFrame(config: FrameConfig): HTMLCanvasElement {
  const {
    beforeImg,
    afterImg,
    beforeParams,
    afterParams,
    width,
    height,
    frameIndex,
    totalFrames,
    includeLabels,
  } = config;

  // Calculate progress (0-1)
  const progress = frameIndex / (totalFrames - 1);

  // Timeline segments:
  // 0.0 - 0.4: Show "before" (40%)
  // 0.4 - 0.5: Transition to "after" (10%)
  // 0.5 - 0.9: Show "after" (40%)
  // 0.9 - 1.0: Transition to "before" (10%)

  let showBefore = true;
  if (progress >= 0.4 && progress < 0.9) {
    showBefore = false;
  }

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas rendering context');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill background with white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw the current image
  if (showBefore) {
    drawPhoto(ctx, beforeImg, beforeParams);
    if (includeLabels) {
      drawLabel(ctx, width, height, 'Before', 'center');
    }
  } else {
    drawPhoto(ctx, afterImg, afterParams);
    if (includeLabels) {
      drawLabel(ctx, width, height, 'After', 'center');
    }
  }

  // Optional: Add "tap to compare" indicator on before state
  // (Commented out for now, can be enabled later)
  // if (showBefore && progress < 0.3) {
  //   const indicatorSize = Math.round(width * 0.08);
  //   const indicatorX = width / 2;
  //   const indicatorY = height - indicatorSize * 2;
  //
  //   ctx.save();
  //   ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  //   ctx.font = `500 ${indicatorSize}px Inter, system-ui, sans-serif`;
  //   ctx.textAlign = 'center';
  //   ctx.textBaseline = 'middle';
  //   ctx.fillText('👆', indicatorX, indicatorY);
  //   ctx.restore();
  // }

  return canvas;
}
