import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEntitlement: vi.fn(),
  getDb: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock("./payments/subscriptionEntitlements", () => ({
  getSubscriptionEntitlementByUserId: mocks.getEntitlement,
}));

vi.mock("./payments/checkoutConfig", () => ({
  getStripeClient: () => ({ subscriptions: { cancel: mocks.cancelSubscription } }),
}));

vi.mock("./db", () => ({ getDb: mocks.getDb }));

import { deleteUserAccount } from "./accountDeletion";

function makeDatabase() {
  const deletedTables: unknown[] = [];
  const updatedTables: unknown[] = [];
  const returning = vi.fn(async () => [{ id: 7 }]);
  const tx = {
    update: vi.fn((table: unknown) => {
      updatedTables.push(table);
      return { set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) };
    }),
    delete: vi.fn((table: unknown) => {
      deletedTables.push(table);
      return { where: vi.fn(() => ({ returning })) };
    }),
  };
  const transaction = vi.fn(async (callback: (value: typeof tx) => Promise<void>) => callback(tx));
  return { db: { transaction }, tx, deletedTables, updatedTables, transaction };
}

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cancels an active Stripe subscription before deleting local account data", async () => {
    const database = makeDatabase();
    mocks.getEntitlement.mockResolvedValue({ stripeSubscriptionId: "sub_live", status: "active" });
    mocks.cancelSubscription.mockResolvedValue({ id: "sub_live", status: "canceled" });
    mocks.getDb.mockResolvedValue(database.db);

    await expect(deleteUserAccount(7)).resolves.toEqual({ success: true });

    expect(mocks.cancelSubscription).toHaveBeenCalledWith("sub_live");
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.cancelSubscription.mock.invocationCallOrder[0]).toBeLessThan(database.transaction.mock.invocationCallOrder[0]);
    expect(database.updatedTables).toHaveLength(1);
    expect(database.deletedTables).toHaveLength(8);
  });

  it("does not require Stripe for a free account", async () => {
    const database = makeDatabase();
    mocks.getEntitlement.mockResolvedValue(null);
    mocks.getDb.mockResolvedValue(database.db);

    await expect(deleteUserAccount(7)).resolves.toEqual({ success: true });

    expect(mocks.cancelSubscription).not.toHaveBeenCalled();
    expect(database.transaction).toHaveBeenCalledTimes(1);
  });

  it("does not delete local data when Stripe cancellation fails", async () => {
    const database = makeDatabase();
    mocks.getEntitlement.mockResolvedValue({ stripeSubscriptionId: "sub_live", status: "active" });
    mocks.cancelSubscription.mockRejectedValue(new Error("Stripe unavailable"));
    mocks.getDb.mockResolvedValue(database.db);

    await expect(deleteUserAccount(7)).rejects.toThrow("Stripe unavailable");
    expect(database.transaction).not.toHaveBeenCalled();
  });
});
