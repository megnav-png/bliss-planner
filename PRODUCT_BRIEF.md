# Bliss Planner Dashboard

## Research Synthesis

Common wedding planning products and guides converge on the same operational spine: budget first, then guest list, venue/date, priority vendors, timeline, RSVPs, seating, catering, attire, legal paperwork, day-of logistics, and post-event wrap-up. Professional tools extend this into CRM, proposals, contracts, invoices, payments, floor plans, BEOs, vendor coordination, room blocks, and client portals.

For global weddings, the dashboard must account for destination constraints and cultural specificity: passports, visas, legal or symbolic ceremonies, room blocks, transfers, guest travel, translation, multi-day rituals, family expectation management, food rules, ceremony order, attire, and local vendor compliance.

## Feature Summary

| Feature | Practical benefit | Priority |
| --- | --- | --- |
| Active wedding portfolio | Lets planners scan every couple, market, date, phase, guest count, and risk posture from one screen. | P0 |
| Linked planning timeline | Converts generic checklists into deadlines tied to the actual wedding date, culture, venue, vendor status, and client approvals. | P0 |
| Budget and payment health | Shows commitments, deposits, open variance, quote drift, and payment exposure before margin erodes. | P0 |
| Guest, RSVP, seating, and catering bridge | Makes guest changes update meal counts, table plans, room blocks, transport waves, staffing, and budget. | P0 |
| Vendor and contractor operations | Tracks caterers, decorators, venues, entertainers, transport, rentals, contracts, insurance, setup windows, and action owners. | P0 |
| Client portal readiness | Keeps couple-facing decisions, design approvals, family notes, itineraries, documents, and messages visible. | P0 |
| Cultural ritual planner | Maps traditions, ceremony moments, family stakeholders, attire, food rules, language, and program copy into the main timeline. | P1 |
| Destination logistics | Manages hotel blocks, flights, transfers, passports, visas, local legal paperwork, currency, weather, and timezone-aware updates. | P1 |
| Run sheet and day-of command | Turns planning data into a live operations schedule for vendors, team members, venues, and client-facing moments. | P1 |
| Risk and contingency desk | Flags weather, capacity, legal paperwork, vendor payments, attrition, power, staffing, and timeline conflicts. | P1 |
| Business development pipeline | Connects leads, proposals, packages, source attribution, close probability, and projected event value. | P2 |
| Marketplace and partner intelligence | Helps shortlist top caterers, decorators, venues, contractors, and destinations by location, fit, budget, capacity, and reliability. | P2 |

## Connected Data Schema

Core entities should be normalized but surfaced as one graph:

- `Wedding`: date, market, couple, planner team, budget, cultures, venues, status.
- `Client`: contacts, family stakeholders, communication preferences, portal permissions.
- `Guest`: RSVP, household, travel origin, room, meal, allergy, seating, accessibility.
- `Venue`: spaces, capacity, floor plans, backup plans, rules, load-in windows.
- `Vendor`: category, contract, quote, payments, insurance, tasks, documents.
- `TimelineTask`: owner, due date, dependencies, related wedding/vendor/guest/ritual.
- `BudgetLine`: category, estimate, quote, committed, paid, variance, linked vendor.
- `Ritual`: culture, event segment, required people, objects, timing, copy, food/attire rules.
- `LogisticsItem`: room block, transport wave, document, itinerary item, timezone, status.
- `Risk`: severity, trigger, owner, mitigation, linked entity.
- `Lead`: source, value, probability, proposal, next action, assigned planner.

## Recommended Tech Stack

- Frontend: React + TypeScript, Vite or Next.js, Tailwind or CSS variables, TanStack Query, TanStack Table, Zustand for local UI state.
- PWA: Workbox service worker, offline cache for day-of run sheets, installable shell, background sync for task updates.
- Backend: Node.js with NestJS or Fastify, GraphQL or REST plus webhooks for vendor/client events.
- Database: PostgreSQL with Prisma, row-level tenancy, JSONB for localized ritual templates, PostGIS for destination/vendor search.
- Realtime: Supabase Realtime, Ably, or WebSockets for planner-team and client-portal updates.
- Integrations: Stripe, QuickBooks/Xero, Google Calendar, Gmail/Outlook, WhatsApp/Twilio, DocuSign, Maps, travel APIs, venue floor-plan exports.
- AI layer: Retrieval-assisted planning assistant for checklist generation, cultural template suggestions, risk detection, email drafts, budget variance summaries, and vendor comparison.
- Deployment: Vercel/Netlify for frontend, Fly.io/Render/AWS ECS for API, managed Postgres, Sentry, PostHog, and OpenTelemetry.
