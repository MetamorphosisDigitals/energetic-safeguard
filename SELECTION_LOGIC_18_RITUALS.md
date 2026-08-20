# Answer-Based Selection Logic for the 18-Ritual Catalog

## Purpose and Design Principles

This specification converts a user’s answers into one recommended ritual from the confirmed 18-ritual collection. It is deliberately **deterministic, explainable, and content-driven**: the application filters and scores structured ritual metadata; it does not infer emotional or health states from free text, nor does it use a generative model to select support.

> **Selection promise:** “The recommendation reflects the support, time, setting, preferences, and adjustments you selected.”

The model must prefer the **least demanding compatible ritual** when information is incomplete or when the user asks for immediate support. Symbolic Rose Ray or crystal content remains optional and is never required for a practical recommendation.

## 1. Intake Model

The product should ask four core questions, then expose an optional “adjust this” panel. The user never needs to answer every optional question to receive a recommendation.

| Input | Values | Why it matters |
|---|---|---|
| **Pathway** | `morning`, `protect`, `reset`, `hygiene` | Establishes the primary support context. The current “Prepare” pathway is represented by `protect` rituals with preparation tags. |
| **What is most present?** | Context-specific selectable chips, listed below | Matches ritual intent without guessing from free text. |
| **Time available** | `1`, `2`, `3`, `4+` minutes | Removes rituals that do not fit the actual moment. |
| **Current setting** | `home`, `work`, `public`, `between-places`, `screen`, `outdoors` | Ensures ritual location and visibility are appropriate. |
| **Support style** | `practical`, `symbolic`, `symbolic-plus-crystal`, `choose-for-me` | Filters or weights optional imagery and crystal metadata. |
| **Adjustments** | `eyes-open`, `avoid-breath`, `avoid-visualization`, `minimal-movement`, `no-touch`, `discreet` | Removes incompatible rituals before scoring. |
| **Intensity** | `1–10` visual scale, optional | Refines fit and activates safety-oriented fallbacks at high activation. |

### Context-Specific “Most Present” Options

| Pathway | Selectable answers |
|---|---|
| **Morning** | `scattered`, `low-energy`, `need-boundary`, `need-arrival` |
| **Protect before interaction** | `meeting`, `difficult-conversation`, `crowded-demanding-space`, `need-privacy` |
| **Ground & reset** | `overloaded`, `racing-thoughts`, `body-tension`, `need-slower-pace`, `need-less-effort` |
| **Energy hygiene** | `transition`, `end-of-day`, `screen-fatigue`, `carrying-others`, `need-repeatable-cue` |

## 2. Required Catalog Metadata

The current fields—duration, setting, privacy, style, accessibility tags, keywords, Rose Ray, crystal support, and intensity—remain useful. For reliable answer matching, add this `selection` block to each ritual record. It replaces brittle matching against a sentence typed by the user.

```json
{
  "selection": {
    "primaryContexts": ["morning"],
    "answerTags": ["scattered", "need-arrival"],
    "settingTags": ["home", "work", "public"],
    "visibility": "discreet",
    "demandLevel": "low",
    "safetyMode": "standard"
  }
}
```

`demandLevel` is one of `low`, `standard`, or `engaged`. `safetyMode` is `standard` for most rituals and `eyes-open-grounding` for rituals suitable when intensity is high. The user-facing catalog copy must still describe practices as general wellness support, not clinical treatment.

## 3. Ritual-to-Answer Mapping

| Ritual | Primary answer tags | Best settings | Key hard constraints | Selection note |
|---|---|---|---|---|
| Feet, Breath, Intention | `scattered`, `need-arrival` | Any, work | Remove if `avoid-breath` | Default practical morning answer. |
| Soft Boundary Morning | `need-boundary` | Any, work | Remove if `avoid-visualization` | Prefer only when symbolic support is requested. |
| Gentle Energy Wake-Up | `low-energy` | Home, any | Remove if `minimal-movement` | Prefer for low intensity and morning energy. |
| Five-Sense Arrival | `scattered`, `need-arrival` | Any | None | Sensory alternative to breath-focused arrival. |
| Pocket Anchor | `meeting`, `need-privacy` | Public, work | Requires discreet compatibility | Fast default before a public interaction. |
| Three-Breath Boundary | `meeting`, `difficult-conversation` | Any, work | Remove if `avoid-breath` | Prefer when a clear boundary is the stated aim. |
| Breathable Protection | `meeting`, `need-privacy`, `crowded-demanding-space` | Any | Remove if `avoid-visualization` | Optional symbolic protection; never required. |
| Orient and Choose | `crowded-demanding-space`, `need-privacy` | Public, work, outdoors | Requires eyes-open compatibility | Prefer when exits, placement, and break options matter. |
| Five-Sense Orientation | `overloaded` | Any | Requires eyes-open compatibility | High-intensity sensory grounding option. |
| Pressure and Release | `body-tension` | Home, work | Remove if `minimal-movement` or `no-touch` | Gentle tension support only. |
| One-Object Reset | `racing-thoughts`, `overloaded` | Any, public | Requires eyes-open compatibility | Default 1-minute reset and high-intensity fallback. |
| Easy Longer Exhale | `need-slower-pace`, `body-tension` | Any | Remove if `avoid-breath` | Never force, count, or hold breath. |
| Energy Conservation Pause | `need-less-effort`, `low-energy` | Any, work | None | Default when capacity is low or practical support is needed. |
| Transition Pause | `transition` | Any | None | Used between roles, rooms, calls, tasks, and places. |
| End-of-Day Release | `end-of-day` | Home, any | Remove if `minimal-movement` only when no still alternative exists | The primary end-of-day option. |
| Screen Boundary Reset | `screen-fatigue` | Work, home | Requires screen setting preference | A digital-boundary hygiene ritual. |
| Daily Boundary Question | `carrying-others`, `need-boundary` | Any, work | None | Practical discernment when another person’s experience feels heavy. |
| Sensory Home Base | `need-repeatable-cue`, `transition`, `need-arrival` | Home, any | None | Prefer for a repeated daily or seven-day support cue. |

## 4. Selection Pipeline

### Step A — Safety Gate

If the user indicates immediate danger, inability to stay safe, or a need for emergency intervention, do **not** select a ritual. Show the existing safety route with plain-language suggestions to seek immediate local help, contact emergency services where appropriate, or reach a trusted person.

If `intensity >= 8`, restrict the candidate pool to `eyes-open-grounding` or `low` demand rituals. Exclude breath-focused, visualization-first, and movement-forward rituals unless the user explicitly selected them and did not set a conflicting adjustment. The default high-intensity fallback is **One-Object Reset**; use **Five-Sense Orientation** when at least two minutes are available, or **Orient and Choose** in a public or demanding environment.

### Step B — Eligibility Filter

Keep only rituals that satisfy every required condition:

```ts
eligible = ritual.active
  && ritual.durationMinutes <= availableMinutes
  && matchesSetting(ritual, setting)
  && matchesVisibility(ritual, adjustments)
  && matchesStyle(ritual, supportStyle)
  && matchesAccessibility(ritual, adjustments)
  && matchesSafetyMode(ritual, intensity, adjustments)
  && isPackAvailable(ritual, enabledContentPackIds)
```

`matchesAccessibility` must treat `avoid-breath`, `avoid-visualization`, `minimal-movement`, `no-touch`, `eyes-open`, and `discreet` as **hard exclusions**, not scoring penalties. A ritual with optional breath or optional visualization may remain eligible only if its metadata explicitly declares a supported non-breath or non-visual alternative.

### Step C — Weighted Score

Score only the eligible rituals. The following weights are intentionally simple enough to test and explain.

| Signal | Points | Rule |
|---|---:|---|
| Exact pathway/context | +50 | Ritual includes the selected primary context. |
| Exact answer tag | +40 each, maximum +80 | Ritual includes a selected “most present” answer tag. |
| Setting match | +20 | Exact setting match; `anywhere` earns +12. |
| Visibility fit | +15 | Ritual privacy requirement is exactly suited to the chosen setting/adjustment. |
| Time fit | +15 | Ritual duration exactly matches available minutes; otherwise `max(0, 12 - 3 × minuteDifference)`. |
| Intensity fit | +15 | Selected intensity is within the ritual’s intended range. |
| Practical or symbolic style match | +12 | Exact selected style; `choose-for-me` adds +4 for practical rituals. |
| Preferred Rose Ray or crystal match | +10 each | Only when explicitly selected. |
| Low-demand bonus | +10 | When energy is low or intensity is high and the ritual is low demand. |
| Seven-day continuity bonus | +8 | The ritual is the user’s active seven-day intention. |
| Recent-repeat penalty | −8 | The ritual was completed in the past 24 hours, unless it is the active intention or is explicitly opened from favorites. |

### Step D — Deterministic Tie-Break

Use these tie-breaks in this exact order:

1. Prefer the ritual with the highest exact-answer-tag count.
2. Prefer the lowest demand level.
3. Prefer the shortest compatible duration.
4. Prefer the ritual that continues an active seven-day intention.
5. Sort by stable `id` ascending.

This produces a predictable result without repeatedly serving a longer or more demanding ritual when an equally relevant short option exists.

## 5. Pseudocode

```ts
function selectRitual(query: RitualQuery, rituals: Ritual[]): SelectionResult {
  if (query.safety.immediateDanger) {
    return { kind: "safety-handoff", reason: "Immediate safety support is more important than a ritual." };
  }

  const candidates = rituals
    .filter((ritual) => ritual.active)
    .filter((ritual) => ritual.durationMinutes <= query.availableMinutes)
    .filter((ritual) => matchesSetting(ritual, query.setting))
    .filter((ritual) => matchesStyle(ritual, query.style))
    .filter((ritual) => matchesAdjustments(ritual, query.adjustments))
    .filter((ritual) => matchesHighIntensitySafety(ritual, query.intensity, query.adjustments));

  const scoped = candidates.filter((ritual) =>
    ritual.selection.primaryContexts.includes(query.pathway),
  );
  const pool = scoped.length ? scoped : candidates;
  const ranked = pool.map((ritual) => ({ ritual, score: scoreRitual(ritual, query) }));

  return ranked.sort(compareByScoreThenTieBreak)[0]
    ?? { kind: "ritual", ritual: findFallback(query), reason: "A simple compatible fallback was selected." };
}
```

## 6. Example Outcomes

| User answers | Recommended ritual | Why |
|---|---|---|
| Morning; scattered; 2 minutes; work; practical; eyes open | **Feet, Breath, Intention** | Exact morning/arrival fit, discreet, and short. If breath is avoided, choose Five-Sense Arrival instead. |
| Before meeting; public; 1 minute; need privacy; practical | **Pocket Anchor** | Exact public/discreet context and one-minute fit. |
| Ground & reset; racing thoughts; 1 minute; public; intensity 8 | **One-Object Reset** | Eyes-open, discreet, low-demand high-intensity fallback. |
| Energy hygiene; screen fatigue; 3 minutes; work | **Screen Boundary Reset** | Exact hygiene answer and screen-aware ritual. |
| Energy hygiene; carrying others; 2 minutes; practical | **Daily Boundary Question** | Exact boundary/discernment answer with no imagery requirement. |
| End of day; home; 4 minutes; symbolic | **End-of-Day Release** | Exact time and pathway fit, with optional Violet Rose imagery. |

## 7. Explainability Copy

The UI should display a short generated reason, never the raw score:

```ts
buildReason(result, query) =>
  `Selected because it fits your ${query.availableMinutes}-minute window, ${query.setting} setting, and desire for ${humanize(query.primaryAnswer)} support.`
```

When a user changes an adjustment, show a transparent note such as: “Breath-focused practices were excluded because you selected ‘avoid breath.’” This makes the model predictable and reinforces user choice.

## 8. Implementation Checklist

The next implementation should load `rituals_18_catalog.json` as the canonical practice source, add the `selection` metadata block to each entry, replace free-text matching with `answerTags`, preserve all existing saved-history IDs through a one-time mapping only where records refer to legacy practices, and add unit tests for one intended ritual and one safe fallback per pathway.
