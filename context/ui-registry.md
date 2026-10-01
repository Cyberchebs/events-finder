# UI Registry — Tik-Booth

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following `ui-rules.md` and `ui-tokens.md`, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### EventCard

File: components/discover/EventCard.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface` card shell, cover image div sits above with no padding                                     |
| Border           | `border border-border`                                                                                  |
| Border radius    | `rounded-2xl` outer card, `rounded-full` on the status badge                                            |
| Text — primary   | `text-sm font-semibold leading-5 text-ink` title                                                        |
| Text — secondary | `text-xs font-semibold text-ink-3` date/venue line                                                      |
| Spacing          | Cover `h-26 w-full`, body `p-3`                                                                          |
| Hover state      | `hover:border-line-2` on the whole card, no lift/shadow change                                          |
| Shadow           | `none` at rest                                                                                           |
| Accent usage     | Status badge only — see `StatusBadge` below. The card itself never carries brand color.                 |

**Pattern notes:**
Cover image is a flat `bg-gradient-to-br` tile keyed off the event's category or organizer-chosen tone — never a photo placeholder gray box, since a colored tile reads as "designed" even before an organizer uploads a real cover. Exactly one `StatusBadge` renders top-left on the cover, never two badges stacked. Clicking anywhere on the card navigates to the event detail page.

### StatusBadge

File: components/discover/StatusBadge.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------|
| Background       | `bg-live-soft` (Live), `bg-ok-soft` (Free), `bg-surface border border-border` (Sold out)                |
| Border           | `none` on Live/Free, `border border-border` on Sold out                                                 |
| Border radius    | `rounded-full`                                                                                           |
| Text — primary   | `text-[10.5px] font-extrabold tracking-wide` in `text-live-ink`, `text-ok-ink`, or `text-ink-2`         |
| Spacing          | `px-2.5 py-1`, `gap-1.5` between dot and label                                                           |
| Hover state       | `none` — this is a status indicator, not interactive                                                    |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Live dot: `bg-live`, `animate-pulse` — see the `prefers-reduced-motion` override in `ui-tokens.md`       |

**Pattern notes:**
Exactly one variant renders per card: `live` (pulsing dot + "LIVE"), `free` ("FREE"), a plain countdown string (no badge chrome, just `text-brand text-xs font-extrabold`), or `sold-out`. Never combine — an event is never shown as both "Free" and counting down; the countdown string in that case is simply omitted since the badge already communicates status. The Live variant is computed from server time on every render, never from a client-side `Date.now()` cached at page load.

### DiscoverSearchBar (mobile)

File: components/discover/DiscoverSearchBar.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface-2`                                                                                            |
| Border           | `border border-border`                                                                                   |
| Border radius    | `rounded-full`                                                                                            |
| Text — primary   | `text-[13px] font-medium text-ink-3` placeholder, `text-ink font-bold` on the location chip when set     |
| Spacing          | `h-10 px-3 gap-2`, divider `w-px h-4 bg-border`                                                          |
| Hover state      | `none` — tapping opens the search/location sheet, no inline hover                                        |
| Shadow           | `none`                                                                                                    |
| Accent usage     | `none` — search stays neutral so category chips carry the only color                                     |

**Pattern notes:**
Single row combining a search field and a location chip separated by a vertical divider, matching the YouTube-style pattern the product spec calls for. Location chip always shows a resolved city name, never a raw "Set location" placeholder once one has been chosen — falls back to "Set location" only pre-first-use.

### CategoryChips (mobile) / CategorySidebar (desktop)

File: components/discover/CategoryChips.tsx, components/discover/CategorySidebar.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | Chip off-state `bg-surface`; chip on-state `bg-brand`; sidebar row on-state `bg-brand-soft`               |
| Border           | Chip off-state `border border-border`; chip on-state `border-brand`; sidebar has no per-row border         |
| Border radius    | Chips `rounded-full`; sidebar active row gets `border-r-2 border-brand` instead of radius                  |
| Text — primary   | Chip off `text-ink-2 font-bold text-xs`; chip on `text-brand-ink`; sidebar active `text-brand font-bold`   |
| Spacing          | Chips `px-3.5 py-1.5 gap-1.5`, row `flex gap-1.5 overflow-x-auto px-4 pb-3`; sidebar rows `px-4.5 py-2.5`  |
| Hover state       | `hover:border-line-2` on off-state chips; `hover:bg-surface-2` on inactive sidebar rows                    |
| Shadow           | `none`                                                                                                     |
| Accent usage     | Active state is the only accent use in the entire Discover filter row — everything else stays neutral      |

**Pattern notes:**
Mobile renders `CategoryChips` directly beneath `DiscoverSearchBar`, pinned, horizontally scrollable, never wrapping to a second line. Desktop renders `CategorySidebar` as a persistent left column (`w-44 border-r border-border`) instead — the same category list, never both patterns on the same breakpoint. "All" is always the first entry in both.

### TierSelector

File: components/checkout/TierSelector.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface` unselected, `bg-brand-soft` selected, unavailable rows drop to `opacity-50`                  |
| Border           | `border border-border` unselected, `border-brand` selected                                                |
| Border radius    | `rounded-lg`                                                                                              |
| Text — primary   | `text-[13px] font-bold` tier name, `text-[13.5px] font-extrabold` price aligned right                    |
| Text — secondary | `text-[11px] font-semibold text-ink-3` remaining-quantity line                                            |
| Spacing          | `flex items-center justify-between px-3 py-2.5`, `gap-2.5` list                                          |
| Hover state      | `hover:border-line-2` on selectable rows only — sold-out rows never show a hover state                    |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Selected border/background only — the price text itself never changes color on selection                 |

**Pattern notes:**
Remaining-quantity text switches to `text-warn` under a low-stock threshold (defined once, not per-component) and `text-live` at zero, where the whole row also gets `opacity-50` and its click handler disabled. This component is fed by a React Query hook with a short `staleTime` — see `library-docs.md` — never by a prop passed down once at page load, since inventory can change while the page is open.

### ReservationCountdown

File: components/checkout/ReservationCountdown.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-brand-soft` (holding, healthy), `bg-live-soft` (under 60s remaining)                                  |
| Border           | `none`                                                                                                     |
| Border radius    | `rounded-lg`                                                                                              |
| Text — primary   | `text-[11.5px] font-semibold text-ink`, countdown digits `font-extrabold tabular-nums`                    |
| Spacing          | `flex gap-2.5 p-3`, icon `mt-0.5`                                                                          |
| Hover state      | `none`                                                                                                    |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Background swap from brand-soft to live-soft is the only accent signal — no separate warning icon swap    |

**Pattern notes:**
The countdown value is never computed from a `setInterval` counting down from a client-captured start time — it re-derives from the server-provided `expires_at` on every tick, so a backgrounded tab that resumes doesn't show a stale or negative value. This same component (re-skinned, not re-built) powers the online-event unlock countdown — do not create a second countdown component for that screen.

### TicketCard (wallet card)

File: components/tickets/TicketCard.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-gradient-to-br` using the ticket type's stored `card_color` (or `card_image_url` as a cover layer)     |
| Border           | `none` — the gradient edge is the only boundary                                                            |
| Border radius    | `rounded-2xl`                                                                                              |
| Text — primary   | `text-white font-extrabold text-[15px]` event title, `text-white/85 font-semibold text-[11.5px]` date/tier |
| Spacing          | `p-4 flex flex-col gap-3`, QR block `self-center`                                                          |
| Hover state      | `none` on mobile; desktop wallet view may apply a `hover:-translate-y-0.5 transition-transform`            |
| Shadow           | `shadow-lg` — this is the one component allowed a heavier shadow, since it's meant to look liftable/physical |
| Accent usage     | The organizer's own tier color **is** the accent for this component — never overridden by the app's brand color |

**Pattern notes:**
QR is always rendered as a white rounded square (`bg-white rounded-lg p-1.5`) regardless of the card's background color or image, for scan contrast. `used` tickets render through a separate flattened treatment (see `UsedTicketRow`), never this component with a dimmed opacity — a used ticket is a different component, not a CSS state of this one, because it drops the QR entirely.

### UsedTicketRow

File: components/tickets/UsedTicketRow.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                              |
| Border           | `border border-dashed border-line-2`                                                                      |
| Border radius    | `rounded-2xl`                                                                                              |
| Text — primary   | `text-[14px] font-bold text-ink`                                                                          |
| Text — secondary | `text-[11.5px] font-semibold text-ink-3`                                                                  |
| Spacing          | `p-4`, `opacity-65` on the whole row                                                                       |
| Accent usage     | `bg-sunken text-ink-3` "USED" pill — deliberately the only pill in the wallet that isn't `bg-brand` or `bg-ok-soft` |

**Pattern notes:**
No QR code renders here at all — not a grayed-out one. A used ticket has nothing left to scan, and showing a QR (even disabled-looking) invites someone to try scanning it anyway.

### OnlineJoinLock

File: components/events/OnlineJoinLock.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-sunken` full-bleed panel                                                                               |
| Border           | `none`                                                                                                     |
| Border radius    | `none` (fills its container)                                                                                |
| Text — primary   | `text-[16.5px] font-extrabold` heading, countdown `text-[30px] font-extrabold tabular-nums`                |
| Text — secondary | `text-[12.5px] font-medium text-ink-2 max-w-[230px] text-center`                                          |
| Spacing          | `flex flex-col items-center justify-center gap-2 p-6`                                                      |
| Accent usage     | `bg-sunken text-ink-3` lock icon orb when locked; swaps to `bg-ok-soft text-ok` "Join event" state once unlocked |

**Pattern notes:**
This component has exactly two states — locked and unlocked — and the join URL is simply absent from the API response in the locked state, so there is nothing in the client bundle to inspect or extract early. The countdown reuses the `ReservationCountdown` visual language but is its own component since the unlock condition (`starts_at` minus a fixed offset) differs from a reservation's `expires_at`.

### WizardShell

File: components/onboarding/WizardShell.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                               |
| Border           | `border border-border`                                                                                    |
| Border radius    | `rounded-2xl`                                                                                              |
| Progress track   | `h-1.5 rounded-full bg-sunken` outer, `bg-brand rounded-full` fill, width set by `(step / 5) * 100%`       |
| Step dots        | `h-7 w-7 rounded-full bg-sunken text-ink-3` pending; `bg-brand-soft border-2 border-brand-line text-brand` current; `bg-brand text-brand-ink` done |
| Spacing          | `p-6`, dots row `grid grid-cols-5 gap-2 mb-5`                                                              |
| Accent usage     | Progress fill and current/done dots are the only accent color on this shell — step content below inherits normal card styling |

**Pattern notes:**
`WizardShell` owns only the chrome (progress track, step dots, Back/Continue footer row) and renders `children` for the step body — it never contains step-specific fields itself. Each step's own component (`ProfileStep`, `PayoutStep`, `EventDetailsStep`, `TierDesignerStep`, `ReviewPublishStep`) is a sibling file, not nested inside this one. Back is disabled (not hidden) on step 1; Continue's label changes to "Publish event" only on step 5.

### TierDesignerStep

File: components/onboarding/TierDesignerStep.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Swatch           | `h-7.5 w-7.5 rounded-full` filled with the tier's gradient; `ring-2 ring-ink ring-offset-2 ring-offset-surface` when selected |
| Custom swatch    | `border border-dashed border-line-2 flex items-center justify-center text-ink-3` "+" affordance opens the image upload |
| Drop zone        | `border-[1.5px] border-dashed border-line-2 rounded-2xl` — shared `Dropzone` primitive, not a bespoke one  |
| Live preview     | Renders an actual `TicketCard` instance with the in-progress color/image, never a simplified mock — what the organizer sees here must be pixel-identical to what ships to the attendee's wallet |

**Pattern notes:**
The live preview panel re-uses the real `TicketCard` component directly rather than a lookalike — this is a hard rule, not a suggestion, because any drift between "preview" and "actual" erodes the one guarantee this step exists to give an organizer. Card image upload accepts up to `MAX_TICKET_CARD_IMAGE_MB` (see `lib/constants.ts`) client-side before the request is even sent, purely to fail fast — the bucket policy is still the real enforcement per `library-docs.md`.

### DashboardStatsBar

File: components/dashboard/DashboardStatsBar.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface-2`                                                                                             |
| Border           | `border border-border`                                                                                    |
| Border radius    | `rounded-2xl`                                                                                              |
| Text — primary   | `text-[23px] font-extrabold tracking-tight` value                                                          |
| Text — secondary | `text-[11px] font-bold text-ink-3` label; trend line `text-[11px] font-bold text-ok`                       |
| Spacing          | `p-3.5`, grid `grid-cols-2 lg:grid-cols-4 gap-3`                                                            |
| Accent usage     | `text-ok` on positive trend only — a flat or negative period shows `text-ink-3`, never `text-live`, since a slow week isn't an "error" state |

**Pattern notes:**
"Your earnings" is always the net figure — `total_kobo` minus `commission_kobo` — with a `text-[10.5px] text-ink-3` "after 20.3% fee" sub-label directly beneath it, matching the rule in `project-scope.md` that gross revenue is never shown to an organizer without the fee already netted out.

### CheckoutFunnelChart

File: components/dashboard/CheckoutFunnelChart.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Bars             | `bg-brand-soft border border-brand-line` for the first two stages, `bg-brand` (solid) for the final "Paid" stage |
| Bar shape        | `rounded-t-lg`, no bottom radius — bars sit on a shared baseline                                            |
| Labels           | `text-[10.5px] font-bold text-ink-3` under each bar, includes the raw count alongside the stage name        |
| Spacing          | `flex items-end gap-2.5 h-24`                                                                              |

**Pattern notes:**
Bar height is proportional to `count / firstStageCount`, not independently scaled per bar — so the visual drop-off between stages is honest at a glance. Data source is the PostHog server-side query described in `library-docs.md`; this component never calls PostHog's client SDK directly.

### DoorStaffPanel

File: components/door-staff/DoorStaffPanel.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Row — active     | `bg-surface border border-border rounded-lg px-3 py-2.5`, icon chip `bg-brand-soft text-brand rounded-lg`  |
| Row — revoked    | Same shell at `opacity-55`, icon chip swaps to `bg-sunken text-ink-3`                                       |
| Action buttons   | Copy link `border border-line-2` neutral; Revoke `text-live border-border` (danger text, neutral border — never a solid red button) |
| Spacing          | `gap-2.5` row list, `p-4` note banner beneath the list                                                     |

**Pattern notes:**
Revoked gates stay in the list permanently (with their historical scan count) rather than being removed — matching the "nothing disappears silently" rule from the UI review. "Revoke" never opens a confirmation modal; it's reversible in one tap ("Re-enable"), so a modal would just be friction without adding real safety.

### GateLinkModal

File: components/door-staff/GateLinkModal.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Shell            | `bg-surface rounded-2xl border border-border shadow-lg`, centered overlay                                  |
| Link field       | `bg-surface-2 border border-border rounded-lg`, truncated token shown as `…` — never the full plaintext token after the first render |
| QR block         | `bg-white rounded-lg p-2`, same QR rendering path as `TicketCard`'s QR, reused rather than reimplemented    |

**Pattern notes:**
This modal is the **only** place in the entire app the plaintext door-staff token is ever displayed — it does not persist in any parent component's state beyond this modal's lifetime, and closing it discards it from memory. If an organizer needs the link again later, the correct action is generating a new gate (and revoking the old one), never trying to redisplay this modal for an existing row.

### ScanResultScreen

File: components/checkin/ScanResultScreen.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-ok-soft` (valid), `bg-live-soft` (already used), `bg-sunken` (invalid / no connection)                |
| Orb              | `h-21 w-21 rounded-full` solid `bg-ok` / `bg-live` / `bg-ink-3`, icon `text-white`, stroke-width raised to `2.6` for legibility at a glance |
| Text — primary   | `text-[22px] font-extrabold` result headline — deliberately larger than any other heading in the app       |
| Text — secondary | `text-[13px] font-bold` supporting line (attendee name + tier, or "scanned 6 minutes ago at Gate A")        |
| Buttons          | Single full-width `Scan next` button, always `bg-brand text-brand-ink`, regardless of the result color above it |

**Pattern notes:**
Headline font size (`22px`) and orb size (`84px`) are intentionally the largest text/icon treatment anywhere in the product — this screen is read by door staff at arm's length in poor lighting, under time pressure, so it trades the app's usual restraint for maximum at-a-glance legibility. The four result variants (valid / already-used / invalid / no-connection) are one component with a `variant` prop, not four separate components, so the layout stays pixel-identical across states and only color/icon/copy change.

### BottomTabBar (mobile)

File: components/layout/BottomTabBar.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                               |
| Border           | `border-t border-border`                                                                                  |
| Icon — inactive  | `text-ink-3`                                                                                               |
| Icon — active    | `text-brand`                                                                                               |
| Spacing          | `flex justify-around py-2.5`                                                                                |

**Pattern notes:**
Four tabs fixed in this order always: Discover, My tickets, Create (center, leads to the onboarding wizard or event creation if already an organizer), Profile. Never reorder or add a fifth tab — if a new top-level destination is needed, it goes in Profile's list instead.

### Navbar (desktop)

File: components/layout/Navbar.tsx
Last updated: 2026-09-20

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                                |
| Border           | `border-b border-border`                                                                                  |
| Text — primary   | `text-[13px] font-semibold text-ink-2`, active link `text-ink`                                             |
| Spacing          | `h-[54px] px-5 flex items-center justify-between gap-4.5`                                                  |
| Accent usage     | `bg-brand text-brand-ink` on the single "Create event" CTA only                                            |

**Pattern notes:**
Logged-out state shows "Log in" (neutral button) beside the same "Create event" CTA — clicking Create while logged out routes through auth first, then resumes into the wizard, rather than the button being hidden or disabled pre-login.

---

## Shared Primitives (used across multiple components above)

### Dropzone

File: components/ui/Dropzone.tsx
Last updated: 2026-09-20

`border-[1.5px] border-dashed border-line-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-ink-3 text-center`. Used identically for organizer logo upload, event cover upload, and ticket tier card image upload — only the icon and helper copy change per usage. Never re-styled per feature.

### Pill

File: components/ui/Pill.tsx
Last updated: 2026-09-20

`rounded-full px-2.5 py-1 text-[10px] font-extrabold`. Background/text color passed as props from a fixed set of tokens (`brand`, `ok`, `live`, `sunken`) — never an arbitrary hex passed inline. Backs the ticket "VALID" pill, the dashboard "PUBLISHED"/"LIVE" pills, and the door-staff active/revoked indicators.

### Field

File: components/ui/Field.tsx
Last updated: 2026-09-20

`h-10 rounded-lg border border-border bg-surface-2 px-3 text-[13px]`, placeholder `text-ink-3`, filled `text-ink font-medium`. Every text input in the app — checkout forms, onboarding steps, search — renders through this one primitive so focus rings, error states, and disabled states only need fixing in one file.
