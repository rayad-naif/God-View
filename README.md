# God View: Multi-Tenant Analytics Hub for HighLevel

One screen for every sub-account in a HighLevel (GHL) agency:

- **Global leaderboard.** Ranks every client by lowest CPL, highest appointment show rate, most revenue, or most leads. Each cell shows the change vs the previous period. Rows are sortable and selectable, there is a daily-lead sparkline per account, and you can export to CSV.
- **Churn predictor.** A sub-account turns **red** when its lead volume stays below a threshold for N consecutive *completed* days (default 3 days under 3 leads/day). Accounts with 1–2 low days are flagged **Watch** (amber). A heatmap shows the last 14 days for every flagged account. The threshold can be set agency-wide or per account.
- **One-click snapshot push.** Click **Push** on a winning row and pick its snapshot. The tool pre-selects underperformers: everything at churn risk plus the bottom 25% on the current metric. It then pushes the snapshot to all of them in bulk, with live per-account progress. "Push a winner into this account" does the reverse for a single struggling client.
- **Churn alerts.** A Slack (or any webhook) message is sent once per sub-account when it turns red, plus an optional recovery notice.
- **Ad spend import.** Upload a CSV exported from Meta or Google Ads to fill in cost-per-lead data. The template is generated with your sub-accounts already listed.
- **Auto-sync.** Syncs run every few hours on their own, a protected cron endpoint is available, and new sub-accounts sync instantly through webhooks.
- **Install/uninstall webhooks.** Signatures are verified. Uninstalling at the agency level deletes that agency's tokens and data.
- Retry for failed snapshot pushes, plus OAuth tokens encrypted at rest (AES-256-GCM).
- Account drawer with daily leads vs threshold, showed/no-show appointments, revenue, and per-account overrides.
- Light and dark themes, works on mobile, and has a **demo mode** with 100 simulated clients so you can try it without a GHL app.

## Pages & sign-in

| Route | What it is |
|---|---|
| `/` | Public home page |
| `/docs` | Detailed user documentation |
| `/privacy`, `/terms` | Privacy Policy and Terms of Service (set `LEGAL_ENTITY_NAME`, `SUPPORT_EMAIL` and `LEGAL_JURISDICTION`, and have them reviewed before launch) |
| `/login` | Email and password sign-in |
| `/setup` | Email and password creation, shown right after the first CRM connection |
| `/dashboard`, `/settings` | The app (requires sign-in) |

**Sign-in flow:**
1. **Connect CRM** (OAuth).
2. **First connection:** `/setup` asks for an email and password, then sends you to `/login`.
3. **Later visits:** sign in with email and password.

**Password storage and sessions:**
- Passwords are hashed with scrypt.
- Sessions are signed cookies that last 14 days. Changing a password signs out all other sessions.
- Sign-in attempts are rate-limited.

**Forgot password:** "Forgot password?" re-runs the CRM OAuth flow with `intent=reset`. Proving ownership of the CRM workspace lets you set a new password.

All user-facing copy uses the neutral terms **CRM**, **workspace** and **account**. Environment variables accept `CRM_*` names, and the older `GHL_*` names still work.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
```

Click **Explore with demo data** to try it right away, or **Connect HighLevel agency** for live data.

## HighLevel OAuth setup

1. Go to https://marketplace.gohighlevel.com, then **My Apps**, then **Create App**.
2. **Distribution type: Agency** (Sub-account + Agency). The app must be installed at the agency level. The callback rejects sub-account-only installs, because a location token can't see other clients.
3. Add the **Redirect URL** `https://<your-host>/api/auth/callback` (use `http://localhost:3000/api/auth/callback` for local work).
4. Add these **scopes**:
   `locations.readonly locations.write locations/customValues.readonly oauth.readonly oauth.write companies.readonly contacts.readonly opportunities.readonly calendars.readonly calendars/events.readonly snapshots.readonly adPublishing.readonly lc-email.readonly`

   If you tick more scopes in the app, list them in `CRM_EXTRA_SCOPES` so the authorize request matches.
5. Copy the Client ID and Secret into `.env.local`. Set `GHL_APP_ID` (the part of the client ID before the `-`) so only sub-accounts with the app installed are synced.

### How the OAuth flow works

```
/api/auth/login ─► marketplace.gohighlevel.com/oauth/chooselocation (state cookie)
                   ◄─ /api/auth/callback?code=…
POST /oauth/token (user_type=Company) ─► agency access + refresh token (stored server-side)
for each sub-account: POST /oauth/locationToken ─► location token (cached ~24h)
```

- Agency tokens refresh automatically before they expire. Refresh tokens are single-use, so concurrent callers share one refresh.
- Location tokens are minted once per sub-account, even when several fetches run in parallel.
- The browser only holds a signed, httpOnly session cookie with the company ID. Tokens never reach the client.

## Where each number comes from

| Metric | GHL source |
|---|---|
| Leads | `POST /contacts/search`: contacts by `dateAdded`, bucketed in the sub-account's timezone |
| Revenue | `GET /opportunities/search?status=won`: `monetaryValue`, dated by `lastStatusChangeAt` (looks back 120 extra days of creation date so long-cycle deals count) |
| Show rate | `GET /calendars/events` across every calendar: `showed / (showed + noshow)` |
| Ad spend / CPL | Ad Manager reporting (`adPublishing.readonly`): `GET /ad-publishing/{facebook,google,linkedin}/reporting` per day, summed. Falls back to a **custom value** (default key `ad_spend_daily`, a daily number or JSON per day). CSV imports and manual overrides win over both. |
| Email health | `LCEmailStats` webhook events (`lc-email.readonly`): delivered, opened (unique per message), clicked, permanent failures (bounces), complaints (spam) and unsubscribes, counted per account per day |
| Snapshot push | `GET /snapshots` lists them, `PUT /locations/{id}` with `{ snapshot: { id, override } }` pushes one, `GET /snapshots/snapshot-status/{snapshotId}/location/{id}` reports progress |

**Pushing a single funnel or workflow:** HighLevel distributes assets through snapshots. Create a snapshot from the winning sub-account that contains only that funnel or workflow (Agency → Account Snapshots), then push it. With **override off**, the push only adds assets. Turning override on replaces assets that have the same name, and the UI asks for an explicit confirmation first.

## Webhooks

In the Marketplace app, set **Webhook URL** to `https://<host>/api/webhooks/crm` (the older `/api/webhooks/ghl` path also works) and subscribe to:

| Event | What God View does |
|---|---|
| `INSTALL` (sub-account) | Syncs that sub-account right away |
| `LocationCreate` | Syncs the new sub-account right away |
| `UNINSTALL` (sub-account) | Removes that sub-account and its token |
| `UNINSTALL` (agency) | Deletes all of that agency's tokens, data and login |
| `LCEmailStats` | Counts the email event for that sub-account's email health |

Every delivery must carry a valid signature. HighLevel's published RSA key (`x-wh-signature`) is built in; set `CRM_WEBHOOK_PUBLIC_KEY` only if they rotate it (or `CRM_WEBHOOK_ED25519_PUBLIC_KEY` for `x-ghl-signature`). Unsigned or forged requests get a 401, deliveries with a top-level `timestamp` older than 5 minutes are rejected, and repeats are de-duplicated.

HighLevel documents `LCEmailStats` as available to location-level apps, so email events arrive for sub-accounts where the app is installed.

## Sync

- **Sync** in the header pulls every sub-account (4 at a time; 429/5xx responses are retried with backoff) over the configured window (default 60 days, which covers a 30-day view plus its comparison period).
- **Resumable:** a sync is planned (list sub-accounts, queue them) and then worked through in time-limited steps, saving after every sub-account. A step holds a lock, so parallel callers never duplicate work.
- **Docker/VM:** a built-in timer starts a sync every `AUTO_SYNC_HOURS` (default 6) and runs the steps back to back.
- **Vercel:** functions stop after responding, so steps are driven by **Vercel Cron** (`vercel.json` → `/api/cron/sync`, which starts or continues due workspaces) and by the dashboard's progress poll while it's open. The included schedule is daily (Hobby plan limit); on Pro use `*/15 * * * *`.
- **External cron:** `GET /api/cron/sync` with `Authorization: Bearer $CRON_SECRET` from any scheduler.
- A fresh install triggers a sync, and webhooks keep sub-accounts current between syncs.
- If one sub-account fails (for example, the app isn't installed there), only that row is flagged and the rest of the sync continues.

## Ad spend

Spend is taken from the first available source, in this order:
1. **CSV import** (Settings → Import ad spend). Columns: `account_id` or `name`, `date`, `spend`. Values like `$1,234.50` and dates as `MM/DD/YYYY` are accepted.
2. **Manual daily override** in an account's detail panel.
3. **Connected ad platforms**: Facebook/Instagram, Google and LinkedIn ad accounts connected in the sub-account's Ad Manager.
4. **Synced custom value** (`ad_spend_daily`), as a daily number or JSON per day, typically filled by Zapier or Make.

## Churn alerts

Settings → Churn alerts takes any `https://` incoming webhook: Slack, Google Chat, Discord (append `/slack`), Zapier or Make. After each sync, every sub-account that newly turned red is posted once. Accounts that were already red when you set up alerts are announced on the next sync.

## Storage

- **Upstash Redis** when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set; the `KV_REST_API_URL` / `KV_REST_API_TOKEN` names from Vercel's Upstash integration also work. It talks to the REST API, so no extra package is needed.
- **Files** under `DATA_DIR` otherwise, for Docker or a VM.
- **On serverless hosts without Redis, the app refuses to start storage** rather than silently losing data.
- A workspace is stored as separate keys (meta, auth, tokens, sync, jobs, one key per sub-account, and an email-counter hash per sub-account). Concurrent writers never overwrite each other's data.
- Older `data/company-*.json` and `data/users.json` files are imported automatically on first read.

## Deploy

**Vercel**
1. Import the repo.
2. Go to **Storage → Upstash Redis** and connect a database.
3. Add the env vars from `.env.example`, including `CRON_SECRET`.
4. Deploy.

**Docker**

```bash
docker compose up -d --build     # uses .env.local, persists data in a volume
```

Health check: `GET /api/health` reports the storage mode, whether the host is serverless, and whether cron is configured.

## Tests

```bash
npm run build && npm test
```

This runs the end-to-end suite three times: with file storage, with Redis (a mock Upstash server, `scripts/mock-redis.mjs`), and with Redis in serverless mode. That's about 75 checks per mode, against a mock CRM API (`scripts/mock-ghl.mjs`):
- OAuth state and code exchange, token-exchange count
- Sync and metrics, including timezone bucketing
- Encryption at rest
- Alerts and de-duplication
- CSV import
- Snapshot push, failure and retry
- Cron auth
- Webhook signatures, idempotency and uninstall cleanup
- Login setup, sign-in, password rules, password change and reset, rate limiting
- Ad-platform spend and spend-source priority
- Email events: unique opens, permanent vs temporary bounces, spam rate status, replay and duplicate protection, email alerts

## Architecture

```
src/lib/ghl/client.ts     fetch wrapper (Version header, retries), agency/location token management
src/lib/ghl/oauth.ts      authorize URL, code exchange, scopes
src/lib/ghl/resources.ts  locations, contacts, opportunities, calendars, custom values, snapshots
src/lib/ghl/webhook.ts    Ed25519 / RSA webhook signature verification
src/lib/sync.ts           per-sub-account aggregation into daily metrics
src/lib/metrics.ts        leaderboard / churn / totals for a date range
src/lib/alerts.ts         churn alert delivery
src/lib/push.ts           snapshot push jobs, status polling
src/lib/scheduler.ts      auto-sync loop + cron entry point
src/lib/crypto.ts         AES-256-GCM token encryption
src/lib/kv.ts             storage backends: Upstash Redis (REST) or files
src/lib/store.ts          per-workspace keys (meta, auth, tokens, sync, jobs, sub-accounts)
src/lib/email.ts          email event counting and health thresholds
src/components/*          dashboard UI (Next.js App Router, Tailwind, Recharts)
```

## Production notes
- Set `SESSION_SECRET`, `TOKEN_ENCRYPTION_KEY` and a webhook public key. Production refuses to start without a session secret.
- The JSON store suits a single instance with a persistent volume. To run several instances, move `loadStore`/`saveStore` to Postgres or Redis.
- Syncs and pushes run in-process, so avoid serverless hosts whose timeouts are shorter than a full sync.
- `GHL_API_BASE` can point at a mock server for testing.
