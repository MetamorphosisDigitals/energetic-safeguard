# Routine History Cloud Backup: Schema and API Draft

**Status:** Design draft only — no database migration, endpoint, or live routine behavior has been changed.  
**Scope:** Explicit backup of **completed** seven-day Daily Hygiene Plan archives for signed-in users.  
**Author:** Manus AI

## 1. Design Decisions

The current routine archive is browser-local. This design adds an optional cloud backup for completed plans only. It deliberately does **not** synchronize an active plan, the three-part Daily Routine configuration, or the 7/14/21-day opening counter in the first release. Those live states need a separate multi-device conflict policy.

| Decision | Draft choice | Reason |
| --- | --- | --- |
| Backup trigger | Explicit user action after sign-in | Local notes and reflections are private; no silent upload. |
| Record type | Dedicated `routine_plan_archives` table | A plan is an aggregate with multiple day notes and a final reflection, not a single practice-history row. |
| Deduplication | User-scoped `clientArchiveKey` | Repeated imports from a browser are safe and idempotent. |
| Local copies after backup | Retain by default | A successful backup never deletes browser-local content. |
| Active plan sync | Deferred | Avoids concurrent-device and partially completed-plan conflicts. |
| Ritual storage | Store canonical ritual ID only | Preserve the central 18-ritual library as the source of content. |

> The user should see a clear consent statement: “Back up completed plans from this device. Your selected ritual, day notes, and closing reflection will be saved to your account.”

## 2. Proposed Drizzle Schema

Add the following table to [`drizzle/schema.ts`](drizzle/schema.ts). It follows the current project conventions: integer user ownership, `text` fields for serialized structured values, UTC timestamps, and user-scoped indexes.

```ts
// Add `routinePlanArchives` to the existing Drizzle schema.
export const routinePlanArchives = mysqlTable("routine_plan_archives", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Browser-generated local archive ID, e.g. `daily-plan-2026-08-14T09:00:00.000Z`.
  // This is a client-origin idempotency key, not a trusted user identifier.
  clientArchiveKey: varchar("clientArchiveKey", { length: 128 }).notNull(),
  selectedPracticeId: varchar("selectedPracticeId", { length: 96 }).notNull(),

  // Source dates are normalized to UTC timestamps at import.
  startedAt: timestamp("startedAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  archivedAt: timestamp("archivedAt").notNull(),

  // JSON-encoded, server-validated snapshots of local archive data.
  // completionDayKeys: string[] of YYYY-MM-DD values, maximum 7.
  // completionNotes: Record<YYYY-MM-DD, string>, maximum 7 notes of <= 1000 chars.
  completedDayKeys: text("completedDayKeys").notNull(),
  completionNotes: text("completionNotes").notNull(),
  reflectionNote: text("reflectionNote"), // <= 1200 chars at API boundary

  importedAt: timestamp("importedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  uniqueIndex("routine_plan_archives_user_client_key_unique")
    .on(table.userId, table.clientArchiveKey),
  index("routine_plan_archives_user_archived_idx")
    .on(table.userId, table.archivedAt),
  index("routine_plan_archives_user_practice_idx")
    .on(table.userId, table.selectedPracticeId),
]);

export type RoutinePlanArchive = typeof routinePlanArchives.$inferSelect;
export type InsertRoutinePlanArchive = typeof routinePlanArchives.$inferInsert;
```

### Schema Rationale

| Field | Validation / invariant | Why it exists |
| --- | --- | --- |
| `userId` | Derived only from `ctx.user.id`; never accepted from the client. | Ownership boundary. |
| `clientArchiveKey` | Non-empty, max 128; unique with `userId`. | Prevents duplicate backup when an import is retried. |
| `selectedPracticeId` | Valid canonical ritual ID, max 96. | Keeps the plan connected to the central ritual catalog. |
| `startedAt`, `endsAt`, `archivedAt` | Valid ISO date-time input converted to UTC timestamp; `endsAt >= startedAt`. | Maintains reliable sort and plan chronology. |
| `completedDayKeys` | Unique valid `YYYY-MM-DD` keys, max 7. | Captures the plan’s day-level progress without duplicating completion rows. |
| `completionNotes` | Keys must be included in the day-key set; max 7 notes, each max 1000 chars. | Retains optional private reflections with bounded payloads. |
| `reflectionNote` | Optional, max 1200 chars. | Preserves the Day 7 closing insight. |

## 3. One-Time Migration Sequence

No migration should be applied merely by accepting this draft. When implementation is approved, use the project’s schema-first process.

| Step | Action | Checkpoint |
| --- | --- | --- |
| 1 | Add the Drizzle table and exported types above. | Type-check schema imports. |
| 2 | Run `pnpm drizzle-kit generate`. | Read the generated SQL before applying it. |
| 3 | Review the generated unique and user/date indexes. | Confirm no existing tables are altered or dropped. |
| 4 | Apply the migration using the approved database execution workflow. | Verify `routine_plan_archives` exists. |
| 5 | Add database helpers, router procedures, and tests. | Run server tests. |
| 6 | Add explicit import UI and dashboard history summary. | Validate signed-in and local-only flows. |

## 4. API Input Shapes

The API should be exposed in a new protected router namespace: `routineHistory`. Keep it separate from `library` initially because it represents structured plan aggregates rather than individual practice-history events.

```ts
import { z } from "zod";

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoDateTimeSchema = z.string().datetime({ offset: true });
const ritualIdSchema = z.string().trim().min(1).max(96).regex(/^[a-z0-9-]+$/);

const completionNotesSchema = z.record(dateKeySchema, z.string().trim().min(1).max(1000))
  .refine((notes) => Object.keys(notes).length <= 7, "A plan can contain at most seven notes.");

const routinePlanArchiveInput = z.object({
  clientArchiveKey: z.string().trim().min(1).max(128),
  selectedPracticeId: ritualIdSchema,
  startedAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema,
  archivedAt: isoDateTimeSchema,
  completedDayKeys: z.array(dateKeySchema).max(7).transform((keys) => Array.from(new Set(keys))),
  completionNotes: completionNotesSchema,
  reflectionNote: z.string().trim().max(1200).nullable(),
}).superRefine((plan, ctx) => {
  if (Date.parse(plan.endsAt) < Date.parse(plan.startedAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Plan end must be on or after plan start." });
  }
  const completed = new Set(plan.completedDayKeys);
  for (const dateKey of Object.keys(plan.completionNotes)) {
    if (!completed.has(dateKey)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["completionNotes", dateKey], message: "Notes require a completed plan day." });
    }
  }
});
```

### Canonical Ritual Validation

The current canonical catalog adapter is client-side. Before implementing the server procedure, promote a read-only canonical ritual ID list to a shared server-safe module, for example `shared/routineCatalog.ts`, or import an existing shared catalog representation. The import procedure should reject IDs not in the confirmed 18-ritual set. Syntax validation alone is not sufficient.

## 5. Proposed Protected tRPC Router

```ts
export const appRouter = router({
  // Existing routers omitted.
  routineHistory: router({
    summary: protectedProcedure.query(({ ctx }) =>
      getRoutinePlanArchiveSummary(ctx.user.id)
    ),

    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }).optional())
      .query(({ ctx, input }) =>
        listRoutinePlanArchives(ctx.user.id, input?.limit ?? 20)
      ),

    get: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .query(({ ctx, input }) =>
        getRoutinePlanArchiveById(ctx.user.id, input.archiveId)
      ),

    importLocalArchives: protectedProcedure
      .input(z.object({ archives: z.array(routinePlanArchiveInput).min(1).max(30) }))
      .mutation(async ({ ctx, input }) => {
        const validated = validateCanonicalArchiveRitualIds(input.archives);
        return importRoutinePlanArchives(ctx.user.id, validated);
      }),

    delete: protectedProcedure
      .input(z.object({ archiveId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const deleted = await deleteRoutinePlanArchive(ctx.user.id, input.archiveId);
        return { success: deleted } as const;
      }),
  }),
});
```

### Endpoint Contract

| Procedure | Authentication | Input | Output | Required behavior |
| --- | --- | --- | --- | --- |
| `routineHistory.summary` | Required | None | Archive count and latest safe metadata. | Do not include notes or reflection text. |
| `routineHistory.list` | Required | Bounded limit, later optional cursor. | User-owned archive summaries. | Sort by `archivedAt` descending. |
| `routineHistory.get` | Required | Positive `archiveId`. | Full single archive. | Return `null` or `NOT_FOUND` when ID is not owned by user. |
| `routineHistory.importLocalArchives` | Required | 1–30 validated local archives. | `{ inserted, existing, total }`. | Idempotent, atomic, and no deletion of local source data. |
| `routineHistory.delete` | Required | Positive `archiveId`. | `{ success }`. | Delete only a record owned by current user. |

## 6. Database Helper Contract

Add helpers to [`server/db.ts`](server/db.ts) using the existing user-scoped pattern.

| Helper | Signature | Notes |
| --- | --- | --- |
| `getRoutinePlanArchiveSummary` | `(userId) => Promise<{ count: number; latest: ... }>` | Return summary metadata only. |
| `listRoutinePlanArchives` | `(userId, limit) => Promise<RoutinePlanArchive[]>` | Query with `where(eq(table.userId, userId))`. |
| `getRoutinePlanArchiveById` | `(userId, archiveId) => Promise<RoutinePlanArchive \| null>` | Always use both predicates in one query. |
| `importRoutinePlanArchives` | `(userId, archives) => Promise<ImportResult>` | Use a transaction; find existing client keys, insert only missing values. |
| `deleteRoutinePlanArchive` | `(userId, archiveId) => Promise<boolean>` | Delete with both `userId` and `id` conditions. |

### Idempotent Import Algorithm

```text
BEGIN TRANSACTION
  1. Deduplicate request payload by clientArchiveKey.
  2. Query existing keys for current user only.
  3. Partition request into existing and missing archives.
  4. Insert missing archives with current userId and serialized bounded JSON text.
  5. Return inserted count, existing count, and total cloud count.
COMMIT
```

Do not update an existing archive during the initial import design. A duplicate should be treated as already backed up, not as a client-authoritative overwrite. This avoids a stale browser replacing a newer cloud copy.

## 7. Import UX Contract

The browser should call `loadArchivedDailyHygienePlans()` only after the user has signed in and explicitly requests backup. It should show a plan count and note that reflections and day notes are included.

```text
Signed-in dashboard
  → Routine History summary
  → local archive count detected on this device
  → “Back up N completed plans”
  → importLocalArchives mutation
  → success summary: inserted / already backed up
  → keep local archives by default
```

The first release should not clear the local archive after import. A later explicit “Remove device copies” action may be designed separately with an additional confirmation screen.

## 8. Authorization and Privacy Rules

| Rule | Requirement |
| --- | --- |
| User identity | Always derive from `ctx.user.id`; never accept a client `userId`. |
| Query scope | Every read, print-data fetch, and deletion combines archive ID with `userId`. |
| Notes and reflection | Treat as private user-authored content; omit from dashboard summary and analytics. |
| Log hygiene | Do not log request payloads containing notes or reflections. |
| Deletion | Require an explicit UI confirmation and report whether a user-owned row was deleted. |
| Backup consent | No automatic import or background synchronization. |
| Local retention | Successful import must not remove local content. |

## 9. Test Matrix

| Layer | Required test |
| --- | --- |
| Schema / migration | Table, unique `(userId, clientArchiveKey)` index, and user/date index are generated as expected. |
| Router validation | Reject non-canonical ritual ID, invalid dates, duplicate day keys after normalization, note key not in completed set, oversized notes/reflection, and batch >30. |
| Ownership | User B cannot list, get, or delete user A’s archive. |
| Import idempotency | Same client archive key imported twice produces one cloud row. |
| Transaction behavior | Batch import does not partially persist an invalid batch. |
| Local privacy | Import success does not call any local clear helper. |
| UI | Signed-in user sees a summary; local archives show opt-in backup; imported plans appear in Routine History. |
| Regression | Existing `library` history, favorites, notes, tags, filters, and daily default tests remain green. |

## 10. Definition of Done

The cloud-backup feature is ready for release only when a signed-in user can explicitly back up completed plans from the current device, safely retry the backup, see only their own plan history in the dashboard/library, print a retrieved archive, and delete a cloud copy with confirmation. Active plans, local Daily Routine configuration, and 21-day counters must remain browser-local unless a later synchronization specification is approved.

## Implementation References

| Reference | Reused convention |
| --- | --- |
| [`drizzle/schema.ts`](drizzle/schema.ts) | Existing user-owned table, timestamp, unique-index, and user/date-index patterns. |
| [`server/db.ts`](server/db.ts) | User-scoped database helper patterns. |
| [`server/routers.ts`](server/routers.ts) | Protected procedures and Zod validation style. |
| [`client/src/lib/localPersistence.ts`](client/src/lib/localPersistence.ts) | Existing local archive shape and field bounds. |
| [`ROUTINE_MILESTONE_REVIEW_AND_CLOUD_MIGRATION.md`](ROUTINE_MILESTONE_REVIEW_AND_CLOUD_MIGRATION.md) | Product-level migration scope and consent model. |
