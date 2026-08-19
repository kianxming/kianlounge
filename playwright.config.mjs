import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  retries: 0,
  workers: 1,
  reporter: [['line']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 1000 }
  },
  projects: [
    { name: 'chrome-desktop', use: { ...devices['Desktop Chrome'], browserName:'chromium', channel:'chrome', viewport: { width: 1440, height: 1000 } } },
    { name: 'chrome-tablet', use: { ...devices['iPad Pro 11 landscape'], browserName:'chromium', channel:'chrome' } }
  ],
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 15_000
  }
});
