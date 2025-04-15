import { test, expect } from "@playwright/test";

// Base URL is set in playwright.config.ts

test.describe("Model Management CRUD", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the models page before each test
    await page.goto("/models");
    // Wait for the page to load (e.g., wait for the heading)
    await expect(
      page.getByRole("heading", { name: "Configured Models" })
    ).toBeVisible();
    // Add delay or wait for network idle if needed, especially after actions
    await page.waitForTimeout(500); // Simple delay, replace with better waits
  });

  test("should allow adding a new model", async ({ page }) => {
    const uniqueModelName = `Test Model ${Date.now()}`;
    const baseUrl = "https://api.example.com/v1";
    const apiKeyVar = "EXAMPLE_API_KEY"; // Assume this exists on server .env
    const inputCost = "0.001";
    const outputCost = "0.002";

    // 1. Open the Add Model modal
    await page.getByRole("button", { name: "Add Model" }).click();
    await expect(
      page.getByRole("heading", { name: "Add New Model" })
    ).toBeVisible();

    // 2. Fill the form
    await page.getByLabel("Model Name").fill(uniqueModelName);
    await page.getByLabel("Base URL").fill(baseUrl);
    await page.getByLabel("API Key Environment Variable Name").fill(apiKeyVar);
    await page.getByLabel("Input Token Cost").fill(inputCost);
    await page.getByLabel("Output Token Cost").fill(outputCost);

    // 3. Submit the form
    await page.getByRole("button", { name: "Create Model" }).click();

    // 4. Assert: Modal closes and the new model appears in the list
    await expect(
      page.getByRole("heading", { name: "Add New Model" })
    ).not.toBeVisible();
    await expect(page.getByText(uniqueModelName)).toBeVisible();
    // Check for part of the URL as well
    await expect(page.getByText(/api\.example\.com/)).toBeVisible();
  });

  // Add tests for Edit and Delete later after those features are fully implemented
  test("should allow editing an existing model", async ({ page }) => {
    // TODO:
    // 1. Ensure a model exists (either create one or assume one exists)
    // 2. Find the edit button for that model
    // 3. Click edit
    // 4. Verify modal opens with correct data
    // 5. Change a field (e.g., name)
    // 6. Submit
    // 7. Assert modal closes and updated name is visible
    test.skip(true, "Edit test not implemented yet");
  });

  test("should allow deleting a model", async ({ page }) => {
    // TODO:
    // 1. Ensure a model exists (create one specifically for this test)
    // 2. Find the delete button for that model
    // 3. Click delete
    // 4. Confirm deletion in the confirmation modal
    // 5. Assert the model is removed from the list
    test.skip(true, "Delete test not implemented yet");
  });
});
