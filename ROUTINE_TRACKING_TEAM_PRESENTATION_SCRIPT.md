# Routine Tracking System: Team Presentation Script

**Audience:** Product, design, engineering, content, and QA  
**Suggested duration:** 10–12 minutes  
**Presenter:** Manus AI

## Slide 1 — Why We Built Routine Tracking

**On screen:** *A gentle rhythm, not a performance system.*

**Speaker script:**

“The Energetic Safeguard began as a moment-based practice guide. Routine tracking adds a second layer: a way for someone to return to supportive practices over time without turning wellness into another demand. The system is intentionally private, consent-based, and grounded. It rewards opening the routine and reflecting on what helps; it does not claim to measure health, compliance, or personal worth.”

“There are now two related experiences. A seven-day Daily Hygiene Plan supports one repeated ritual with optional daily notes and a closing reflection. The new Daily Routine is broader: users choose a Morning Check-In, an Energy Protection ritual, and an End-of-Day Cleaning ritual.”

## Slide 2 — The Product Model

**On screen:**

```text
Daily Routine (21-day return rhythm)
  ├─ Morning Check-In
  ├─ Energy Protection
  └─ End-of-Day Cleaning

Daily Hygiene Plan (7-day reflective cycle)
  ├─ One chosen ritual
  ├─ Optional daily note
  ├─ Day 7 reflection
  └─ Private archive
```

**Speaker script:**

“These experiences are complementary, not competing. The Daily Routine gives the user a three-part structure around the day. The seven-day plan is a focused reflection cycle around one ritual. A user can use either or both. The system does not require all three routine rituals to be completed for the day to count; the counter measures returning to the routine card on a new day.”

## Slide 3 — The 18-Ritual Architecture Stays Intact

**On screen:** *One canonical ritual library. Multiple user journeys.*

**Speaker script:**

“A key architectural decision is that we did not create a parallel set of routine-only practices. The confirmed 18 rituals remain the sole active selectable library. The three routine slots filter that canonical list by category: morning rituals for Morning Check-In, protection or preparation rituals for Energy Protection, and hygiene rituals for End-of-Day Cleaning.”

“This prevents duplicated scripts, keeps future content governance clear, and means the same ritual metadata supports routine setup, recommendation, Saved Support, practice history, and safety logic.”

## Slide 4 — Safety Is Preserved Even for User Choices

**On screen:**

```text
User selects routine ritual
  → canonical ritual lookup
  → live safety bridge
  → safety handoff OR recommendation
  → guided practice
```

**Speaker script:**

“A selected routine ritual is not rendered automatically. It is treated as a candidate and sent through the same live safety bridge as every other practice. That preserves explicit danger handoffs, high-intensity logic, very-high-intensity constraints, transit restrictions, and fallback behavior.”

“This is important because personalization should never weaken the safety boundary. The routine may be personally chosen, but it still remains responsive to the moment the user is in.”

## Slide 5 — The Opening-Based Habit Counter

**On screen:** *Open the routine on a new day. Build a gentle return rhythm.*

| Event | Result |
| --- | --- |
| First opening | Day 1 |
| Same-day reopen | No count change |
| Next calendar-day opening | Add one day |
| Missed calendar day | Restart at Day 1 |
| Day 7 | Gentle acknowledgement |
| Day 14 | Gentle acknowledgement |
| Day 21 | New-habit celebration |

**Speaker script:**

“The counter is deliberately simple. It counts the first time the configured Daily Routine card is opened on a new calendar day. It does not claim that a ritual was completed, and it does not create shame if a day is missed. If the user misses a calendar day, the next opening simply starts a new Day 1.”

“At Day 7 and Day 14, the UI acknowledges the rhythm. At Day 21, it celebrates a new habit. The count caps at 21 and does not keep replaying the celebration.”

## Slide 6 — Seven-Day Plan, Reflection, and Archive

**On screen:** *One ritual. Seven days. Optional insight.*

**Speaker script:**

“The seven-day plan lets a user choose a canonical ritual, complete one supported check-in per day, add optional private notes, and write a Day 7 reflection. Once complete, the plan is saved into a private archive. Users can repeat the same plan, try a deterministic alternative ritual, or print a summary.”

“The archive keeps the selected ritual, calendar-day completions, day notes, and reflection. The printable output uses escaped content so user-authored text is not injected as HTML.”

## Slide 7 — Privacy and the Cloud Boundary

**On screen:**

| Cloud-backed now | Browser-local now |
| --- | --- |
| Signed-in practice history, favorites, notes, tags, saved filters | Daily Routine choices, 21-day counter, active seven-day plan, plan notes, reflections, archived plans |

**Speaker script:**

“The app already has cloud-backed Saved Support features for signed-in users. But the routine system is currently browser-local by design. That means it is private to the device and does not automatically follow a user to another browser or device.”

“This is a deliberate privacy position, not a platform limitation. It also means the routine archive is not yet a cloud backup. If we change that, we should make the user’s consent explicit.”

## Slide 8 — Current Coverage and Review Findings

**On screen:** *Strong baseline, targeted gaps before cloud migration.*

**Speaker script:**

“The routine flow currently has unit coverage for selected ritual persistence and the Day 7, Day 14, and Day 21 counter transitions. Browser coverage verifies the three-slot setup, guarded ritual launch, the Day 7 acknowledgement, and the Day 21 celebration. The latest recorded full validation included 74 unit tests and 26 serial browser scenarios.”

“The review identifies a few focused additions before cloud migration: explicit same-day reopen coverage, missed-day reset coverage, visible Day 14 browser coverage, no-repeat behavior after a milestone, and confirmation that dismissing a milestone does not change the count.”

## Slide 9 — Proposed Cloud History Migration

**On screen:** *Backup completed plans first. Do not sync active routine state yet.*

**Speaker script:**

“The recommended first cloud migration is intentionally narrow. We should migrate only completed seven-day plan archives into a signed-in Routine History library. We should not automatically sync the active plan, the live 21-day counter, or Daily Routine choices in the first phase.”

“The user would see an explicit option: ‘Back up completed plans from this device.’ The import would be idempotent through a per-user client archive key. It would preserve the local copy by default, so a successful upload never deletes private browser data.”

## Slide 10 — Dashboard and Data Design

**On screen:**

```text
Home Dashboard
  └─ Routine History summary
       ├─ latest plan / archive count
       ├─ import completed plans from this device
       └─ View routine history

Saved Support
  └─ Routine Plans detail panel
       ├─ ritual and date filters
       ├─ print summary
       └─ private note disclosure on demand
```

**Speaker script:**

“On the dashboard, Routine History should stay concise: show a latest plan, count, and route to the full library. The detailed experience belongs in Saved Support, where the app already has patterns for user-owned data, filtering, export, and history. We should use a dedicated routine-plan table rather than stretching the single-practice history table beyond its data model.”

## Slide 11 — Team Decisions Needed

**On screen:**

1. Approve explicit import rather than automatic upload.
2. Approve a dedicated routine-plan archive table.
3. Confirm whether active routine state should remain device-local in phase one.
4. Prioritize the identified milestone regression tests.

**Speaker script:**

“The most important product decision is consent. We recommend manual backup first. The next decision is data architecture: a separate routine-plan archive table protects the structure of the existing practice history. Finally, we should keep active routine state local during phase one, because syncing live counters and in-progress plans introduces conflict resolution questions that do not need to block archival backup.”

## Slide 12 — Close

**On screen:** *Grounded architecture, gentle milestones, explicit privacy.*

**Speaker script:**

“The routine tracking system now gives users a coherent rhythm across the day, a gentle way to recognize seven, fourteen, and twenty-one days of returning, and a private reflection archive. The architecture remains catalog-driven, safety-aware, and honest about what is stored locally versus in the cloud. Our next step is not to expand indiscriminately; it is to preserve that clarity while offering a user-controlled path to back up completed plans.”

## Supporting References

| Document | Use |
| --- | --- |
| [`DAILY_ROUTINE_TRACKING_SPEC.md`](DAILY_ROUTINE_TRACKING_SPEC.md) | Product and technical behavior. |
| [`DAILY_ROUTINE_TRACKING_CODE_STRUCTURE.md`](DAILY_ROUTINE_TRACKING_CODE_STRUCTURE.md) | File, type, route, and test map. |
| [`ROUTINE_MILESTONE_REVIEW_AND_CLOUD_MIGRATION.md`](ROUTINE_MILESTONE_REVIEW_AND_CLOUD_MIGRATION.md) | Acceptance review, cloud boundary, and migration plan. |
