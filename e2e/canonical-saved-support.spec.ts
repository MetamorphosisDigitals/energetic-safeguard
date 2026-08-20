import { expect, test } from "@playwright/test";

const canonicalRecord = {
  id: 701,
  practiceId: "transition-pause",
  completedAt: "2026-08-20T09:00:00.000Z",
  note: "A short pause helped me leave the call behind.",
  moodTag: null,
  intentionTag: null,
  customTags: "[]",
};

test.describe("Canonical ritual records in Saved Support", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("renders a canonical history and favorite record, exports its note, and resolves it as daily default", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
    });

    await page.route("**/api/trpc/**", async (route) => {
      const endpoints = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
      const payloadFor = (endpoint: string) => {
        if (endpoint === "auth.me") return { id: 9, openId: "canonical-browser-user", name: "Canonical Browser User", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastSignedIn: "2026-08-20T09:00:00.000Z" };
        if (endpoint === "library.history") return [canonicalRecord];
        if (endpoint === "library.favorites") return [{ id: 801, practiceId: "transition-pause", createdAt: "2026-08-20T09:00:00.000Z" }];
        if (endpoint === "library.dailyDefault") return "transition-pause";
        if (endpoint === "premium.status") return { hasPremiumAccess: true };
        return [];
      };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(endpoints.map((endpoint) => ({ result: { data: { json: payloadFor(endpoint) } } }))) });
    });

    await page.goto("/?view=library");
    await expect(page.getByRole("heading", { name: "Saved support" })).toBeVisible();
    const librarySections = page.locator(".library-section");
    await expect(librarySections.nth(0).getByText("Transition Pause")).toBeVisible();
    await expect(librarySections.nth(1).getByText("Transition Pause")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export notes" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    let exported = "";
    for await (const chunk of stream!) exported += chunk.toString();
    expect(exported).toContain("Transition Pause");
    expect(exported).toContain(canonicalRecord.note);

    await page.getByRole("button", { name: "Return to home" }).click();
    await expect(page.getByText("YOUR DAILY DEFAULT")).toBeVisible();
    await expect(page.getByText("Transition Pause").last()).toBeVisible();
  });
});
