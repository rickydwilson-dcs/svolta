/**
 * Background Removal and Segmentation API
 * Export all public APIs for client-side background removal
 */

// Core background removal functionality
export {
  removeBackground,
  applyBackground,
  isSegmenterReady,
  closeSegmenter,
  type SegmentationResult,
  type SegmentationOptions,
} from './background-removal';

// Background presets and utilities
export {
  drawBackground,
  loadBackgroundImage,
  getDefaultBackgroundSettings,
  createGradientBackground,
  createSolidBackground,
  createCustomBackground,
  getGradientPresetIds,
  getGradientPreset,
  validateBackgroundSettings,
  generateBackgroundPreview,
  GRADIENT_PRESETS,
  SOLID_COLOR_PRESETS,
  type BackgroundType,
  type GradientPreset,
  type BackgroundSettings,
} from './backgrounds';
