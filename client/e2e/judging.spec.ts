import { test, expect } from "@playwright/test";

test.describe("Judge Mode Flow", () => {
  test.beforeAll(async () => {
    // Setup: Ensure an eval with questions exists
    console.log("Setup: Ensure eval with questions exists...");
  });

  test("should allow triggering judge mode", async ({ page }) => {
    const evalId = "test-eval-id-for-judging";
    const evalPageUrl = `/evals/${evalId}`;

    await page.goto(evalPageUrl);
    await expect(
      page.getByRole("heading", { name: /Untitled Eval|Test Eval/ })
    ).toBeVisible(); // Match default or test name

    // 1. Click the trigger button
    await page.getByRole("button", { name: "Judge Questions" }).click();

    // 2. Configure in modal
    await expect(
      page.getByRole("heading", { name: "Configure Judge Mode" })
    ).toBeVisible();
    await page.locator('input[type="checkbox"]').first().check();
    await expect(
      page.locator('textarea[name="judgingPrompt"]')
    ).not.toBeEmpty();

    // 3. Submit
    await page.getByRole("button", { name: "Start Judging" }).click();

    // 4. Assert: Modal closes and status message appears
    await expect(
      page.getByRole("heading", { name: "Configure Judge Mode" })
    ).not.toBeVisible();
    await expect(page.getByText(/Judge Mode initiated/)).toBeVisible();

    // Optional: Wait and check if results appear (needs async backend completion)
    // await expect(page.getByRole('heading', { name: 'Judge Results' })).toBeVisible({ timeout: 30000 });

    test.fixme(true, "Judge mode test needs setup and result assertions.");
  });
});
