# PostgreSQL migration

Energetic Safeguard now targets PostgreSQL through Drizzle's node-postgres adapter.

## Runtime

Set `DATABASE_URL` to a standard PostgreSQL connection string, for example:

`postgresql://user:password@host:5432/database?sslmode=require`

The application uses a pooled `pg` connection and keeps the rest of the database API behind Drizzle.

## Schema and migrations

- Canonical schema: `drizzle/schema.ts`
- PostgreSQL migrations: `drizzle/postgres/`
- Legacy root-level `drizzle/000*.sql` files are the old MySQL history and must not be applied to PostgreSQL.
- Generate a migration with `pnpm db:generate`.
- Apply checked-in migrations with `pnpm db:migrate` after setting `DATABASE_URL`.

The PostgreSQL baseline is intentionally clean because this application has not established a production customer dataset. If an existing MySQL database contains data that must be retained, export and validate that data separately before switching production traffic; this code migration does not copy MySQL rows into PostgreSQL.

## Hosting portability

The runtime uses standard PostgreSQL rather than a vendor-specific database API, so the same code can connect to Netlify Database, Neon, Supabase, Render, Railway, or another PostgreSQL provider that exposes a compatible connection string.
