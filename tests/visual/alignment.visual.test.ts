/**
 * Visual Regression Tests for PoseProof Alignment Algorithm
 *
 * These tests validate the export/alignment functionality by:
 * 1. Running the export algorithm with test fixtures
 * 2. Comparing output against golden baselines (pixel comparison)
 * 3. Validating alignment metrics programmatically
 *
 * Run with: npm run test:visual
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  exportCanvasNode,
  fileToDataUrl,
  calculateAlignedDrawParams,
  type ExportFormat,
} from './lib/export-adapter';
import { compareImages, type ComparisonResult } from './lib/pixel-comparator';
import {
  validateAlignment,
  type ValidationResult,
} from './lib/alignment-validator';
import {
  writeReport,
  formatConsoleSummary,
  type ReportData,
  type TestResult,
} from './lib/report-generator';

// ============================================================================
// Configuration
// ============================================================================

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const BASELINES_DIR = path.join(__dirname, 'baselines');
const DIFFS_DIR = path.join(__dirname, 'diffs');
const REPORT_PATH = path.join(__dirname, 'report.html');

const FORMATS: ExportFormat[] = ['1:1', '4:5', '9:16'];
const RESOLUTION = 1080;

// Thresholds
const PIXEL_THRESHOLD = 0.1; // 10% per-pixel tolerance
const ALLOWED_DIFF_PERCENT = 0.5; // 0.5% total pixels can differ
const MAX_HEAD_DELTA = 2; // 2px tolerance

// Fixtures where alignment validation is skipped (e.g., cropped heads where perfect alignment is impossible)
// These fixtures test edge cases where standard validation thresholds don't apply
const SKIP_ALIGNMENT_VALIDATION = new Set([
  'framing-head-cropped',       // Before head is cropped at top - can't perfectly align
  'framing-both-heads-cropped', // Both heads cropped - alignment best-effort only
  'framing-tight-headroom',     // Tests 3% headroom - below normal 5% threshold by design
  'lowvis-nose',                // Uses shoulder alignment due to low nose visibility
  'lowvis-both',                // Uses shoulder alignment due to low visibility on both
]);

// ============================================================================
// Types
// ============================================================================

interface Fixture {
  id: string;
  category: string;
  description: string;
  before: {
    imagePath: string;
    width: number;
    height: number;
    landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
  };
  after: {
    imagePath: string;
    width: number;
    height: number;
    landmarks: Array<{ x: number; y: number; z: number; visibility: number }>;
  };
  expected: {
    bodyScale: number;
    headAlignmentDelta: number;
  };
}

interface Manifest {
  version: string;
  generatedAt: string;
  fixtures: Fixture[];
}

// ============================================================================
// Test State
// ============================================================================

let manifest: Manifest;
const testResults: TestResult[] = [];
let startTime: number;

// ============================================================================
// Setup & Teardown
// ============================================================================

beforeAll(async () => {
  startTime = Date.now();

  // Load manifest
  const manifestPath = path.join(FIXTURES_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'Fixtures not generated. Run: npm run test:visual:generate'
    );
  }
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Ensure diffs directory exists
  if (!fs.existsSync(DIFFS_DIR)) {
    fs.mkdirSync(DIFFS_DIR, { recursive: true });
  }

  console.log(`\nLoaded ${manifest.fixtures.length} test fixtures`);
  console.log(`Testing formats: ${FORMATS.join(', ')}`);
  console.log(`Resolution: ${RESOLUTION}px\n`);
});

afterAll(async () => {
  const duration = Date.now() - startTime;

  // Calculate summary with three categories:
  // - Passed: pixel passed AND (alignment passed OR alignment skipped)
  // - Skipped: pixel passed AND alignment skipped (edge case fixtures)
  // - Failed: pixel failed OR (alignment failed AND not skipped)
  const skipped = testResults.filter(
    (r) => r.pixelComparison.passed && r.alignmentSkipped
  ).length;
  const passed = testResults.filter(
    (r) => r.pixelComparison.passed && (r.alignmentValidation.passed || r.alignmentSkipped)
  ).length;
  const failed = testResults.filter(
    (r) => !r.pixelComparison.passed || (!r.alignmentValidation.passed && !r.alignmentSkipped)
  ).length;

  const reportData: ReportData = {
    timestamp: new Date().toISOString(),
    duration,
    results: testResults,
    summary: {
      total: testResults.length,
      passed,
      skipped,
      failed,
      passRate: testResults.length > 0 ? (passed / testResults.length) * 100 : 0,
    },
  };

  // Write HTML report
  writeReport(reportData, REPORT_PATH);

  // Console summary
  console.log(formatConsoleSummary(reportData));
});

// ============================================================================
// Test Helpers
// ============================================================================

async function runVisualTest(
  fixture: Fixture,
  format: ExportFormat
): Promise<{ pixelResult: ComparisonResult; alignResult: ValidationResult; duration: number }> {
  const testStart = Date.now();

  // Load fixture images as data URLs
  const beforeImagePath = path.join(FIXTURES_DIR, fixture.before.imagePath);
  const afterImagePath = path.join(FIXTURES_DIR, fixture.after.imagePath);

  const beforeDataUrl = await fileToDataUrl(beforeImagePath);
  const afterDataUrl = await fileToDataUrl(afterImagePath);

  // Run export
  const exportResult = await exportCanvasNode(
    {
      dataUrl: beforeDataUrl,
      width: fixture.before.width,
      height: fixture.before.height,
      landmarks: fixture.before.landmarks,
    },
    {
      dataUrl: afterDataUrl,
      width: fixture.after.width,
      height: fixture.after.height,
      landmarks: fixture.after.landmarks,
    },
    format,
    RESOLUTION
  );

  // Get baseline path
  const formatDir = format.replace(':', '-');
  const baselinePath = path.join(
    BASELINES_DIR,
    formatDir,
    `${fixture.id}-${RESOLUTION}.png`
  );
  const diffPath = path.join(DIFFS_DIR, `${fixture.id}-${formatDir}-${RESOLUTION}.png`);

  // Pixel comparison
  let pixelResult: ComparisonResult;
  if (fs.existsSync(baselinePath)) {
    const baselineBuffer = fs.readFileSync(baselinePath);
    pixelResult = await compareImages(exportResult.buffer, baselineBuffer, {
      threshold: PIXEL_THRESHOLD,
      allowedDiffPercent: ALLOWED_DIFF_PERCENT,
      generateDiff: true,
      diffOutputPath: diffPath,
    });
  } else {
    // No baseline - create it
    const baselineDir = path.dirname(baselinePath);
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
    fs.writeFileSync(baselinePath, exportResult.buffer);
    pixelResult = {
      passed: true,
      mismatchedPixels: 0,
      mismatchPercentage: 0,
      totalPixels: exportResult.width * exportResult.height,
      dimensions: {
        actual: { width: exportResult.width, height: exportResult.height },
        baseline: { width: exportResult.width, height: exportResult.height },
        match: true,
      },
    };
    console.log(`  Created baseline: ${baselinePath}`);
  }

  // Alignment validation
  const alignResult = validateAlignment(
    exportResult.alignParams,
    fixture.before.landmarks,
    fixture.after.landmarks,
    exportResult.height,
    {
      maxHeadAlignmentDelta: MAX_HEAD_DELTA,
    }
  );

  const duration = Date.now() - testStart;

  return { pixelResult, alignResult, duration };
}

// ============================================================================
// Tests
// ============================================================================

describe('Visual Regression Tests', () => {
  // Run tests for each format
  for (const format of FORMATS) {
    describe(`Format ${format}`, () => {
      // Increase timeout for processing all fixtures (24 fixtures × ~500ms each)
      it('runs all fixture tests', { timeout: 60000 }, async () => {
        if (!manifest?.fixtures) {
          throw new Error('Fixtures not loaded. Run: npm run test:visual:generate');
        }

        for (const fixture of manifest.fixtures) {
          console.log(`  Testing ${fixture.id} (${format})...`);

          const { pixelResult, alignResult, duration } = await runVisualTest(
            fixture,
            format
          );

          // Store result for report
          const formatDir = format.replace(':', '-');
          const isAlignmentSkipped = SKIP_ALIGNMENT_VALIDATION.has(fixture.id);
          testResults.push({
            id: fixture.id,
            category: fixture.category,
            format,
            resolution: RESOLUTION,
            pixelComparison: pixelResult,
            alignmentValidation: alignResult,
            baselinePath: path.join(BASELINES_DIR, formatDir, `${fixture.id}-${RESOLUTION}.png`),
            actualPath: path.join(DIFFS_DIR, `${fixture.id}-${formatDir}-${RESOLUTION}-actual.png`),
            diffPath: pixelResult.diffImagePath,
            duration,
            alignmentSkipped: isAlignmentSkipped,
            beforeImagePath: path.join(FIXTURES_DIR, fixture.before.imagePath),
            afterImagePath: path.join(FIXTURES_DIR, fixture.after.imagePath),
          });

          // Assertions with clear error messages
          expect(
            pixelResult.passed,
            `[${fixture.id}] Pixel mismatch: ${pixelResult.mismatchPercentage.toFixed(3)}%`
          ).toBe(true);

          // Skip alignment validation for fixtures with cropped heads
          if (!SKIP_ALIGNMENT_VALIDATION.has(fixture.id)) {
            expect(
              alignResult.passed,
              `[${fixture.id}] Alignment errors: ${alignResult.errors.join(', ')}`
            ).toBe(true);
          } else {
            // Log but don't fail for cropped head fixtures
            if (!alignResult.passed) {
              console.log(`    [EXPECTED] ${fixture.id}: ${alignResult.errors.join(', ')}`);
            }
          }
        }
      });
    });
  }
});

// ============================================================================
// Standalone runner for debugging
// ============================================================================

if (process.argv[1]?.includes('alignment.visual.test')) {
  console.log('Running visual tests directly...');
  // The tests will run via vitest
}
