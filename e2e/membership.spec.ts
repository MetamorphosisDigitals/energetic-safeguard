import { expect, test } from "@playwright/test";

async function mockMembershipApi(page: Parameters<typeof test>[0] extends never ? never : any, plan: "free" | "plus") {
  await page.route("**/api/trpc/**", async (route: any) => {
    const endpoints = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const payloadFor = (endpoint: string) => {
      if (endpoint === "auth.me") return { id: 9, openId: "membership-browser-user", name: "Membership Browser User", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastSignedIn: "2026-09-09T10:00:00.000Z" };
      if (endpoint === "subscription.status") return { plan, offerKey: plan === "plus" ? "sanctuary_plus_annual" : null, status: plan === "plus" ? "active" : null, currentPeriodEnd: plan === "plus" ? "2027-09-09T00:00:00.000Z" : null, graceEndsAt: null, guidedRituals: true, safetyHandoffs: true, cloudContinuity: plan === "plus", advancedHabitTools: plan === "plus", isInGracePeriod: false };
      return null;
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(endpoints.map((endpoint: string) => ({ result: { data: { json: payloadFor(endpoint) } } }))) });
  });
}

test.describe("Free and Plus membership", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps Foundation and safety support explicitly free", async ({ page }) => {
    await mockMembershipApi(page, "free");
    await page.goto("/membership");
    await expect(page.getByRole("heading", { name: "Core support stays free. Plus adds continuity." })).toBeVisible();
    await expect(page.getByText("All 18 Foundation rituals")).toBeVisible();
    await expect(page.getByText("Safety handoffs")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose annual — $49/year" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose monthly — $6.99/month" })).toBeVisible();
  });

  test("shows subscription management for an active Plus member", async ({ page }) => {
    await mockMembershipApi(page, "plus");
    await page.goto("/membership");
    await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();
    await expect(page.getByText(/Your Plus membership is active/)).toBeVisible();
    await expect(page.getByText("Foundation rituals remain unrestricted")).toBeVisible();
  });
});
