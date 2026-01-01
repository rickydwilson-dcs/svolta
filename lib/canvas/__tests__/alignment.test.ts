/**
 * Tests for the alignment calculation algorithm
 *
 * These tests cover:
 * - Body scale calculation (nose to hip)
 * - Anchor point alignment (head, shoulders, hips, full body)
 * - Edge cases (missing landmarks, low visibility)
 * - Scale clamping and offset boundaries
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAlignment,
  canCalculateAlignment,
  getAnchorDescription,
  type AnchorType,
} from '../alignment';
import type { Landmark } from '@/types/landmarks';

/**
 * Helper to create a mock landmark with reasonable defaults
 */
function createLandmark(
  x: number,
  y: number,
  z: number = 0,
  visibility: number = 0.9
): Landmark {
  return { x, y, z, visibility };
}

/**
 * Create a full set of 33 landmarks for testing
 * This creates a standard front-facing pose with configurable key points
 */
function createMockLandmarks(options: {
  noseY?: number;
  leftShoulderY?: number;
  rightShoulderY?: number;
  leftHipY?: number;
  rightHipY?: number;
  centerX?: number;
  visibility?: number;
}): Landmark[] {
  const {
    noseY = 0.2,
    leftShoulderY = 0.35,
    rightShoulderY = 0.35,
    leftHipY = 0.6,
    rightHipY = 0.6,
    centerX = 0.5,
    visibility = 0.9,
  } = options;

  // Create 33 landmarks (MediaPipe Pose model)
  const landmarks: Landmark[] = [];

  for (let i = 0; i < 33; i++) {
    // Default invisible landmark
    landmarks.push(createLandmark(centerX, 0.5, 0, 0));
  }

  // Set key landmarks with visibility
  landmarks[0] = createLandmark(centerX, noseY, 0, visibility); // nose
  landmarks[11] = createLandmark(centerX - 0.1, leftShoulderY, 0, visibility); // left shoulder
  landmarks[12] = createLandmark(centerX + 0.1, rightShoulderY, 0, visibility); // right shoulder
  landmarks[23] = createLandmark(centerX - 0.08, leftHipY, 0, visibility); // left hip
  landmarks[24] = createLandmark(centerX + 0.08, rightHipY, 0, visibility); // right hip

  return landmarks;
}

describe('calculateAlignment', () => {
  describe('basic alignment', () => {
    it('should return default alignment when photos have identical proportions', () => {
      const landmarks1 = createMockLandmarks({
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });
      const landmarks2 = createMockLandmarks({
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      expect(result.scale).toBeCloseTo(1, 2);
      expect(result.offsetX).toBeCloseTo(0, 2);
      expect(result.offsetY).toBeCloseTo(0, 2);
    });

    it('should scale down when after photo body is larger', () => {
      // Before: body takes 40% of image (0.2 to 0.6)
      const landmarks1 = createMockLandmarks({
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });

      // After: body takes 60% of image (0.1 to 0.7)
      const landmarks2 = createMockLandmarks({
        noseY: 0.1,
        leftHipY: 0.7,
        rightHipY: 0.7,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Body height ratio: 0.4 / 0.6 = 0.67
      expect(result.scale).toBeLessThan(1);
      expect(result.scale).toBeCloseTo(0.4 / 0.6, 1);
    });

    it('should scale up when after photo body is smaller', () => {
      // Before: body takes 60% of image
      const landmarks1 = createMockLandmarks({
        noseY: 0.1,
        leftHipY: 0.7,
        rightHipY: 0.7,
      });

      // After: body takes 40% of image
      const landmarks2 = createMockLandmarks({
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Body height ratio: 0.6 / 0.4 = 1.5
      expect(result.scale).toBeGreaterThan(1);
      expect(result.scale).toBeCloseTo(0.6 / 0.4, 1);
    });
  });

  describe('scale clamping', () => {
    it('should clamp scale to maximum of 2', () => {
      // Before: very large body (0.8 of image)
      const landmarks1 = createMockLandmarks({
        noseY: 0.05,
        leftHipY: 0.85,
        rightHipY: 0.85,
      });

      // After: very small body (0.2 of image)
      const landmarks2 = createMockLandmarks({
        noseY: 0.35,
        leftHipY: 0.55,
        rightHipY: 0.55,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Raw ratio would be 0.8/0.2 = 4, but should be clamped to 2
      expect(result.scale).toBe(2);
    });

    it('should clamp scale to minimum of 0.5', () => {
      // Before: very small body
      const landmarks1 = createMockLandmarks({
        noseY: 0.35,
        leftHipY: 0.55,
        rightHipY: 0.55,
      });

      // After: very large body
      const landmarks2 = createMockLandmarks({
        noseY: 0.05,
        leftHipY: 0.85,
        rightHipY: 0.85,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Raw ratio would be 0.2/0.8 = 0.25, but should be clamped to 0.5
      expect(result.scale).toBe(0.5);
    });
  });

  describe('anchor types', () => {
    it('should align based on head position when using head anchor', () => {
      const landmarks1 = createMockLandmarks({ noseY: 0.2, centerX: 0.4 });
      const landmarks2 = createMockLandmarks({ noseY: 0.3, centerX: 0.6 });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Should calculate offset to align nose positions
      expect(result.offsetX).not.toBe(0);
      expect(result.offsetY).not.toBe(0);
    });

    it('should align based on shoulder center when using shoulders anchor', () => {
      const landmarks1 = createMockLandmarks({
        leftShoulderY: 0.3,
        rightShoulderY: 0.3,
      });
      const landmarks2 = createMockLandmarks({
        leftShoulderY: 0.4,
        rightShoulderY: 0.4,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'shoulders');

      // Should have Y offset to align shoulders
      expect(result.offsetY).not.toBe(0);
    });

    it('should align based on hip center when using hips anchor', () => {
      const landmarks1 = createMockLandmarks({
        leftHipY: 0.55,
        rightHipY: 0.55,
      });
      const landmarks2 = createMockLandmarks({
        leftHipY: 0.65,
        rightHipY: 0.65,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'hips');

      // Should have Y offset to align hips
      expect(result.offsetY).not.toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should return default alignment for null landmarks', () => {
      const landmarks1 = createMockLandmarks({});

      const result = calculateAlignment(
        landmarks1,
        null as unknown as Landmark[],
        'head'
      );

      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('should return default alignment for empty landmarks array', () => {
      const result = calculateAlignment([], [], 'head');

      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('should return default alignment for landmarks with insufficient count', () => {
      const shortLandmarks = [
        createLandmark(0.5, 0.2),
        createLandmark(0.5, 0.3),
      ];

      const result = calculateAlignment(shortLandmarks, shortLandmarks, 'head');

      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });

    it('should handle low visibility landmarks', () => {
      const landmarks1 = createMockLandmarks({ visibility: 0.9 });
      const landmarks2 = createMockLandmarks({ visibility: 0.1 }); // Low visibility

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // Should return default due to low visibility
      expect(result.scale).toBe(1);
      expect(result.offsetX).toBe(0);
      expect(result.offsetY).toBe(0);
    });
  });

  describe('offset calculation', () => {
    it('should calculate correct horizontal offset', () => {
      // Same proportions but different horizontal position
      const landmarks1 = createMockLandmarks({
        centerX: 0.3,
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });
      const landmarks2 = createMockLandmarks({
        centerX: 0.7,
        noseY: 0.2,
        leftHipY: 0.6,
        rightHipY: 0.6,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // With scale = 1, offset should move from 0.7 to 0.3
      expect(result.scale).toBeCloseTo(1, 2);
      expect(result.offsetX).toBeCloseTo(-0.4, 2); // 0.3 - 0.7 = -0.4
    });

    it('should calculate correct vertical offset', () => {
      // Same proportions but different vertical position
      const landmarks1 = createMockLandmarks({
        noseY: 0.15,
        leftHipY: 0.55,
        rightHipY: 0.55,
      });
      const landmarks2 = createMockLandmarks({
        noseY: 0.25,
        leftHipY: 0.65,
        rightHipY: 0.65,
      });

      const result = calculateAlignment(landmarks1, landmarks2, 'head');

      // With same body proportions, scale ~= 1
      // Offset should move nose from 0.25 to 0.15
      expect(result.scale).toBeCloseTo(1, 2);
      expect(result.offsetY).toBeCloseTo(-0.1, 2);
    });
  });
});

describe('canCalculateAlignment', () => {
  it('should return true when head landmarks are visible', () => {
    const landmarks = createMockLandmarks({ visibility: 0.9 });
    expect(canCalculateAlignment(landmarks, 'head')).toBe(true);
  });

  it('should return true when shoulder landmarks are visible', () => {
    const landmarks = createMockLandmarks({ visibility: 0.9 });
    expect(canCalculateAlignment(landmarks, 'shoulders')).toBe(true);
  });

  it('should return true when hip landmarks are visible', () => {
    const landmarks = createMockLandmarks({ visibility: 0.9 });
    expect(canCalculateAlignment(landmarks, 'hips')).toBe(true);
  });

  it('should return false for null landmarks', () => {
    expect(canCalculateAlignment(null as unknown as Landmark[], 'head')).toBe(
      false
    );
  });

  it('should return false for empty landmarks', () => {
    expect(canCalculateAlignment([], 'head')).toBe(false);
  });

  it('should return false when key landmarks have low visibility', () => {
    const landmarks = createMockLandmarks({ visibility: 0.1 });
    expect(canCalculateAlignment(landmarks, 'head')).toBe(false);
  });

  it('should return false when landmarks array is too short', () => {
    const shortLandmarks = [createLandmark(0.5, 0.2)];
    expect(canCalculateAlignment(shortLandmarks, 'head')).toBe(false);
  });
});

describe('getAnchorDescription', () => {
  it('should return correct description for head anchor', () => {
    expect(getAnchorDescription('head')).toContain('head');
    expect(getAnchorDescription('head')).toContain('nose');
  });

  it('should return correct description for shoulders anchor', () => {
    expect(getAnchorDescription('shoulders')).toContain('shoulder');
  });

  it('should return correct description for hips anchor', () => {
    expect(getAnchorDescription('hips')).toContain('hip');
  });

  it('should return correct description for full anchor', () => {
    expect(getAnchorDescription('full')).toContain('full body');
  });
});

describe('side pose handling (fallback strategies)', () => {
  it('should handle pose with only left side visible', () => {
    const landmarks = createMockLandmarks({ visibility: 0.9 });
    // Make right side invisible
    landmarks[12] = createLandmark(0.6, 0.35, 0, 0.1); // right shoulder low vis
    landmarks[24] = createLandmark(0.58, 0.6, 0, 0.1); // right hip low vis

    const landmarks2 = createMockLandmarks({ visibility: 0.9 });

    const result = calculateAlignment(landmarks, landmarks2, 'shoulders');

    // Should still calculate alignment using left side
    expect(result.scale).toBeDefined();
    expect(typeof result.scale).toBe('number');
    expect(!isNaN(result.scale)).toBe(true);
  });

  it('should handle pose with only right side visible', () => {
    const landmarks = createMockLandmarks({ visibility: 0.9 });
    // Make left side invisible
    landmarks[11] = createLandmark(0.4, 0.35, 0, 0.1); // left shoulder low vis
    landmarks[23] = createLandmark(0.42, 0.6, 0, 0.1); // left hip low vis

    const landmarks2 = createMockLandmarks({ visibility: 0.9 });

    const result = calculateAlignment(landmarks, landmarks2, 'shoulders');

    // Should still calculate alignment using right side
    expect(result.scale).toBeDefined();
    expect(typeof result.scale).toBe('number');
    expect(!isNaN(result.scale)).toBe(true);
  });
});

describe('real-world scenarios', () => {
  it('should handle typical before/after fitness transformation', () => {
    // Before: Standing further from camera, body takes 50% of frame
    const beforeLandmarks = createMockLandmarks({
      noseY: 0.15,
      leftShoulderY: 0.28,
      rightShoulderY: 0.28,
      leftHipY: 0.55,
      rightHipY: 0.55,
      centerX: 0.48,
    });

    // After: Standing closer, body takes 55% of frame
    const afterLandmarks = createMockLandmarks({
      noseY: 0.12,
      leftShoulderY: 0.26,
      rightShoulderY: 0.26,
      leftHipY: 0.57,
      rightHipY: 0.57,
      centerX: 0.52,
    });

    const result = calculateAlignment(beforeLandmarks, afterLandmarks, 'head');

    // Scale should be close to 1 (slight adjustment)
    expect(result.scale).toBeGreaterThan(0.8);
    expect(result.scale).toBeLessThan(1.2);

    // Offset should be small
    expect(Math.abs(result.offsetX)).toBeLessThan(0.2);
    expect(Math.abs(result.offsetY)).toBeLessThan(0.2);
  });

  it('should handle cropped head scenario using shoulder alignment', () => {
    // Photos where head is cropped at top
    const beforeLandmarks = createMockLandmarks({
      noseY: 0.02, // Very close to top (likely cropped)
      leftShoulderY: 0.15,
      rightShoulderY: 0.15,
      leftHipY: 0.45,
      rightHipY: 0.45,
    });
    // Make nose low visibility since it's cropped
    beforeLandmarks[0] = createLandmark(0.5, 0.02, 0, 0.2);

    const afterLandmarks = createMockLandmarks({
      noseY: 0.03,
      leftShoulderY: 0.16,
      rightShoulderY: 0.16,
      leftHipY: 0.46,
      rightHipY: 0.46,
    });
    afterLandmarks[0] = createLandmark(0.5, 0.03, 0, 0.2);

    const result = calculateAlignment(
      beforeLandmarks,
      afterLandmarks,
      'shoulders'
    );

    // Should still produce valid alignment using shoulders
    expect(result.scale).toBeDefined();
    expect(typeof result.scale).toBe('number');
    expect(!isNaN(result.scale)).toBe(true);
  });
});
