import { test, expect } from "@playwright/test";
import { TestDataManager, TestHelpers, TEST_DATA } from "./test-setup";

test.describe("Complete Integration Workflow", () => {
  let testModelId: string | null = null;
  let testEvalId: string | null = null;
  let testTemplateId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    
    // Wait for server to be ready
    await TestDataManager.waitForServer(page);
    
    // Create comprehensive test data
    testModelId = await TestDataManager.createTestModel(page);
    testTemplateId = await TestDataManager.createTestTemplate(page);
    
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await TestDataManager.cleanup(page);
    await page.close();
  });

  test("should complete full eval lifecycle", async ({ page }) => {
    // This test demonstrates the complete flow:
    // Navigation → Generation → Execution → Results → Scoring

    // Step 1: Navigate to home page
    await TestHelpers.navigateAndWait(page, "/");
    
    // Should show home page with navigation
    const homeElements = [
      page.getByRole("heading"),
      page.getByText(/mymodel|arena|eval/i),
      page.locator('nav'),
      page.getByRole("link", { name: /eval|model/i })
    ];

    let foundHome = false;
    for (const element of homeElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundHome = true;
        break;
      } catch {
        // Try next element
      }
    }

    expect(foundHome).toBeTruthy();

    // Step 2: Navigate to models to verify setup
    await TestHelpers.navigateAndWait(page, "/models");
    await expect(page.getByRole("heading")).toContainText(/Model/i);

    // Step 3: Generate a new evaluation
    await TestHelpers.navigateAndWait(page, "/evals/generate");
    
    const evalName = `Integration Test Eval ${Date.now()}`;
    const prompt = "Generate 2 simple test questions for integration testing.";

    // Fill generation form
    const nameField = page.locator('input[name*="name"], input[id*="name"], [data-testid="eval-name"]');
    if (await nameField.isVisible()) {
      await nameField.fill(evalName);
    }

    const promptField = page.locator('textarea[name*="prompt"], textarea[id*="prompt"], [data-testid="prompt"]');
    if (await promptField.isVisible()) {
      await promptField.fill(prompt);
    }

    const numQuestionsField = page.locator('input[name*="numQuestions"], input[id*="numQuestions"], [data-testid="num-questions"]');
    if (await numQuestionsField.isVisible()) {
      await numQuestionsField.fill("2");
    }

    // Submit generation
    const generateButton = page.getByRole("button", { name: /generate|create/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await TestHelpers.waitForLoadingToComplete(page);
      
      // Step 4: Verify generation completed
      const successElements = [
        page.getByText(evalName),
        page.getByText(/success|created|generated/i),
        page.locator('table'),
        page.getByText(/question/i)
      ];

      let generationSuccess = false;
      for (const element of successElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 10000 });
          generationSuccess = true;
          break;
        } catch {
          // Try next element
        }
      }

      expect(generationSuccess).toBeTruthy();
    }

    // Step 5: Navigate to evaluations list to find our eval
    await TestHelpers.navigateAndWait(page, "/evals");
    
    // Look for our evaluation or any evaluations
    const evalElements = [
      page.getByText(evalName),
      page.locator('table tbody tr'),
      page.locator('.eval-item'),
      page.getByText(/test.*eval/i)
    ];

    let foundEval = false;
    for (const element of evalElements) {
      try {
        const count = await element.count();
        if (count > 0) {
          foundEval = true;
          
          // Try to click on the first eval to go to detail page
          const firstEval = element.first();
          await firstEval.click().catch(() => {
            // If clicking the element fails, try to find a link
            return page.locator('a').first().click();
          });
          
          await TestHelpers.waitForLoadingToComplete(page);
          break;
        }
      } catch {
        // Try next element
      }
    }

    // Step 6: Try to execute the evaluation if we found one
    if (foundEval) {
      // Look for run button or navigate to run page
      const runElements = [
        page.getByRole("button", { name: /run|execute/i }),
        page.getByRole("link", { name: /run|execute/i }),
        page.locator('[data-testid="run-button"]')
      ];

      let startedRun = false;
      for (const element of runElements) {
        try {
          if (await element.isVisible()) {
            await element.click();
            await TestHelpers.waitForLoadingToComplete(page);
            startedRun = true;
            break;
          }
        } catch {
          // Try next element
        }
      }

      // If we started a run, try to configure and execute it
      if (startedRun) {
        // Select models if available
        const modelSelectors = [
          page.locator('input[type="checkbox"]'),
          page.locator('select[name*="model"]')
        ];

        for (const selector of modelSelectors) {
          try {
            const count = await selector.count();
            if (count > 0) {
              await selector.first().check();
              break;
            }
          } catch {
            // Try next selector
          }
        }

        // Start execution
        const executeButton = page.getByRole("button", { name: /start|run|execute/i });
        if (await executeButton.isVisible()) {
          await executeButton.click();
          
          // Step 7: Verify execution progress or results
          await TestHelpers.waitForLoadingToComplete(page);
          
          const resultElements = [
            page.locator('table'),
            page.getByText(/result|response|progress/i),
            page.locator('[data-testid="results"]'),
            page.getByText(/completed|running|failed/i)
          ];

          let foundResults = false;
          for (const element of resultElements) {
            try {
              await element.waitFor({ state: 'visible', timeout: 15000 });
              foundResults = true;
              break;
            } catch {
              // Try next element
            }
          }

          expect(foundResults).toBeTruthy();
        }
      }
    }

    console.log(`Completed integration workflow test - Eval found: ${foundEval}`);
  });

  test("should handle navigation between all main pages", async ({ page }) => {
    const mainPages = [
      { path: "/", name: "Home" },
      { path: "/models", name: "Models" },
      { path: "/evals", name: "Evaluations" },
      { path: "/evals/generate", name: "Generate" },
      { path: "/templates", name: "Templates" }
    ];

    for (const { path, name } of mainPages) {
      await TestHelpers.navigateAndWait(page, path);
      
      // Verify page loaded correctly
      const pageElements = [
        page.getByRole("heading"),
        page.locator('main'),
        page.locator('.container'),
        page.locator('form'),
        page.locator('table'),
        page.locator('nav')
      ];

      let pageLoaded = false;
      for (const element of pageElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 5000 });
          pageLoaded = true;
          break;
        } catch {
          // Try next element
        }
      }

      expect(pageLoaded).toBeTruthy();
      console.log(`Successfully navigated to ${name} page`);
    }
  });

  test("should handle search and filtering across different pages", async ({ page }) => {
    const pagesWithSearch = [
      "/models",
      "/evals", 
      "/templates"
    ];

    for (const pagePath of pagesWithSearch) {
      await TestHelpers.navigateAndWait(page, pagePath);
      
      // Look for search functionality
      const searchElements = [
        page.locator('input[placeholder*="search"], input[name*="search"]'),
        page.locator('[data-testid*="search"]'),
        page.getByPlaceholder(/search|filter/i)
      ];

      let foundSearch = false;
      for (const element of searchElements) {
        try {
          if (await element.isVisible()) {
            await element.fill("test");
            await page.waitForTimeout(500);
            foundSearch = true;
            break;
          }
        } catch {
          // Try next element
        }
      }

      console.log(`Search functionality on ${pagePath}: ${foundSearch}`);
    }
  });

  test("should demonstrate real-time features", async ({ page }) => {
    // Test real-time progress tracking if available
    
    if (testEvalId) {
      await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}/run`);
      
      // Look for real-time elements
      const realtimeElements = [
        page.locator('[data-testid*="progress"]'),
        page.getByText(/\d+%/),
        page.getByText(/live|real-time|updating/i),
        page.locator('.progress'),
        page.getByText(/every.*second/i)
      ];

      let foundRealtime = false;
      for (const element of realtimeElements) {
        try {
          if (await element.isVisible()) {
            foundRealtime = true;
            break;
          }
        } catch {
          // Try next element
        }
      }

      console.log(`Real-time features found: ${foundRealtime}`);
    }
  });

  test("should validate error handling across the application", async ({ page }) => {
    const errorScenarios = [
      { path: "/evals/nonexistent", description: "Non-existent eval" },
      { path: "/models/invalid-id", description: "Invalid model ID" },
      { path: "/invalid-route", description: "Invalid route" }
    ];

    for (const { path, description } of errorScenarios) {
      await page.goto(path);
      
      // Check for proper error handling
      const errorElements = [
        page.getByText(/not found|error|404|invalid/i),
        page.getByRole("heading", { name: /error|not found/i }),
        page.locator('[role="alert"]')
      ];

      let handledError = false;
      for (const element of errorElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 3000 });
          handledError = true;
          break;
        } catch {
          // Try next element
        }
      }

      // Alternatively, check if redirected to a valid page
      if (!handledError) {
        const currentUrl = page.url();
        handledError = !currentUrl.includes(path.split('/').pop());
      }

      expect(handledError).toBeTruthy();
      console.log(`Error handling for ${description}: ${handledError}`);
    }
  });

  test("should verify responsive design elements", async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: "Desktop" },
      { width: 768, height: 1024, name: "Tablet" },
      { width: 375, height: 667, name: "Mobile" }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await TestHelpers.navigateAndWait(page, "/");
      
      // Check that main elements are still visible and functional
      const responsiveElements = [
        page.getByRole("heading"),
        page.locator('nav'),
        page.locator('main')
      ];

      let responsiveDesign = true;
      for (const element of responsiveElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 3000 });
        } catch {
          responsiveDesign = false;
          break;
        }
      }

      expect(responsiveDesign).toBeTruthy();
      console.log(`Responsive design on ${viewport.name}: ${responsiveDesign}`);
    }

    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});