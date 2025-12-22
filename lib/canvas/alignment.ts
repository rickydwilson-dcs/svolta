/**
 * Alignment Calculation Logic
 * Computes scale and offset for aligning two photos based on pose landmarks
 * All calculations use normalized coordinates (0-1 range) for resolution independence
 */

import type { Landmark } from '@/types/landmarks';
import { VISIBILITY_THRESHOLD } from '@/types/landmarks';

/**
 * Result of alignment calculation
 * All values are normalized for resolution independence
 */
export interface AlignmentResult {
  scale: number;      // Scale factor to apply to the "after" photo (>1 means zoom in, <1 means zoom out)
  offsetX: number;    // Normalized X offset (-1 to 1, where 1 = full image width)
  offsetY: number;    // Normalized Y offset (-1 to 1, where 1 = full image height)
}

/**
 * Anchor point types for alignment
 */
export type AnchorType = 'head' | 'shoulders' | 'hips' | 'full';

/**
 * Landmark indices for each anchor type
 * Based on MediaPipe Pose landmark indices
 */
export const anchorIndices: Record<AnchorType, number[]> = {
  head: [0], // nose
  shoulders: [11, 12], // left/right shoulder
  hips: [23, 24], // left/right hip
  full: [0, 23, 24], // nose + hips for full body
};

/**
 * Point in 2D space (normalized 0-1)
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Default alignment when calculation fails
 */
const DEFAULT_ALIGNMENT: AlignmentResult = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Calculate the center point from multiple landmarks in normalized coordinates
 * Filters out low-confidence landmarks
 *
 * @param landmarks - Array of all pose landmarks (already normalized 0-1)
 * @param indices - Indices of landmarks to use for center calculation
 * @returns Center point in normalized coordinates, or null if no valid landmarks
 */
function calculateNormalizedCenter(
  landmarks: Landmark[],
  indices: number[]
): Point | null {
  const validLandmarks = indices
    .map((idx) => landmarks[idx])
    .filter((lm) => lm && lm.visibility >= VISIBILITY_THRESHOLD);

  if (validLandmarks.length === 0) {
    return null;
  }

  const sum = validLandmarks.reduce(
    (acc, lm) => ({
      x: acc.x + lm.x,
      y: acc.y + lm.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / validLandmarks.length,
    y: sum.y / validLandmarks.length,
  };
}

/**
 * Calculate scale reference based on body proportions in normalized coordinates
 *
 * Uses multiple strategies to handle different poses (front, side, etc.):
 * 1. Nose to hip center (best for front poses)
 * 2. Nose to single visible hip (for side poses)
 * 3. Shoulder to hip on same side (alternative for side poses)
 *
 * @param landmarks - Array of all pose landmarks (normalized 0-1)
 * @returns Normalized scale reference (ratio within image), or null if cannot calculate
 */
function calculateNormalizedScaleReference(landmarks: Landmark[]): number | null {
  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  // Strategy 1: Nose to hip center (best for front poses)
  const canUseBothHips =
    nose?.visibility >= VISIBILITY_THRESHOLD &&
    leftHip?.visibility >= VISIBILITY_THRESHOLD &&
    rightHip?.visibility >= VISIBILITY_THRESHOLD;

  if (canUseBothHips) {
    const hipCenterY = (leftHip.y + rightHip.y) / 2;
    return Math.abs(hipCenterY - nose.y);
  }

  // Strategy 2: Nose to single visible hip (for side poses)
  const canUseLeftHip =
    nose?.visibility >= VISIBILITY_THRESHOLD &&
    leftHip?.visibility >= VISIBILITY_THRESHOLD;

  const canUseRightHip =
    nose?.visibility >= VISIBILITY_THRESHOLD &&
    rightHip?.visibility >= VISIBILITY_THRESHOLD;

  if (canUseLeftHip) {
    return Math.abs(leftHip.y - nose.y);
  }

  if (canUseRightHip) {
    return Math.abs(rightHip.y - nose.y);
  }

  // Strategy 3: Shoulder to hip on same side (for side poses)
  const canUseLeftSide =
    leftShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    leftHip?.visibility >= VISIBILITY_THRESHOLD;

  const canUseRightSide =
    rightShoulder?.visibility >= VISIBILITY_THRESHOLD &&
    rightHip?.visibility >= VISIBILITY_THRESHOLD;

  if (canUseLeftSide) {
    return Math.abs(leftHip.y - leftShoulder.y);
  }

  if (canUseRightSide) {
    return Math.abs(rightHip.y - rightShoulder.y);
  }

  return null;
}

/**
 * Calculate alignment parameters to align two photos based on pose landmarks
 *
 * Algorithm:
 * 1. Calculate normalized center points for anchor landmarks in both photos
 * 2. Calculate normalized body size (height or shoulder width) for both photos
 * 3. Compute scale factor so the "after" body matches the "before" body size
 * 4. Compute offset so the anchor points align after scaling
 *
 * Key insight: The offset calculation must account for how scale transforms work.
 * When we scale around the image center (0.5, 0.5), we need to:
 * 1. Scale the anchor point position: scaledAnchor = center + (anchor - center) * scale
 * 2. Calculate offset to move scaled anchor to match the target anchor
 *
 * The result values are all normalized:
 * - scale: ratio to apply to "after" photo
 * - offsetX/Y: normalized offset (-1 to 1 range)
 *
 * @param landmarks1 - Landmarks from the first (before) photo
 * @param landmarks2 - Landmarks from the second (after) photo to be aligned
 * @param anchor - Type of anchor point to use for alignment
 * @returns Alignment result with normalized scale and offset values
 */
export function calculateAlignment(
  landmarks1: Landmark[],
  landmarks2: Landmark[],
  anchor: AnchorType
): AlignmentResult {
  // Validate inputs
  if (
    !landmarks1 ||
    !landmarks2 ||
    landmarks1.length < 33 ||
    landmarks2.length < 33
  ) {
    console.warn('Invalid landmarks provided for alignment calculation');
    return DEFAULT_ALIGNMENT;
  }

  // Get anchor indices for the selected anchor type
  const indices = anchorIndices[anchor];

  // Calculate normalized center points for both photos
  const anchor1 = calculateNormalizedCenter(landmarks1, indices);
  const anchor2 = calculateNormalizedCenter(landmarks2, indices);

  if (!anchor1 || !anchor2) {
    console.warn(
      'Could not calculate center points - landmarks not visible or missing'
    );
    return DEFAULT_ALIGNMENT;
  }

  // Calculate normalized scale references for both photos
  const scaleRef1 = calculateNormalizedScaleReference(landmarks1);
  const scaleRef2 = calculateNormalizedScaleReference(landmarks2);

  let scale = 1;
  if (scaleRef1 && scaleRef2 && scaleRef2 > 0) {
    // Scale factor to make photo2's body match photo1's body size
    // If scaleRef1 = 0.4 (body takes 40% of image) and scaleRef2 = 0.6 (body takes 60%)
    // Then scale = 0.4/0.6 = 0.67 (zoom out the after photo)
    scale = scaleRef1 / scaleRef2;

    // Clamp scale to reasonable range (0.5x to 2x for more subtle adjustments)
    scale = Math.max(0.5, Math.min(2, scale));
  }

  // Calculate where anchor2 will be after scaling around the image center (0.5, 0.5)
  // When we scale by factor 's' around center (0.5, 0.5):
  // scaledPoint = 0.5 + (originalPoint - 0.5) * s
  const imageCenter = 0.5;
  const scaledAnchor2X = imageCenter + (anchor2.x - imageCenter) * scale;
  const scaledAnchor2Y = imageCenter + (anchor2.y - imageCenter) * scale;

  // Calculate offset to move scaled anchor2 position to match anchor1 position
  // offset = target - current
  const offsetX = anchor1.x - scaledAnchor2X;
  const offsetY = anchor1.y - scaledAnchor2Y;

  return {
    scale,
    offsetX,
    offsetY,
  };
}

/**
 * Validate if landmarks have sufficient visibility for alignment
 *
 * @param landmarks - Array of pose landmarks
 * @param anchor - Type of anchor point to validate
 * @returns True if landmarks are sufficient for alignment
 */
export function canCalculateAlignment(
  landmarks: Landmark[],
  anchor: AnchorType
): boolean {
  if (!landmarks || landmarks.length < 33) {
    return false;
  }

  const indices = anchorIndices[anchor];
  const validCount = indices.filter((idx) => {
    const lm = landmarks[idx];
    return lm && lm.visibility >= VISIBILITY_THRESHOLD;
  }).length;

  // Require at least one valid landmark for head, or at least 50% for others
  const requiredCount = anchor === 'head' ? 1 : Math.ceil(indices.length / 2);
  return validCount >= requiredCount;
}

/**
 * Get human-readable description of anchor type
 *
 * @param anchor - Type of anchor point
 * @returns Description of the anchor point
 */
export function getAnchorDescription(anchor: AnchorType): string {
  const descriptions: Record<AnchorType, string> = {
    head: 'Aligns based on head position (nose)',
    shoulders: 'Aligns based on shoulder width',
    hips: 'Aligns based on hip position',
    full: 'Aligns based on full body (head to hips)',
  };

  return descriptions[anchor];
}
