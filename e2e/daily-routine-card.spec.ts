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
    await expect(page.getByRole("heading", { name: "Three small returns to yourself." })).toBeVisible();
    await page.getByRole("button", { name: "Set up daily routine" }).click();
    await expect(page.getByRole("heading", { name: "Choose your three gentle rituals." })).toBeVisible();
  });

  test("opens an active three-part routine from the card", async ({ page }) => {
    await page.evaluate(() => window.localStorage.setItem("energetic-safeguard:daily-routine:v1", JSON.stringify({ selectedPracticeIds: { morning: "feet-breath-intention", protection: "pocket-anchor", evening: "end-of-day-release" }, openedDayCount: 2, lastOpenedDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10), lastCelebratedMilestone: null })));
    await page.reload();
    await page.getByRole("button", { name: "Open daily routine" }).click();
    await expect(page.getByRole("heading", { name: "Choose your three gentle rituals." })).toBeVisible();
  });
});
