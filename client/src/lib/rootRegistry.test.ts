import { describe, expect, it } from "vitest";
import { getManagedRoot } from "./rootRegistry";

describe("managed React root", () => {
  it("creates one root and reuses it on later bootstrap evaluations", () => {
    const host = {} as Window & { __energeticSafeguardRoot?: { id: string } };
    const create = () => ({ id: "single-root", render: () => {}, unmount: () => {} });
    const first = getManagedRoot(host as never, create as never);
    const second = getManagedRoot(host as never, create as never);
    expect(first).toBe(second);
    expect(first).toMatchObject({ id: "single-root" });
  });
});
