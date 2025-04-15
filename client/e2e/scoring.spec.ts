import { test, expect } from "@playwright/test";

test.describe("Response Scoring Flow", () => {
  test.beforeAll(async () => {
    // Setup: Ensure a completed eval run with responses exists
    console.log("Setup: Ensure completed eval run exists...");
  });

  test("should allow manual scoring of a response", async ({ page }) => {
    const evalId = "test-eval-id-for-scoring";
    const runId = "test-run-id-for-scoring";
    const runPageUrl = `/evals/${evalId}/run/${runId}`; // Assume results view is part of run page or separate

    await page.goto(runPageUrl);
    await expect(
      page.getByRole("heading", { name: /Results for Eval:/ })
    ).toBeVisible();

    // TODO: Refine locator strategy
    // Find the first response row/cell (needs stable selectors)
    const firstResponseCell = page.locator("tbody tr:first-child td").nth(1); // Example: second cell in first row

    // Find the score button (e.g., button with text '3') within that cell
    const scoreButton = firstResponseCell.getByRole("button", { name: "3" });
    await expect(scoreButton).toBeVisible();

    // Click the score button
    await scoreButton.click();

    // Assert: The button becomes active (or score is displayed)
    await expect(scoreButton).toHaveClass(/active/); // Check for active class
    // Or check if an updated score display appears

    test.fixme(true, "Scoring test needs robust selectors and assertions.");
  });

  test("should allow triggering LLM scoring", async ({ page }) => {
    const evalId = "test-eval-id-for-llm-score";
    const runId = "test-run-id-for-llm-score";
    const runPageUrl = `/evals/${evalId}/run/${runId}`;

    await page.goto(runPageUrl);
    await expect(
      page.getByRole("heading", { name: /Results for Eval:/ })
    ).toBeVisible();

    // 1. Click the trigger button
    await page
      .getByRole("button", { name: "Score Responses with LLM" })
      .click();

    // 2. Configure in modal (select model, check prompt)
    await expect(
      page.getByRole("heading", { name: "Configure LLM Scoring" })
    ).toBeVisible();
    await page
      .locator('select[name="scorerModelId"]')
      .selectOption({ index: 1 }); // Select first available model
    await expect(
      page.locator('textarea[name="scoringPrompt"]')
    ).not.toBeEmpty();

    // 3. Submit
    await page.getByRole("button", { name: "Start LLM Scoring" }).click();

    // 4. Assert: Modal closes and status message appears
    await expect(
      page.getByRole("heading", { name: "Configure LLM Scoring" })
    ).not.toBeVisible();
    await expect(page.getByText(/LLM scoring initiated/)).toBeVisible();

    test.fixme(true, "LLM scoring test needs setup and better assertions.");
  });
});
