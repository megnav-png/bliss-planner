# Bliss Planner Sync Backend Architecture

## Positioning
Bliss Planner remains local-first. Wedding data lives on the planner's device by default. Cloud sync is optional and should be designed as an encrypted relay, not a readable multi-tenant planning database.

## Recommended Architecture
1. **Desktop/web client**
   - Stores planner state locally.
   - Writes every change into a revisioned outbox.
   - Encrypts sync payloads before upload.
   - Resolves simple conflicts locally using entity revision and last-edited metadata.

2. **Sync relay API**
   - Node.js service using Fastify or Next.js route handlers.
   - Next.js route handlers now support two persistence modes: Render persistent disk file store and Postgres JSONB store.
   - Prisma/PostgreSQL remains the target structure for full device registry, package metadata, sync cursors, and audit records as the schema grows.
   - Object storage such as Cloudflare R2, Google Cloud Storage, or S3 for encrypted snapshot packages.
   - No plaintext wedding, guest, vendor, budget, cultural, or client data is stored server-side.
   - Prototype command: `BLISS_RELAY_SECRET=dev-secret BLISS_RELAY_TOKEN=dev-token npm run sync:relay:prototype`.
   - Hosted route handlers are available under `/api/sync/*` and `/api/devices/*`.
   - Render persistent disk mode: set `BLISS_RELAY_STORE_BACKEND=file` and `BLISS_RELAY_STORE_DIR=/var/data/bliss-relay`.
   - Postgres mode: set `BLISS_RELAY_STORE_BACKEND=postgres` and `BLISS_RELAY_DATABASE_URL`.
   - Health verification command: `BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_RELAY_TOKEN=<token> npm run sync:relay:health`.

3. **Identity and device continuity**
   - Planner account owns one or more workspaces.
   - Each trusted device gets a device ID, public key, and revocable access token.
   - New device pairing happens through a short-lived invite code or QR handoff from an existing device.

4. **Sync contract**
   - Client pushes encrypted revision packages with `workspaceId`, `deviceId`, `baseRevision`, `nextRevision`, checksum, and entity manifest.
   - Relay accepts only monotonic revision pushes unless the client explicitly marks a conflict branch.
   - Client pulls package manifests after its last known remote revision and downloads encrypted packages.
   - Conflict files remain visible to the planner as "review required" items rather than silent overwrites.

## Data Model Additions
- `Workspace`: id, owner planner id, region, created date, retention setting.
- `Device`: id, workspace id, name, public key, last seen, revoked at.
- `SyncPackage`: workspace id, device id, base revision, next revision, object key, checksum, entity counts.
- `SyncCursor`: device id, last acknowledged revision.
- `AuditEvent`: workspace id, device id, action, timestamp, metadata.

## Security Rules
- Encrypt before upload; relay never receives decryption keys.
- Rotate device tokens independently from planner login credentials.
- Keep export/import JSON available even when cloud sync is disabled.
- Offer regional storage selection during workspace setup for global planners.
- Add "delete cloud relay data" as a hard product requirement before paid release.
- Require `BLISS_RELAY_SECRET` and `BLISS_RELAY_TOKEN` in production.
- Increment `BLISS_RELAY_TOKEN_VERSION` whenever `BLISS_RELAY_TOKEN` is rotated.
- Keep audit logs for at least `BLISS_RELAY_AUDIT_RETENTION_DAYS=90` and encrypted event packages for `BLISS_RELAY_EVENT_RETENTION_DAYS=365` unless a planner chooses a stricter regional policy.

## Implementation Order
1. Add local entity revisions and updated-at metadata to every wedding, task, readiness, cultural, client, vendor, and venue entity.
2. Build encrypted package creation and restore locally.
3. Add relay API with workspace/device/package tables.
4. Add device pairing flow.
5. Add conflict review UI.
6. Run cloud pilot against two browser profiles and one desktop wrapper profile.

## Prototype Status
- `sync-relay/prototype-server.mjs` implements `GET /health`, `POST /devices/pair/start`, `POST /devices/pair/claim`, `POST /sync/push`, `GET /sync/pull`, and `DELETE /sync/workspace`.
- Payloads are encrypted at rest with AES-256-GCM using `BLISS_RELAY_SECRET`.
- Relay records persist to `BLISS_RELAY_STORE` or `/tmp/bliss-planner-sync-relay-store.json`.
- `BLISS_RELAY_TOKEN` enables bearer-token or `x-bliss-relay-token` auth for all relay endpoints.
- The dashboard exposes device pairing and delete-cloud-data controls once a relay endpoint is configured.
- Production version now has a hosted route-handler relay, planner account seed model, pairing, revocation, conflict-review surface, and delete-cloud-data flow.
- Durable production hosting can use `render.yaml` persistent disk settings or the Postgres adapter with `BLISS_RELAY_STORE_BACKEND=postgres`.
- Production auth boundary now supports Google/OIDC configuration through `/api/auth/*` and reports missing provider settings in-app.
- Hosted relay health now reports durability, auth requirement, token version, retention windows, audit count, and a rotation plan.
- Hosted relay audit is available through `/api/sync/audit` and the `/admin` console when the real relay token is supplied.
- Paid-release hardening is tracked in `phase7/PAID_RELEASE_HARDENING.md`.
- Production hardening still needs user acceptance around regional storage selection and paid-release migration from file-store relay to Postgres/object storage if multi-tenant scale increases.

## Token Rotation Plan
1. Generate a new `BLISS_RELAY_TOKEN` in the password manager.
2. Increase `BLISS_RELAY_TOKEN_VERSION` by 1 in Render.
3. Deploy and verify with `BLISS_RELAY_TOKEN=<new token> npm run sync:relay:health`.
4. Re-pair trusted devices that use the relay token directly, or update managed device configuration.
5. Review relay audit logs and revoke devices that did not rotate within the chosen grace period.
