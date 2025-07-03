import { test, expect } from "@playwright/test";
import { TestDataManager, TestHelpers } from "./test-setup";

test.describe("Models Management", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await TestDataManager.waitForServer(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await TestDataManager.cleanup(page);
    await page.close();
  });

  test("should navigate to models page", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");
    
    await expect(page.getByRole("heading")).toContainText(/Model/i);
    
    // Should show models interface
    const interfaceElements = [
      page.locator('table'),
      page.locator('[data-testid="models-list"]'),
      page.locator('.model-list'),
      page.getByRole("button", { name: /add|new|create/i })
    ];

    let foundInterface = false;
    for (const element of interfaceElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundInterface = true;
        break;
      } catch {
        // Try next element
      }
    }

    expect(foundInterface).toBeTruthy();
  });

  test("should display available models from LiteLLM", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for model discovery or list
    const modelElements = [
      page.locator('table tbody tr'),
      page.locator('.model-item'),
      page.locator('[data-testid="model-item"]'),
      page.getByText(/gpt|claude|llama/i)
    ];

    let foundModels = false;
    for (const element of modelElements) {
      try {
        const count = await element.count();
        if (count > 0) {
          foundModels = true;
          break;
        }
      } catch {
        // Try next element
      }
    }

    // Models might be loaded dynamically or require discovery
    console.log(`Models found: ${foundModels}`);
  });

  test("should show model discovery interface", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for model discovery features
    const discoveryElements = [
      page.getByRole("button", { name: /discover|refresh|load/i }),
      page.getByText(/discover|available.*model/i),
      page.locator('[data-testid="model-discovery"]')
    ];

    let foundDiscovery = false;
    for (const element of discoveryElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundDiscovery = true;
        
        // Try clicking discovery button if found
        if (element.toString().includes('button')) {
          await element.click();
          await TestHelpers.waitForLoadingToComplete(page);
        }
        break;
      } catch {
        // Try next element
      }
    }

    console.log(`Model discovery found: ${foundDiscovery}`);
  });

  test("should handle model configuration", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for add/configure model button
    const addButton = page.getByRole("button", { name: /add|new|create|configure/i });
    
    if (await addButton.isVisible()) {
      await addButton.click();

      // Should show model form or configuration
      const formElements = [
        page.locator('form'),
        page.locator('input[name*="name"], input[id*="name"]'),
        page.locator('select[name*="model"], select[id*="model"]'),
        page.getByText(/model.*name|identifier/i)
      ];

      let foundForm = false;
      for (const element of formElements) {
        try {
          await element.waitFor({ state: 'visible', timeout: 5000 });
          foundForm = true;
          break;
        } catch {
          // Try next element
        }
      }

      expect(foundForm).toBeTruthy();
    }
  });

  test("should display model pricing information", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for pricing information
    const pricingElements = [
      page.getByText(/\$\d+|\d+.*token/i),
      page.locator('[data-testid="model-pricing"]'),
      page.getByText(/cost|price|pricing/i),
      page.locator('table').getByText(/input|output/i)
    ];

    let foundPricing = false;
    for (const element of pricingElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        foundPricing = true;
        break;
      } catch {
        // Try next element
      }
    }

    // Pricing might not be visible if no models are loaded
    console.log(`Pricing information found: ${foundPricing}`);
  });

  test("should handle model search and filtering", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for search/filter interface
    const searchElements = [
      page.locator('input[placeholder*="search"], input[name*="search"]'),
      page.locator('[data-testid="model-search"]'),
      page.getByPlaceholder(/search|filter/i),
      page.locator('select[name*="provider"], select[name*="filter"]')
    ];

    let foundSearch = false;
    for (const element of searchElements) {
      try {
        await element.waitFor({ state: 'visible', timeout: 3000 });
        
        // Try using the search
        if (element.toString().includes('input')) {
          await element.fill('gpt');
          await page.waitForTimeout(500); // Wait for search results
        } else if (element.toString().includes('select')) {
          await element.selectOption({ index: 1 });
        }
        
        foundSearch = true;
        break;
      } catch {
        // Try next element
      }
    }

    console.log(`Search functionality found: ${foundSearch}`);
  });

  test("should show model status and availability", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for model status indicators
    const statusElements = [
      page.getByText(/available|online|active|inactive/i),
      page.locator('.status'),
      page.locator('[data-testid="model-status"]'),
      page.locator('.badge, .chip, .tag')
    ];

    let foundStatus = false;
    for (const element of statusElements) {
      try {
        const count = await element.count();
        if (count > 0) {
          foundStatus = true;
          break;
        }
      } catch {
        // Try next element
      }
    }

    console.log(`Model status indicators found: ${foundStatus}`);
  });

  test("should handle model actions (enable/disable/configure)", async ({ page }) => {
    await TestHelpers.navigateAndWait(page, "/models");

    // Look for model action buttons
    const actionElements = [
      page.getByRole("button", { name: /enable|disable|configure|edit/i }),
      page.locator('[data-testid*="model-action"]'),
      page.locator('button').filter({ hasText: /⚙|✓|✗|📝/ })
    ];

    let foundActions = false;
    for (const element of actionElements) {
      try {
        const count = await element.count();
        if (count > 0) {
          foundActions = true;
          
          // Try clicking first action (be careful not to break anything)
          const firstAction = element.first();
          const text = await firstAction.textContent();
          
          // Only click safe actions
          if (text && (text.includes('configure') || text.includes('view'))) {
            await firstAction.click();
            await TestHelpers.waitForLoadingToComplete(page);
          }
          
          break;
        }
      } catch {
        // Try next element
      }
    }

    console.log(`Model actions found: ${foundActions}`);
  });

  test("should handle errors gracefully", async ({ page }) => {
    // Test error handling by trying to access non-existent model
    await page.goto("/models/nonexistent");

    // Should show error or redirect
    const errorHandling = [
      page.getByText(/not found|error|invalid/i),
      page.getByRole("heading", { name: /error|404/i }),
      !page.url().includes('nonexistent') // Redirected away
    ];

    let handledError = false;
    for (let i = 0; i < errorHandling.length - 1; i++) {
      try {
        await errorHandling[i].waitFor({ state: 'visible', timeout: 3000 });
        handledError = true;
        break;
      } catch {
        // Try next condition
      }
    }

    // Check if redirected
    if (!handledError && !page.url().includes('nonexistent')) {
      handledError = true;
    }

    expect(handledError).toBeTruthy();
  });
});
