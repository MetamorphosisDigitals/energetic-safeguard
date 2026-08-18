# Content Extension Guide

The application uses structured content catalogs so new support can be introduced without modifying React screens or the deterministic recommendation algorithm.

| Add | Where to edit | Required structure |
|---|---|---|
| A practice | `client/src/data/practices.ts` | Add one `Practice` object with flow, duration, intensity range, modalities, accessibility tags, styles, steps, alternative, and content pack. |
| A pathway | `client/src/data/catalog.ts` | Add one `SupportFlowDefinition`; its dashboard card, intake prompt, labels, and icon mapping consume this data. |
| A Rose Ray or crystal | `client/src/data/catalog.ts` | Add a catalog entry and refer to its stable identifier in a practice object. |
| An expansion pack | `client/src/data/catalog.ts` | Add an entry to `expansionPacks`, then tag eligible practice objects with its identifier. |

New practices should declare `contentPackId` explicitly. The selection engine already filters available packs, duration, intensity, location, modality, accessibility adjustments, privacy, practice style, Rose Ray identifiers, and optional crystal-support identifiers before scoring a result. Future access rules can enable a pack for eligible lifetime-update accounts without rewriting the practice-flow screens.
