import { and, eq } from "drizzle-orm";
import { billingWebhookEvents } from "../../drizzle/schema";
import { getDb } from "../db";

type BillingEventInput = {
  providerEventId: string;
  eventType: string;
  userId: number | null;
  providerCreatedAt: Date | null;
};

async function readBillingWebhookEvent(providerEventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reading the billing event.");
  const rows = await db.select().from(billingWebhookEvents).where(eq(billingWebhookEvents.providerEventId, providerEventId)).limit(1);
  return rows[0] ?? null;
}

async function reclaimFailedBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reclaiming the billing event.");
  const reclaimed = await db
    .update(billingWebhookEvents)
    .set({
      eventType: input.eventType,
      userId: input.userId,
      outcome: "processing",
      errorCode: null,
      providerCreatedAt: input.providerCreatedAt,
      processedAt: null,
    })
    .where(and(eq(billingWebhookEvents.providerEventId, input.providerEventId), eq(billingWebhookEvents.outcome, "failed")))
    .returning({ id: billingWebhookEvents.id });

  if (reclaimed.length !== 1) {
    const event = await readBillingWebhookEvent(input.providerEventId);
    return { claimed: false, event };
  }

  const event = await readBillingWebhookEvent(input.providerEventId);
  return { claimed: true, event };
}

/**
 * Claims a verified provider event exactly once while allowing a previously failed
 * projection to be retried. PostgreSQL's unique constraint plus ON CONFLICT makes
 * concurrent first deliveries safe without relying on vendor-specific error codes.
 */
export async function claimBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while recording the billing event.");

  const existing = await readBillingWebhookEvent(input.providerEventId);
  if (existing) {
    if (existing.outcome === "failed") return reclaimFailedBillingWebhookEvent(input);
    return { claimed: false, event: existing };
  }

  const inserted = await db
    .insert(billingWebhookEvents)
    .values({ ...input, outcome: "processing" })
    .onConflictDoNothing({ target: billingWebhookEvents.providerEventId })
    .returning({ id: billingWebhookEvents.id });

  if (inserted.length === 0) {
    const concurrent = await readBillingWebhookEvent(input.providerEventId);
    if (concurrent?.outcome === "failed") return reclaimFailedBillingWebhookEvent(input);
    return { claimed: false, event: concurrent };
  }

  const event = await readBillingWebhookEvent(input.providerEventId);
  return { claimed: true, event };
}

export async function completeBillingWebhookEvent(
  providerEventId: string,
  outcome: "processed" | "ignored" | "failed",
  errorCode: string | null = null,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(billingWebhookEvents)
    .set({ outcome, errorCode, processedAt: new Date() })
    .where(eq(billingWebhookEvents.providerEventId, providerEventId))
    .returning({ id: billingWebhookEvents.id });
}
