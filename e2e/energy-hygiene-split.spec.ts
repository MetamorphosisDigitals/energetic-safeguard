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
    await page.locator(".energy-hygiene-shortcut", { hasText: "Restore after an interaction" }).click();
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

  test("shows seven-day progress and marks today complete after the daily hygiene practice finishes", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    await expect(page.getByRole("heading", { name: "Day 1 of 7" })).toBeVisible();
    await expect(page.getByText("0 completed")).toBeVisible();
    await page.getByRole("button", { name: /Continue today/i }).click();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await page.getByRole("button", { name: /Begin practice/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /I completed this/i }).click();
    await page.getByRole("button", { name: "More grounded" }).click();

    await expect(page.getByText("1 completed")).toBeVisible();
    await expect(page.locator(".daily-hygiene-progress__day.is-complete").first()).toContainText("Day 1");
  });

  test("does not advance daily-hygiene progress after the user leaves that flow and completes an unrelated practice", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Continue today/i }).click();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await page.getByRole("button", { name: /Adjust answers/i }).click();
    await page.getByRole("button", { name: /Back/i }).click();

    await page.locator(".quick-reset-fab").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /I completed this/i }).click();
    await page.getByRole("button", { name: "More grounded" }).click();

    await expect(page.getByText("0 completed")).toBeVisible();
    await expect(page.locator(".daily-hygiene-progress__day.is-complete")).toHaveCount(0);
  });

  test("reorders saved shortcuts and restores their preferred order after reload", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    await page.getByRole("button", { name: "Move Daily energy hygiene earlier" }).click();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
    await page.reload();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
  });

  test("reorders saved shortcuts through direct drag and drop", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    const cards = page.locator(".energy-hygiene-shortcut-wrap");
    await cards.nth(1).dragTo(cards.nth(0));
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
    await page.reload();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
  });

  test("shows a visible drag state while a shortcut is being moved", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    const card = page.locator(".energy-hygiene-shortcut-wrap");
    await card.dispatchEvent("dragstart");
    await expect(card).toHaveClass(/is-dragging/);
    await card.dispatchEvent("dragend");
    await expect(card).not.toHaveClass(/is-dragging/);
  });

  test.describe("desktop shortcut ordering", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test("reorders shortcuts through keyboard activation of the move controls", async ({ page }) => {
      await page.getByRole("button", { name: /Restore after an interaction/i }).click();
      await page.getByRole("button", { name: "Save to home" }).click();
      await page.getByRole("button", { name: "Return to home" }).click();
      await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
      await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
      await page.getByRole("button", { name: "Save to home" }).click();
      await page.getByRole("button", { name: "Return to home" }).click();

      const control = page.getByRole("button", { name: "Move Restore after an interaction later" });
      await control.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
      const earlierControl = page.getByRole("button", { name: "Move Restore after an interaction earlier" });
      await earlierControl.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Restore after an interaction");
      await page.reload();
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Restore after an interaction");
    });
  });
});
