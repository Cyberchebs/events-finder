# Tik-Booth

Event ticketing for Nigeria, built to expand across Africa and then globally. Organizers create events and sell tickets as customizable, QR-backed digital cards; attendees discover, pay, and walk in with a ticket that's cryptographically hard to fake or duplicate.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) · Paystack · Zustand · TanStack Query · PostHog

## Key properties

- **No overselling, ever** — inventory changes through a single atomic Postgres RPC plus a time-limited reservation hold, not a bare transaction.
- **Idempotent, webhook-driven ticket issuance** — a ticket only exists once Paystack's signed webhook confirms payment, never off the client redirect.
- **Signed QR tickets** — each code is an HMAC-signed token, not a raw ID, so a screenshot can't become a second valid entry.
- **Online-only check-in** — door staff scan via a revocable, account-free gate link; there is no offline queue by design.
- **20.3% commission**, split automatically via Paystack at the point of sale. No refunds, no resale.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase, Paystack, PostHog, and QR secret keys
npm run dev
```

Generate Supabase types after any schema change:

```bash
npx supabase gen types typescript --project-id <project-ref> > src/types/database.types.ts
```

## Project docs

Everything an implementer needs lives in `/context`, and should be read before touching the code:

| File | Covers |
|---|---|
| `project-overview.md` | What this is, core flows, success criteria |
| `project-scope.md` | Full scope, resolved decisions, architecture review |
| `architecture.md` | Stack, folder structure, data flows, schema, invariants |
| `build-plan.md` | Phased build order — UI with mock data first, logic second |
| `code-standards.md` | TypeScript, Next.js, and error-handling conventions |
| `library-docs.md` | Exact usage patterns for Supabase, Paystack, QR signing, PostHog |
| `ui-tokens.md` | Color, type, and spacing tokens |
| `ui-rules.md` | Layout and component conventions |
| `ui-registry.md` | Every UI component, its classes, and why |
| `progress-tracker.md` | What's done, what's next — update this after every feature |

## Non-negotiables

A short list worth knowing before opening a PR — full detail in `architecture.md`:

- Money is always an integer in kobo, never a float.
- `ticket_types.quantity_sold` only changes through `reserve_ticket_inventory`.
- Every Paystack webhook is signature-verified (HMAC-**SHA512**) and checked for idempotency before any write.
- "Live" status and every countdown are computed from server time, never the client clock.
- Resale, ticket transfer, and refunds don't exist in this codebase — don't add them without a scope discussion first.
