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
      values: async (values: Record<string, unknown>) => {
        if (fake.row) {
          const error = Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY", errno: 1062 });
          throw error;
        }
        fake.row = { id: 1, ...values, errorCode: null, processedAt: null };
        return [{ affectedRows: 1 }];
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (values.outcome === "processing") {
            if (fake.forceLostReclaim || fake.row?.outcome !== "failed") return [{ affectedRows: 0 }];
            fake.row = { ...fake.row, ...values };
            return [{ affectedRows: 1 }];
          }
          if (fake.row) fake.row = { ...fake.row, ...values };
          return [{ affectedRows: fake.row ? 1 : 0 }];
        },
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
});
