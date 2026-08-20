import { expect, test } from "@playwright/test";

test("keeps guided practice access open after the former three-practice threshold", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
    window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 3 }));
  });
  await page.goto("/");

  await page.getByRole("button", { name: /Find support for right now/i }).click();
  await expect(page.getByRole("heading", { name: "What is asking for support right now?" })).toBeVisible();

  await page.getByRole("button", { name: "I feel scattered" }).click();
  await page.getByRole("button", { name: /^Continue/i }).click();
  await page.getByRole("button", { name: /^Continue/i }).click();
  await page.getByRole("button", { name: /Find my practice/i }).click();

  await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
  await expect(page.getByText(/three free practices|lifetime access|\$19|\$39/i)).not.toBeVisible();
});
