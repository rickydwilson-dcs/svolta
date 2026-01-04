/**
 * Visual Regression Test Fixture Generator
 *
 * Generates synthetic test images with mathematically known landmark positions.
 * These are simple geometric figures that allow precise validation of the
 * alignment algorithm without relying on actual pose detection.
 *
 * Usage: npx tsx tests/visual/fixtures/generate-fixtures.ts
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { Landmark } from '@/types/landmarks';

// ============================================================================
// Types
// ============================================================================

interface TestFigure {
  id: string;
  category: string;
  description: string;
  imageWidth: number;
  imageHeight: number;
  landmarks: Landmark[];
  // Expected values for validation
  expected?: {
    bodyHeight: number; // Normalized body height (nose to hip)
  };
}

interface TestFixture {
  id: string;
  category: string;
  description: string;
  before: {
    imagePath: string;
    width: number;
    height: number;
    landmarks: Landmark[];
  };
  after: {
    imagePath: string;
    width: number;
    height: number;
    landmarks: Landmark[];
  };
  expected: {
    bodyScale: number;
    headAlignmentDelta: number;
  };
}

interface FixtureManifest {
  version: string;
  generatedAt: string;
  fixtures: TestFixture[];
}

// ============================================================================
// Landmark Generation Helpers
// ============================================================================

/**
 * Create a full 33-landmark array with default low visibility
 * Only key landmarks (nose, shoulders, hips) are set with high visibility
 */
function createLandmarks(keyPositions: {
  nose: { x: number; y: number };
  leftShoulder: { x: number; y: number };
  rightShoulder: { x: number; y: number };
  leftHip: { x: number; y: number };
  rightHip: { x: number; y: number };
  visibility?: number;
}): Landmark[] {
  const defaultVisibility = keyPositions.visibility ?? 0.95;
  const lowVisibility = 0.1;

  // Initialize all 33 landmarks with low visibility
  const landmarks: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: lowVisibility,
  }));

  // Set key landmarks with high visibility
  landmarks[0] = { ...keyPositions.nose, z: 0, visibility: defaultVisibility }; // NOSE
  landmarks[11] = { ...keyPositions.leftShoulder, z: 0, visibility: defaultVisibility }; // LEFT_SHOULDER
  landmarks[12] = { ...keyPositions.rightShoulder, z: 0, visibility: defaultVisibility }; // RIGHT_SHOULDER
  landmarks[23] = { ...keyPositions.leftHip, z: 0, visibility: defaultVisibility }; // LEFT_HIP
  landmarks[24] = { ...keyPositions.rightHip, z: 0, visibility: defaultVisibility }; // RIGHT_HIP

  return landmarks;
}

/**
 * Generate a simple geometric figure representing a person
 * with colored circles at landmark positions
 */
function generateFigureImage(
  width: number,
  height: number,
  landmarks: Landmark[],
  backgroundColor: string = '#f5f5f5'
): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Draw body outline (simplified stick figure)
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = Math.max(2, width * 0.01);
  ctx.lineCap = 'round';

  const nose = landmarks[0];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];

  // Convert normalized to pixel coordinates
  const toPixel = (l: Landmark) => ({
    x: l.x * width,
    y: l.y * height,
  });

  const noseP = toPixel(nose);
  const leftShoulderP = toPixel(leftShoulder);
  const rightShoulderP = toPixel(rightShoulder);
  const leftHipP = toPixel(leftHip);
  const rightHipP = toPixel(rightHip);

  // Draw torso lines
  ctx.beginPath();
  // Shoulders line
  ctx.moveTo(leftShoulderP.x, leftShoulderP.y);
  ctx.lineTo(rightShoulderP.x, rightShoulderP.y);
  // Spine
  const shoulderCenter = {
    x: (leftShoulderP.x + rightShoulderP.x) / 2,
    y: (leftShoulderP.y + rightShoulderP.y) / 2,
  };
  const hipCenter = {
    x: (leftHipP.x + rightHipP.x) / 2,
    y: (leftHipP.y + rightHipP.y) / 2,
  };
  ctx.moveTo(shoulderCenter.x, shoulderCenter.y);
  ctx.lineTo(hipCenter.x, hipCenter.y);
  // Hips line
  ctx.moveTo(leftHipP.x, leftHipP.y);
  ctx.lineTo(rightHipP.x, rightHipP.y);
  // Neck to nose
  ctx.moveTo(shoulderCenter.x, shoulderCenter.y);
  ctx.lineTo(noseP.x, noseP.y);
  ctx.stroke();

  // Draw landmark points
  const drawPoint = (p: { x: number; y: number }, color: string, radius: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  const pointRadius = Math.max(8, width * 0.02);

  // Head (larger circle)
  drawPoint(noseP, '#FF6B6B', pointRadius * 2);
  // Shoulders
  drawPoint(leftShoulderP, '#4ECDC4', pointRadius);
  drawPoint(rightShoulderP, '#4ECDC4', pointRadius);
  // Hips
  drawPoint(leftHipP, '#45B7D1', pointRadius);
  drawPoint(rightHipP, '#45B7D1', pointRadius);

  return canvas.toBuffer('image/png');
}

// ============================================================================
// Test Case Definitions
// ============================================================================

interface FigureParams {
  id: string;
  category: string;
  description: string;
  width: number;
  height: number;
  noseY: number; // Normalized Y position of nose
  bodyHeight: number; // Normalized body height (nose to hip center)
  visibility?: number;
  backgroundColor?: string;
  centerX?: number; // Horizontal center (default 0.5)
}

function createFigure(params: FigureParams): TestFigure {
  const { id, category, description, width, height, noseY, bodyHeight, visibility } = params;
  const centerX = params.centerX ?? 0.5;

  // Calculate landmark positions based on nose Y and body height
  const hipY = noseY + bodyHeight;
  const shoulderY = noseY + bodyHeight * 0.25; // Shoulders at 25% of body height

  const landmarks = createLandmarks({
    nose: { x: centerX, y: noseY },
    leftShoulder: { x: centerX - 0.1, y: shoulderY },
    rightShoulder: { x: centerX + 0.1, y: shoulderY },
    leftHip: { x: centerX - 0.08, y: hipY },
    rightHip: { x: centerX + 0.08, y: hipY },
    visibility,
  });

  return {
    id,
    category,
    description,
    imageWidth: width,
    imageHeight: height,
    landmarks,
    expected: { bodyHeight },
  };
}

/**
 * Generate all test fixtures
 */
function generateTestFixtures(): { fixtures: TestFixture[]; figures: Map<string, TestFigure> } {
  const figures = new Map<string, TestFigure>();
  const fixtures: TestFixture[] = [];

  // ========================================
  // Category 1: Standard Poses (8 fixtures)
  // ========================================
  // These test the happy path with well-positioned subjects

  const standardConfigs = [
    { id: 'standard-001', beforeBody: 0.45, afterBody: 0.45, desc: 'Identical body heights' },
    { id: 'standard-002', beforeBody: 0.45, afterBody: 0.50, desc: 'Slight height difference' },
    { id: 'standard-003', beforeBody: 0.40, afterBody: 0.45, desc: 'Before shorter than after' },
    { id: 'standard-004', beforeBody: 0.50, afterBody: 0.40, desc: 'Before taller than after' },
  ];

  for (const config of standardConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'standard',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: config.beforeBody,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'standard',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: config.afterBody,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'standard',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: config.beforeBody / config.afterBody,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 2: Aspect Ratio Variants (6 fixtures)
  // ========================================
  // Test different source image aspect ratios

  const aspectConfigs = [
    { id: 'aspect-square', beforeW: 1200, beforeH: 1200, afterW: 1200, afterH: 1200, desc: 'Square images' },
    { id: 'aspect-portrait', beforeW: 900, beforeH: 1600, afterW: 900, afterH: 1600, desc: 'Portrait images' },
    { id: 'aspect-landscape', beforeW: 1600, beforeH: 900, afterW: 1600, afterH: 900, desc: 'Landscape images' },
    { id: 'aspect-mixed-1', beforeW: 1200, beforeH: 1200, afterW: 900, afterH: 1600, desc: 'Square before, portrait after' },
    { id: 'aspect-mixed-2', beforeW: 900, beforeH: 1600, afterW: 1200, afterH: 1200, desc: 'Portrait before, square after' },
    { id: 'aspect-mixed-3', beforeW: 1600, beforeH: 1200, afterW: 1200, afterH: 1600, desc: 'Landscape before, portrait after' },
  ];

  for (const config of aspectConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'aspect',
      description: `Before: ${config.desc}`,
      width: config.beforeW,
      height: config.beforeH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'aspect',
      description: `After: ${config.desc}`,
      width: config.afterW,
      height: config.afterH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'aspect',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 3: Body Height Extremes (6 fixtures)
  // ========================================
  // Test scale clamping boundaries (0.65 - 1.60)

  const extremeConfigs = [
    { id: 'extreme-tall-before', beforeBody: 0.60, afterBody: 0.40, desc: 'Tall before, short after (scale 1.5)' },
    { id: 'extreme-short-before', beforeBody: 0.30, afterBody: 0.50, desc: 'Short before, tall after (scale 0.6, clamp to 0.65)' },
    { id: 'extreme-edge-high', beforeBody: 0.50, afterBody: 0.40, desc: 'Near upper clamp boundary (1.25)' },
    { id: 'extreme-edge-low', beforeBody: 0.40, afterBody: 0.50, desc: 'Near lower clamp boundary (0.8)' },
    { id: 'extreme-tiny', beforeBody: 0.25, afterBody: 0.25, desc: 'Very short body heights' },
    { id: 'extreme-large', beforeBody: 0.65, afterBody: 0.65, desc: 'Very tall body heights' },
  ];

  for (const config of extremeConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'extreme',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.10,
      bodyHeight: config.beforeBody,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'extreme',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.10,
      bodyHeight: config.afterBody,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    const rawScale = config.beforeBody / config.afterBody;
    const clampedScale = Math.max(0.65, Math.min(1.60, rawScale));

    fixtures.push({
      id: config.id,
      category: 'extreme',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: clampedScale,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 4: Headroom Extremes (4 fixtures)
  // ========================================
  // Test head position constraints (5-20% from top)

  const headroomConfigs = [
    { id: 'headroom-minimal', noseY: 0.05, desc: 'Head at 5% from top (minimal headroom)' },
    { id: 'headroom-low', noseY: 0.10, desc: 'Head at 10% from top' },
    { id: 'headroom-normal', noseY: 0.15, desc: 'Head at 15% from top (normal)' },
    { id: 'headroom-high', noseY: 0.25, desc: 'Head at 25% from top (constrained to 20%)' },
  ];

  for (const config of headroomConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'headroom',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.noseY,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'headroom',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.noseY,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'headroom',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 5: Low Visibility (4 fixtures)
  // ========================================
  // Test fallback behavior when landmarks have low visibility

  const lowVisConfigs = [
    { id: 'lowvis-nose', noseVis: 0.3, hipVis: 0.95, desc: 'Low nose visibility (fallback to default head Y)' },
    { id: 'lowvis-hips', noseVis: 0.95, hipVis: 0.3, desc: 'Low hip visibility (fallback to default body height)' },
    { id: 'lowvis-both', noseVis: 0.3, hipVis: 0.3, desc: 'Low visibility on both (full fallback)' },
    { id: 'lowvis-threshold', noseVis: 0.5, hipVis: 0.5, desc: 'At visibility threshold boundary' },
  ];

  for (const config of lowVisConfigs) {
    // Create landmarks with custom visibility
    const beforeLandmarks = createLandmarks({
      nose: { x: 0.5, y: 0.15 },
      leftShoulder: { x: 0.4, y: 0.26 },
      rightShoulder: { x: 0.6, y: 0.26 },
      leftHip: { x: 0.42, y: 0.60 },
      rightHip: { x: 0.58, y: 0.60 },
      visibility: 0.95,
    });
    // Modify specific visibilities
    beforeLandmarks[0].visibility = config.noseVis;
    beforeLandmarks[23].visibility = config.hipVis;
    beforeLandmarks[24].visibility = config.hipVis;

    const afterLandmarks = createLandmarks({
      nose: { x: 0.5, y: 0.15 },
      leftShoulder: { x: 0.4, y: 0.26 },
      rightShoulder: { x: 0.6, y: 0.26 },
      leftHip: { x: 0.42, y: 0.60 },
      rightHip: { x: 0.58, y: 0.60 },
      visibility: 0.95,
    });
    // Apply same visibility modifications to after landmarks
    // so both images have identical visibility for proper testing
    afterLandmarks[0].visibility = config.noseVis;
    afterLandmarks[23].visibility = config.hipVis;
    afterLandmarks[24].visibility = config.hipVis;

    const beforeFig: TestFigure = {
      id: `${config.id}-before`,
      category: 'lowvis',
      description: `Before: ${config.desc}`,
      imageWidth: 1200,
      imageHeight: 1600,
      landmarks: beforeLandmarks,
    };

    const afterFig: TestFigure = {
      id: `${config.id}-after`,
      category: 'lowvis',
      description: `After: ${config.desc}`,
      imageWidth: 1200,
      imageHeight: 1600,
      landmarks: afterLandmarks,
    };

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'lowvis',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 6: Framing Variations (10 fixtures)
  // ========================================
  // Test realistic framing scenarios - cropped heads, varying headroom,
  // cropped feet, off-center subjects, mismatched framing

  const framingConfigs = [
    // Cropped heads (head partially out of frame)
    {
      id: 'framing-head-cropped',
      beforeNoseY: -0.02, // Head cropped at top
      afterNoseY: 0.12,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Before head partially cropped at top'
    },
    {
      id: 'framing-both-heads-cropped',
      beforeNoseY: -0.03,
      afterNoseY: -0.02,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Both heads partially cropped'
    },
    // Minimal headroom (3%)
    {
      id: 'framing-tight-headroom',
      beforeNoseY: 0.03,
      afterNoseY: 0.03,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Tight 3% headroom both images'
    },
    // Large headroom (35%)
    {
      id: 'framing-large-headroom',
      beforeNoseY: 0.35,
      afterNoseY: 0.35,
      beforeBody: 0.35,
      afterBody: 0.35,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Large 35% headroom (subject far down)'
    },
    // Feet cropped (hips near bottom)
    {
      id: 'framing-feet-cropped',
      beforeNoseY: 0.05,
      afterNoseY: 0.05,
      beforeBody: 0.80, // Hips at 85%, feet would be cropped
      afterBody: 0.80,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Long body with feet cropped'
    },
    {
      id: 'framing-hips-at-edge',
      beforeNoseY: 0.10,
      afterNoseY: 0.10,
      beforeBody: 0.88, // Hips at 98%
      afterBody: 0.88,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Hips at bottom edge of frame'
    },
    // Off-center subjects
    {
      id: 'framing-left-offset',
      beforeNoseY: 0.12,
      afterNoseY: 0.12,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.3, // Subject on left
      afterCenterX: 0.5,
      desc: 'Before subject left of center'
    },
    {
      id: 'framing-right-offset',
      beforeNoseY: 0.12,
      afterNoseY: 0.12,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.5,
      afterCenterX: 0.7, // Subject on right
      desc: 'After subject right of center'
    },
    // Mismatched framing (different headroom between before/after)
    {
      id: 'framing-mismatch-headroom',
      beforeNoseY: 0.05, // Tight crop
      afterNoseY: 0.25, // Loose crop
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeCenterX: 0.5,
      afterCenterX: 0.5,
      desc: 'Mismatched headroom (5% vs 25%)'
    },
    // Combined: off-center + different headroom
    {
      id: 'framing-complex-mismatch',
      beforeNoseY: 0.08,
      afterNoseY: 0.20,
      beforeBody: 0.50,
      afterBody: 0.40,
      beforeCenterX: 0.35,
      afterCenterX: 0.65,
      desc: 'Complex mismatch: offset + headroom + body size'
    },
  ];

  for (const config of framingConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'framing',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.beforeNoseY,
      bodyHeight: config.beforeBody,
      centerX: config.beforeCenterX,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'framing',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.afterNoseY,
      bodyHeight: config.afterBody,
      centerX: config.afterCenterX,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    const rawScale = config.beforeBody / config.afterBody;
    const clampedScale = Math.max(0.65, Math.min(1.60, rawScale));

    fixtures.push({
      id: config.id,
      category: 'framing',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: clampedScale,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 7: Resolution Variations (10 fixtures)
  // ========================================
  // Test resolution extremes and mismatched before/after resolutions

  // Same resolution configs (before and after same dimensions)
  const resolutionSameConfigs = [
    // Low resolution (mobile thumbnails, old phones)
    { id: 'resolution-vga', w: 640, h: 480, desc: 'Low-res VGA 640×480' },
    { id: 'resolution-qvga', w: 320, h: 240, desc: 'Very low-res QVGA 320×240' },
    { id: 'resolution-720p-portrait', w: 720, h: 1280, desc: 'HD portrait 720×1280' },
    // High resolution (DSLR, pro cameras)
    { id: 'resolution-12mp', w: 3000, h: 4000, desc: 'High-res 12MP portrait' },
    { id: 'resolution-4k', w: 3840, h: 2160, desc: '4K landscape' },
    { id: 'resolution-6k', w: 6000, h: 4000, desc: 'Very high-res 24MP' },
  ];

  for (const config of resolutionSameConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'resolution',
      description: `Before: ${config.desc}`,
      width: config.w,
      height: config.h,
      noseY: 0.15,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'resolution',
      description: `After: ${config.desc}`,
      width: config.w,
      height: config.h,
      noseY: 0.15,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'resolution',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // Mismatched resolution configs (different before/after dimensions)
  const resolutionMixedConfigs = [
    { id: 'resolution-mix-low-high', beforeW: 640, beforeH: 480, afterW: 3000, afterH: 4000, desc: 'VGA to 12MP' },
    { id: 'resolution-mix-high-low', beforeW: 3840, beforeH: 2160, afterW: 720, afterH: 1280, desc: '4K to 720p' },
    { id: 'resolution-mix-extreme', beforeW: 320, beforeH: 240, afterW: 6000, afterH: 4000, desc: 'QVGA to 24MP (extreme)' },
    { id: 'resolution-mix-similar', beforeW: 1920, beforeH: 1080, afterW: 1080, afterH: 1920, desc: 'Same pixels, different orientation' },
  ];

  for (const config of resolutionMixedConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'resolution',
      description: `Before: ${config.desc}`,
      width: config.beforeW,
      height: config.beforeH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'resolution',
      description: `After: ${config.desc}`,
      width: config.afterW,
      height: config.afterH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'resolution',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 8: Aspect Ratio Extremes (10 fixtures)
  // ========================================
  // Test diverse and extreme aspect ratios beyond the standard ones

  // Same aspect ratio configs (before and after same dimensions)
  const aspectExtremeSameConfigs = [
    // Ultra-wide (cinematic, panoramic)
    { id: 'aspect-ultrawide-21-9', w: 2520, h: 1080, desc: 'Ultra-wide 21:9 cinematic' },
    { id: 'aspect-panoramic-3-1', w: 3000, h: 1000, desc: 'Panoramic 3:1' },
    // Phone aspect ratios
    { id: 'aspect-16-9-land', w: 1920, h: 1080, desc: 'Phone landscape 16:9' },
    { id: 'aspect-9-16-port', w: 1080, h: 1920, desc: 'Phone portrait 9:16' },
    { id: 'aspect-19-9', w: 1140, h: 540, desc: 'Modern phone 19:9' },
    // DSLR/camera aspect ratios
    { id: 'aspect-3-2-land', w: 1800, h: 1200, desc: 'DSLR 3:2 landscape' },
    { id: 'aspect-2-3-port', w: 1200, h: 1800, desc: 'DSLR 2:3 portrait' },
    { id: 'aspect-4-3', w: 1600, h: 1200, desc: 'Classic 4:3' },
  ];

  for (const config of aspectExtremeSameConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'aspect-extreme',
      description: `Before: ${config.desc}`,
      width: config.w,
      height: config.h,
      noseY: 0.15,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'aspect-extreme',
      description: `After: ${config.desc}`,
      width: config.w,
      height: config.h,
      noseY: 0.15,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'aspect-extreme',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // Mixed extreme aspect ratio configs
  const aspectExtremeMixedConfigs = [
    { id: 'aspect-mix-wide-tall', beforeW: 2520, beforeH: 1080, afterW: 1080, afterH: 1920, desc: '21:9 to 9:16' },
    { id: 'aspect-mix-pano-square', beforeW: 3000, beforeH: 1000, afterW: 1200, afterH: 1200, desc: '3:1 to 1:1' },
  ];

  for (const config of aspectExtremeMixedConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'aspect-extreme',
      description: `Before: ${config.desc}`,
      width: config.beforeW,
      height: config.beforeH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'aspect-extreme',
      description: `After: ${config.desc}`,
      width: config.afterW,
      height: config.afterH,
      noseY: 0.15,
      bodyHeight: 0.45,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'aspect-extreme',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 9: Off-Center Positions (12 fixtures)
  // ========================================
  // Test diverse subject positioning within the frame

  // Same offset configs (both before and after have same centerX)
  const offsetSameConfigs = [
    // Extreme horizontal positions
    { id: 'offset-far-left', centerX: 0.2, desc: 'Subject at 20% from left' },
    { id: 'offset-far-right', centerX: 0.8, desc: 'Subject at 80% from left' },
    { id: 'offset-edge-left', centerX: 0.12, desc: 'Subject near left edge (12%)' },
    { id: 'offset-edge-right', centerX: 0.88, desc: 'Subject near right edge (88%)' },
    // Rule of thirds positioning
    { id: 'offset-thirds-left', centerX: 0.33, desc: 'Subject at left third line' },
    { id: 'offset-thirds-right', centerX: 0.67, desc: 'Subject at right third line' },
  ];

  for (const config of offsetSameConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'offset',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: 0.45,
      centerX: config.centerX,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'offset',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: 0.45,
      centerX: config.centerX,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'offset',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // Asymmetric offset configs (before and after have different centerX)
  const offsetMixedConfigs = [
    { id: 'offset-swap-sides', beforeCenterX: 0.25, afterCenterX: 0.75, desc: 'Subject switches left to right' },
    { id: 'offset-edge-to-center', beforeCenterX: 0.15, afterCenterX: 0.5, desc: 'Edge to center migration' },
    { id: 'offset-center-to-edge', beforeCenterX: 0.5, afterCenterX: 0.85, desc: 'Center to edge migration' },
  ];

  for (const config of offsetMixedConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'offset',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: 0.45,
      centerX: config.beforeCenterX,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'offset',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: 0.12,
      bodyHeight: 0.45,
      centerX: config.afterCenterX,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'offset',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // Quadrant configs (combined horizontal + vertical positioning)
  const offsetQuadrantConfigs = [
    { id: 'offset-quadrant-tl', centerX: 0.25, noseY: 0.08, bodyHeight: 0.45, desc: 'Upper-left quadrant' },
    { id: 'offset-quadrant-tr', centerX: 0.75, noseY: 0.08, bodyHeight: 0.45, desc: 'Upper-right quadrant' },
    { id: 'offset-quadrant-bl', centerX: 0.25, noseY: 0.35, bodyHeight: 0.35, desc: 'Lower-left quadrant' },
  ];

  for (const config of offsetQuadrantConfigs) {
    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'offset',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.noseY,
      bodyHeight: config.bodyHeight,
      centerX: config.centerX,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'offset',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.noseY,
      bodyHeight: config.bodyHeight,
      centerX: config.centerX,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    fixtures.push({
      id: config.id,
      category: 'offset',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: 1.0,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 10: Scale Disparity (8 fixtures)
  // ========================================
  // Test the extended scale clamp [0.65, 1.60] with real-world disparities
  // These simulate cases where subjects are at very different distances from camera

  const scaleDisparityConfigs = [
    // Real-world case from test-data photos (1.477x needed)
    {
      id: 'scale-disparity-real',
      beforeNoseY: 0.2329,
      beforeHipY: 0.5243,  // Body = 0.2914 (29%)
      afterNoseY: 0.3603,
      afterHipY: 0.5577,   // Body = 0.1974 (20%)
      desc: 'Real-world 1.477x disparity (test-data match)'
    },
    // Moderate disparity (1.4x)
    {
      id: 'scale-disparity-moderate',
      beforeNoseY: 0.12,
      beforeHipY: 0.47,    // Body = 0.35
      afterNoseY: 0.12,
      afterHipY: 0.37,     // Body = 0.25
      desc: 'Moderate 1.4x disparity'
    },
    // Near upper clamp boundary (1.55x, within 1.60 limit)
    {
      id: 'scale-disparity-near-upper',
      beforeNoseY: 0.10,
      beforeHipY: 0.56,    // Body = 0.46
      afterNoseY: 0.10,
      afterHipY: 0.40,     // Body = 0.30
      desc: 'Near upper clamp 1.53x'
    },
    // At upper clamp boundary (1.60x exactly)
    {
      id: 'scale-disparity-upper-clamp',
      beforeNoseY: 0.10,
      beforeHipY: 0.58,    // Body = 0.48
      afterNoseY: 0.10,
      afterHipY: 0.40,     // Body = 0.30
      desc: 'At upper clamp boundary 1.60x'
    },
    // Exceeds upper clamp (1.82x, should clamp to 1.60)
    {
      id: 'scale-disparity-exceeds-upper',
      beforeNoseY: 0.08,
      beforeHipY: 0.48,    // Body = 0.40
      afterNoseY: 0.08,
      afterHipY: 0.30,     // Body = 0.22
      desc: 'Exceeds upper clamp 1.82x (clamped to 1.60)'
    },
    // Reverse disparity near lower clamp (0.71x)
    {
      id: 'scale-disparity-reverse-moderate',
      beforeNoseY: 0.12,
      beforeHipY: 0.37,    // Body = 0.25
      afterNoseY: 0.12,
      afterHipY: 0.47,     // Body = 0.35
      desc: 'Reverse moderate 0.71x'
    },
    // At lower clamp boundary (0.65x)
    {
      id: 'scale-disparity-lower-clamp',
      beforeNoseY: 0.10,
      beforeHipY: 0.36,    // Body = 0.26
      afterNoseY: 0.10,
      afterHipY: 0.50,     // Body = 0.40
      desc: 'At lower clamp boundary 0.65x'
    },
    // Exceeds lower clamp (0.55x, should clamp to 0.65)
    {
      id: 'scale-disparity-exceeds-lower',
      beforeNoseY: 0.10,
      beforeHipY: 0.32,    // Body = 0.22
      afterNoseY: 0.10,
      afterHipY: 0.50,     // Body = 0.40
      desc: 'Exceeds lower clamp 0.55x (clamped to 0.65)'
    },
  ];

  for (const config of scaleDisparityConfigs) {
    // Calculate body heights from nose/hip positions
    const beforeBodyH = config.beforeHipY - config.beforeNoseY;
    const afterBodyH = config.afterHipY - config.afterNoseY;

    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'scale-disparity',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.beforeNoseY,
      bodyHeight: beforeBodyH,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'scale-disparity',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: config.afterNoseY,
      bodyHeight: afterBodyH,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    const rawScale = beforeBodyH / afterBodyH;
    const clampedScale = Math.max(0.65, Math.min(1.60, rawScale));

    fixtures.push({
      id: config.id,
      category: 'scale-disparity',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: clampedScale,
        headAlignmentDelta: 0,
      },
    });
  }

  // ========================================
  // Category 11: Horizontal Alignment (10 fixtures)
  // ========================================
  // Test shoulder-center-based horizontal alignment
  // These simulate cases where subjects are positioned differently left/right

  const horizontalAlignmentConfigs: Array<{
    id: string;
    beforeCenterX: number;
    afterCenterX: number;
    beforeBody: number;
    afterBody: number;
    beforeNoseY?: number;
    afterNoseY?: number;
    desc: string;
  }> = [
    // Before subject left, after centered
    {
      id: 'horizontal-left-to-center',
      beforeCenterX: 0.35,
      afterCenterX: 0.50,
      beforeBody: 0.45,
      afterBody: 0.45,
      desc: 'Before left (35%), after centered'
    },
    // Before subject right, after centered
    {
      id: 'horizontal-right-to-center',
      beforeCenterX: 0.65,
      afterCenterX: 0.50,
      beforeBody: 0.45,
      afterBody: 0.45,
      desc: 'Before right (65%), after centered'
    },
    // Both subjects off-center opposite sides
    {
      id: 'horizontal-opposite-sides',
      beforeCenterX: 0.30,
      afterCenterX: 0.70,
      beforeBody: 0.45,
      afterBody: 0.45,
      desc: 'Before left (30%), after right (70%)'
    },
    // Combined: horizontal offset + moderate scale disparity
    {
      id: 'horizontal-combined-scale-left',
      beforeCenterX: 0.35,
      afterCenterX: 0.50,
      beforeBody: 0.50,
      afterBody: 0.35,
      desc: 'Left to center + scale up 1.43x'
    },
    // Combined: horizontal offset + reverse scale
    {
      id: 'horizontal-combined-scale-right',
      beforeCenterX: 0.50,
      afterCenterX: 0.65,
      beforeBody: 0.35,
      afterBody: 0.50,
      desc: 'Center to right + scale down 0.70x'
    },
    // Extreme horizontal offset (near edges)
    {
      id: 'horizontal-extreme-offset',
      beforeCenterX: 0.20,
      afterCenterX: 0.80,
      beforeBody: 0.45,
      afterBody: 0.45,
      desc: 'Extreme offset (20% vs 80%)'
    },
    // Subtle horizontal misalignment
    {
      id: 'horizontal-subtle',
      beforeCenterX: 0.48,
      afterCenterX: 0.52,
      beforeBody: 0.45,
      afterBody: 0.45,
      desc: 'Subtle misalignment (48% vs 52%)'
    },
    // Combined: extreme horizontal + headroom difference
    {
      id: 'horizontal-with-headroom',
      beforeCenterX: 0.35,
      afterCenterX: 0.65,
      beforeBody: 0.45,
      afterBody: 0.45,
      beforeNoseY: 0.08,
      afterNoseY: 0.15,
      desc: 'Horizontal + headroom mismatch'
    },
    // Combined: all factors (horizontal + scale + headroom)
    {
      id: 'horizontal-complex',
      beforeCenterX: 0.30,
      afterCenterX: 0.60,
      beforeBody: 0.50,
      afterBody: 0.35,
      beforeNoseY: 0.10,
      afterNoseY: 0.18,
      desc: 'Complex: horizontal + scale + headroom'
    },
    // Real-world inspired: IMG_0667/IMG_0669 scenario
    {
      id: 'horizontal-real-world',
      beforeCenterX: 0.40,
      afterCenterX: 0.55,
      beforeBody: 0.42,
      afterBody: 0.40,
      desc: 'Real-world horizontal misalignment'
    },
  ];

  for (const config of horizontalAlignmentConfigs) {
    const beforeNoseY = 'beforeNoseY' in config ? config.beforeNoseY : 0.12;
    const afterNoseY = 'afterNoseY' in config ? config.afterNoseY : 0.12;

    const beforeFig = createFigure({
      id: `${config.id}-before`,
      category: 'horizontal',
      description: `Before: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: beforeNoseY,
      bodyHeight: config.beforeBody,
      centerX: config.beforeCenterX,
    });
    const afterFig = createFigure({
      id: `${config.id}-after`,
      category: 'horizontal',
      description: `After: ${config.desc}`,
      width: 1200,
      height: 1600,
      noseY: afterNoseY,
      bodyHeight: config.afterBody,
      centerX: config.afterCenterX,
    });

    figures.set(beforeFig.id, beforeFig);
    figures.set(afterFig.id, afterFig);

    const rawScale = config.beforeBody / config.afterBody;
    const clampedScale = Math.max(0.65, Math.min(1.60, rawScale));

    fixtures.push({
      id: config.id,
      category: 'horizontal',
      description: config.desc,
      before: {
        imagePath: `images/${beforeFig.id}.png`,
        width: beforeFig.imageWidth,
        height: beforeFig.imageHeight,
        landmarks: beforeFig.landmarks,
      },
      after: {
        imagePath: `images/${afterFig.id}.png`,
        width: afterFig.imageWidth,
        height: afterFig.imageHeight,
        landmarks: afterFig.landmarks,
      },
      expected: {
        bodyScale: clampedScale,
        headAlignmentDelta: 0,
      },
    });
  }

  return { fixtures, figures };
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const fixturesDir = path.join(__dirname);
  const imagesDir = path.join(fixturesDir, 'images');

  // Ensure images directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  console.log('Generating visual regression test fixtures...\n');

  const { fixtures, figures } = generateTestFixtures();

  // Generate images for each figure
  console.log(`Generating ${figures.size} test images...`);
  for (const [id, figure] of figures) {
    const backgroundColor = figure.category === 'lowvis' ? '#ffe0e0' : '#f5f5f5';
    const imageBuffer = generateFigureImage(
      figure.imageWidth,
      figure.imageHeight,
      figure.landmarks,
      backgroundColor
    );
    const imagePath = path.join(imagesDir, `${id}.png`);
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(`  ✓ ${id}.png (${figure.imageWidth}x${figure.imageHeight})`);
  }

  // Generate manifest
  const manifest: FixtureManifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    fixtures,
  };

  const manifestPath = path.join(fixturesDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Generated manifest.json with ${fixtures.length} fixtures`);

  // Summary by category
  console.log('\nFixture summary by category:');
  const categoryCount = new Map<string, number>();
  for (const fixture of fixtures) {
    categoryCount.set(fixture.category, (categoryCount.get(fixture.category) || 0) + 1);
  }
  for (const [category, count] of categoryCount) {
    console.log(`  ${category}: ${count} fixtures`);
  }

  console.log(`\nTotal: ${fixtures.length} fixtures, ${figures.size} images`);
  console.log('\nRun visual tests with: npm run test:visual');
}

main().catch(console.error);
