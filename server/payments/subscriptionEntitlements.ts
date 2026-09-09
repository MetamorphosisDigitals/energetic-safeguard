import { eq } from "drizzle-orm";
import { subscriptionEntitlements } from "../../drizzle/schema";
import { getDb } from "../db";

export async function getSubscriptionEntitlementByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(subscriptionEntitlements)
    .where(eq(subscriptionEntitlements.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}
