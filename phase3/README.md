# Phase 3 — Data Access + TanStack Query + Table-First Task Surface

## What changed

### 1) Query infrastructure
- Added TanStack Query client provider in `src/app/providers.tsx`.
- Wrapped the app with `<QueryClientProvider>` in `src/app/layout.tsx`.
- Added query/mutation hooks in `src/lib/queries.ts`:
  - `usePlannerState`
  - `useCompleteOnboarding`
  - `useToggleTask`
  - `useUpdateGuestTarget`
  - `useSetSyncMode`
  - `useSetActiveWedding`

### 2) Repository + local domain orchestration
- Added `src/lib/repository.ts` as a query-friendly, async-backed domain façade over localStorage.
- Kept all state mutations as repository calls so this layer can later be swapped for Prisma/Cloud adapters:
  - `getPlannerState`
  - `completeOnboarding`
  - `toggleTask`
  - `updateGuestTarget`
  - `setSyncMode`
  - `setActiveWedding`

### 3) Connected, query-driven page shell
- Refactored `src/app/page.tsx` to:
  - load planner state via `usePlannerState`
  - route onboarding through mutation
  - route dashboard actions through mutations
  - show loading and failure states

### 4) Task management UX with TanStack Table
- Upgraded `src/components/Dashboard.tsx` task panel to TanStack Table.
- Added sorting and filtering UX:
  - Search input (global filtering)
  - Status filter
  - Priority filter
- Added resilient loading UX for task actions (mutations disable task action button while a mutation is pending).
- Added minimal table styling in `src/app/globals.css`.

## Phase 3 implementation files
- `src/lib/repository.ts`
- `src/lib/queries.ts`
- `src/app/providers.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/Dashboard.tsx`
- `src/app/globals.css`
- `package.json` (TanStack dependencies added)

## Notes for the next phase
- `src/lib/repository.ts` currently uses localStorage as a durable source; sync placeholders can be added by replacing repository methods.
- Optional next step is to introduce an explicit sync status outbox and an action log for local-only/cloud-ready conflict visibility.
