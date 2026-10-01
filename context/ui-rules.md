# UI Rules — Tik-Booth

Concise rules for building Tik-Booth UI. The published screen set and `ui-registry.md` are the source of truth for visual decisions — these rules cover the patterns and constraints that keep the rest of the UI consistent with it without re-specifying every component.

---

## Font

Always import Plus Jakarta Sans via `next/font/google` in the root layout.

```typescript
import { Plus_Jakarta_Sans } from "next/font/google";
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });
```

The `--font-sans` variable is already declared in `@theme` in `globals.css`. Apply the font variable class to the `<html>` tag in the root layout. Never use a system font as the primary font, and never mix in a second typeface anywhere in the app — including the ticket card, which stays in the same font as everything else rather than borrowing a "ticket-y" display face.

---

## Layout

- Page max-width: 1240px, centered
- Main content area padding: 20px horizontal
- Gap between major page sections: 24–52px depending on section weight (see `ui-tokens.md` spacing table)
- Mobile: **bottom tab bar**, not a top navbar — four fixed tabs (Discover, My tickets, Create, Profile)
- Desktop: **top navbar**, no sidebar — except the Discover page specifically, which gets a persistent left category sidebar as a deliberate, documented exception (see `ui-registry.md` → `CategorySidebar`)
- The check-in scanner and door-staff landing screens are full-bleed, chromeless exceptions to both of the above — no tab bar, no navbar, nothing that could tempt an usher into the main app mid-shift

---

## Navbar (desktop)

- Background always `bg-surface`, `border-b border-border`, height 54px
- Links: `text-ink-2` inactive, `text-ink` active — no underline, color change only, same as the tab-bar convention on mobile
- Exactly one high-contrast element on the right: the "Create event" button (`bg-brand`) — never more than one filled button in the navbar at once, even when logged out (the "Log in" button next to it stays neutral)

## Bottom Tab Bar (mobile)

- Fixed order, never reordered: Discover, My tickets, Create, Profile
- Icon-only, no labels — `text-ink-3` inactive, `text-brand` active
- Never add a fifth tab. A new destination goes inside Profile's list instead.

---

## Cards

Every content section lives in a card, with one documented exception below.

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: 16px (rounded-2xl)
padding: 24px (large panels) or 12–16px (compact cards like EventCard)
box-shadow: 0 1px 2px rgba(20,18,32,.06), 0 8px 24px rgba(20,18,32,.06)
```

Never use a colored card background — color goes inside cards via badges, borders, and status dots, never on the card surface itself.

**The one exception: the ticket card.** It is allowed a colored/gradient background (the organizer's chosen tier design) and a heavier shadow, because the ticket is meant to look like a physical, liftable object, not a data panel. See `ui-tokens.md` → "Ticket Card (elevated exception)." No other card in the app gets this treatment — not the event card, not the dashboard stat card, nothing else.

---

## Typography Hierarchy

Three levels, used consistently everywhere except the check-in scanner (which gets its own oversized scale — see below).

**Page / section headings**
```
font-size: 17–22px
font-weight: 800
color: text-ink
line-height: 1.2, letter-spacing -0.02em
```

**Body / primary content text**
```
font-size: 12.5–13.5px
font-weight: 500–700
color: text-ink or text-ink-2
line-height: 1.5
```

**Secondary / muted text** — labels, timestamps, subtitles
```
font-size: 10.5–11.5px
font-weight: 600–800
color: text-ink-3
```

Stat numbers on the organizer dashboard use 23px / weight 800 / `text-ink`. Countdown and reservation-hold digits use 30px / weight 800 / `tabular-nums` — see the "never let ticking numbers reflow layout" rule in `ui-tokens.md`.

**Check-in scanner exception:** the four result screens (valid / already-used / invalid / no-connection) use a 22px headline and an 84px icon orb — deliberately larger than anything else in the product, because this is the one screen read at arm's length, under time pressure, by someone who is not looking at their phone the way an attendee would.

---

## Badges

All badges use `border-radius: 9999px` (pill shape). No exceptions — Tik-Booth has no "trend badge" equivalent that breaks the pill shape the way JobPilot's does.

```
padding: 4–5px 10–11px
font-size: 10–10.5px
font-weight: 800
text-transform: uppercase (status pills only)
```

Exactly one status badge renders per event card or ticket, per the rule in `ui-registry.md` → `StatusBadge`. Never stack two.

---

## Buttons

**Primary:**
```
background: bg-brand
color: text-brand-ink
border-radius: 10px
padding: 0 16px, height 42px
font-weight: 700
```

**Secondary:**
```
background: bg-surface
border: 1px solid border-line-2
color: text-ink
border-radius: 10px
padding: 0 16px, height 42px
```

**Danger text button** (Revoke, Log out): transparent background, `text-live`, ordinary neutral border — never a solid red button anywhere in the app, including for revoking door-staff access. A destructive action reads as text-colored intent, not as a red block, because red blocks are reserved for the Live-event badge and nothing else.

---

## Form Inputs

```
background: bg-surface-2
border: 1px solid border-border
border-radius: 10px
padding: 0 12px, height 40px
font-size: 13px
color: text-ink
placeholder: text-ink-3
focus: ring-2 ring-brand-line
```

---

## Lists (Events, Ticket Tiers, Door Staff Gates)

Tik-Booth has no data table in the JobPilot sense — every list (organizer's events, ticket tiers, door-staff gates, notifications) uses the same bordered-row pattern instead:

- No alternating row colors — `bg-surface` rows only, separated by `border-b border-border` or wrapped individually in `border border-border rounded-lg`
- Row text: 13px, `text-ink` primary / `text-ink-3` secondary line beneath
- Hover state: `hover:border-line-2`, never a background-color hover — background stays `bg-surface` at rest and on hover alike, so a list never looks like it's "loading" or "selected" when it's just being pointed at

---

## Status & Countdown Colors

This is Tik-Booth's equivalent of JobPilot's match-score bar, and it is smaller and more fixed:

- **Live** → `bg-live-soft` / `text-live-ink`, paired with a pulsing `bg-live` dot
- **Free** → `bg-ok-soft` / `text-ok-ink`
- **Sold out** → neutral `bg-surface` + `border-border` + `text-ink-2` — never red, since sold out isn't a failure state
- **Low stock** (inline text only, never a card badge) → `text-warn`

Full detail and the check-in scan-result palette live in `ui-tokens.md` — do not introduce a fifth status color without adding it there first.

---

## Empty States

Every section that can be empty must have one. Keep it minimal:

- Icon in a neutral `bg-sunken` circle above the text
- Short descriptive text in `text-ink-2`, one supporting line in `text-ink-3`
- A CTA button only when there's a real next action (e.g. "Find an event" on an empty ticket wallet) — never a CTA that just restates the empty state back at the user

---

## Money & Time Display

Rules specific to Tik-Booth that JobPilot has no equivalent for:

- All prices render from an integer-kobo value, formatted to Naira at display time only — never store or pass around a pre-formatted string as if it were the source value
- Countdown and reservation-hold timers always use `tabular-nums` so digits never shift the layout as they tick
- "Live" status, reservation countdowns, and the online-event unlock countdown are all computed from a server-provided timestamp, never the client's device clock — this is a UI rule as much as a backend one, because a component that quietly trusts `Date.now()` for any of these three things is a bug regardless of how correct the backend is

---

## Tailwind v4 Note

This project uses Tailwind v4. Tokens are defined with `@theme` in `globals.css` — no `tailwind.config.ts` needed. Never define colors in a config file. Always use `@theme` for new tokens, and add any new token to `ui-tokens.md` in the same change.

---

## Do Nots

- Never use Tailwind's built-in color classes (`bg-violet-500`, `text-gray-600`) — use project tokens only
- Never define colors in `tailwind.config.ts` — use `@theme` in `globals.css`
- Never add a colored or gradient background to any card except the ticket card
- Never use more than one font weight in a single small UI element (a badge, a pill)
- Never show a raw Paystack, Supabase, or agent error message to a user — always human-readable text
- Never stack more than 2 levels of border radius inside each other
- Never use `position: fixed` for UI elements, with the two documented exceptions: the bottom tab bar (mobile) and the checkout reservation-hold banner when it's pinned during a long scroll
- Never render a "Live," "Free," or countdown status from a client-computed timestamp
- Never display a QR code smaller than the minimums in `ui-tokens.md` — a code that fails to scan at the door is a functional bug, not a visual nitpick
- Never give the check-in scanner or door-staff landing screen the standard navbar/tab-bar chrome — they are intentionally chromeless
