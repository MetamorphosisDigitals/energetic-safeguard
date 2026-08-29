import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trialing", "active", "past_due", "canceled", "unpaid"]);
export const billingWebhookOutcomeEnum = pgEnum("billing_webhook_outcome", ["processing", "processed", "ignored", "failed"]);

/** Core user table backing the authentication flow. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Business access state for a completed lifetime purchase. Stripe remains the source
 * of truth for payments; this stores only the identifiers needed to grant access.
 */
export const premiumEntitlements = pgTable("premium_entitlements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  offerKey: varchar("offerKey", { length: 64 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("premium_entitlements_user_unique").on(table.userId),
  uniqueIndex("premium_entitlements_checkout_unique").on(table.stripeCheckoutSessionId),
]);

/**
 * A separate subscription projection for optional continuity and habit features.
 * This deliberately does not alter lifetime entitlements or guided-ritual access.
 */
export const subscriptionEntitlements = pgTable("subscription_entitlements", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  offerKey: varchar("offerKey", { length: 64 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 255 }),
  status: subscriptionStatusEnum("status").notNull().default("trialing"),
  currentPeriodEnd: timestamp("currentPeriodEnd", { withTimezone: true }),
  graceEndsAt: timestamp("graceEndsAt", { withTimezone: true }),
  lastInvoiceId: varchar("lastInvoiceId", { length: 255 }),
  lastPaidAt: timestamp("lastPaidAt", { withTimezone: true }),
  canceledAt: timestamp("canceledAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("subscription_entitlements_user_unique").on(table.userId),
  uniqueIndex("subscription_entitlements_subscription_unique").on(table.stripeSubscriptionId),
  index("subscription_entitlements_customer_idx").on(table.stripeCustomerId),
  index("subscription_entitlements_status_idx").on(table.status),
]);

/**
 * A durable idempotency and audit ledger for verified payment-provider events.
 * Payloads are intentionally not persisted: event IDs and projection outcomes are enough.
 */
export const billingWebhookEvents = pgTable("billing_webhook_events", {
  id: serial("id").primaryKey(),
  providerEventId: varchar("providerEventId", { length: 255 }).notNull(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  userId: integer("userId"),
  outcome: billingWebhookOutcomeEnum("outcome").notNull().default("processing"),
  errorCode: varchar("errorCode", { length: 96 }),
  providerCreatedAt: timestamp("providerCreatedAt", { withTimezone: true }),
  processedAt: timestamp("processedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("billing_webhook_events_provider_event_unique").on(table.providerEventId),
  index("billing_webhook_events_type_created_idx").on(table.eventType, table.createdAt),
  index("billing_webhook_events_user_idx").on(table.userId),
]);

/**
 * A compact activity record. It stores only the completed catalog-practice ID,
 * UTC completion time, and an optional user-authored private note.
 */
export const practiceHistory = pgTable("practice_history", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  practiceId: varchar("practiceId", { length: 96 }).notNull(),
  note: text("note"),
  moodTag: varchar("moodTag", { length: 48 }),
  intentionTag: varchar("intentionTag", { length: 64 }),
  customTags: text("customTags"),
  completedAt: timestamp("completedAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("practice_history_user_completed_idx").on(table.userId, table.completedAt)]);

/** A user-owned pointer into the practice catalog, rather than a duplicated meditation record. */
export const practiceFavorites = pgTable("practice_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  practiceId: varchar("practiceId", { length: 96 }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("practice_favorites_user_practice_unique").on(table.userId, table.practiceId),
]);

/** User-owned library preferences, kept separate from the authentication provider’s user store. */
export const userLibraryPreferences = pgTable("user_library_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  dailyDefaultPracticeId: varchar("dailyDefaultPracticeId", { length: 96 }),
  routineArchiveAutoBackup: boolean("routineArchiveAutoBackup").notNull().default(false),
  pinnedCustomTags: text("pinnedCustomTags"),
  defaultSavedFilterViewId: integer("defaultSavedFilterViewId"),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("user_library_preferences_user_unique").on(table.userId)]);

/**
 * A user-owned, opt-in cloud backup of a completed seven-day routine plan.
 * Each browser-generated client archive key can appear once per user, making
 * explicit and automatic backup retries idempotent.
 */
export const routinePlanArchives = pgTable("routine_plan_archives", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  clientArchiveKey: varchar("clientArchiveKey", { length: 128 }).notNull(),
  selectedPracticeId: varchar("selectedPracticeId", { length: 96 }).notNull(),
  startedAt: timestamp("startedAt", { withTimezone: true }).notNull(),
  endsAt: timestamp("endsAt", { withTimezone: true }).notNull(),
  archivedAt: timestamp("archivedAt", { withTimezone: true }).notNull(),
  completedDayKeys: text("completedDayKeys").notNull(),
  completionNotes: text("completionNotes").notNull(),
  reflectionNote: text("reflectionNote"),
  label: varchar("label", { length: 120 }),
  pinned: boolean("pinned").notNull().default(false),
  importedAt: timestamp("importedAt", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("routine_plan_archives_user_client_key_unique").on(table.userId, table.clientArchiveKey),
  index("routine_plan_archives_user_archived_idx").on(table.userId, table.archivedAt),
  index("routine_plan_archives_user_practice_idx").on(table.userId, table.selectedPracticeId),
  index("routine_plan_archives_user_pinned_idx").on(table.userId, table.pinned),
]);

/** User-owned reusable combinations of the existing note search and filter controls. */
export const practiceSavedFilterViews = pgTable("practice_saved_filter_views", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  keyword: varchar("keyword", { length: 128 }),
  customTag: varchar("customTag", { length: 32 }),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("practice_saved_filter_views_user_name_unique").on(table.userId, table.name),
  index("practice_saved_filter_views_user_updated_idx").on(table.userId, table.updatedAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PremiumEntitlement = typeof premiumEntitlements.$inferSelect;
export type InsertPremiumEntitlement = typeof premiumEntitlements.$inferInsert;
export type SubscriptionEntitlement = typeof subscriptionEntitlements.$inferSelect;
export type BillingWebhookEvent = typeof billingWebhookEvents.$inferSelect;
export type PracticeHistory = typeof practiceHistory.$inferSelect;
export type PracticeFavorite = typeof practiceFavorites.$inferSelect;
export type RoutinePlanArchive = typeof routinePlanArchives.$inferSelect;
export type InsertRoutinePlanArchive = typeof routinePlanArchives.$inferInsert;
