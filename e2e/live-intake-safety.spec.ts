import { expect, test, type Page } from "@playwright/test";

async function openResetIntake(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /Find support for right now/i }).click();
  await page.getByPlaceholder("Only share what feels comfortable.").fill("I feel scattered and need a reset.");
  await page.getByRole("button", { name: /^Continue/i }).click();
}

async function setIntensity(page: Page, intensity: number) {
  const range = page.locator(".range-input");
  const currentIntensity = Number(await range.inputValue());
  await range.focus();
  for (let value = currentIntensity; value < intensity; value += 1) await range.press("ArrowRight");
}

async function finishIntake(page: Page) {
  await page.getByRole("button", { name: /^Continue/i }).click();
  await page.getByRole("button", { name: /Find my practice/i }).click();
}

test.describe("Live safety-aware intake", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
      window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 0 }));
    });
  });

  test("shows a standard recommendation after the complete intake", async ({ page }) => {
    await openResetIntake(page);
    await finishIntake(page);

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByText("PAUSE HERE")).not.toBeVisible();
  });

  test("keeps high-intensity requests in the constrained recommendation path", async ({ page }) => {
    await openResetIntake(page);
    await setIntensity(page, 8);
    await finishIntake(page);

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByText("PAUSE HERE")).not.toBeVisible();
  });

  test("selects the transit-safe recommendation from the live transit setting", async ({ page }) => {
    await openResetIntake(page);
    await page.getByRole("button", { name: "transit" }).click();
    await finishIntake(page);

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discreet Sensory Reset" })).toBeVisible();
    await expect(page.getByText("PAUSE HERE")).not.toBeVisible();
  });

  test("hands off very-high-intensity requests before a recommendation renders", async ({ page }) => {
    await openResetIntake(page);
    await setIntensity(page, 9);
    await page.getByRole("button", { name: /^Continue/i }).click();

    await expect(page.getByText("PAUSE HERE")).toBeVisible();
    await expect(page.getByRole("heading", { name: "You do not need to push through this." })).toBeVisible();
    await expect(page.getByText("TODAY’S RECOMMENDATION")).not.toBeVisible();
  });
});
