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
  let organizationUpdates = 0;
  let deleted = false;
  const cloudPlan = { id: 44, clientArchiveKey: localArchive.id, selectedPracticeId: "transition-pause", startedAt: localArchive.startedAt, endsAt: localArchive.endsAt, archivedAt: localArchive.archivedAt, importedAt: "2026-08-21T10:01:00.000Z", completedDayKeys: localArchive.completedDayKeys, completionNotes: localArchive.completionNotes, reflectionNote: localArchive.reflectionNote, label: null, pinned: false };
  await page.route("**/api/trpc/**", async (route: any) => {
    const endpoints = new URL(route.request().url()).pathname.split("/api/trpc/")[1]?.split(",") ?? [];
    const payloadFor = (endpoint: string) => {
      if (endpoint === "auth.me") return { id: 9, openId: "backup-browser-user", name: "Backup Browser User", email: "member@example.com", loginMethod: "manus", role: "user", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", lastSignedIn: "2026-08-21T10:00:00.000Z" };
      if (endpoint === "premium.status") return { hasPremiumAccess: true };
      if (endpoint === "library.history" || endpoint === "library.favorites") return [];
      if (endpoint === "library.dailyDefault") return null;
      if (endpoint === "routineHistory.summary") return { count: deleted ? 0 : 1, lastBackupAt: "2026-08-21T10:01:00.000Z", latest: deleted ? null : { id: 44, selectedPracticeId: "transition-pause", archivedAt: "2026-08-21T10:00:00.000Z", completedCount: 2 } };
      if (endpoint === "routineHistory.list") return deleted ? [] : [cloudPlan];
      if (endpoint === "routineHistory.restore") return cloudPlan;
      if (endpoint === "routineHistory.organize") { organizationUpdates += 1; return cloudPlan; }
      if (endpoint === "routineHistory.delete") { deleted = true; return { success: true }; }
      if (endpoint === "routineHistory.autoBackup") return automatic;
      if (endpoint === "routineHistory.importLocalArchives") { imports += 1; return { inserted: 1, existing: 0, total: 2 }; }
      if (endpoint === "routineHistory.setAutoBackup") { preferenceUpdates += 1; return true; }
      return [];
    };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(endpoints.map((endpoint: string) => ({ result: { data: { json: payloadFor(endpoint) } } }))) });
  });
  return { getImports: () => imports, getPreferenceUpdates: () => preferenceUpdates, getOrganizationUpdates: () => organizationUpdates };
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

  test("shows last backup status and restores a selected cloud plan to this device", async ({ page }) => {
    await seedLocalArchive(page);
    await mockSignedInBackupApi(page);
    await page.goto("/");
    await expect(page.getByText("Last backup", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Manage cloud plans" }).click();
    await expect(page.getByRole("heading", { name: "Completed plans in your account." })).toBeVisible();
    await page.getByRole("button", { name: "Restore to this device" }).click();
    await expect(page.getByRole("heading", { name: "Completed seven-day plans" })).toBeVisible();
    await expect.poll(() => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "[]").length, archiveKey)).toBe(1);
  });

  test("lets a user organize and delete a specific cloud plan", async ({ page }) => {
    await seedLocalArchive(page);
    const api = await mockSignedInBackupApi(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Manage cloud plans" }).click();
    await page.getByRole("button", { name: "Pin this cloud plan" }).click();
    await expect.poll(api.getOrganizationUpdates).toBe(1);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete cloud copy" }).click();
    await expect(page.getByText("No matching cloud plans")).toBeVisible();
  });
});
