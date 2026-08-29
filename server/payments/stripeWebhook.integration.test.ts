import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  savePremiumEntitlement: vi.fn(),
  getSubscriptionEntitlementByStripeId: vi.fn(),
  saveSubscriptionEntitlement: vi.fn(),
}));
const ledgerMocks = vi.hoisted(() => ({
  claimBillingWebhookEvent: vi.fn(),
  completeBillingWebhookEvent: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: stripeMocks.constructEvent },
  })),
}));

vi.mock("../db", () => ({
  savePremiumEntitlement: dbMocks.savePremiumEntitlement,
  getSubscriptionEntitlementByStripeId: dbMocks.getSubscriptionEntitlementByStripeId,
  saveSubscriptionEntitlement: dbMocks.saveSubscriptionEntitlement,
}));

vi.mock("./billingEventLedger", () => ({
  claimBillingWebhookEvent: ledgerMocks.claimBillingWebhookEvent,
  completeBillingWebhookEvent: ledgerMocks.completeBillingWebhookEvent,
}));

import { registerStripeWebhook } from "./stripeWebhook";

function checkoutEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "evt_live_checkout_001",
    type: "checkout.session.completed",
    created: 1_787_422_400,
    data: {
      object: {
        id: "cs_live_001",
        client_reference_id: "42",
        payment_status: "paid",
        customer: "cus_001",
        payment_intent: "pi_001",
        metadata: { offer_key: "current_app_lifetime" },
        ...overrides,
      },
    },
  };
}

function invoiceEvent(type: "invoice.paid" | "invoice.payment_failed", id: string, subscription: string) {
  return {
    id,
    type,
    created: 1_787_422_401,
    data: {
      object: {
        id: `in_${id}`,
        customer: "cus_001",
        subscription,
        lines: { data: [{ price: { id: "price_rhythm" }, period: { end: 1_787_500_000 } }] },
      },
    },
  };
}

describe("Stripe webhook lifecycle integration", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_simulated";
    stripeMocks.constructEvent.mockReset();
    dbMocks.savePremiumEntitlement.mockReset();
    dbMocks.getSubscriptionEntitlementByStripeId.mockReset();
    dbMocks.saveSubscriptionEntitlement.mockReset();
    ledgerMocks.claimBillingWebhookEvent.mockReset();
    ledgerMocks.completeBillingWebhookEvent.mockReset();
    dbMocks.savePremiumEntitlement.mockResolvedValue(undefined);
    ledgerMocks.claimBillingWebhookEvent.mockResolvedValue({ claimed: true, event: {} });
    ledgerMocks.completeBillingWebhookEvent.mockResolvedValue(undefined);
    dbMocks.getSubscriptionEntitlementByStripeId.mockResolvedValue(null);
    dbMocks.saveSubscriptionEntitlement.mockResolvedValue(undefined);

    const app = express();
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
    registerStripeWebhook(app);
    server = await new Promise<Server>((resolve) => {
      const listener = app.listen(0, () => resolve(listener));
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  async function postSimulatedEvent(event: unknown, signature = "t=simulated,v1=signature") {
    stripeMocks.constructEvent.mockReturnValue(event);
    return fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signature,
      },
      body: JSON.stringify({ fixture: "stripe-event" }),
    });
  }

  it("projects a paid checkout completion into the existing lifetime entitlement model", async () => {
    const response = await postSimulatedEvent(checkoutEvent());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(stripeMocks.constructEvent).toHaveBeenCalledOnce();
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledWith({
      userId: 42,
      offerKey: "current_app_lifetime",
      stripeCustomerId: "cus_001",
      stripePaymentIntentId: "pi_001",
      stripeCheckoutSessionId: "cs_live_001",
    });
  });

  it("returns a retryable error when an invoice event arrives before its subscription projection", async () => {
    const response = await postSimulatedEvent(invoiceEvent("invoice.payment_failed", "evt_live_invoice_failed_001", "sub_001"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook processing failed" });
    expect(dbMocks.savePremiumEntitlement).not.toHaveBeenCalled();
    expect(dbMocks.saveSubscriptionEntitlement).not.toHaveBeenCalled();
    expect(ledgerMocks.completeBillingWebhookEvent).toHaveBeenCalledWith("evt_live_invoice_failed_001", "failed", "dependency_missing");
  });

  it("retries an out-of-order paid invoice after the subscription projection becomes available", async () => {
    const event = invoiceEvent("invoice.paid", "evt_live_invoice_paid_reordered", "sub_reordered");
    dbMocks.getSubscriptionEntitlementByStripeId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        userId: 42,
        offerKey: "rhythm_plus_monthly",
        stripeCustomerId: "cus_001",
        stripeSubscriptionId: "sub_reordered",
        stripePriceId: "price_old",
        currentPeriodEnd: null,
        lastPaidAt: null,
      });

    const first = await postSimulatedEvent(event);
    const second = await postSimulatedEvent(event);

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ received: true });
    expect(dbMocks.saveSubscriptionEntitlement).toHaveBeenCalledTimes(1);
    expect(dbMocks.saveSubscriptionEntitlement).toHaveBeenCalledWith(expect.objectContaining({
      status: "active",
      stripeSubscriptionId: "sub_reordered",
      stripePriceId: "price_rhythm",
    }));
    expect(ledgerMocks.completeBillingWebhookEvent).toHaveBeenCalledWith("evt_live_invoice_paid_reordered", "failed", "dependency_missing");
    expect(ledgerMocks.completeBillingWebhookEvent).toHaveBeenCalledWith("evt_live_invoice_paid_reordered", "processed");
  });

  it("projects recurring paid invoices, grace status, and cancellation into the subscription ledger", async () => {
    dbMocks.getSubscriptionEntitlementByStripeId
      .mockResolvedValueOnce({ userId: 42, offerKey: "rhythm_plus_monthly", stripeCustomerId: "cus_001", stripeSubscriptionId: "sub_paid", stripePriceId: "price_old", currentPeriodEnd: null, lastPaidAt: null })
      .mockResolvedValueOnce({ userId: 42, offerKey: "cloud_continuity_monthly", stripeCustomerId: "cus_001", stripeSubscriptionId: "sub_001", stripePriceId: "price_cloud", currentPeriodEnd: null, lastPaidAt: null })
      .mockResolvedValueOnce({ userId: 42, offerKey: "cloud_continuity_monthly", stripeCustomerId: "cus_001", stripeSubscriptionId: "sub_cancel", stripePriceId: "price_cloud", currentPeriodEnd: null, lastInvoiceId: null, lastPaidAt: null });
    await postSimulatedEvent(invoiceEvent("invoice.paid", "evt_live_invoice_paid_001", "sub_paid"));
    await postSimulatedEvent(invoiceEvent("invoice.payment_failed", "evt_live_invoice_failed_002", "sub_001"));
    await postSimulatedEvent({ id: "evt_live_cancel_001", type: "customer.subscription.deleted", created: 1_787_422_404, data: { object: { id: "sub_cancel" } } });
    expect(dbMocks.saveSubscriptionEntitlement).toHaveBeenCalledWith(expect.objectContaining({ status: "active", stripePriceId: "price_rhythm", graceEndsAt: null }));
    expect(dbMocks.saveSubscriptionEntitlement).toHaveBeenCalledWith(expect.objectContaining({ status: "past_due", stripeSubscriptionId: "sub_001" }));
    expect(dbMocks.saveSubscriptionEntitlement).toHaveBeenCalledWith(expect.objectContaining({ status: "canceled", stripeSubscriptionId: "sub_cancel" }));
  });

  it("processes signed sandbox event identifiers through the same ledger path", async () => {
    const response = await postSimulatedEvent({
      ...checkoutEvent(),
      id: "evt_test_checkout_001",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledOnce();
  });

  it("rejects invalid webhook signatures before any entitlement side effect", async () => {
    stripeMocks.constructEvent.mockImplementation(() => {
      throw new Error("Signature verification failed");
    });

    const response = await fetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "stripe-signature": "invalid" },
      body: JSON.stringify({ fixture: "invalid" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid Stripe signature" });
    expect(dbMocks.savePremiumEntitlement).not.toHaveBeenCalled();
  });

  it("ignores incomplete checkout metadata without creating an entitlement", async () => {
    const response = await postSimulatedEvent(checkoutEvent({ payment_status: "unpaid" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(dbMocks.savePremiumEntitlement).not.toHaveBeenCalled();
  });

  it("acknowledges replayed checkout deliveries without re-projecting a claimed event", async () => {
    const event = checkoutEvent({ id: "cs_live_duplicate_001" });
    const first = await postSimulatedEvent({ ...event, id: "evt_live_duplicate_001" });
    ledgerMocks.claimBillingWebhookEvent.mockResolvedValueOnce({ claimed: false, event: {} });
    const second = await postSimulatedEvent({ ...event, id: "evt_live_duplicate_001" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledTimes(1);
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledWith(expect.objectContaining({ stripeCheckoutSessionId: "cs_live_duplicate_001" }));
  });

  it("retries the same event after a projection failure instead of losing it as a duplicate", async () => {
    const event = checkoutEvent({ id: "cs_live_projection_failure" });
    dbMocks.savePremiumEntitlement.mockRejectedValueOnce(new Error("database unavailable"));

    const first = await postSimulatedEvent(event);
    const second = await postSimulatedEvent(event);

    expect(first.status).toBe(500);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toEqual({ received: true });
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledTimes(2);
    expect(ledgerMocks.completeBillingWebhookEvent).toHaveBeenCalledWith("evt_live_checkout_001", "failed", "projection_failed");
    expect(ledgerMocks.completeBillingWebhookEvent).toHaveBeenCalledWith("evt_live_checkout_001", "processed");
  });
});
