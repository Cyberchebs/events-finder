# Project Overview — Tik-Booth

## About the Project

Tik-Booth is a full stack event ticketing platform for Nigeria, expanding to the rest of Africa and then globally. Organizers create events — in-person or online — define ticket tiers, and design a custom card look (color and image) per tier. Attendees discover events, buy tickets through Paystack, and hold each ticket as a styled 3D card with the QR code rendered directly on its face. The platform takes a fixed 20.3% commission on every sale, split automatically at the point of payment.

The entire purchase and check-in flow is built around one hard constraint: **inventory must never oversell, and a ticket must never be usable twice**, even under concurrent buyers or multiple gates scanning at once.

---

## The Problem It Solves

Buying and selling tickets informally — via bank transfer and a screenshot as "proof" — is common but has no real guarantees on either side: an organizer can't verify a ticket wasn't forwarded to someone else, and an attendee has no protection if an event oversells. Tik-Booth replaces that with a platform where inventory is enforced at the database level, every ticket is a cryptographically signed, single-use credential, and payouts to organizers are automatic and transparent.

---

## Pages

```
/                          → Discover (also the logged-out landing page)
/login                     → Auth (Google OAuth + email/password, single flow)
/e/[event_id]              → Event detail
/checkout/[event_id]       → Checkout
/my-tickets                → Ticket wallet
/my-tickets/[ticket_id]    → Expanded ticket detail
/profile                   → Account settings + "Become an organizer"
/onboarding/*              → 5-step organizer wizard (profile, payout, event, tiers, publish)
/dashboard                 → Organizer dashboard (stats, funnel, events list)
/dashboard/[event_id]      → Single event's sales dashboard
/dashboard/[event_id]/door-staff → Door staff gate management
/scan/[event_id]           → Check-in scanner (opened only via a door-staff access link)
```

---

## Navigation

Mobile: fixed bottom tab bar, four tabs — Discover, My tickets, Create, Profile. Desktop: top navbar — Discover, My tickets, Dashboard (once an organizer), plus a single "Create event" CTA. Discover additionally gets a persistent left category sidebar on desktop; every other page follows the plain navbar-only pattern. The check-in scanner and door-staff landing screen have no navigation chrome at all — see `ui-rules.md`.

---

## Core User Flow

### Landing / Discover

- Logged-out and logged-in users both land on Discover — there's no separate marketing homepage gate
- Category chips (mobile, pinned under the search bar) or a sidebar (desktop), plus a location-aware search bar
- Each event card shows exactly one status: **Free**, a relative countdown ("In 4 days"), or **Live** with a pulsing indicator

### Onboarding

- One signup flow for everyone — email/password or Google OAuth via Supabase Auth
- Every new account starts as an attendee ("finder"); there's no upfront role choice
- Optional interest picker immediately after signup, skippable
- "Become an organizer" lives on the Profile screen and is the only entry point into the organizer wizard

### Organizer Setup (5-step wizard)

- Step 1 — Organizer profile (name, logo, bio)
- Step 2 — Payout setup (Paystack subaccount — bank details + BVN verification)
- Step 3 — First event (title, in-person/online, venue or join-link placeholder, start **and end** time, category, description, cover image)
- Step 4 — Ticket tiers (name, price, quantity, per-tier card color/image)
- Step 5 — Review & publish, showing a live preview of both the public event card and the attendee's actual ticket card
- Every step saves independently and is resumable — an interrupted organizer picks back up where they left off, and an unpublished event sits as a visible draft rather than disappearing

### Buying a Ticket

- Attendee selects a tier and quantity on the event detail page
- Starting checkout immediately reserves that inventory (a time-limited hold, shown to the attendee as a live countdown) — this, not the payment step, is what actually prevents overselling
- Payment happens through Paystack; the reservation converts into a real, signed ticket only once Paystack's webhook confirms payment — never on the strength of the client-side redirect alone
- A failed or abandoned payment leaves the hold to expire naturally, releasing the inventory back automatically

### My Tickets

- Every valid ticket renders as a 3D card carrying the organizer's chosen color/image for that tier, with the QR code on the card face
- A used ticket drops to a flat, QR-less row — once scanned, there is nothing left on it worth displaying as scannable
- No resale, no transfer, no refund exists anywhere in this flow — a ticket that goes unused is simply unused

### Check-in

- Door staff never get accounts. An organizer generates a per-gate link from the dashboard; opening that link is the usher's entire "login," scoped to exactly one event and revocable instantly
- Scanning is **online-only** — every scan is a live server request; there is no offline queue, because an offline mode would reopen the exact double-admission race the atomic scan check exists to close
- Four outcomes only: valid (admit), already used (reject, shows when/where it was first scanned), invalid/forged (the QR's signature doesn't verify), or no connection (shown honestly, never silently accepted)

### Organizer Dashboard

- Stats: tickets sold, net earnings (always shown after the 20.3% fee, never gross), page visitors, checkout conversion
- A funnel chart: viewed → started checkout → paid, sourced from PostHog and queried server-side, scoped strictly to that organizer's own events
- Events list, including visible drafts with a "Continue" action
- Per-event door-staff management and a per-gate check-in breakdown

### Online Events

- The join link is withheld from the API response entirely — not just hidden in the UI — until at or shortly before the event's start time, and only ever returned to a request holding a valid, unused ticket

---

## Data Architecture

### Ticket & Inventory Data
- Lives across `events`, `ticket_types`, `reservations`, `orders`, and `tickets`
- All money fields are integers in kobo — never floats
- `ticket_types.quantity_sold` is only ever modified through a single atomic Postgres RPC — never a plain client-triggered update — because this is the one piece of state where a race condition means real financial and trust damage
- A ticket's `status` (`issued` / `used` / `void`) and `qr_token` (HMAC-signed, never a raw ID) are set once at issuance and never touched by anything except the webhook handler or the check-in scan RPC

### Organizer & Access Data
- `profiles.is_organizer` is the only thing distinguishing an organizer from an attendee — same table, same auth flow
- `door_staff_access` stores only a hash of each gate's access token, never the plaintext, mirroring how a password would be stored

### Analytics Data
- PostHog holds funnel and traffic events; Supabase holds the transactional truth
- The organizer dashboard never points at PostHog's raw shared UI — every number shown to an organizer is queried server-side and filtered to their own `organizer_id`/`event_id` first

---

## Features In Scope

- Discover feed with category filter, location-aware search, Free/Live/countdown status
- Single signup flow with organizer role as a later upgrade
- Event creation — in-person or online, with a required end time
- Ticket tiers with per-tier custom card color/image
- Paystack checkout with a database-enforced reservation hold
- Webhook-driven, idempotent ticket issuance with signed QR tokens
- Ticket wallet with 3D cards and a distinct "used" state
- Online-only check-in scanning via revocable, account-free door-staff links
- Organizer dashboard — sales stats, PostHog-powered funnel, per-gate check-in breakdown
- 20.3% commission via Paystack Split Payments, paid out directly to the organizer

---

## Features Out of Scope

- Ticket resale or transfer of any kind
- Refunds — there is no refund flow, request form, or dispute process
- Multi-currency support (NGN only at launch)
- Seat-map / assigned seating — general admission and tiered quantity only
- Waitlists for sold-out events
- Virtual waiting room / queueing for high-demand drops
- Offline or queued check-in scanning
- Multi-language support
- Organizer teams or multi-user event management
- Non-Nigerian payment providers at launch (Stripe Connect and pan-African processors are explicitly post-MVP)
- Native mobile app (React Native is a later phase; MVP is web-only)
- Age-restriction enforcement of any kind (self-declared or otherwise — deliberately not built)

---

## PostHog Events

```typescript
event_page_viewed;                    // { event_id, organizer_id, is_online }
checkout_started;                     // { event_id, ticket_type_id, quantity }
checkout_payment_initiated;           // { event_id, order_id, amount }
ticket_purchased;                     // server-fired: { event_id, ticket_type_id, order_id, amount, commission_amount }
ticket_scanned;                       // server-fired: { ticket_id, event_id, scan_result, gate_label }
organizer_onboarding_step_completed;  // { step_name, organizer_id }
```

`ticket_purchased` and `ticket_scanned` are the two events that must never be fired client-side — they are the source of truth for revenue and check-in numbers, and a client-fired version of either could be spoofed or simply missed if a tab closes early.

---

## Target User

**Attendees:** anyone in Nigeria (initially) looking to discover and pay for events online with a single, simple checkout, and a ticket they can trust will actually get them in.

**Organizers:** individuals or small teams running paid or free events — nightlife, community meetups, comedy shows, conferences — who want ticket sales, a working door, and their money without building any of it themselves. Particularly organizers currently relying on informal bank-transfer ticketing who want the same simplicity with real guarantees against overselling and duplicate entry.

---

## Success Criteria

- An organizer can go from signup through a real payout for a sold ticket in one guided session
- Two simultaneous purchase attempts against the last unit of inventory never both succeed
- A retried payment webhook never issues a ticket twice
- A screenshot of a real ticket's QR code cannot be turned into a second working entry
- Two gates scanning the same ticket within the same second never both admit the holder
- An organizer sees their own sales and funnel numbers, and never anyone else's
- A ticket's join link, for an online event, is genuinely inaccessible before its reveal time — not just hidden in the UI
- The UI is visually consistent across every page, using only the tokens in `ui-tokens.md`
