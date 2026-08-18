import { describe, expect, it } from "vitest";
import { isWeeklyReflectionDue } from "./reflectionReminder";

describe("in-app weekly reflection prompt", () => {
  it("only becomes due after seven days when enabled", () => {
    const now = new Date("2026-08-18T09:00:00Z");
    expect(isWeeklyReflectionDue({ enabled: false, lastPromptedAt: null }, now)).toBe(false);
    expect(isWeeklyReflectionDue({ enabled: true, lastPromptedAt: "2026-08-11T09:00:00Z" }, now)).toBe(true);
    expect(isWeeklyReflectionDue({ enabled: true, lastPromptedAt: "2026-08-12T09:00:00Z" }, now)).toBe(false);
  });
});

