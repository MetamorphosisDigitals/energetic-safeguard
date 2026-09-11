import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { registerStripeWebhook } from "../payments/stripeWebhook";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";

/**
 * Builds the HTTP application without binding a port. This keeps the same
 * middleware order for the long-running Node server and serverless adapters.
 */
export function createApp() {
  const app = express();

  // Stripe signature verification requires the original byte stream. Keep this
  // route ahead of all JSON/body parsing middleware in every deployment target.
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  registerStripeWebhook(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
