import fs from "node:fs";

const path = "server/routers.ts";
let source = fs.readFileSync(path, "utf8");
const before = `    createCheckoutSession: protectedProcedure\n      .input(z.object({ offerKey: z.enum(["current_app_lifetime", "future_updates_lifetime"]) }))\n      .mutation(async () => {\n        throw new Error("Lifetime purchases are no longer offered. Choose Sanctuary Plus instead.");\n      }),`;
const after = `    createCheckoutSession: protectedProcedure\n      .input(z.object({ offerKey: z.enum(["current_app_lifetime", "future_updates_lifetime"]) }))\n      .mutation(async () => ({\n        alreadyPremium: false as const,\n        checkoutUrl: null as string | null,\n        retired: true as const,\n      })),`;

if (!source.includes(before)) {
  throw new Error("Expected retired lifetime checkout block was not found.");
}
source = source.replace(before, after);
fs.writeFileSync(path, source);
