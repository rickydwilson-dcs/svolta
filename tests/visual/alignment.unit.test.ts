/**
 * Unit Tests for Alignment Algorithm Pure Functions
 *
 * Tests the core calculation functions from the export adapter
 * without requiring image rendering or file I/O.
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';
import { calculateAlignedDrawParams } from './lib/export-adapter';
import type { Landmark } from '@/types/landmarks';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a minimal landmark array with key positions
 * @param opts.centerX - Optional horizontal center position (default 0.5)
 */
function createLandmarks(opts: {
  noseY: number;
  shoulderY: number;
  hipY: number;
  visibility?: number;
  centerX?: number;
}): Landmark[] {
  const vis = opts.visibility ?? 0.95;
  const lowVis = 0.1;
  const centerX = opts.centerX ?? 0.5;
  const shoulderOffset = 0.1; // Distance from center to each shoulder
  const hipOffset = 0.08; // Distance from center to each hip

  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: centerX,
    y: 0.5,
    z: 0,
    visibility: lowVis,
  }));

  // Key landmarks - positioned relative to centerX
  landmarks[0] = { x: centerX, y: opts.noseY, z: 0, visibility: vis }; // Nose
  landmarks[11] = { x: centerX - shoulderOffset, y: opts.shoulderY, z: 0, visibility: vis }; // Left shoulder
  landmarks[12] = { x: centerX + shoulderOffset, y: opts.shoulderY, z: 0, visibility: vis }; // Right shoulder
  landmarks[23] = { x: centerX - hipOffset, y: opts.hipY, z: 0, visibility: vis }; // Left hip
  landmarks[24] = { x: centerX + hipOffset, y: opts.hipY, z: 0, visibility: vis }; // Right hip

  return landmarks;
}

// ============================================================================
// Tests
// ============================================================================

describe('calculateAlignedDrawParams', () => {
  const targetWidth = 1080;
  const targetHeight = 1080; // 1:1 format

  describe('Phase 1: Body Scale Calculation', () => {
    it('should apply scale of 1.0 when body heights are equal', () => {
      const landmarks = createLandmarks({ noseY: 0.1, shoulderY: 0.2, hipY: 0.5 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // Body scale should be ~1.0, so heights should be similar
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeCloseTo(1.0, 1);
    });

    it('should scale down after image when before body is smaller', () => {
      const beforeLandmarks = createLandmarks({ noseY: 0.15, shoulderY: 0.25, hipY: 0.45 }); // 0.3 body height
      const afterLandmarks = createLandmarks({ noseY: 0.10, shoulderY: 0.20, hipY: 0.55 }); // 0.45 body height

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // After should be scaled down to match before
      // Expected scale: 0.3 / 0.45 = 0.667 (within 0.65-1.60 range)
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThanOrEqual(0.60); // Allow some tolerance for 0.65 clamp
      expect(scaleRatio).toBeLessThan(1.0);
    });

    it('should scale up after image when before body is larger', () => {
      const beforeLandmarks = createLandmarks({ noseY: 0.10, shoulderY: 0.20, hipY: 0.60 }); // 0.5 body height
      const afterLandmarks = createLandmarks({ noseY: 0.15, shoulderY: 0.25, hipY: 0.45 }); // 0.3 body height

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // After should be scaled up to match before
      // Expected scale: 0.5 / 0.3 = 1.67, but clamped to 1.60
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThan(1.0);
      expect(scaleRatio).toBeLessThanOrEqual(1.70); // Allow some tolerance for 1.60 clamp
    });

    it('should clamp scale to minimum 0.65', () => {
      const beforeLandmarks = createLandmarks({ noseY: 0.20, shoulderY: 0.30, hipY: 0.40 }); // 0.2 body height
      const afterLandmarks = createLandmarks({ noseY: 0.05, shoulderY: 0.15, hipY: 0.70 }); // 0.65 body height

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale would be 0.2/0.65 = 0.31, should be clamped to 0.65
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThanOrEqual(0.60); // Allow tolerance for 0.65 clamp
    });

    it('should clamp scale to maximum 1.60', () => {
      const beforeLandmarks = createLandmarks({ noseY: 0.05, shoulderY: 0.15, hipY: 0.70 }); // 0.65 body height
      const afterLandmarks = createLandmarks({ noseY: 0.20, shoulderY: 0.30, hipY: 0.40 }); // 0.2 body height

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale would be 0.65/0.2 = 3.25, should be clamped to 1.60
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeLessThanOrEqual(1.70); // Allow tolerance for 1.60 clamp
    });
  });

  describe('Phase 2: Headroom Constraint', () => {
    it('should position heads between 5% and 20% from top', () => {
      const landmarks = createLandmarks({ noseY: 0.15, shoulderY: 0.25, hipY: 0.55 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // Calculate actual head positions
      const beforeHeadY = result.before.drawY + 0.15 * result.before.drawHeight;
      const afterHeadY = result.after.drawY + 0.15 * result.after.drawHeight;

      // Head should be within 5-20% of target height
      const beforeHeadPercent = beforeHeadY / targetHeight;
      const afterHeadPercent = afterHeadY / targetHeight;

      expect(beforeHeadPercent).toBeGreaterThanOrEqual(0.04); // Allow small tolerance
      expect(beforeHeadPercent).toBeLessThanOrEqual(0.25);
      expect(afterHeadPercent).toBeGreaterThanOrEqual(0.04);
      expect(afterHeadPercent).toBeLessThanOrEqual(0.25);
    });

    it('should use the image with least headroom as constraint', () => {
      // Before has head at 10%, after has head at 20%
      const beforeLandmarks = createLandmarks({ noseY: 0.10, shoulderY: 0.20, hipY: 0.50 });
      const afterLandmarks = createLandmarks({ noseY: 0.20, shoulderY: 0.30, hipY: 0.60 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Both heads should end up aligned
      const beforeHeadY = result.before.drawY + 0.10 * result.before.drawHeight;
      const afterHeadY = result.after.drawY + 0.20 * result.after.drawHeight;

      // They should be close to each other
      const headDelta = Math.abs(beforeHeadY - afterHeadY);
      expect(headDelta).toBeLessThan(5); // Within 5px
    });
  });

  describe('Phase 3: Image Positioning', () => {
    it('should align heads at same vertical position', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      const beforeHeadY = result.before.drawY + 0.12 * result.before.drawHeight;
      const afterHeadY = result.after.drawY + 0.12 * result.after.drawHeight;

      expect(Math.abs(beforeHeadY - afterHeadY)).toBeLessThan(2); // Within 2px
    });

    it('should not leave white space at top (drawY <= 0)', () => {
      const landmarks = createLandmarks({ noseY: 0.15, shoulderY: 0.25, hipY: 0.55 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // drawY should be <= 0 (image extends above canvas)
      expect(result.before.drawY).toBeLessThanOrEqual(1); // Small tolerance
      expect(result.after.drawY).toBeLessThanOrEqual(1);
    });

    it('should align shoulder centers horizontally when both subjects centered', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52, centerX: 0.5 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // With both subjects at centerX=0.5, shoulder centers should align
      // Calculate where shoulder center ends up on canvas
      const beforeShoulderX = result.before.drawX + 0.5 * result.before.drawWidth;
      const afterShoulderX = result.after.drawX + 0.5 * result.after.drawWidth;

      // Shoulder centers should align at canvas center
      expect(beforeShoulderX).toBeCloseTo(targetWidth / 2, 0);
      expect(afterShoulderX).toBeCloseTo(targetWidth / 2, 0);
    });
  });

  describe('Low Visibility Fallbacks', () => {
    it('should use default head position when nose visibility is low', () => {
      const lowVisLandmarks = createLandmarks({
        noseY: 0.3, // This should be ignored
        shoulderY: 0.25,
        hipY: 0.55,
        visibility: 0.3, // Below threshold
      });

      const normalLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
      });

      // Should not throw and should produce valid output
      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        lowVisLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      expect(result.before.drawHeight).toBeGreaterThan(0);
      expect(result.after.drawHeight).toBeGreaterThan(0);
    });

    it('should use default body height when hip visibility is low', () => {
      const landmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
      });
      // Make hips low visibility
      landmarks[23].visibility = 0.3;
      landmarks[24].visibility = 0.3;

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // Should use default body height (0.5)
      expect(result.before.drawHeight).toBeGreaterThan(0);
      expect(result.after.drawHeight).toBeGreaterThan(0);
    });

    it('should handle undefined landmarks gracefully', () => {
      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        undefined,
        undefined,
        targetWidth,
        targetHeight
      );

      // Should use defaults and produce valid output
      expect(result.before.drawWidth).toBeGreaterThan(0);
      expect(result.before.drawHeight).toBeGreaterThan(0);
      expect(result.after.drawWidth).toBeGreaterThan(0);
      expect(result.after.drawHeight).toBeGreaterThan(0);
    });
  });

  describe('Different Aspect Ratios', () => {
    it('should handle portrait source images (3:4)', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      const result = calculateAlignedDrawParams(
        { width: 900, height: 1200 }, // 3:4 portrait
        { width: 900, height: 1200 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      expect(result.before.drawWidth).toBeGreaterThan(0);
      expect(result.before.drawHeight).toBeGreaterThan(0);
    });

    it('should handle landscape source images (16:9)', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      const result = calculateAlignedDrawParams(
        { width: 1920, height: 1080 }, // 16:9 landscape
        { width: 1920, height: 1080 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      expect(result.before.drawWidth).toBeGreaterThan(0);
      expect(result.before.drawHeight).toBeGreaterThan(0);
    });

    it('should handle mixed aspect ratios', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1200 }, // Square
        { width: 900, height: 1600 }, // Portrait
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      expect(result.before.drawWidth).toBeGreaterThan(0);
      expect(result.after.drawWidth).toBeGreaterThan(0);
    });
  });

  describe('Phase 1.5: Overflow Normalization', () => {
    it('should ensure minimum 15% overflow', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      // Square image to square target - would have minimal overflow
      const result = calculateAlignedDrawParams(
        { width: 1080, height: 1080 },
        { width: 1080, height: 1080 },
        landmarks,
        landmarks,
        1080,
        1080
      );

      // Draw height should be at least 15% more than target height
      const beforeOverflow = result.before.drawHeight / 1080;
      const afterOverflow = result.after.drawHeight / 1080;

      expect(beforeOverflow).toBeGreaterThanOrEqual(1.14); // ~15%
      expect(afterOverflow).toBeGreaterThanOrEqual(1.14);
    });
  });

  describe('Shoulder Alignment (Cropped Heads)', () => {
    /**
     * Helper to create landmarks with a cropped head (nose Y < 0.02 or low visibility)
     */
    function createCroppedHeadLandmarks(opts: {
      noseY?: number;
      noseVisibility?: number;
      shoulderY: number;
      hipY: number;
    }): Landmark[] {
      const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.1,
      }));

      // Nose - either above frame (Y < 0.02) or low visibility
      landmarks[0] = {
        x: 0.5,
        y: opts.noseY ?? -0.05, // Above frame by default
        z: 0,
        visibility: opts.noseVisibility ?? 0.3, // Low visibility
      };

      // Shoulders - visible
      landmarks[11] = { x: 0.4, y: opts.shoulderY, z: 0, visibility: 0.95 };
      landmarks[12] = { x: 0.6, y: opts.shoulderY, z: 0, visibility: 0.95 };

      // Hips - visible
      landmarks[23] = { x: 0.42, y: opts.hipY, z: 0, visibility: 0.95 };
      landmarks[24] = { x: 0.58, y: opts.hipY, z: 0, visibility: 0.95 };

      return landmarks;
    }

    it('should detect cropped head and return useShoulderAlignment flag', () => {
      const croppedLandmarks = createCroppedHeadLandmarks({
        noseY: 0.01, // Below threshold (0.02)
        noseVisibility: 0.9,
        shoulderY: 0.15,
        hipY: 0.50,
      });
      const normalLandmarks = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.50,
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      expect(result.useShoulderAlignment).toBe(true);
    });

    it('should detect cropped head by low visibility and return useShoulderAlignment flag', () => {
      const croppedLandmarks = createCroppedHeadLandmarks({
        noseY: 0.10, // Normal Y position
        noseVisibility: 0.3, // But low visibility
        shoulderY: 0.20,
        hipY: 0.55,
      });
      const normalLandmarks = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.50,
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      expect(result.useShoulderAlignment).toBe(true);
    });

    it('should NOT use shoulder alignment when both heads are visible', () => {
      const landmarks1 = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.50,
      });
      const landmarks2 = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks1,
        landmarks2,
        targetWidth,
        targetHeight
      );

      expect(result.useShoulderAlignment).toBeFalsy();
    });

    it('should align shoulders when one head is cropped', () => {
      // Use same shoulder Y and hip Y to ensure same body height calculation
      // For cropped head: shoulder-to-hip = 0.50 - 0.15 = 0.35
      // For normal head: nose-to-hip = 0.50 - 0.08 = 0.42 (different!)
      // So we use same hip position but adjust to get similar body scale
      const croppedLandmarks = createCroppedHeadLandmarks({
        noseY: 0.01,
        noseVisibility: 0.9,
        shoulderY: 0.15, // Shoulder at 15%
        hipY: 0.50,      // Hip at 50%, shoulder-to-hip = 0.35
      });
      const normalLandmarks = createLandmarks({
        noseY: 0.08,
        shoulderY: 0.15, // Same shoulder position
        hipY: 0.43,      // Adjusted so nose-to-hip = 0.35 (same as shoulder-to-hip)
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      // When useShoulderAlignment is true, verify it was detected
      expect(result.useShoulderAlignment).toBe(true);

      // Calculate shoulder positions on canvas using the shoulder Y that was used for alignment
      const beforeShoulderY = result.before.drawY + 0.15 * result.before.drawHeight;
      const afterShoulderY = result.after.drawY + 0.15 * result.after.drawHeight;

      // Shoulders should be aligned - with same body height, scale ratio should be ~1.0
      // and shoulders should be close together
      const shoulderDelta = Math.abs(beforeShoulderY - afterShoulderY);
      expect(shoulderDelta).toBeLessThan(5); // 5px tolerance when body heights match
    });

    it('should use shoulder-to-hip height for body scale when nose not visible', () => {
      const croppedLandmarks = createCroppedHeadLandmarks({
        noseVisibility: 0.2, // Low visibility
        shoulderY: 0.15,
        hipY: 0.50, // Shoulder-to-hip = 0.35
      });
      const normalLandmarks = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.55, // Nose-to-hip = 0.45
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      // Should produce valid output (body scale calculation should work)
      expect(result.before.drawHeight).toBeGreaterThan(0);
      expect(result.after.drawHeight).toBeGreaterThan(0);
      // Scale ratio should be reasonable (not 1:1 due to different body heights)
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThanOrEqual(0.75);
      expect(scaleRatio).toBeLessThanOrEqual(1.30);
    });

    it('should handle both heads cropped', () => {
      const croppedLandmarks1 = createCroppedHeadLandmarks({
        noseY: 0.01,
        noseVisibility: 0.3,
        shoulderY: 0.10,
        hipY: 0.45,
      });
      const croppedLandmarks2 = createCroppedHeadLandmarks({
        noseY: -0.02,
        noseVisibility: 0.2,
        shoulderY: 0.12,
        hipY: 0.50,
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks1,
        croppedLandmarks2,
        targetWidth,
        targetHeight
      );

      expect(result.useShoulderAlignment).toBe(true);
      expect(result.before.drawHeight).toBeGreaterThan(0);
      expect(result.after.drawHeight).toBeGreaterThan(0);
    });

    it('should return cropTopOffset when using shoulder alignment', () => {
      const croppedLandmarks = createCroppedHeadLandmarks({
        noseY: 0.01,
        noseVisibility: 0.9,
        shoulderY: 0.15,
        hipY: 0.50,
      });
      const normalLandmarks = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.50,
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        croppedLandmarks,
        normalLandmarks,
        targetWidth,
        targetHeight
      );

      expect(result.useShoulderAlignment).toBe(true);
      // cropTopOffset should be defined when shoulder alignment is used
      expect(result.cropTopOffset).toBeDefined();
      expect(typeof result.cropTopOffset).toBe('number');
    });
  });

  describe('Phase 4: Horizontal Alignment', () => {
    it('should align subjects when before is left of center', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.35, // Left of center
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.50, // Centered
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Calculate where shoulder centers end up on canvas
      const beforeShoulderX = result.before.drawX + 0.35 * result.before.drawWidth;
      const afterShoulderX = result.after.drawX + 0.50 * result.after.drawWidth;

      // Shoulder centers should be aligned (within tolerance)
      const horizontalDelta = Math.abs(beforeShoulderX - afterShoulderX);
      expect(horizontalDelta).toBeLessThan(15); // 15px tolerance
    });

    it('should align subjects when before is right of center', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.65, // Right of center
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.50, // Centered
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Calculate where shoulder centers end up on canvas
      const beforeShoulderX = result.before.drawX + 0.65 * result.before.drawWidth;
      const afterShoulderX = result.after.drawX + 0.50 * result.after.drawWidth;

      // Shoulder centers should be aligned (within tolerance)
      const horizontalDelta = Math.abs(beforeShoulderX - afterShoulderX);
      expect(horizontalDelta).toBeLessThan(15); // 15px tolerance
    });

    it('should handle extreme horizontal offsets', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.25, // Far left
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.75, // Far right
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Calculate where shoulder centers end up on canvas
      const beforeShoulderX = result.before.drawX + 0.25 * result.before.drawWidth;
      const afterShoulderX = result.after.drawX + 0.75 * result.after.drawWidth;

      // For extreme offsets (50% difference), alignment is limited by crop constraints
      // The algorithm tries to align but can't exceed 20% crop per side
      // So with a 50% difference and 20% max crop, we expect ~10-15% residual
      // which on 1080px target is ~108-162px delta
      const horizontalDelta = Math.abs(beforeShoulderX - afterShoulderX);
      expect(horizontalDelta).toBeLessThan(200); // Allow tolerance for crop-limited extreme cases
    });

    it('should combine horizontal and vertical alignment', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.10,
        shoulderY: 0.20,
        hipY: 0.55, // Body height 0.45
        centerX: 0.40, // Left of center
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.15,
        shoulderY: 0.25,
        hipY: 0.50, // Body height 0.35
        centerX: 0.60, // Right of center
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Verify vertical alignment (heads should be aligned)
      const beforeHeadY = result.before.drawY + 0.10 * result.before.drawHeight;
      const afterHeadY = result.after.drawY + 0.15 * result.after.drawHeight;
      const verticalDelta = Math.abs(beforeHeadY - afterHeadY);
      expect(verticalDelta).toBeLessThan(5); // 5px vertical tolerance

      // Verify horizontal alignment (shoulders should be aligned)
      const beforeShoulderX = result.before.drawX + 0.40 * result.before.drawWidth;
      const afterShoulderX = result.after.drawX + 0.60 * result.after.drawWidth;
      const horizontalDelta = Math.abs(beforeShoulderX - afterShoulderX);
      expect(horizontalDelta).toBeLessThan(25); // 25px horizontal tolerance for combined case
    });

    it('should respect crop limits for horizontal alignment', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.15, // Very far left (near edge)
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.22,
        hipY: 0.52,
        centerX: 0.85, // Very far right (near edge)
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Should produce valid output without excessive cropping
      expect(result.before.drawWidth).toBeGreaterThan(0);
      expect(result.after.drawWidth).toBeGreaterThan(0);

      // drawX should be within reasonable bounds (not cropping more than 20% of image)
      const beforeMaxCrop = result.before.drawWidth * 0.25;
      const afterMaxCrop = result.after.drawWidth * 0.25;

      expect(result.before.drawX).toBeGreaterThan(-beforeMaxCrop - targetWidth);
      expect(result.after.drawX).toBeGreaterThan(-afterMaxCrop - targetWidth);
    });
  });

  describe('Scale Disparity (Extended Clamp Range)', () => {
    it('should handle real-world scale disparity (1.477x)', () => {
      // Matching the test-data photos: before body 29%, after body 20%
      const beforeLandmarks = createLandmarks({
        noseY: 0.2329,
        shoulderY: 0.30,
        hipY: 0.5243, // Body height = 0.2914
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.3603,
        shoulderY: 0.42,
        hipY: 0.5577, // Body height = 0.1974
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale = 0.2914 / 0.1974 = 1.477
      // Should NOT be clamped (within 0.65-1.60 range)
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThan(1.3);
      expect(scaleRatio).toBeLessThanOrEqual(1.60);
    });

    it('should handle moderate scale disparity (1.4x)', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.21,
        hipY: 0.47, // Body height = 0.35
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.19,
        hipY: 0.37, // Body height = 0.25
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale = 0.35 / 0.25 = 1.4
      // Should NOT be clamped (within 0.65-1.60 range)
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThan(1.2);
      expect(scaleRatio).toBeLessThanOrEqual(1.60);
    });

    it('should clamp extreme disparity (1.82x) to 1.60', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.08,
        shoulderY: 0.18,
        hipY: 0.48, // Body height = 0.40
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.08,
        shoulderY: 0.14,
        hipY: 0.30, // Body height = 0.22
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale = 0.40 / 0.22 = 1.82
      // Should be clamped to 1.60
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeLessThanOrEqual(1.70); // Allow tolerance
    });

    it('should handle reverse moderate disparity (0.71x)', () => {
      const beforeLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.19,
        hipY: 0.37, // Body height = 0.25
      });
      const afterLandmarks = createLandmarks({
        noseY: 0.12,
        shoulderY: 0.21,
        hipY: 0.47, // Body height = 0.35
      });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        beforeLandmarks,
        afterLandmarks,
        targetWidth,
        targetHeight
      );

      // Raw scale = 0.25 / 0.35 = 0.71
      // Should NOT be clamped (within 0.65-1.60 range)
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeLessThan(0.85);
      expect(scaleRatio).toBeGreaterThanOrEqual(0.60); // Allow tolerance for 0.65 clamp
    });
  });
});
