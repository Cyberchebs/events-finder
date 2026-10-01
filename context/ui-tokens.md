# UI Tokens — Tik-Booth

Design tokens for Tik-Booth. All colors, typography, spacing, and component values match the delivered UI (see the published `context/tik-booth-designs` screens and `ui-registry.md`). Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed for colors or tokens.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-brand` → `bg-brand`, `text-brand`, `border-brand`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-ink border-border"

// Also correct — references CSS variable directly (only inside chart libraries
// that require a raw value, e.g. recharts `stroke` props — see library-docs.md)
style={{ color: 'var(--color-brand)' }}

// Never — hardcoded hex values
className="bg-[#5B3DF5] text-[#16141F]"

// Never — raw Tailwind color classes
className="bg-violet-600 text-gray-700"
```

`ui-registry.md` is the source of truth for *which* token a given component uses — this file is the source of truth for what each token's *value* is. If a class name appears in the registry that isn't defined here, that's a bug in one of the two files — fix the mismatch before building anything else with it.

---

## globals.css — Complete Token Definition

Light values are the default (`:root`). Dark values apply automatically under the system's `prefers-color-scheme: dark`, and can be forced either way with `data-theme="light"` / `data-theme="dark"` on `<html>` for an in-app theme toggle.

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #f4f4f7;
  --color-surface: #ffffff;
  --color-surface-2: #fafafc;
  --color-sunken: #eeeef3;

  /* Borders */
  --color-border: #e3e2ea;
  --color-line-2: #cfcdd9;

  /* Text */
  --color-ink: #16141f;
  --color-ink-2: #5b5768;
  --color-ink-3: #8e8a9c;

  /* Brand — primary purple */
  --color-brand: #5b3df5;
  --color-brand-ink: #ffffff;
  --color-brand-soft: #ece8fe;
  --color-brand-line: #c9befb;

  /* Live — red, used only for the "Live now" badge and destructive actions */
  --color-live: #e0353b;
  --color-live-soft: #fdecec;
  --color-live-ink: #8e1a1f;

  /* Ok — green, success and "Free" badge */
  --color-ok: #12805c;
  --color-ok-soft: #e1f4ec;
  --color-ok-ink: #0b5340;

  /* Warn — amber, low-stock inventory only */
  --color-warn: #b4690e;
  --color-warn-soft: #fbeedc;

  /* Default ticket-tier swatch palette — organizers can override per tier,
     these are the starting options offered in TierDesignerStep */
  --color-tier-a-1: #5b3df5;
  --color-tier-a-2: #2e1b9e;
  --color-tier-b-1: #0e9e82;
  --color-tier-b-2: #065c4c;
  --color-tier-c-1: #e2603a;
  --color-tier-c-2: #96341a;

  /* Border radius */
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 9999px;
}

/* Dark mode — mirrors the system setting by default */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-background: #0c0b12;
    --color-surface: #16151e;
    --color-surface-2: #1c1b26;
    --color-sunken: #100f18;

    --color-border: #282633;
    --color-line-2: #3a3747;

    --color-ink: #f2f1f6;
    --color-ink-2: #a9a5b8;
    --color-ink-3: #77738a;

    --color-brand: #8b74ff;
    --color-brand-ink: #12101c;
    --color-brand-soft: #231c4a;
    --color-brand-line: #3e3277;

    --color-live: #ff6b6b;
    --color-live-soft: #3a1718;
    --color-live-ink: #ffb3b3;

    --color-ok: #3dd39e;
    --color-ok-soft: #10322a;
    --color-ok-ink: #8fe9cb;

    --color-warn: #e8a33d;
    --color-warn-soft: #38270f;
  }
}

/* Forced dark, independent of system setting (in-app theme toggle) */
[data-theme="dark"] {
  --color-background: #0c0b12;
  --color-surface: #16151e;
  --color-surface-2: #1c1b26;
  --color-sunken: #100f18;
  --color-border: #282633;
  --color-line-2: #3a3747;
  --color-ink: #f2f1f6;
  --color-ink-2: #a9a5b8;
  --color-ink-3: #77738a;
  --color-brand: #8b74ff;
  --color-brand-ink: #12101c;
  --color-brand-soft: #231c4a;
  --color-brand-line: #3e3277;
  --color-live: #ff6b6b;
  --color-live-soft: #3a1718;
  --color-live-ink: #ffb3b3;
  --color-ok: #3dd39e;
  --color-ok-soft: #10322a;
  --color-ok-ink: #8fe9cb;
  --color-warn: #e8a33d;
  --color-warn-soft: #38270f;
}
```

Tailwind v4 generates utility classes automatically from every `--color-*` token above:

- `bg-brand`, `text-brand`, `border-brand`
- `bg-surface`, `text-surface-2`
- `bg-ok-soft`, `text-ink-3`
- etc.

The tier-swatch tokens (`tier-a-1` etc.) are the exception to "never hardcode" — a ticket's actual card color/image is organizer-supplied data from `ticket_types.card_color`, not a fixed token, and is applied via an inline `style` with a value read from the database. The tokens exist only to seed the default swatch options in `TierDesignerStep`.

---

## Color Usage Guide

### Page Layout

| Element              | Token             |
| --------------------- | ----------------- |
| Page background       | `bg-background`   |
| Card / surface         | `bg-surface`       |
| Secondary surface (inputs, drop zones) | `bg-surface-2`     |
| Sunken panel (empty states, scanner backdrop) | `bg-sunken`        |
| Default border         | `border-border`    |
| Stronger border (selected input, dashed upload zones) | `border-line-2`    |

### Typography

| Element                       | Token          |
| ------------------------------ | -------------- |
| Headings, primary text          | `text-ink`     |
| Secondary text, labels          | `text-ink-2`   |
| Placeholder, muted, timestamps  | `text-ink-3`   |

There is no separate "dark label" tier the way JobPilot has `text-text-dark` — Tik-Booth's type scale is deliberately flatter (three text tones total), since the product leans on color-coded status badges rather than typographic weight for hierarchy.

### Brand (Primary Purple)

Used for: primary buttons, active nav/category state, selected tier borders, focus states, the organizer wizard's progress bar.

| Element                  | Token             |
| -------------------------- | ----------------- |
| Button background          | `bg-brand`         |
| Button text                | `text-brand-ink`   |
| Selected chip/row background | `bg-brand-soft`   |
| Selected chip/row border   | `border-brand-line` or `border-brand` |

### Status Colors (Event & Ticket State)

Tik-Booth's status system is small and fixed — three states, never blended, never a fourth color introduced ad hoc.

| Status                     | Background     | Text          | Notes                                             |
| ---------------------------- | -------------- | ------------- | -------------------------------------------------- |
| Live (event happening now)   | `bg-live-soft` | `text-live-ink` | Paired with a solid `bg-live` pulsing dot          |
| Free (price = 0)             | `bg-ok-soft`   | `text-ok-ink`   | Never combined with a countdown label on the same card |
| Sold out                     | `bg-surface` + `border-border` | `text-ink-2` | Deliberately neutral, not red — sold out isn't an error |
| Low stock (tier nearly gone) | — (text-only)  | `text-warn`     | Used inline in `TierSelector`, not as a card badge  |

### Check-in Scan Result Colors

| Result         | Background     | Orb / accent  |
| --------------- | -------------- | -------------- |
| Valid            | `bg-ok-soft`   | solid `bg-ok`   |
| Already used      | `bg-live-soft` | solid `bg-live` |
| Invalid / forged   | `bg-sunken`    | solid `bg-ink-3` |
| No connection      | `bg-sunken`    | solid `bg-ink-3` |

Invalid and no-connection intentionally share the same neutral gray treatment rather than one of them borrowing red — neither is the attendee's fault, and red is reserved for "this specific ticket was already used," a meaningfully different situation for door staff to act on.

### Door Staff Access States

| State    | Background          | Text/Icon       |
| --------- | -------------------- | ---------------- |
| Active     | `bg-surface`          | `text-brand` icon chip on `bg-brand-soft` |
| Revoked    | `bg-surface` @ `opacity-55` | `text-ink-3` icon chip on `bg-sunken` |

### Ticket Tier Card Swatches (defaults)

| Swatch | Gradient                                  |
| ------- | ------------------------------------------ |
| A (violet) | `from-tier-a-1 to-tier-a-2`             |
| B (teal)   | `from-tier-b-1 to-tier-b-2`             |
| C (coral)  | `from-tier-c-1 to-tier-c-2`             |

These are starting points only — see the note under "globals.css" above. An organizer's actual chosen color always wins over these defaults once set.

---

## Typography

| Element                     | Size  | Weight | Line height | Color token   |
| ----------------------------- | ----- | ------ | ------------ | -------------- |
| Logo text                     | 17px  | 800    | 24px         | `text-ink`     |
| Event/ticket title (card)      | 14–15px | 700–800 | 20px       | `text-ink` (or `text-white` on a ticket card) |
| Page heading                   | 19–22px | 800  | 26px         | `text-ink`     |
| Stat value (dashboard)          | 23px  | 800    | 28px         | `text-ink`     |
| Scan result headline            | 22px  | 800    | 28px         | contextual — see Scan Result Colors above |
| Countdown digits                | 30px  | 800    | 36px         | `text-ink` (tabular-nums) |
| Section label (form, filters)   | 10.5px | 800  | 14px, uppercase, `tracking-wide` | `text-ink-3` |
| Body / description text          | 12.5–13px | 500 | 20px       | `text-ink-2`   |
| Timestamp / helper / muted        | 11–11.5px | 600 | 16px      | `text-ink-3`   |
| Badge / pill text                  | 10–10.5px | 800 | 14px, uppercase | contextual   |
| Chart axis labels                   | 10.5px | 700 | 14px       | `text-ink-3`   |

Font family: **Plus Jakarta Sans** — import via `next/font/google`, weights 400/500/600/700/800. Never fall back to a generic system sans beyond the declared stack, since the slightly geometric character of Plus Jakarta Sans is part of what keeps the ticket cards feeling designed rather than templated.

---

## Spacing

| Token    | Value | Usage                                    |
| -------- | ----- | ------------------------------------------ |
| `gap-1.5`  | 6px   | Badge icon-to-label gaps                    |
| `gap-2`    | 8px   | Chip rows, tight inline groups              |
| `gap-2.5`  | 10px  | List item spacing (tiers, gates, activity)  |
| `gap-3`    | 12px  | Form field stacks                           |
| `gap-4`    | 16px  | Section internal gaps                       |
| `gap-6`    | 24px  | Between major page sections                 |
| `p-3`      | 12px  | Compact card padding (event card body)      |
| `p-4`      | 16px  | Standard card padding                       |
| `p-6`      | 24px  | Large card / dashboard panel padding        |
| `px-4 py-2` | 16px / 8px | Button padding                        |
| `px-2.5 py-1` | 10px / 4px | Badge/pill padding                 |

---

## Component Tokens

### Cards

```
background: bg-surface
border: 1px solid var(--color-border)
border-radius: 16px (rounded-2xl)
padding: 24px (p-6) for panels, 12–16px (p-3 / p-4) for compact cards like EventCard
box-shadow: 0 1px 2px rgba(20,18,32,.06), 0 8px 24px rgba(20,18,32,.06)
```

Dark mode swaps the shadow to `0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)` — never reuse the light-mode shadow value under a dark surface, it reads as a faint gray halo rather than depth.

### Ticket Card (elevated exception)

```
border-radius: 16px (rounded-2xl)
box-shadow: 0 18px 48px rgba(20,18,32,.16)   /* the one component allowed this much shadow */
background: organizer-supplied gradient/image — never a fixed token
```

### Buttons

**Primary:**
```
background: bg-brand
text: text-brand-ink
border-radius: rounded-md (10px)
padding: px-4, height 42px (h-[42px])
font-weight: font-bold
```

**Secondary:**
```
background: bg-surface
border: border border-line-2
text: text-ink
border-radius: rounded-md
padding: px-4, height 42px
```

**Danger text button (Revoke, Log out):**
```
background: transparent
text: text-live
border: border border-border (unchanged — never a red border)
```

### Input Fields

```
background: bg-surface-2
border: border border-border
border-radius: rounded-md (10px)
height: 40px
padding: px-3
text: text-ink, font-medium once filled
placeholder: text-ink-3
focus: ring-2 ring-brand-line
```

### Badges / Pills

```
border-radius: rounded-full
padding: px-2.5 py-1
font-size: 10–10.5px
font-weight: font-extrabold (800)
text-transform: uppercase (status pills only — not the "12 left" style inline text)
```

### Live Status Dot

```
size: 6px, rounded-full
background: bg-live
animation: pulse 1.4s ease-in-out infinite (scale 1 → 1.6, opacity 1 → 0.35)
respects: prefers-reduced-motion: reduce → animation removed entirely, dot stays solid
```

### QR Code Block

```
background: #ffffff (always literal white, never a token — QR contrast must never
  shift with the theme, since it sits on a colored ticket card regardless of app theme)
border-radius: rounded-lg (10px)
padding: 6–8px
minimum rendered size: 320px on a full ticket detail view, ~50px on a compact wallet row
```

### Reservation / Unlock Countdown

```
background: bg-brand-soft (healthy), bg-live-soft (under 60 seconds remaining)
digits: font-extrabold, tabular-nums (never proportional numerals — digits must not
  shift width as they tick down)
```

### Dashboard Funnel Chart

| Element              | Value                                                    |
| ---------------------- | ---------------------------------------------------------- |
| Stage bars (early)      | `bg-brand-soft`, `border border-brand-line`                |
| Stage bar (final/"Paid")| `bg-brand` solid                                            |
| Bar shape                | `rounded-t-lg`, flat bottom, shared baseline                |
| Labels                   | `text-ink-3`, 10.5px, 700 weight                            |

### Logo

```
background: bg-brand (solid, not a gradient — Tik-Booth's mark is flat by design)
border-radius: 8px
size: 26×26px (nav), 46×46px (auth/empty-state hero use)
text: text-brand-ink, single bold letter or short glyph
```

---

## Invariants

- Never use hex values directly in components — always use CSS variables via Tailwind tokens
- Font is Plus Jakarta Sans — always import via `next/font/google`, never fall back to a bare system sans
- Never use raw Tailwind color classes like `bg-violet-600` or `text-gray-500` — use project tokens only
- `--color-brand` (#5B3DF5 light / #8B74FF dark) is the only purple in the app — never Tailwind's built-in violet/purple scale
- `--color-live` is reserved for "Live now" and destructive actions only — never repurposed as a generic "error" red for unrelated form validation messages (use `text-ink-2` + inline copy for those, per `code-standards.md`'s human-readable error rule)
- An organizer's ticket-tier color/image is **data**, not a token — it is the one place in the app a raw color value legitimately appears inline, sourced from `ticket_types.card_color` / `card_image_url`
- The QR code's white background is a literal, never a token — it must never shift under dark mode
- All borders default to `--color-border` — never `border-gray-*`
- Countdown and stat digits always use `tabular-nums` — never allow ticking numbers to reflow the layout
