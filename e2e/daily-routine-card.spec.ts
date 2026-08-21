import { expect, test } from "@playwright/test";

test.describe("Daily Routine dashboard card", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
      window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 0 }));
    });
    await page.goto("/");
  });

  test("is always visible and opens Daily Routine setup in one tap", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "A small ritual for your energy." })).toBeVisible();
    await page.getByRole("button", { name: "Set up daily routine" }).click();
    await expect(page.getByRole("heading", { name: "Care for your capacity before the day spends it." })).toBeVisible();
  });

  test("opens an active daily plan from the card", async ({ page }) => {
    await page.getByRole("button", { name: "Set up daily routine" }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: "Open daily routine" }).click();
    await expect(page.getByRole("heading", { name: "Care for your capacity before the day spends it." })).toBeVisible();
  });
});
