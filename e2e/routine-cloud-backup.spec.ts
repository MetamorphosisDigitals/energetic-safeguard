import { expect, test } from "@playwright/test";

const archiveKey = "energetic-safeguard:daily-hygiene-archive:v1";

const localArchive = {
  id: "daily-plan-2026-08-14T09:00:00.000Z",
  selectedPracticeId: "transition-pause",
  startedAt: "2026-08-14T09:00:00.000Z",
  endsAt: "2026-08-21T09:00:00.000Z",
  archivedAt: "2026-08-21T10:00:00.000Z",
  lastPromptDate: "2026-08-20",
  completedDayKeys: ["2026-08-14", "2026-08-20"],
  completionNotes: { "2026-08-20": "A calmer ending." },
  reflectionNote: "I can keep what helped.",
};

async function seedLocalArchive(page: Parameters<typeof test>[0] extends never ? never : any) {
  await page.addInitScript(([onboardingKey, archiveStorageKey, archive]) => {
    window.localStorage.setItem(onboardingKey, "true");
    window.localStorage.setItem(archiveStorageKey, JSON.stringify([archive]));
  }, ["energetic-safeguard:onboarding-complete:v1", archiveKey, localArchive]);
}

async function mockSignedInBackupApi(page: Parameters<typeof test>[0] extends never ? never : any, automatic = false) {
  let imports = 0;
  let preferenceUpdates = 0;
  await page.route("**/api/trpc/**", async (route: any) => {
    const endpoints = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const payloadFor = (endpoint: string) => {
      if (endpoint === "auth.me") return { id: 9, openId: "backup-browser-user", name: "Backup Browser User", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastSignedIn: "2026-08-21T10:00:00.000Z" };
      if (endpoint === "premium.status") return { hasPremiumAccess: true };
      if (endpoint === "library.history" || endpoint === "library.favorites") return [];
      if (endpoint === "library.dailyDefault") return null;
      if (endpoint === "routineHistory.summary") return { count: 1, latest: { id: 44, selectedPracticeId: "transition-pause", archivedAt: "2026-08-21T10:00:00.000Z", completedCount: 2 } };
      if (endpoint === "routineHistory.list") return [{ id: 44, selectedPracticeId: "transition-pause", archivedAt: "2026-08-21T10:00:00.000Z", completedDayKeys: ["2026-08-14", "2026-08-20"], completionNotes: { "2026-08-20": "A calmer ending." }, reflectionNote: "I can keep what helped." }];
      if (endpoint === "routineHistory.autoBackup") return automatic;
      if (endpoint === "routineHistory.importLocalArchives") { imports += 1; return { inserted: 1, existing: 0, total: 2 }; }
      if (endpoint === "routineHistory.setAutoBackup") { preferenceUpdates += 1; return true; }
      return [];
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(endpoints.map((endpoint: string) => ({ result: { data: { json: payloadFor(endpoint) } } }))) });
  });
  return { getImports: () => imports, getPreferenceUpdates: () => preferenceUpdates };
}

test.describe("Routine History cloud backup", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("shows a signed-out recovery path without uploading a local plan", async ({ page }) => {
    await seedLocalArchive(page);
    await page.goto("/");
    await expect(page.getByText("ROUTINE HISTORY BACKUP")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in to back up" })).toBeVisible();
    await expect(page.getByText("Nothing is uploaded until you choose backup.")).toBeVisible();
  });

  test("backs up a local archive manually and exposes cloud history controls", async ({ page }) => {
    await seedLocalArchive(page);
    const api = await mockSignedInBackupApi(page);
    await page.goto("/");
    await expect(page.getByText("1 plan backed up")).toBeVisible();
    await expect(page.getByText("Transition Pause").last()).toBeVisible();
    await page.getByRole("button", { name: "Back up this device (1)" }).click();
    await expect.poll(api.getImports).toBe(1);
    await page.getByText("Automatically back up completed plans", { exact: true }).click();
    await expect.poll(api.getPreferenceUpdates).toBe(1);
  });

  test("automatically backs up local plans only after the signed-in automatic-backup preference is enabled", async ({ page }) => {
    await seedLocalArchive(page);
    const api = await mockSignedInBackupApi(page, true);
    await page.goto("/");
    await expect.poll(api.getImports).toBe(1);
    await expect(page.getByRole("checkbox", { name: /Automatically back up completed plans/i })).toBeChecked();
  });
});
