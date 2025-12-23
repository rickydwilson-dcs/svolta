/**
 * Pixel Comparator for Visual Regression Testing
 *
 * Compares two PNG images and generates a diff image highlighting differences.
 * Uses pixelmatch for perceptual comparison with configurable thresholds.
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface ComparisonOptions {
  /** Per-pixel color threshold (0-1). Default: 0.1 (10% tolerance) */
  threshold?: number;
  /** Maximum percentage of pixels that can differ and still pass. Default: 0.5 */
  allowedDiffPercent?: number;
  /** Whether to generate a diff image. Default: true */
  generateDiff?: boolean;
  /** Path to save the diff image. Required if generateDiff is true */
  diffOutputPath?: string;
  /** Include anti-aliasing detection. Default: true */
  includeAA?: boolean;
}

export interface ComparisonResult {
  /** Whether the comparison passed */
  passed: boolean;
  /** Number of mismatched pixels */
  mismatchedPixels: number;
  /** Percentage of pixels that differed (0-100) */
  mismatchPercentage: number;
  /** Total pixels in the image */
  totalPixels: number;
  /** Path to the diff image (if generated) */
  diffImagePath?: string;
  /** Dimensions comparison */
  dimensions: {
    actual: { width: number; height: number };
    baseline: { width: number; height: number };
    match: boolean;
  };
  /** Error message if comparison failed */
  error?: string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<ComparisonOptions, 'diffOutputPath'>> = {
  threshold: 0.1, // 10% per-pixel color tolerance
  allowedDiffPercent: 0.5, // 0.5% total pixels can differ
  generateDiff: true,
  includeAA: true,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Compare two PNG buffers and return the comparison result
 */
export async function compareImages(
  actualBuffer: Buffer,
  baselineBuffer: Buffer,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Parse PNG buffers
    const actual = PNG.sync.read(actualBuffer);
    const baseline = PNG.sync.read(baselineBuffer);

    // Check dimension match
    const dimensionsMatch = actual.width === baseline.width && actual.height === baseline.height;

    if (!dimensionsMatch) {
      return {
        passed: false,
        mismatchedPixels: -1,
        mismatchPercentage: 100,
        totalPixels: actual.width * actual.height,
        dimensions: {
          actual: { width: actual.width, height: actual.height },
          baseline: { width: baseline.width, height: baseline.height },
          match: false,
        },
        error: `Dimension mismatch: actual ${actual.width}x${actual.height} vs baseline ${baseline.width}x${baseline.height}`,
      };
    }

    // Create diff image buffer
    const diff = new PNG({ width: actual.width, height: actual.height });

    // Run pixel comparison
    const mismatchedPixels = pixelmatch(
      actual.data,
      baseline.data,
      diff.data,
      actual.width,
      actual.height,
      {
        threshold: opts.threshold,
        includeAA: opts.includeAA,
        diffColor: [255, 0, 0], // Red for differences
        diffColorAlt: [0, 255, 0], // Green for anti-aliased differences
      }
    );

    const totalPixels = actual.width * actual.height;
    const mismatchPercentage = (mismatchedPixels / totalPixels) * 100;
    const passed = mismatchPercentage <= opts.allowedDiffPercent;

    // Generate diff image if requested
    let diffImagePath: string | undefined;
    if (opts.generateDiff && opts.diffOutputPath) {
      const diffDir = path.dirname(opts.diffOutputPath);
      if (!fs.existsSync(diffDir)) {
        fs.mkdirSync(diffDir, { recursive: true });
      }
      fs.writeFileSync(opts.diffOutputPath, PNG.sync.write(diff));
      diffImagePath = opts.diffOutputPath;
    }

    return {
      passed,
      mismatchedPixels,
      mismatchPercentage,
      totalPixels,
      diffImagePath,
      dimensions: {
        actual: { width: actual.width, height: actual.height },
        baseline: { width: baseline.width, height: baseline.height },
        match: true,
      },
    };
  } catch (error) {
    return {
      passed: false,
      mismatchedPixels: -1,
      mismatchPercentage: 100,
      totalPixels: 0,
      dimensions: {
        actual: { width: 0, height: 0 },
        baseline: { width: 0, height: 0 },
        match: false,
      },
      error: error instanceof Error ? error.message : 'Unknown comparison error',
    };
  }
}

/**
 * Compare two PNG files and return the comparison result
 */
export async function compareImageFiles(
  actualPath: string,
  baselinePath: string,
  options: ComparisonOptions = {}
): Promise<ComparisonResult> {
  try {
    // Check if files exist
    if (!fs.existsSync(actualPath)) {
      return {
        passed: false,
        mismatchedPixels: -1,
        mismatchPercentage: 100,
        totalPixels: 0,
        dimensions: {
          actual: { width: 0, height: 0 },
          baseline: { width: 0, height: 0 },
          match: false,
        },
        error: `Actual image not found: ${actualPath}`,
      };
    }

    if (!fs.existsSync(baselinePath)) {
      return {
        passed: false,
        mismatchedPixels: -1,
        mismatchPercentage: 100,
        totalPixels: 0,
        dimensions: {
          actual: { width: 0, height: 0 },
          baseline: { width: 0, height: 0 },
          match: false,
        },
        error: `Baseline image not found: ${baselinePath}`,
      };
    }

    const actualBuffer = fs.readFileSync(actualPath);
    const baselineBuffer = fs.readFileSync(baselinePath);

    return compareImages(actualBuffer, baselineBuffer, options);
  } catch (error) {
    return {
      passed: false,
      mismatchedPixels: -1,
      mismatchPercentage: 100,
      totalPixels: 0,
      dimensions: {
        actual: { width: 0, height: 0 },
        baseline: { width: 0, height: 0 },
        match: false,
      },
      error: error instanceof Error ? error.message : 'Unknown file read error',
    };
  }
}

/**
 * Format comparison result for console output
 */
export function formatComparisonResult(result: ComparisonResult, testName: string): string {
  const status = result.passed ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  const matchStr = `${(100 - result.mismatchPercentage).toFixed(2)}% match`;

  let output = `  ${testName} ... ${status} (${matchStr})`;

  if (!result.passed) {
    if (result.error) {
      output += `\n    Error: ${result.error}`;
    } else {
      output += `\n    Mismatched: ${result.mismatchedPixels} pixels (${result.mismatchPercentage.toFixed(3)}%)`;
      if (result.diffImagePath) {
        output += `\n    Diff: ${result.diffImagePath}`;
      }
    }
  }

  return output;
}
