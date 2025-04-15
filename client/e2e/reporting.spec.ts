import { test, expect } from "@playwright/test";

test.describe("Reporting Page", () => {
  test("should display leaderboard and cost report tables", async ({
    page,
  }) => {
    await page.goto("/reporting");

    // Check for headings
    await expect(
      page.getByRole("heading", { name: "Reporting & Analysis" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Model Leaderboard" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Cost Report (by Model)" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Token Usage (by Model)" })
    ).toBeVisible();

    // Check for tables (assuming they have role="table" or identifiable structure)
    // Wait for potential data loading
    await expect(page.getByRole("table").nth(0)).toBeVisible({
      timeout: 10000,
    }); // Leaderboard table
    await expect(page.getByRole("table").nth(1)).toBeVisible({
      timeout: 10000,
    }); // Cost report table

    // Check for chart container (assuming it renders something)
    // Use a more specific selector if possible
    await expect(page.locator(".recharts-responsive-container")).toBeVisible();

    // Optional: Add more specific checks for table content if needed
    // await expect(page.getByRole('cell', { name: 'Model A' })).toBeVisible();

    test.fixme(true, "Reporting test needs validation of actual data.");
  });
});
