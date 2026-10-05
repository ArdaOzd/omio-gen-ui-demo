import { defineConfig } from 'vitest/config';
export default defineConfig({ resolve: { alias: {
  '@': new URL('./src', import.meta.url).pathname,
} }, test: {
  include: ['src/**/*.test.{ts,tsx}', 'agent/**/*.test.ts'],
  environment: 'jsdom', setupFiles: ['src/generative/testing/setup.ts'],
  restoreMocks: true,
} });
