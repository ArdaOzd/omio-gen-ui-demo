import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.TEST_WEB_PORT ?? 5193);
export default defineConfig({
  testDir: './tests/browser', outputDir: './artifacts/browser', timeout: 30_000,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: { command: `npm run frontend:dev -- --host 127.0.0.1 --port ${port} --strictPort`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false },
});
