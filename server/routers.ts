import { z } from "zod";
import Stripe from "stripe";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDailyDefaultPracticeId, getPremiumEntitlement, listPracticeFavorites, listPracticeHistory, recordPracticeCompletion, removePracticeFavorite, savePracticeFavorite, setDailyDefaultPractice, updatePracticeHistoryNote, updatePracticeHistoryReflection } from "./db";
import { premiumOffers } from "./payments/products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  premium: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const entitlement = await getPremiumEntitlement(ctx.user.id);
      return { hasAccess: Boolean(entitlement), offerKey: entitlement?.offerKey ?? null };
    }),
    createCheckoutSession: protectedProcedure
      .input(z.object({ offerKey: z.enum(["current_app_lifetime", "future_updates_lifetime"]) }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getPremiumEntitlement(ctx.user.id);
        if (existing) return { alreadyPremium: true as const, checkoutUrl: null };

        const offer = premiumOffers[input.offerKey];
        const origin = ctx.req.headers.origin;
        if (!origin) throw new Error("Checkout requires a browser origin.");
        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ price: offer.stripePriceId, quantity: 1 }],
          customer_email: ctx.user.email ?? undefined,
          client_reference_id: String(ctx.user.id),
          metadata: {
            user_id: String(ctx.user.id),
            customer_email: ctx.user.email ?? "",
            customer_name: ctx.user.name ?? "",
            offer_key: offer.key,
          },
          allow_promotion_codes: true,
          success_url: `${origin}/?checkout=success`,
          cancel_url: `${origin}/?checkout=cancelled`,
        });
        if (!session.url) throw new Error("Stripe did not return a checkout URL.");
        return { alreadyPremium: false as const, checkoutUrl: session.url };
      }),
  }),
  library: router({
    history: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
      .query(({ ctx, input }) => listPracticeHistory(ctx.user.id, input?.limit ?? 20)),
    favorites: protectedProcedure.query(({ ctx }) => listPracticeFavorites(ctx.user.id)),
    dailyDefault: protectedProcedure.query(({ ctx }) => getDailyDefaultPracticeId(ctx.user.id)),
    setDailyDefault: protectedProcedure
      .input(z.object({ practiceId: z.string().trim().min(1).max(96).nullable() }))
      .mutation(async ({ ctx, input }) => {
        await setDailyDefaultPractice(ctx.user.id, input.practiceId);
        return { success: true } as const;
      }),
    recordCompletion: protectedProcedure
      .input(z.object({ practiceId: z.string().trim().min(1).max(96) }))
      .mutation(async ({ ctx, input }) => {
        await recordPracticeCompletion(ctx.user.id, input.practiceId);
        return { success: true } as const;
      }),
    updateHistoryNote: protectedProcedure
      .input(z.object({ historyId: z.number().int().positive(), note: z.string().trim().max(1000).nullable() }))
      .mutation(async ({ ctx, input }) => {
        await updatePracticeHistoryNote(ctx.user.id, input.historyId, input.note || null);
        return { success: true } as const;
      }),
    updateHistoryReflection: protectedProcedure
      .input(z.object({ historyId: z.number().int().positive(), note: z.string().trim().max(1000).nullable(), moodTag: z.string().trim().max(48).nullable(), intentionTag: z.string().trim().max(64).nullable(), customTags: z.array(z.string().trim().min(1).max(32)).max(12).default([]) }))
      .mutation(async ({ ctx, input }) => {
        await updatePracticeHistoryReflection({ userId: ctx.user.id, historyId: input.historyId, note: input.note || null, moodTag: input.moodTag || null, intentionTag: input.intentionTag || null, customTags: Array.from(new Set(input.customTags)) });
        return { success: true } as const;
      }),
    saveFavorite: protectedProcedure
      .input(z.object({ practiceId: z.string().trim().min(1).max(96) }))
      .mutation(async ({ ctx, input }) => {
        await savePracticeFavorite(ctx.user.id, input.practiceId);
        return { success: true } as const;
      }),
    removeFavorite: protectedProcedure
      .input(z.object({ practiceId: z.string().trim().min(1).max(96) }))
      .mutation(async ({ ctx, input }) => {
        await removePracticeFavorite(ctx.user.id, input.practiceId);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
