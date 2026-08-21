# Daily Routine Tracking Code Structure

**Application:** The Energetic Safeguard  
**Scope:** Implemented Daily Routine, seven-day daily-hygiene plan, archive, print, and guarded ritual-routing structure  
**Author:** Manus AI

## 1. High-Level Structure

```text
client/src/
├── pages/
│   └── Home.tsx                         # Dashboard, routine screens, route state, and UI composition
├── lib/
│   ├── localPersistence.ts               # Browser-local routine, plan, archive, and counter data
│   ├── localPersistence.test.ts          # Persistence and counter tests
│   ├── liveSafetySelection.ts            # Live query → guarded ritual bridge
│   ├── liveSafetySelection.test.ts       # Bridge tests, including selected ritual candidates
│   ├── safetySelectionEngine.ts          # UI-independent safety selection engine
│   ├── dailyHygienePlanExport.ts         # Printable archived-plan HTML builder
│   └── dailyHygienePlanExport.test.ts    # Printable summary content/escaping tests
├── data/
│   ├── canonicalRituals.ts               # Typed adapter for the confirmed 18-ritual source
│   ├── canonicalRituals.test.ts          # Canonical catalog and route-default tests
│   └── catalog.ts                        # Dashboard flows, energy-hygiene metadata, symbolic support data
└── index.css                             # Daily Routine, plan, archive, and responsive styles

e2e/
├── daily-routine-card.spec.ts            # Dashboard quick-access card coverage
├── three-part-daily-routine.spec.ts      # Three-slot selection, guarded launch, 7/21-day milestones
└── energy-hygiene-split.spec.ts          # Daily-plan notes, reflections, archives, printing, and shortcut flows
```

## 2. Canonical Content Layer

The confirmed 18-ritual JSON catalog is adapted into the active runtime list by [`canonicalRituals.ts`](client/src/data/canonicalRituals.ts). Routine code does not define a second practice catalog. It resolves ritual IDs through the canonical adapter and uses flow categories to filter appropriate routine candidates.

| Concern | Source | Key behavior |
| --- | --- | --- |
| Active ritual runtime | `canonicalRituals.ts` | Exposes the active canonical ritual list and a ritual resolver. |
| Dashboard flow metadata | `catalog.ts` | Provides pathway cards, energy-hygiene moments, symbolic metadata, and copy. |
| Routine slot candidates | `Home.tsx` | Filters active rituals by `morning`, `protect`/`prepare`, or `hygiene` flow categories. |
| Practice view model | `practices.ts` type import | Keeps existing practice-compatible fields available to the UI and safety bridge. |

### Routine Slot Mapping

```ts
type DailyRoutineSlot = "morning" | "protection" | "evening";

const dailyRoutineSlots = [
  { id: "morning", category: "morning" },
  { id: "protection", category: "protect" },
  { id: "evening", category: "hygiene" },
];
```

The protection candidate list includes both `protect` and `prepare`, so the user may choose a ritual that supports a boundary or a demanding moment. The end-of-day slot uses `hygiene`, which includes transition and release-oriented canonical rituals.

## 3. Browser-Local Persistence Layer

[`localPersistence.ts`](client/src/lib/localPersistence.ts) is the single source of truth for all non-account routine state. Each helper must be pure apart from explicit load/save calls, and all loaders fail closed to sensible defaults when local storage is unavailable or malformed.

### Storage Keys

| Storage key | Data type | Role |
| --- | --- | --- |
| `energetic-safeguard:daily-routine:v1` | `DailyRoutine` | The three selected routine ritual IDs and opening-based habit state. |
| `energetic-safeguard:daily-hygiene-reminder:v1` | `DailyHygieneReminder` | Active seven-day plan, completion keys, notes, and reflection. |
| `energetic-safeguard:daily-hygiene-archive:v1` | `ArchivedDailyHygienePlan[]` | Completed seven-day plan snapshots, limited to the newest 30. |
| `energetic-safeguard:preferences:v1` | `UserPreferences` | General app preferences and saved energy-hygiene shortcut order. |

### Core Types

```ts
type DailyRoutineSlot = "morning" | "protection" | "evening";

interface DailyRoutine {
  selectedPracticeIds: Record<DailyRoutineSlot, string | null>;
  openedDayCount: number;                 // 0–21
  lastOpenedDate: string | null;          // YYYY-MM-DD
  lastCelebratedMilestone: 7 | 14 | 21 | null;
}

interface DailyHygieneReminder {
  startedAt: string;
  endsAt: string;
  lastPromptDate: string | null;
  completedDayKeys: string[];             // YYYY-MM-DD entries
  selectedPracticeId: string;
  completionNotes: Record<string, string>;
  reflectionNote: string;
}

interface ArchivedDailyHygienePlan extends DailyHygieneReminder {
  id: string;
  archivedAt: string;
}
```

### Important Helpers

| Helper | Inputs | Output / side effect |
| --- | --- | --- |
| `loadDailyRoutine()` | None | Validated `DailyRoutine` or a fully empty routine. |
| `saveDailyRoutine(routine)` | Routine object | Writes routine state to browser storage. |
| `setDailyRoutineRitual(routine, slot, id)` | Routine, slot, ritual ID | Returns an immutable routine update. |
| `recordDailyRoutineOpening(routine, now)` | Routine, optional time | Returns updated routine plus a 7/14/21 milestone when newly reached. |
| `createDailyHygieneReminder(id)` | Canonical ritual ID | Starts a clean seven-day plan. |
| `completeDailyHygieneForToday(plan)` | Active plan | Adds today’s calendar key once. |
| `setDailyHygieneNoteForToday(plan, note)` | Plan and note | Adds, updates, or removes an optional private day note. |
| `archiveDailyHygienePlan(plan)` | Completed plan | Adds/replaces a capped archive entry. |

## 4. Dashboard and View Composition

[`Home.tsx`](client/src/pages/Home.tsx) owns the client-side view-state union and composes routine UI in small in-file components. The model is intentionally catalog-driven: component code renders resolved ritual data rather than hardcoding practice scripts.

| Component or handler | Responsibility |
| --- | --- |
| `DailyRoutineQuickAccess` | Always-visible dashboard card; explains setup or the configured 21-day rhythm. |
| `DailyRoutineSetup` | Three-slot picker, milestone message, save control, and per-slot launch actions. |
| `DailyHygienePlanProgress` | Seven-day plan completion visualisation. |
| `DailyHygieneCompletionNote` | Optional private day-note step after an active daily-plan practice finishes. |
| `DailyHygieneReflection` | Day 7 reflection and archive exit. |
| `CompletedDailyHygienePlan` | Completed seven-day plan badge with repeat and alternate-ritual actions. |
| `ArchivedDailyHygienePlans` | Archived plan list with printable summary controls. |
| `openDailyRoutine()` | Records the opening, persists it, records a milestone, and routes to `daily-routine`. |
| `saveConfiguredDailyRoutine()` | Persists three chosen canonical ritual IDs. |
| `beginDailyRoutineRitual()` | Converts a routine slot and ritual ID to an intake-like query and invokes the guarded selector. |
| `beginEnergyHygienePractice()` | Launches the existing daily-hygiene or restoration practice path. |

### Relevant View States

```ts
type View =
  | "home"
  | "hygiene-choice"
  | "hygiene-restore"
  | "hygiene-daily"
  | "daily-ritual-picker"
  | "daily-routine"
  | "daily-note"
  | "daily-reflection"
  | "recommendation"
  | "practice"
  | "safety";
```

## 5. Guarded Ritual Launch Sequence

Each routine slot launch must preserve safety selection, even when the user explicitly chose a ritual. The selected ID is passed as the candidate set, not rendered directly.

```text
Daily Routine slot button
  → resolve canonical ritual
  → derive pathway/query from slot + ritual metadata
  → selectLiveSafetyAwarePractice(query, [ritual.id])
  → safety handoff OR guarded ritual recommendation
  → user starts practice
```

[`liveSafetySelection.ts`](client/src/lib/liveSafetySelection.ts) converts live query data and canonical practices into `SelectableRitual` records for [`safetySelectionEngine.ts`](client/src/lib/safetySelectionEngine.ts). Explicit danger terms, intensity restrictions, transit settings, adjustments, malformed state, and no-match conditions remain enforced at that layer.

## 6. Seven-Day Plan Sequence

```text
Choose canonical ritual
  → createDailyHygieneReminder(selectedPracticeId)
  → begin guarded practice
  → finish practice
  → optional private note
  → mark current day once
  → Day 7: optional reflection
  → archive snapshot
  → repeat same ritual OR start deterministic alternative
```

`dailyHygieneSessionActive` exists only while a practice is part of the active daily plan. It is cleared on non-completion exits, preventing unrelated practice completion from incorrectly incrementing the plan.

## 7. Printable Archive Summary

[`dailyHygienePlanExport.ts`](client/src/lib/dailyHygienePlanExport.ts) builds a print-only HTML document for an archived plan. It includes the selected ritual name, completion record, private day notes, and closing reflection. Content is escaped before insertion into HTML. `Home.tsx` opens a blank browser window, writes the generated document, closes it, and calls the browser print dialog.

## 8. Styling Boundaries

Routine styles are maintained in [`index.css`](client/src/index.css). Key selectors are grouped around the dashboard and routine UI:

| Selector family | Role |
| --- | --- |
| `.daily-routine-card*` | Dashboard quick-access card. |
| `.daily-routine-setup-card` | Three-slot configuration container. |
| `.daily-routine-slot*` | Individual routine category and catalog choices. |
| `.daily-routine-milestone` | Day 7, 14, and 21 acknowledgement presentation. |
| `.daily-routine-starts` | Per-slot ritual launch buttons. |
| `.daily-hygiene-progress*` | Seven-day plan counter. |
| `.daily-hygiene-complete-badge*` | Completed-plan summary and alternate invitation. |
| `.daily-hygiene-archive*` | Private archive and print controls. |

Mobile media rules collapse the three launch buttons to a single column and preserve full-width primary actions.

## 9. Test Map

| Test file | Coverage |
| --- | --- |
| `client/src/lib/localPersistence.test.ts` | Persisted routine slots, opening-count behavior, Day 7/14/21 milestones, seven-day plan notes, duplication, and archives. |
| `client/src/data/canonicalRituals.test.ts` | Confirmed active 18-ritual runtime and route-default validity. |
| `client/src/lib/liveSafetySelection.test.ts` | Selected canonical candidate behavior through the live safety bridge. |
| `client/src/lib/dailyHygienePlanExport.test.ts` | Printable summary content and escaped private text. |
| `e2e/daily-routine-card.spec.ts` | Dashboard card visibility and configured-routine route. |
| `e2e/three-part-daily-routine.spec.ts` | Three ritual selections, guarded launch, and 7/21-day UI milestones. |
| `e2e/energy-hygiene-split.spec.ts` | Day notes, Day 7 reflection, archive, alternative ritual, printing, and shortcut behavior. |
| `e2e/live-intake-safety.spec.ts` | Standard, urgent, high-intensity, very-high-intensity, and transit safeguards. |

## 10. Extension Rules

1. **Do not create a new active ritual in `Home.tsx`.** Add it to the confirmed catalog/adaptor first.
2. **Do not bypass `selectLiveSafetyAwarePractice()`.** Explicit routine selections are still candidates, not unconditional renders.
3. **Preserve local privacy.** Do not send routine notes, reflections, opening counts, or archive text to server procedures without an explicit product decision and migration.
4. **Keep counter semantics narrow.** Opening the card represents returning to the routine; it is not equivalent to clinical adherence or ritual completion.
5. **Use calendar-day keys consistently.** Avoid timestamp-only comparisons for day-based plan or habit state.
6. **Add both unit and browser coverage.** Persistence calculations need unit tests; route and UI interactions need Playwright coverage.

## 11. Validation Commands

```bash
pnpm check
pnpm test
pnpm run ci:validate
pnpm exec playwright test --workers=1
```

Run the browser suite serially in the local environment. The full test and build pipeline is defined in [`package.json`](package.json).
