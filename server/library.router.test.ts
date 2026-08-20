import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  getDailyDefaultPracticeId: vi.fn(),
  getDefaultPracticeFilterView: vi.fn(),
  getPinnedCustomTags: vi.fn(),
  getPremiumEntitlement: vi.fn(),
  listUserCustomTags: vi.fn(),
  listPracticeFavorites: vi.fn(),
  listPracticeHistory: vi.fn(),
  listSavedPracticeFilterViews: vi.fn(),
  recordPracticeCompletion: vi.fn(),
  removePracticeFavorite: vi.fn(),
  replaceUserCustomTag: vi.fn(),
  savePracticeFavorite: vi.fn(),
  savePracticeFilterView: vi.fn(),
  setDailyDefaultPractice: vi.fn(),
  setDefaultPracticeFilterView: vi.fn(),
  setPinnedCustomTags: vi.fn(),
  updatePracticeHistoryNote: vi.fn(),
  updatePracticeHistoryReflection: vi.fn(),
  deletePracticeFilterView: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function createContext(userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: "member@example.com",
      name: "Library Member",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

describe("library router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.listPracticeFavorites.mockResolvedValue([]);
    database.listPracticeHistory.mockResolvedValue([]);
    database.recordPracticeCompletion.mockResolvedValue(undefined);
    database.savePracticeFavorite.mockResolvedValue(undefined);
    database.removePracticeFavorite.mockResolvedValue(undefined);
    database.updatePracticeHistoryNote.mockResolvedValue(undefined);
    database.getDailyDefaultPracticeId.mockResolvedValue(null);
    database.getDefaultPracticeFilterView.mockResolvedValue(null);
    database.setDailyDefaultPractice.mockResolvedValue(undefined);
    database.setDefaultPracticeFilterView.mockResolvedValue(undefined);
    database.updatePracticeHistoryReflection.mockResolvedValue(undefined);
    database.listUserCustomTags.mockResolvedValue([]);
    database.replaceUserCustomTag.mockResolvedValue(undefined);
    database.getPinnedCustomTags.mockResolvedValue([]);
    database.setPinnedCustomTags.mockResolvedValue([]);
    database.listSavedPracticeFilterViews.mockResolvedValue([]);
    database.savePracticeFilterView.mockResolvedValue(undefined);
    database.deletePracticeFilterView.mockResolvedValue(undefined);
  });

  it("records only the catalog practice ID under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(42));
    await caller.library.recordCompletion({ practiceId: "golden-day-boundary" });
    expect(database.recordPracticeCompletion).toHaveBeenCalledWith(42, "golden-day-boundary");
  });

  it("scopes queries and favorite mutations to the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(7));
    await caller.library.history({ limit: 12 });
    await caller.library.favorites();
    await caller.library.saveFavorite({ practiceId: "emerald-rose-grounding" });
    await caller.library.removeFavorite({ practiceId: "emerald-rose-grounding" });
    expect(database.listPracticeHistory).toHaveBeenCalledWith(7, 12);
    expect(database.listPracticeFavorites).toHaveBeenCalledWith(7);
    expect(database.savePracticeFavorite).toHaveBeenCalledWith(7, "emerald-rose-grounding");
    expect(database.removePracticeFavorite).toHaveBeenCalledWith(7, "emerald-rose-grounding");
  });

  it("updates a private note only under the authenticated user and history record", async () => {
    const caller = appRouter.createCaller(createContext(11));
    await caller.library.updateHistoryNote({ historyId: 18, note: "I felt steadier after this." });
    expect(database.updatePracticeHistoryNote).toHaveBeenCalledWith(11, 18, "I felt steadier after this.");
  });

  it("clears a private note only under the authenticated user and history record", async () => {
    const caller = appRouter.createCaller(createContext(11));
    await caller.library.updateHistoryNote({ historyId: 18, note: null });
    expect(database.updatePracticeHistoryNote).toHaveBeenCalledWith(11, 18, null);
  });

  it("reads and updates a daily default under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(23));
    await caller.library.dailyDefault();
    await caller.library.setDailyDefault({ practiceId: "emerald-rose-grounding" });
    expect(database.getDailyDefaultPracticeId).toHaveBeenCalledWith(23);
    expect(database.setDailyDefaultPractice).toHaveBeenCalledWith(23, "emerald-rose-grounding");
  });

  it("persists canonical energy-hygiene ritual IDs across history, favorites, and daily default", async () => {
    const caller = appRouter.createCaller(createContext(29));
    await caller.library.recordCompletion({ practiceId: "transition-pause" });
    await caller.library.saveFavorite({ practiceId: "transition-pause" });
    await caller.library.setDailyDefault({ practiceId: "transition-pause" });
    expect(database.recordPracticeCompletion).toHaveBeenCalledWith(29, "transition-pause");
    expect(database.savePracticeFavorite).toHaveBeenCalledWith(29, "transition-pause");
    expect(database.setDailyDefaultPractice).toHaveBeenCalledWith(29, "transition-pause");
  });

  it("updates a tagged private reflection only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.updateHistoryReflection({ historyId: 9, note: "I felt more settled.", moodTag: "Grounded", intentionTag: "Return to myself", customTags: ["workday"] });
    expect(database.updatePracticeHistoryReflection).toHaveBeenCalledWith({ userId: 31, historyId: 9, note: "I felt more settled.", moodTag: "Grounded", intentionTag: "Return to myself", customTags: ["workday"] });
  });

  it("lists and transforms custom tags only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.customTags();
    await caller.library.replaceCustomTag({ sourceTag: "workday", targetTag: "office" });
    expect(database.listUserCustomTags).toHaveBeenCalledWith(31);
    expect(database.replaceUserCustomTag).toHaveBeenCalledWith(31, "workday", "office");
  });

  it("reads and updates pinned custom tags only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.pinnedCustomTags();
    await caller.library.setPinnedCustomTags({ tags: ["workday"] });
    expect(database.getPinnedCustomTags).toHaveBeenCalledWith(31);
    expect(database.setPinnedCustomTags).toHaveBeenCalledWith(31, ["workday"]);
  });

  it("saves, lists, and deletes reusable filter views only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.savedFilterViews();
    await caller.library.saveFilterView({ name: "Workday notes", keyword: "calm", customTag: "workday", startDate: "2026-08-01", endDate: "2026-08-31" });
    await caller.library.deleteFilterView({ viewId: 5 });
    expect(database.listSavedPracticeFilterViews).toHaveBeenCalledWith(31);
    expect(database.savePracticeFilterView).toHaveBeenCalledWith(31, { name: "Workday notes", keyword: "calm", customTag: "workday", startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(database.deletePracticeFilterView).toHaveBeenCalledWith(31, 5);
  });

  it("reads, sets, and clears the default filter view only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.defaultFilterView();
    await caller.library.setDefaultFilterView({ viewId: 5 });
    await caller.library.setDefaultFilterView({ viewId: null });
    expect(database.getDefaultPracticeFilterView).toHaveBeenCalledWith(31);
    expect(database.setDefaultPracticeFilterView).toHaveBeenNthCalledWith(1, 31, 5);
    expect(database.setDefaultPracticeFilterView).toHaveBeenNthCalledWith(2, 31, null);
  });
});
