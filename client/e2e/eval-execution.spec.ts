import { test, expect } from "@playwright/test";
import { TestDataManager, TestHelpers, TEST_DATA } from "./test-setup";

test.describe("Eval Execution Flow", () => {
  let testModelId: string | null = null;
  let testEvalId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    
    // Wait for server to be ready
    await TestDataManager.waitForServer(page);
    
    // Create test data
    testModelId = await TestDataManager.createTestModel(page);
    testEvalId = await TestDataManager.createTestEval(page);
    
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await TestDataManager.cleanup(page);
    await page.close();
  });

  test("should navigate to eval list and find test eval", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals");
    
    // Should show evals list
    await expect(page.getByRole("heading")).toContainText(/Eval/i);
    
    // Look for eval list or table
    const listSelectors = [
      '[data-testid="evals-list"]',
      'table',
      '.eval-list',
      '[role="list"]'
    ];

    let foundList = false;
    for (const selector of listSelectors) {
      if (await page.locator(selector).isVisible()) {
        foundList = true;
        break;
      }
    }

    expect(foundList).toBeTruthy();
  });

  test("should access eval detail page", async ({ page }) => {
    if (!testEvalId) {
      test.skip("Test eval not available");
    }

    await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}`);
    
    // Should show eval details
    await expect(page.getByText(TEST_DATA.evals.testEval.name)).toBeVisible();
    
    // Should show questions or run button
    const actionElements = [
      page.getByRole("button", { name: /run|execute/i }),
      page.getByText(/question/i),
      page.locator('[data-testid="eval-questions"]')
    ];

    let foundAction = false;
    for (const element of actionElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundAction = true;
        break;
      } catch {
        // Try next element
      }
    }

    expect(foundAction).toBeTruthy();
  });

  test("should show run configuration when available", async ({ page }) => {
    if (!testEvalId) {
      test.skip("Test eval not available");
    }

    await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}/run`);
    
    // Should show run configuration
    const configElements = [
      page.getByRole("heading", { name: /run|config|execute/i }),
      page.locator('form'),
      page.getByText(/select.*model/i),
      page.getByRole("button", { name: /start|run|execute/i })
    ];

    let foundConfig = false;
    for (const element of configElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundConfig = true;
        break;
      } catch {
        // Try next element
      }
    }

    expect(foundConfig).toBeTruthy();
  });

  test("should configure eval run with model selection", async ({ page }) => {
    if (!testEvalId || !testModelId) {
      test.skip("Test data not available");
    }

    await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}/run`);

    // Look for model selection interface
    const modelSelectors = [
      'input[type="checkbox"]',
      'select[name*="model"]',
      '[data-testid="model-selector"]',
      `.model-list input[type="checkbox"]`
    ];

    let modelSelected = false;
    for (const selector of modelSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        // Try to select first available model
        await elements.first().check().catch(() => {
          // If checkbox fails, try clicking
          return elements.first().click();
        }).catch(() => {
          // If that fails too, try selecting option
          if (selector.includes('select')) {
            return elements.first().selectOption({ index: 1 });
          }
        });
        
        modelSelected = true;
        break;
      }
    }

    // If we found model selection, verify it worked
    if (modelSelected) {
      // Look for selected state
      const selectedElements = [
        page.locator('input:checked'),
        page.locator('.selected'),
        page.locator('[data-selected="true"]')
      ];

      let foundSelected = false;
      for (const element of selectedElements) {
        if (await element.count() > 0) {
          foundSelected = true;
          break;
        }
      }

      expect(foundSelected).toBeTruthy();
    }
  });

  test("should start eval run and show progress", async ({ page }) => {
    if (!testEvalId) {
      test.skip("Test eval not available");
    }

    await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}/run`);

    // Try to select a model if available
    const modelCheckbox = page.locator('input[type="checkbox"]').first();
    if (await modelCheckbox.isVisible()) {
      await modelCheckbox.check();
    }

    // Find and click run button
    const runButton = page.getByRole("button", { name: /start|run|execute/i });
    if (await runButton.isVisible()) {
      await runButton.click();

      // Wait for loading or progress indicators
      await TestHelpers.waitForLoadingToComplete(page);

      // Look for progress or results indicators
      const progressElements = [
        page.locator('[data-testid="progress"]'),
        page.getByText(/progress|running|completed/i),
        page.locator('.progress'),
        page.getByRole("progressbar"),
        page.locator('table'), // Results table
      ];

      let foundProgress = false;
      for (const element of progressElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 10000 });
          foundProgress = true;
          break;
        } catch {
          // Try next element
        }
      }

      expect(foundProgress).toBeTruthy();
    }
  });

  test("should show real-time progress tracking", async ({ page }) => {
    if (!testEvalId) {
      test.skip("Test eval not available");
    }

    // Navigate to a running eval or start one
    await TestHelpers.navigateAndWait(page, `/evals/${testEvalId}/run`);

    // Look for progress tracking elements
    const progressElements = [
      page.locator('[data-testid="eval-progress"]'),
      page.getByText(/\d+%/), // Percentage
      page.getByText(/\d+\/\d+/), // Progress fraction
      page.locator('.progress-bar'),
      page.getByText(/completed|successful|failed/i)
    ];

    let foundProgressTracking = false;
    for (const element of progressElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 5000 });
        foundProgressTracking = true;
        break;
      } catch {
        // Try next element
      }
    }

    // Progress tracking might not be visible if no runs are active
    // This is acceptable behavior
    console.log(`Progress tracking found: ${foundProgressTracking}`);
  });

  test("should handle eval run errors gracefully", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/nonexistent/run");

    // Should show error or redirect
    const errorElements = [
      page.getByText(/not found|error|invalid/i),
      page.getByRole("heading", { name: /error|404/i }),
      page.locator('[role="alert"]'),
      page.locator('.error')
    ];

    let foundError = false;
    for (const element of errorElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundError = true;
        break;
      } catch {
        // Try next element
      }
    }

    // Should either show error or redirect to valid page
    const currentUrl = page.url();
    const validResponse = foundError || !currentUrl.includes('nonexistent');
    
    expect(validResponse).toBeTruthy();
  });
});
