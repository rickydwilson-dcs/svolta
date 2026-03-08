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
  /** Image source URL (blob: URL preferred, data: URL tolerated) */
  dataUrl: string;
  width: number;
  height: number;
  landmarks: Landmark[] | null;

  // Background removal fields
  /** Whether background has been removed from this photo */
  hasBackgroundRemoved?: boolean;
  /** Original image source before background removal (blob: URL) */
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

export interface UserFramingOverride {
  zoom: number;   // 1.0 = auto default, >1 = zoomed in. Range [1.0, 3.0]
  panX: number;   // Normalized horizontal offset [-1, 1]. 0 = centered.
  panY: number;   // Normalized vertical offset [-1, 1]. 0 = centered.
}

export const DEFAULT_USER_FRAMING: UserFramingOverride = {
  zoom: 1,
  panX: 0,
  panY: 0,
};
