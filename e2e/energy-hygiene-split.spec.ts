import { expect, test } from "@playwright/test";

test.describe("Energy hygiene split", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
      window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 0 }));
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await expect(page.getByRole("heading", { name: "What kind of energy care would support you now?" })).toBeVisible();
  });

  test("routes after-interaction restoration to its canonical transition ritual", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();

    await expect(page.getByRole("heading", { name: "Let the interaction end with the interaction." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Begin a restoration reset/i })).toBeVisible();
    await page.getByRole("button", { name: /Begin a restoration reset/i }).click();

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transition Pause" })).toBeVisible();
  });

  test("routes daily hygiene to its canonical energy-conservation ritual", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();

    await expect(page.getByRole("heading", { name: "Care for your capacity before the day spends it." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Begin today’s capacity check/i })).toBeVisible();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Energy Conservation Pause" })).toBeVisible();
  });

  test("saves a restoration route as a home shortcut and opens its dedicated screen", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await expect(page.getByRole("button", { name: "Remove home shortcut" })).toBeVisible();

    await page.getByRole("button", { name: "Return to home" }).click();
    await expect(page.getByText("SAVED ENERGY HYGIENE")).toBeVisible();
    await page.getByRole("button", { name: /Restore after an interaction/i }).last().click();
    await expect(page.getByRole("heading", { name: "Let the interaction end with the interaction." })).toBeVisible();
  });

  test("starts a private seven-day reminder and lets the user defer it for today", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await expect(page.getByRole("button", { name: "End seven-day reminder" })).toBeVisible();

    await page.getByRole("button", { name: "Return to home" }).click();
    await expect(page.getByRole("heading", { name: "Would a small capacity check support you today?" })).toBeVisible();
    await page.getByRole("button", { name: "Not today" }).click();
    await expect(page.getByRole("heading", { name: "Would a small capacity check support you today?" })).not.toBeVisible();
  });
});
