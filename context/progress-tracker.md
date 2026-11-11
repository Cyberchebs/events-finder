# Progress Tracker — Tik-Booth

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 8 — Event Category Taxonomy (Feature 26 implemented; migration applied)
**Last completed:** Phase 8 Feature 26 migration applied and verified in remote migration history
**Next:** Verify organizer category selection, Discover filters, and publishing in the browser

**Current limitation:** Geoapify suggestions/static map rendering and published-event end-to-end location verification remain outstanding. Existing published in-person events without coordinates show the directions action with a map-unavailable state until venue coordinates are saved. The Phase 6 migration is applied and verified in remote history. The legacy public URL column is absent; direct access to the private schema/table and anonymous RPC execution are denied, while authenticated access RPC execution is granted. No end-to-end online event/ticket fixture was available to exercise the locked and unlocked results. The development-only `/preview/online-join` route remains mock-only. PostHog private-query settings remain required for live funnel analytics. Dashboard/gate-management visual sign-off and an end-to-end check-in flow remain outstanding. Paystack sandbox/webhook verification remains outstanding. Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7, and Phase 8 migrations are applied and verified in remote migration history. Feature 08 remains implemented but unverified against a published event.

**Recent feature:** Discover now searches all Nigerian events by venue/city text and supports Geoapify location suggestions plus free text. Organizers select a Nigeria-filtered Geoapify venue; its formatted address, city/state, and coordinates are stored. In-person event details render an attributed Geoapify static map with a Google Maps directions button. Migration `20261110223000_nigeria_event_locations.sql` is applied and verified.

**Recent feature:** Replaced the five legacy event categories with the requested 12-category taxonomy. Organizer forms, Discover filters, category gradients, and the legacy category sidebar now use the shared list. Migration `20261111002500_replace_event_categories.sql` mapped existing `Music` and `Business` event rows and updated the publishing validator; it is applied and verified remotely. The published-event coordinate check remains `NOT VALID` and enforces coordinates on new writes.

**Phase 7 validation:** Focused ESLint, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. Live Geoapify suggestions and map rendering remain unverified; published-event end-to-end verification is still pending.

**Phase 8 validation:** Focused ESLint, TypeScript, production build, exact category count/order, and whitespace checks passed. Remote verification confirmed all 12 categories are accepted by `publish_onboarding_event`, existing event categories were remapped, and the coordinate constraint remains installed.

**Reservation expiry scheduling:** Removed the Vercel Cron schedule and added a GitHub Actions workflow that calls the protected reservation-expiry endpoint every five minutes, with manual dispatch and serialized runs. Configure repository Actions secrets `CRON_JOB_URL` and `CRON_SECRET` before enabling scheduled cleanup in deployment. The GitHub workflow itself has not been run from GitHub yet.

**Recent fix:** Completed organizers can create additional events without being redirected to the latest published event. New-event actions create a distinct draft; draft continuation carries its event ID through the wizard.

**Recent design alignment:** Responsive navigation, Discover, login, organizer setup, ticket wallet (including the empty state), check-in landing/scanning, and the `/profile` route were aligned to the current screens in `context/tik-booth-designs`. The profile page now includes real ticket, organizer-dashboard/onboarding, and sign-out actions; unsupported profile-edit, interests, privacy, and notification controls were not fabricated. Pages without a direct screen retain their behavior and use the shared design tokens and related page patterns.

**Design alignment validation:** Focused ESLint, TypeScript, production build, and whitespace checks passed after the latest empty-wallet and scanner-landing refinements. Discover and login were opened in the local browser; authenticated dashboard, onboarding, and ticket-wallet states were not visually exercised because no signed-in test session was available. Comparison of all live routes/states against the reference set remains incomplete, including checkout-result and full ticket-detail screens.

**Ticket card customization:** Per-tier preset/custom color, solid/torn shape, normal/metallic finish, and organizer-selected black/white text persist through the existing migration. The CSS-only facade is replaced by actual React Three Fiber extruded meshes with physical normal/metallic materials, artwork textures, and signed-QR textures on an opaque white face. Organizer previews and issued wallet tickets share the renderer; the accessible 2D face remains usable when WebGL is unavailable or the context is lost. Pointer/touch and keyboard rotation are synchronized between the mesh and readable DOM text. Focused and full ESLint, TypeScript, production build, and browser checks passed; the browser verified both rendered cards and the forced no-WebGL fallback. The already-applied `20261103194200_custom_ticket_cards.sql` migration was not reapplied.

**Profile theme switch:** The Profile settings now control app-wide light/dark mode. New or unsaved preferences default to light regardless of system setting; the selected theme is saved in browser storage and initialized before first paint. Focused ESLint, TypeScript, production build, and whitespace checks passed. Browser checks confirmed light mode under a forced system-dark preference, saved dark mode after reload, and dark mode across client navigation. A signed-in session was unavailable, so the Profile control itself was not exercised in-browser.

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
- [x] progress-tracker.md — maintained as implementation and validation progress changes

### Phase 1 — Foundation
- [x] 01 Homepage / Discover shell — Full UI (mock data)
- [x] 02 Auth — Supabase SSR clients, OAuth callback, proxy protection, email/password and Google flows; session-aware desktop navbar and logout
- [x] 03 PostHog Initialization — browser/server SDKs, pageviews and exception capture; click/form autocapture disabled; six approved product/operational events
- [x] 04 Database Schema — core tables, enums, and RLS deployed; `ticket-card-images` bucket/policies deployed

### Phase 2 — Discover & Event Detail
- [x] 05 Discover Page — Full UI (category/city filters, search, loading/error/empty states)
- [x] 06 Discover Page — Real Data (server feed and React Query refresh; API verified with live database)
- [x] 07 Event Detail Page — Full UI
- [ ] 08 Event Detail Page — Real Data (implemented; awaiting a published event for live verification)

### Phase 3 — Checkout & Ticket Issuance
- [x] 09 Checkout Page — Full UI (event tier selection and checkout quantity stepper; max 10 per order)
- [x] 10 Reservation + Checkout Logic (authenticated start, rate limiting, atomic inventory reservation, free-ticket issuance, Paystack redirect/status flow, and provider-aware expiry worker; local DB validation pending)
- [x] 11 Payment Webhook + Ticket Issuance (signature-verified, idempotent paid issuance; sandbox verification pending)
- [x] 12 My Tickets — Full UI (issued QR cards, used/void rows, empty state, event actions)
- [x] 13 My Tickets — Real Data (owner-scoped reads and safe event-details RPC; migration not applied)

### Phase 4 — Organizer Onboarding & Event Creation
- [x] 14 Organizer Onboarding — Full UI (five-step wizard)
- [x] 15 Onboarding Logic — Profile & Payout
- [x] 16 Onboarding Logic — Event & Ticket Tiers

### Phase 5 — Door Staff Access, Check-in & Organizer Dashboard
- [x] 17 Door Staff Access — Full UI (mock gate-management screen and usher landing screen; visual sign-off pending)
- [x] 18 Door Staff Access — Real Logic (organizer actions, one-time hashed gate links, validation and revocation implemented; migration applied)
- [x] 19 Check-in Scanner — Full UI (mock scanning and all four sample result states; visual sign-off pending)
- [x] 20 Check-in Scanner — Real Logic (online camera scans, signed QR verification, atomic check-in and per-gate rate limit implemented; migration applied)
- [x] 21 Organizer Dashboard — Full UI (mock overview, event dashboard, funnel, and per-gate breakdown; visual sign-off pending)
- [x] 22 Organizer Dashboard — Real Data (organizer-scoped metrics and PostHog funnel query implemented; migration applied; PostHog query configuration pending)

### Phase 6 — Online Events
- [x] 23 Online Event Join Screen — Full UI (locked/unlocked token-styled states and development-only mock preview; visually approved)
- [x] 24 Online Event Join Screen — Real Logic (private URL storage, draft organizer input, publish guard, ticket-checked RPC and join route implemented; migration applied)

### Phase 7 — Nigerian Location Search & Event Maps
- [x] 25 Location Search, Verified Venues & Maps — Geoapify autocomplete for Nigeria, all-Nigeria location text filtering, persisted venue coordinates, event-detail map, and Google Maps directions; migration applied and verified, live provider verification pending

### Phase 8 — Event Category Taxonomy
- [x] 26 Expanded Event Categories — replaced legacy categories with the requested 12, mapped existing event values, and updated publishing validation; migration applied and verified

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
- Checkout quantity is capped at 10 tickets per order and must be validated on both client and server.
- A reservation's 10-minute hold is the earliest Paystack verification time, not an unconditional inventory release; inventory remains held while Paystack reports success or pending, and successful ticket issuance still requires the webhook.
- Overselling is prevented by an atomic Postgres RPC (`reserve_ticket_inventory`) plus a time-limited `reservations` hold — not a bare "transaction," a specific `UPDATE ... WHERE ... RETURNING` pattern.
- Ticket issuance is **webhook-driven and idempotent** — a `processed_webhook_events` table keyed on Paystack's event id prevents double-issuance on a retried webhook. Paystack signs webhooks with **HMAC-SHA512**, not SHA256.
- QR codes encode an **HMAC-signed token**, never a raw `ticket_id`, to prevent a screenshotted ticket from being turned into a working duplicate.
- **Check-in is online-only for MVP** — considered and explicitly rejected an offline/queued scanning mode, because two offline gates could both admit the same ticket before a sync reconciles them.
- **Door staff never get Supabase Auth accounts.** Access is a single per-gate, revocable, hashed token embedded in a link the organizer generates — see `door_staff_access` table and the `GateLinkModal`/`validateDoorStaffToken` pattern.
- Events require both a `starts_at` **and** `ends_at` — the latter exists specifically to compute the "Live" badge, which is otherwise undefined.
- "Live" status, the reservation-hold countdown, and the online-event unlock countdown are all computed from **server-provided timestamps**, never the client device clock.
- Ticket card images: accept up to 50MB on upload, compress/resize server-side before ever rendering — the cap is enforced at the Supabase Storage bucket policy level, not just client-side.
- Ticket card image storage is public-read and limited to authenticated organizers writing within their own user-ID folder; the bucket accepts JPEG, PNG, and WebP up to 50MB.
- PostHog: six approved custom events; pageviews and exception capture remain enabled while click/form autocapture is disabled. Onboarding step captures use `step_name` and `organizer_id`. `ticket_purchased` and `ticket_scanned` are **server-fired only**. Organizer dashboard funnel numbers are queried server-side from PostHog's API, filtered per-organizer — never pointed at PostHog's shared raw UI.
- UI: Plus Jakarta Sans throughout, mobile uses a fixed bottom tab bar (no top navbar), desktop uses a top navbar plus a Discover-only category sidebar. The ticket card is the one component allowed a colored/gradient background and a heavy shadow — every other card stays flat white/`bg-surface`.
- Full token set, component registry, and 35-screen UI reference already exist and are the source of truth for anything visual — see `ui-tokens.md`, `ui-registry.md`, and the published UI artifact.

---

## Notes

- This project has gone through an unusually thorough planning phase relative to JobPilot's tracker at the same stage — nine documentation files plus a full visual screen set were produced and cross-checked against each other before any code was written. That front-loaded cost is intentional given how much of this product's trust depends on money- and inventory-handling code being correct the first time (see the dedicated "Architecture Review" section of `project-scope.md`).
- The UI screen set (`tik-booth-ui.html`) is published as a live artifact and also exported as per-section PNGs (light + dark) and one full-page composite — these are reference material for implementation, not themselves part of the Next.js codebase.
- `ui-tokens.md` currently documents the token values exactly as they exist in the published HTML artifact's inline `<style>` block. When `app/globals.css` is created in Feature 01, the `@theme` block must be copied from `ui-tokens.md` verbatim — not re-derived from scratch — to avoid the two drifting apart.
- `types/database.types.ts` defines the current application-facing database types. Regenerate/compare it against the live schema as the schema evolves.
- Nothing in `project-scope.md`'s "Open Questions" section remains unresolved as of this tracker's creation — all prior open items were explicitly closed out during planning (see `project-scope.md` for the resolution of each).
- Features 15–16 are implemented with resumable authenticated saves, Paystack subaccount setup, private staged image uploads optimized server-side, validated draft publishing, and ticket-tier persistence. Migration `20261014174000_phase4_onboarding_storage.sql` is applied to the linked Supabase project and passes linked schema lint. No real Paystack payout details were used for verification.
