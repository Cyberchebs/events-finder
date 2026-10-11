# Tik-Booth — Build Plan

## Core Principle
Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

---

## Phase 1 — Foundation

### 01 Homepage / Discover shell
Build the complete public landing + Discover UI with mock event data.

**UI:**
- Navbar — logo, Discover, My Tickets, Create Event, Login/Signup
- Discover page (mobile): search bar with an embedded location chip, horizontal scrollable category chips pinned directly beneath it
- Discover page (desktop): persistent left sidebar of categories, search bar + separate location dropdown at the top of the content area
- Event cards show: cover image, title, date/venue, and one status badge — **"Free"** (price = 0), a relative countdown (**"In 4 days"**, **"In 2 weeks"**, **"In 1 month"**), or **"Live"** (pulsing red dot) when the event is currently happening
- Empty state (no events matching filters) and search-results state
- Footer

**Logic:**
- None yet — mock data only

### 02 Auth
Supabase Auth — email/password and Google OAuth, single signup flow (no separate organizer/attendee paths).

**UI:**
- Login/signup page — "Continue with Google" button, email/password form
- Copy communicating the single-account model: "Everyone signs up the same way — you can become an organizer anytime."

**Logic:**
- `@supabase/ssr` browser + server clients (see prior auth setup)
- Google OAuth via Supabase Auth
- OAuth callback route (`/auth/callback`) exchanging code for session
- Middleware refreshing sessions and protecting `/dashboard`, `/my-tickets`, `/onboarding/*`
- New user lands with `profiles.is_organizer = false` by default
- After login → redirect to `/discover`

### 03 PostHog Initialization
Set up PostHog before any feature-specific events fire.

**Logic:**
- `instrumentation-client.ts` — browser client (`posthog-js`), initialized with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST`, pageview capture and autocapture on
- `utils/posthog/server.ts` — server client (`posthog-node`) for events that must only fire once something is confirmed server-side (payment, scan)
- PostHog initialized once before hydration through Next.js client instrumentation
- `posthog.identify()` called after login with the Supabase user ID
- `posthog.reset()` called on logout

### 04 Database Schema
All Supabase tables, storage buckets, and RLS policies created before any real data is written.

**Logic:**
- `profiles` — `id` (references `auth.users`), `is_organizer`, `organizer_name`, `organizer_bio`, `logo_url`, `onboarding_step`, `paystack_subaccount_code`
- `events` — `id`, `organizer_id`, `title`, `description`, `image_url`, `category`, `format` (`in_person` | `online`), `venue_address`, `online_join_url`, `starts_at` (`timestamptz`), `ends_at` (`timestamptz`), `status` (`draft` | `published`), `currency` (default `'NGN'`)
- `ticket_types` — `id`, `event_id`, `name`, `price_kobo` (integer), `quantity_available`, `quantity_sold`, `card_color`, `card_image_url`
- `reservations` — `id`, `ticket_type_id`, `quantity`, `user_id`, `expires_at`, `status` (`pending` | `confirmed` | `expired`)
- `orders` — `id`, `user_id`, `event_id`, `total_kobo`, `commission_kobo`, `paystack_reference`, `status`
- `tickets` — `id`, `order_id`, `ticket_type_id`, `owner_id`, `qr_token`, `status` (`issued` | `used` | `void`), `scanned_at`, `scanned_gate_label`
- `door_staff_access` — `id`, `event_id`, `gate_label`, `access_token_hash`, `created_by` (organizer's `user_id`), `revoked_at`, `created_at` — lets an usher scan for one event without a Tik-Booth account
- `processed_webhook_events` — `event_id` (Paystack's own ID, primary key), `processed_at`
- `resumes`-equivalent: **`ticket-card-images`** storage bucket (organizer-uploaded card images), authenticated write / public read, 50MB file size limit enforced at the bucket policy level
- RLS enabled on every table — attendees can only read/write their own `tickets`/`orders`/`reservations`; organizers can only write their own `events`/`ticket_types`; published events are publicly readable

---

## Phase 2 — Discover & Event Detail

### 05 Discover Page — Full UI (real categories, mock events)
Wire the category sidebar/chips and location+search bar to a real `categories` list; events remain mock data.

**UI:** (already built in Phase 1 — this step is about making filters interactive against mock data)

**Logic:**
- Category chip/sidebar selection filters the mock dataset client-side
- Location field opens a lightweight city picker (manual entry for MVP; GPS detection can come later)

### 06 Discover Page — Real Data
Wire Discover to real Supabase data via React Query.

**Logic:**
- React Query hook fetching published events, filtered by category/location/search term
- "Free" / countdown / "Live" badge computed from `price_kobo`, `starts_at`, `ends_at` — **"Live" status computed against server time**, not the client's device clock
- Relative countdown thresholds: under 24h → "Today"/"Tomorrow", under 7 days → "In X days", under ~5 weeks → "In X weeks", beyond → "In X months" (`date-fns` `formatDistanceToNow` or equivalent)
- Empty state shown when no events match filters
- PostHog event: none yet at this stage (page views come via autocapture)

### 07 Event Detail Page — Full UI
Build the complete event detail page with mock data.

**UI:**
- Hero image, title, date/time, venue (or "Online" label for virtual events), category
- Ticket tier list with price and remaining quantity
- "Get tickets" CTA
- Sold-out state per tier (and a "Notify me if resold" fallback is **not** included — resale is out of scope; use a simple "Notify me" waitlist placeholder or omit for MVP)

**Logic:** — none yet, mock data

### 08 Event Detail Page — Real Data
**Logic:**
- Server Component fetches the event + ticket types by ID
- `event_page_viewed` PostHog event fired client-side on load (`event_id`, `organizer_id`, `is_online`)
- Sold-out state computed from `quantity_sold >= quantity_available`

---

## Phase 3 — Checkout & Ticket Issuance

### 09 Checkout Page — Full UI
Build checkout UI with mock ticket/quantity data.

**UI:**
- Selected tier + quantity stepper
- Order total
- Card payment redirect button (Paystack)
- Payment success screen
- Payment failed screen — **shows the live reservation-hold countdown** ("your ticket is still held for 8:41")

**Logic:** — none yet, mock data

### 10 Reservation + Checkout Logic
This is the correctness-critical phase — implements the mechanism that prevents overselling.

**Logic:**
- `POST /api/checkout/start` — Postgres RPC performs the atomic `UPDATE ticket_types SET quantity_sold = quantity_sold + 1 WHERE quantity_sold < quantity_available RETURNING *`; on success, inserts a `reservations` row with `expires_at = now() + 10 minutes`
- If the RPC returns 0 rows → tier is sold out, checkout aborts before ever reaching Paystack
- `checkout_started` PostHog event fired client-side (`event_id`, `ticket_type_id`, `quantity`)
- Client redirected to Paystack's `initializeTransaction` (via the `PaymentProvider` abstraction), passing `reference` = reservation ID
- `checkout_payment_initiated` PostHog event fired on redirect
- Scheduled job (Supabase cron / `pg_cron`) releases expired, unconfirmed reservations back to `quantity_available` every minute

### 11 Payment Webhook + Ticket Issuance
**Logic:**
- `POST /api/webhooks/paystack` — verifies `x-paystack-signature` before touching any business logic
- Checks `processed_webhook_events` for the event ID; if already processed, returns 200 immediately (idempotency)
- On `charge.success`: converts the matching `reservation` to a real `ticket` row (`status: 'issued'`, a freshly generated **signed QR token** — HMAC of `ticket_id` + server secret), creates the `order` record with `commission_kobo` = 20.3% of `total_kobo`
- `ticket_purchased` PostHog event fired **server-side** from the webhook handler (source of truth, not the client redirect)
- Payment-failed path: reservation remains held until its natural expiry; client shown the failed-payment screen with the real `expires_at` countdown

### 12 My Tickets — Full UI
Build the My Tickets list and expanded ticket detail with mock 3D cards.

**UI:**
- Grid/list of ticket cards — QR code rendered directly on the card face, background color/image per the organizer's tier design
- Dimmed treatment for `used` tickets
- Empty state ("No tickets yet")
- Expanded ticket detail: add-to-calendar, directions, full QR

**Logic:** — none yet, mock data

### 13 My Tickets — Real Data
**Logic:**
- React Query fetch of the current user's `tickets` joined with `ticket_types`/`events` for card styling and event info
- QR code rendered client-side from the stored `qr_token`

---

## Phase 4 — Organizer Onboarding & Event Creation

### 14 Organizer Onboarding — Full UI
Build the 5-step wizard UI with mock/local state, skippable and resumable.

**UI:**
- Step 1 — Organizer profile (name, logo, bio)
- Step 2 — Payout setup (bank name, account number, BVN)
- Step 3 — Create first event (title, in-person/online toggle, venue or format, date/time **and end date/time**, category, description, image)
- Step 4 — Ticket tiers (name, price, quantity, per-tier card color/image)
- Step 5 — Review & publish (live preview of the public event card and the attendee ticket card)

**Logic:** — none yet, mock/local state only

### 15 Onboarding Logic — Profile & Payout
**Logic:**
- Step 1 saves to `profiles` (`organizer_name`, `organizer_bio`, `logo_url`, sets `is_organizer = true`)
- Step 2 calls Paystack's subaccount-creation endpoint via the `PaymentProvider.createSplitRecipient()` interface method; stores `paystack_subaccount_code` on `profiles`
- `onboarding_step` updated after each step so an interrupted organizer resumes at the right place
- `organizer_onboarding_step_completed` PostHog event fired per step

### 16 Onboarding Logic — Event & Ticket Tiers
**Logic:**
- Step 3 creates a `draft` row in `events`, including `starts_at`/`ends_at` as `timestamptz`
- Step 4 creates `ticket_types` rows; card image uploaded to the `ticket-card-images` bucket (accept up to 50MB, server-side resize/compress to a display-optimized version before it's ever rendered on a card)
- Step 5 flips `events.status` to `published`

---

## Phase 5 — Door Staff Access, Check-in & Organizer Dashboard

Check-in is **online-only** for MVP — every scan hits the server in real time. This is a deliberate choice: it's the only way the atomic scan mechanism (below) genuinely prevents two gates from admitting the same ticket at once. Offline queued scanning is explicitly deferred — see the notes at the end of this plan.

### 17 Door Staff Access — Full UI
Build the organizer's "manage door staff" screen and the usher's access-entry screen, with mock data.

**UI:**
- Organizer dashboard → "Door staff" panel: list of active gate links (label, created date, revoke action), "+ Add gate" button
- Generated-link modal/screen: shows the gate label, a shareable URL, and a QR code of that URL an usher can scan with their own camera app to open it instantly
- Usher-facing landing screen (opened via the link, no login): shows the event name and gate label, single "Start scanning" button — no other navigation, nothing that looks like the main app

**Logic:** — none yet, mock data

### 18 Door Staff Access — Real Logic
**Logic:**
- `POST /api/door-staff/create` (organizer-only, ownership-checked) generates a random access token, stores only its hash in `door_staff_access` (`gate_label`, `event_id`), returns the plaintext token once in the response — never stored in plaintext, never retrievable again after this response
- The generated link is `/scan/[event_id]?token=...` — opening it validates the token server-side (hash comparison) before rendering anything; an invalid or revoked token shows a plain "This link isn't valid" screen, not the scanner
- Organizer can revoke a gate's access instantly (`revoked_at` set) — mid-event revocation must take effect on the usher's very next scan attempt, not just on next page load
- No Supabase Auth session is created for the usher — the access token in the URL **is** the credential for that one event, scoped to nothing else
- `door_staff_access_created` and `door_staff_access_revoked` are not in the approved PostHog event list; skip analytics here unless added to `code-standards.md` first

### 19 Check-in Scanner — Full UI
Build the scanner UI with mock scan results, reached only through a valid door-staff link.

**UI:**
- Idle/scanning state (camera viewfinder), gate label shown in the header, running "checked in / total sold" counter
- Valid-scan result (green, attendee name, tier)
- Already-used result (red, "scanned X min ago" + which gate)
- Invalid/forged-signature result (neutral grey, "Not a valid ticket")
- "No connection" state — since scanning is online-only, a dropped connection must show this rather than silently failing or queuing

**Logic:** — none yet, mock data

### 20 Check-in Scanner — Real Logic
**Logic:**
- `POST /api/checkin/scan` — first validates the door-staff access token (hash comparison, not revoked, matches the `event_id` in the URL), then verifies the QR token's signature, then checks ticket status
- Atomic, idempotent status flip: `UPDATE tickets SET status = 'used', scanned_at = now(), scanned_gate_label = $gate WHERE id = $1 AND status = 'issued' RETURNING *` — a second near-simultaneous scan from any gate naturally fails this `WHERE` clause and is rejected, never double-admitting
- `ticket_scanned` PostHog event fired server-side with `scan_result` (`success` / `already_used` / `invalid`) and `gate_label`
- Rate limiting scoped to the **door-staff access token**, not the attendee — a real usher scanning a fast-moving queue is legitimate high-frequency traffic, not abuse (generous limit, e.g. 60/min per token)
- Client shows the explicit "No connection" state on any network failure — there is no offline fallback or local queue in MVP

### 21 Organizer Dashboard — Full UI
Build the dashboard UI with mock stats and mock PostHog funnel data.

**UI:**
- Stat cards: tickets sold, revenue, page visitors, checkout conversion rate
- Funnel bar chart: viewed → started checkout → purchased
- Event list with edit/unpublish actions
- Per-gate check-in breakdown (mock data) — how many scanned at each gate, using `scanned_gate_label`

**Logic:** — none yet, mock data

### 22 Organizer Dashboard — Real Data
**Logic:**
- Tickets sold / revenue queried directly from `tickets`/`orders` (Supabase, scoped by RLS to the organizer's own events)
- PostHog funnel numbers queried server-side via the PostHog API, filtered by `event_id`/`organizer_id`, **never** pointed directly at PostHog's raw shared UI — enforces the same per-organizer data isolation as everything else
- Per-gate breakdown queried from `tickets.scanned_gate_label`, grouped, scoped to the organizer's own event
- Verification step: attempt to query another organizer's `event_id` from this endpoint and confirm it's rejected

---

## Phase 6 — Online Events

### 23 Online Event Join Screen — Full UI
Build the locked/unlocked join-link states with mock countdown data.

**UI:**
- Locked state — lock icon, countdown timer, "Unlocks 30 minutes before start time"
- Unlocked state — "Join event" button opening the organizer's link

**Logic:** — none yet, mock data

### 24 Online Event Join Screen — Real Logic
**Logic:**
- `online_join_url` only ever returned by the API to a request made by a user holding a valid (`issued`, unused) ticket for that event — enforced via a time-gated RLS policy comparing `now()` to `events.starts_at`, not just hidden client-side
- Countdown displayed to the attendee is computed against the **server's** `starts_at`, not the client device clock, consistent with the reservation-hold and "Live" status rules

---

## Notes carried over from the scope doc, relevant during implementation
- All money fields are integers in kobo — never floats.
- Resale/refunds are explicitly out of scope for this build plan; no UI or logic phase above should introduce a resale or refund flow.
- The `PaymentProvider` interface (Paystack today) should be implemented as a real abstraction from Phase 3 onward so a second provider (e.g. Flutterwave, for African expansion) is a config addition later, not a rewrite.
- Every phase's "Full UI" step must be visually verified with mock data before its paired "Logic" step begins — no phase should build backend logic against a page that hasn't been seen and approved yet.
- **Check-in is online-only for MVP — decided, not a placeholder.** Offline queued scanning (validating against a locally cached ticket list, syncing later) was considered and explicitly deferred: it introduces a real security gap where two offline gates could both admit the same ticket before a sync reconciles them. Revisit only if real venues report unusable connectivity, and treat it as a significant follow-on design task, not a small addition, if that happens.
- **Door staff never get Supabase Auth accounts.** Their only credential is the per-gate access token embedded in the link the organizer shares. This keeps onboarding an usher to zero steps (no signup) while keeping their access scoped to exactly one event and revocable instantly.
