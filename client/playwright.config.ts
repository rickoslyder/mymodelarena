import { defineConfig, devices } from "@playwright/test";

// Base URL for the running application (adjust port if needed)
const baseURL = "http://localhost:5173"; // Default Vite dev port

export default defineConfig({
  testDir: "./e2e", // Directory where tests live
  fullyParallel: true, // Run tests in parallel
  forbidOnly: !!process.env.CI, // Fail build on CI if accidentally left test.only
  retries: process.env.CI ? 2 : 0, // Retry on CI only
  workers: process.env.CI ? 1 : undefined, // Use defined workers on CI
  reporter: "html", // Generates HTML report
  use: {
    baseURL: baseURL,
    trace: "on-first-retry", // Record trace only when retrying a failed test
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
