/**
 * Editor types for Svolta photo alignment
 */

import type { Landmark } from './landmarks';

/**
 * Photo data structure for before/after photos
 */
export interface Photo {
  id: string;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  landmarks: Landmark[] | null;

  // Background removal fields
  /** Whether background has been removed from this photo */
  hasBackgroundRemoved?: boolean;
  /** Original data URL before background removal (for reverting or re-applying) */
  originalDataUrl?: string;
  /** Segmentation mask for fast background changes (ImageData is not serializable, store in memory) */
  segmentationMask?: ImageData | null;
}

/**
 * Alignment settings for photo positioning
 */
export interface AlignmentSettings {
  anchor: 'head' | 'shoulders' | 'hips' | 'full';
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Default alignment settings
 */
export const DEFAULT_ALIGNMENT: AlignmentSettings = {
  anchor: 'full',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
