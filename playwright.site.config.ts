import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './artifacts/browser-site',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    baseURL: process.env.SITE_BASE_URL ?? 'http://127.0.0.1:4174/omio-gen-ui-demo/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
