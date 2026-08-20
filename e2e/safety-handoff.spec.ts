import { expect, test } from "@playwright/test";

test.describe("Safety handoff", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
      window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 0 }));
    });
  });

  test("routes an unsafe intake message into the safety handoff before a recommendation can render", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Find support for right now/i }).click();
    await expect(page.getByRole("heading", { name: "What is asking for support right now?" })).toBeVisible();

    await page.getByPlaceholder("Only share what feels comfortable.").fill("I feel unsafe and need immediate support.");
    await page.getByRole("button", { name: /^Continue/i }).click();

    await expect(page.getByText("PAUSE HERE")).toBeVisible();
    await expect(page.getByRole("heading", { name: "You can stop this practice." })).toBeVisible();
    await expect(page.getByText(/cannot assess what you need in an emergency/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /TODAY’S RECOMMENDATION/i })).not.toBeVisible();

    await page.getByRole("button", { name: /Try a one-minute orientation/i }).click();
    await expect(page.getByText("One-Minute Support")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Look" })).toBeVisible();
    await expect(page.getByRole("button", { name: /I feel more overwhelmed/i })).toBeVisible();
  });
});
