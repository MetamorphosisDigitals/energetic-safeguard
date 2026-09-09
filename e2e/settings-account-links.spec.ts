import { expect, test } from "@playwright/test";

test("Settings links to the live account and library instead of showing stale coming-soon copy", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(page.getByRole("heading", { name: "Profile, membership & saved support" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open account" })).toHaveAttribute("href", "/account");
  await expect(page.getByRole("button", { name: "Open your library" })).toBeVisible();
  await expect(page.getByText(/coming soon/i)).not.toBeVisible();
  await expect(page.getByText(/three free practices|current app lifetime|lifetime \+ future updates|\$19|\$39/i)).not.toBeVisible();
});
