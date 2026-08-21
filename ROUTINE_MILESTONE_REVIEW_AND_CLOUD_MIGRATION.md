# Routine Milestone Review and Cloud History Migration Plan

**Application:** The Energetic Safeguard  
**Scope:** Review of the implemented 7, 14, and 21-day Daily Routine milestones, plus a proposed migration of completed seven-day plan archives into the signed-in dashboard  
**Status:** Review and implementation plan; no cloud migration has been applied  
**Author:** Manus AI

## 1. Current Cloud-Saving Answer

The app is **partially cloud-backed today**. Signed-in practice history, favorites, private history notes, tags, daily default, and saved filters are stored through the MySQL/Drizzle-backed library. The Daily Routine configuration, opening counter, active seven-day plan, private plan notes, reflections, and archived plans are currently stored only in browser-local storage.

| Data domain | Current storage | Available across browsers/devices? |
| --- | --- | --- |
| Signed-in practice completions and Saved Support data | Cloud database, scoped to the authenticated user | Yes |
| Daily Routine three-slot configuration | Browser local storage | No |
| 7/14/21-day opening counter | Browser local storage | No |
| Active seven-day plan, notes, and reflection | Browser local storage | No |
| Archived completed seven-day plans | Browser local storage, capped at 30 | No |

This distinction is intentional in the current implementation: local routine data is private by default and is not silently uploaded.

## 2. Milestone Acceptance Criteria Review

The Daily Routine counter records a return to the routine card, not ritual completion. It uses calendar-day keys and is capped at 21. Missing a calendar day resets the next opening to Day 1.

| Acceptance criterion | Current implementation | Unit coverage | Browser coverage | Assessment |
| --- | --- | --- | --- | --- |
| First configured opening begins the rhythm | Counter becomes Day 1 through `recordDailyRoutineOpening`. | Indirectly covered through helper behavior. | Indirectly exercised by routine card setup. | Adequate; add an explicit Day 1 assertion for clarity. |
| Same-day reopen does not increment | Helper returns unchanged state for the same date. | Not explicit. | Not explicit. | **Coverage gap.** Add a unit and browser regression test. |
| Consecutive new calendar day increments | Helper adds one when the date gap is exactly one day. | Covered through seeded Day 7/14/21 transitions. | Covered indirectly through seeded milestone state. | Adequate for milestone transitions; add direct Day 1→2 test. |
| Missed day resets to Day 1 | Helper resets when the date gap is not one day. | Not explicit. | Not explicit. | **Coverage gap.** Add a unit test and dashboard assertion. |
| Day 7 milestone appears once | Returns milestone `7` when newly reached. | Explicitly asserted. | Heading “7 days of returning.” asserted. | Covered. |
| Day 14 milestone appears once | Returns milestone `14` when newly reached. | Explicitly asserted. | Not visually asserted. | Partially covered; add browser test. |
| Day 21 celebration appears once | Returns milestone `21`, caps count at 21, and the UI renders the celebration. | Explicitly asserted for milestone/count. | Heading “This rhythm is yours now.” asserted. | Covered for initial appearance; add no-repeat assertion. |
| Milestone dismissal preserves count | UI clears only transient milestone state. | Not explicit. | Not explicit. | **Coverage gap.** Add browser regression test. |
| Selected ritual retains safety controls | Routine ritual launch uses the live safety bridge with the selected ritual candidate. | Live safety bridge test includes selected canonical candidate. | Selected morning ritual renders through guarded flow. | Covered. |

## 3. Recommended Coverage Additions

Before cloud migration begins, add these targeted tests. They strengthen correctness without changing product scope.

| Priority | Test | Layer | Expected assertion |
| --- | --- | --- | --- |
| P0 | Same-day reopen | Unit + browser | Opening the routine twice on the same date leaves `openedDayCount` unchanged. |
| P0 | Missed-day reset | Unit + browser | An opening after a gap greater than one day produces count `1`. |
| P1 | Day 14 UI | Browser | A seeded Day 13 routine shows the Day 14 acknowledgement. |
| P1 | Milestone no-repeat | Unit | Opening after a previously celebrated milestone returns no new milestone. |
| P1 | Celebration dismissal | Browser | Dismissing a milestone hides it without resetting count or selected ritual IDs. |
| P2 | 21-day cap | Unit | Day 22 or later retains count `21` and does not re-emit a milestone. |

## 4. Cloud Migration Goal

The first migration should move **only completed seven-day plan archives** into a signed-in Routine History library. It should not automatically migrate the live Daily Routine, active plan, or opening counter. This keeps the first cloud scope narrow, protects user autonomy, and prevents accidental synchronization of incomplete or transient local state.

> Recommended consent model: when a signed-in user opens Routine History, offer “Back up completed plans from this device” with a transparent count and a clear explanation that notes and reflections will be saved to their account.

## 5. Proposed Cloud Data Model

Create a new user-owned `routine_plan_archives` table rather than overloading `practice_history`. A completed seven-day plan is a structured cycle with many day entries and one reflection; it is not a single practice completion.

| Column | Type / limit | Purpose |
| --- | --- | --- |
| `id` | Auto-increment primary key | Server record identifier. |
| `userId` | Integer, indexed | Ownership boundary; every query must scope by this value. |
| `clientArchiveKey` | Varchar(128), unique per user | Idempotency key derived from the current local plan archive ID. |
| `selectedPracticeId` | Varchar(96) | Canonical ritual pointer; never duplicate ritual scripts. |
| `startedAt` | Timestamp | Plan start time. |
| `endedAt` | Timestamp | Planned or completed end time. |
| `completedDayKeys` | Text JSON | Completed calendar-day keys only. |
| `completionNotes` | Text JSON | Optional private day-note map. |
| `reflectionNote` | Text nullable | Optional Day 7 closing reflection. |
| `archivedAt` | Timestamp | Original local archive time, when available. |
| `createdAt`, `updatedAt` | Timestamps | Server audit and ordering. |

Use a unique index on `(userId, clientArchiveKey)` to make repeated imports safe. Use a user/date index such as `(userId, archivedAt)` for dashboard lists.

## 6. Migration Sequence

| Phase | Work | User-visible behavior | Safety / privacy requirement |
| --- | --- | --- | --- |
| 0. Schema | Add the archive table, Drizzle migration, query helpers, and protected router procedures. | No UI change. | No data movement. |
| 1. Read-only cloud library | Add a signed-in Routine History panel in Saved Support and a compact latest-plan card on Home. | Users can view cloud plans once available. | All reads scoped by authenticated user. |
| 2. Explicit local import | Detect local archives only on the device where they exist; offer a count and import button. | User chooses whether to back up plans. | No automatic upload; show that notes/reflections are included. |
| 3. Idempotent upload | Send each local archive with `clientArchiveKey`; server ignores duplicates for the same user. | Safe retry after a network interruption. | Validate lengths, calendar keys, and canonical ritual ID shape. |
| 4. Verification and local-retention choice | Confirm imported count and leave local copies untouched by default. | User may keep local copies or later choose a separate deletion flow. | Never delete local private notes as part of import. |
| 5. Dashboard integration | Show latest archived plan, archive count, and “View routine history” in the main dashboard. | Faster access without crowding Home. | Avoid showing private note snippets by default. |

## 7. Suggested Dashboard Design

The main dashboard should show a concise **Routine History** summary below the Daily Routine card:

| Element | Content |
| --- | --- |
| Header | “Routine History” with archived-plan count. |
| Latest plan line | Canonical ritual name, archive date, and completed check-in count. |
| Privacy cue | “Saved to your account” only when cloud data exists. |
| Primary action | “View routine history.” |
| Empty signed-in state | “Back up completed plans from this device” when local archives exist. |
| Empty global state | “Your completed seven-day plans can live here.” |

The detailed library should live in Saved Support / Practice History as a dedicated **Routine Plans** tab or panel. It should support a printable view, ritual filter, date filter, and private-note disclosure only after the user opens an individual plan.

## 8. API and Ownership Plan

Add protected `routineHistory` procedures parallel to the existing `library` router patterns.

| Procedure | Input | Behavior |
| --- | --- | --- |
| `routineHistory.list` | Optional limit / cursor | Lists only the current user’s cloud archives. |
| `routineHistory.importLocalArchives` | Array of validated local archives, max bounded batch | Upserts by `(userId, clientArchiveKey)`. |
| `routineHistory.get` | Positive archive ID | Returns the archive only if owned by current user. |
| `routineHistory.delete` | Positive archive ID | Deletes only a current-user archive after a confirmation UI. |
| `routineHistory.printData` | Positive archive ID | Returns only current-user structured data for the existing print helper. |

The server must not trust a user ID supplied by the browser. It should derive ownership only from `ctx.user.id`, following the existing protected procedure patterns.

## 9. Migration Test Plan

| Test category | Required coverage |
| --- | --- |
| Schema / helper | Insert, list, idempotent import, and delete for a single user. |
| Ownership | A second user cannot list, read, print, or delete another user’s archive. |
| Validation | Reject invalid calendar keys, oversize notes/reflections, malformed JSON, and excessive batch size. |
| Import | Repeating the same import does not create duplicates. |
| UI | Signed-in user sees cloud history; local-only archive user sees explicit import offer. |
| Privacy | Local archive remains intact after successful cloud import unless the user separately confirms deletion. |
| Regression | Existing practice history, favorites, notes, tags, and daily defaults continue to work. |

## 10. Risks and Decisions Needed

| Decision | Recommendation |
| --- | --- |
| Upload timing | Explicit manual import first; consider optional automatic backup only after a separate consent design. |
| Data sensitivity | Treat day notes and reflections as private user-authored content; do not put them in analytics or search indexes. |
| Existing local archive size | Cap import batch size, then allow pagination/retry. The current local archive cap is 30. |
| Multi-device conflict | Import completed archives only; last-write-wins is not appropriate for active-plan state in the first release. |
| Account sign-out | Preserve local data on the device; do not merge it into another account without renewed consent. |

## Implementation References

| Reference | Current role |
| --- | --- |
| [`client/src/lib/localPersistence.ts`](client/src/lib/localPersistence.ts) | Local routine, plan, and archived-plan state. |
| [`client/src/lib/localPersistence.test.ts`](client/src/lib/localPersistence.test.ts) | Existing milestone and local archive coverage. |
| [`e2e/three-part-daily-routine.spec.ts`](e2e/three-part-daily-routine.spec.ts) | Visible Day 7 and Day 21 routine milestone coverage. |
| [`drizzle/schema.ts`](drizzle/schema.ts) | Existing cloud-backed user library schema; no routine archive table yet. |
| [`server/db.ts`](server/db.ts) | Existing user-scoped cloud helper patterns. |
| [`server/routers.ts`](server/routers.ts) | Existing protected library procedure patterns. |
| [`client/src/components/PracticeHistoryTools.tsx`](client/src/components/PracticeHistoryTools.tsx) | Existing signed-in history UI target for a future Routine Plans panel. |
