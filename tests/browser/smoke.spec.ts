import { test, expect } from '@playwright/test';
test('existing travel search remains usable', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Travel/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Search/i }).first()).toBeVisible();
  console.info(`Chromium ${browser.version()}`);
});
