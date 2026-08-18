import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  getDailyDefaultPracticeId: vi.fn(),
  getPremiumEntitlement: vi.fn(),
  listPracticeFavorites: vi.fn(),
  listPracticeHistory: vi.fn(),
  recordPracticeCompletion: vi.fn(),
  removePracticeFavorite: vi.fn(),
  savePracticeFavorite: vi.fn(),
  setDailyDefaultPractice: vi.fn(),
  updatePracticeHistoryNote: vi.fn(),
  updatePracticeHistoryReflection: vi.fn(),
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
    database.setDailyDefaultPractice.mockResolvedValue(undefined);
    database.updatePracticeHistoryReflection.mockResolvedValue(undefined);
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

  it("updates a tagged private reflection only under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.library.updateHistoryReflection({ historyId: 9, note: "I felt more settled.", moodTag: "Grounded", intentionTag: "Return to myself" });
    expect(database.updatePracticeHistoryReflection).toHaveBeenCalledWith({ userId: 31, historyId: 9, note: "I felt more settled.", moodTag: "Grounded", intentionTag: "Return to myself" });
  });
});
