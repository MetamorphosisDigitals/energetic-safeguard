import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

const mocks = vi.hoisted(() => ({ deleteUserAccount: vi.fn() }));
vi.mock("./accountDeletion", () => ({ deleteUserAccount: mocks.deleteUserAccount }));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext() {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  const user: AuthenticatedUser = {
    id: 7,
    openId: "delete-user",
    email: "delete@example.com",
    name: "Delete User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => clearedCookies.push({ name, options }),
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

describe("auth.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteUserAccount.mockResolvedValue({ success: true });
  });

  it("requires the exact destructive confirmation", async () => {
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.deleteAccount({ confirmation: "delete" as "DELETE" })).rejects.toThrow();
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it("deletes the account and clears the session cookie after success", async () => {
    const { ctx, clearedCookies } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.deleteAccount({ confirmation: "DELETE" })).resolves.toEqual({ success: true });
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith(7);
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1, secure: true, sameSite: "none", httpOnly: true, path: "/" });
  });
});
