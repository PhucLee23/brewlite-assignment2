import { defineConfig, devices } from '@playwright/test';

// E2E-Txx chạy trên web, API và PostgreSQL thật cùng cổng VNPay giả (local bằng Docker Compose với
// tests/e2e/docker-compose.e2e.yml, CI dựng từng service).
export default defineConfig({
  testDir: './specs',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3000',
    locale: 'vi-VN',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Khổ điện thoại 375 px (NFR-08) trên Chromium (NFR-13)
    { name: 'mobile-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true } },
  ],
});
