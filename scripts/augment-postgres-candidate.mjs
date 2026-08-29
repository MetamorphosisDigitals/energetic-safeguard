import fs from "node:fs";

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing expected ${label}`);
  return source.replace(before, after);
}

let dbSource = fs.readFileSync("server/db.ts", "utf8");
const legacyStart = dbSource.indexOf("export async function claimBillingWebhookEvent(");
const nextDbFunction = dbSource.indexOf("export async function recordPracticeCompletion", legacyStart);
if (legacyStart < 0 || nextDbFunction < 0) throw new Error("Could not locate legacy billing ledger exports in server/db.ts");
dbSource = `${dbSource.slice(0, legacyStart)}${dbSource.slice(nextDbFunction)}`;
dbSource = dbSource.replace("billingWebhookEvents, ", "");
if (!dbSource.includes("export async function closeDb()")) {
  dbSource += `\n\nexport async function closeDb() {\n  if (pool) await pool.end();\n  pool = null;\n  database = null;\n}\n`;
}
fs.writeFileSync("server/db.ts", dbSource);

fs.writeFileSync("server/postgres.integration.test.ts", `import { afterAll, describe, expect, it } from "vitest";
import {
  closeDb,
  getSubscriptionEntitlementByStripeId,
  getUserByOpenId,
  listPracticeFavorites,
  listSavedPracticeFilterViews,
  savePracticeFavorite,
  savePracticeFilterView,
  saveSubscriptionEntitlement,
  setRoutineArchiveAutoBackup,
  getRoutineArchiveAutoBackup,
  upsertUser,
} from "./db";
import { claimBillingWebhookEvent, completeBillingWebhookEvent } from "./payments/billingEventLedger";

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describePostgres = hasDatabase ? describe : describe.skip;

describePostgres("PostgreSQL persistence contract", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const openId = `postgres-contract-${suffix}`;
  let userId = 0;

  afterAll(async () => {
    await closeDb();
  });

  it("upserts users through PostgreSQL conflict handling", async () => {
    await upsertUser({ openId, name: "First Name", email: `first-${suffix}@example.test` });
    const first = await getUserByOpenId(openId);
    expect(first).toBeDefined();
    userId = first!.id;

    await upsertUser({ openId, name: "Updated Name", email: `updated-${suffix}@example.test` });
    const updated = await getUserByOpenId(openId);
    expect(updated).toMatchObject({ id: userId, name: "Updated Name", email: `updated-${suffix}@example.test` });
  });

  it("keeps favorite and saved-view writes idempotent", async () => {
    await savePracticeFavorite(userId, "feet-breath-intention");
    await savePracticeFavorite(userId, "feet-breath-intention");
    const favorites = await listPracticeFavorites(userId);
    expect(favorites.filter((item) => item.practiceId === "feet-breath-intention")).toHaveLength(1);

    await savePracticeFilterView(userId, { name: "Contract View", keyword: "first", customTag: null, startDate: null, endDate: null });
    await savePracticeFilterView(userId, { name: "Contract View", keyword: "updated", customTag: null, startDate: null, endDate: null });
    const views = await listSavedPracticeFilterViews(userId);
    expect(views.find((view) => view.name === "Contract View")?.keyword).toBe("updated");
  });

  it("updates the one-row-per-user preference and subscription projections", async () => {
    await setRoutineArchiveAutoBackup(userId, true);
    expect(await getRoutineArchiveAutoBackup(userId)).toBe(true);
    await setRoutineArchiveAutoBackup(userId, false);
    expect(await getRoutineArchiveAutoBackup(userId)).toBe(false);

    await saveSubscriptionEntitlement({
      userId,
      offerKey: "rhythm_plus_monthly",
      stripeCustomerId: `cus_${suffix}`,
      stripeSubscriptionId: `sub_first_${suffix}`,
      stripePriceId: "price_first",
      status: "trialing",
      currentPeriodEnd: null,
      graceEndsAt: null,
      lastInvoiceId: null,
      lastPaidAt: null,
      canceledAt: null,
    });
    await saveSubscriptionEntitlement({
      userId,
      offerKey: "rhythm_plus_monthly",
      stripeCustomerId: `cus_${suffix}`,
      stripeSubscriptionId: `sub_updated_${suffix}`,
      stripePriceId: "price_updated",
      status: "active",
      currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
      graceEndsAt: null,
      lastInvoiceId: `in_${suffix}`,
      lastPaidAt: new Date("2026-09-01T00:00:00.000Z"),
      canceledAt: null,
    });
    const subscription = await getSubscriptionEntitlementByStripeId(`sub_updated_${suffix}`);
    expect(subscription).toMatchObject({ userId, status: "active", stripePriceId: "price_updated" });
  });

  it("reclaims failed webhook events and keeps processed events idempotent on PostgreSQL", async () => {
    const event = {
      providerEventId: `evt_${suffix}`,
      eventType: "invoice.paid",
      userId,
      providerCreatedAt: new Date("2026-08-29T12:00:00.000Z"),
    };
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: true });
    await completeBillingWebhookEvent(event.providerEventId, "failed", "projection_failed");
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: true });
    await completeBillingWebhookEvent(event.providerEventId, "processed");
    await expect(claimBillingWebhookEvent(event)).resolves.toMatchObject({ claimed: false });
  });
});
`);

let ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
ci = replaceExact(ci,
`    runs-on: ubuntu-latest
    steps:`,
`    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: energetic_safeguard
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d energetic_safeguard"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:`,
  "CI runner service section",
);
ci = replaceExact(ci,
`      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check`,
`      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Apply PostgreSQL migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/energetic_safeguard

      - name: PostgreSQL persistence integration
        run: pnpm exec vitest run server/postgres.integration.test.ts
        env:
          DATABASE_URL: postgresql://postgres:postgres@127.0.0.1:5432/energetic_safeguard

      - name: Type check`,
  "CI dependency step",
);
fs.writeFileSync(".github/workflows/ci.yml", ci);

console.log("Added PostgreSQL integration contract and CI database service.");
