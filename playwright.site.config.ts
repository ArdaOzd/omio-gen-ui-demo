import { defineConfig, devices } from '@playwright/test'

const siteBaseURL = process.env.SITE_BASE_URL ?? 'http://127.0.0.1:4174/omio-gen-ui-demo/'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/site-live-components.spec.ts',
  outputDir: './artifacts/browser-site',
  timeout: 30_000,
  expect: { timeout: 15_000 },
  use: {
    actionTimeout: 15_000,
    baseURL: siteBaseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  ...(process.env.SITE_BASE_URL ? {} : {
    webServer: {
      command: 'npm run build:site && npm run preview:site -- --strictPort',
      url: siteBaseURL,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  }),
})
