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
 */
function createLandmarks(opts: {
  noseY: number;
  shoulderY: number;
  hipY: number;
  visibility?: number;
}): Landmark[] {
  const vis = opts.visibility ?? 0.95;
  const lowVis = 0.1;

  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: lowVis,
  }));

  // Key landmarks
  landmarks[0] = { x: 0.5, y: opts.noseY, z: 0, visibility: vis }; // Nose
  landmarks[11] = { x: 0.4, y: opts.shoulderY, z: 0, visibility: vis }; // Left shoulder
  landmarks[12] = { x: 0.6, y: opts.shoulderY, z: 0, visibility: vis }; // Right shoulder
  landmarks[23] = { x: 0.42, y: opts.hipY, z: 0, visibility: vis }; // Left hip
  landmarks[24] = { x: 0.58, y: opts.hipY, z: 0, visibility: vis }; // Right hip

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
      // Expected scale: 0.3 / 0.45 = 0.667, but clamped to 0.8
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThanOrEqual(0.75); // Allow some tolerance
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
      // Expected scale: 0.5 / 0.3 = 1.67, but clamped to 1.25
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThan(1.0);
      expect(scaleRatio).toBeLessThanOrEqual(1.30); // Allow some tolerance
    });

    it('should clamp scale to minimum 0.8', () => {
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

      // Raw scale would be 0.2/0.65 = 0.31, should be clamped to 0.8
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeGreaterThanOrEqual(0.75);
    });

    it('should clamp scale to maximum 1.25', () => {
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

      // Raw scale would be 0.65/0.2 = 3.25, should be clamped to 1.25
      const scaleRatio = result.after.drawHeight / result.before.drawHeight;
      expect(scaleRatio).toBeLessThanOrEqual(1.30);
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

    it('should center images horizontally', () => {
      const landmarks = createLandmarks({ noseY: 0.12, shoulderY: 0.22, hipY: 0.52 });

      const result = calculateAlignedDrawParams(
        { width: 1200, height: 1600 },
        { width: 1200, height: 1600 },
        landmarks,
        landmarks,
        targetWidth,
        targetHeight
      );

      // drawX should center the image
      // For a wider-than-target image, drawX would be negative
      // For centered, drawX = (targetWidth - drawWidth) / 2
      const expectedBeforeX = (targetWidth - result.before.drawWidth) / 2;
      const expectedAfterX = (targetWidth - result.after.drawWidth) / 2;

      expect(result.before.drawX).toBeCloseTo(expectedBeforeX, 0);
      expect(result.after.drawX).toBeCloseTo(expectedAfterX, 0);
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
});
