import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the authentication flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Business access state for a completed lifetime purchase. Stripe remains the source
 * of truth for payments; this stores only the identifiers needed to grant access.
 */
export const premiumEntitlements = mysqlTable("premium_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  offerKey: varchar("offerKey", { length: 64 }).notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("premium_entitlements_user_unique").on(table.userId),
  uniqueIndex("premium_entitlements_checkout_unique").on(table.stripeCheckoutSessionId),
]);

/**
 * A compact activity record. It stores only the completed catalog-practice ID,
 * UTC completion time, and an optional user-authored private note.
 */
export const practiceHistory = mysqlTable("practice_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  practiceId: varchar("practiceId", { length: 96 }).notNull(),
  note: text("note"),
  moodTag: varchar("moodTag", { length: 48 }),
  intentionTag: varchar("intentionTag", { length: 64 }),
  customTags: text("customTags"),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [index("practice_history_user_completed_idx").on(table.userId, table.completedAt)]);

/** A user-owned pointer into the practice catalog, rather than a duplicated meditation record. */
export const practiceFavorites = mysqlTable("practice_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  practiceId: varchar("practiceId", { length: 96 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("practice_favorites_user_practice_unique").on(table.userId, table.practiceId),
]);

/** User-owned library preferences, kept separate from the authentication provider’s user store. */
export const userLibraryPreferences = mysqlTable("user_library_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dailyDefaultPracticeId: varchar("dailyDefaultPracticeId", { length: 96 }),
  routineArchiveAutoBackup: boolean("routineArchiveAutoBackup").notNull().default(false),
  pinnedCustomTags: text("pinnedCustomTags"),
  defaultSavedFilterViewId: int("defaultSavedFilterViewId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("user_library_preferences_user_unique").on(table.userId)]);

/**
 * A user-owned, opt-in cloud backup of a completed seven-day routine plan.
 * Each browser-generated client archive key can appear once per user, making
 * explicit and automatic backup retries idempotent.
 */
export const routinePlanArchives = mysqlTable("routine_plan_archives", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientArchiveKey: varchar("clientArchiveKey", { length: 128 }).notNull(),
  selectedPracticeId: varchar("selectedPracticeId", { length: 96 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  archivedAt: timestamp("archivedAt").notNull(),
  completedDayKeys: text("completedDayKeys").notNull(),
  completionNotes: text("completionNotes").notNull(),
  reflectionNote: text("reflectionNote"),
  importedAt: timestamp("importedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("routine_plan_archives_user_client_key_unique").on(table.userId, table.clientArchiveKey),
  index("routine_plan_archives_user_archived_idx").on(table.userId, table.archivedAt),
  index("routine_plan_archives_user_practice_idx").on(table.userId, table.selectedPracticeId),
]);

/** User-owned reusable combinations of the existing note search and filter controls. */
export const practiceSavedFilterViews = mysqlTable("practice_saved_filter_views", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  keyword: varchar("keyword", { length: 128 }),
  customTag: varchar("customTag", { length: 32 }),
  startDate: varchar("startDate", { length: 10 }),
  endDate: varchar("endDate", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("practice_saved_filter_views_user_name_unique").on(table.userId, table.name),
  index("practice_saved_filter_views_user_updated_idx").on(table.userId, table.updatedAt),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PremiumEntitlement = typeof premiumEntitlements.$inferSelect;
export type InsertPremiumEntitlement = typeof premiumEntitlements.$inferInsert;
export type PracticeHistory = typeof practiceHistory.$inferSelect;
export type PracticeFavorite = typeof practiceFavorites.$inferSelect;
export type RoutinePlanArchive = typeof routinePlanArchives.$inferSelect;
export type InsertRoutinePlanArchive = typeof routinePlanArchives.$inferInsert;
