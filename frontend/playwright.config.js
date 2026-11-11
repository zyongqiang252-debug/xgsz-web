import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:18080', channel: 'msedge', headless: true },
  webServer: { command: 'node scripts/test-server.mjs', url: 'http://127.0.0.1:18080/api/health', reuseExistingServer: false, timeout:60000 },
});
