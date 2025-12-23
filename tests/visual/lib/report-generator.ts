/**
 * HTML Report Generator for Visual Regression Tests
 *
 * Generates an interactive HTML report showing test results with
 * side-by-side image comparisons for failures.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ComparisonResult } from './pixel-comparator';
import type { ValidationResult } from './alignment-validator';

// ============================================================================
// Types
// ============================================================================

export interface TestResult {
  id: string;
  category: string;
  format: ExportFormat;
  resolution: number;
  pixelComparison: ComparisonResult;
  alignmentValidation: ValidationResult;
  baselinePath: string;
  actualPath: string;
  diffPath?: string;
  duration: number;
}

export type ExportFormat = '1:1' | '4:5' | '9:16';

export interface ReportData {
  timestamp: string;
  duration: number;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate HTML report from test results
 */
export function generateHtmlReport(data: ReportData): string {
  const { timestamp, duration, results, summary } = data;

  const failedTests = results.filter(
    (r) => !r.pixelComparison.passed || !r.alignmentValidation.passed
  );
  const passedTests = results.filter(
    (r) => r.pixelComparison.passed && r.alignmentValidation.passed
  );

  // Group by category
  const byCategory = new Map<string, TestResult[]>();
  for (const result of results) {
    const existing = byCategory.get(result.category) || [];
    existing.push(result);
    byCategory.set(result.category, existing);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visual Regression Test Report - PoseProof</title>
  <style>
    :root {
      --bg: #1a1a2e;
      --surface: #16213e;
      --surface-alt: #0f3460;
      --text: #eaeaea;
      --text-muted: #a0a0a0;
      --success: #00c853;
      --error: #ff5252;
      --warning: #ffc107;
      --accent: #4ecdc4;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: var(--surface);
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
    }

    .stat-value.success { color: var(--success); }
    .stat-value.error { color: var(--error); }
    .stat-value.neutral { color: var(--accent); }

    .section {
      margin-bottom: 3rem;
    }

    .section-title {
      font-size: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--surface-alt);
    }

    .test-grid {
      display: grid;
      gap: 1.5rem;
    }

    .test-card {
      background: var(--surface);
      border-radius: 12px;
      overflow: hidden;
    }

    .test-header {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--surface-alt);
    }

    .test-name {
      font-weight: 600;
    }

    .test-meta {
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge.pass { background: rgba(0, 200, 83, 0.2); color: var(--success); }
    .badge.fail { background: rgba(255, 82, 82, 0.2); color: var(--error); }

    .test-body {
      padding: 1.5rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric {
      background: var(--surface-alt);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }

    .metric-value {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .metric-value.pass { color: var(--success); }
    .metric-value.fail { color: var(--error); }

    .image-comparison {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .image-panel {
      text-align: center;
    }

    .image-panel img {
      max-width: 100%;
      border-radius: 8px;
      border: 2px solid var(--surface-alt);
    }

    .image-label {
      margin-top: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .errors-list {
      background: rgba(255, 82, 82, 0.1);
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }

    .errors-list h4 {
      color: var(--error);
      margin-bottom: 0.5rem;
    }

    .errors-list ul {
      margin-left: 1.5rem;
    }

    .errors-list li {
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }

    .collapsed .test-body {
      display: none;
    }

    .toggle-btn {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
    }

    .toggle-btn:hover {
      text-decoration: underline;
    }

    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid var(--surface-alt);
    }

    .category-header {
      background: var(--surface-alt);
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-weight: 600;
      text-transform: capitalize;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Visual Regression Report</h1>
      <p class="subtitle">PoseProof Alignment Tests - ${timestamp}</p>
    </header>

    <div class="summary">
      <div class="stat-card">
        <div class="stat-value neutral">${summary.total}</div>
        <div class="stat-label">Total Tests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success">${summary.passed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value error">${summary.failed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value ${summary.passRate >= 95 ? 'success' : summary.passRate >= 80 ? 'neutral' : 'error'}">${summary.passRate.toFixed(1)}%</div>
        <div class="stat-label">Pass Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value neutral">${(duration / 1000).toFixed(2)}s</div>
        <div class="stat-label">Duration</div>
      </div>
    </div>

    ${failedTests.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Failed Tests (${failedTests.length})</h2>
      <div class="test-grid">
        ${failedTests.map((test) => renderTestCard(test, false)).join('\n')}
      </div>
    </section>
    ` : ''}

    <section class="section">
      <h2 class="section-title">All Tests by Category</h2>
      ${Array.from(byCategory.entries())
        .map(
          ([category, tests]) => `
        <div class="category-header">${category} (${tests.filter((t) => t.pixelComparison.passed && t.alignmentValidation.passed).length}/${tests.length} passed)</div>
        <div class="test-grid">
          ${tests.map((test) => renderTestCard(test, true)).join('\n')}
        </div>
      `
        )
        .join('\n')}
    </section>

    <footer>
      Generated by PoseProof Visual Regression Test Suite
    </footer>
  </div>

  <script>
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.test-card');
        card.classList.toggle('collapsed');
        btn.textContent = card.classList.contains('collapsed') ? 'Expand' : 'Collapse';
      });
    });
  </script>
</body>
</html>`;
}

/**
 * Render a single test card
 */
function renderTestCard(test: TestResult, collapsed: boolean): string {
  const passed = test.pixelComparison.passed && test.alignmentValidation.passed;
  const pixelMatch = 100 - test.pixelComparison.mismatchPercentage;

  return `
    <div class="test-card ${collapsed && passed ? 'collapsed' : ''}">
      <div class="test-header">
        <div>
          <span class="test-name">${test.id}</span>
          <span class="test-meta"> - ${test.format} @ ${test.resolution}px</span>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <span class="badge ${passed ? 'pass' : 'fail'}">${passed ? 'PASS' : 'FAIL'}</span>
          <button class="toggle-btn">${collapsed && passed ? 'Expand' : 'Collapse'}</button>
        </div>
      </div>
      <div class="test-body">
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-label">Pixel Match</div>
            <div class="metric-value ${test.pixelComparison.passed ? 'pass' : 'fail'}">${pixelMatch.toFixed(2)}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">Head Delta</div>
            <div class="metric-value ${test.alignmentValidation.headAlignment.passed ? 'pass' : 'fail'}">${test.alignmentValidation.headAlignment.delta.toFixed(2)}px</div>
          </div>
          <div class="metric">
            <div class="metric-label">Headroom</div>
            <div class="metric-value ${test.alignmentValidation.headroom.passed ? 'pass' : 'fail'}">${(test.alignmentValidation.headroom.constraintPercent * 100).toFixed(1)}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">Body Scale</div>
            <div class="metric-value ${test.alignmentValidation.bodyScale.withinRange ? 'pass' : 'fail'}">${test.alignmentValidation.bodyScale.applied.toFixed(3)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Duration</div>
            <div class="metric-value">${test.duration}ms</div>
          </div>
        </div>

        ${!passed ? `
        <div class="image-comparison">
          <div class="image-panel">
            <img src="${test.baselinePath}" alt="Baseline" onerror="this.style.display='none'">
            <div class="image-label">Baseline</div>
          </div>
          <div class="image-panel">
            <img src="${test.actualPath}" alt="Actual" onerror="this.style.display='none'">
            <div class="image-label">Actual</div>
          </div>
          <div class="image-panel">
            <img src="${test.diffPath || ''}" alt="Diff" onerror="this.style.display='none'">
            <div class="image-label">Diff</div>
          </div>
        </div>
        ` : ''}

        ${test.alignmentValidation.errors.length > 0 || test.pixelComparison.error ? `
        <div class="errors-list">
          <h4>Errors</h4>
          <ul>
            ${test.pixelComparison.error ? `<li>${test.pixelComparison.error}</li>` : ''}
            ${test.alignmentValidation.errors.map((e) => `<li>${e}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Write report to file
 */
export function writeReport(data: ReportData, outputPath: string): void {
  const html = generateHtmlReport(data);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, html);
  console.log(`Report written to: ${outputPath}`);
}

/**
 * Create summary for console output
 */
export function formatConsoleSummary(data: ReportData): string {
  const { summary, results } = data;

  let output = '\n';
  output += '═══════════════════════════════════════════════════════════════\n';
  output += '                    VISUAL REGRESSION SUMMARY                   \n';
  output += '═══════════════════════════════════════════════════════════════\n\n';

  output += `  Total:     ${summary.total}\n`;
  output += `  Passed:    \x1b[32m${summary.passed}\x1b[0m\n`;
  output += `  Failed:    \x1b[31m${summary.failed}\x1b[0m\n`;
  output += `  Pass Rate: ${summary.passRate >= 95 ? '\x1b[32m' : '\x1b[31m'}${summary.passRate.toFixed(1)}%\x1b[0m\n`;
  output += `  Duration:  ${(data.duration / 1000).toFixed(2)}s\n\n`;

  // List failures
  const failures = results.filter(
    (r) => !r.pixelComparison.passed || !r.alignmentValidation.passed
  );

  if (failures.length > 0) {
    output += '  Failed Tests:\n';
    for (const f of failures) {
      output += `    \x1b[31m✗\x1b[0m ${f.id} (${f.format})\n`;
      if (f.pixelComparison.error) {
        output += `        ${f.pixelComparison.error}\n`;
      }
      for (const err of f.alignmentValidation.errors) {
        output += `        ${err}\n`;
      }
    }
  }

  output += '\n═══════════════════════════════════════════════════════════════\n';

  return output;
}
