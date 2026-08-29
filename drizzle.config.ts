import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/postgres",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
