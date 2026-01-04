/**
 * Shared Aligned Draw Parameters Calculation
 *
 * This is the SINGLE source of truth for calculating how to draw before/after
 * images with proper alignment. Used by:
 * - PNG export (lib/canvas/export.ts)
 * - GIF export (lib/canvas/export-gif.ts)
 * - Preview canvas (components/features/editor/AlignedPreview.tsx)
 * - Test adapter (tests/visual/lib/export-adapter.ts)
 *
 * The algorithm has 4 phases:
 * 1. Body scaling - match body sizes between photos
 * 2. Overflow normalization - ensure both images have similar zoom
 * 3. Vertical positioning - align heads/shoulders with proper headroom
 * 4. Horizontal alignment - align shoulder centers
 */

import type { Landmark } from '@/types/landmarks';

// ============================================================================
// Types
// ============================================================================

export interface DrawParams {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
}

export interface AlignedDrawResult {
  before: DrawParams;
  after: DrawParams;
  useShoulderAlignment?: boolean;
  cropTopOffset?: number;
}

// ============================================================================
// Constants
// ============================================================================

const VISIBILITY_THRESHOLD = 0.5;
const HEAD_CROPPED_THRESHOLD = 0.02; // Head is considered cropped if Y < 2%
const MIN_BODY_SCALE = 0.65;
const MAX_BODY_SCALE = 1.60;
const MIN_HEADROOM_PERCENT = 0.05; // 5%
const MAX_HEADROOM_PERCENT = 0.20; // 20%
const MIN_OVERFLOW = 1.15; // Ensure some overflow for zoom effect
const MAX_HORIZONTAL_CROP = 0.2; // Max 20% crop on each side

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate cover-fit dimensions (image fills target, may overflow)
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
    // Image is wider - fit height, overflow width
    drawHeight = targetHeight;
    drawWidth = targetHeight * imgAspect;
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    // Image is taller - fit width, overflow height
    drawWidth = targetWidth;
    drawHeight = targetWidth / imgAspect;
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  return { drawX, drawY, drawWidth, drawHeight };
}

/**
 * Get shoulder center Y position from landmarks
 */
function getShoulderCenterY(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = VISIBILITY_THRESHOLD
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
 * Get shoulder center X position from landmarks
 * Used for horizontal alignment of subjects
 */
function getShoulderCenterX(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = VISIBILITY_THRESHOLD
): number | null {
  if (!landmarks || landmarks.length < 33) return null;

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const hasLeft = (leftShoulder?.visibility ?? 0) >= visibilityThreshold;
  const hasRight = (rightShoulder?.visibility ?? 0) >= visibilityThreshold;

  if (hasLeft && hasRight) {
    return (leftShoulder.x + rightShoulder.x) / 2;
  } else if (hasLeft) {
    return leftShoulder.x;
  } else if (hasRight) {
    return rightShoulder.x;
  }
  return null;
}

/**
 * Get hip center Y position from landmarks
 */
function getHipCenterY(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = VISIBILITY_THRESHOLD
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
 */
function getShoulderToHipHeight(
  landmarks: Landmark[] | undefined | null,
  visibilityThreshold: number = VISIBILITY_THRESHOLD
): number {
  const shoulderY = getShoulderCenterY(landmarks, visibilityThreshold);
  const hipY = getHipCenterY(landmarks, visibilityThreshold);

  if (shoulderY !== null && hipY !== null) {
    return Math.abs(hipY - shoulderY);
  }
  return 0.35; // Default fallback
}

/**
 * Get normalized body height from landmarks (nose to hip center)
 */
function getBodyHeight(landmarks: Landmark[] | undefined | null): number {
  if (!landmarks || landmarks.length < 33) return 0.5;

  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasNose = (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const noseIsCropped = nose && nose.y < HEAD_CROPPED_THRESHOLD;
  const hasLeftHip = (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRightHip = (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  // If nose not visible or cropped, use shoulder-to-hip height
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
    return 0.5; // Fallback
  }

  return Math.abs(hipY - nose.y);
}

/**
 * Smart clamp for head visibility
 * Ensures head stays visible while minimizing white space
 */
function clampForHeadVisibility(
  drawY: number,
  scaledHeight: number,
  targetHeight: number,
  headYNorm: number
): number {
  // Calculate where head would appear on canvas
  const headOnCanvas = drawY + headYNorm * scaledHeight;
  const minHeadOnCanvas = targetHeight * MIN_HEADROOM_PERCENT;

  // If head would be cut off, adjust drawY
  if (headOnCanvas < minHeadOnCanvas) {
    drawY = minHeadOnCanvas - headYNorm * scaledHeight;
  }

  // Don't allow white space at top
  return Math.min(0, drawY);
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Calculate aligned draw parameters for both before/after images
 *
 * This is the single source of truth for alignment calculations.
 * All rendering code (export, preview, GIF) should use this function.
 */
export function calculateAlignedDrawParams(
  beforeImg: { width: number; height: number },
  afterImg: { width: number; height: number },
  beforeLandmarks: Landmark[] | undefined | null,
  afterLandmarks: Landmark[] | undefined | null,
  targetWidth: number,
  targetHeight: number
): AlignedDrawResult {
  // ========================================
  // Determine alignment anchor (head vs shoulder)
  // ========================================

  const beforeNose = beforeLandmarks?.[0];
  const afterNose = afterLandmarks?.[0];
  const beforeNoseVisible = (beforeNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const afterNoseVisible = (afterNose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  // Detect if head is cropped (Y < 2% or not visible)
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

  // ========================================
  // PHASE 1: Body scaling
  // ========================================

  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);

  // Calculate scale: make after body match before body height
  // Use balanced clamp to handle real-world scale disparities
  let bodyScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  bodyScale = Math.max(MIN_BODY_SCALE, Math.min(MAX_BODY_SCALE, bodyScale));

  // ========================================
  // PHASE 2: Cover fit + overflow normalization
  // ========================================

  const beforeFit = calculateCoverFit(beforeImg.width, beforeImg.height, targetWidth, targetHeight);
  const afterFit = calculateCoverFit(afterImg.width, afterImg.height, targetWidth, targetHeight);

  // Normalize overflow so both images have similar zoom level
  const beforeOverflow = beforeFit.drawHeight / targetHeight;
  const afterOverflow = afterFit.drawHeight / targetHeight;
  const targetOverflow = Math.max(beforeOverflow, afterOverflow, MIN_OVERFLOW);

  let beforeScale = 1;
  let afterScale = 1;

  if (beforeOverflow < targetOverflow) {
    beforeScale = targetOverflow / beforeOverflow;
  }
  if (afterOverflow < targetOverflow) {
    afterScale = targetOverflow / afterOverflow;
  }

  // Apply scales (including body scale to after image)
  const beforeScaledWidth = beforeFit.drawWidth * beforeScale;
  const beforeScaledHeight = beforeFit.drawHeight * beforeScale;
  const afterScaledWidth = afterFit.drawWidth * afterScale * bodyScale;
  const afterScaledHeight = afterFit.drawHeight * afterScale * bodyScale;

  // ========================================
  // PHASE 3: Vertical positioning
  // ========================================

  // Calculate head positions if images were aligned to top
  const beforeHeadAtTop = beforeHeadY * beforeScaledHeight;
  const afterHeadAtTop = afterHeadY * afterScaledHeight;

  // Find constraint (use the higher head position as reference)
  const constraintHeadPixelY = Math.min(beforeHeadAtTop, afterHeadAtTop);
  const minHeadY = targetHeight * MIN_HEADROOM_PERCENT;
  const maxHeadY = targetHeight * MAX_HEADROOM_PERCENT;
  const targetHeadPixelY = Math.max(minHeadY, Math.min(maxHeadY, constraintHeadPixelY));

  // Position both images so heads align at targetHeadPixelY
  let beforeDrawY = targetHeadPixelY - beforeHeadAtTop;
  let afterDrawY = targetHeadPixelY - afterHeadAtTop;

  let cropTopOffset = 0;

  // Handle shoulder alignment case
  if (useShoulderAlignment) {
    const beforeTopCrop = Math.abs(Math.min(0, beforeDrawY));
    const afterTopCrop = Math.abs(Math.min(0, afterDrawY));
    const maxTopCrop = Math.max(beforeTopCrop, afterTopCrop);
    cropTopOffset = maxTopCrop;

    if (beforeTopCrop < maxTopCrop) {
      beforeDrawY -= maxTopCrop - beforeTopCrop;
    }
    if (afterTopCrop < maxTopCrop) {
      afterDrawY -= maxTopCrop - afterTopCrop;
    }
  } else {
    // Apply smart clamping for head visibility
    beforeDrawY = clampForHeadVisibility(beforeDrawY, beforeScaledHeight, targetHeight, beforeHeadY);
    afterDrawY = clampForHeadVisibility(afterDrawY, afterScaledHeight, targetHeight, afterHeadY);
  }

  // ========================================
  // PHASE 4: Horizontal alignment
  // ========================================

  // Get shoulder center X positions (normalized 0-1)
  const beforeAnchorX = getShoulderCenterX(beforeLandmarks, VISIBILITY_THRESHOLD) ?? 0.5;
  const afterAnchorX = getShoulderCenterX(afterLandmarks, VISIBILITY_THRESHOLD) ?? 0.5;

  // Position so shoulder centers align at the canvas center
  const canvasCenterX = targetWidth / 2;
  let beforeDrawX = canvasCenterX - (beforeAnchorX * beforeScaledWidth);
  let afterDrawX = canvasCenterX - (afterAnchorX * afterScaledWidth);

  // Clamp to prevent excessive cropping
  const beforeMaxCrop = beforeScaledWidth * MAX_HORIZONTAL_CROP;
  const afterMaxCrop = afterScaledWidth * MAX_HORIZONTAL_CROP;

  beforeDrawX = Math.max(
    -(beforeScaledWidth - targetWidth) - beforeMaxCrop,
    Math.min(beforeMaxCrop, beforeDrawX)
  );
  afterDrawX = Math.max(
    -(afterScaledWidth - targetWidth) - afterMaxCrop,
    Math.min(afterMaxCrop, afterDrawX)
  );

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
    useShoulderAlignment,
    cropTopOffset,
  };
}
