/**
 * Editor types for PoseProof photo alignment
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
  anchor: 'shoulders',
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};
