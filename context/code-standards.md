# Code Standards — Tik-Booth

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against `project-scope.md` and `build-plan.md`
- **Scope is sacred** — only build what the current phase requires. Never go beyond scope even if it seems helpful. Resale and refunds are explicitly out of scope — do not introduce either, even partially, without the scope doc being updated first
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Money and inventory code is never "good enough"** — anything touching `price_kobo`, `quantity_available`, ticket status, or webhook processing must follow the exact patterns in this document. This is the one category of code where shortcuts are not acceptable
- **Failures are expected** — wrap payment, webhook, and check-in operations in try/catch, log failures, never let one failure crash everything or silently issue/void a ticket incorrectly

---

## TypeScript

- Strict mode enabled in `tsconfig.json` — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props or the `PaymentProvider` contract
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary
- **Money is always `number` (integer, minor units — kobo) or `bigint` for very large totals — never a `float`, never a string with decimals**

---

## Next.js Conventions

- App Router only — no Pages Router
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - `useState` or `useReducer`
  - `useEffect`
  - Browser APIs (camera access for the check-in scanner, QR rendering)
  - Event listeners
  - Third-party client-only libraries (PostHog browser side, Zustand store access, React Query hooks)
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch directly in Client Components; use React Query only for data that must refetch/revalidate client-side (e.g. live "tickets remaining" counts)
- Route handlers live in `app/api/` — never put business logic directly in route handlers; delegate to `lib/` or `actions/`
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code (inventory counts, ticket status) runs at request time; **never cache anything under `ticket_types` or `tickets`**
- Always read Next.js documentation before implementing any Next.js-specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `event-detail`, `check-in`, `my-tickets`
- Component files: PascalCase — `TicketCard.tsx`, `OrganizerDashboard.tsx`
- Utility files: camelCase — `posthog-client.ts`, `paystack.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `events.ts`, `checkout.ts`, `checkin.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { TicketCard } from "@/components/tickets/TicketCard";

// 3. Type definitions
type Props = {
  eventId: string;
  ticketTypeId: string;
};

// 4. Component
export function ComponentName({ eventId, ticketTypeId }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from `ui-tokens.md`

---

## API Route Handlers

```typescript
// app/api/checkout/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // validate body
    // call the reservation RPC / business logic
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[checkout/start]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[checkout/start]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper
- **The webhook route (`app/api/webhooks/paystack/route.ts`) is the one exception to "validate then process" ordering: signature verification happens before body validation, and both happen before any database write**

---

## Server Actions

```typescript
// actions/events.ts

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function publishEvent(eventId: string) {
  try {
    const supabase = await createSupabaseServer();
    // validate ownership (organizer_id matches current user)
    // write to DB
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[actions/events]", error);
    return { success: false, error: "Failed to publish event" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action returns `{ success: boolean, error?: string }`
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error
- Every Server Action that mutates `events`, `ticket_types`, or `profiles` re-checks ownership (`organizer_id === current user`) even though RLS also enforces it — this gives a clean error message instead of a raw RLS rejection

---

## Payment & Ticketing Code (the "Agent Code" equivalent)

This is the highest-scrutiny category of code in the project — it directly touches money and inventory.

```typescript
// lib/paystack.ts

export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  try {
    // implementation
    return { success: true, authorizationUrl, reference };
  } catch (error) {
    console.error("[lib/paystack:initializeTransaction]", error);
    return { success: false, error: String(error) };
  }
}
```

- Every payment/ticketing function returns `{ success: boolean, error?: string }` — never throws
- Every payment/ticketing function has a try/catch — never let one failure crash a checkout or a check-in scan
- **`PaymentProvider` is implemented as a real TypeScript interface** (`lib/payment-provider.ts`); `PaystackProvider` implements it today. No Paystack-specific code is called directly from route handlers or Server Actions — always go through the interface
- **Inventory changes only ever happen through the Postgres RPC** (`reserve_ticket_inventory`), never via a `SELECT` followed by a client-side `UPDATE`
- **Webhook events are checked against `processed_webhook_events` before any side effect runs** — this is not optional, and there is no code path that issues a ticket without this check
- **QR tokens are always HMAC-signed server-side** — no code path generates or accepts a QR value that is just a raw `ticket_id`
- Payment/ticketing functions never import from `components/` and never use React hooks or browser APIs

---

## Supabase Client Usage

```typescript
// Browser context — Client Components only
import { createClient } from "@/utils/supabase/client";
const supabase = createClient();

// Server context — Server Components, Route Handlers, Server Actions
import { createClient } from "@/utils/supabase/server";
const supabase = await createClient();
```

- Never use the browser client in server context
- Never use the server client in browser context
- Always `await createClient()` in server context — it reads cookies asynchronously
- Always scope every query to the current `user_id` (attendee data) or `organizer_id` (organizer data) — even though RLS is the real enforcement boundary, application-level scoping catches mistakes earlier and gives cleaner errors
- **Never use the Supabase service role key in any code path reachable from the browser** — it only appears in webhook handlers and scheduled jobs that run entirely server-side

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include a context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages (especially Paystack/Supabase error payloads)
- Webhook and check-in scan errors are always logged server-side before returning a response — never surface raw internals to the client
- API route errors return `status: 500` with a generic message — never expose internals
- A failed check-in scan (invalid signature, already used, expired) is a **normal, expected outcome**, not an error — return `{ success: true, data: { scan_result: 'already_used' } }`, not a 500
- The check-in scan endpoint validates the door-staff access token **before** anything else — before QR signature verification, before any database read. An invalid or revoked door-staff token short-circuits immediately with no information about ticket state leaked back
- The scan endpoint has no offline/queued path — a network failure surfaces to the usher as "No connection," never as a silently accepted or silently dropped scan

---

## PostHog Events

All PostHog events must use these exact event names. Never invent new event names without adding them here first.

| Event | When | Fired from | Key Properties |
|---|---|---|---|
| `event_page_viewed` | Event detail page loads | Client | `event_id`, `organizer_id`, `is_online` |
| `checkout_started` | Attendee selects a tier and starts checkout | Client | `event_id`, `ticket_type_id`, `quantity` |
| `checkout_payment_initiated` | Redirect to Paystack | Client | `event_id`, `order_id`, `amount` |
| `ticket_purchased` | Payment confirmed | **Server** (webhook handler) | `event_id`, `ticket_type_id`, `order_id`, `amount`, `commission_amount` |
| `ticket_scanned` | Check-in scan attempted | **Server** (check-in route) | `ticket_id`, `event_id`, `scan_result` |
| `organizer_onboarding_step_completed` | Each onboarding wizard step saved | Client/Server | `step_name`, `organizer_id` |
| `google_sign_in_started` | User starts Google OAuth | Client | none |
| `account_signup_submitted` | User submits email signup | Client | none |
| `email_sign_in_submitted` | User submits email sign-in | Client | none |
| `email_sign_in_succeeded` | Email sign-in succeeds | Client | none |
| `category_filter_selected` | User changes Discover category | Client | `category` |
| `city_filter_selected` | User changes Discover city | Client | `city` |

These twelve custom events are the only events in this project (autocapture covers general clicks/pageviews on top of these). Do not add more without updating this list first. Never include email, password, or raw search text in event properties.

`ticket_purchased` and `ticket_scanned` **must** be fired server-side — they are the source of truth for the organizer dashboard funnel and check-in rate, and firing them client-side would let a closed tab or a spoofed request produce incorrect numbers.

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable | Used In |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `utils/supabase/client.ts`, `utils/supabase/server.ts` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `utils/supabase/client.ts`, `utils/supabase/server.ts` |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook handler, scheduled jobs only — **never `NEXT_PUBLIC_`** |
| `PAYSTACK_SECRET_KEY` | `lib/paystack.ts` (server only) |
| `PAYSTACK_WEBHOOK_SECRET` | `app/api/webhooks/paystack/route.ts` (server only) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Client-side Paystack initialization, if used |
| `QR_TOKEN_SECRET` | `lib/qr.ts` (server only — signs/verifies QR tokens) |
| `UPSTASH_REDIS_REST_URL` | `lib/rate-limit.ts` |
| `UPSTASH_REDIS_REST_TOKEN` | `lib/rate-limit.ts` (server only) |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` | `instrumentation-client.ts`, `instrumentation.ts` |
| `NEXT_PUBLIC_POSTHOG_HOST` | `instrumentation-client.ts`, `instrumentation.ts` |
| `POSTHOG_PROJECT_API_KEY` | `utils/posthog/server.ts` |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to a secret key — `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `QR_TOKEN_SECRET`, and `UPSTASH_REDIS_REST_TOKEN` must never carry that prefix.

---

## Commission Rate & Reservation Window

Fixed business constants are defined once. Never hardcode these values anywhere else.

```typescript
// lib/constants.ts
export const COMMISSION_RATE = 0.203; // 20.3%, fixed across all markets
export const RESERVATION_HOLD_MINUTES = 10;
export const MAX_TICKET_CARD_IMAGE_MB = 50;
```

Import and use these constants everywhere the value is needed — never re-type `0.203` or `10` inline.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { COMMISSION_RATE } from "@/lib/constants";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- The inventory RPC, webhook handler, and QR signing functions may have a brief comment explaining the specific race condition or exploit being prevented, since that context isn't visible from the code alone
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@supabase/ssr` — Supabase client (browser + server)
- `@supabase/supabase-js` — Supabase base client
- `zustand` — client-side UI state (never authorization state)
- `@tanstack/react-query` — server-state fetching/caching
- `posthog-js` — PostHog browser client
- `posthog-node` — PostHog server client
- `qrcode` — QR code generation on the client for ticket cards
- `date-fns` — relative date formatting ("In 4 days", countdowns)
- `@upstash/ratelimit` + `@upstash/redis` — rate limiting on checkout, webhook, and check-in endpoints
- `zod` — schema validation
- `lucide-react` — icons
- `tailwindcss` — styling
- `shadcn/ui` components — UI primitives

Do not install any other packages without updating this list first. In particular, do not install any Stripe or Flutterwave SDK until the corresponding phase of the build plan (post-MVP expansion) is actually reached.
