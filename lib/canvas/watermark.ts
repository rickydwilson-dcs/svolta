/**
 * Watermark Rendering Utility
 * Adds watermarks to exported canvas images based on user tier
 */

/**
 * Watermark configuration options
 */
export interface WatermarkOptions {
  isPro: boolean;
  customLogoUrl?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  opacity?: number;
}

/**
 * Default watermark settings
 */
const DEFAULT_POSITION: WatermarkOptions['position'] = 'bottom-right';
const DEFAULT_OPACITY = 0.7;
const PRO_LOGO_OPACITY = 0.9;
const WATERMARK_PADDING = 20;
const WATERMARK_FONT_SIZE = 24;
const WATERMARK_FONT = 'Inter, system-ui, sans-serif';
const MAX_LOGO_WIDTH_PERCENT = 0.15; // 15% of canvas width

/**
 * Load an image from a URL
 *
 * @param url - URL of the image to load
 * @returns Promise<HTMLImageElement> - Loaded image element
 */
async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from ${url}`));

    // Enable CORS if needed for external URLs
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Draw text watermark on canvas
 *
 * @param ctx - Canvas rendering context
 * @param text - Text to display
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param options - Watermark options for styling
 */
function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: WatermarkOptions
): void {
  const opacity = options.opacity ?? DEFAULT_OPACITY;

  // Save current context state
  ctx.save();

  // Configure text styling
  ctx.font = `bold ${WATERMARK_FONT_SIZE}px ${WATERMARK_FONT}`;
  ctx.textBaseline = 'bottom';

  // Determine text alignment based on position
  switch (options.position) {
    case 'bottom-center':
      ctx.textAlign = 'center';
      break;
    case 'bottom-left':
      ctx.textAlign = 'left';
      break;
    case 'bottom-right':
    default:
      ctx.textAlign = 'right';
      break;
  }

  // Draw text shadow for better visibility
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Draw the watermark text
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fillText(text, x, y);

  // Restore context state
  ctx.restore();
}

/**
 * Draw logo watermark on canvas
 *
 * @param ctx - Canvas rendering context
 * @param img - Image element to draw
 * @param x - X coordinate (right edge)
 * @param y - Y coordinate (bottom edge)
 * @param maxWidth - Maximum width for the logo
 * @param opacity - Logo opacity
 */
function drawLogoWatermark(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  opacity: number
): void {
  // Calculate scaled dimensions maintaining aspect ratio
  let logoWidth = img.width;
  let logoHeight = img.height;

  if (logoWidth > maxWidth) {
    const scale = maxWidth / logoWidth;
    logoWidth = maxWidth;
    logoHeight = img.height * scale;
  }

  // Calculate position (x, y represent bottom-right corner)
  const logoX = x - logoWidth;
  const logoY = y - logoHeight;

  // Save current context state
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = opacity;

  // Draw the logo
  ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);

  // Restore context state
  ctx.restore();
}

/**
 * Calculate watermark position based on canvas dimensions and position setting
 *
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param position - Position of the watermark
 * @returns Object with x and y coordinates
 */
function calculatePosition(
  canvasWidth: number,
  canvasHeight: number,
  position: WatermarkOptions['position']
): { x: number; y: number } {
  const y = canvasHeight - WATERMARK_PADDING;

  switch (position) {
    case 'bottom-left':
      return { x: WATERMARK_PADDING, y };
    case 'bottom-center':
      return { x: canvasWidth / 2, y };
    case 'bottom-right':
    default:
      return { x: canvasWidth - WATERMARK_PADDING, y };
  }
}

/**
 * Add watermark to a canvas based on user tier and preferences
 *
 * Free users: Get "PoseProof" text watermark
 * Pro users with custom logo: Get their custom logo
 * Pro users without logo: No watermark (clean export)
 *
 * @param ctx - Canvas rendering context
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param options - Watermark configuration options
 * @returns Promise<void>
 */
export async function addWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
): Promise<void> {
  // Pro users without custom logo get no watermark
  if (options.isPro && !options.customLogoUrl) {
    return;
  }

  // Set default position if not provided
  const position = options.position ?? DEFAULT_POSITION;

  // Calculate watermark position
  const { x, y } = calculatePosition(canvasWidth, canvasHeight, position);

  // Pro users with custom logo
  if (options.isPro && options.customLogoUrl) {
    try {
      const logo = await loadImage(options.customLogoUrl);
      const maxLogoWidth = canvasWidth * MAX_LOGO_WIDTH_PERCENT;

      drawLogoWatermark(
        ctx,
        logo,
        x,
        y,
        maxLogoWidth,
        PRO_LOGO_OPACITY
      );
    } catch (error) {
      console.warn('Failed to load custom logo, falling back to text watermark:', error);

      // Fallback to text watermark if logo fails to load
      drawTextWatermark(ctx, 'PoseProof', x, y, {
        ...options,
        opacity: options.opacity ?? DEFAULT_OPACITY,
      });
    }
    return;
  }

  // Free users get text watermark
  drawTextWatermark(ctx, 'PoseProof', x, y, {
    ...options,
    opacity: options.opacity ?? DEFAULT_OPACITY,
  });
}

/**
 * Validate watermark options
 *
 * @param options - Watermark options to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateWatermarkOptions(
  options: WatermarkOptions
): { isValid: boolean; error?: string } {
  // Validate opacity range
  if (options.opacity !== undefined) {
    if (options.opacity < 0 || options.opacity > 1) {
      return {
        isValid: false,
        error: 'Opacity must be between 0 and 1',
      };
    }
  }

  // Validate position
  const validPositions: WatermarkOptions['position'][] = [
    'bottom-right',
    'bottom-left',
    'bottom-center',
  ];

  if (options.position !== undefined && !validPositions.includes(options.position)) {
    return {
      isValid: false,
      error: 'Invalid position. Must be "bottom-right", "bottom-left", or "bottom-center"',
    };
  }

  // Validate custom logo URL if provided
  if (options.customLogoUrl) {
    try {
      new URL(options.customLogoUrl);
    } catch {
      return {
        isValid: false,
        error: 'Invalid custom logo URL',
      };
    }
  }

  return { isValid: true };
}

/**
 * Preview watermark settings without applying to actual canvas
 * Useful for settings UI
 *
 * @param options - Watermark options to preview
 * @returns Description of what watermark will be applied
 */
export function getWatermarkPreview(options: WatermarkOptions): string {
  if (options.isPro && !options.customLogoUrl) {
    return 'No watermark (Pro tier - clean export)';
  }

  if (options.isPro && options.customLogoUrl) {
    return `Custom logo watermark at ${options.position ?? DEFAULT_POSITION}`;
  }

  return `"PoseProof" text watermark at ${options.position ?? DEFAULT_POSITION}`;
}
