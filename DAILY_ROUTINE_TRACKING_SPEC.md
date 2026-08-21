# Daily Routine Tracking System Specification

**Application:** The Energetic Safeguard  
**Scope:** Daily Routine, seven-day daily-hygiene plan, completed-plan archive, and 21-day routine habit tracking  
**Status:** Implemented reference specification  
**Author:** Manus AI

## 1. Purpose and Product Boundary

The routine tracking system gives a user private, low-pressure ways to return to supportive practices over time. It contains two complementary mechanisms. The **Daily Hygiene Plan** is a selected ritual repeated across a seven-day reflective cycle. The **Daily Routine** is a broader, user-configured rhythm made of three ritual slots: a Morning Check-In, an Energy Protection ritual, and an End-of-Day Cleaning ritual.

All routine data is stored locally in the user’s browser. The system does not use lunar timing, health diagnosis, treatment claims, predictive content, or forced completion requirements. Rose Rays, crystals, imagery, movement, and breathing remain optional symbolic supports. Every selected ritual continues through the app’s safety-aware selection bridge before it can render.

> The system is designed to reward return and reflection, not to pressure a user into perfect adherence. Missing a day restarts the opening count without judgment.

## 2. User-Facing Capabilities

| Capability | User outcome | Persistence | Primary entry point |
| --- | --- | --- | --- |
| Daily Routine card | Opens an always-visible dashboard card for configuring or returning to a routine. | Local browser storage | Home dashboard |
| Three routine slots | Lets the user select one canonical ritual for morning, protection, and end-of-day support. | Local browser storage | Daily Routine setup screen |
| Seven-day hygiene plan | Lets the user repeat a chosen canonical ritual over seven days, with private day notes. | Local browser storage | Daily energy hygiene flow |
| Habit counter | Counts the first new calendar-day opening of the configured Daily Routine. | Local browser storage | Daily Routine card and setup screen |
| Milestones | Shows acknowledgements on Days 7 and 14, and a 21-day habit celebration. | Local browser storage | Daily Routine setup screen |
| Completion reflection | Invites an optional private closing insight after a completed Day 7 plan. | Local browser storage | Day 7 reflection screen |
| Completed-plan library | Archives completed seven-day plans for later review and printing. | Local browser storage | Home dashboard |

## 3. Daily Routine Configuration

The Daily Routine setup screen requires one user choice in each slot before it can be saved. The UI presents only category-appropriate entries from the confirmed 18-ritual catalog.

| Slot | Intent | Candidate rule | Example canonical ritual |
| --- | --- | --- | --- |
| Morning Check-In | Meet the day with steadiness, capacity awareness, or a realistic intention. | Ritual has the `morning` flow category. | Feet, Breath, Intention |
| Energy Protection | Support boundaries, attention, pace, or personal space before interactions. | Ritual has `protect` or `prepare`. | Pocket Anchor |
| End-of-Day Cleaning | Mark the end of a role, task, or day; release what can wait. | Ritual has `hygiene`. | End-of-Day Release |

The screen may show more than one candidate per slot. A user may change any choice before saving, and saving retains the same routine rather than creating a second program. The three selected values are canonical ritual IDs; no scripted practice content is duplicated in the view layer.

## 4. Opening-Based 21-Day Counter

The habit counter is deliberately based on **opening the Daily Routine card**, rather than claiming that a ritual was completed. This makes the counter an honest measure of return to the routine while keeping individual ritual completion separate.

| Condition | Counter behavior |
| --- | --- |
| First ever routine opening | Count becomes Day 1. |
| Second or later opening on the same calendar day | Count does not change. |
| First opening on the next calendar day | Count increases by one, capped at 21. |
| First opening after one or more missed calendar days | Count resets to Day 1. |
| Day 7 | Show a gentle acknowledgement. |
| Day 14 | Show a second gentle acknowledgement. |
| Day 21 | Show the “new habit” celebration. |
| Day 22 and later | Counter remains at 21; the 21-day celebration does not repeat automatically. |

The system retains the last calendar date opened and the last milestone celebrated. The milestone presentation can be dismissed without losing the count or routine choices.

## 5. Seven-Day Daily Hygiene Plan

The seven-day plan is separate from the 21-day Daily Routine counter. A user chooses a ritual from the confirmed 18-ritual catalog, then may complete one day at a time. The plan supports optional day notes and an optional Day 7 closing reflection.

| Plan event | Required behavior |
| --- | --- |
| Start a plan | Save start date, end date, chosen ritual ID, empty completion list, empty notes, and empty reflection. |
| Complete a daily ritual | Mark the current calendar day once and optionally save the day note. |
| Exit before completion | Clear the daily-plan session marker so an unrelated later practice cannot advance the plan. |
| Reach Day 7 | Present the Day 7 reflection experience after the daily practice is completed. |
| Save reflection or leave the reflection screen | Archive the completed plan privately. |
| Repeat plan | Start a clean seven-day cycle with the same selected ritual only. |
| Try alternate ritual | Start a clean cycle with a deterministic different canonical ritual. |

## 6. Safety and Consent Requirements

The Daily Routine and seven-day plan never bypass the validated safety system. Each chosen ritual is supplied as the candidate to the live selector and remains subject to explicit danger triggers, high-intensity logic, very-high-intensity eyes-open constraints, transit restrictions, malformed input handling, and no-match fallbacks.

| Requirement | Implementation expectation |
| --- | --- |
| Explicit selected ritual | Treat it as the candidate, not an unconditional command to render. |
| Urgent or high-risk input | Route to the safety-handoff state before a ritual recommendation is shown. |
| Transit | Allow only canonical rituals marked transit-safe. |
| Symbolic support | Phrase Rose Rays and crystals as optional symbolic supports; never require physical materials. |
| Language | Use invitations, options, and permission to pause, skip, adapt, or stop. |
| Routine counter | Never imply that opening the card is proof of wellness, success, or treatment adherence. |

## 7. Private Data Contract

The system stores two independent local objects. The names below are logical fields; the exact TypeScript interfaces are defined in the code-structure export.

| Object | Key fields | Privacy and retention |
| --- | --- | --- |
| `DailyRoutine` | Three selected ritual IDs, opening count, last opened date, last milestone celebrated. | Browser-local; retained until browser storage is cleared or overwritten. |
| `DailyHygieneReminder` | Seven-day dates, selected ritual ID, day keys, private day notes, final reflection. | Browser-local during an active plan. |
| `ArchivedDailyHygienePlan` | Snapshot of a completed plan plus archive metadata. | Browser-local; newest 30 plans are retained. |

No routine notes, reflection text, or selected ritual data is sent through the practice-history server flow merely because the user uses the local routine system. Signed-in practice history remains a separate user-owned feature.

## 8. Dashboard States

| State | Daily Routine card content | Primary action |
| --- | --- | --- |
| Unconfigured | Explains the three-part rhythm and asks the user to select the three rituals. | Set up daily routine |
| Configured, Day 1–20 | Shows the current opening day and confirms that all three rituals are ready. | Open daily routine |
| Day 7 or Day 14 opening | Opens the routine and presents a gentle milestone acknowledgement. | Continue to routine choices |
| Day 21 opening | Opens the routine and presents the new-habit celebration. | Continue to routine choices |
| Completed seven-day hygiene plan | Shows the existing plan-complete summary, repeat action, and alternate ritual invitation. | Repeat or try another plan |

## 9. Acceptance Criteria

| Area | Acceptance criterion |
| --- | --- |
| Routine setup | A user cannot save the three-part routine until all slots are populated with valid canonical ritual IDs. |
| Routine opening | Opening the card at most once per calendar day changes the count; a same-day reopen does not. |
| Counter reset | A missed calendar day changes the next opening to Day 1. |
| Milestones | Day 7 and Day 14 acknowledgements appear once; Day 21 shows the habit celebration once. |
| Selection safety | Launching any selected slot invokes the guarded selection bridge and may hand off rather than recommend. |
| Daily plan completion | A practice completed outside the active daily-plan route cannot mark the plan’s day complete. |
| Archive | Completed plans preserve selected ritual, completion keys, private notes, and reflection in the local archive. |
| Print | A printable archive summary includes the selected ritual, private notes, and closing reflection with escaped content. |
| Accessibility | Keyboard-visible buttons and semantic labels are available for routine selections, card actions, and milestones. |

## 10. Operational Validation

Use the following commands from the project root to validate this system after changes:

```bash
pnpm check
pnpm test
pnpm run ci:validate
pnpm exec playwright test --workers=1
```

The full browser suite is intentionally run serially to avoid browser-worker resource contention in the local environment. The routine-specific scenarios cover ritual configuration, guarded practice launch, Day 7 and Day 21 milestones, and the dashboard quick-access route.

## 11. Explicit Non-Goals

The current system does not provide calendar synchronization, push notifications, external health tracking, lunar timing, automatic ritual completion, server-side backup of local routine notes, or medical/therapeutic intervention. These remain separate product decisions.

## Implementation References

| Reference | Role |
| --- | --- |
| [`client/src/lib/localPersistence.ts`](client/src/lib/localPersistence.ts) | Private routine, daily-plan, archive, and counter persistence. |
| [`client/src/pages/Home.tsx`](client/src/pages/Home.tsx) | Dashboard card, setup flow, local route state, ritual launch, and milestone UI. |
| [`client/src/data/canonicalRituals.ts`](client/src/data/canonicalRituals.ts) | Confirmed active 18-ritual runtime source and ritual resolution. |
| [`client/src/lib/liveSafetySelection.ts`](client/src/lib/liveSafetySelection.ts) | Guarded bridge that validates ritual candidates before recommendation. |
| [`client/src/lib/dailyHygienePlanExport.ts`](client/src/lib/dailyHygienePlanExport.ts) | Printable completed-plan summary builder. |
