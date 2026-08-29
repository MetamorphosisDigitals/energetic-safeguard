import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { deletePracticeFilterView, deleteRoutinePlanArchive, getDailyDefaultPracticeId, getDefaultPracticeFilterView, getPinnedCustomTags, getPremiumEntitlement, getRoutineArchiveAutoBackup, getRoutinePlanArchiveById, getRoutinePlanArchiveSummary, importRoutinePlanArchives, listPracticeFavorites, listPracticeHistory, listRoutinePlanArchives, listSavedPracticeFilterViews, listUserCustomTags, recordPracticeCompletion, removePracticeFavorite, replaceUserCustomTag, savePracticeFavorite, savePracticeFilterView, setDailyDefaultPractice, setDefaultPracticeFilterView, setPinnedCustomTags, setRoutineArchiveAutoBackup, updatePracticeHistoryNote, updatePracticeHistoryReflection, updateRoutinePlanArchiveOrganization } from "./db";
import { getCheckoutReturnOrigin, getStripeClient } from "./payments/checkoutConfig";
import { premiumOffers } from "./payments/products";
import { isCanonicalRitualId } from "@shared/canonicalRitualIds";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const routineArchiveInputSchema = z.object({
  clientArchiveKey: z.string().trim().min(1).max(128),
  selectedPracticeId: z.string().trim().min(1).max(96).regex(/^[a-z0-9-]+$/).refine(isCanonicalRitualId, "Choose a ritual from the confirmed library."),
  startedAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  archivedAt: z.string().datetime(),
  completedDayKeys: z.array(dateKeySchema).max(7),
  completionNotes: z.record(dateKeySchema, z.string().trim().min(1).max(1000)),
  reflectionNote: z.string().trim().max(1200).nullable(),
}).superRefine((archive, ctx) => {
  if (Date.parse(archive.endsAt) < Date.parse(archive.startedAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Plan end must be on or after plan start." });
  const completed = new Set(archive.completedDayKeys);
  if (completed.size !== archive.completedDayKeys.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["completedDayKeys"], message: "Completed plan days must be unique." });
  for (const key of Object.keys(archive.completionNotes)) {
    if (!completed.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["completionNotes", key], message: "A note can only be saved for a completed plan day." });
  }
});

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
        const origin = getCheckoutReturnOrigin(ctx.req.headers.origin);
        const session = await getStripeClient().checkout.sessions.create({
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
    customTags: protectedProcedure.query(({ ctx }) => listUserCustomTags(ctx.user.id)),
    pinnedCustomTags: protectedProcedure.query(({ ctx }) => getPinnedCustomTags(ctx.user.id)),
    setPinnedCustomTags: protectedProcedure
      .input(z.object({ tags: z.array(z.string().trim().min(1).max(32)).max(12) }))
      .mutation(({ ctx, input }) => setPinnedCustomTags(ctx.user.id, input.tags)),
    replaceCustomTag: protectedProcedure
      .input(z.object({ sourceTag: z.string().trim().min(1).max(32), targetTag: z.string().trim().min(1).max(32).nullable() }))
      .mutation(async ({ ctx, input }) => {
        await replaceUserCustomTag(ctx.user.id, input.sourceTag, input.targetTag || null);
        return { success: true } as const;
      }),
    savedFilterViews: protectedProcedure.query(({ ctx }) => listSavedPracticeFilterViews(ctx.user.id)),
    defaultFilterView: protectedProcedure.query(({ ctx }) => getDefaultPracticeFilterView(ctx.user.id)),
    setDefaultFilterView: protectedProcedure
      .input(z.object({ viewId: z.number().int().positive().nullable() }))
      .mutation(async ({ ctx, input }) => { await setDefaultPracticeFilterView(ctx.user.id, input.viewId); return { success: true } as const; }),
    saveFilterView: protectedProcedure
      .input(z.object({ name: z.string().trim().min(1).max(64), keyword: z.string().trim().max(128).nullable(), customTag: z.string().trim().max(32).nullable(), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }))
      .mutation(async ({ ctx, input }) => { await savePracticeFilterView(ctx.user.id, input); return { success: true } as const; }),
    deleteFilterView: protectedProcedure
      .input(z.object({ viewId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => { await deletePracticeFilterView(ctx.user.id, input.viewId); return { success: true } as const; }),
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
  routineHistory: router({
    summary: protectedProcedure.query(({ ctx }) => getRoutinePlanArchiveSummary(ctx.user.id)),
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).optional() }).optional())
      .query(({ ctx, input }) => listRoutinePlanArchives(ctx.user.id, input?.limit ?? 20)),
    get: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .query(({ ctx, input }) => getRoutinePlanArchiveById(ctx.user.id, input.archiveId)),
    restore: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .mutation(({ ctx, input }) => getRoutinePlanArchiveById(ctx.user.id, input.archiveId)),
    importLocalArchives: protectedProcedure
      .input(z.object({ archives: z.array(routineArchiveInputSchema).min(1).max(30) }))
      .mutation(({ ctx, input }) => importRoutinePlanArchives(ctx.user.id, input.archives.map((archive) => ({
        ...archive,
        startedAt: new Date(archive.startedAt),
        endsAt: new Date(archive.endsAt),
        archivedAt: new Date(archive.archivedAt),
        completedDayKeys: Array.from(new Set(archive.completedDayKeys)),
      })))),
    autoBackup: protectedProcedure.query(({ ctx }) => getRoutineArchiveAutoBackup(ctx.user.id)),
    setAutoBackup: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ ctx, input }) => setRoutineArchiveAutoBackup(ctx.user.id, input.enabled)),
    delete: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => ({ success: await deleteRoutinePlanArchive(ctx.user.id, input.archiveId) })),
    organize: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive(), label: z.string().trim().min(1).max(120).nullable(), pinned: z.boolean() }))
      .mutation(({ ctx, input }) => updateRoutinePlanArchiveOrganization(ctx.user.id, input.archiveId, { label: input.label, pinned: input.pinned })),
  }),
});

export type AppRouter = typeof appRouter;
