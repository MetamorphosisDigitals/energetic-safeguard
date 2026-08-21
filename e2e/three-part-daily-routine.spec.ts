import { expect, test } from "@playwright/test";

const routineKey = "energetic-safeguard:daily-routine:v1";

test.describe("Three-part Daily Routine", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true"));
    await page.goto("/");
  });

  test("lets a user choose morning, protection, and end-of-day rituals and launch one through the guarded flow", async ({ page }) => {
    await page.getByRole("button", { name: "Set up daily routine" }).click();
    const morning = page.locator(".daily-routine-slot", { hasText: "MORNING CHECK-IN" });
    const protection = page.locator(".daily-routine-slot", { hasText: "ENERGY PROTECTION" });
    const evening = page.locator(".daily-routine-slot", { hasText: "END-OF-DAY CLEANING" });
    await morning.getByRole("button", { name: /Feet, Breath, Intention/ }).click();
    await protection.getByRole("button", { name: /Pocket Anchor/ }).click();
    await evening.getByRole("button", { name: /End-of-Day Release/ }).click();
    await page.getByRole("button", { name: "Save my daily routine" }).click();

    const saved = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), routineKey);
    expect(saved.selectedPracticeIds).toEqual({ morning: "feet-breath-intention", protection: "pocket-anchor", evening: "end-of-day-release" });
    await page.getByRole("button", { name: "Open Morning Check-In" }).click();
    await expect(page.getByRole("heading", { name: "Feet, Breath, Intention" })).toBeVisible();
  });

  test("marks the 7-day milestone and celebrates the 21-day habit when the card is opened", async ({ page }) => {
    await page.evaluate((key) => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      window.localStorage.setItem(key, JSON.stringify({ selectedPracticeIds: { morning: "feet-breath-intention", protection: "pocket-anchor", evening: "end-of-day-release" }, openedDayCount: 6, lastOpenedDate: yesterday, lastCelebratedMilestone: null }));
    }, routineKey);
    await page.reload();
    await page.getByRole("button", { name: "Open daily routine" }).click();
    await expect(page.getByRole("heading", { name: "7 days of returning." })).toBeVisible();

    await page.evaluate((key) => {
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      window.localStorage.setItem(key, JSON.stringify({ selectedPracticeIds: { morning: "feet-breath-intention", protection: "pocket-anchor", evening: "end-of-day-release" }, openedDayCount: 20, lastOpenedDate: yesterday, lastCelebratedMilestone: 14 }));
    }, routineKey);
    await page.reload();
    await page.getByRole("button", { name: "Open daily routine" }).click();
    await expect(page.getByRole("heading", { name: "This rhythm is yours now." })).toBeVisible();
  });
});
