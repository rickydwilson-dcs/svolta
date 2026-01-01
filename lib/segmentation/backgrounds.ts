/**
 * Background presets and rendering utilities
 * Professional background options for fitness photos
 */

export type BackgroundType =
  | 'original'     // Keep original background
  | 'transparent'  // Transparent PNG
  | 'solid'        // Solid color
  | 'gradient'     // Gradient background
  | 'custom';      // Custom uploaded image

export interface GradientPreset {
  id: string;
  name: string;
  type: 'linear' | 'radial';
  colors: string[];
  angle?: number; // For linear gradients (0-360 degrees)
}

export interface BackgroundSettings {
  type: BackgroundType;
  color?: string;            // For solid backgrounds
  gradient?: GradientPreset; // For gradient backgrounds
  customUrl?: string;        // For custom uploaded backgrounds
}

/**
 * Professional gradient presets optimized for fitness photos
 */
export const GRADIENT_PRESETS: Record<string, GradientPreset> = {
  'clean-studio': {
    id: 'clean-studio',
    name: 'Clean Studio',
    type: 'linear',
    colors: ['#f5f5f5', '#e0e0e0'],
    angle: 180,
  },
  'gym-vibes': {
    id: 'gym-vibes',
    name: 'Gym Vibes',
    type: 'radial',
    colors: ['#1a1a2e', '#16213e'],
  },
  'sunset-glow': {
    id: 'sunset-glow',
    name: 'Sunset Glow',
    type: 'linear',
    colors: ['#ff9a9e', '#fecfef'],
    angle: 135,
  },
  'ocean-breeze': {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    type: 'linear',
    colors: ['#667eea', '#764ba2'],
    angle: 90,
  },
  'forest-calm': {
    id: 'forest-calm',
    name: 'Forest Calm',
    type: 'radial',
    colors: ['#134e5e', '#71b280'],
  },
  'energy-burst': {
    id: 'energy-burst',
    name: 'Energy Burst',
    type: 'radial',
    colors: ['#ff6b6b', '#ffd93d'],
  },
  'midnight-purple': {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    type: 'linear',
    colors: ['#2d1b69', '#5f27cd'],
    angle: 45,
  },
  'coral-reef': {
    id: 'coral-reef',
    name: 'Coral Reef',
    type: 'linear',
    colors: ['#fa709a', '#fee140'],
    angle: 120,
  },
  'arctic-frost': {
    id: 'arctic-frost',
    name: 'Arctic Frost',
    type: 'radial',
    colors: ['#c9d6ff', '#e2e2e2'],
  },
  'volcanic-fire': {
    id: 'volcanic-fire',
    name: 'Volcanic Fire',
    type: 'linear',
    colors: ['#ff4e50', '#f9d423'],
    angle: 160,
  },
  'deep-space': {
    id: 'deep-space',
    name: 'Deep Space',
    type: 'radial',
    colors: ['#000000', '#434343'],
  },
  'rose-gold': {
    id: 'rose-gold',
    name: 'Rose Gold',
    type: 'linear',
    colors: ['#ed4264', '#ffedbc'],
    angle: 135,
  },
};

/**
 * Solid color presets commonly used in professional photography
 */
export const SOLID_COLOR_PRESETS = [
  { name: 'Pure White', color: '#ffffff' },
  { name: 'Black', color: '#000000' },
  { name: 'Light Gray', color: '#f0f0f0' },
  { name: 'Medium Gray', color: '#9e9e9e' },
  { name: 'Dark Gray', color: '#333333' },
  { name: 'Charcoal', color: '#1a1a1a' },
  { name: 'Navy Blue', color: '#001f3f' },
  { name: 'Sky Blue', color: '#87ceeb' },
  { name: 'Forest Green', color: '#228b22' },
  { name: 'Crimson', color: '#dc143c' },
];

/**
 * Render background to canvas context
 * Handles all background types: solid, gradient, custom, transparent
 */
export async function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: BackgroundSettings
): Promise<void> {
  const { type } = settings;

  // Enable high quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  switch (type) {
    case 'transparent':
      // Clear to transparent
      ctx.clearRect(0, 0, width, height);
      break;

    case 'solid':
      // Fill with solid color
      ctx.fillStyle = settings.color || '#ffffff';
      ctx.fillRect(0, 0, width, height);
      break;

    case 'gradient':
      if (settings.gradient) {
        const gradient = createGradient(
          ctx,
          width,
          height,
          settings.gradient
        );
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      break;

    case 'custom':
      if (settings.customUrl) {
        const bgImg = await loadBackgroundImage(settings.customUrl);
        drawCoverImage(ctx, bgImg, width, height);
      }
      break;

    case 'original':
    default:
      // Leave as is - original background will be used
      break;
  }
}

/**
 * Create a CanvasGradient from GradientPreset
 */
function createGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: GradientPreset
): CanvasGradient {
  const { type, colors, angle } = preset;

  let gradient: CanvasGradient;

  if (type === 'linear') {
    // Calculate gradient direction based on angle
    const angleRad = ((angle || 180) * Math.PI) / 180;
    const x1 = width / 2 - (Math.cos(angleRad) * width) / 2;
    const y1 = height / 2 - (Math.sin(angleRad) * height) / 2;
    const x2 = width / 2 + (Math.cos(angleRad) * width) / 2;
    const y2 = height / 2 + (Math.sin(angleRad) * height) / 2;

    gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  } else {
    // Radial gradient from center
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(width, height) / 2;

    gradient = ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius
    );
  }

  // Add color stops
  colors.forEach((color, index) => {
    const stop = colors.length > 1 ? index / (colors.length - 1) : 0;
    gradient.addColorStop(stop, color);
  });

  return gradient;
}

/**
 * Safe origins for CORS-enabled image loading
 * Only these origins will have crossOrigin set to 'anonymous'
 */
const SAFE_CORS_ORIGINS = [
  // Supabase storage (user uploads)
  'supabase.co',
  'supabase.in',
  // Same origin (relative URLs / data URLs)
  window?.location?.origin,
  // Local development
  'localhost',
  '127.0.0.1',
].filter(Boolean);

/**
 * Check if a URL is from a safe origin for CORS
 */
function isSafeCorsOrigin(url: string): boolean {
  // Data URLs are always safe (no CORS needed, but setting it doesn't hurt)
  if (url.startsWith('data:')) {
    return true;
  }

  // Relative URLs are same-origin
  if (url.startsWith('/') || url.startsWith('./')) {
    return true;
  }

  try {
    const urlObj = new URL(url);
    return SAFE_CORS_ORIGINS.some(
      (origin) => origin && urlObj.hostname.includes(origin)
    );
  } catch {
    // Invalid URL - don't set CORS
    return false;
  }
}

/**
 * Load background image from URL
 * Returns a promise that resolves with the loaded image
 * Only sets crossOrigin for known safe origins to prevent CORS attacks
 */
export async function loadBackgroundImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load background image'));

    // Only enable CORS for known safe origins
    // This prevents potential security issues with arbitrary external images
    if (isSafeCorsOrigin(url)) {
      img.crossOrigin = 'anonymous';
    }

    img.src = url;
  });
}

/**
 * Draw image in "cover" mode (similar to CSS background-size: cover)
 * Scales the image to cover the entire canvas while maintaining aspect ratio
 */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Calculate scale to cover
  const scale = Math.max(
    canvasWidth / img.width,
    canvasHeight / img.height
  );

  // Calculate centered position
  const x = (canvasWidth - img.width * scale) / 2;
  const y = (canvasHeight - img.height * scale) / 2;

  // Draw scaled and centered image
  ctx.drawImage(
    img,
    x,
    y,
    img.width * scale,
    img.height * scale
  );
}

/**
 * Get default background settings
 */
export function getDefaultBackgroundSettings(): BackgroundSettings {
  return {
    type: 'transparent',
  };
}

/**
 * Create background settings for a gradient preset
 */
export function createGradientBackground(
  presetId: string
): BackgroundSettings | null {
  const preset = GRADIENT_PRESETS[presetId];
  if (!preset) {
    return null;
  }

  return {
    type: 'gradient',
    gradient: preset,
  };
}

/**
 * Create background settings for a solid color
 */
export function createSolidBackground(color: string): BackgroundSettings {
  return {
    type: 'solid',
    color,
  };
}

/**
 * Create background settings for a custom image
 */
export function createCustomBackground(imageUrl: string): BackgroundSettings {
  return {
    type: 'custom',
    customUrl: imageUrl,
  };
}

/**
 * Get all gradient preset IDs
 */
export function getGradientPresetIds(): string[] {
  return Object.keys(GRADIENT_PRESETS);
}

/**
 * Get a gradient preset by ID
 */
export function getGradientPreset(id: string): GradientPreset | null {
  return GRADIENT_PRESETS[id] || null;
}

/**
 * Validate background settings
 */
export function validateBackgroundSettings(
  settings: BackgroundSettings
): boolean {
  const { type } = settings;

  switch (type) {
    case 'solid':
      return !!settings.color && /^#[0-9A-Fa-f]{6}$/.test(settings.color);

    case 'gradient':
      return !!settings.gradient && settings.gradient.colors.length >= 2;

    case 'custom':
      return !!settings.customUrl;

    case 'transparent':
    case 'original':
      return true;

    default:
      return false;
  }
}

/**
 * Generate a preview thumbnail of a background
 * Returns a data URL of a small preview canvas
 */
export async function generateBackgroundPreview(
  settings: BackgroundSettings,
  previewWidth: number = 120,
  previewHeight: number = 80
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = previewWidth;
  canvas.height = previewHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Failed to get canvas context for preview');
  }

  await drawBackground(ctx, previewWidth, previewHeight, settings);

  return canvas.toDataURL('image/png', 0.8);
}
