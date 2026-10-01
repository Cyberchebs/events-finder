# Architecture — Tik-Booth

## Stack

| Layer                     | Tool                       | Purpose                                                        |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| Framework                   | Next.js (App Router)         | Full stack framework                                              |
| Language                    | TypeScript strict             | Throughout                                                        |
| Auth + DB + Storage         | Supabase                     | Entire backend — Postgres, Auth, Storage, Row Level Security      |
| Payments                    | Paystack (REST API, no SDK)  | Checkout, split payouts, webhooks — behind a `PaymentProvider` interface |
| Client state                | Zustand                       | UI-only state — cart selection, wizard draft, filters             |
| Server state                | TanStack Query               | Anything fetched from Supabase that needs client-side refetching   |
| Rate limiting               | Upstash Redis + `@upstash/ratelimit` | Checkout, webhook, and check-in scan endpoints             |
| Analytics                   | PostHog                       | Event tracking and organizer dashboard funnel                     |
| QR generation               | `qrcode` + Node `crypto`      | Client-rendered QR, server-signed HMAC token                       |
| Date handling               | `date-fns`                    | Relative countdowns, "Live" status thresholds                     |
| Styling                     | Tailwind CSS v4                | Tokens defined in `@theme`, per `ui-tokens.md`                      |
| Hosting                     | Vercel (app) + Supabase (data) |                                                                   |

---

## Folder Structure

```
/
├── AGENTS.md
├── context/
│   ├── project-overview.md
│   ├── project-scope.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   └── build-plan.md
├── src/
│   ├── middleware.ts                          → Session refresh, route protection
│   ├── app/
│   │   ├── layout.tsx                         → Root layout, PostHog + AuthProvider
│   │   ├── page.tsx                           → Discover (also the logged-out landing page)
│   │   ├── login/
│   │   │   └── page.tsx                       → Auth (Google OAuth + email/password)
│   │   ├── auth/callback/
│   │   │   └── route.ts                       → OAuth callback — exchanges code for session
│   │   ├── e/[event_id]/
│   │   │   └── page.tsx                       → Event detail
│   │   ├── checkout/[event_id]/
│   │   │   └── page.tsx                       → Checkout
│   │   ├── my-tickets/
│   │   │   ├── page.tsx                       → Ticket wallet
│   │   │   └── [ticket_id]/page.tsx           → Expanded ticket detail
│   │   ├── profile/
│   │   │   └── page.tsx                       → Account settings + "Become an organizer"
│   │   ├── onboarding/
│   │   │   ├── profile/page.tsx
│   │   │   ├── payout/page.tsx
│   │   │   ├── event/page.tsx
│   │   │   ├── tiers/page.tsx
│   │   │   └── publish/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx                       → Events list + top-level stats
│   │   │   └── [event_id]/
│   │   │       ├── page.tsx                   → Single event's sales dashboard
│   │   │       └── door-staff/page.tsx        → Gate management
│   │   ├── scan/[event_id]/
│   │   │   └── page.tsx                       → Check-in scanner (door-staff link only)
│   │   └── api/
│   │       ├── checkout/start/route.ts        → Reserve inventory, create Paystack transaction
│   │       ├── webhooks/paystack/route.ts     → Idempotent, signature-verified ticket issuance
│   │       └── checkin/scan/route.ts          → Door-staff token check → QR verify → atomic scan
│   ├── actions/
│   │   ├── profile.ts                         → Profile save, "become an organizer"
│   │   ├── events.ts                          → Create/edit/publish/unpublish events
│   │   ├── door-staff.ts                      → Create/revoke gate access
│   │   └── onboarding.ts                      → Per-step wizard saves
│   ├── components/
│   │   ├── ui/                                → shadcn/ui primitives + shared Field/Pill/Dropzone
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── BottomTabBar.tsx
│   │   ├── discover/
│   │   │   ├── EventCard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── DiscoverSearchBar.tsx
│   │   │   ├── CategoryChips.tsx
│   │   │   └── CategorySidebar.tsx
│   │   ├── checkout/
│   │   │   ├── TierSelector.tsx
│   │   │   └── ReservationCountdown.tsx
│   │   ├── tickets/
│   │   │   ├── TicketCard.tsx
│   │   │   └── UsedTicketRow.tsx
│   │   ├── events/
│   │   │   └── OnlineJoinLock.tsx
│   │   ├── onboarding/
│   │   │   ├── WizardShell.tsx
│   │   │   ├── ProfileStep.tsx
│   │   │   ├── PayoutStep.tsx
│   │   │   ├── EventDetailsStep.tsx
│   │   │   ├── TierDesignerStep.tsx
│   │   │   └── ReviewPublishStep.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardStatsBar.tsx
│   │   │   └── CheckoutFunnelChart.tsx
│   │   ├── door-staff/
│   │   │   ├── DoorStaffPanel.tsx
│   │   │   └── GateLinkModal.tsx
│   │   └── checkin/
│   │       └── ScanResultScreen.tsx
│   ├── lib/
│   │   ├── paystack.ts                        → PaymentProvider implementation (Paystack)
│   │   ├── payment-provider.ts                → PaymentProvider interface
│   │   ├── qr.ts                               → signTicketToken / verifyTicketToken
│   │   ├── door-staff.ts                       → validateDoorStaffToken
│   │   ├── rate-limit.ts                       → Upstash limiter instances
│   │   ├── constants.ts                        → COMMISSION_RATE, RESERVATION_HOLD_MINUTES, MAX_TICKET_CARD_IMAGE_MB
│   │   └── format-date.ts                      → Countdown label thresholds
│   ├── utils/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   └── posthog/
│   │       ├── client.ts
│   │       └── server.ts
│   ├── store/
│   │   ├── authStore.ts                        → Zustand — current user snapshot for UI only
│   │   └── checkoutStore.ts                    → Zustand — selected tier + quantity pre-payment
│   └── types/
│       └── database.types.ts                   → Generated from Supabase schema
```

---

## System Boundaries

| Folder          | Owns                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------|
| `app/`             | Pages and API routes only. No business logic beyond orchestration.                                   |
| `actions/`         | Server Actions for UI-triggered mutations only — event/profile/door-staff writes. Never called from `app/api/`. |
| `components/`      | UI only. No direct Supabase calls, no payment logic. Reads data via props or React Query hooks.        |
| `lib/`             | Payment provider, QR signing, rate limiting, door-staff token logic, shared constants. No React, no JSX. |
| `utils/`           | Third-party client initialization only (Supabase, PostHog) — thin wrappers, no business logic.        |
| `store/`           | Zustand — client-only UI state. Never authorization state, never a copy of server data.               |
| `types/`           | Generated and shared TypeScript types.                                                              |

---

## Data Flow

### Checkout & Ticket Issuance

```
Attendee selects tier + quantity, clicks "Get tickets"
        ↓
POST /api/checkout/start
        ↓
Postgres RPC: atomic UPDATE ticket_types ... RETURNING (see library-docs.md)
        ↓
0 rows returned → sold out, abort before Paystack is ever contacted
        ↓
Rows returned → insert `reservations` row (expires_at = now + 10 min)
        ↓
checkout_started PostHog event (client)
        ↓
PaymentProvider.initializeTransaction() → Paystack authorization URL
        ↓
checkout_payment_initiated PostHog event (client)
        ↓
Attendee redirected to Paystack, pays or abandons
        ↓
   ┌─────────────────────────────┐         ┌───────────────────────────────┐
   │ Paid                        │         │ Abandoned / failed             │
   │ → Paystack fires webhook    │         │ → reservation left untouched   │
   │ → see webhook flow below    │         │ → pg_cron releases inventory   │
   └─────────────────────────────┘         │   back after expires_at        │
                                             └───────────────────────────────┘
```

### Payment Webhook

```
Paystack POSTs to /api/webhooks/paystack
        ↓
Read raw body via req.text() — never req.json()
        ↓
Verify x-paystack-signature (HMAC-SHA512) → invalid → 401, stop
        ↓
Check processed_webhook_events for this event's id → already processed → 200, stop
        ↓
Look up the matching reservation by Paystack reference
        ↓
In one transaction:
  - convert reservation → real ticket (status: 'issued', signed qr_token)
  - create order (total_kobo, commission_kobo = COMMISSION_RATE × total)
  - insert processed_webhook_events row
        ↓
ticket_purchased PostHog event (server, inside this handler)
        ↓
200 OK
```

### Check-in Scan

```
Usher opens their gate link → /scan/[event_id]?token=...
        ↓
validateDoorStaffToken() — hash comparison, not revoked, matches event_id
        ↓
   invalid/revoked → "This link isn't valid" screen, no scanner rendered
        ↓
   valid → scanner UI renders, gate_label shown in header
        ↓
Usher scans a QR (zxing decodes client-side, only the token string is sent)
        ↓
POST /api/checkin/scan { door_staff_token, qr_token }
        ↓
1. Re-validate door-staff token (short-circuits immediately if invalid/revoked)
        ↓
2. verifyTicketToken() — HMAC signature check on the QR token
        ↓
   invalid signature → scan_result: 'invalid', no DB write
        ↓
3. Atomic: UPDATE tickets SET status='used', scanned_at=now(), scanned_gate_label=$gate
          WHERE id=$1 AND status='issued' RETURNING *
        ↓
   0 rows → scan_result: 'already_used'
   1 row  → scan_result: 'success'
        ↓
ticket_scanned PostHog event (server, this route) with gate_label
        ↓
Response rendered as ScanResultScreen — no offline queue, network failure
surfaces as its own "No connection" state, never a silent accept
```

### Organizer Onboarding

```
User taps "Become an organizer" on Profile
        ↓
profiles.is_organizer = true, onboarding_step = 1
        ↓
Step 1 (Profile) → actions/onboarding.ts → profiles updated, onboarding_step = 2
        ↓
Step 2 (Payout) → PaymentProvider.createSplitRecipient() → Paystack subaccount created
                → profiles.paystack_subaccount_code saved, onboarding_step = 3
        ↓
Step 3 (Event) → events row created, status: 'draft', onboarding_step = 4
        ↓
Step 4 (Tiers) → ticket_types rows created, card image uploaded to
                 ticket-card-images bucket (accept ≤50MB, compress server-side),
                 onboarding_step = 5
        ↓
Step 5 (Publish) → events.status = 'published'
        ↓
organizer_onboarding_step_completed PostHog event fired after each step
```

### Door Staff Access

```
Organizer clicks "+ Add gate" on the door-staff panel
        ↓
createDoorStaffAccess(eventId, gateLabel) Server Action
        ↓
Ownership check (organizer_id === current user) — even though RLS also enforces it
        ↓
Generate random token → hash it → insert door_staff_access row (hash only)
        ↓
Plaintext token returned once, embedded in the shareable link
        ↓
GateLinkModal displays it — link + QR — and discards it from memory on close
        ↓
Organizer can "Revoke" anytime → revoked_at set →
takes effect on the usher's very next scan attempt, not next page load
```

---

## Supabase Database Schema

### `profiles`

| Column                    | Type        | Notes                                                |
| --------------------------- | ------------- | ------------------------------------------------------|
| id                            | uuid          | References `auth.users`                               |
| is_organizer                  | boolean       | Default `false` — same table for both roles            |
| organizer_name                | text          |                                                        |
| organizer_bio                 | text          |                                                        |
| logo_url                       | text          |                                                        |
| onboarding_step                | integer       | 1–5, null once published                                |
| paystack_subaccount_code        | text          | Set after onboarding step 2                             |
| created_at                       | timestamptz   |                                                        |

### `events`

| Column           | Type        | Notes                                       |
| ------------------ | ------------- | ---------------------------------------------|
| id                    | uuid          |                                              |
| organizer_id           | uuid          | References `profiles`                        |
| title                    | text          |                                              |
| description                | text          |                                              |
| image_url                    | text          |                                              |
| category                       | text          |                                              |
| format                           | text          | `in_person` \| `online`                        |
| venue_address                      | text          | Null for online events                          |
| online_join_url                      | text          | Never returned by the API before the reveal time |
| starts_at                              | timestamptz   | UTC — required                                    |
| ends_at                                  | timestamptz   | UTC — required, drives "Live" status                |
| status                                    | text          | `draft` \| `published`                              |
| currency                                    | text          | Default `'NGN'`                                      |

### `ticket_types`

| Column              | Type        | Notes                                           |
| --------------------- | ------------- | --------------------------------------------------|
| id                       | uuid          |                                                  |
| event_id                   | uuid          | References `events`                              |
| name                         | text          |                                                  |
| price_kobo                     | integer       | Integer minor units — never a float                |
| quantity_available                | integer       |                                                  |
| quantity_sold                       | integer       | Only ever modified via the reservation RPC          |
| card_color                             | text          | Organizer-chosen, or a default swatch token         |
| card_image_url                           | text          | Optional, ≤50MB accepted, compressed server-side      |

### `reservations`

| Column         | Type        | Notes                                    |
| ---------------- | ------------- | -------------------------------------------|
| id                  | uuid          |                                            |
| ticket_type_id        | uuid          | References `ticket_types`                  |
| quantity                | integer       |                                            |
| user_id                   | uuid          | References `profiles`                       |
| expires_at                  | timestamptz   | `now() + RESERVATION_HOLD_MINUTES`            |
| status                         | text          | `pending` \| `confirmed` \| `expired`           |

### `orders`

| Column           | Type        | Notes                                |
| ------------------ | ------------- | ---------------------------------------|
| id                    | uuid          |                                        |
| user_id                 | uuid          | References `profiles`                  |
| event_id                  | uuid          | References `events`                     |
| total_kobo                  | integer       |                                        |
| commission_kobo                | integer       | `total_kobo × COMMISSION_RATE`, rounded  |
| paystack_reference                | text          | Matches the reservation id at initiation  |
| status                              | text          |                                        |

### `tickets`

| Column               | Type        | Notes                                             |
| ---------------------- | ------------- | -----------------------------------------------------|
| id                        | uuid          |                                                     |
| order_id                    | uuid          | References `orders`                                  |
| ticket_type_id                | uuid          | References `ticket_types`                              |
| owner_id                         | uuid          | References `profiles`                                    |
| qr_token                           | text          | HMAC-signed — never a raw id                                |
| status                                | text          | `issued` \| `used` \| `void`                                  |
| scanned_at                             | timestamptz   | Set atomically alongside `status = 'used'`                      |
| scanned_gate_label                        | text          | From the `door_staff_access` row that performed the scan          |

### `door_staff_access`

| Column           | Type        | Notes                                          |
| ------------------ | ------------- | ---------------------------------------------------|
| id                    | uuid          |                                                    |
| event_id                | uuid          | References `events`                                 |
| gate_label                 | text          |                                                    |
| access_token_hash             | text          | SHA-256 hash only — plaintext never stored           |
| created_by                       | uuid          | Organizer's `user_id`                                  |
| revoked_at                          | timestamptz   | Null while active                                       |
| created_at                             | timestamptz   |                                                        |

### `processed_webhook_events`

| Column      | Type        | Notes                              |
| ------------- | ------------- | -------------------------------------|
| event_id        | text          | Paystack's own event id — primary key |
| processed_at      | timestamptz   |                                     |

---

## Supabase Storage

| Bucket                 | Path                                              | Contents                          |
| ------------------------ | ---------------------------------------------------| ------------------------------------|
| ticket-card-images         | `ticket-card-images/{organizer_id}/{ticket_type_id}.webp` | Per-tier card images, compressed server-side |
| organizer-logos               | `organizer-logos/{organizer_id}/logo.webp`          | Organizer profile logo               |
| event-images                     | `event-images/{event_id}/cover.webp`                  | Event cover image                       |

Access: authenticated write, public read. 50MB upload accepted; served copy is always the resized/compressed version — see `library-docs.md`.

---

## Authentication

- Provider: Supabase Auth
- Methods: Google OAuth, email/password
- One signup flow for everyone — `profiles.is_organizer` starts `false`; "Become an organizer" is the only path to `true`
- Protected routes: `/my-tickets`, `/profile`, `/onboarding/*`, `/dashboard/*`
- Public routes: `/`, `/login`, `/e/[event_id]` (published events only, enforced by RLS)
- `/scan/[event_id]` is protected by a **door-staff access token**, not a Supabase session — it has no auth middleware check at all, since an usher never has a Supabase account
- `src/middleware.ts` refreshes the session and redirects unauthenticated requests away from the Supabase-protected routes above
- On login → redirect to `/discover` (the app's root page)

---

## Supabase Client Pattern

Two separate instances — never mix them. Full detail and the generated-types pattern are in `library-docs.md`.

```typescript
// utils/supabase/client.ts — browser context only
import { createBrowserClient } from "@supabase/ssr";
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// utils/supabase/server.ts — Server Components, Route Handlers, Server Actions
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(/* ...cookie adapter, see library-docs.md */);
}
```

A third path exists only for the webhook handler and scheduled jobs — a service-role client that bypasses RLS, imported nowhere else in the codebase (see `library-docs.md` → Service Role Key).

---

## Inventory Reservation Pattern

```sql
-- Postgres function: reserve_ticket_inventory — atomic check-and-decrement
UPDATE ticket_types
SET quantity_sold = quantity_sold + p_quantity
WHERE id = p_ticket_type_id
  AND quantity_sold + p_quantity <= quantity_available
RETURNING *;
```

Called exclusively via `supabase.rpc('reserve_ticket_inventory', ...)` from `/api/checkout/start`. Zero rows returned means sold out — the request aborts before Paystack is ever contacted. This single query, plus the `reservations` hold it inserts alongside, is the entire mechanism that prevents overselling under concurrent buyers.

---

## Paystack Webhook Pattern

```typescript
const rawBody = await req.text(); // NOT req.json() — signature needs the raw string
const signature = req.headers.get("x-paystack-signature");
const hash = crypto.createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET!)
  .update(rawBody).digest("hex");
if (hash !== signature) return NextResponse.json({ success: false }, { status: 401 });
```

Full idempotency and ticket-issuance logic in `library-docs.md` → Paystack → Webhook Handling. Paystack signs with **HMAC-SHA512**, not SHA256 — the single most common mistake to autopilot into from other providers' conventions.

---

## QR Signing Pattern

```typescript
export function signTicketToken(ticketId: string): string {
  const signature = crypto.createHmac("sha256", process.env.QR_TOKEN_SECRET!)
    .update(ticketId).digest("hex");
  return `${ticketId}.${signature}`;
}
```

Generated once, server-side, at issuance time inside the webhook handler. Verified server-side, inside the check-in scan route, using `crypto.timingSafeEqual` — never `===`. Full pattern in `library-docs.md`.

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no business logic beyond orchestration. Components contain no direct Supabase or payment calls.
- `lib/` code never imports from `components/` or uses React hooks.
- Server Actions are never called from `app/api/` route handlers, and vice versa.
- All Supabase server-side writes use `await createClient()` from `utils/supabase/server.ts` — never the browser client.
- The service-role Supabase client is imported in exactly two places (webhook handler, scheduled jobs) and never reachable from the browser.
- No hardcoded hex values or raw Tailwind color classes in components — tokens only, per `ui-tokens.md`.
- `ticket_types.quantity_sold` is only ever changed via `reserve_ticket_inventory` — never a direct `.update()` from any code path.
- Every Paystack webhook request is checked against `processed_webhook_events` before any side effect, and its signature verified before that.
- A QR code always encodes a signed token, never a raw `ticket_id`.
- A check-in scan always validates the door-staff access token before anything else, and there is no offline/queued scanning path anywhere in the app.
- Money is always an integer in kobo. Never a float, never a pre-formatted string used as a source value.
- `COMMISSION_RATE`, `RESERVATION_HOLD_MINUTES`, and `MAX_TICKET_CARD_IMAGE_MB` are always imported from `lib/constants.ts` — never re-typed inline.
- "Live" status, the reservation countdown, and the online-event unlock countdown are always computed from a server-provided timestamp, never the client's device clock.
- Resale, ticket transfer, and refunds do not exist anywhere in this codebase — no phase introduces them without `project-scope.md` being updated first.
