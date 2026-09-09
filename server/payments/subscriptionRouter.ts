import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getCheckoutReturnOrigin, getStripeClient } from "./checkoutConfig";
import { getSubscriptionEntitlementByUserId } from "./subscriptionEntitlements";
import { getSubscriptionFeatureAccess } from "./subscriptionPolicy";
import { getSubscriptionPriceId, subscriptionProducts } from "./subscriptionProducts";

const subscriptionProductKeySchema = z.enum(["sanctuary_plus_monthly", "sanctuary_plus_annual"]);

export const subscriptionRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const entitlement = await getSubscriptionEntitlementByUserId(ctx.user.id);
    const access = getSubscriptionFeatureAccess(entitlement);
    return {
      plan: access.cloudContinuity || access.advancedHabitTools ? "plus" as const : "free" as const,
      offerKey: entitlement?.offerKey ?? null,
      status: entitlement?.status ?? null,
      currentPeriodEnd: entitlement?.currentPeriodEnd ?? null,
      graceEndsAt: entitlement?.graceEndsAt ?? null,
      ...access,
    };
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ offerKey: subscriptionProductKeySchema }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getSubscriptionEntitlementByUserId(ctx.user.id);
      const access = getSubscriptionFeatureAccess(existing);
      if (access.cloudContinuity || access.advancedHabitTools) {
        return { alreadySubscribed: true as const, checkoutUrl: null };
      }

      const product = subscriptionProducts[input.offerKey];
      const stripe = getStripeClient();
      const origin = getCheckoutReturnOrigin(ctx.req.headers.origin);
      const customer = existing?.stripeCustomerId
        ? { customer: existing.stripeCustomerId }
        : { customer_email: ctx.user.email ?? undefined };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: getSubscriptionPriceId(input.offerKey), quantity: 1 }],
        ...customer,
        client_reference_id: String(ctx.user.id),
        metadata: {
          user_id: String(ctx.user.id),
          offer_key: product.key,
        },
        subscription_data: {
          metadata: {
            user_id: String(ctx.user.id),
            offer_key: product.key,
          },
        },
        allow_promotion_codes: true,
        success_url: `${origin}/membership?checkout=success`,
        cancel_url: `${origin}/membership?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a Plus checkout URL.");
      return { alreadySubscribed: false as const, checkoutUrl: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await getSubscriptionEntitlementByUserId(ctx.user.id);
    if (!existing?.stripeCustomerId) throw new Error("No Stripe customer is connected to this account yet.");
    const origin = getCheckoutReturnOrigin(ctx.req.headers.origin);
    const session = await getStripeClient().billingPortal.sessions.create({
      customer: existing.stripeCustomerId,
      return_url: `${origin}/account`,
    });
    return { portalUrl: session.url };
  }),
});
