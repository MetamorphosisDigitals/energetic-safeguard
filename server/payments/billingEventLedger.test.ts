import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  row: null as null | Record<string, unknown>,
  forceLostReclaim: false,
}));

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("../db", () => ({ getDb: getDbMock }));

function createFakeDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (fake.row ? [fake.row] : []),
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (fake.row) return [];
            fake.row = { id: 1, ...values, errorCode: null, processedAt: null };
            return [{ id: 1 }];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (values.outcome === "processing") {
              if (fake.forceLostReclaim || fake.row?.outcome !== "failed") return [];
              fake.row = { ...fake.row, ...values };
              return [{ id: 1 }];
            }
            if (!fake.row) return [];
            fake.row = { ...fake.row, ...values };
            return [{ id: 1 }];
          },
        }),
      }),
    }),
  };
}

import { claimBillingWebhookEvent, completeBillingWebhookEvent } from "./billingEventLedger";

const input = {
  providerEventId: "evt_retry_001",
  eventType: "invoice.paid",
  userId: 42,
  providerCreatedAt: new Date("2026-08-29T12:00:00.000Z"),
};

beforeEach(() => {
  fake.row = null;
  fake.forceLostReclaim = false;
  getDbMock.mockReset();
  getDbMock.mockResolvedValue(createFakeDb());
});

describe("billing webhook event ledger", () => {
  it("claims a new event exactly once", async () => {
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: true });
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
    expect(fake.row).toMatchObject({ providerEventId: input.providerEventId, outcome: "processing" });
  });

  it("reclaims the same provider event after a failed projection", async () => {
    await claimBillingWebhookEvent(input);
    await completeBillingWebhookEvent(input.providerEventId, "failed", "projection_failed");
    expect(fake.row).toMatchObject({ outcome: "failed", errorCode: "projection_failed" });

    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: true });
    expect(fake.row).toMatchObject({ outcome: "processing", errorCode: null, processedAt: null });
  });

  it("never reclaims an already processed event", async () => {
    fake.row = { id: 1, ...input, outcome: "processed", errorCode: null, processedAt: new Date() };
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
    expect(fake.row.outcome).toBe("processed");
  });

  it("does not double-claim when another delivery wins a failed-event reclaim", async () => {
    fake.row = { id: 1, ...input, outcome: "failed", errorCode: "projection_failed", processedAt: new Date() };
    fake.forceLostReclaim = true;
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
  });

  it("treats a concurrent first insert as an idempotent duplicate", async () => {
    fake.row = { id: 1, ...input, outcome: "processing", errorCode: null, processedAt: null };
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
  });
});
