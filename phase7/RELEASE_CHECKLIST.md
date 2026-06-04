# Phase 7 — Packaging, Export Profile, and Release Checklist

## Release readiness checklist

1. **Code freeze**
   - [ ] Phase 6 pilot report is clean.
   - [ ] `qa:render:visual` passes on desktop, tablet, and mobile viewport checks.
   - [ ] In-app deploy marker matches the expected Render/Git commit.
   - [ ] No PASS regressions in functional scenarios.
   - [ ] No new critical console or network errors in latest pilot run.

2. **Desktop wrapper smoke validation**
   - [ ] `npm run phase6:pilot:deterministic` passes before packaging.
   - [ ] `npm run phase7:desktop:smoke` opens the wrapper, loads the app, and exits cleanly.
   - [ ] `npm run phase7:desktop:launch` opens app window and shows onboarding/dashboard flow.
   - [ ] App reconnects after host tab close/reopen using same local storage keys.
   - [ ] Window resize works on 1024x720 minimum and portrait mobile simulation from devtools remains readable.

3. **Export profile**
   - [ ] `phase7/desktop-export-profile.json` reviewed for:
     - `appId`, `productName`, and output folder
     - icon paths
     - OS targets
     - included files (`.next`, `public`, `desktop`, runtime runtime deps)
   - [ ] App assets copied correctly (`public/icons/bliss-planner-icon-512.png`, `public/icons/bliss-planner-mark.svg`).
   - [ ] Release bundle excludes test fixtures, script caches, and logs.

4. **Build + package validation**
   - [ ] `npm run phase7:desktop:package` completes.
   - [ ] Development artifacts exist in `release/` (`BlissPlanner-0.1.0-arm64.dmg`, `BlissPlanner-0.1.0-arm64-mac.zip`).
   - [ ] Installer opens and launches the app successfully.
   - [ ] A fresh install keeps local storage and sync profile behavior intact.
   - [ ] Re-import package flow remains available after install.
   - [ ] `npm install -D electron electron-builder` has been run for packaging environment.

5. **Distribution prep**
   - [ ] Add platform signing credentials.
   - [ ] `npm run phase7:desktop:package:signed` passes with Apple Developer ID credentials.
   - [ ] `npm run phase7:desktop:package:win-smoke` passes before Windows installer release.
   - [ ] `npm run phase7:desktop:package:win-signed` passes with a Windows code-signing certificate.
   - [ ] Decide update strategy (manual distribution vs signed auto-update).
   - [ ] Capture release notes with:
     - version bump
     - known constraints (no cloud sync by default / optional local-first mode)
     - target OS versions.

6. **Optional sync backend gate**
   - [ ] `phase7/SYNC_BACKEND_ARCHITECTURE.md` reviewed.
   - [ ] `BLISS_RELAY_SECRET=dev-secret BLISS_RELAY_TOKEN=dev-token npm run sync:relay:prototype` starts locally.
   - [ ] Relay smoke validates `/health`, device pairing, `/sync/push`, `/sync/pull`, and delete-cloud-data.
   - [ ] Hosted Next relay routes validate `/api/sync/health`, pairing, push, pull, device revocation, and delete-cloud-data.
   - [ ] Render has `BLISS_RELAY_STORE_DIR=/var/data/bliss-relay` with a persistent disk, or `BLISS_RELAY_STORE_BACKEND=postgres` with `BLISS_RELAY_DATABASE_URL`.
   - [ ] Render has `BLISS_RELAY_SECRET` and `BLISS_RELAY_TOKEN` set.
   - [ ] Render has `BLISS_RELAY_TOKEN_VERSION`, `BLISS_RELAY_AUDIT_RETENTION_DAYS`, and `BLISS_RELAY_EVENT_RETENTION_DAYS` set.
   - [ ] `BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_RELAY_TOKEN=<token> npm run sync:relay:health` reports `durable: true`, `authRequired: true`, nonzero `auditLogCount`, and the expected token version.
   - [ ] Managed auth provider env is set: `BLISS_AUTH_PROVIDER`, `BLISS_AUTH_CLIENT_ID`, `BLISS_AUTH_CLIENT_SECRET`, `BLISS_AUTH_SESSION_SECRET`, `BLISS_PUBLIC_APP_URL`.
   - [ ] Encrypted package format approved before relay API work begins.
   - [ ] Device pairing, revocation, retention, conflict review, and delete-cloud-data flows are scoped.

## Suggested release order
1. `npm run phase6:pilot:deterministic`
2. `npm run build`
3. `BLISS_APP_URL=https://bliss-planner.onrender.com npm run qa:render:visual`
4. `BLISS_APP_URL=https://bliss-planner.onrender.com BLISS_RELAY_TOKEN=<token> npm run sync:relay:health`
5. `npm run phase7:desktop:smoke`
6. `npm run phase7:desktop:package`
7. `npm run phase7:desktop:package:win-smoke`
8. `npm run phase7:desktop:package:win-signed` after Windows signing credentials are available.
8. Install package artifact in a clean machine profile and run:
   - onboarding flow
   - reset + onboarding recheck
   - task interaction + guest target slider
   - export/import package roundtrip
   - offline mode banner + local edits

## Gate
If any gating item fails, keep build as **Release Candidate** and patch with a follow-up mini pass.
