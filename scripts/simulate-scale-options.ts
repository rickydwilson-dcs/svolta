/**
 * Scale Clamp Simulation Script
 *
 * Tests different clamp ranges against real-world scenarios to find
 * the optimal balance between correction and visual quality.
 *
 * Run with: npx tsx scripts/simulate-scale-options.ts
 */

interface Scenario {
  name: string;
  beforeBodyH: number;
  afterBodyH: number;
}

interface ClampOption {
  label: string;
  min: number;
  max: number;
}

interface SimulationResult {
  scenario: string;
  rawScale: number;
  clampedScale: number;
  correctionNeeded: number;
  correctionApplied: number;
  correctionLost: number;
  percentRetained: number;
}

// Test scenarios based on real-world photos
const SCENARIOS: Scenario[] = [
  {
    name: 'Real-world (test-data photos)',
    beforeBodyH: 0.2914,
    afterBodyH: 0.1973,
  },
  {
    name: 'Moderate disparity',
    beforeBodyH: 0.35,
    afterBodyH: 0.25,
  },
  {
    name: 'Extreme disparity',
    beforeBodyH: 0.4,
    afterBodyH: 0.22,
  },
  {
    name: 'Reverse moderate',
    beforeBodyH: 0.25,
    afterBodyH: 0.35,
  },
  {
    name: 'Normal case (similar)',
    beforeBodyH: 0.4,
    afterBodyH: 0.45,
  },
  {
    name: 'Slight difference',
    beforeBodyH: 0.38,
    afterBodyH: 0.32,
  },
];

// Clamp options to test
const CLAMP_OPTIONS: ClampOption[] = [
  { label: 'Current [0.80, 1.25]', min: 0.8, max: 1.25 },
  { label: 'Moderate [0.70, 1.50]', min: 0.7, max: 1.5 },
  { label: 'Balanced [0.65, 1.60]', min: 0.65, max: 1.6 },
  { label: 'Wide [0.60, 1.75]', min: 0.6, max: 1.75 },
  { label: 'Maximum [0.50, 2.00]', min: 0.5, max: 2.0 },
];

function calculateResults(
  scenario: Scenario,
  clamp: ClampOption
): SimulationResult {
  const rawScale = scenario.beforeBodyH / scenario.afterBodyH;
  const clampedScale = Math.max(clamp.min, Math.min(clamp.max, rawScale));

  // Correction is deviation from 1.0 (no scaling)
  const correctionNeeded = rawScale - 1;
  const correctionApplied = clampedScale - 1;
  const correctionLost = correctionNeeded - correctionApplied;

  // Percentage of needed correction that was retained
  const percentRetained =
    correctionNeeded !== 0
      ? (correctionApplied / correctionNeeded) * 100
      : 100;

  return {
    scenario: scenario.name,
    rawScale,
    clampedScale,
    correctionNeeded,
    correctionApplied,
    correctionLost,
    percentRetained,
  };
}

function printHeader(title: string): void {
  console.log('\n' + '='.repeat(100));
  console.log(title);
  console.log('='.repeat(100));
}

function printTable(results: SimulationResult[], clampLabel: string): void {
  console.log(`\n${clampLabel}`);
  console.log('-'.repeat(90));
  console.log(
    '| Scenario                          | Raw    | Clamped | Needed | Applied | Lost   | Retained |'
  );
  console.log(
    '|-----------------------------------|--------|---------|--------|---------|--------|----------|'
  );

  for (const r of results) {
    const scenarioName = r.scenario.padEnd(33);
    const raw = r.rawScale.toFixed(3).padStart(6);
    const clamped = r.clampedScale.toFixed(3).padStart(7);
    const needed = (r.correctionNeeded >= 0 ? '+' : '') + r.correctionNeeded.toFixed(3);
    const applied = (r.correctionApplied >= 0 ? '+' : '') + r.correctionApplied.toFixed(3);
    const lost = (r.correctionLost >= 0 ? '+' : '') + r.correctionLost.toFixed(3);
    const retained = r.percentRetained.toFixed(1).padStart(6) + '%';

    // Highlight rows where correction is lost
    const isLoss = Math.abs(r.correctionLost) > 0.01;
    const marker = isLoss ? ' ⚠️' : ' ✅';

    console.log(
      `| ${scenarioName} | ${raw} | ${clamped} | ${needed.padStart(6)} | ${applied.padStart(7)} | ${lost.padStart(6)} | ${retained}${marker} |`
    );
  }
}

function printSummary(): void {
  printHeader('SUMMARY: Which clamp option handles each scenario?');

  console.log('\n| Scenario                          | Current | Moderate | Balanced | Wide   | Maximum |');
  console.log('|-----------------------------------|---------|----------|----------|--------|---------|');

  for (const scenario of SCENARIOS) {
    const scenarioName = scenario.name.padEnd(33);
    const checks = CLAMP_OPTIONS.map((clamp) => {
      const result = calculateResults(scenario, clamp);
      // Consider it "handled" if >95% correction retained
      return result.percentRetained >= 95 ? '  ✅   ' : '  ❌   ';
    });

    console.log(`| ${scenarioName} | ${checks.join(' | ')} |`);
  }
}

function printRecommendation(): void {
  printHeader('RECOMMENDATION');

  console.log(`
Based on the simulation results:

1. **Current [0.80, 1.25]** - Only handles scenarios with <25% body height difference
   - ❌ Fails on real-world test-data photos (1.477x needed)

2. **Moderate [0.70, 1.50]** - Good balance, handles most cases
   - ✅ Handles real-world case
   - May struggle with extreme cases

3. **Balanced [0.65, 1.60]** - RECOMMENDED
   - ✅ Handles all real-world scenarios tested
   - ✅ Provides headroom for edge cases
   - ✅ Stays within visually acceptable scaling range

4. **Wide [0.60, 1.75]** - More aggressive
   - Handles extreme cases but may over-scale
   - Risk of pixelation at 1.75x

5. **Maximum [0.50, 2.00]** - Most permissive
   - Handles everything but may produce unnatural results
   - 2x scaling can cause noticeable quality loss

**DECISION: Use Balanced [0.65, 1.60] as it covers the real-world case (1.477x)
with headroom, while staying within reasonable visual quality bounds.**
`);
}

// Main execution
function main(): void {
  printHeader('SCALE CLAMP SIMULATION');
  console.log('Testing different clamp ranges against real-world scenarios\n');

  // Run simulation for each clamp option
  for (const clamp of CLAMP_OPTIONS) {
    const results = SCENARIOS.map((scenario) => calculateResults(scenario, clamp));
    printTable(results, clamp.label);
  }

  // Print summary and recommendation
  printSummary();
  printRecommendation();
}

main();
