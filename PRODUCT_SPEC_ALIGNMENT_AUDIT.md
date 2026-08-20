# Product Specification Alignment Audit

## Overall Assessment

The application is **partially aligned** with the attached specification. Its brand, mobile-first guided experience, structured data direction, Rose Ray and crystal governance, visible pathways, and base safety screen are aligned. The main gap is architectural rather than visual: the live app still recommends from the legacy **15-practice** `practices.ts` data set, while the confirmed **18-ritual** JSON catalog and its safety-aware selector remain reference artifacts rather than the active runtime source.

> **Recommendation:** retain the confirmed 18 rituals as the sole selectable catalog, then migrate the live app to that catalog before extending more content or variants.

## Alignment Matrix

| Specification area | Current state | Alignment | Required reconciliation |
|---|---|---:|---|
| Brand and tagline | Visible application uses **The Energetic Safeguard** and the specified tagline. | Aligned | No action. |
| Product purpose and voice | The interface is a decision tool with consent-led language, one recommendation, guided steps, and completion check-in. | Largely aligned | Audit newer copy against the approved consent-language list during catalog migration. |
| Five primary pathways | Morning, Protection, Ground & Reset, Hygiene, and Preparation exist. One-Minute Reset is available as a persistent quick action rather than a sixth primary pathway. | Aligned | Preserve this hierarchy. |
| Pathway-specific intake | The live app uses a shared three-step intake. The attached specification calls for richer, pathway-specific questions. | Partial | Add pathway intake adapters that normalize answers into the canonical selector’s tags. |
| Shared response | The recommendation, guided practice, shorter option, and closing check-in exist. | Largely aligned | Add a consistent **What I’m Hearing** renderer driven by normalized intake answers. |
| Adjustments | Avoid breath, visualization, movement, eyes-open, and discreet choices exist. | Partial | Add **avoid touch** and map it to `no-touch` ritual metadata. |
| Structured practice library | Practices are data-driven, not authored inside React screens. | Aligned in principle | Make `rituals_18_catalog.json` the active runtime source instead of the legacy 15-practice file. |
| Canonical ritual count | The live catalog contains 15 active practices. A separate validated JSON file contains the confirmed 18 rituals. | Not aligned | Complete the 15-to-18 migration before calling the catalog complete. |
| Deterministic recommendation | The live app has deterministic scoring and adjustment handling. | Partial | Route runtime selection through the new safety-aware 18-ritual engine. |
| High-intensity safety | A validated safety selector exists as reference code. The live UI currently routes a limited set of danger-language matches directly to safety. | Partial | Integrate the selector before the live recommendation screen; use its high-intensity, transit, and no-safe-ritual decisions. |
| Safety handoff UI | A clear Pause Here screen, eyes-open orientation, and one-minute follow-up action exist. A real browser E2E scenario passes. | Largely aligned | Add the specified physical-safety question after a user reports becoming more overwhelmed. |
| Rose Rays and crystals | Ten Rose Rays and the specified optional crystal library are cataloged. Copy makes them optional symbolic supports. | Aligned | Keep Black Rose governance consistent with the canonical architecture: optional protective modifier unless the product decision changes. |
| Seven-day hygiene commitment | A persisted seven-day intention exists. | Aligned | The app also includes reminders/history beyond the “first version” minimum; treat them as optional enhancements, not required core flow. |

## Core Catalog Conflict

The attached specification lists more than 30 named core practices, including legacy foundational practices, movement practices, breath-awareness practices, Rose Ray practices, and a one-minute support practice. The confirmed product decision was to keep **18 rituals** as the selectable library. These two directions cannot both be true if every named item remains individually selectable.

| Attached core-practice item type | Canonical 18 treatment | Rationale |
|---|---|---|
| Close equivalent, such as a boundary or orientation practice | Map into the matching canonical ritual as a script or variant. | Avoids duplicate user choices. |
| Movement or breath technique | Make a conditional variant selected only when compatible with adjustments and intensity. | Preserves accessibility and user agency. |
| Rose Ray or crystal practice | Make optional symbolic presentation metadata. | Keeps practical mode free of required imagery or objects. |
| Distinct named practice with no 18-ritual equivalent | Keep as a future expansion-pack candidate, not a new default selectable ritual. | Preserves the approved 18-ritual boundary. |

## Priority Reconciliation Path

| Priority | Work | Outcome |
|---:|---|---|
| P0 | Migrate the active `practices.ts` runtime data to the confirmed 18-ritual schema. | The visible library and JSON catalog match. |
| P0 | Connect `safetySelectionEngine.ts` to the live intake-to-recommendation transition. | Explicit triggers, intensity 7–10, transit, malformed input, and no-match cases are guarded before any ritual is shown. |
| P1 | Add per-pathway intake adapters for Morning, Protection, Reset, Hygiene, and Preparation. | Richer questions are normalized into reusable deterministic answer tags. |
| P1 | Add `avoid-touch` and physical-safety follow-up behavior. | The adjustment and safety experience match the specification. |
| P2 | Map legacy core practices into canonical variants, scripts, symbolic modifiers, or future expansion records. | Curated material is retained without inflating the selectable library. |
| P3 | Review history, reminders, exports, and insights as optional product enhancements. | Advanced features remain additive rather than distorting the core decision flow. |

## Implementation Gate

Do not add more selectable practices until the P0 catalog migration and runtime safety-engine integration are complete. Once those are in place, the application will be structurally aligned with the attached specification while retaining the approved 18-ritual governance model.
