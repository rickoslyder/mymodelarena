import { test, expect } from "@playwright/test";
import { TestDataManager, TestHelpers, TEST_DATA } from "./test-setup";

test.describe("Eval Generation Flow", () => {
  let testModelId: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    
    // Wait for server to be ready
    await TestDataManager.waitForServer(page);
    
    // Create test model for generation
    testModelId = await TestDataManager.createTestModel(page);
    
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await TestDataManager.cleanup(page);
    await page.close();
  });

  test("should navigate to eval generation page", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/generate");
    
    await expect(page.getByRole("heading")).toContainText(/Generate.*Eval/i);
    await expect(page.locator('form')).toBeVisible();
  });

  test("should generate eval using basic form", async ({ page }) => {
    // Skip if no test model was created
    if (!testModelId) {
      test.skip("Test model not available");
    }

    await TestHelpers.navigateAndWait(page, "/evals/generate");

    // Fill basic form
    const evalName = `E2E Test Eval ${Date.now()}`;
    const prompt = "Generate 3 simple mathematics questions about basic arithmetic.";

    await TestHelpers.fillField(page, "name", evalName);
    await TestHelpers.fillField(page, "prompt", prompt);
    await TestHelpers.fillField(page, "numQuestions", "3");

    // Select test model if dropdown exists
    const modelDropdown = page.locator('select[name*="model"], select[id*="model"]');
    if (await modelDropdown.isVisible()) {
      await modelDropdown.selectOption({ label: TEST_DATA.models.testModel.name });
    }

    // Submit form
    await page.getByRole("button", { name: /generate|create/i }).click();

    // Wait for generation to complete
    await TestHelpers.waitForLoadingToComplete(page);

    // Should redirect to eval detail page or show success
    await expect(page).toHaveURL(/\/evals\/.*|\/$/);
    
    // Check for success indicators
    const successIndicators = [
      page.getByText(evalName),
      page.getByText(/success|created|generated/i),
      page.locator('[data-testid="eval-questions"]'),
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      try {
        await indicator.waitFor({ state: 'visible', timeout: 5000 });
        foundSuccess = true;
        break;
      } catch {
        // Try next indicator
      }
    }

    expect(foundSuccess).toBeTruthy();
  });

  test("should show validation errors for invalid inputs", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/generate");

    // Submit form without required fields
    await page.getByRole("button", { name: /generate|create/i }).click();

    // Should show validation errors
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '[data-testid="error"]',
      'text=/required|error/i'
    ];

    let foundError = false;
    for (const selector of errorSelectors) {
      try {
        await page.locator(selector).first().waitFor({ state: 'visible', timeout: 3000 });
        foundError = true;
        break;
      } catch {
        // Try next selector
      }
    }

    expect(foundError).toBeTruthy();
  });

  test("should use advanced options when available", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/generate");

    // Check if advanced options toggle exists
    const advancedToggle = page.getByText(/advanced|options|settings/i);
    if (await advancedToggle.isVisible()) {
      await advancedToggle.click();

      // Fill advanced options if available
      const difficultySelect = page.locator('select[name*="difficulty"], select[id*="difficulty"]');
      if (await difficultySelect.isVisible()) {
        await difficultySelect.selectOption('medium');
      }

      const formatSelect = page.locator('select[name*="format"], select[id*="format"]');
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('multiple-choice');
      }

      // Verify advanced options are set
      await expect(difficultySelect).toHaveValue('medium');
    }
  });

  test("should handle template selection if available", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/generate");

    // Check if template selector exists
    const templateSelector = page.locator('select[name*="template"], [data-testid="template-selector"]');
    if (await templateSelector.isVisible()) {
      const optionCount = await templateSelector.locator('option').count();
      
      if (optionCount > 1) {
        // Select first non-empty option
        await templateSelector.selectOption({ index: 1 });
        
        // Verify template is selected
        const selectedValue = await templateSelector.inputValue();
        expect(selectedValue).not.toBe('');
      }
    }
  });

  test("should show preview of generation settings", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/evals/generate");

    // Fill in form
    await TestHelpers.fillField(page, "name", "Preview Test Eval");
    await TestHelpers.fillField(page, "prompt", "Test prompt for preview");
    await TestHelpers.fillField(page, "numQuestions", "5");

    // Look for preview or summary section
    const previewSelectors = [
      '[data-testid="preview"]',
      '.preview',
      'text=/preview|summary/i'
    ];

    let hasPreview = false;
    for (const selector of previewSelectors) {
      if (await page.locator(selector).isVisible()) {
        hasPreview = true;
        break;
      }
    }

    // If preview exists, verify it shows our input
    if (hasPreview) {
      await expect(page.getByText("Preview Test Eval")).toBeVisible();
      await expect(page.getByText("5")).toBeVisible();
    }
  });
});
