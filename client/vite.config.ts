/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts", // Setup file for jest-dom matchers
    css: true, // Enable CSS processing (esp. for CSS Modules)
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/e2e/**', // Exclude E2E tests from Vitest
      '**/*.e2e.*',
      '**/*.spec.ts', // Exclude Playwright specs
    ],
  },
});
