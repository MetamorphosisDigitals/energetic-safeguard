import { and, eq } from "drizzle-orm";
import { billingWebhookEvents } from "../../drizzle/schema";
import { getDb } from "../db";

type BillingEventInput = {
  providerEventId: string;
  eventType: string;
  userId: number | null;
  providerCreatedAt: Date | null;
};

function affectedRows(result: unknown) {
  if (result && typeof result === "object" && "affectedRows" in result && typeof (result as { affectedRows?: unknown }).affectedRows === "number") {
    return (result as { affectedRows: number }).affectedRows;
  }
  if (Array.isArray(result)) {
    for (const item of result) {
      if (item && typeof item === "object" && "affectedRows" in item && typeof (item as { affectedRows?: unknown }).affectedRows === "number") {
        return (item as { affectedRows: number }).affectedRows;
      }
    }
  }
  return 0;
}

function isDuplicateEntryError(error: unknown) {
  const candidates = [error, error && typeof error === "object" && "cause" in error ? (error as { cause?: unknown }).cause : null];
  return candidates.some((candidate) => {
    if (!candidate || typeof candidate !== "object") return false;
    const details = candidate as { code?: unknown; errno?: unknown };
    return details.code === "ER_DUP_ENTRY" || details.errno === 1062;
  });
}

async function readBillingWebhookEvent(providerEventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reading the billing event.");
  const rows = await db.select().from(billingWebhookEvents).where(eq(billingWebhookEvents.providerEventId, providerEventId)).limit(1);
  return rows[0] ?? null;
}

async function reclaimFailedBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reclaiming the billing event.");
  const result = await db
    .update(billingWebhookEvents)
    .set({
      eventType: input.eventType,
      userId: input.userId,
      outcome: "processing",
      errorCode: null,
      providerCreatedAt: input.providerCreatedAt,
      processedAt: null,
    })
    .where(and(eq(billingWebhookEvents.providerEventId, input.providerEventId), eq(billingWebhookEvents.outcome, "failed")));

  if (affectedRows(result) !== 1) {
    const event = await readBillingWebhookEvent(input.providerEventId);
    return { claimed: false, event };
  }

  const event = await readBillingWebhookEvent(input.providerEventId);
  return { claimed: true, event };
}

/**
 * Claims a verified provider event exactly once while allowing a previously failed
 * projection to be retried. Processed/ignored events and an in-flight processing
 * event remain idempotent duplicates.
 */
export async function claimBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while recording the billing event.");

  const existing = await readBillingWebhookEvent(input.providerEventId);
  if (existing) {
    if (existing.outcome === "failed") return reclaimFailedBillingWebhookEvent(input);
    return { claimed: false, event: existing };
  }

  try {
    await db.insert(billingWebhookEvents).values({ ...input, outcome: "processing" });
  } catch (error) {
    if (!isDuplicateEntryError(error)) throw error;
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
    .where(eq(billingWebhookEvents.providerEventId, providerEventId));
}
