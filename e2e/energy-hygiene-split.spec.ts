import { expect, test } from "@playwright/test";

test.describe("Energy hygiene split", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem("energetic-safeguard:onboarding-complete:v1", "true");
      window.localStorage.setItem("energetic-safeguard:free-practice-usage:v1", JSON.stringify({ completedCount: 0 }));
    });
    await page.goto("/");
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await expect(page.getByRole("heading", { name: "What kind of energy care would support you now?" })).toBeVisible();
  });

  test("routes after-interaction restoration to its canonical transition ritual", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();

    await expect(page.getByRole("heading", { name: "Let the interaction end with the interaction." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Begin a restoration reset/i })).toBeVisible();
    await page.getByRole("button", { name: /Begin a restoration reset/i }).click();

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Transition Pause" })).toBeVisible();
  });

  test("routes daily hygiene to its canonical energy-conservation ritual", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();

    await expect(page.getByRole("heading", { name: "Care for your capacity before the day spends it." })).toBeVisible();
    await expect(page.getByRole("button", { name: /Begin today’s capacity check/i })).toBeVisible();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();

    await expect(page.getByText("TODAY’S RECOMMENDATION")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Energy Conservation Pause" })).toBeVisible();
  });

  test("saves a restoration route as a home shortcut and opens its dedicated screen", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await expect(page.getByRole("button", { name: "Remove home shortcut" })).toBeVisible();

    await page.getByRole("button", { name: "Return to home" }).click();
    await expect(page.getByText("SAVED ENERGY HYGIENE")).toBeVisible();
    await page.locator(".energy-hygiene-shortcut", { hasText: "Restore after an interaction" }).click();
    await expect(page.getByRole("heading", { name: "Let the interaction end with the interaction." })).toBeVisible();
  });

  test("starts a private seven-day reminder and lets the user defer it for today", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await expect(page.getByRole("button", { name: "End seven-day reminder" })).toBeVisible();

    await page.getByRole("button", { name: "Return to home" }).click();
    await expect(page.getByRole("heading", { name: "Would a small capacity check support you today?" })).toBeVisible();
    await page.getByRole("button", { name: "Not today" }).click();
    await expect(page.getByRole("heading", { name: "Would a small capacity check support you today?" })).not.toBeVisible();
  });

  test("stores an optional completion note and marks today complete after the daily hygiene practice finishes", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    await expect(page.getByRole("heading", { name: "Day 1 of 7" })).toBeVisible();
    await expect(page.getByText("0 completed")).toBeVisible();
    await page.getByRole("button", { name: /Continue today/i }).click();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await page.getByRole("button", { name: /Begin practice/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /I completed this/i }).click();
    await expect(page.getByRole("heading", { name: "Keep what feels useful." })).toBeVisible();
    await page.getByRole("textbox").fill("I paused before my next task.");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "More grounded" }).click();

    await expect(page.getByText("1 completed")).toBeVisible();
    await expect(page.locator(".daily-hygiene-progress__day.is-complete").first()).toContainText("Day 1");
    const completionNotes = await page.evaluate(() => JSON.parse(window.localStorage.getItem("energetic-safeguard:daily-hygiene-reminder:v1") ?? "{}").completionNotes);
    expect(completionNotes).toMatchObject({ [new Date().toISOString().slice(0, 10)]: "I paused before my next task." });
  });

  test("lets the user select a canonical ritual for their daily-hygiene plan", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Choose a different ritual" }).click();
    await expect(page.getByRole("heading", { name: "Choose a ritual for your seven days" })).toBeVisible();
    await expect(page.locator(".daily-ritual-picker-list .style-option")).toHaveCount(18);
    await page.locator(".daily-ritual-picker-list .style-option", { hasText: "Transition Pause" }).click();
    await page.getByRole("button", { name: "Start seven days with this ritual" }).click();

    await expect(page.getByText("YOUR FOCUSED PRACTICE")).toBeVisible();
    await expect(page.getByText("Transition Pause")).toBeVisible();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await expect(page.getByRole("heading", { name: "Transition Pause" })).toBeVisible();
  });

  test("shows Day 7 reflection with saved day insights and preserves the closing reflection", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.evaluate(() => {
      const key = "energetic-safeguard:daily-hygiene-reminder:v1";
      const plan = JSON.parse(window.localStorage.getItem(key) ?? "{}");
      const start = new Date(Date.now() - 6 * 86_400_000);
      plan.startedAt = start.toISOString();
      plan.endsAt = new Date(Date.now() + 86_400_000).toISOString();
      plan.completedDayKeys = Array.from({ length: 6 }, (_, index) => new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10));
      plan.completionNotes = { [plan.completedDayKeys[0]]: "A smaller pace helped." };
      window.localStorage.setItem(key, JSON.stringify(plan));
    });
    await page.reload();
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await page.getByRole("button", { name: /Begin practice/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /I completed this/i }).click();
    await page.getByRole("button", { name: "Skip note" }).click();
    await page.getByRole("button", { name: "More grounded" }).click();

    await expect(page.getByRole("heading", { name: "A week of caring for your capacity." })).toBeVisible();
    await expect(page.getByText("A smaller pace helped.")).toBeVisible();
    await page.getByRole("textbox").fill("I can return to a gentler pace.");
    await page.getByRole("button", { name: "Save reflection and return home" }).click();
    const reflectionNote = await page.evaluate(() => JSON.parse(window.localStorage.getItem("energetic-safeguard:daily-hygiene-reminder:v1") ?? "{}").reflectionNote);
    expect(reflectionNote).toBe("I can return to a gentler pace.");
    const archive = await page.evaluate(() => JSON.parse(window.localStorage.getItem("energetic-safeguard:daily-hygiene-archive:v1") ?? "[]"));
    expect(archive[0]).toMatchObject({ selectedPracticeId: "energy-conservation-pause", reflectionNote: "I can return to a gentler pace." });
    await expect(page.getByRole("heading", { name: "Completed seven-day plans" })).toBeVisible();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Print summary" }).click();
    const popup = await popupPromise;
    await expect(popup.locator("body")).toContainText("Seven-Day Daily Hygiene Plan");
    await expect(popup.locator("body")).toContainText("Energy Conservation Pause");
    await expect(popup.locator("body")).toContainText("I can return to a gentler pace.");
  });

  test("shows a completed-plan summary and repeats the same ritual in a fresh seven-day cycle", async ({ page }) => {
    await page.evaluate(() => {
      const key = "energetic-safeguard:daily-hygiene-reminder:v1";
      const start = new Date(Date.now() - 6 * 86_400_000);
      const completed = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10));
      window.localStorage.setItem(key, JSON.stringify({
        startedAt: start.toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(), lastPromptDate: completed[6],
        completedDayKeys: completed, selectedPracticeId: "transition-pause", completionNotes: {}, reflectionNote: "I can return to a gentler pace.",
      }));
    });
    await page.reload();

    await expect(page.getByRole("heading", { name: "You completed your gentle rhythm." })).toBeVisible();
    await expect(page.getByText("Transition Pause")).toBeVisible();
    await page.getByRole("button", { name: "Repeat this plan" }).click();

    await expect(page.getByRole("heading", { name: "Day 1 of 7" })).toBeVisible();
    await expect(page.getByText("0 completed")).toBeVisible();
    const duplicated = await page.evaluate(() => JSON.parse(window.localStorage.getItem("energetic-safeguard:daily-hygiene-reminder:v1") ?? "{}"));
    expect(duplicated).toMatchObject({ selectedPracticeId: "transition-pause", completedDayKeys: [], completionNotes: {}, reflectionNote: "" });
  });

  test("offers a different canonical ritual after a completed plan", async ({ page }) => {
    await page.evaluate(() => {
      const key = "energetic-safeguard:daily-hygiene-reminder:v1";
      const start = new Date(Date.now() - 6 * 86_400_000);
      const completed = Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10));
      window.localStorage.setItem(key, JSON.stringify({
        startedAt: start.toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(), lastPromptDate: completed[6],
        completedDayKeys: completed, selectedPracticeId: "transition-pause", completionNotes: {}, reflectionNote: "",
      }));
    });
    await page.reload();
    const alternateButton = page.getByRole("button", { name: /^Try / });
    await expect(alternateButton).toBeVisible();
    await alternateButton.click();
    const nextPlan = await page.evaluate(() => JSON.parse(window.localStorage.getItem("energetic-safeguard:daily-hygiene-reminder:v1") ?? "{}"));
    expect(nextPlan.selectedPracticeId).not.toBe("transition-pause");
    expect(nextPlan.completedDayKeys).toEqual([]);
  });

  test("does not advance daily-hygiene progress after the user leaves that flow and completes an unrelated practice", async ({ page }) => {
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Start a private seven-day reminder" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Continue today/i }).click();
    await page.getByRole("button", { name: /Begin today’s capacity check/i }).click();
    await page.getByRole("button", { name: /Adjust answers/i }).click();
    await page.getByRole("button", { name: /Back/i }).click();

    await page.locator(".quick-reset-fab").click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /Next step/i }).click();
    await page.getByRole("button", { name: /I completed this/i }).click();
    await page.getByRole("button", { name: "More grounded" }).click();

    await expect(page.getByText("0 completed")).toBeVisible();
    await expect(page.locator(".daily-hygiene-progress__day.is-complete")).toHaveCount(0);
  });

  test("reorders saved shortcuts and restores their preferred order after reload", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    await page.getByRole("button", { name: "Move Daily energy hygiene earlier" }).click();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
    await page.reload();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
  });

  test("reorders saved shortcuts through direct drag and drop", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();
    await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
    await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    const cards = page.locator(".energy-hygiene-shortcut-wrap");
    await cards.nth(1).dragTo(cards.nth(0));
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
    await page.reload();
    await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
  });

  test("shows a visible drag state while a shortcut is being moved", async ({ page }) => {
    await page.getByRole("button", { name: /Restore after an interaction/i }).click();
    await page.getByRole("button", { name: "Save to home" }).click();
    await page.getByRole("button", { name: "Return to home" }).click();

    const card = page.locator(".energy-hygiene-shortcut-wrap");
    await card.dispatchEvent("dragstart");
    await expect(card).toHaveClass(/is-dragging/);
    await card.dispatchEvent("dragend");
    await expect(card).not.toHaveClass(/is-dragging/);
  });

  test.describe("desktop shortcut ordering", () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test("reorders shortcuts through keyboard activation of the move controls", async ({ page }) => {
      await page.getByRole("button", { name: /Restore after an interaction/i }).click();
      await page.getByRole("button", { name: "Save to home" }).click();
      await page.getByRole("button", { name: "Return to home" }).click();
      await page.getByRole("button", { name: /Improve My Energy Hygiene/i }).click();
      await page.getByRole("button", { name: /Daily energy hygiene/i }).click();
      await page.getByRole("button", { name: "Save to home" }).click();
      await page.getByRole("button", { name: "Return to home" }).click();

      const control = page.getByRole("button", { name: "Move Restore after an interaction later" });
      await control.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Daily energy hygiene");
      const earlierControl = page.getByRole("button", { name: "Move Restore after an interaction earlier" });
      await earlierControl.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Restore after an interaction");
      await page.reload();
      await expect(page.locator(".energy-hygiene-shortcut").first()).toContainText("Restore after an interaction");
    });
  });
});
