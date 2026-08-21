import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const database = vi.hoisted(() => ({
  getRoutineArchiveAutoBackup: vi.fn(),
  getRoutinePlanArchiveById: vi.fn(),
  getRoutinePlanArchiveSummary: vi.fn(),
  importRoutinePlanArchives: vi.fn(),
  listRoutinePlanArchives: vi.fn(),
  setRoutineArchiveAutoBackup: vi.fn(),
  deleteRoutinePlanArchive: vi.fn(),
  updateRoutinePlanArchiveOrganization: vi.fn(),
}));

vi.mock("./db", () => database);

import { appRouter } from "./routers";

function createContext(userId = 42): TrpcContext {
  return {
    user: { id: userId, openId: `user-${userId}`, email: "routine@example.com", name: "Routine Member", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

const archive = {
  clientArchiveKey: "daily-plan-2026-08-14T09:00:00.000Z",
  selectedPracticeId: "transition-pause",
  startedAt: "2026-08-14T09:00:00.000Z",
  endsAt: "2026-08-21T09:00:00.000Z",
  archivedAt: "2026-08-21T10:00:00.000Z",
  completedDayKeys: ["2026-08-14", "2026-08-20"],
  completionNotes: { "2026-08-20": "A calmer ending." },
  reflectionNote: "I can keep what helped.",
};

describe("routineHistory router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.getRoutinePlanArchiveSummary.mockResolvedValue({ count: 0, latest: null, lastBackupAt: null });
    database.listRoutinePlanArchives.mockResolvedValue([]);
    database.getRoutinePlanArchiveById.mockResolvedValue(null);
    database.importRoutinePlanArchives.mockResolvedValue({ inserted: 1, existing: 0, total: 1 });
    database.getRoutineArchiveAutoBackup.mockResolvedValue(false);
    database.setRoutineArchiveAutoBackup.mockResolvedValue(true);
    database.deleteRoutinePlanArchive.mockResolvedValue(true);
    database.updateRoutinePlanArchiveOrganization.mockResolvedValue(null);
  });

  it("scopes archive summary, listing, reading, restoration, and deletion to the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(17));
    await caller.routineHistory.summary();
    await caller.routineHistory.list({ limit: 12 });
    await caller.routineHistory.get({ archiveId: 9 });
    await caller.routineHistory.restore({ archiveId: 9 });
    await caller.routineHistory.delete({ archiveId: 9 });
    expect(database.getRoutinePlanArchiveSummary).toHaveBeenCalledWith(17);
    expect(database.listRoutinePlanArchives).toHaveBeenCalledWith(17, 12);
    expect(database.getRoutinePlanArchiveById).toHaveBeenCalledWith(17, 9);
    expect(database.getRoutinePlanArchiveById).toHaveBeenCalledTimes(2);
    expect(database.deleteRoutinePlanArchive).toHaveBeenCalledWith(17, 9);
  });

  it("imports only validated canonical archives under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(23));
    await caller.routineHistory.importLocalArchives({ archives: [archive] });
    expect(database.importRoutinePlanArchives).toHaveBeenCalledWith(23, [expect.objectContaining({
      clientArchiveKey: archive.clientArchiveKey,
      selectedPracticeId: "transition-pause",
      startedAt: new Date(archive.startedAt),
      endsAt: new Date(archive.endsAt),
      archivedAt: new Date(archive.archivedAt),
    })]);
  });

  it("rejects non-canonical ritual IDs and note keys that are not completed days", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.routineHistory.importLocalArchives({ archives: [{ ...archive, selectedPracticeId: "invented-ritual" }] })).rejects.toThrow();
    await expect(caller.routineHistory.importLocalArchives({ archives: [{ ...archive, completionNotes: { "2026-08-19": "Not a completed day." } }] })).rejects.toThrow();
    expect(database.importRoutinePlanArchives).not.toHaveBeenCalled();
  });

  it("reads and updates the explicit automatic backup preference under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(31));
    await caller.routineHistory.autoBackup();
    await caller.routineHistory.setAutoBackup({ enabled: true });
    expect(database.getRoutineArchiveAutoBackup).toHaveBeenCalledWith(31);
    expect(database.setRoutineArchiveAutoBackup).toHaveBeenCalledWith(31, true);
  });

  it("validates and scopes cloud-plan labels and pinning under the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext(51));
    await caller.routineHistory.organize({ archiveId: 7, label: "A calmer week", pinned: true });
    expect(database.updateRoutinePlanArchiveOrganization).toHaveBeenCalledWith(51, 7, { label: "A calmer week", pinned: true });
    await expect(caller.routineHistory.organize({ archiveId: 7, label: " ", pinned: false })).rejects.toThrow();
  });
});
