# Phase 0 Handoff Checklist (Ready for Execution)

## UX and Product Requirements Checklist
- [ ] Confirm onboarding fields:
  - base currency and reporting currency
  - tax/tip defaults
  - timezone and locale
  - timezone/date format/time format
  - distance and capacity units
  - notification preference and sync mode defaults
- [ ] Confirm dashboard structure:
  - command header (next 10 actions + risk count)
  - planning runway
  - live impact indicator bar
  - finance snapshot
  - client experience queue
- [ ] Confirm privacy state labels:
  - local-only
  - syncing pending
  - synced with cloud
  - conflict needs review

## Engineering Handoff (Phase 1) — Suggested Ticket Order
1. **Domain bootstrap**
   - Create workspace with Next.js + TypeScript monorepo layout (app, packages, shared types)
   - Add environment and secrets structure
2. **Prisma data foundation**
   - Create local SQLite schema from phase0 model
   - Add migration + seed hooks using `phase0/data-model.json`
3. **Planner onboarding**
   - Implement planner profile screen as immutable baseline until first save
   - Persist onboarding to local DB with revision metadata
4. **Connected dashboard shell**
   - Build landing command bar + connected cards + timeline map
   - Implement impact chips from `impactNodes` model
5. **Task graph and risk engine**
   - Implement dependency-based task statuses and blockers
   - Add weekly risk score and trigger thresholds
6. **Sync service contract**
   - Implement `/sync/push`, `/sync/pull`, `/sync/ack`
   - Add device registration and cursor tracking
7. **Conflict resolution UI**
   - Build review screen for conflicting edits by field + reason
8. **Offline and backup controls**
   - Export/import encrypted JSON backup (local only)
   - Restore and merge preview

## Non-functional Checklist
- [ ] Offline-first write path verified with temporary network drop simulation
- [ ] Encryption at rest for local backup files
- [ ] Accessibility baseline: keyboard first flows + tab order + color contrast
- [ ] Language and number formatting tests for at least 5 locales/currencies
- [ ] Incident/error telemetry on sync failures (non-personalized aggregation)

## Data Contract Notes
- All write APIs must include:
  - `revision`
  - `updatedByDeviceId`
  - `updatedAt`
  - optional `conflictState`
- Sync response must include:
  - `deltaId`
  - `entityType`
  - `entityId`
  - `op` (`create`, `update`, `delete`)
  - `payload`
  - `revision`
  - `serverVersion`
