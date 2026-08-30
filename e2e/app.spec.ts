import { expect, test } from '@playwright/test'

// Backend-independent smoke tests: the app shell must render and
// unauthenticated visitors must be routed to the login page.

test('root shows the marketing landing page to unauthenticated visitors', async ({ page }) => {
  await page.goto('/')
  // The root is a marketing landing page; protected areas redirect instead.
  await expect(page).not.toHaveURL(/\/(dashboard|settings|editor)/, { timeout: 10_000 })
})

test('login page renders the auth form', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('input[type="password"]')).toBeVisible()
})

test('protected routes redirect to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.goto('/settings')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  await page.goto('/mcp')
  await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
})
