import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type PremiumEntitlement = typeof premiumEntitlements.$inferSelect;
export type InsertPremiumEntitlement = typeof premiumEntitlements.$inferInsert;
