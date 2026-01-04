/**
 * Alignment Validator for Visual Regression Testing
 *
 * Programmatically validates that the alignment algorithm produces
 * correct head positions, body scaling, and headroom constraints.
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

export interface AlignmentParams {
  before: DrawParams;
  after: DrawParams;
  /** Whether shoulder-based alignment was used (for cropped heads) */
  useShoulderAlignment?: boolean;
  /** How much was cropped from top to match images (in pixels) */
  cropTopOffset?: number;
}

export interface ValidationConstraints {
  /** Maximum allowed head alignment difference in pixels. Default: 2 */
  maxHeadAlignmentDelta?: number;
  /** Maximum allowed horizontal (shoulder X) alignment difference in pixels. Default: 10 */
  maxShoulderXDelta?: number;
  /** Minimum headroom percentage (0-1). Default: 0.05 (5%) */
  minHeadroom?: number;
  /** Maximum headroom percentage (0-1). Default: 0.20 (20%) */
  maxHeadroom?: number;
  /** Minimum allowed body scale. Default: 0.65 */
  minBodyScale?: number;
  /** Maximum allowed body scale. Default: 1.60 */
  maxBodyScale?: number;
}

export interface ValidationResult {
  /** Whether all validation checks passed */
  passed: boolean;
  /** Head alignment metrics */
  headAlignment: {
    beforeHeadY: number;
    afterHeadY: number;
    delta: number;
    passed: boolean;
  };
  /** Horizontal alignment metrics */
  horizontalAlignment: {
    beforeShoulderX: number;
    afterShoulderX: number;
    delta: number;
    passed: boolean;
  };
  /** Headroom metrics */
  headroom: {
    beforePercent: number;
    afterPercent: number;
    constraintPercent: number;
    passed: boolean;
  };
  /** Body scale metrics */
  bodyScale: {
    applied: number;
    expected: number;
    withinRange: boolean;
  };
  /** List of validation errors */
  errors: string[];
  /** List of warnings (non-failing issues) */
  warnings: string[];
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONSTRAINTS: Required<ValidationConstraints> = {
  maxHeadAlignmentDelta: 2, // 2px tolerance
  maxShoulderXDelta: 15, // 15px horizontal tolerance (increased from 10 for edge cases)
  minHeadroom: 0.05, // 5%
  maxHeadroom: 0.20, // 20%
  minBodyScale: 0.65, // Updated from 0.8 to handle scale-disparate photos
  maxBodyScale: 1.60, // Updated from 1.25 to handle scale-disparate photos
};

const VISIBILITY_THRESHOLD = 0.5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get head Y position from landmarks (nose)
 * Returns normalized Y position (0-1)
 */
function getHeadY(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 1) return 0.1; // default
  const nose = landmarks[0];
  if ((nose?.visibility ?? 0) < VISIBILITY_THRESHOLD) return 0.1;
  return nose.y;
}

/**
 * Get shoulder center Y position from landmarks
 * Returns normalized Y position (0-1)
 */
function getShoulderY(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 33) return 0.25; // default shoulder position
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const hasLeft = (leftShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRight = (rightShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (hasLeft && hasRight) {
    return (leftShoulder.y + rightShoulder.y) / 2;
  } else if (hasLeft) {
    return leftShoulder.y;
  } else if (hasRight) {
    return rightShoulder.y;
  }
  return 0.25;
}

/**
 * Get shoulder center X position from landmarks
 * Returns normalized X position (0-1)
 */
function getShoulderX(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 33) return 0.5; // default center position
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  const hasLeft = (leftShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRight = (rightShoulder?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (hasLeft && hasRight) {
    return (leftShoulder.x + rightShoulder.x) / 2;
  } else if (hasLeft) {
    return leftShoulder.x;
  } else if (hasRight) {
    return rightShoulder.x;
  }
  return 0.5;
}

/**
 * Get body height from landmarks (nose to hip center)
 * Returns normalized height (0-1)
 */
function getBodyHeight(landmarks: Landmark[] | undefined): number {
  if (!landmarks || landmarks.length < 33) return 0.5;

  const nose = landmarks[0];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  const hasNose = (nose?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasLeftHip = (leftHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;
  const hasRightHip = (rightHip?.visibility ?? 0) >= VISIBILITY_THRESHOLD;

  if (!hasNose) return 0.5;

  let hipY: number;
  if (hasLeftHip && hasRightHip) {
    hipY = (leftHip.y + rightHip.y) / 2;
  } else if (hasLeftHip) {
    hipY = leftHip.y;
  } else if (hasRightHip) {
    hipY = rightHip.y;
  } else {
    return 0.5;
  }

  return Math.abs(hipY - nose.y);
}

// ============================================================================
// Core Validation Function
// ============================================================================

/**
 * Validate alignment parameters against expected constraints
 */
export function validateAlignment(
  alignParams: AlignmentParams,
  beforeLandmarks: Landmark[] | undefined,
  afterLandmarks: Landmark[] | undefined,
  targetHeight: number,
  constraints: ValidationConstraints = {}
): ValidationResult {
  const opts = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Determine if we're validating shoulder alignment (for cropped heads)
  const useShoulderAlignment = alignParams.useShoulderAlignment ?? false;

  // Get normalized anchor positions (head or shoulder depending on mode)
  let beforeAnchorYNorm: number;
  let afterAnchorYNorm: number;

  if (useShoulderAlignment) {
    // Use shoulder positions for validation
    beforeAnchorYNorm = getShoulderY(beforeLandmarks);
    afterAnchorYNorm = getShoulderY(afterLandmarks);
  } else {
    // Use head positions for validation
    beforeAnchorYNorm = getHeadY(beforeLandmarks);
    afterAnchorYNorm = getHeadY(afterLandmarks);
  }

  // Calculate actual anchor positions on canvas (in pixels)
  const beforeHeadY = alignParams.before.drawY + beforeAnchorYNorm * alignParams.before.drawHeight;
  const afterHeadY = alignParams.after.drawY + afterAnchorYNorm * alignParams.after.drawHeight;

  // Alignment validation (head or shoulder depending on mode)
  const headDelta = Math.abs(beforeHeadY - afterHeadY);
  const headAlignmentPassed = headDelta <= opts.maxHeadAlignmentDelta;

  if (!headAlignmentPassed) {
    const anchorType = useShoulderAlignment ? 'Shoulder' : 'Head';
    errors.push(
      `${anchorType} alignment delta ${headDelta.toFixed(2)}px exceeds maximum ${opts.maxHeadAlignmentDelta}px`
    );
  }

  // Headroom validation (percentage from top)
  // For shoulder alignment, this represents shoulder position instead of head position
  const beforeHeadroomPercent = beforeHeadY / targetHeight;
  const afterHeadroomPercent = afterHeadY / targetHeight;
  const constraintHeadroomPercent = Math.min(beforeHeadroomPercent, afterHeadroomPercent);

  let headroomPassed = true;

  // For shoulder alignment, adjust expected position range
  // Shoulders are typically at ~15-35% from top vs heads at 5-20%
  const minPositionPercent = useShoulderAlignment ? 0.10 : opts.minHeadroom;
  const maxPositionPercent = useShoulderAlignment ? 0.40 : opts.maxHeadroom;

  // Check minimum position (anchor shouldn't be too close to top)
  if (constraintHeadroomPercent < minPositionPercent - 0.01) {
    // 1% tolerance
    const anchorType = useShoulderAlignment ? 'Shoulder' : 'Head';
    errors.push(
      `${anchorType} position ${(constraintHeadroomPercent * 100).toFixed(1)}% is below minimum ${(minPositionPercent * 100).toFixed(0)}%`
    );
    headroomPassed = false;
  }

  // Check maximum position (anchor shouldn't be too far from top)
  if (constraintHeadroomPercent > maxPositionPercent + 0.01) {
    // 1% tolerance
    const anchorType = useShoulderAlignment ? 'Shoulder' : 'Head';
    warnings.push(
      `${anchorType} position ${(constraintHeadroomPercent * 100).toFixed(1)}% exceeds expected maximum ${(maxPositionPercent * 100).toFixed(0)}%`
    );
    // This is a warning, not an error - algorithm may push down for visibility
  }

  // Body scale validation
  const beforeBodyH = getBodyHeight(beforeLandmarks);
  const afterBodyH = getBodyHeight(afterLandmarks);
  const expectedScale = afterBodyH > 0 ? beforeBodyH / afterBodyH : 1;
  const clampedExpectedScale = Math.max(opts.minBodyScale, Math.min(opts.maxBodyScale, expectedScale));

  // Calculate actual applied scale from draw heights
  const actualScale = alignParams.after.drawHeight / alignParams.before.drawHeight;
  const scaleWithinRange = actualScale >= opts.minBodyScale * 0.95 && actualScale <= opts.maxBodyScale * 1.05;

  if (!scaleWithinRange) {
    errors.push(
      `Body scale ${actualScale.toFixed(3)} outside valid range [${opts.minBodyScale}, ${opts.maxBodyScale}]`
    );
  }

  // Check for white space at top (drawY should be <= 0)
  if (alignParams.before.drawY > 1) {
    warnings.push(`Before image has white space at top: drawY = ${alignParams.before.drawY.toFixed(1)}px`);
  }
  if (alignParams.after.drawY > 1) {
    warnings.push(`After image has white space at top: drawY = ${alignParams.after.drawY.toFixed(1)}px`);
  }

  // ========================================
  // Horizontal alignment validation
  // ========================================
  const beforeShoulderXNorm = getShoulderX(beforeLandmarks);
  const afterShoulderXNorm = getShoulderX(afterLandmarks);

  // Calculate actual shoulder X positions on canvas (in pixels)
  const beforeShoulderX = alignParams.before.drawX + beforeShoulderXNorm * alignParams.before.drawWidth;
  const afterShoulderX = alignParams.after.drawX + afterShoulderXNorm * alignParams.after.drawWidth;

  const shoulderXDelta = Math.abs(beforeShoulderX - afterShoulderX);
  const horizontalAlignmentPassed = shoulderXDelta <= opts.maxShoulderXDelta;

  if (!horizontalAlignmentPassed) {
    errors.push(
      `Horizontal alignment delta ${shoulderXDelta.toFixed(2)}px exceeds maximum ${opts.maxShoulderXDelta}px`
    );
  }

  const passed = errors.length === 0;

  return {
    passed,
    headAlignment: {
      beforeHeadY,
      afterHeadY,
      delta: headDelta,
      passed: headAlignmentPassed,
    },
    horizontalAlignment: {
      beforeShoulderX,
      afterShoulderX,
      delta: shoulderXDelta,
      passed: horizontalAlignmentPassed,
    },
    headroom: {
      beforePercent: beforeHeadroomPercent,
      afterPercent: afterHeadroomPercent,
      constraintPercent: constraintHeadroomPercent,
      passed: headroomPassed,
    },
    bodyScale: {
      applied: actualScale,
      expected: clampedExpectedScale,
      withinRange: scaleWithinRange,
    },
    errors,
    warnings,
  };
}

/**
 * Format validation result for console output
 */
export function formatValidationResult(result: ValidationResult, testName: string): string {
  const status = result.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';

  let output = `  ${testName} alignment ... ${status}`;
  output += `\n    Head delta: ${result.headAlignment.delta.toFixed(2)}px`;
  output += `\n    Horizontal delta: ${result.horizontalAlignment.delta.toFixed(2)}px`;
  output += `\n    Headroom: ${(result.headroom.constraintPercent * 100).toFixed(1)}%`;
  output += `\n    Body scale: ${result.bodyScale.applied.toFixed(3)}`;

  if (result.errors.length > 0) {
    output += '\n    Errors:';
    for (const error of result.errors) {
      output += `\n      - ${error}`;
    }
  }

  if (result.warnings.length > 0) {
    output += '\n    Warnings:';
    for (const warning of result.warnings) {
      output += `\n      - ${warning}`;
    }
  }

  return output;
}

/**
 * Create a summary of multiple validation results
 */
export function summarizeValidations(
  results: Array<{ name: string; result: ValidationResult }>
): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  failures: string[];
} {
  const total = results.length;
  const passed = results.filter((r) => r.result.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? (passed / total) * 100 : 0;
  const failures = results.filter((r) => !r.result.passed).map((r) => r.name);

  return { total, passed, failed, passRate, failures };
}
