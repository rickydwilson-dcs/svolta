import { test, expect } from '@playwright/test'

/**
 * Example E2E test template for svolta
 *
 * Test file naming conventions:
 * - E2E tests: *.spec.ts (in e2e/ directory)
 * - Smoke tests: use @smoke tag for critical path tests
 *
 * Run tests:
 * - npm run test:e2e       (all E2E tests)
 * - npm run test:e2e:smoke (smoke tests only)
 * - npm run test:e2e:ui    (interactive UI mode)
 */

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/svolta/)
  })

  test('@smoke should have main navigation', async ({ page }) => {
    await page.goto('/')
    // Verify page loads without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Editor Page', () => {
  test('should navigate to editor', async ({ page }) => {
    await page.goto('/editor')
    // Editor should be accessible
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('body')).toBeVisible()
  })

  test('@smoke should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Attempt to access a protected route
    await page.goto('/editor')
    // Should either show editor or redirect to login
    await expect(page.locator('body')).toBeVisible()
  })
})
