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
   - Prisma with PostgreSQL for device registry, package metadata, sync cursors, and audit records.
   - Object storage such as Cloudflare R2, Google Cloud Storage, or S3 for encrypted snapshot packages.
   - No plaintext wedding, guest, vendor, budget, cultural, or client data is stored server-side.

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

## Implementation Order
1. Add local entity revisions and updated-at metadata to every wedding, task, readiness, cultural, client, vendor, and venue entity.
2. Build encrypted package creation and restore locally.
3. Add relay API with workspace/device/package tables.
4. Add device pairing flow.
5. Add conflict review UI.
6. Run cloud pilot against two browser profiles and one desktop wrapper profile.
