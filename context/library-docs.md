# Library Docs — Tik-Booth

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to Tik-Booth.

Read the relevant section before implementing any feature that touches these libraries.

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. Check `AGENTS.md` at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.
2. Check if an MCP server is configured for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.
3. Read this file for project-specific patterns that override general library knowledge.

The order of authority is:

**MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge**

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated. **This applies especially to Paystack** — its API and webhook signing algorithm details are easy to misremember (it is HMAC-**SHA512**, not SHA256, unlike most other payment providers).

---

## Supabase

Check first: Check `AGENTS.md` for an installed Supabase skill. If a Supabase MCP server is configured — use it. The skill/MCP will have the latest API patterns.

### Client vs Server

Two separate instances — never mix them:

```typescript
// utils/supabase/client.ts — browser context only
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```typescript
// utils/supabase/server.ts — server context only
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — middleware refreshes instead
          }
        },
      },
    },
  );
}
```

```typescript
// utils/supabase/admin.ts — service role, NEVER imported outside webhook handlers and scheduled jobs
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
```

Rules:

- Browser client — Client Components, auth state, React Query mutations from the browser
- Server client — Server Components, most API routes, Server Actions
- **Admin client (service role) — only `app/api/webhooks/paystack/route.ts` and scheduled jobs.** It bypasses RLS entirely; never import it into anything reachable from a user request without a webhook signature already verified
- Always `await createClient()` in server context — it reads cookies asynchronously
- Use `getUser()`, never `getSession()`, whenever the result needs to be trustworthy — `getSession()` reads the cookie without re-verifying against Supabase's server

### Auth

```typescript
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

### DB Queries

```typescript
// Read — always scoped
const { data, error } = await supabase
  .from("tickets")
  .select("*, ticket_types(*), events(*)")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: false });

// Insert
const { data, error } = await supabase
  .from("events")
  .insert({ organizer_id: user.id, title, starts_at, ends_at, status: "draft" })
  .select()
  .single();

// Update — always scoped to the owner, even though RLS also enforces it
const { error } = await supabase
  .from("events")
  .update({ status: "published" })
  .eq("id", eventId)
  .eq("organizer_id", user.id);
```

Rules:

- Always scope queries to `user_id`/`organizer_id`/`owner_id` — never query without an owner filter, even though RLS is the real enforcement boundary
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row
- **Inventory mutations never go through a plain `.update()` call** — see the RPC pattern below

### Inventory RPC — the one query pattern that is never a plain client call

```typescript
// lib/inventory.ts
export async function reserveTicketInventory(
  ticketTypeId: string,
  quantity: number,
): Promise<{ success: boolean; reservationId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("reserve_ticket_inventory", {
      p_ticket_type_id: ticketTypeId,
      p_quantity: quantity,
    });
    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: "Sold out" };
    return { success: true, reservationId: data.reservation_id };
  } catch (error) {
    console.error("[lib/inventory:reserveTicketInventory]", error);
    return { success: false, error: "Failed to reserve tickets" };
  }
}
```

The corresponding Postgres function (defined in a migration, not in application code):

```sql
create or replace function reserve_ticket_inventory(
  p_ticket_type_id uuid,
  p_quantity int
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_reservation_id uuid;
begin
  update ticket_types
  set quantity_sold = quantity_sold + p_quantity
  where id = p_ticket_type_id
    and quantity_sold + p_quantity <= quantity_available;

  if not found then
    return null; -- sold out, caller checks for null
  end if;

  insert into reservations (ticket_type_id, quantity, user_id, expires_at, status)
  values (p_ticket_type_id, p_quantity, auth.uid(), now() + interval '10 minutes', 'pending')
  returning id into v_reservation_id;

  return jsonb_build_object('reservation_id', v_reservation_id);
end;
$$;
```

Rules:

- Every inventory change happens through `reserve_ticket_inventory` (or the equivalent confirm/release RPCs) — never a bare `UPDATE ticket_types SET quantity_sold = ...` from application code
- The function is `security definer` so RLS on `ticket_types` doesn't block the internal update, but it still validates `auth.uid()` for the reservation row it creates
- A `null` return means sold out — this is an expected outcome, not an error

### Storage

```typescript
// Upload ticket card image
const { data, error } = await supabase.storage
  .from("ticket-card-images")
  .upload(`${organizerId}/${ticketTypeId}.jpg`, fileBuffer, {
    contentType: "image/jpeg",
    upsert: true,
  });

// Public URL
const { data } = supabase.storage
  .from("ticket-card-images")
  .getPublicUrl(`${organizerId}/${ticketTypeId}.jpg`);
```

Rules:

- Bucket-level policy enforces the `MAX_TICKET_CARD_IMAGE_MB` (50MB) limit server-side — never rely on client-side validation alone
- Server-side resize/compress before the image is ever referenced on a live ticket card (see Phase 4 of the build plan) — the original upload is not what gets rendered
- Always save the public URL back to `ticket_types.card_image_url` after upload

---

## Paystack

Check first: Check `AGENTS.md` for an installed Paystack skill. If a Paystack MCP server is configured — use it.

### Initialize a Transaction (with commission split)

```typescript
// lib/paystack.ts
export async function initializeTransaction(params: {
  amountKobo: number;
  email: string;
  subaccountCode: string;
  reference: string;
}): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> {
  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo, // already an integer in kobo — never multiply/convert here
        subaccount: params.subaccountCode,
        reference: params.reference,
        currency: "NGN",
      }),
    });

    if (!response.ok) return { success: false, error: `Paystack error: ${response.status}` };

    const { data } = await response.json();
    return { success: true, authorizationUrl: data.authorization_url, reference: data.reference };
  } catch (error) {
    console.error("[lib/paystack:initializeTransaction]", error);
    return { success: false, error: String(error) };
  }
}
```

Rules:

- `amount` is always the integer kobo value already computed elsewhere (`price_kobo * quantity`) — this function never does currency math itself
- Passing `subaccount: "ACCT_xxx"` is what triggers the split — Paystack splits automatically based on the **`percentage_charge`** set when the subaccount was created
- **Commission model**: create each organizer's subaccount with `percentage_charge: 20.3` — by Paystack's convention this means the **main (platform) account** receives 20.3% and the **subaccount (organizer)** receives the remaining 79.7%. Confirm this percentage direction against the current Paystack dashboard/API docs before going live — Paystack's own docs note this exact percentage semantic and it is easy to get backwards
- Reference must be the reservation ID (or a value that maps back to it) so the webhook can locate the correct reservation

### Create a Subaccount (organizer payout onboarding)

```typescript
export async function createSubaccount(params: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
}): Promise<{ success: boolean; subaccountCode?: string; error?: string }> {
  try {
    const response = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        business_name: params.businessName,
        bank_code: params.bankCode,
        account_number: params.accountNumber,
        percentage_charge: 20.3,
      }),
    });
    if (!response.ok) return { success: false, error: `Paystack error: ${response.status}` };
    const { data } = await response.json();
    return { success: true, subaccountCode: data.subaccount_code };
  } catch (error) {
    console.error("[lib/paystack:createSubaccount]", error);
    return { success: false, error: String(error) };
  }
}
```

Rules:

- `percentage_charge` is always `COMMISSION_RATE` from `lib/constants.ts` (as a percentage, i.e. `20.3`) — never hardcoded a second time here
- Bank code comes from Paystack's List Banks endpoint — never hand-typed
- Store the returned `subaccount_code` on `profiles.paystack_subaccount_code`

### Webhook Signature Verification

Paystack signs webhooks with **HMAC-SHA512** over the **raw** request body, hex-encoded, in the `x-paystack-signature` header. This is a common point of failure — do not assume SHA256 the way most other providers use it.

```typescript
// app/api/webhooks/paystack/route.ts
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const rawBody = await req.text(); // raw text, never req.json() first
  const signature = req.headers.get("x-paystack-signature");

  if (!signature) {
    return NextResponse.json({ success: false, error: "Missing signature" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  const isValid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!isValid) {
    return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  // idempotency check against processed_webhook_events happens next, before any ticket logic
  // ...
  return NextResponse.json({ success: true });
}
```

Rules:

- Read the body with `req.text()`, **never** `req.json()` first — the signature is computed over the exact raw bytes, and parsing first can subtly change the string (whitespace, key order) and break verification
- Use `crypto.timingSafeEqual`, not `===`, to compare signatures — prevents timing attacks
- Length-check both buffers before `timingSafeEqual` (it throws on mismatched lengths rather than returning `false`)
- The event type is in the parsed body's `event` field (e.g. `"charge.success"`) — not a header
- Test mode and live mode have separate secret keys — a signature is only valid against the key for the mode that actually sent it
- After signature verification passes, check `processed_webhook_events` for this event's ID before running any ticket-issuance logic (see Code Standards)

### `PaymentProvider` Interface

All Paystack-specific functions above are called only through the shared interface — never directly from a route handler or Server Action:

```typescript
// lib/payment-provider.ts
export interface PaymentProvider {
  initializeTransaction(params: {
    amountMinorUnits: number;
    currency: string;
    email: string;
    metadata: Record<string, unknown>;
  }): Promise<{ authorizationUrl: string; reference: string }>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string): { eventId: string; reference: string; status: "success" | "failed" };
  createSplitRecipient(params: { organizerId: string; bankDetails: unknown }): Promise<{ subaccountCode: string }>;
}
```

`PaystackProvider` (`lib/paystack-provider.ts`) implements this today. No other file should call `fetch("https://api.paystack.co/...")` directly.

---

## PostHog

Check first: Check `AGENTS.md` for an installed PostHog skill. If a PostHog MCP server is configured — use it.

### Client Setup (Browser)

```typescript
// instrumentation-client.ts initializes the browser SDK before hydration
import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  capture_pageview: true,
  autocapture: true,
});

// Capture a client-side event
posthog.capture("checkout_started", { event_id, ticket_type_id, quantity });
```

### Server Setup

```typescript
// utils/posthog/server.ts
import { PostHog } from "posthog-node";

export function createPostHogServer() {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately — Next.js route handlers are short-lived
    flushInterval: 0,
  });
}

// Always create, capture, and shut down within the same request
const posthogServer = createPostHogServer();
posthogServer.capture({
  distinctId: buyerId,
  event: "ticket_purchased",
  properties: { event_id, ticket_type_id, order_id, amount, commission_amount },
});
await posthogServer.shutdown(); // required — buffered events are lost without this
```

Rules:

- Always `await posthogServer.shutdown()` at the end of any server function that captures an event — without it, buffered events can be dropped when the serverless function exits
- `flushAt: 1` and `flushInterval: 0` are always set on the server client — batching defaults assume a long-lived process, which a Next.js route handler is not
- Event names must exactly match the table in `code-standards.md` — do not invent new event names inline
- Call `posthog.identify(userId)` once, right after login, on the client
- Call `posthog.reset()` on logout, on the client
- `ticket_purchased` and `ticket_scanned` are **only ever** captured from the server client (webhook handler, check-in route) — never from the browser client, since those two events are the organizer dashboard's source of truth

---

## QR Code Generation & Signing

Tickets use a signed token, not a raw `ticket_id`, encoded into the QR image.

### Signing (server-side)

```typescript
// lib/qr.ts
import crypto from "crypto";

export function signTicketToken(ticketId: string): string {
  const hmac = crypto
    .createHmac("sha256", process.env.QR_TOKEN_SECRET!)
    .update(ticketId)
    .digest("hex");
  return `${ticketId}.${hmac}`;
}

export function verifyTicketToken(token: string): { valid: boolean; ticketId?: string } {
  const [ticketId, hmac] = token.split(".");
  if (!ticketId || !hmac) return { valid: false };

  const expected = crypto
    .createHmac("sha256", process.env.QR_TOKEN_SECRET!)
    .update(ticketId)
    .digest("hex");

  const valid =
    hmac.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expected));

  return valid ? { valid: true, ticketId } : { valid: false };
}
```

### Rendering (client-side, on the ticket card)

```typescript
// components/tickets/TicketCard.tsx
"use client";
import QRCode from "qrcode";

// generate a data URL for the <img> on the ticket card
const dataUrl = await QRCode.toDataURL(signedToken, { margin: 1, width: 300 });
```

Rules:

- The token is generated **once**, server-side, at ticket-issuance time (inside the webhook handler) and stored on `tickets.qr_token` — the client never generates or signs a token itself
- `verifyTicketToken` runs server-side, inside the check-in scan route, before any ticket-status lookup — a malformed or invalid-signature token is rejected before touching the database
- `QR_TOKEN_SECRET` is a server-only environment variable, never exposed to the client

---

## Door Staff Access (Check-in Scanner Auth)

Ushers scanning tickets at the gate never get a Supabase Auth account. Their credential is a single-purpose access token embedded in a link the organizer generates and shares — this is a project-specific pattern, not a library, but it sits alongside `qr.ts` closely enough to document here.

### Token Generation (Organizer Action)

```typescript
// actions/door-staff.ts
"use server";

import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function createDoorStaffAccess(eventId: string, gateLabel: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // ownership check — even though RLS also enforces this
    const { data: event } = await supabase
      .from("events")
      .select("organizer_id")
      .eq("id", eventId)
      .single();
    if (!event || event.organizer_id !== user.id) {
      return { success: false, error: "Not authorized for this event" };
    }

    const plaintextToken = crypto.randomBytes(24).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(plaintextToken).digest("hex");

    const { error } = await supabase.from("door_staff_access").insert({
      event_id: eventId,
      gate_label: gateLabel,
      access_token_hash: tokenHash,
      created_by: user.id,
    });
    if (error) throw error;

    // plaintext token is returned ONCE — never stored, never retrievable again
    return { success: true, link: `/scan/${eventId}?token=${plaintextToken}` };
  } catch (error) {
    console.error("[actions/door-staff]", error);
    return { success: false, error: "Failed to create door staff access" };
  }
}
```

### Token Validation (Usher Opens the Link)

```typescript
// lib/door-staff.ts
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";

export async function validateDoorStaffToken(eventId: string, plaintextToken: string) {
  const supabase = await createClient();
  const tokenHash = crypto.createHash("sha256").update(plaintextToken).digest("hex");

  const { data } = await supabase
    .from("door_staff_access")
    .select("id, gate_label, revoked_at")
    .eq("event_id", eventId)
    .eq("access_token_hash", tokenHash)
    .maybeSingle();

  if (!data || data.revoked_at) {
    return { valid: false as const };
  }
  return { valid: true as const, gateLabel: data.gate_label, accessId: data.id };
}
```

**Rules:**
- Only the **hash** of the token is ever stored — the same pattern as a password, not because the token is a password, but because a leaked database row should never hand out working scanner access
- The plaintext token appears in exactly one place: the response of `createDoorStaffAccess`, shown to the organizer once. If they lose the link, generate a new one and revoke the old — never attempt to "look up" or redisplay the original token
- **Revocation must be checked on every single scan request**, not cached client-side for the session — an organizer revoking a gate mid-event needs that to take effect on the usher's very next tap, not after they reload the page
- This token is scoped to exactly one `event_id`. It grants no access to any other event, any organizer data, or anything outside the scan endpoint
- No Supabase Auth session, no cookie, no `auth.uid()` involved for the usher at all — RLS on `tickets`/`ticket_types` for the scan path is bypassed deliberately via a service-role-scoped RPC that itself re-validates the door-staff token as its first step, not via the anon/user-scoped client

### Camera / QR Decoding (Usher's Device)

```typescript
"use client";
import { BrowserQRCodeReader } from "@zxing/browser";

const codeReader = new BrowserQRCodeReader();
const controls = await codeReader.decodeFromVideoDevice(
  undefined, // default camera
  videoElementRef.current,
  (result) => {
    if (result) {
      controls.stop();
      submitScan(result.getText());
    }
  },
);
```

**Rules:**
- `@zxing/browser` decodes QR codes from the live camera feed entirely client-side — only the **decoded token string** is sent to `POST /api/checkin/scan`, never a photo or video frame
- Camera access requires HTTPS (or `localhost` in dev) — this is a browser platform requirement, not something the app configures
- Stop the camera stream (`controls.stop()`) immediately after a successful decode, restart it only when the usher taps "Scan next" — a camera left running continuously drains the device battery fast over a multi-hour event

### Online-Only — No Offline Queue

**This is a deliberate MVP decision, not a gap.** Every scan is a live `POST /api/checkin/scan` call. There is no local cache of valid ticket IDs and no queued/synced scanning.

**Rules:**
- On any network failure, the scanner shows an explicit "No connection" state — it never silently accepts a scan it couldn't verify, and it never queues a scan to retry later
- The atomic `UPDATE ... WHERE status = 'issued'` pattern is what makes multiple gates simultaneously safe — but only because every scan reaches the same database in real time. An offline mode would reintroduce exactly the double-admission race this pattern exists to prevent, since two offline devices can't see each other's pending scans
- If venue connectivity becomes a real recurring problem, that is a reason to revisit this decision explicitly — not a reason to add a "just in case" offline fallback quietly

---

## React Query (`@tanstack/react-query`)

Check first: Check `AGENTS.md` for an installed TanStack Query skill.

Used for **server state only** — data that lives in Supabase and needs refetching. Never for client-only UI state (that is Zustand's job).

```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

const { data, isLoading, error } = useQuery({
  queryKey: ["ticket-types", eventId],
  queryFn: () => fetchTicketTypes(eventId),
  staleTime: 15_000,
  refetchOnWindowFocus: true,
});
```

Rules:

- **Inventory-bearing queries (`ticket_types`, remaining ticket counts) use a short `staleTime` and `refetchOnWindowFocus: true`** — a user who has had the tab open for ten minutes must never see a stale "12 tickets left" badge and act on it
- Public read-heavy data (event listings, event detail) can use a much longer `staleTime` — it does not carry the same correctness risk
- Never copy fetched server data into Zustand — React Query owns server state, and duplicating it creates two sources of truth that drift
- Query keys always include the scoping ID (`["tickets", userId]`, `["ticket-types", eventId]`) so cache entries never collide across users or events
- Initial page data still comes from Server Components where possible — React Query is for data that must revalidate client-side, not a replacement for server rendering

---

## Zustand

Check first: Check `AGENTS.md` for an installed Zustand skill.

Used for **client-side UI state only**. Never for authorization decisions.

```typescript
// store/authStore.ts
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
}));
```

Rules:

- `useAuthStore().user` decides **what to render**, never **what to authorize**. Every real permission check goes through RLS or a server-side `supabase.auth.getUser()`
- The store is hydrated once in a root `AuthProvider` client component and kept in sync via `supabase.auth.onAuthStateChange`
- Never put access tokens in the store — that reintroduces exactly the XSS token-theft risk the cookie-based `@supabase/ssr` setup exists to avoid
- Appropriate uses: checkout cart state (selected tier + quantity before payment is initiated), UI toggles, Discover filter/sort/category selections, organizer onboarding wizard draft state between steps
- Inappropriate uses: anything fetched from Supabase, anything that decides access, anything that must survive a page refresh (use the DB or the URL instead)

---

## Upstash Rate Limiting

Check first: Check `AGENTS.md` for an installed Upstash skill.

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 checkout attempts per minute per key
});

export const checkinScanRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"), // higher limit — legitimate door staff scan quickly
});
```

```typescript
// usage inside a route handler
const { success } = await checkoutRateLimit.limit(userId ?? ip);
if (!success) {
  return NextResponse.json({ success: false, error: "Too many attempts, try again shortly" }, { status: 429 });
}
```

Rules:

- Rate limit key is `userId` when authenticated, IP address as a fallback (checkout-initiation) — never IP alone for authenticated routes, since NAT'd networks share IPs
- Check-in scan limiter is scoped per organizer/device token, not per attendee, since the actor making the request is door staff, not the ticket holder
- Never apply the same limiter instance to two semantically different endpoints — each endpoint gets its own `Ratelimit` instance with numbers tuned to that endpoint's real usage pattern

---

## date-fns

Used for the Discover feed's relative countdown labels ("In 4 days", "In 2 weeks").

```typescript
import { formatDistanceToNowStrict } from "date-fns";

function getEventCountdownLabel(startsAt: string, endsAt: string): string {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (now >= start && now <= end) return "Live";
  if (now > end) return "Ended";
  return `In ${formatDistanceToNowStrict(start)}`;
}
```

Rules:

- "Live" status is computed from the **server's** clock when this runs in a Server Component or API route — never trust a client-supplied `now()` for this comparison, consistent with the reservation-hold and countdown rules elsewhere in the project
- Thresholds for the label wording (today/tomorrow/in X days/weeks/months) are defined once in `lib/format-date.ts` — never re-implemented inline in a component

---

## Summary — Patterns That Are Never Negotiable

Quick reference for the rules in this file that carry real consequences if broken:

| Never | Always |
|---|---|
| `SELECT` then `UPDATE` on inventory | The atomic `reserve_ticket_inventory` RPC |
| Issue a ticket from the client redirect | Issue from the signature-verified, idempotent webhook |
| `req.json()` in the webhook handler | `req.text()` — signature verification needs the raw body |
| Verify Paystack signatures with SHA256 | HMAC-**SHA512** — Paystack differs from most providers here |
| Encode a raw `ticket_id` in a QR code | Encode an HMAC-signed token |
| Compare signatures with `===` | `crypto.timingSafeEqual` |
| Give ushers a Supabase Auth account | Per-gate, revocable access token scoped to one event |
| Store a door-staff token in plaintext | Store only its hash, same as a password |
| Let a check-in scan queue offline | Show "No connection" — online-only by design |
| Store money as a float | Integer kobo |
| Re-type `0.203` or the hold window inline | Import from `lib/constants.ts` |
| Trust `useAuthStore().user` for authorization | `supabase.auth.getUser()` server-side + RLS |
| Compute "Live" or a countdown from the device clock | Server-provided timestamps |
| Copy Supabase data into Zustand | Let React Query own server state |
| Put a secret behind `NEXT_PUBLIC_` | Server-only env vars for every secret |
