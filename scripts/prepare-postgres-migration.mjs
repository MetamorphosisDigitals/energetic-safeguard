import fs from "node:fs";

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing expected ${label}`);
  return source.replace(before, after);
}

const packagePath = "package.json";
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
delete packageJson.dependencies.mysql2;
packageJson.dependencies.pg = "^8.23.0";
packageJson.devDependencies["@types/pg"] = "^8.23.1";
packageJson.scripts["db:generate"] = "drizzle-kit generate";
packageJson.scripts["db:migrate"] = "drizzle-kit migrate";
packageJson.scripts["db:push"] = "pnpm db:generate && pnpm db:migrate";
fs.writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

fs.writeFileSync("drizzle.config.ts", `import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
`);

fs.writeFileSync("drizzle/schema.ts", `import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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
`);

let dbSource = fs.readFileSync("server/db.ts", "utf8");
dbSource = replaceExact(dbSource,
  'import { drizzle } from "drizzle-orm/mysql2";',
  'import { drizzle } from "drizzle-orm/node-postgres";\nimport { Pool } from "pg";',
  "MySQL Drizzle import",
);
dbSource = replaceExact(dbSource,
`let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      database = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      database = null;
    }
  }
  return database;
}`,
`let pool: Pool | null = null;
let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    try {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      database = drizzle({ client: pool });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      pool = null;
      database = null;
    }
  }
  return database;
}`,
  "database connection initializer",
);
dbSource = replaceExact(dbSource, 'const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };', 'const updateSet: Partial<InsertUser> = { lastSignedIn: values.lastSignedIn };', "user upsert update type");
dbSource = replaceExact(dbSource, 'await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });', 'await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });', "user upsert");
dbSource = replaceExact(dbSource,
`await db.insert(premiumEntitlements).values(input).onDuplicateKeyUpdate({
    set: {
      offerKey: input.offerKey,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
  });`,
`await db.insert(premiumEntitlements).values(input).onConflictDoUpdate({
    target: premiumEntitlements.userId,
    set: {
      offerKey: input.offerKey,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
  });`,
  "premium entitlement upsert",
);
dbSource = replaceExact(dbSource, 'await db.insert(subscriptionEntitlements).values(input).onDuplicateKeyUpdate({ set: input });', 'await db.insert(subscriptionEntitlements).values(input).onConflictDoUpdate({ target: subscriptionEntitlements.userId, set: input });', "subscription entitlement upsert");
dbSource = replaceExact(dbSource, 'await db.insert(userLibraryPreferences).values({ userId, pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null }).onDuplicateKeyUpdate({ set: { pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null } });', 'await db.insert(userLibraryPreferences).values({ userId, pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null } });', "pinned tags upsert");
dbSource = replaceExact(dbSource, 'await db.insert(practiceSavedFilterViews).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { keyword: input.keyword, customTag: input.customTag, startDate: input.startDate, endDate: input.endDate } });', 'await db.insert(practiceSavedFilterViews).values({ userId, ...input }).onConflictDoUpdate({ target: [practiceSavedFilterViews.userId, practiceSavedFilterViews.name], set: { keyword: input.keyword, customTag: input.customTag, startDate: input.startDate, endDate: input.endDate } });', "saved filter upsert");
dbSource = replaceExact(dbSource, 'await db.insert(userLibraryPreferences).values({ userId, defaultSavedFilterViewId: viewId }).onDuplicateKeyUpdate({ set: { defaultSavedFilterViewId: viewId } });', 'await db.insert(userLibraryPreferences).values({ userId, defaultSavedFilterViewId: viewId }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { defaultSavedFilterViewId: viewId } });', "default filter upsert");
dbSource = replaceExact(dbSource, 'await db.insert(userLibraryPreferences).values({ userId, dailyDefaultPracticeId: practiceId }).onDuplicateKeyUpdate({ set: { dailyDefaultPracticeId: practiceId } });', 'await db.insert(userLibraryPreferences).values({ userId, dailyDefaultPracticeId: practiceId }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { dailyDefaultPracticeId: practiceId } });', "daily default upsert");
dbSource = replaceExact(dbSource, 'await db.insert(practiceFavorites).values({ userId, practiceId }).onDuplicateKeyUpdate({ set: { practiceId } });', 'await db.insert(practiceFavorites).values({ userId, practiceId }).onConflictDoNothing({ target: [practiceFavorites.userId, practiceFavorites.practiceId] });', "favorite upsert");
dbSource = replaceExact(dbSource, 'await db.insert(userLibraryPreferences).values({ userId, routineArchiveAutoBackup: enabled }).onDuplicateKeyUpdate({ set: { routineArchiveAutoBackup: enabled } });', 'await db.insert(userLibraryPreferences).values({ userId, routineArchiveAutoBackup: enabled }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { routineArchiveAutoBackup: enabled } });', "backup preference upsert");
fs.writeFileSync("server/db.ts", dbSource);

fs.writeFileSync("server/payments/billingEventLedger.ts", `import { and, eq } from "drizzle-orm";
import { billingWebhookEvents } from "../../drizzle/schema";
import { getDb } from "../db";

type BillingEventInput = {
  providerEventId: string;
  eventType: string;
  userId: number | null;
  providerCreatedAt: Date | null;
};

async function readBillingWebhookEvent(providerEventId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reading the billing event.");
  const rows = await db.select().from(billingWebhookEvents).where(eq(billingWebhookEvents.providerEventId, providerEventId)).limit(1);
  return rows[0] ?? null;
}

async function reclaimFailedBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while reclaiming the billing event.");
  const reclaimed = await db
    .update(billingWebhookEvents)
    .set({
      eventType: input.eventType,
      userId: input.userId,
      outcome: "processing",
      errorCode: null,
      providerCreatedAt: input.providerCreatedAt,
      processedAt: null,
    })
    .where(and(eq(billingWebhookEvents.providerEventId, input.providerEventId), eq(billingWebhookEvents.outcome, "failed")))
    .returning({ id: billingWebhookEvents.id });

  if (reclaimed.length !== 1) {
    const event = await readBillingWebhookEvent(input.providerEventId);
    return { claimed: false, event };
  }

  const event = await readBillingWebhookEvent(input.providerEventId);
  return { claimed: true, event };
}

/**
 * Claims a verified provider event exactly once while allowing a previously failed
 * projection to be retried. PostgreSQL's unique constraint plus ON CONFLICT makes
 * concurrent first deliveries safe without relying on vendor-specific error codes.
 */
export async function claimBillingWebhookEvent(input: BillingEventInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while recording the billing event.");

  const existing = await readBillingWebhookEvent(input.providerEventId);
  if (existing) {
    if (existing.outcome === "failed") return reclaimFailedBillingWebhookEvent(input);
    return { claimed: false, event: existing };
  }

  const inserted = await db
    .insert(billingWebhookEvents)
    .values({ ...input, outcome: "processing" })
    .onConflictDoNothing({ target: billingWebhookEvents.providerEventId })
    .returning({ id: billingWebhookEvents.id });

  if (inserted.length === 0) {
    const concurrent = await readBillingWebhookEvent(input.providerEventId);
    if (concurrent?.outcome === "failed") return reclaimFailedBillingWebhookEvent(input);
    return { claimed: false, event: concurrent };
  }

  const event = await readBillingWebhookEvent(input.providerEventId);
  return { claimed: true, event };
}

export async function completeBillingWebhookEvent(
  providerEventId: string,
  outcome: "processed" | "ignored" | "failed",
  errorCode: string | null = null,
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(billingWebhookEvents)
    .set({ outcome, errorCode, processedAt: new Date() })
    .where(eq(billingWebhookEvents.providerEventId, providerEventId))
    .returning({ id: billingWebhookEvents.id });
}
`);

fs.writeFileSync("server/payments/billingEventLedger.test.ts", `import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  row: null as null | Record<string, unknown>,
  forceLostReclaim: false,
}));

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("../db", () => ({ getDb: getDbMock }));

function createFakeDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (fake.row ? [fake.row] : []),
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            if (fake.row) return [];
            fake.row = { id: 1, ...values, errorCode: null, processedAt: null };
            return [{ id: 1 }];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (values.outcome === "processing") {
              if (fake.forceLostReclaim || fake.row?.outcome !== "failed") return [];
              fake.row = { ...fake.row, ...values };
              return [{ id: 1 }];
            }
            if (!fake.row) return [];
            fake.row = { ...fake.row, ...values };
            return [{ id: 1 }];
          },
        }),
      }),
    }),
  };
}

import { claimBillingWebhookEvent, completeBillingWebhookEvent } from "./billingEventLedger";

const input = {
  providerEventId: "evt_retry_001",
  eventType: "invoice.paid",
  userId: 42,
  providerCreatedAt: new Date("2026-08-29T12:00:00.000Z"),
};

beforeEach(() => {
  fake.row = null;
  fake.forceLostReclaim = false;
  getDbMock.mockReset();
  getDbMock.mockResolvedValue(createFakeDb());
});

describe("billing webhook event ledger", () => {
  it("claims a new event exactly once", async () => {
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: true });
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
    expect(fake.row).toMatchObject({ providerEventId: input.providerEventId, outcome: "processing" });
  });

  it("reclaims the same provider event after a failed projection", async () => {
    await claimBillingWebhookEvent(input);
    await completeBillingWebhookEvent(input.providerEventId, "failed", "projection_failed");
    expect(fake.row).toMatchObject({ outcome: "failed", errorCode: "projection_failed" });

    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: true });
    expect(fake.row).toMatchObject({ outcome: "processing", errorCode: null, processedAt: null });
  });

  it("never reclaims an already processed event", async () => {
    fake.row = { id: 1, ...input, outcome: "processed", errorCode: null, processedAt: new Date() };
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
    expect(fake.row.outcome).toBe("processed");
  });

  it("does not double-claim when another delivery wins a failed-event reclaim", async () => {
    fake.row = { id: 1, ...input, outcome: "failed", errorCode: "projection_failed", processedAt: new Date() };
    fake.forceLostReclaim = true;
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
  });

  it("treats a concurrent first insert as an idempotent duplicate", async () => {
    fake.row = { id: 1, ...input, outcome: "processing", errorCode: null, processedAt: null };
    await expect(claimBillingWebhookEvent(input)).resolves.toMatchObject({ claimed: false });
  });
});
`);

fs.writeFileSync("POSTGRES_MIGRATION.md", `# PostgreSQL migration

Energetic Safeguard now targets PostgreSQL through Drizzle's node-postgres adapter.

## Runtime

Set \\`DATABASE_URL\\` to a standard PostgreSQL connection string, for example:

\\`postgresql://user:password@host:5432/database?sslmode=require\\`

The application uses a pooled \\`pg\\` connection and keeps the rest of the database API behind Drizzle.

## Schema and migrations

- Canonical schema: \\`drizzle/schema.ts\\`
- PostgreSQL migrations: \\`drizzle/postgres/\\`
- Legacy root-level \\`drizzle/000*.sql\\` files are the old MySQL history and must not be applied to PostgreSQL.
- Generate a migration with \\`pnpm db:generate\\`.
- Apply checked-in migrations with \\`pnpm db:migrate\\` after setting \\`DATABASE_URL\\`.

The PostgreSQL baseline is intentionally clean because this application has not established a production customer dataset. If an existing MySQL database contains data that must be retained, export and validate that data separately before switching production traffic; this code migration does not copy MySQL rows into PostgreSQL.

## Hosting portability

The runtime uses standard PostgreSQL rather than a vendor-specific database API, so the same code can connect to Netlify Database, Neon, Supabase, Render, Railway, or another PostgreSQL provider that exposes a compatible connection string.
`);

console.log("Prepared PostgreSQL migration candidate.");
