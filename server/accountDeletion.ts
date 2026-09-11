import { eq } from "drizzle-orm";
import {
  billingWebhookEvents,
  practiceFavorites,
  practiceHistory,
  practiceSavedFilterViews,
  premiumEntitlements,
  routinePlanArchives,
  subscriptionEntitlements,
  userLibraryPreferences,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { getStripeClient } from "./payments/checkoutConfig";
import { getSubscriptionEntitlementByUserId } from "./payments/subscriptionEntitlements";

function isMissingStripeResource(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; statusCode?: unknown; raw?: { code?: unknown } };
  return candidate.code === "resource_missing" || candidate.raw?.code === "resource_missing" || candidate.statusCode === 404;
}

export async function deleteUserAccount(userId: number) {
  const entitlement = await getSubscriptionEntitlementByUserId(userId);

  // Never remove the local account while a recurring subscription may still renew.
  if (entitlement?.stripeSubscriptionId && entitlement.status !== "canceled") {
    try {
      await getStripeClient().subscriptions.cancel(entitlement.stripeSubscriptionId);
    } catch (error) {
      // A subscription already removed at Stripe is equivalent to being cancelled.
      if (!isMissingStripeResource(error)) throw error;
    }
  }

  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while deleting the account.");

  await db.transaction(async (tx) => {
    // Keep provider event IDs for webhook idempotency/audit, but remove the user association.
    await tx.update(billingWebhookEvents).set({ userId: null }).where(eq(billingWebhookEvents.userId, userId));

    await tx.delete(practiceHistory).where(eq(practiceHistory.userId, userId));
    await tx.delete(practiceFavorites).where(eq(practiceFavorites.userId, userId));
    await tx.delete(practiceSavedFilterViews).where(eq(practiceSavedFilterViews.userId, userId));
    await tx.delete(routinePlanArchives).where(eq(routinePlanArchives.userId, userId));
    await tx.delete(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId));
    await tx.delete(premiumEntitlements).where(eq(premiumEntitlements.userId, userId));
    await tx.delete(subscriptionEntitlements).where(eq(subscriptionEntitlements.userId, userId));

    const removedUsers = await tx.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
    if (!removedUsers.length) throw new Error("Account could not be found for deletion.");
  });

  return { success: true as const };
}
