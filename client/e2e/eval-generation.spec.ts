import { test, expect } from "@playwright/test";

test.describe("Eval Generation Flow", () => {
  test.beforeAll(async (/* { browser } */) => {
    // Optional: Setup - Ensure at least one model exists before running these tests
    // This could involve calling an API setup endpoint or running a setup script
    console.log("Setup: Ensure a generator model exists via API/DB script...");
    // Example: await setupGeneratorModel();
  });

  test("should allow generating a new eval set", async ({ page }) => {
    // 1. Navigate to the generation page
    await page.goto("/evals/generate");
    await expect(
      page.getByRole("heading", { name: "Generate New Evaluation Set" })
    ).toBeVisible();

    // 2. Select a generator model (assuming one exists and is loaded)
    // Use a specific model name known to exist from setup
    const generatorModelName = "Test Gen Model"; // Replace with actual name from setup
    await page
      .locator('select[name="generatorModelId"]')
      .selectOption({ label: generatorModelName });

    // 3. Fill in the prompt
    const prompt = "Generate 3 simple math questions.";
    await page.locator('textarea[name="userPrompt"]').fill(prompt);

    // 4. Fill in the number of questions (optional, defaults to 10)
    await page.locator('input[name="numQuestions"]').fill("3");

    // 5. Fill optional name/description
    const evalName = `Test Eval ${Date.now()}`;
    await page.locator('input[name="evalName"]').fill(evalName);

    // 6. Submit the form
    await page.getByRole("button", { name: "Generate Eval Set" }).click();

    // 7. Assert: Navigate to the new eval's detail page
    //    (Check URL includes /evals/some-id and the name is visible)
    await expect(page).toHaveURL(/\/evals\/[a-zA-Z0-9]+/); // Check URL pattern
    await expect(page.getByRole("heading", { name: evalName })).toBeVisible();

    // Optional: Assert that some questions are displayed
    // This depends on the detail page structure
    // await expect(page.locator('ul > li')).toHaveCount(3);
  });
});
