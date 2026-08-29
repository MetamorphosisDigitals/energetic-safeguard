import { afterAll, describe, expect, it } from "vitest";
import {
  closeDb,
  getSubscriptionEntitlementByStripeId,
  getUserByOpenId,
  listPracticeFavorites,
  listSavedPracticeFilterViews,
  savePracticeFavorite,
  savePracticeFilterView,
  saveSubscriptionEntitlement,
  setRoutineArchiveAutoBackup,
  getRoutineArchiveAutoBackup,
  upsertUser,
} from "./db";
import { claimBillingWebhookEvent, completeBillingWebhookEvent } from "./payments/billingEventLedger";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describePostgres = hasDatabase ? describe : describe.skip;

describePostgres("PostgreSQL persistence contract", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const openId = `postgres-contract-${suffix}`;
  let userId = 0;

  afterAll(async () => {
    await closeDb();
  });

  it("upserts users through PostgreSQL conflict handling", async () => {
    await upsertUser({ openId, name: "First Name", email: `first-${suffix}@example.test` });
    const first = await getUserByOpenId(openId);
    expect(first).toBeDefined();
    userId = first!.id;

    await upsertUser({ openId, name: "Updated Name", email: `updated-${suffix}@example.test` });
    const updated = await getUserByOpenId(openId);
    expect(updated).toMatchObject({ id: userId, name: "Updated Name", email: `updated-${suffix}@example.test` });
  });

  it("keeps favorite and saved-view writes idempotent", async () => {
    await savePracticeFavorite(userId, "feet-breath-intention");
    await savePracticeFavorite(userId, "feet-breath-intention");
    const favorites = await listPracticeFavorites(userId);
    expect(favorites.filter((item) => item.practiceId === "feet-breath-intention")).toHaveLength(1);

    await savePracticeFilterView(userId, { name: "Contract View", keyword: "first", customTag: null, startDate: null, endDate: null });
    await savePracticeFilterView(userId, { name: "Contract View", keyword: "updated", customTag: null, startDate: null, endDate: null });
    const views = await listSavedPracticeFilterViews(userId);
    expect(views.find((view) => view.name === "Contract View")?.keyword).toBe("updated");
  });

  it("updates the one-row-per-user preference and subscription projections", async () => {
    await setRoutineArchiveAutoBackup(userId, true);
    expect(await getRoutineArchiveAutoBackup(userId)).toBe(true);
    await setRoutineArchiveAutoBackup(userId, false);
    expect(await getRoutineArchiveAutoBackup(userId)).toBe(false);

    await saveSubscriptionEntitlement({
      userId,
      offerKey: "rhythm_plus_monthly",
      stripeCustomerId: `cus_${suffix}`,
      stripeSubscriptionId: `sub_first_${suffix}`,
      stripePriceId: "price_first",
      status: "trialing",
      currentPeriodEnd: null,
      graceEndsAt: null,
      lastInvoiceId: null,
      lastPaidAt: null,
      canceledAt: null,
    });
    await saveSubscriptionEntitlement({
      userId,
      offerKey: "rhythm_plus_monthly",
      stripeCustomerId: `cus_${suffix}`,
      stripeSubscriptionId: `sub_updated_${suffix}`,
      stripePriceId: "price_updated",
      status: "active",
      currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
      graceEndsAt: null,
      lastInvoiceId: `in_${suffix}`,
      lastPaidAt: new Date("2026-09-01T00:00:00.000Z"),
      canceledAt: null,
    });
    const subscription = await getSubscriptionEntitlementByStripeId(`sub_updated_${suffix}`);
    expect(subscription).toMatchObject({ userId, status: "active", stripePriceId: "price_updated" });
  });

  it("reclaims failed webhook events and keeps processed events idempotent on PostgreSQL", async () => {
    const event = {
      providerEventId: `evt_${suffix}`,
      eventType: "invoice.paid",
      userId,
      providerCreatedAt: new Date("2026-08-29T12:00:00.000Z"),
    };
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: true });
    await completeBillingWebhookEvent(event.providerEventId, "failed", "projection_failed");
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: true });
    await completeBillingWebhookEvent(event.providerEventId, "processed");
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: false });
  });
});
