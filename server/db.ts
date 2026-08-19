import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, practiceFavorites, practiceHistory, practiceSavedFilterViews, premiumEntitlements, userLibraryPreferences, users } from "../drizzle/schema";
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

export async function updatePracticeHistoryReflection(input: {
  userId: number;
  historyId: number;
  note: string | null;
  moodTag: string | null;
  intentionTag: string | null;
  customTags: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving a private reflection.");
  await db.update(practiceHistory).set({ note: input.note, moodTag: input.moodTag, intentionTag: input.intentionTag, customTags: input.customTags.length ? JSON.stringify(input.customTags) : null }).where(and(eq(practiceHistory.id, input.historyId), eq(practiceHistory.userId, input.userId)));
}

function parseStoredCustomTags(value: string | null) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === "string") : [];
  } catch { return []; }
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => { const key = tag.toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}

export async function listUserCustomTags(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ customTags: practiceHistory.customTags }).from(practiceHistory).where(eq(practiceHistory.userId, userId));
  return uniqueTags(rows.flatMap((row) => parseStoredCustomTags(row.customTags))).sort((left, right) => left.localeCompare(right));
}

export async function replaceUserCustomTag(userId: number, sourceTag: string, targetTag: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while updating custom tags.");
  const rows = await db.select({ id: practiceHistory.id, customTags: practiceHistory.customTags }).from(practiceHistory).where(eq(practiceHistory.userId, userId));
  const sourceKey = sourceTag.toLocaleLowerCase();
  for (const row of rows) {
    const original = parseStoredCustomTags(row.customTags);
    const updated = uniqueTags(original.flatMap((tag) => tag.toLocaleLowerCase() === sourceKey ? (targetTag ? [targetTag] : []) : [tag]));
    if (JSON.stringify(original) !== JSON.stringify(updated)) {
      await db.update(practiceHistory).set({ customTags: updated.length ? JSON.stringify(updated) : null }).where(and(eq(practiceHistory.id, row.id), eq(practiceHistory.userId, userId)));
    }
  }
  const sourceKeyForPreferences = sourceTag.toLocaleLowerCase();
  const preferenceRows = await db.select({ pinnedCustomTags: userLibraryPreferences.pinnedCustomTags }).from(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId)).limit(1);
  const updatedPinnedTags = uniqueTags(parseStoredCustomTags(preferenceRows[0]?.pinnedCustomTags ?? null).flatMap((tag) => tag.toLocaleLowerCase() === sourceKeyForPreferences ? (targetTag ? [targetTag] : []) : [tag]));
  if (preferenceRows[0]) {
    await db.update(userLibraryPreferences).set({ pinnedCustomTags: updatedPinnedTags.length ? JSON.stringify(updatedPinnedTags) : null }).where(eq(userLibraryPreferences.userId, userId));
  }
  const savedViews = await db.select({ id: practiceSavedFilterViews.id, customTag: practiceSavedFilterViews.customTag }).from(practiceSavedFilterViews).where(eq(practiceSavedFilterViews.userId, userId));
  for (const view of savedViews) {
    if (view.customTag?.toLocaleLowerCase() === sourceKeyForPreferences) {
      await db.update(practiceSavedFilterViews).set({ customTag: targetTag }).where(and(eq(practiceSavedFilterViews.id, view.id), eq(practiceSavedFilterViews.userId, userId)));
    }
  }
}

export async function getPinnedCustomTags(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ tags: userLibraryPreferences.pinnedCustomTags }).from(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId)).limit(1);
  return uniqueTags(parseStoredCustomTags(result[0]?.tags ?? null));
}

export async function setPinnedCustomTags(userId: number, requestedTags: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while pinning custom tags.");
  const availableTags = await listUserCustomTags(userId);
  const availableByKey = new Map(availableTags.map((tag) => [tag.toLocaleLowerCase(), tag]));
  const pinnedTags = uniqueTags(requestedTags.map((tag) => availableByKey.get(tag.toLocaleLowerCase())).filter((tag): tag is string => Boolean(tag)));
  await db.insert(userLibraryPreferences).values({ userId, pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null }).onDuplicateKeyUpdate({ set: { pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null } });
  return pinnedTags;
}

export type SavedPracticeFilterInput = { name: string; keyword: string | null; customTag: string | null; startDate: string | null; endDate: string | null };

export async function listSavedPracticeFilterViews(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceSavedFilterViews).where(eq(practiceSavedFilterViews.userId, userId)).orderBy(desc(practiceSavedFilterViews.updatedAt));
}

export async function savePracticeFilterView(userId: number, input: SavedPracticeFilterInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving a filter view.");
  await db.insert(practiceSavedFilterViews).values({ userId, ...input }).onDuplicateKeyUpdate({ set: { keyword: input.keyword, customTag: input.customTag, startDate: input.startDate, endDate: input.endDate } });
}

export async function deletePracticeFilterView(userId: number, viewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while deleting a filter view.");
  await db.delete(practiceSavedFilterViews).where(and(eq(practiceSavedFilterViews.id, viewId), eq(practiceSavedFilterViews.userId, userId)));
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
