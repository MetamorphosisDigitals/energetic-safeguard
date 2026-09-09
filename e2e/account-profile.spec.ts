import { expect, test } from "@playwright/test";

async function mockAccountApi(page: Parameters<typeof test>[0] extends never ? never : any, signedIn: boolean) {
  await page.route("**/api/trpc/**", async (route: any) => {
    const endpoints = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const payloadFor = (endpoint: string) => {
      if (endpoint === "auth.me") return signedIn ? { id: 9, openId: "account-browser-user", name: "Account Browser User", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastSignedIn: "2026-09-09T10:00:00.000Z" } : null;
      if (endpoint === "premium.status") return { hasAccess: false, offerKey: null };
      if (endpoint === "library.favorites") return signedIn ? [{ id: 1, userId: 9, practiceId: "transition-pause", createdAt: "2026-09-01T00:00:00.000Z" }] : [];
      if (endpoint === "library.history") return signedIn ? [{ id: 1, userId: 9, practiceId: "transition-pause", note: null, moodTag: null, intentionTag: null, customTags: null, completedAt: "2026-09-08T00:00:00.000Z" }] : [];
      if (endpoint === "routineHistory.summary") return { count: signedIn ? 2 : 0, lastBackupAt: null, latest: null };
      return null;
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(endpoints.map((endpoint: string) => ({ result: { data: { json: payloadFor(endpoint) } } }))) });
  });
}

test.describe("Account profile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("offers sign in when the account route is opened signed out", async ({ page }) => {
    await mockAccountApi(page, false);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("shows identity, membership and saved-data summary for a signed-in member", async ({ page }) => {
    await mockAccountApi(page, true);
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account Browser User" })).toBeVisible();
    await expect(page.getByText("member@example.com").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free membership" })).toBeVisible();
    await expect(page.getByText("1 saved rituals")).toBeVisible();
    await expect(page.getByText("1 recent practices")).toBeVisible();
    await expect(page.getByText("2 cloud routine backups")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
});
