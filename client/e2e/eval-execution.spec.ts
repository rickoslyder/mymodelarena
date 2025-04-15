import { test, expect } from "@playwright/test";

test.describe("Eval Execution Flow", () => {
  test.beforeAll(async () => {
    // Setup: Ensure a model and an eval with questions exist
    console.log("Setup: Ensure model and eval exist...");
  });

  test("should configure and run an eval, then view results", async ({
    page,
  }) => {
    const evalId = "test-eval-id"; // Replace with actual ID from setup
    const runPageUrl = `/evals/${evalId}/run`;
    const modelToRun = "Test Model Name"; // Replace with actual name

    // 1. Navigate to the run configuration page
    await page.goto(runPageUrl);
    await expect(
      page.getByRole("heading", { name: "Run Evaluation" })
    ).toBeVisible();

    // 2. Select target model(s)
    await page.getByLabel(modelToRun).check();

    // 3. Start the run
    await page.getByRole("button", { name: "Start Run" }).click();

    // 4. Assert: Progress/Results are shown
    // Wait for the results table to appear (assuming it has a specific role or title)
    await expect(
      page.getByRole("heading", { name: /Results for Eval:/ })
    ).toBeVisible({ timeout: 30000 }); // Extend timeout for run

    // 5. Assert: Check for expected content in the results table
    // (e.g., question text, model name column, response text/error)
    await expect(page.getByRole("table")).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: modelToRun })
    ).toBeVisible();
    // Add more specific checks based on expected output
    // await expect(page.getByText('Expected Question Text')).toBeVisible();

    test.fixme(
      true,
      "Eval execution test needs refinement based on actual implementation and setup data."
    );
  });
});
