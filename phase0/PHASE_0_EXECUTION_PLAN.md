# Phase 0 Execution Plan — Bliss Planner (Tauri + Next.js + TypeScript)

## 1) Chosen Stack (Execution Preference)
- **Desktop shell**: Tauri (fast, small footprint, Rust runtime, good system permissions)
- **Frontend**: Next.js (App Router) + TypeScript + React
- **State/data client**: TanStack Query + TanStack Table
- **Local persistence**: Prisma + SQLite (desktop-local file DB by default)
- **Cloud sync (opt-in)**: Prisma API gateway + PostgreSQL in your backend
- **PWA layer**: Service worker + Workbox for shell caching and offline assets
- **Background sync transport**: custom delta sync API (`/sync/push`, `/sync/pull`, `/sync/ack`)
- **Realtime replacement**: no realtime DB sync of user data. Optional event bus only for status notifications via Ably/WebSockets
- **Auth & preferences**: Google OAuth + email fallback, per-planner onboarding profile as source of truth for locale/currency/tax and units

## 2) Phase 0 Goals
- Define the product scope and non-negotiable constraints for a global wedding planner platform.
- Define MVP modules and dependency graph between modules.
- Define onboarding and trust model for privacy-first local-first behavior.
- Deliver interlinked data schema and sample starter data.
- Produce implementation backlog for Phase 1 with clear dependencies and estimates.

## 3) Core Problem & Product Positioning
- Wedding planning currently requires juggling disconnected tools for timelines, budgets, vendors, guest management, and client communication.
- Global planners face additional complexity from:
  - Multiple currencies, units, date-time zones
  - Vendor ecosystems in different legal and cultural environments
  - Destination-specific requirements (legal permits, travel logistics, seasonality)
  - Sensitive data concerns and device continuity demands
- Bliss Planner resolves this by making planning a **single operational cockpit** with connected views where one input propagates safely to every affected module.

## 4) Foundational User Journey (MVP)
1. Planner signs in and completes onboarding profile.
2. Onboarding captures:
   - `base_currency`
   - `booking_currency` defaults and conversion policy
   - `tax_locale` and preferred tax model
   - working hours, timezone, date format, number format
   - reporting defaults and legal reminders
3. Planner creates wedding workspace.
4. Planner adds key entities (date, venue, partner + client details, guest target, rituals/cultural markers).
5. Planner enters vendors and attaches tasks.
6. System computes connected views:
   - timeline risk
   - budget burn
   - guest-driven operational capacity effects
   - contract/payment deadlines
7. Planner uses guided “next best action” and client view sharing features.
8. Planner optionally syncs to cloud after explicit consent.

## 5) Must-have Requirements (from Phase 0)
- **Privacy-first default**:
  - No automatic cloud upload of full user data.
  - Local DB owns the source copy.
  - Sync is opt-in and token-based.
- **Interconnected planning**:
  - Any key data change must show impact signals (e.g., headcount affects catering, seating, rooms, transport).
- **Global-ready defaults at onboarding**:
  - Currency, units, tax treatment, locale, timezone, language profile.
- **Calendar & planning clarity**:
  - Milestones, dependencies, and red-risk indicators are always visible.
- **Offline resilience**:
  - Planner works fully offline with local caching and write-ahead updates.
- **Sync transparency**:
  - User sees what changed, when, and what was synced.

## 6) Module Scope for MVP (High-level)
- **Workspace & client setup**
  - planners, profile, teams, roles, onboarding preferences
- **Wedding project**
  - core event details, date, venue, location, partner details, ceremony types
- **Planning engine**
  - tasks, dependencies, milestones, day-of flow, rehearsal runbook
- **Vendor/contract layer**
  - vendors, services, contacts, contracts, deliverables, SLA windows
- **Guest operations**
  - RSVP, seating blocks, meal preferences, rooming, passport/visa tags for destination
- **Budgeting & finance**
  - budgets, commitments, payables, receivables, cost category tax logic
- **Client experience**
  - timeline summaries, update packets, portal-friendly notes, milestone sharing
- **Culture and destination intelligence**
  - ritual checklist templates, gift etiquette reminders, local compliance flags

## 7) Data Model Boundary (Local-First)
- **Planner** owns one or more **Weddings**
- **Wedding** owns:
  - Guests, Vendors, Tasks, Timelines, Contracts, Payments, Documents, Destination Profile
- Every major object includes:
  - `id`, `weddingId`, `status`, `revision`, `updatedAt`, `updatedByDeviceId`
- Sync metadata for optional cloud sync:
  - `syncState`, `dirty`, `deleted`, `lastSyncedAt`, `conflictState`

## 8) Sync Strategy (No direct realtime user-data replication)
- Use **delta sync**, not live pub/sub replication.
- Change stream is generated per-device from `revision` + `updatedAt`.
- Cloud sync queue stores only encrypted signed batches.
- On pull, client receives only deltas since `cursor`.
- Conflicts handled with manual merge UI:
  - Keep local
  - Keep remote
  - Merge field-level
- If a feature requires instant alerts only, use notification channel (Ably/WebSocket), but not financial/PII dataset as a shared state fabric.

## 9) UX Direction Decisions
- Strong default dashboard that answers:
  - “What must be done next?”
  - “What is at risk this week?”
  - “What changed and what are downstream impacts?”
- Cross-module impact chips:
  - change in one record triggers linked impact cards in adjacent modules.
- Time-sensitive commands:
  - critical tasks pinned to top with deadlines and dependency blockers.
- Planner trust:
  - explicit “data mode” switcher (local-only / cloud-sync-on), visible at all times.
- Offline clarity:
  - sync status always visible (“all saved locally”, “sync pending”, “synced to cloud”).

## 10) Deliverables for Go-Live from this phase
- Finalized scope document and UX guardrails
- Interconnected entity map with primary keys and relationships
- Data privacy and sync policy text for onboarding/legal layer
- Onboarding flow spec with all required defaults (currency/metrics/locale)
- Seed data profile for sprint-ready UI + QA content
- Implementation queue for Phase 1

## 11) Phase 0 Exit Criteria
- Product scope and constraints signed by stakeholder
- Data model accepted by engineering and UX
- Offline and sync trust model approved
- No unresolved compliance question regarding “opt-in synchronization”
- Dummy data package ready and importable

## 12) Phase 1 (brief handoff)
- Convert these docs into Prisma schema and migration plan.
- Build Next.js shell and local SQLite access layer.
- Implement onboarding plus planner profile wizard.
- Add TanStack Query layer and baseline dashboard with impact graph.
- Add dummy seed importer and local CRUD pages for core entities.
