# Canonical 18-Ritual Content Architecture

## Approved Decision

The **confirmed 18 rituals are the only selectable practices** in the application. The uploaded Core Practice Library, pathway-flow documents, Rose Ray and crystal material, and shared-response guidance do not create additional selectable rituals. Instead, they supply reusable content layers that personalize the selected ritual without fragmenting the catalog.

> **One user need → one selected canonical ritual → optional compatible variant and modifiers.**

This preserves a clear user-facing library, deterministic selection, stable history IDs, and a maintainable content model.

## Content Hierarchy

| Layer | Purpose | Examples | May affect selection? |
|---|---|---|---|
| **Canonical ritual** | The one named practice selected and saved in history. | Pocket Anchor, Transition Pause, Five-Sense Orientation | **Yes** |
| **Guided variant** | A compatible delivery form of the selected ritual. | 30-second version, low-energy version, gentle version, symbolic full version | No; selected after the ritual |
| **Modifier** | A short optional element added to the output. | Anchor phrase, practical boundary, Rose Ray, crystal frequency, daily cue | No; constrained by user preference and accessibility |
| **Safety profile** | Rules that hide or simplify variants when conditions call for it. | High-intensity eyes-open reset; transit-safe mode; stop-and-orient route | **Yes**, as an eligibility gate |
| **Response renderer** | Shared compassionate presentation for every result. | What I’m Hearing, Ritual, Steps, Time, Check-In | No |

## Variant Contract

Every canonical ritual may expose only variants that preserve its core intent. Variants must not introduce a new outcome, unsafe modality, or longer time requirement than the user selected.

```json
{
  "id": "one-object-reset",
  "variants": {
    "standard": { "durationMinutes": 1, "stepSetId": "standard" },
    "thirtySecond": { "durationMinutes": 0.5, "stepSetId": "thirty-second" },
    "discreet": { "durationMinutes": 1, "stepSetId": "public-discreet" }
  },
  "modifiers": {
    "allowedRoseRayIds": [],
    "allowedCrystalIds": [],
    "allowedBoundaryThemes": ["pause", "reduce-effort"],
    "safetyProfiles": ["high-intensity", "transit-safe"]
  }
}
```

## Global Rules

| Rule | Implementation requirement |
|---|---|
| **Natural breathing only** | Never require breath retention, counting, forced depth, or performance. Any breath-focused variant must have a non-breath alternative. |
| **Optional imagery** | Rose Rays, Rose Sphere, grounding tube, crystals, and symbolic release are choices. Use “imagine, sense, or simply intend.” |
| **Accessibility first** | Avoid-breath, avoid-visualization, no-touch, minimal-movement, eyes-open, discreet, and transit conditions are hard eligibility constraints. |
| **One ritual only** | The result renderer may show at most two optional modifiers, but never a list of competing practices. |
| **Practical care alongside symbolism** | Offer a realistic next action, boundary, sensory reduction, or support option whenever relevant. |
| **High intensity** | At intensity 7–10, select eyes-open, externally oriented variants only. Suppress imagery-first and breath-first variants. |
| **Safety escalation** | Immediate danger, self-harm/harm thoughts, severe physical symptoms, severe disorientation, or inability to stay safe routes to safety guidance instead of ritual selection. |

## Source-to-Canonical Mapping

### Morning and Protection Source Practices

| Uploaded source practice or concept | Canonical ritual | Variant or modifier role |
|---|---|---|
| Emerald Morning Arrival | Five-Sense Arrival or Feet, Breath, Intention | Full symbolic morning variant with optional Emerald Rose grounding. |
| Pink Rose Capacity Check | Energy Conservation Pause | Morning capacity-reflection modifier, Pink or Opalescent Aqua option, and demand-reduction boundary. |
| Golden Day Boundary | Soft Boundary Morning | Golden Rose/visibility modifier and practical daily-boundary script. |
| Scattered Light Return | Five-Sense Arrival | Optional attention-gathering visualization variant, permitted only below high intensity. |
| Gentle Rose Sphere | Soft Boundary Morning | Optional light boundary variant when a user chooses symbolic support. |
| Eyes-Open Morning Orientation | Five-Sense Arrival | High-sensitivity or disconnected-state variant. |
| Rose Sphere Meeting Boundary | Breathable Protection | Full symbolic protection variant; Black/Emerald Rose modifier. |
| Discreet Sensory Anchor | Pocket Anchor | Standard public/discreet delivery script. |
| Blue Rose Communication Boundary | Three-Breath Boundary | Communication modifier: Blue Rose, response phrase, and pause permission. |
| Grounding Tube | Five-Sense Orientation | Low-to-moderate-intensity symbolic grounding variant; never for high-intensity or visualization avoidance. |

### Grounding Source Practices

| Uploaded source practice or concept | Canonical ritual | Variant or modifier role |
|---|---|---|
| 30-Second Physical Reset | Pressure and Release | Thirty-second stable-surface variant. |
| One-Minute Sensory Orientation | Five-Sense Orientation | Standard short, eyes-open variant. |
| Hand-and-Surface Reset | Pressure and Release | No-strain, touch-optional discreet variant. |
| Feet and Support Reset | Pressure and Release | Two-minute supported-body variant. |
| Scattered Energy Reset | One-Object Reset | Attention-gathering variant with optional symbolic cue. |
| Natural-Breath Reset | Easy Longer Exhale | Standard breath-aware variant with sensory fallback. |
| Sensory Overload Reset | Five-Sense Orientation | Sensory-reduction modifier plus practical environmental action. |
| Rose Sphere Reset | Breathable Protection | Symbolic containment modifier; only for compatible user preference and intensity. |
| High-Intensity Orientation | Five-Sense Orientation | High-intensity, eyes-open safety variant. |
| Depleted-Energy Reset | Energy Conservation Pause | Rest-permission and practical support variant. |
| Discreet Public-Space Reset | One-Object Reset | Public/discreet short variant. |

### Energy-Hygiene Source Practices

| Uploaded source practice or concept | Canonical ritual | Variant or modifier role |
|---|---|---|
| Rose Sphere Boundary | Breathable Protection | Seven-day preventive boundary variant. |
| Scattered Light Return | Sensory Home Base | Repeated attention-return cue or optional symbolic variant. |
| End-of-Interaction Release | Transition Pause | Post-interaction variant with Violet Rose and one practical transition action. |
| Compassion Without Carrying | Daily Boundary Question | Pearl-White Rose caregiving modifier and available/not-available reflection. |
| Sovereign Pause | Daily Boundary Question | Golden Rose/response-delay modifier. |
| Arrival-Home Reset | Transition Pause | Home-arrival cue, Violet Rose transition modifier, and environmental change step. |
| Rest Without Guilt | Energy Conservation Pause | Opalescent Aqua Rose rest-permission variant. |
| Visibility and Voice | Soft Boundary Morning or Three-Breath Boundary | Golden + Blue Rose modifier for visible work or prepared communication. |
| Sensory Containment | Sensory Home Base | Repeated sensory-reduction cue and practical environment action. |

## Rose Ray and Crystal Governance

The reference library becomes descriptive metadata, not a diagnostic system. Users who choose a practical style receive no symbolic elements by default. Users who choose Rose Ray support receive one relevant Rose Ray; users who choose Rose + Crystal support may receive one optional crystal pairing.

| Need theme | Optional Rose Ray | Optional crystal pairing | Practical counterpart |
|---|---|---|---|
| Grounding or scattering | Emerald Rose | Red Jasper or Black Tourmaline | Feet, surface, sensory orientation |
| Tenderness or rest | Pink or Opalescent Aqua Rose | Rose Quartz | Reduce demands and choose rest support |
| Truth or communication | Blue Rose | Lapis Lazuli | Pause, clarify, use one boundary phrase |
| Visibility | Golden Rose | Citrine | Ground through feet/back and speak without overexplaining |
| Privacy or protection | Black Rose | Black Tourmaline or Golden Obsidian | Choose access, pause, exit, or reduce detail |
| Completion or transition | Violet Rose | Amethyst | Mark the ending and change environment |
| Compassion without carrying | Pearl-White Rose | Selenite | Name what is available and what is not yours to carry |

**Black Rose decision:** until the user directs otherwise, retain Black Rose as an optional protective modifier and as a selectable symbolic preference in relevant ritual metadata. It need not be presented as equal to the nine primary rays in introductory copy.

## Implementation Sequence

1. Keep `rituals_18_catalog.json` as the canonical selectable source.
2. Add a `variants` and `modifiers` schema to each canonical ritual.
3. Port source scripts into variant records rather than creating new ritual records.
4. Implement four progressive intake adapters: Morning, Protection, Reset, and Hygiene.
5. Use the shared five-part result renderer for every selected ritual.
6. Apply the safety profile before score calculation and again before guided practice starts.
7. Add one history event for the canonical ritual only; optionally retain `variantId` as a secondary analytic field.

## Acceptance Criteria

The implementation is complete when the app selects exactly one of the 18 canonical rituals, supports a compatible short/gentle/discreet variant without changing the ritual identity, omits symbolic content when the user chooses practical support, prevents conflicting modalities, provides a safety route where appropriate, and records the canonical ritual consistently in history and favorites.
