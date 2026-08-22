import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
}));
const dbMocks = vi.hoisted(() => ({
  savePremiumEntitlement: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    webhooks: { constructEvent: stripeMocks.constructEvent },
  })),
}));

vi.mock("../db", () => ({
  savePremiumEntitlement: dbMocks.savePremiumEntitlement,
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

describe("Stripe webhook lifecycle integration", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_simulated";
    stripeMocks.constructEvent.mockReset();
    dbMocks.savePremiumEntitlement.mockReset();
    dbMocks.savePremiumEntitlement.mockResolvedValue(undefined);

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

  it("accepts a simulated invoice.payment_failed event without granting or removing unrestricted ritual access", async () => {
    const response = await postSimulatedEvent({
      id: "evt_live_invoice_failed_001",
      type: "invoice.payment_failed",
      created: 1_787_422_401,
      data: { object: { id: "in_001", customer: "cus_001", subscription: "sub_001" } },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(dbMocks.savePremiumEntitlement).not.toHaveBeenCalled();
  });

  it("returns a verification-only response for explicitly marked test events", async () => {
    const response = await postSimulatedEvent({
      ...checkoutEvent(),
      id: "evt_test_checkout_001",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ verified: true });
    expect(dbMocks.savePremiumEntitlement).not.toHaveBeenCalled();
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

  it("replays checkout deliveries through the idempotent database upsert path", async () => {
    const event = checkoutEvent({ id: "cs_live_duplicate_001" });
    const first = await postSimulatedEvent({ ...event, id: "evt_live_duplicate_001" });
    const second = await postSimulatedEvent({ ...event, id: "evt_live_duplicate_001" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(dbMocks.savePremiumEntitlement).toHaveBeenCalledTimes(2);
    expect(dbMocks.savePremiumEntitlement).toHaveBeenNthCalledWith(1, expect.objectContaining({ stripeCheckoutSessionId: "cs_live_duplicate_001" }));
    expect(dbMocks.savePremiumEntitlement).toHaveBeenNthCalledWith(2, expect.objectContaining({ stripeCheckoutSessionId: "cs_live_duplicate_001" }));
  });

  it("returns a retryable server error when entitlement projection fails", async () => {
    dbMocks.savePremiumEntitlement.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await postSimulatedEvent(checkoutEvent({ id: "cs_live_projection_failure" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook processing failed" });
  });
});
