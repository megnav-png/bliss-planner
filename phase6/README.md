# Phase 6 — Controlled Pilot (Real User Flow)

This phase executes the first controlled pilot cycle against the connected wedding-planner dashboard using seed data only.

## Pilot objective
- Validate planner onboarding, connected workflow actions, and data persistence under local-only/offline-friendly usage.
- Validate sync/continuity controls and packaging readiness from an operator perspective.
- Capture acceptance signals and failure points for rollout hardening.

## Pilot test scenarios (scripted)

### 0) Fresh-start reset
1. Open app.
2. Click **Reset seed data** (pilot operations).
3. Confirm reset prompt.
4. Refresh and verify:
   - Onboarding screen is shown again.
   - Default settings and metrics match seed data.

### 1) Onboarding + workspace creation
1. Complete onboarding with:
   - Planner name/email
   - business name
   - base currency + booking currency
   - locale/timezone/tax settings
   - sync mode
2. Verify welcome state transitions to dashboard.

### 2) Task ops + impact chain
1. In **Task impact map**, mark a high-priority task complete/incomplete.
2. Verify:
   - Ready count updates
   - Next actions list changes
   - Filtering and sorting still work
3. Move guest target slider.
4. Verify guest/rsvp/risk cards and derived rooming/transport text react.

3) Data continuity controls
1. Set planner identity and endpoint fields.
2. Run sync with no endpoint set -> confirm local-only messaging.
3. Enter synthetic endpoint like `https://example.invalid/sync` and capture expected error surfaced in diagnostics.
4. Export workspace package.
5. Re-import the same package.
6. Confirm state remains intact and diagnostics reset expectations shown.

4) Offline behavior cue
1. Toggle browser offline (manual in test environment).
2. Verify **Offline mode** banner and that local edits still appear to be accepted.

## Success criteria
- All primary actions complete without hard crash.
- Sync endpoint and planner identity persist between actions while local storage is available.
- Export/import cycle preserves seed-based state.
- No unhandled JavaScript errors in browser console during the above flows.

## Pilot evidence capture
- Screenshot set: desktop + mobile viewport
- Console error list before/after each scenario
- Sync diagnostics snapshot:
  - deviceId
  - pending sync count
  - endpoint/planner identity
  - last revision values
- Notes on any friction points

# Automated execution bundle
- App flow runner: `scripts/phase6-controlled-pilot.mjs`
- Package script: `npm run phase6:pilot`
- Optional env override:
  - `WOVOPS_APP_URL=http://localhost:3000`

## Runbook
1. Install dependencies:
   - `npm install`
   - Optional for automated flow: `npm install -D playwright` (if browser automation is not already available in this environment).
2. Run app:
   - `npm run dev`
3. In a second terminal run:
   - `npm run phase6:pilot`

### Cloud run
1. Install dependencies:
   - `npm ci`
2. Launch cloud-safe pilot:
   - `npm run phase6:pilot:cloud`
3. Use the report path printed in the terminal output.

## Runner outputs
- Scenario status for each scripted flow.
- Browser console and page errors.
- Local storage snapshots:
  - `wovops.phase2.state`
  - `wovops.phase2.sync.state`
- Three screenshots:
  - desktop, mobile, final
- Exported package:
  - `wovops-phase6-package-<timestamp>.json`
- Report:
  - `/tmp/wovops-phase6-pilot-<timestamp>.json`

## Notes from this environment
- Cloud and container execution is now the preferred path for noisy local environments.
- Share the generated report/screenshot paths and I will fold fixes immediately into Phase 7 hardening.
