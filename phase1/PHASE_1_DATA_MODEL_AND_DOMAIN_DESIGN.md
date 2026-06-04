# Phase 1 — Data Model and Domain Design

## 1) Domain boundaries

### Planner core
- `Planner` is the tenant identity in single-planner desktop mode.
- `PlannerSettings` stores first-run preferences that drive global behavior:
  - base currency, reporting currency, timezone, locale, number/date format
  - tax mode and tax rate defaults
  - lead-time and communication defaults
- All data can be managed without sync by default (`LOCAL_ONLY`).

### Wedding workspace
- `Wedding` is the primary aggregate root for each event.
- Every operational module links to `Wedding` directly to ensure impact propagation:
  - `Task`
  - `Budget` / `BudgetLine`
  - `GuestGroup` / `Guest`
  - `VendorContract` / `Payment`
  - `TimelineItem` / `RunSheetItem`
  - `RiskSignal`

### Culture and destination
- `CultureProfile` is reusable and can be linked via `WeddingCulture`.
- `DestinationProfile` stores legal, travel, and compliance notes specific to each wedding.
- Destination rules update:
  - visa guidance
  - seasonality and weather risk
  - local customs and contract constraints

### Commercials
- `Vendor` belongs to planner and can serve many weddings.
- `VendorContract` connects a vendor to a wedding and stores contractual totals and lifecycle.
- `Payment` represents contractual instalments and settlement status.

### Guests and operations
- `GuestGroup` allows quick headcount math and meal/rooming planning.
- `Guest` stores individual responses and logistics markers (`YES`, `NO`, `MAYBE`, etc.).
- Guest changes intentionally feed into:
  - budgeting pressure
  - seating and rooming modules
  - vendor logistics tasks

### Workflow orchestration
- `Task` and `TaskDependency` model planning dependencies.
- `TaskImpact` stores area-level impact propagation so one edit can surface downstream work needed in finance, vendor, guest ops, and schedule views.
- `TimelineItem` and `RunSheetItem` support both pre-wedding planning and day-of execution.

### Business development
- `PipelineLead` tracks opportunities by source.
- Lead can convert into a `Wedding` via optional `weddingId`.

## 2) Sync design embedded in schema

Every mutable domain entity includes:
- `revision` (integer optimistic cursor)
- `syncState` (`LOCAL_ONLY`, `PENDING`, `SYNCED`, `CONFLICT`, `FAILED`)
- `updatedByDevice` for attribution
- `lastSyncedAt` for visibility
- `deletedAt` for soft-delete/tombstone style change capture

Supporting sync tables:
- `SyncDevice` identifies and tracks all planner devices.
- `SyncOutbox` stores outgoing change events for delta sync.
- `SyncCursor` tracks per-device cursor by sync scope.
- `SyncConflict` supports manual reconciliation UI for non-trivial merges.

## 3) Entity summary

### Enums implemented
- `WeddingStatus`, `WeddingType`, `RiskLevel`
- `VendorType`, `TaskStatus`, `TaskPriority`, `ContractStatus`, `PaymentStatus`, `RSVPStatus`
- `ImpactArea`, `BudgetCategory`, `TimelineKind`, `TimelineStatus`, `DocumentKind`, `LeadSource`, `LeadStatus`
- `SyncState`, `SyncOperation`, `LocalSyncMode`, `SyncResolution`, `TaxMode`, `CurrencySource`

### Important indexes
- `Planner(email)` unique
- `Wedding(plannerId, status)`, `Wedding(eventStart)`
- `Task(weddingId, status)`
- `Vendor(plannerId, vendorType)`
- `Guest(weddingId, rsvpStatus)`
- `SyncCursor(plannerId, deviceId, scope)` unique

## 4) Integrity rules
- Planner owns all workspace-level data.
- Deleting a wedding cascades:
  - tasks, timeline, budgets, guests, contracts, documents, risks
- Vendor contracts are retained if vendor remains active.
- Destination and culture links cascade-delete with wedding archive only when that wedding is removed.
- Lead-to-wedding conversion is optional and non-destructive.

## 5) Migration-ready notes
- Local development is `sqlite` by default via Prisma provider.
- For cloud sync services, a separate PostgreSQL runtime can reuse this domain model by moving the same Prisma schema and `DATABASE_URL`.
- Keep enum values stable to avoid migration conflicts across desktop upgrades.

## 6) Suggested Phase 1 implementation sequence
1. Generate Prisma client from schema.
2. Build repository seed importer using `phase0/data-model.json`.
3. Implement onboarding (`PlannerSettings`) and enforce required defaults before dashboard use.
4. Build dashboard modules with cross-panel impact events:
   - task graph
   - budget + vendor/contract heatmap
   - destination/culture warning cards
5. Add sync outbox + cursor records with no background polling yet.
6. Add conflict list screen using `SyncConflict`.
