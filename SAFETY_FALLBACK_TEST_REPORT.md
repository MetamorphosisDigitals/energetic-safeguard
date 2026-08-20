# Extended Safety Fallback Test Report

## Scope

This validation exercised the safety-aware ritual selector against adversarial and extreme input combinations. The goal was to confirm that safety routing occurs before recommendation scoring, incompatible modalities are excluded, malformed state fails closed, and no unrelated ritual is selected when the input cannot be matched safely.

## Results

| Scenario | Expected behavior | Verified result |
|---|---|---|
| Immediate danger | Urgent safety handoff before ritual selection | Passed |
| Unable to stay safe | Urgent safety handoff before ritual selection | Passed |
| Severe physical symptoms | Urgent safety handoff before ritual selection | Passed |
| Severe disorientation | Urgent safety handoff before ritual selection | Passed |
| Self-harm or harm thoughts | Urgent safety handoff before ritual selection | Passed |
| Intensity 7–8 | Only eyes-open, externally oriented, high-intensity-compatible ritual remains eligible | Passed |
| Intensity 9–10 | High-priority orientation/support handoff | Passed |
| Transit plus high intensity | Transit-safe, discreet, eyes-open ritual only | Passed |
| Zero available time | No-safe-ritual handoff | Passed |
| Avoid breath, visualization, and movement | Preserve accessible sensory fallback where available | Passed |
| Unknown pathway | No-safe-ritual handoff; never select an unrelated ritual | Passed |
| Invalid intensity: -1, 11, or `NaN` | Fail closed with no-safe-ritual handoff | Passed |

## Hardening Changes Applied

The extended matrix found two safety-relevant edge cases in the initial reference implementation. Both are fixed in `client/src/lib/safetySelectionEngine.ts`.

1. **Unknown pathway protection.** The selector now requires at least one eligible candidate that matches the requested pathway. It returns `no-safe-ritual` rather than selecting a merely eligible ritual from an unrelated pathway.
2. **Strict intensity validation.** The selector now accepts only finite values from 1 through 10. Negative values, values above 10, and `NaN` fail closed before ritual scoring.

## Test Evidence

The new `safetySelectionEngine.extended.test.ts` contributes 16 adversarial scenarios. The full project validation completed successfully:

```text
Type check: passed
Test files: 14 passed
Tests: 54 passed
```

## Remaining Integration Requirement

The reference engine is validated in isolation. Before enabling it in production flows, the 18-ritual catalog must receive the proposed `safety` metadata fields: `highIntensityEligible`, `transitSafe`, and `requiresExternalOrientation`. The application should also route `safety-handoff` results directly into the dedicated handoff UI, never into the standard ritual result screen.
