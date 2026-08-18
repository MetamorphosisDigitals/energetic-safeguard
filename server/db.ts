import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, practiceFavorites, practiceHistory, premiumEntitlements, userLibraryPreferences, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { PremiumOfferKey } from "./payments/products";

let database: ReturnType<typeof drizzle> | null = null;

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
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getPremiumEntitlement(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(premiumEntitlements).where(eq(premiumEntitlements.userId, userId)).limit(1);
  return result[0];
}

export async function savePremiumEntitlement(input: {
  userId: number;
  offerKey: PremiumOfferKey;
  stripeCustomerId: string | null;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while granting premium access.");
  await db.insert(premiumEntitlements).values(input).onDuplicateKeyUpdate({
    set: {
      offerKey: input.offerKey,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
  });
}

export async function recordPracticeCompletion(userId: number, practiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while recording practice history.");
  await db.insert(practiceHistory).values({ userId, practiceId });
}

export async function listPracticeHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceHistory).where(eq(practiceHistory.userId, userId)).orderBy(desc(practiceHistory.completedAt)).limit(limit);
}

export async function updatePracticeHistoryNote(userId: number, historyId: number, note: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving a private note.");
  await db.update(practiceHistory).set({ note }).where(and(eq(practiceHistory.id, historyId), eq(practiceHistory.userId, userId)));
}

export async function getDailyDefaultPracticeId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ practiceId: userLibraryPreferences.dailyDefaultPracticeId }).from(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId)).limit(1);
  return result[0]?.practiceId ?? null;
}

export async function setDailyDefaultPractice(userId: number, practiceId: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while setting a daily default.");
  if (practiceId) {
    const favorite = await db.select({ id: practiceFavorites.id }).from(practiceFavorites).where(and(eq(practiceFavorites.userId, userId), eq(practiceFavorites.practiceId, practiceId))).limit(1);
    if (!favorite[0]) throw new Error("A daily default must be one of your saved favorites.");
  }
  await db.insert(userLibraryPreferences).values({ userId, dailyDefaultPracticeId: practiceId }).onDuplicateKeyUpdate({ set: { dailyDefaultPracticeId: practiceId } });
}

export async function listPracticeFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceFavorites).where(eq(practiceFavorites.userId, userId)).orderBy(desc(practiceFavorites.createdAt));
}

export async function savePracticeFavorite(userId: number, practiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving a favorite.");
  await db.insert(practiceFavorites).values({ userId, practiceId }).onDuplicateKeyUpdate({ set: { practiceId } });
}

export async function removePracticeFavorite(userId: number, practiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while removing a favorite.");
  await db.update(userLibraryPreferences).set({ dailyDefaultPracticeId: null }).where(and(eq(userLibraryPreferences.userId, userId), eq(userLibraryPreferences.dailyDefaultPracticeId, practiceId)));
  await db.delete(practiceFavorites).where(and(eq(practiceFavorites.userId, userId), eq(practiceFavorites.practiceId, practiceId)));
}
