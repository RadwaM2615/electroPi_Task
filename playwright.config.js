// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const { baseURL, port } = require('./config/electroPi.config');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI-only retries so flakiness is surfaced locally instead of hidden
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ...(process.env.CI ? [/** @type {const} */ (['junit', { outputFile: 'results/playwright-junit.xml' }])] : []),
  ],
  use: {
    baseURL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Starts the mock app, unless ELECTROPI_BASE_URL points at a running environment
  webServer: process.env.ELECTROPI_BASE_URL
    ? undefined
    : {
      command: 'node mock-app/server.js',
      url: `${baseURL}/health`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_PORT: port },
    },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
