import { expect, test } from "@playwright/test";

test.describe("Legal pages", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("renders the privacy policy with deletion and payment disclosures", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Retention and deletion" })).toBeVisible();
    await expect(page.getByText(/processed by Stripe/i)).toBeVisible();
    await expect(page.getByText(/permanently delete your account/i)).toBeVisible();
  });

  test("renders terms with wellness and subscription boundaries", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Not medical or emergency care" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Subscriptions and cancellation" })).toBeVisible();
    await expect(page.getByText(/Foundation experience includes/i)).toBeVisible();
  });
});
