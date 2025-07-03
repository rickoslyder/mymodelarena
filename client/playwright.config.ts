import { defineConfig, devices } from "@playwright/test";

// Base URL for the running application (adjust port if needed)
const baseURL = "http://localhost:5173"; // Default Vite dev port

export default defineConfig({
  testDir: "./e2e", // Directory where tests live
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI, // Fail build on CI if accidentally left test.only
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: process.env.CI ? 1 : 1, // Use single worker to avoid conflicts
  reporter: [["html"], ["list"]], // Generates HTML report and list output
  timeout: 30000, // 30 second timeout
  expect: {
    timeout: 10000, // 10 second timeout for assertions
  },
  use: {
    baseURL: baseURL,
    trace: "on-first-retry", // Record trace only when retrying a failed test
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    /* Add other browsers if needed
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    }, */
  ],
  // Optional: Run dev server before starting tests
  // webServer: {
  //   command: 'npm run dev', // Command to start client dev server
  //   url: baseURL,
  //   reuseExistingServer: !process.env.CI,
  //   cwd: '.', // Run command from client directory root
  // },
});
