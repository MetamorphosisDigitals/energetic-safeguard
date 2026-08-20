# Safety-Handoff End-to-End Validation

## Scenario

The browser-level scenario simulates a returning user who needs immediate support. It skips onboarding only for test setup, starts from the public home screen, opens **Find support for right now**, and enters an unsafe message into the real Reset intake field.

```text
I feel unsafe and need immediate support.
```

## Validated UI Path

| Step | Expected UI behavior | Result |
|---|---|---|
| 1 | User opens the Reset pathway from the home-screen CTA. | Passed |
| 2 | Reset intake displays the live question: “What is asking for support right now?” | Passed |
| 3 | Unsafe text is submitted through the real intake textarea. | Passed |
| 4 | The app routes directly to **Pause Here** instead of rendering a ritual recommendation. | Passed |
| 5 | The handoff screen shows “You can stop this practice” and the emergency limitation copy. | Passed |
| 6 | The scenario verifies that **Today’s Recommendation** is absent. | Passed |
| 7 | Selecting **Try a one-minute orientation** opens the actual **One-Minute Support** guided practice. | Passed |
| 8 | The eyes-open **Look** step and the **I feel more overwhelmed** escape action are visible. | Passed |

## Test Execution

The scenario runs in Chromium through Playwright:

```bash
pnpm run test:e2e:safety
```

The most recent local execution passed:

```text
1 passed
```

## Artifacts

- Test configuration: `playwright.config.ts`
- Browser scenario: `e2e/safety-handoff.spec.ts`
- Command: `test:e2e:safety` in `package.json`

## Test Boundary

The scenario intentionally asserts routing and UI safety behavior. It does not contact emergency, medical, crisis, or other external services, and it does not simulate or diagnose a real person’s condition.
