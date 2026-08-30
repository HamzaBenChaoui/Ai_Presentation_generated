import { defineConfig, devices } from '@playwright/test'

/**
 * E2E smoke tests for the Slide AI frontend.
 *
 * Run against the Vite dev server (`npm run dev` on :5173). The tests below
 * are intentionally backend-independent: they verify the app shell renders
 * and unauthenticated users are routed to login — no data is touched.
 *
 *   npx playwright install chromium   # once
 *   npx playwright test
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
