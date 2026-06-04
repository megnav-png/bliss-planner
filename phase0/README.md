# Phase 0 Deliverables

This folder contains execution material for **Phase 0** using the selected stack:

- [Execution plan](./PHASE_0_EXECUTION_PLAN.md)
- [Interconnected seed model and starter data](./data-model.json)
- [Engineer handoff checklist](./engineer_handoff_checklist.md)

## Recommendation taken in this phase
- Stack: **Tauri + Next.js + TypeScript + Prisma**
- Sync philosophy: **local-first**; no realtime cloud replication of user data.
- Sync behavior: explicit opt-in incremental sync using signed change batches.

## Next action after Phase 0
Move to Phase 1 with Prisma schema generation, onboarding flow, and dashboard shell using the above model as seed.
