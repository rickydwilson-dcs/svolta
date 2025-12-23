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
  const { id, category, description, width, height, noseY, bodyHeight, visibility, backgroundColor } = params;
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
  // Test scale clamping boundaries (0.8 - 1.25)

  const extremeConfigs = [
    { id: 'extreme-tall-before', beforeBody: 0.60, afterBody: 0.40, desc: 'Tall before, short after (should clamp to 1.25)' },
    { id: 'extreme-short-before', beforeBody: 0.30, afterBody: 0.50, desc: 'Short before, tall after (should clamp to 0.8)' },
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
    const clampedScale = Math.max(0.8, Math.min(1.25, rawScale));

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
    const clampedScale = Math.max(0.8, Math.min(1.25, rawScale));

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
