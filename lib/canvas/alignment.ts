/**
 * Alignment Calculation Logic
 * Computes scale and offset for aligning two photos based on pose landmarks
 */

import type { Landmark } from '@/types/landmarks';
import { VISIBILITY_THRESHOLD } from '@/types/landmarks';

/**
 * Result of alignment calculation
 */
export interface AlignmentResult {
  scale: number;
  offsetX: number;
  offsetY: number;
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
 * Point in 2D space
 */
interface Point {
  x: number;
  y: number;
}

/**
 * Image dimensions
 */
interface ImageSize {
  width: number;
  height: number;
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
 * Calculate the center point from multiple landmarks
 * Filters out low-confidence landmarks
 *
 * @param landmarks - Array of all pose landmarks
 * @param indices - Indices of landmarks to use for center calculation
 * @param imageSize - Dimensions of the image (to convert normalized coords to pixels)
 * @returns Center point in pixel coordinates, or null if no valid landmarks
 */
function calculateCenter(
  landmarks: Landmark[],
  indices: number[],
  imageSize: ImageSize
): Point | null {
  const validLandmarks = indices
    .map((idx) => landmarks[idx])
    .filter((lm) => lm && lm.visibility >= VISIBILITY_THRESHOLD);

  if (validLandmarks.length === 0) {
    return null;
  }

  const sum = validLandmarks.reduce(
    (acc, lm) => ({
      x: acc.x + lm.x * imageSize.width,
      y: acc.y + lm.y * imageSize.height,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / validLandmarks.length,
    y: sum.y / validLandmarks.length,
  };
}

/**
 * Calculate scale factor based on shoulder width or body height
 *
 * Strategy:
 * - For head/shoulders anchors: use shoulder width
 * - For hips/full anchors: use body height (nose to hips)
 *
 * @param landmarks - Array of all pose landmarks
 * @param anchor - Type of anchor point
 * @param imageSize - Dimensions of the image
 * @returns Scale reference distance in pixels, or null if cannot calculate
 */
function calculateScaleReference(
  landmarks: Landmark[],
  anchor: AnchorType,
  imageSize: ImageSize
): number | null {
  // For head and shoulders, use shoulder width
  if (anchor === 'head' || anchor === 'shoulders') {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    if (
      !leftShoulder ||
      !rightShoulder ||
      leftShoulder.visibility < VISIBILITY_THRESHOLD ||
      rightShoulder.visibility < VISIBILITY_THRESHOLD
    ) {
      return null;
    }

    const leftX = leftShoulder.x * imageSize.width;
    const leftY = leftShoulder.y * imageSize.height;
    const rightX = rightShoulder.x * imageSize.width;
    const rightY = rightShoulder.y * imageSize.height;

    return Math.sqrt(
      Math.pow(rightX - leftX, 2) + Math.pow(rightY - leftY, 2)
    );
  }

  // For hips and full body, use body height (nose to hip center)
  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  if (
    !nose ||
    !leftHip ||
    !rightHip ||
    nose.visibility < VISIBILITY_THRESHOLD ||
    leftHip.visibility < VISIBILITY_THRESHOLD ||
    rightHip.visibility < VISIBILITY_THRESHOLD
  ) {
    return null;
  }

  const noseX = nose.x * imageSize.width;
  const noseY = nose.y * imageSize.height;
  const hipCenterX = ((leftHip.x + rightHip.x) / 2) * imageSize.width;
  const hipCenterY = ((leftHip.y + rightHip.y) / 2) * imageSize.height;

  return Math.sqrt(
    Math.pow(hipCenterX - noseX, 2) + Math.pow(hipCenterY - noseY, 2)
  );
}

/**
 * Calculate alignment parameters to align two photos based on pose landmarks
 *
 * Algorithm:
 * 1. Get anchor landmarks from both photos based on anchor type
 * 2. Calculate center point of anchor landmarks for each photo
 * 3. Calculate scale factor based on shoulder width or body height
 * 4. Calculate offset to align center points
 * 5. Return { scale, offsetX, offsetY }
 *
 * @param landmarks1 - Landmarks from the first (before) photo
 * @param landmarks2 - Landmarks from the second (after) photo to be aligned
 * @param anchor - Type of anchor point to use for alignment
 * @param imageSize1 - Dimensions of the first photo
 * @param imageSize2 - Dimensions of the second photo
 * @returns Alignment result with scale and offset values
 */
export function calculateAlignment(
  landmarks1: Landmark[],
  landmarks2: Landmark[],
  anchor: AnchorType,
  imageSize1: ImageSize,
  imageSize2: ImageSize
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

  // Calculate center points for both photos
  const center1 = calculateCenter(landmarks1, indices, imageSize1);
  const center2 = calculateCenter(landmarks2, indices, imageSize2);

  if (!center1 || !center2) {
    console.warn(
      'Could not calculate center points - landmarks not visible or missing'
    );
    return DEFAULT_ALIGNMENT;
  }

  // Calculate scale factor based on body proportions
  const scaleRef1 = calculateScaleReference(landmarks1, anchor, imageSize1);
  const scaleRef2 = calculateScaleReference(landmarks2, anchor, imageSize2);

  let scale = 1;
  if (scaleRef1 && scaleRef2 && scaleRef2 > 0) {
    // Scale factor to make photo2 match photo1's proportions
    scale = scaleRef1 / scaleRef2;

    // Clamp scale to reasonable range (0.5x to 2x)
    scale = Math.max(0.5, Math.min(2, scale));
  }

  // Calculate offset to align center points
  // After scaling, we want center2 to align with center1
  const offsetX = center1.x - center2.x * scale;
  const offsetY = center1.y - center2.y * scale;

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
