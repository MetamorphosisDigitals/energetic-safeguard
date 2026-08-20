# Confirmed 18-Ritual Library Mapping

> **Scope.** This document treats the four category labels—Morning Energy Check-In, Pre-Meeting Protection, Grounding Reset, and Energy-Hygiene Guidance—as pathways, not rituals. The 18 named entries beneath them are the distinct rituals for the updated catalog.

| # | Confirmed ritual | Current coverage | Updated catalog action | Detailed implementation description |
|---:|---|---|---|---|
| 1 | Feet, Breath, Intention | Missing | Add distinct ritual | A 2-minute morning check-in using foot contact, optional natural breathing, and one realistic intention. It should remain usable with eyes open and should not require breath counting or forced breathing. |
| 2 | Soft Boundary Morning | Related to **Golden Day Boundary** | Separate distinct ritual | A gentler, morning-specific boundary practice. It uses optional soft visualization and a supportive statement rather than a performance or productivity frame. |
| 3 | Gentle Energy Wake-Up | Missing | Add distinct ritual | A low-demand activation sequence using hand warmth, small shoulder movement, and one next action. Movement remains optional and can be replaced by noticing physical support. |
| 4 | Five-Sense Arrival | Related to **Morning Arrival** | Separate distinct ritual | A fuller sensory arrival practice that explicitly samples color, sound, sensation, and one natural breath. It is distinct from capacity planning. |
| 5 | Pocket Anchor | Related to **Discreet Meeting Anchor** | Separate distinct ritual | A discreet pre-meeting anchor using a small object, texture, fingertip contact, or fabric. It should be usable in public without visible ritual behavior. |
| 6 | Three-Breath Boundary | Missing | Add distinct ritual | A short pre-interaction sequence of three unforced breaths paired with one clear boundary sentence. The ritual includes a non-breath alternative for users who prefer not to focus on breathing. |
| 7 | Breathable Protection | Related to **Rose Sphere Meeting Boundary** | Separate distinct ritual | A flexible, non-rigid visualization of personal space that can expand or soften with the user. It should be framed as optional imagery or intention. |
| 8 | Orient and Choose | Missing | Add distinct ritual | A situational preparation ritual that notices exits, stable objects, body placement, and available break options before an interaction or demanding space. |
| 9 | Five-Sense Orientation | Related to **Eyes-Open Orientation** | Separate distinct ritual | A broader grounding reset using sight, sound, body contact, physical sensation, and a neutral environmental detail. |
| 10 | Pressure and Release | Missing | Add distinct ritual | A gentle tension-release practice using optional hand pressure and release. It must provide an eyes-open, no-contact alternative. |
| 11 | One-Object Reset | Related to **Discreet Sensory Reset** | Separate distinct ritual | A compact focus reset using one nearby object as the attention anchor during racing thoughts, overload, or public-facing stress. |
| 12 | Easy Longer Exhale | Missing | Add distinct ritual | A breath-aware reset that invites, but never forces, a slightly longer exhale. It must explicitly permit normal breathing or a sensory alternative. |
| 13 | Energy Conservation Pause | Related to **Low-Energy Grounding** | Separate distinct ritual | A practical resource-protection pause that reduces effort, identifies what can wait, and selects available support such as water, food, quiet, or rest. |
| 14 | Transition Pause | Missing | Add distinct ritual | A short reset between roles, rooms, calls, tasks, or environments. It creates a deliberate threshold before the next demand. |
| 15 | End-of-Day Release | Present as **End-of-Day Release** | Retain and align copy | The existing overlap is retained, with movement, reflection, and optional visualization clearly defined as choices rather than requirements. |
| 16 | Screen Boundary Reset | Missing | Add distinct ritual | A digital boundary practice using visual distance, body release, notification boundaries, and one intentional screen decision. |
| 17 | Daily Boundary Question | Related to **Personal Boundary Reset** | Separate distinct ritual | A brief hygiene ritual that distinguishes the user’s experience from another person, request, situation, or emotion, then asks one boundary question. |
| 18 | Sensory Home Base | Missing | Add distinct ritual | A repeatable personal cue built from one calming texture, scent, sound, or object. The user can return to the same cue across days. |

## Catalog Integration Notes

The accompanying `rituals_18_catalog.json` contains exactly these 18 rituals. Each entry uses the application’s existing data vocabulary: pathway, duration, setting, style, accessibility tags, privacy requirement, optional Rose Ray or crystal metadata, keywords, guided steps, a short version, a closing check-in, and a safe alternative. The app can select entries deterministically from available time, preferred style, current setting, intensity, accessibility adjustments, and the user’s stated experience.

Existing history and favorite records remain compatible because each new ritual has its own stable identifier. Existing practices may remain in the legacy foundation catalog during migration, but the JSON file represents the requested canonical 18-ritual collection.
