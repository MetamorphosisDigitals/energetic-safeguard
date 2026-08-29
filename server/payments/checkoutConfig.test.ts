import { afterEach, describe, expect, it } from "vitest";
import { getCheckoutReturnOrigin, getStripeClient } from "./checkoutConfig";

const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;
const originalStripeKey = process.env.STRIPE_SECRET_KEY;

function restoreEnv(name: "NODE_ENV" | "APP_URL" | "STRIPE_SECRET_KEY", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv("NODE_ENV", originalNodeEnv);
  restoreEnv("APP_URL", originalAppUrl);
  restoreEnv("STRIPE_SECRET_KEY", originalStripeKey);
});

describe("checkout configuration", () => {
  it("uses the configured canonical app origin in production instead of request Origin", () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://energeticsafeguard.com/app";
    expect(getCheckoutReturnOrigin("https://attacker.example")).toBe("https://energeticsafeguard.com");
  });

  it("refuses production checkout redirects when APP_URL is missing or insecure", () => {
    process.env.NODE_ENV = "production";
    delete process.env.APP_URL;
    expect(() => getCheckoutReturnOrigin("https://attacker.example")).toThrow("APP_URL is required");

    process.env.APP_URL = "http://energeticsafeguard.com";
    expect(() => getCheckoutReturnOrigin(undefined)).toThrow("APP_URL must use https in production");
  });

  it("allows a validated request origin only outside production", () => {
    process.env.NODE_ENV = "test";
    delete process.env.APP_URL;
    expect(getCheckoutReturnOrigin("http://127.0.0.1:4173/path")).toBe("http://127.0.0.1:4173");
    expect(() => getCheckoutReturnOrigin("javascript:alert(1)")).toThrow("must use http or https");
  });

  it("does not require Stripe configuration merely to import payment helpers", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => getStripeClient()).toThrow("STRIPE_SECRET_KEY is required");
  });
});
