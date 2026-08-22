# The Energetic Safeguard: Pre-Day 14 Re-Engagement Campaign

## Campaign Purpose

This campaign supports users who begin a Daily Routine and then pause before reaching the 14-day marker. It treats a pause as information, not failure. The purpose is to make return easy by reducing choice, offering a small next step, and respecting every user’s right not to be contacted.

> **User-facing principle:** “You have not fallen behind. You can return in the way that fits today.”

## Eligibility and Suppression Rules

The campaign may only target a user who has an active, incomplete Daily Routine between Day 1 and Day 13, has consented to the relevant communication channel, and has not opened the Daily Routine for the defined pause window. “Churn” may be used internally for reporting, but never in user-facing language.

| Condition | Campaign treatment |
| --- | --- |
| User has opened their routine today | Suppress all re-engagement messages. |
| User has completed the plan or reached Day 14 | Exit this campaign and use the appropriate milestone journey. |
| User paused lifecycle messages or unsubscribed | Suppress all email and push messages. In-app messaging remains dismissible and should not repeat in the same session. |
| User has recently interacted with a safety handoff | Do not use behavioral targeting from the handoff. Offer only the normal, non-personalized product entry when they return. |
| User has already received two re-engagement messages in a seven-day window | Suppress further outreach for seven days. |

## Cadence

| Moment | Trigger | Channel priority | Goal |
| --- | --- | --- |
| **Gentle return** | Three calendar days without opening an active routine | In-app first; email only with consent | Make returning feel easy. |
| **Smaller next step** | Seven calendar days without opening an active routine | Email or optional push; in-app on next visit | Offer one low-friction ritual, not the whole plan. |
| **Keep or change** | Day 12 is approaching and the routine remains inactive | In-app and one final email with consent | Offer to continue, simplify, or change the ritual. |
| **Quiet reset** | No interaction after the final message | No more campaign outreach for 21 days | Respect the pause. |

## Message 1 — Gentle Return

**Timing:** Three days after the last routine opening.

**In-app title:** Your routine is still here.

**In-app body:** A pause does not undo what you have been building. If today has room for one small return, choose the ritual that feels most supportive now.

**Primary CTA:** Open my Daily Routine  
**Secondary CTA:** Find a one-minute reset  
**Dismiss:** Not now

**Email subject options:**

1. Your routine is still here when you want it
2. One small return is enough
3. There is no need to catch up

**Email body:**

You do not need to make up missed days. Your Daily Routine is still available exactly where you left it, and you can return with one small ritual whenever it feels useful.

Choose the part of your rhythm that fits today: a Morning Check-In, a little Energy Protection, or an End-of-Day Cleaning ritual.

**CTA:** Open my Daily Routine

## Message 2 — Smaller Next Step

**Timing:** Seven days after the last routine opening, only if Message 1 did not lead to a routine opening.

**In-app title:** Make the next step smaller.

**In-app body:** You do not have to restart the whole rhythm today. Try one short ritual, then decide what comes next.

**Primary CTA:** Try a one-minute reset  
**Secondary CTA:** Choose a different ritual

**Email subject options:**

1. Make the next step smaller
2. One ritual can be enough for today
3. A lighter way back to your rhythm

**Email body:**

If the full routine feels like too much today, you do not have to do all of it. Choose one ritual that gives you a little more room: a brief arrival, a protective pause before an interaction, or a gentle close to the day.

There is no score to repair. There is only the next moment you choose to support.

**CTA:** Choose one ritual

## Message 3 — Keep or Change

**Timing:** On Day 12, if the routine remains incomplete and the user has not opened it for at least five days.

**In-app title:** Keep what fits. Change what does not.

**In-app body:** Your routine can stay the same, become lighter, or take a different shape. Choose the next version that feels more like you.

**Primary CTA:** Adjust my routine  
**Secondary CTA:** Continue where I left off

**Email subject options:**

1. Keep what fits. Change what does not.
2. Your routine can take a different shape
3. Choose the rhythm that fits this week

**Email body:**

You are close to the two-week marker, but the number is not the point. What matters is whether your routine still supports the life you are living now.

You can continue with the same Morning Check-In, Energy Protection, and End-of-Day Cleaning rituals. Or you can choose a lighter rhythm, change one ritual, or simply return when the moment is right.

**CTA:** Adjust my routine

## Optional Cloud Continuity Message

Cloud backup should not appear in Messages 1 or 2. It may appear only after a user returns, completes a plan, or explicitly opens cloud history. The message should be factual and optional: “If you would like to keep completed plans available across devices, you can back them up to your account by choice.” It must never be positioned as necessary for access to a ritual or a return to the routine.

## Measurement Framework

Use aggregate, product-action metrics rather than reflection or note content. The primary measures are: routine reopen rate within 72 hours of each message, completion progression to Day 14, one-minute-reset use, suppression and unsubscribe rate, and message dismissal rate. Compare the cadence against a holdout group before expanding the campaign.

## Operational Safeguards

The campaign should be frequency capped, channel-consent aware, and stopped immediately when the user resumes their routine. It must not include location-specific emergency advice, clinical claims, or language that suggests a missed day is failure. The campaign should not infer wellbeing, mood, or personal circumstances from absence alone.
