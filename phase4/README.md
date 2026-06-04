# Phase 4 — Sync Engine + Cross-Device Continuity

## What was added

### 1) Sync engine integration (local write-ahead log)
- `src/lib/syncEngine.ts` now serves as the canonical local sync layer for:
  - planner profile updates
  - settings updates
  - active wedding/meta updates
  - wedding/task changes
- Added robust diagnostic metadata (`SyncDiagnostics`) and manual run summaries (`SyncRunSummary`).
- Added `LOCAL_FIRST` push+pull semantics.
- Added export/import package helpers for portable workspace transfer.

### 2) Repository write-path sync events
- `src/lib/repository.ts` now records sync events for all planner mutations:
  - onboarding/profile/settings/meta
  - sync mode updates
  - active wedding changes
  - task status toggle
  - guest target recalculation
- Added sync adapters:
  - `runPlannerSync`
  - `setSyncEndpointUrl`
  - `setPlannerIdentity`
  - `exportPlannerSyncPackage`
  - `importPlannerSyncPackage`
  - `getPlannerSyncDiagnostics`
  - `clearPlannerSyncState`

### 3) Query hooks for sync controls
- `src/lib/queries.ts` now includes hooks for sync workflow:
  - `useSyncDiagnostics`
  - `useSetSyncEndpoint`
  - `useSetPlannerIdentity`
  - `useRunPlannerSync`
  - `useExportSyncPackage`
  - `useImportSyncPackage`
  - `useClearPlannerSyncState`

### 4) Dashboard-level sync UX
- `src/app/page.tsx`
  - wires sync hooks + state into dashboard props
  - passes all sync actions as callbacks
- `src/components/Dashboard.tsx`
  - added “Cross-device continuity” control panel
  - manual run sync
  - endpoint + planner identity controls
  - workspace package export
  - package import via file picker
  - sync diagnostics + queue/revision/status/errors
  - clear sync metadata action
- `src/app/globals.css`
  - added responsive styles for sync panel (`.sync-panel`, `.sync-status-grid`, `.sync-controls`)

## Notes

- No realtime transport is required for this phase; all operations are manual and durable through:
  - device-local outbox + revision log
  - explicit endpoint sync
  - import/export package handoff

