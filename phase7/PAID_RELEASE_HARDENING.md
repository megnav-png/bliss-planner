# Bliss Planner Paid Release Hardening

## Relay Persistence
- Preferred paid-release mode: `BLISS_RELAY_STORE_BACKEND=postgres`.
- Required env: `BLISS_RELAY_DATABASE_URL`, `BLISS_RELAY_SECRET`, `BLISS_RELAY_TOKEN`, `BLISS_RELAY_TOKEN_VERSION`.
- Keep persistent disk as a fallback only; Postgres should become the primary relay metadata store before charging customers.
- Run `BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_RELAY_TOKEN=<token> npm run sync:relay:health` after every deploy.

## Object Storage
- Store uploaded contracts, permits, invoices, approvals, and snapshots in object storage before paid release.
- Required env placeholders: `BLISS_OBJECT_STORAGE_BUCKET`, `BLISS_OBJECT_STORAGE_REGION`.
- Product rule: client-visible files must be encrypted before upload and revocable from the workspace admin surface.

## Regional Data Policy
- Workspace setup must ask for region/data-residency preference before cloud sync is enabled.
- Initial regions: US, EU, India/APAC, Middle East.
- Sync relay audit retention defaults: 90 days.
- Encrypted event package retention defaults: 365 days.

## Email Delivery
- Provider-ready endpoint: `/api/invites/send`.
- Initial provider: Resend via `BLISS_RESEND_API_KEY` and `BLISS_EMAIL_FROM`.
- If provider credentials are missing, the endpoint returns queued/fallback status instead of failing the planner invite flow.

## Monitoring
- Health endpoint: `/api/monitoring/health`.
- Event endpoint: `/api/monitoring/event`.
- Configure `SENTRY_DSN` for production monitoring.
- Add Render deploy notification webhooks to Slack/email before a paid launch.

## Signing Credentials
- macOS signed/notarized builds remain blocked until Apple Developer ID credentials are available:
  - `APPLE_ID`
  - `APPLE_APP_SPECIFIC_PASSWORD`
  - `APPLE_TEAM_ID`
  - `CSC_LINK` or macOS certificate profile
  - `CSC_KEY_PASSWORD`
- Windows signed installer remains blocked until:
  - `WIN_CSC_LINK` or `CSC_LINK`
  - `WIN_CSC_KEY_PASSWORD` or `CSC_KEY_PASSWORD`
- Do not ship paid desktop binaries without signed installer verification.
