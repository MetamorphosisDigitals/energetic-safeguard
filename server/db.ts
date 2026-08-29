import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { InsertUser, practiceFavorites, practiceHistory, practiceSavedFilterViews, premiumEntitlements, routinePlanArchives, subscriptionEntitlements, userLibraryPreferences, users } from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { PremiumOfferKey } from "./payments/products";

let pool: Pool | null = null;
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
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Partial<InsertUser> = { lastSignedIn: values.lastSignedIn };
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
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
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
  await db.insert(premiumEntitlements).values(input).onConflictDoUpdate({
    target: premiumEntitlements.userId,
    set: {
      offerKey: input.offerKey,
      stripeCustomerId: input.stripeCustomerId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    },
  });
}

export async function getSubscriptionEntitlementByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(subscriptionEntitlements).where(eq(subscriptionEntitlements.stripeSubscriptionId, stripeSubscriptionId)).limit(1);
  return rows[0] ?? null;
}

export async function saveSubscriptionEntitlement(input: {
  userId: number; offerKey: string; stripeCustomerId: string; stripeSubscriptionId: string;
  stripePriceId: string | null; status: "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  currentPeriodEnd: Date | null; graceEndsAt: Date | null; lastInvoiceId: string | null; lastPaidAt: Date | null; canceledAt: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while projecting subscription state.");
  await db.insert(subscriptionEntitlements).values(input).onConflictDoUpdate({ target: subscriptionEntitlements.userId, set: input });
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
  await db.insert(userLibraryPreferences).values({ userId, pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { pinnedCustomTags: pinnedTags.length ? JSON.stringify(pinnedTags) : null } });
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
  await db.insert(practiceSavedFilterViews).values({ userId, ...input }).onConflictDoUpdate({ target: [practiceSavedFilterViews.userId, practiceSavedFilterViews.name], set: { keyword: input.keyword, customTag: input.customTag, startDate: input.startDate, endDate: input.endDate } });
}

export async function deletePracticeFilterView(userId: number, viewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while deleting a filter view.");
  await db.update(userLibraryPreferences).set({ defaultSavedFilterViewId: null }).where(and(eq(userLibraryPreferences.userId, userId), eq(userLibraryPreferences.defaultSavedFilterViewId, viewId)));
  await db.delete(practiceSavedFilterViews).where(and(eq(practiceSavedFilterViews.id, viewId), eq(practiceSavedFilterViews.userId, userId)));
}

export async function getDefaultPracticeFilterView(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const preference = await db.select({ viewId: userLibraryPreferences.defaultSavedFilterViewId }).from(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId)).limit(1);
  const viewId = preference[0]?.viewId;
  if (!viewId) return null;
  const view = await db.select().from(practiceSavedFilterViews).where(and(eq(practiceSavedFilterViews.id, viewId), eq(practiceSavedFilterViews.userId, userId))).limit(1);
  if (view[0]) return view[0];
  await db.update(userLibraryPreferences).set({ defaultSavedFilterViewId: null }).where(eq(userLibraryPreferences.userId, userId));
  return null;
}

export async function setDefaultPracticeFilterView(userId: number, viewId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while setting a default filter view.");
  if (viewId) {
    const view = await db.select({ id: practiceSavedFilterViews.id }).from(practiceSavedFilterViews).where(and(eq(practiceSavedFilterViews.id, viewId), eq(practiceSavedFilterViews.userId, userId))).limit(1);
    if (!view[0]) throw new Error("The selected filter view is unavailable.");
  }
  await db.insert(userLibraryPreferences).values({ userId, defaultSavedFilterViewId: viewId }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { defaultSavedFilterViewId: viewId } });
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
  await db.insert(userLibraryPreferences).values({ userId, dailyDefaultPracticeId: practiceId }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { dailyDefaultPracticeId: practiceId } });
}

export async function listPracticeFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(practiceFavorites).where(eq(practiceFavorites.userId, userId)).orderBy(desc(practiceFavorites.createdAt));
}

export async function savePracticeFavorite(userId: number, practiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving a favorite.");
  await db.insert(practiceFavorites).values({ userId, practiceId }).onConflictDoNothing({ target: [practiceFavorites.userId, practiceFavorites.practiceId] });
}

export async function removePracticeFavorite(userId: number, practiceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while removing a favorite.");
  await db.update(userLibraryPreferences).set({ dailyDefaultPracticeId: null }).where(and(eq(userLibraryPreferences.userId, userId), eq(userLibraryPreferences.dailyDefaultPracticeId, practiceId)));
  await db.delete(practiceFavorites).where(and(eq(practiceFavorites.userId, userId), eq(practiceFavorites.practiceId, practiceId)));
}

export type RoutinePlanArchiveBackupInput = {
  clientArchiveKey: string;
  selectedPracticeId: string;
  startedAt: Date;
  endsAt: Date;
  archivedAt: Date;
  completedDayKeys: string[];
  completionNotes: Record<string, string>;
  reflectionNote: string | null;
};

export type CloudRoutinePlanArchive = Omit<typeof routinePlanArchives.$inferSelect, "completedDayKeys" | "completionNotes"> & {
  completedDayKeys: string[];
  completionNotes: Record<string, string>;
};

function parseArchiveStringArray(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseArchiveNotes(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  } catch {
    return {};
  }
}

function hydrateRoutinePlanArchive(row: typeof routinePlanArchives.$inferSelect): CloudRoutinePlanArchive {
  return { ...row, completedDayKeys: parseArchiveStringArray(row.completedDayKeys), completionNotes: parseArchiveNotes(row.completionNotes) };
}

export async function getRoutineArchiveAutoBackup(userId: number) {
  const db = await getDb();
  if (!db) return false;
  const row = await db.select({ enabled: userLibraryPreferences.routineArchiveAutoBackup }).from(userLibraryPreferences).where(eq(userLibraryPreferences.userId, userId)).limit(1);
  return row[0]?.enabled ?? false;
}

export async function setRoutineArchiveAutoBackup(userId: number, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while saving your backup preference.");
  await db.insert(userLibraryPreferences).values({ userId, routineArchiveAutoBackup: enabled }).onConflictDoUpdate({ target: userLibraryPreferences.userId, set: { routineArchiveAutoBackup: enabled } });
  return enabled;
}

export async function listRoutinePlanArchives(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(routinePlanArchives).where(eq(routinePlanArchives.userId, userId)).orderBy(desc(routinePlanArchives.archivedAt)).limit(limit);
  return rows.map(hydrateRoutinePlanArchive);
}

export async function getRoutinePlanArchiveSummary(userId: number) {
  const rows = await listRoutinePlanArchives(userId, 50);
  const latest = rows[0];
  const lastBackupAt = rows.reduce<Date | null>((latestImport, row) => !latestImport || row.importedAt > latestImport ? row.importedAt : latestImport, null);
  return {
    count: rows.length,
    lastBackupAt,
    latest: latest ? { id: latest.id, selectedPracticeId: latest.selectedPracticeId, archivedAt: latest.archivedAt, completedCount: latest.completedDayKeys.length } : null,
  };
}

export async function getRoutinePlanArchiveById(userId: number, archiveId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(routinePlanArchives).where(and(eq(routinePlanArchives.id, archiveId), eq(routinePlanArchives.userId, userId))).limit(1);
  return rows[0] ? hydrateRoutinePlanArchive(rows[0]) : null;
}

export function deduplicateRoutinePlanArchiveInputs(archives: RoutinePlanArchiveBackupInput[]) {
  return Array.from(new Map(archives.map((archive) => [archive.clientArchiveKey, archive])).values());
}

export async function importRoutinePlanArchives(userId: number, archives: RoutinePlanArchiveBackupInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while backing up your completed plans.");
  const uniqueArchives = deduplicateRoutinePlanArchiveInputs(archives);
  const existingRows = await db.select({ clientArchiveKey: routinePlanArchives.clientArchiveKey }).from(routinePlanArchives).where(eq(routinePlanArchives.userId, userId));
  const existingKeys = new Set(existingRows.map((row) => row.clientArchiveKey));
  const missing = uniqueArchives.filter((archive) => !existingKeys.has(archive.clientArchiveKey));
  if (missing.length) {
    await db.insert(routinePlanArchives).values(missing.map((archive) => ({
      userId,
      clientArchiveKey: archive.clientArchiveKey,
      selectedPracticeId: archive.selectedPracticeId,
      startedAt: archive.startedAt,
      endsAt: archive.endsAt,
      archivedAt: archive.archivedAt,
      completedDayKeys: JSON.stringify(archive.completedDayKeys),
      completionNotes: JSON.stringify(archive.completionNotes),
      reflectionNote: archive.reflectionNote,
    })));
  }
  return { inserted: missing.length, existing: uniqueArchives.length - missing.length, total: existingKeys.size + missing.length };
}

export async function deleteRoutinePlanArchive(userId: number, archiveId: number) {
  const existing = await getRoutinePlanArchiveById(userId, archiveId);
  if (!existing) return false;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while deleting your archived plan.");
  await db.delete(routinePlanArchives).where(and(eq(routinePlanArchives.id, archiveId), eq(routinePlanArchives.userId, userId)));
  return true;
}

export async function updateRoutinePlanArchiveOrganization(userId: number, archiveId: number, input: { label: string | null; pinned: boolean }) {
  const existing = await getRoutinePlanArchiveById(userId, archiveId);
  if (!existing) return null;
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable while organizing your archived plan.");
  await db.update(routinePlanArchives).set({ label: input.label, pinned: input.pinned }).where(and(eq(routinePlanArchives.id, archiveId), eq(routinePlanArchives.userId, userId)));
  return getRoutinePlanArchiveById(userId, archiveId);
}


export async function closeDb() {
  if (pool) await pool.end();
  pool = null;
  database = null;
}
