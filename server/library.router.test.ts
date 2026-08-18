import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  getPremiumEntitlement: vi.fn(),
  listPracticeFavorites: vi.fn(),
  listPracticeHistory: vi.fn(),
  recordPracticeCompletion: vi.fn(),
  removePracticeFavorite: vi.fn(),
  savePracticeFavorite: vi.fn(),
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
});
