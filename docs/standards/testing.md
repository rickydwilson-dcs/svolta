# Testing Standards

This document outlines the testing strategy and standards for PoseProof.

## Testing Stack

- **Unit/Integration Tests:** Vitest + Testing Library
- **Visual Regression Tests:** Vitest + Pixelmatch + Custom validators
- **E2E Tests:** Playwright
- **Coverage:** V8 provider via Vitest

## Test File Conventions

| Test Type               | Location                     | Naming                       |
| ----------------------- | ---------------------------- | ---------------------------- |
| Unit tests              | `tests/` or alongside source | `*.test.ts`, `*.test.tsx`    |
| Visual regression tests | `tests/visual/`              | `*.visual.test.ts`           |
| E2E tests               | `e2e/`                       | `*.spec.ts`                  |
| Fixtures                | `tests/fixtures/`            | Any                          |
| Visual baselines        | `tests/visual/baselines/`    | `{fixture}-{resolution}.png` |

## Test Commands

```bash
# Unit tests
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report

# Visual regression tests
npm run test:visual           # Run all visual tests
npm run test:visual:unit      # Run only alignment unit tests (faster)
npm run test:visual:watch     # Watch mode for visual tests
npm run test:visual:generate  # Generate test fixtures
npm run test:visual:report    # Open HTML report

# E2E tests
npm run test:e2e       # All E2E tests
npm run test:e2e:smoke # Smoke tests only (@smoke tag)
npm run test:e2e:ui    # Interactive UI mode
```

## Tiered Testing Strategy

### Tier 1: Smoke Tests (~30 seconds)

- Tagged with `@smoke` in E2E tests
- Critical user paths only
- Run on every push to `develop`

### Tier 2: Standard Tests (2-3 minutes)

- All unit tests + standard E2E
- Run on pushes to `staging`

### Tier 3: Full Suite (10+ minutes)

- Comprehensive coverage
- Run manually before major releases

## Test Coverage Expectations

| Area               | Target | Priority |
| ------------------ | ------ | -------- |
| Utility functions  | 80%+   | High     |
| State stores       | 70%+   | High     |
| API routes         | 70%+   | High     |
| React components   | 50%+   | Medium   |
| E2E critical paths | 100%   | High     |

## Writing Good Tests

### Unit Tests

```typescript
describe("FeatureName", () => {
  it("should describe the expected behavior", () => {
    // Arrange
    const input = createTestData();

    // Act
    const result = featureFunction(input);

    // Assert
    expect(result).toMatchObject({ expected: "value" });
  });
});
```

### E2E Tests

```typescript
test("should complete critical user flow", async ({ page }) => {
  // Navigate
  await page.goto("/feature");

  // Interact
  await page.click('button[data-testid="action"]');

  // Assert
  await expect(page.locator(".result")).toBeVisible();
});
```

## Mocking Guidelines

### What to Mock

- External APIs (Stripe, Supabase)
- Browser APIs not available in jsdom
- Time-dependent functions

### What NOT to Mock

- Internal utility functions
- React component interactions
- State management

## CI Integration

Tests run automatically on:

- `develop` branch: Unit tests + Smoke E2E
- `staging` branch: Unit tests + Full E2E
- `main` branch: Unit tests only (E2E verified on staging)

See `.github/workflows/ci.yml` for details.

---

## Visual Regression Testing

PoseProof includes a comprehensive visual regression testing suite for validating the alignment algorithm. This ensures pixel-perfect consistency across code changes.

### Architecture

The visual testing suite has three tiers:

```
tests/visual/
├── alignment.unit.test.ts     # Tier 1: Pure function unit tests (~30 tests)
├── alignment.visual.test.ts   # Tier 2: Pixel comparison + validation
├── baselines/                 # Golden reference images
│   ├── 1-1/                  # Square format baselines
│   ├── 4-5/                  # Portrait format baselines
│   └── 9-16/                 # Stories format baselines
├── diffs/                     # Generated diff images for failures
├── fixtures/                  # Test input images
│   ├── sources/              # Before/after source images
│   ├── manifest.json         # Fixture metadata
│   └── generate-fixtures.ts  # Fixture generator script
├── lib/                       # Test utilities
│   ├── pixel-comparator.ts   # Pixelmatch wrapper
│   ├── alignment-validator.ts # Alignment metrics validator
│   ├── report-generator.ts   # HTML report generator
│   └── export-adapter.ts     # Node.js canvas export
└── report.html               # Interactive HTML report
```

### Test Categories

| Category       | Count | Purpose                                   |
| -------------- | ----- | ----------------------------------------- |
| Standard       | 4     | Happy path with well-positioned subjects  |
| Aspect         | 6     | Different source image aspect ratios      |
| Extreme        | 6     | Body scale clamping boundaries            |
| Headroom       | 4     | Head position constraints                 |
| Low Visibility | 4     | Fallback behavior for poor landmarks      |
| Framing        | 10    | Cropped heads, tight headroom, off-center |

### Unit Tests (Tier 1)

Pure function tests for the alignment algorithm in `alignment.unit.test.ts`:

**Phase Coverage:**

- **Phase 1: Body Scale** - Scale calculation, clamping to 0.8-1.25
- **Phase 1.5: Overflow Normalization** - Minimum 15% overflow constraint
- **Phase 2: Headroom Constraint** - 5-20% from top positioning
- **Phase 3: Image Positioning** - Head alignment, no white space
- **Phase 4: Dynamic Crop** - Bottom crop, aspect ratio maintenance

**Edge Cases:**

- Low visibility landmarks (fallback to defaults)
- Cropped heads (shoulder alignment mode)
- Different aspect ratios (portrait, landscape, mixed)

### Visual Regression Tests (Tier 2)

Pixel-level comparison tests in `alignment.visual.test.ts`:

**Test Matrix:**

- 24+ fixtures × 3 formats (1:1, 4:5, 9:16) = 72+ test cases
- Resolution: 1080px
- Baseline comparison with diff image generation

**Pass/Fail Criteria:**

| Metric      | Threshold | Description                      |
| ----------- | --------- | -------------------------------- |
| Pixel Match | ≥ 99.5%   | Maximum 0.5% pixels can differ   |
| Head Delta  | ≤ 2px     | Heads must align within 2 pixels |
| Headroom    | 5-20%     | Head position from top of canvas |
| Body Scale  | 0.8-1.25  | Scale factor within clamp range  |

**Edge Case Handling:**

Some fixtures intentionally skip validation for specific edge cases:

- `framing-head-cropped` - Uses shoulder alignment
- `framing-both-heads-cropped` - Both heads cut off
- `framing-tight-headroom` - Below 5% headroom threshold
- `lowvis-nose` - Low nose visibility
- `lowvis-both` - Low visibility on both images

### Supporting Libraries

**Pixel Comparator** (`lib/pixel-comparator.ts`)

- Uses `pixelmatch` for perceptual image comparison
- Configurable per-pixel threshold (default 10%)
- Generates diff images highlighting mismatches
- Returns detailed ComparisonResult with metrics

**Alignment Validator** (`lib/alignment-validator.ts`)

- Validates alignment parameters programmatically
- Supports head and shoulder alignment modes
- Returns ValidationResult with:
  - Head/shoulder delta metrics
  - Headroom percentages
  - Body scale validation
  - Error/warning lists

**Report Generator** (`lib/report-generator.ts`)

- Interactive HTML report with dark theme
- Categorized results: Failed, Skipped, Passed
- Side-by-side image comparisons
- Metrics display and summary statistics

**Export Adapter** (`lib/export-adapter.ts`)

- Node.js canvas export (headless testing)
- Replicates browser export functionality
- Implements full 4-phase alignment algorithm

### Running Visual Tests

```bash
# Run all visual tests (unit + regression)
npm run test:visual

# Run only unit tests (faster feedback)
npm run test:visual:unit

# Generate new test fixtures
npm run test:visual:generate

# Open HTML report after tests
npm run test:visual:report

# Or use the skill command
/test.visual
/test.visual --unit
/test.visual --report
```

### Updating Baselines

When intentional algorithm changes require baseline updates:

1. Run tests and review diff images in `tests/visual/diffs/`
2. Verify changes are expected
3. Regenerate baselines:
   ```bash
   npm run test:visual:generate
   npm run test:visual
   ```
4. Review HTML report to confirm all tests pass

### Canvas Dependencies

The visual tests require native canvas dependencies:

```bash
# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg

# Ubuntu/Debian
sudo apt-get install libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
```

### Adding New Test Fixtures

1. Add source images to `tests/visual/fixtures/sources/`
2. Update `manifest.json` with fixture metadata:
   ```json
   {
     "id": "new-fixture",
     "name": "New Test Case",
     "before": "sources/new-before.jpg",
     "after": "sources/new-after.jpg",
     "beforeLandmarks": [...],
     "afterLandmarks": [...],
     "category": "standard"
   }
   ```
3. Run fixture generator: `npm run test:visual:generate`
4. Run tests to generate baselines: `npm run test:visual`
5. Review and commit new baselines
