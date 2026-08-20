# Safety-Handoff UI Wireframe and Flow

## Purpose

The safety-handoff state replaces ritual selection when an immediate safety trigger is reported, when intensity is very high, or when no safe compatible ritual remains. It is an **orientation and support-routing screen**, not a diagnostic, treatment, or emergency-service substitute.

## State Flow

```text
Intake answer
   |
   +-- explicit safety trigger --------------------> SAFETY HANDOFF: URGENT
   |
   +-- intensity 9–10 -----------------------------> SAFETY HANDOFF: HIGH INTENSITY
   |
   +-- intensity 7–8 or transit -------------------> SAFETY-GUARDED RITUAL RESULT
   |
   +-- standard input ------------------------------> STANDARD RITUAL RESULT
```

The safety-handoff state must be reachable from the intake flow, the guided-practice “I feel worse” action, and the completion check-in. It must not be skippable into a symbolic ritual by a single tap.

## Urgent Safety Handoff

```text
┌─────────────────────────────────────────────────────┐
│  [← Main menu]                         SAFETY SUPPORT │
│                                                     │
│                 [open-circle orientation mark]     │
│                                                     │
│  You deserve immediate, practical support.          │
│                                                     │
│  What you shared may need more support than this     │
│  practice can provide. You do not need to continue   │
│  the ritual right now.                               │
│                                                     │
│  RIGHT NOW                                           │
│  1. Keep your eyes open if you can.                  │
│  2. Notice where you are and one stable surface.     │
│  3. Move toward a safer place or trusted person.     │
│                                                     │
│  [ Contact a trusted person ]                        │
│  [ Find local crisis or emergency support ]          │
│  [ I am in a safer place now ]                       │
│                                                     │
│  You can return to a gentle, eyes-open reset only    │
│  when it feels safe to do so.                        │
└─────────────────────────────────────────────────────┘
```

The second action may open a region-aware support chooser only after an explicit user request. Do not infer the user’s location or automatically call emergency services.

## High-Intensity Handoff

```text
┌─────────────────────────────────────────────────────┐
│  [← Main menu]                     HIGH-INTENSITY RESET│
│                                                     │
│  This feels very intense right now.                  │
│  You do not need to complete a full ritual or force  │
│  yourself to calm down.                              │
│                                                     │
│  • Feel the surface beneath you.                     │
│  • Name where you are.                               │
│  • Look for three ordinary objects.                  │
│  • Let your breathing stay natural.                  │
│                                                     │
│  [ Begin one-minute eyes-open orientation ]          │
│  [ I need a trusted person or more support ]         │
│  [ Return to main menu ]                             │
│                                                     │
│  Afterward: “What is your intensity now, 1–10?”      │
└─────────────────────────────────────────────────────┘
```

At high intensity, suppress imagery-first, breath-focused, movement-forward, crystal, and Rose Ray controls. The only permitted practice launch is a compatible, eyes-open, externally oriented ritual.

## Interaction Requirements

| Element | Required behavior |
|---|---|
| Visual emphasis | Calm high-contrast surface, short lines, no animated background, no count-down. |
| Focus | Move keyboard focus to the heading when the state opens; retain an always-visible exit. |
| Reading level | Use short, direct, non-diagnostic language. Avoid spiritual framing on urgent states. |
| Actions | Use large full-width buttons; never hide support actions behind a secondary menu. |
| Accessibility | Respect reduced motion, large text, screen reader labels, and keyboard order. |
| Data | Record only a non-sensitive aggregate state such as `safety_handoff_shown`; do not store free-text disclosures without clear consent. |

## Component Contract

```ts
type SafetyHandoffProps = {
  result: Extract<SelectionResult, { kind: "safety-handoff" }>;
  onMainMenu(): void;
  onOrientation(): void;
  onTrustedSupport(): void;
  onSupportResources(): void;
};
```

The component should render exclusively from `result.reason` and `result.priority`. It must not re-run ritual selection, choose symbolic supports, or make claims about a user’s condition.
