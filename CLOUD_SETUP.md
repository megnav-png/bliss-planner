# Cloud execution setup (outside local machine)

You can run the Phase 6 pilot on a cloud host with this project instead of your local Mac.

## Option A — GitHub Codespaces (recommended)

1. Open the repo in Codespaces.
2. Open the terminal and run:

```bash
cd "/workspaces/<repo-name>"
git pull
npm ci
npm run phase6:pilot:cloud
```

3. The script starts Next on `0.0.0.0:3002`, runs the pilot against `127.0.0.1:3002`, and prints a report path.

If Playwright browsers are not available yet:

```bash
npx playwright install chromium
npm run phase6:pilot:cloud
```

## Option B — Generic cloud VM (Ubuntu / Debian)

```bash
sudo apt-get update
sudo apt-get install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
git clone <your-repo-url> "/tmp/wovops"
cd "/tmp/wovops"
npm ci
npm run phase6:pilot:cloud
```

For headless browser reliability:

```bash
npx playwright install chromium
```

## Option C — Docker one-shot run

From repo root:

```bash
docker build -f Dockerfile.cloud -t wovops-phase6:latest .
docker run --rm -p 3002:3002 wovops-phase6:latest
```

Equivalent compose form:

```bash
APP_PORT=3002 docker-compose -f docker-compose.cloud.yml up --build --abort-on-container-exit
```

## Output locations

- Pilot report: temp file path printed as:
  - `Phase 6 pilot report: /tmp/wovops-phase6-pilot-<timestamp>.json`
- Dev log: `/tmp/wovops-dev.log`
- Pilot log: `/tmp/wovops-phase6-cloud-pilot.log` (cloud script)
- In docker-compose, mount `./tmp` to keep both logs under repository `tmp/` after run.

## Why this helps

- Avoids local sandbox/IPv6/port collisions.
- Keeps the same codebase and automation unchanged.
- Gives reproducible environments for repeated pilot runs and team reviews.

## Option D — GitHub Actions (truly external runner)

The repository includes a manual workflow at `.github/workflows/phase6-cloud-pilot.yml`.

Trigger it in GitHub → Actions → `phase6-cloud-pilot` → Run workflow.
Artifacts are uploaded with report and logs.

## Option E — External host with manual command block (skip local start)

Use this exact block when the local machine blocks loopback sockets or browser automation:

```bash
APP_HOST=0.0.0.0 \
APP_PORT=3002 \
WOVOPS_APP_URL=http://127.0.0.1:3002 \
WOVOPS_SKIP_LOCAL_START=true \
WOVOPS_PILOT_SKIP_IPV6=true \
WOVOPS_PILOT_SKIP_PRECHECK=true \
WOVOPS_PILOT_ALLOW_HOST_ALIASES=false \
WOVOPS_PILOT_FORCE_IPV4_LOOPBACK=true \
npm run phase6:pilot:cloud
```

Useful when:

- Next.js can’t bind sockets on your desktop.
- Browser automation in this sandbox returns `Permission denied (1100)` in Chromium logs.
- You want to run the same test from another machine (or CI) and keep your local machine as pure code-edit workspace.

Important: if you keep `WOVOPS_SKIP_LOCAL_START=true`, make sure the app is already running at `WOVOPS_APP_URL` before running the command.

For that external runner, a minimal pattern is:

```bash
cd "/path/to/wovops/repo"
npm ci
npm run dev -- --hostname 0.0.0.0 --port 3002
```

Then from a separate terminal on that same runner:

```bash
WOVOPS_APP_URL=http://127.0.0.1:3002 WOVOPS_SKIP_LOCAL_START=true npm run phase6:pilot:cloud
```

## Option F — Render production relay storage

The repo includes `render.yaml` for a Render web service with a persistent disk mounted at:

```bash
/var/data/bliss-relay
```

Use these environment values in Render when configuring the hosted relay:

```bash
BLISS_PUBLIC_APP_URL=https://bliss-planner.onrender.com
BLISS_RELAY_STORE_BACKEND=file
BLISS_RELAY_STORE_DIR=/var/data/bliss-relay
BLISS_RELAY_STORE_FILE=bliss-planner-hosted-relay-store.json
BLISS_RELAY_SECRET=<long random secret>
BLISS_RELAY_TOKEN=<long random bearer token>
```

For the Postgres-backed relay, switch to:

```bash
BLISS_RELAY_STORE_BACKEND=postgres
BLISS_RELAY_DATABASE_URL=<postgres connection string>
BLISS_APP_DATABASE_URL=<optional separate planner-records postgres connection string>
BLISS_RELAY_SECRET=<long random secret>
BLISS_RELAY_TOKEN=<long random bearer token>
```

Production planner records:
- The production CRUD API stores planner records in Postgres using `BLISS_APP_DATABASE_URL`, falling back to `BLISS_RELAY_DATABASE_URL`.
- Apply or inspect the schema in `phase7/production-schema.sql`.
- The same database now stores account membership, audit logs, notification queue rows, realtime collaboration events, billing state, file object indexes, devices, and sync conflicts.
- Optional residency guardrail:

```bash
BLISS_ALLOWED_DATA_RESIDENCIES=United States,EU,India,Global,configured-by-workspace
```

- CRUD endpoints:
  - `GET/POST /api/records/weddings`
  - `GET/POST /api/records/vendors`
  - `GET/POST /api/records/venues`
  - `GET/POST /api/records/destinations`
  - `GET/POST /api/records/approvals`
  - `GET/POST /api/records/guests`
  - `GET/POST /api/records/seatingTables`
  - `GET/POST /api/records/crm`
  - `GET/PATCH/DELETE /api/records/:entity/:id`

Managed auth config:

```bash
BLISS_AUTH_PROVIDER=google
BLISS_AUTH_CLIENT_ID=<google oauth client id>
BLISS_AUTH_CLIENT_SECRET=<google oauth client secret>
BLISS_AUTH_SESSION_SECRET=<long random auth secret>
BLISS_AUTH_ALLOWED_DOMAIN=<optional company domain>
BLISS_ADMIN_EMAILS=owner@example.com,ops@example.com
BLISS_PLANNER_EMAILS=planner@example.com
BLISS_PORTAL_CLIENT_EMAILS=client@example.com
BLISS_PORTAL_VENDOR_EMAILS=vendor@example.com
BLISS_PUBLIC_APP_URL=https://bliss-planner.onrender.com
```

Managed auth enforcement:
- `/admin` requires an authenticated owner, planner, or production user with full workspace access.
- `/client` requires an authenticated client portal user or full workspace user.
- `/vendor` requires an authenticated vendor portal user or full workspace user.
- In local development without managed auth env, the app keeps the seeded local session for testing.
- Authorized Google portal test command after env variables are set:

```bash
BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_TEST_ROLE=client npm run qa:render:portal:authorized
BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_TEST_ROLE=vendor npm run qa:render:portal:authorized
BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_TEST_ROLE=admin npm run qa:render:portal:authorized
```

File storage config:

```bash
BLISS_FILE_STORE_DIR=/var/data/bliss-relay/files
BLISS_FILE_ENCRYPTION_KEY=<long random file encryption secret>
BLISS_OBJECT_STORAGE_BUCKET=<optional object bucket>
BLISS_OBJECT_STORAGE_REGION=<optional object region>
BLISS_OBJECT_STORAGE_UPLOAD_ENDPOINT=<optional external upload endpoint>
BLISS_OBJECT_STORAGE_TOKEN=<optional upload endpoint token>
```

Chosen object storage provider: Cloudflare R2. See `phase7/OBJECT_STORAGE_R2_SETUP.md`.
Files are encrypted with AES-256-GCM before server disk or external object upload when `BLISS_FILE_ENCRYPTION_KEY` or `BLISS_RELAY_SECRET` is set. This is encrypted-at-rest with server-side access control; a no-escrow browser-held key model is a separate paid-release security decision.

Portal and admin production APIs:
- `GET /api/portal/client` returns client-scoped weddings, approvals, guests, and files.
- `POST /api/portal/client` records approval decisions.
- `GET /api/portal/vendor` returns vendor-scoped wedding, vendor, venue, destination, and file data.
- `POST /api/portal/vendor` records vendor updates.
- `GET/POST /api/sync/conflicts` lists and resolves sync conflicts for planners/admins.
- `GET /api/admin/overview` returns accounts, devices, conflicts, audit log, files, notifications, billing, monitoring, and production store health.
- `POST /api/files/revoke` revokes file access in the production file index.
- `GET/POST /api/notifications` lists and queues in-app notifications.
- `GET/POST /api/realtime/events` provides the current polling event log used for collaboration presence/change signals.
- `GET /api/calendar/ics` serves an ICS feed for weddings and approval due dates. Set `BLISS_CALENDAR_FEED_TOKEN` for calendar subscription access without a browser session.

Billing hardening:

```bash
BLISS_BILLING_CHECKOUT_URL=<provider checkout link or portal>
STRIPE_SECRET_KEY=<optional future Stripe secret>
BLISS_BILLING_WEBHOOK_SECRET=<shared secret for /api/billing/webhook>
```

Chosen first checkout provider: Stripe Payment Links. See `phase7/BILLING_STRIPE_PAYMENT_LINKS.md`.

Invite email config:

```bash
BLISS_EMAIL_PROVIDER=queued
BLISS_EMAIL_FROM="Bliss Planner <noreply@example.com>"
BLISS_RESEND_API_KEY=<optional resend key>
BLISS_EMAIL_WEBHOOK_URL=<optional generic email webhook>
BLISS_EMAIL_WEBHOOK_TOKEN=<optional webhook token>
```

The relay health route reports whether the active backend is durable:

```bash
curl https://bliss-planner.onrender.com/api/sync/health
```
