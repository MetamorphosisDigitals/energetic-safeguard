import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [uniqueIndex("user_library_preferences_user_unique").on(table.userId)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PremiumEntitlement = typeof premiumEntitlements.$inferSelect;
export type InsertPremiumEntitlement = typeof premiumEntitlements.$inferInsert;
export type PracticeHistory = typeof practiceHistory.$inferSelect;
export type PracticeFavorite = typeof practiceFavorites.$inferSelect;
