# Phase 1 Deliverables (Execution Complete)

This folder contains the executed Phase 1 outputs for the Tauri + Next.js + Prisma stack:

- [Prisma domain schema](../prisma/schema.prisma)
- [Domain model + design notes](./PHASE_1_DATA_MODEL_AND_DOMAIN_DESIGN.md)
- [Seed payload aligned to schema](./seed-data.json)

## Notes
- The database design follows a **local-first** pattern with explicit sync metadata on operational entities.
- Sync is opt-in and implemented through outbox + cursor + conflict records, not realtime replication.
- The schema is ready for a local SQLite implementation and can be promoted to PostgreSQL in the sync service.
- No tests were run and no migrations were executed in this step.
