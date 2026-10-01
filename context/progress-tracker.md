# Progress Tracker — Tik-Booth

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Pre-Phase 1 — Planning & Documentation (complete)
**Last completed:** Full documentation set + complete UI screen set, all cross-consistent
**Next:** `01 Homepage / Discover shell — Full UI` (first real code, per `build-plan.md`)

No application code has been written yet. Every phase below is unchecked because the build hasn't started — this tracker exists from day one so the first commit has something to update rather than something to invent.

---

## Progress

### Phase 0 — Planning & Documentation (not part of build-plan.md phase numbering)
- [x] project-overview.md
- [x] project-scope.md
- [x] architecture.md
- [x] code-standards.md
- [x] library-docs.md
- [x] ui-tokens.md
- [x] ui-rules.md
- [x] ui-registry.md
- [x] build-plan.md
- [x] Full UI screen set (35 screens, light + dark, published as an artifact + exported PNGs)
- [ ] progress-tracker.md — this file, created, to be updated from here on

### Phase 1 — Foundation
- [ ] 01 Homepage / Discover shell — Full UI (mock data)
- [ ] 02 Auth
- [ ] 03 PostHog Initialization
- [ ] 04 Database Schema

### Phase 2 — Discover & Event Detail
- [ ] 05 Discover Page — Full UI (real categories, mock events)
- [ ] 06 Discover Page — Real Data
- [ ] 07 Event Detail Page — Full UI
- [ ] 08 Event Detail Page — Real Data

### Phase 3 — Checkout & Ticket Issuance
- [ ] 09 Checkout Page — Full UI
- [ ] 10 Reservation + Checkout Logic
- [ ] 11 Payment Webhook + Ticket Issuance
- [ ] 12 My Tickets — Full UI
- [ ] 13 My Tickets — Real Data

### Phase 4 — Organizer Onboarding & Event Creation
- [ ] 14 Organizer Onboarding — Full UI
- [ ] 15 Onboarding Logic — Profile & Payout
- [ ] 16 Onboarding Logic — Event & Ticket Tiers

### Phase 5 — Door Staff Access, Check-in & Organizer Dashboard
- [ ] 17 Door Staff Access — Full UI
- [ ] 18 Door Staff Access — Real Logic
- [ ] 19 Check-in Scanner — Full UI
- [ ] 20 Check-in Scanner — Real Logic
- [ ] 21 Organizer Dashboard — Full UI
- [ ] 22 Organizer Dashboard — Real Data

### Phase 6 — Online Events
- [ ] 23 Online Event Join Screen — Full UI
- [ ] 24 Online Event Join Screen — Real Logic

---

## Decisions Made During Build

These were locked in during planning, before any code was written, and should not be revisited casually — each has a reason attached in `project-scope.md` or `architecture.md`.

- Stack: Next.js (App Router) + TypeScript strict + Tailwind v4 + Supabase (Postgres/Auth/Storage/RLS) + Zustand (UI state only) + TanStack Query (server state) + PostHog + Paystack.
- One signup flow for everyone — `profiles.is_organizer` starts `false`; "Become an organizer" on the Profile screen is the only upgrade path. No separate attendee/organizer signup.
- Monetization: fixed **20.3% commission** on every ticket sale, taken via Paystack Split Payments, applied uniformly across all future markets.
- Payment provider: **Paystack at launch**, chosen specifically because Stripe Connect does not support payouts to Nigerian bank accounts. Built behind a `PaymentProvider` interface so a pan-African processor (e.g. Flutterwave) can be added for African expansion before Stripe Connect is considered for global markets. Expansion order is **Nigeria → rest of Africa → global**.
- **No refunds and no resale/transfer of tickets, anywhere in the product.** A purchased, unused ticket is simply unused. This was a deliberate, revisited decision — resale was originally in scope, then explicitly removed.
- **No age-restriction feature.** Considered and explicitly dropped — self-declared-only enforcement was judged not worth building for MVP.
- Money is always an integer in kobo, never a float. `COMMISSION_RATE`, `RESERVATION_HOLD_MINUTES`, and `MAX_TICKET_CARD_IMAGE_MB` are defined once in `lib/constants.ts`.
- Overselling is prevented by an atomic Postgres RPC (`reserve_ticket_inventory`) plus a time-limited `reservations` hold — not a bare "transaction," a specific `UPDATE ... WHERE ... RETURNING` pattern.
- Ticket issuance is **webhook-driven and idempotent** — a `processed_webhook_events` table keyed on Paystack's event id prevents double-issuance on a retried webhook. Paystack signs webhooks with **HMAC-SHA512**, not SHA256.
- QR codes encode an **HMAC-signed token**, never a raw `ticket_id`, to prevent a screenshotted ticket from being turned into a working duplicate.
- **Check-in is online-only for MVP** — considered and explicitly rejected an offline/queued scanning mode, because two offline gates could both admit the same ticket before a sync reconciles them.
- **Door staff never get Supabase Auth accounts.** Access is a single per-gate, revocable, hashed token embedded in a link the organizer generates — see `door_staff_access` table and the `GateLinkModal`/`validateDoorStaffToken` pattern.
- Events require both a `starts_at` **and** `ends_at` — the latter exists specifically to compute the "Live" badge, which is otherwise undefined.
- "Live" status, the reservation-hold countdown, and the online-event unlock countdown are all computed from **server-provided timestamps**, never the client device clock.
- Ticket card images: accept up to 50MB on upload, compress/resize server-side before ever rendering — the cap is enforced at the Supabase Storage bucket policy level, not just client-side.
- PostHog: six approved events total (`event_page_viewed`, `checkout_started`, `checkout_payment_initiated`, `ticket_purchased`, `ticket_scanned`, `organizer_onboarding_step_completed`). `ticket_purchased` and `ticket_scanned` are **server-fired only**. Organizer dashboard funnel numbers are queried server-side from PostHog's API, filtered per-organizer — never pointed at PostHog's shared raw UI.
- UI: Plus Jakarta Sans throughout, mobile uses a fixed bottom tab bar (no top navbar), desktop uses a top navbar plus a Discover-only category sidebar. The ticket card is the one component allowed a colored/gradient background and a heavy shadow — every other card stays flat white/`bg-surface`.
- Full token set, component registry, and 35-screen UI reference already exist and are the source of truth for anything visual — see `ui-tokens.md`, `ui-registry.md`, and the published UI artifact.

---

## Notes

- This project has gone through an unusually thorough planning phase relative to JobPilot's tracker at the same stage — nine documentation files plus a full visual screen set were produced and cross-checked against each other before any code was written. That front-loaded cost is intentional given how much of this product's trust depends on money- and inventory-handling code being correct the first time (see the dedicated "Architecture Review" section of `project-scope.md`).
- The UI screen set (`tik-booth-ui.html`) is published as a live artifact and also exported as per-section PNGs (light + dark) and one full-page composite — these are reference material for implementation, not themselves part of the Next.js codebase.
- `ui-tokens.md` currently documents the token values exactly as they exist in the published HTML artifact's inline `<style>` block. When `app/globals.css` is created in Feature 01, the `@theme` block must be copied from `ui-tokens.md` verbatim — not re-derived from scratch — to avoid the two drifting apart.
- No `types/database.types.ts` exists yet since no Supabase project/schema has been created. This is expected to be one of the first real artifacts of Feature 04.
- Nothing in `project-scope.md`'s "Open Questions" section remains unresolved as of this tracker's creation — all prior open items were explicitly closed out during planning (see `project-scope.md` for the resolution of each).
