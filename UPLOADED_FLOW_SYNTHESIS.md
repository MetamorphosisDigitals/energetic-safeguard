# Unified Flow Synthesis for the 18-Ritual App

## Executive Recommendation

The uploaded documents should become the **interaction and response-design layer** for the confirmed 18-ritual catalog, rather than a second competing ritual library. The 18 rituals remain the canonical selectable practices. The longer flow documents supply progressive intake questions, optional modifiers, safety routing, compassionate result language, short versions, and seven-day commitment behavior.

> **Recommended architecture:** one shared selection engine, four pathway-specific intake adapters, one shared result template, and one safety override. This prevents ritual duplication while preserving the richer personalization in the uploaded material.

## Reconciliation Matrix

| Uploaded flow | What it contributes | How it should integrate | Do not implement as |
|---|---|---|---|
| **Morning Energy Check-In** | Morning state, energy, emotion, body sensations, expected demands, daily intention | A progressive Morning adapter that emits normalized tags such as `scattered`, `low-energy`, `tender`, `need-boundary`, `visibility`, and `caregiving` | A separate morning ritual catalog beyond the four canonical morning rituals |
| **Pre-Meeting Protection** | Interaction type, social dynamics, expected intensity, capacity, practical boundaries | A Protection adapter that emits `meeting`, `difficult-conversation`, `crowded-demanding-space`, `need-privacy`, `visibility`, and `low-energy` | A promise that symbolic protection is sufficient for coercion, harassment, or danger |
| **Grounding Reset** | Intensity, time, location, accessibility, high-intensity and in-transit safeguards | A Reset adapter that determines high-intensity eligibility and can select 30-second or 1-minute variants | A long multi-step ritual at intensity 7–10 or while driving, cycling, or operating equipment |
| **Energy Hygiene Guidance** | Recurring pattern, trigger, helpful/unhelpful approaches, repeatable cue, seven-day commitment | A Hygiene adapter that selects one ritual plus a cue, minimum version, and boundary phrase | Multiple simultaneous daily commitments or an obligation-oriented streak model |
| **Shared Response Structure** | Common five-part result, short-form version, consent-based language, closing check-in | The result renderer shared by every pathway | Separate response layouts that make the experience feel inconsistent |

## Shared Input Contract

Every pathway should collect only the minimum answers necessary for a first recommendation, then optionally reveal refinements. The shared contract is below.

| Field | Type | Used by | Notes |
|---|---|---|---|
| `pathway` | `morning \| protect \| reset \| hygiene` | All | Determines the first candidate set. |
| `primaryAnswerTags` | String array | All | Structured tags from pathway chips; do not depend on free-text matching. |
| `availableMinutes` | `0.5 \| 1 \| 2 \| 3 \| 5` | All | A 30-second micro-version is allowed only for eligible rituals. |
| `setting` | Normalized setting enum | All | Includes `home`, `work`, `public`, `transit`, `outdoors`, `resting`, and `screen`. |
| `intensity` | `1–10`, optional | Reset and Protection; optional Morning | Activates the high-intensity safety constraint at `>= 7`. |
| `supportStyle` | Practical or symbolic preference | All | Symbolic imagery, Rose Rays, and crystals remain optional. |
| `adjustments` | Accessibility/avoidance tags | All | Hard filters for breath, visualization, movement, touch, eyes-open, and discretion. |
| `secondaryTags` | String array | Morning, Protection, Hygiene | Demands, triggers, prior helps, and recurring timing refine score but do not block a compatible option. |

Free text may be retained as a private note or shown back to the user in an editable reflection, but it should not be the sole input to recommendation logic.

## Canonical 18-Ritual Placement

| Pathway | Canonical rituals | High-value modifiers from uploads |
|---|---|---|
| **Morning** | Feet, Breath, Intention; Soft Boundary Morning; Gentle Energy Wake-Up; Five-Sense Arrival | Daily intention; expected-demand tag; optional Rose Ray/crystal pairing; one practical boundary. |
| **Protection** | Pocket Anchor; Three-Breath Boundary; Breathable Protection; Orient and Choose | Interaction type; communication boundary; visibility mode; permission to pause or reschedule. |
| **Reset** | Five-Sense Orientation; Pressure and Release; One-Object Reset; Easy Longer Exhale; Energy Conservation Pause | 30-second variant; sensory reduction; high-intensity orientation; in-transit safety adaptation. |
| **Hygiene** | Transition Pause; End-of-Day Release; Screen Boundary Reset; Daily Boundary Question; Sensory Home Base | Seven-day cue; minimum version; one boundary phrase; completion and reflection check-in. |

The uploaded labels **Grounding Tube**, **Scattered Light Return**, **Rose Sphere Boundary**, **Compassion Without Carrying**, **Sovereign Pause**, **Arrival-Home Reset**, **Rest Without Guilt**, **Visibility and Voice**, and **Sensory Containment** should initially be modeled as **guided variants or ritual modifiers**, not added as ninth-plus entries that expand the canonical count beyond 18. If analytics later shows meaningful demand, they can become a future expansion pack.

## Shared Result Renderer

Every selected ritual should use this five-part response. The copy is personalized from tags and selected metadata, but the layout is stable.

1. **What I’m Hearing** — one or two compassionate sentences that reflect the selected state and support need without diagnosis.
2. **Your Recommended Ritual** — exactly one canonical ritual name and intended support outcome.
3. **How to Complete It** — three to seven short, consent-based steps; natural breathing, eyes-open options, and optional visualization.
4. **Estimated Time** — never longer than the user’s available time.
5. **Check-In** — one pathway-appropriate question only.

At low capacity, limited time, or high intensity, render the short-form result and hide nonessential symbolic detail.

## Safety Overrides

| Condition | Required behavior |
|---|---|
| `intensity >= 7` | Prefer eyes-open, externally oriented, one- or two-step grounding. Exclude visualization-first, breath-focused, and movement-forward options unless explicitly selected and compatible. |
| Immediate danger, self-harm/harm thoughts, inability to stay safe, severe panic/disorientation, new severe physical symptoms, chest pain, fainting, or significant breathing difficulty | Do not recommend a ritual as sufficient. Stop the flow, orient to surroundings, and encourage immediate appropriate emergency, medical, mental-health, crisis, or trusted-person support. |
| In transit, driving, cycling, walking in traffic, or operating equipment | Do not direct eyes closed, detailed visualization, or attention away from the environment. Keep prompts externally oriented and brief. |
| Coercion, harassment, abuse, retaliation, unsafe work conditions, or ongoing boundary violations | Offer practical safety, advocacy, workplace, legal, caregiving, or professional-support options. Do not frame energy work as the solution. |
| A practice increases distress | Stop it, return to eyes-open orientation and a stable surface, record the incompatible modifier, and offer a simpler alternative. |

## Implementation Sequence

| Phase | Deliverable | Outcome |
|---|---|---|
| 1 | Import the 18 canonical rituals and add normalized `selection` metadata | The engine can filter by pathway, tag, setting, time, style, and adjustments. |
| 2 | Build four progressive intake adapters | Users answer only what is needed for the selected pathway. |
| 3 | Build one shared result renderer with short and high-intensity variants | Consistent, consent-based ritual guidance. |
| 4 | Add hygiene cue, minimum version, and seven-day reflection logic | Sustainable repetition without perfection pressure. |
| 5 | Add analytics only for de-identified product events | Improve rituals without interpreting or diagnosing users. |

## Decisions Needed Before Build

1. Whether **Morning Energy Check-In** and **Pre-Meeting Protection** should appear as separate cards on the home screen, or replace the existing generic pathway cards.
2. Whether the optional Rose Ray/crystal pairing should be shown by default for users who chose a practical style, or kept behind a “Show symbolic support” disclosure.
3. Whether the uploaded named variants should stay as internal modifiers or become a future named expansion pack after the 18 canonical rituals launch.
