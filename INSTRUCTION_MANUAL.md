# Bliss Planner – Instruction Manual

## 1. About this product

Bliss Planner is a wedding planning dashboard built for operators. It focuses on:

- quick planning actions across budget, timeline, vendors, and guest operations
- workflow continuity across devices
- offline-first local storage by default
- lightweight imports/exports for migration or handoff

## 2. Onboarding and initial setup

1. Start the app and complete the onboarding wizard.
2. Fill planner profile (name, email, business/studio) and click **Continue**.
3. Configure default currencies:
   - Base currency
   - Reporting currency
   - Booking currency
4. Configure planning defaults:
   - timezone
   - locale
   - date format
   - time format
   - default lead-time and RSVP reminder windows
5. Select your sync preference:
   - `Local only` (default)
   - `Local-first sync (opt-in)`
   - `Cloud mirror`
6. Click **Create Planner Workspace** to open the dashboard.

You can reopen the product from the app from:
- **Open product** (local dashboard): [Open product](/) 
- **Playora marketing website**: [https://www.playoramusic.com](https://www.playoramusic.com)

## 3. Dashboard quick tour

### Header

- **Wedding operations center**: top area title and user identity.
- **Mode chip**: current sync mode.
- **Run sync now**: start a sync if endpoint and planner ID are configured.
- **Open manual**: returns to this guide from within the app.

### Wedding workspace controls

- **Wedding Workspace**: choose which wedding you want to work on.
- Summary line gives quick event name, destination, and date context.

### Cross-device continuity

- Set your `Sync endpoint` and `Planner identity`.
- Review `sync state`, `queue` and revision info.
- Export/import workspace package for transfer to other devices.
- Clear sync metadata if needed, or reset seed data for a clean baseline.

### KPI cards

- Budget health: planned vs spent, variance.
- Guest movement: confirmed, target, pending.
- Tasks: open/blocked/completed counts.
- Risk signal: rooming pressure and team status indicators.

### Tasks

- **Next actions**: highest-priority immediate tasks.
- **Task impact map**: searchable and filterable task table.
- Use actions to mark tasks done/undo and review pending impacts.

## 4. Guest target controls

- Slide **Guest target** to see live planning impacts:
  - rooming pressure
  - transport/shuttle estimate
  - notes reflected in planning impact cards.

## 5. Syncing and migration

1. Keep endpoint and planner ID stable across all devices.
2. Run sync after large edits before switching machine.
3. Export a workspace package before destructive operations:
   - local reset
   - OS reinstall
   - hardware migration
4. Import that package on the new instance and verify counts/tasks.

## 6. Troubleshooting

- App won’t load data:
  - check browser storage permissions for local origin
  - reload and verify no active migration script is still running
- Sync errors:
  - verify endpoint URL format
  - confirm planner identity matches across devices
- Slow startup:
  - ensure no other process is using configured app port
- Unknown task statuses:
  - open task table filters and clear active column filters if needed

## 7. Recommended operating cadence

- Morning: review risk card + next actions.
- Midday: scan guest movement and pending responses.
- Before supplier checkpoints: use task filters and guest target recalculations.
- End-of-day: sync, export package backup, and close tasks.

## 8. Quick support checklist

- Confirm current sync mode
- Confirm endpoint and planner ID
- Confirm active wedding context
- Confirm local storage is writable
- Confirm task filter reset state
- Verify recent package backup exists
