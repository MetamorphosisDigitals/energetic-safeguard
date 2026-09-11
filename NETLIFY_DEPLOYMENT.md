# Netlify + PostgreSQL deployment

Energetic Safeguard is prepared to deploy as a Vite static frontend plus one Netlify Function wrapping the existing Express API.

## Production topology

- Netlify CDN: `dist/public`
- Netlify Function: `netlify/functions/api.ts`
- Express routes handled by the function:
  - `/api/trpc/*`
  - `/api/oauth/callback`
  - `/api/stripe/webhook`
  - `/manus-storage/*`
- PostgreSQL: Netlify Database or any standard hosted PostgreSQL URL
- Stripe: Sanctuary Plus checkout, billing portal, and webhook delivery

The long-running Node entry point remains supported for Railway/Render/local deployment.

## 1. Create the Netlify site

Connect the GitHub repository and deploy the `main` branch. `netlify.toml` supplies:

- build command: `pnpm db:migrate && pnpm build`
- publish directory: `dist/public`
- functions directory: `netlify/functions`
- Node 22
- API/storage rewrites to the Express function
- SPA fallback to `index.html`

Do not override these settings in the Netlify UI unless intentionally changing the deployment architecture.

## 2. Provision PostgreSQL

Either create a Netlify Database for the site or use another managed PostgreSQL provider.

The application accepts either:

- `NETLIFY_DB_URL` — native Netlify Database connection variable, or
- `DATABASE_URL` — standard PostgreSQL connection URL

The build runs the checked-in Drizzle migrations before compiling the application. The production database user therefore needs schema migration permissions.

## 3. Required production environment variables

### Database

- `NETLIFY_DB_URL` or `DATABASE_URL`

### Application / authentication

- `APP_URL` — canonical HTTPS origin, for example `https://energeticsafeguard.com`
- `VITE_APP_ID` — application/client ID used by the current authentication provider
- `VITE_OAUTH_PORTAL_URL` — browser-facing OAuth portal base URL
- `OAUTH_SERVER_URL` — server-side OAuth API base URL
- `JWT_SECRET` — strong production session-signing secret
- `OWNER_OPEN_ID` — optional owner/admin account identifier used by the existing role logic

The OAuth provider must allow this production callback URL:

`https://<production-domain>/api/oauth/callback`

### Stripe

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PLUS_MONTHLY_PRICE_ID`
- `STRIPE_PLUS_ANNUAL_PRICE_ID`

The live Stripe webhook endpoint is:

`https://<production-domain>/api/stripe/webhook`

Configure at least the event types currently projected by the app:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Use live Stripe Price IDs only after production smoke testing is ready.

### Existing image/storage proxy

The current visual system references four assets through `/manus-storage/*`:

- Energetic Safeguard rose-compass mark
- quiet rose field hero image
- golden boundary image
- emerald arrival image

Until those assets are moved into the repository or another CDN, configure:

- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`

Without those variables, the application itself still loads, but those proxied brand images will fail to resolve.

## 4. First deployment

Before promoting the site as production-ready, confirm that the Netlify build log shows:

1. dependency installation succeeded
2. `pnpm db:migrate` completed successfully
3. Vite production build succeeded
4. the `api` Netlify Function was bundled successfully

Then open:

- `/`
- `/account`
- `/membership`
- `/privacy`
- `/terms`

and confirm the SPA routes refresh directly without a 404.

## 5. Production smoke test

Run this sequence against the deployed URL:

1. Home page and all Foundation pathways render on desktop and mobile.
2. One-minute orientation remains available without signing in.
3. Safety handoff remains available without a subscription.
4. Sign in completes through `/api/oauth/callback` and survives refresh.
5. Save a ritual and confirm it appears in the account library after refresh.
6. Complete a ritual and verify practice history persists.
7. Enable cloud routine backup and verify PostgreSQL persistence.
8. Open `/membership` and verify Foundation Free plus Sanctuary Plus pricing.
9. Complete a Stripe test-mode annual checkout.
10. Confirm `checkout.session.completed` plus `invoice.paid` project Plus access.
11. Open the Stripe Billing Portal from the account.
12. Verify a duplicate webhook does not duplicate state.
13. Verify a failed/retried webhook recovers correctly.
14. Verify account deletion requires the exact word `DELETE`.
15. In a test account with Plus, verify deletion cancels Stripe first and then removes the account.
16. Confirm `/privacy` and `/terms` are reachable signed in and signed out.

Only switch Stripe from test to live after this sequence passes.

## 6. Domain

After the Netlify deployment is healthy:

1. attach the production custom domain
2. ensure HTTPS is active
3. set `APP_URL` to the final HTTPS origin
4. update the OAuth callback allowlist to the final domain
5. update the Stripe webhook endpoint to the final domain
6. redeploy once so every server-side return URL uses the canonical domain

## 7. Backups and monitoring

Before accepting paying users, enable or document:

- managed PostgreSQL backups / point-in-time recovery appropriate to the selected provider
- Netlify Function logs
- Stripe webhook delivery monitoring
- application error monitoring (for example Sentry)
- an external uptime check for the public site and a lightweight API route
- a rollback procedure to the previous known-good Git commit/deploy

## 8. Known deployment consideration

Netlify Functions are serverless. Avoid routing large file uploads through the Express function. The current storage route only redirects GET requests to signed storage URLs, which is compatible with this architecture. If future features add large uploads, upload directly to object storage using signed URLs rather than proxying file bytes through the function.
