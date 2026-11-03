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

### DiscoverPage

File: components/discover/DiscoverPageClient.tsx (server data bootstrap: app/page.tsx)
Last updated: 2026-11-03

| Property           | Class                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Page shell         | `flex min-h-screen flex-col bg-background text-ink`                                                        |
| Content shell      | `mx-auto w-full max-w-[1240px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12`                           |
| Page title         | `text-[22px] font-extrabold tracking-tight text-ink md:text-[24px]`                                        |
| Search and filters | `DiscoverSearchBar` with horizontal `CategoryChips` on mobile and desktop                                 |
| Results grid       | `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`                                                     |
| Loading/error      | Centered muted status text; retry action uses `border-line-2 bg-surface`                                  |
| Empty state        | Existing `EmptyState` pattern with city-aware reset                                                       |

**Pattern notes:**
The page uses a welcoming responsive heading, a location-aware search field, and the same horizontal category chips at every breakpoint. Mobile keeps the fixed bottom tab bar. Event cards, results, retry, and empty states remain token-based. Event feed data is fetched server-first and refreshed through React Query.

### LoginPage

File: app/login/LoginForm.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------|
| Shell            | `min-h-screen items-center bg-background px-4 py-8 sm:px-6`                                              |
| Layout           | `max-w-[1080px] md:grid-cols-[minmax(0,1fr)_440px]`                                                      |
| Card             | `rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7`                                       |
| Heading          | `text-[23px] font-extrabold tracking-tight text-ink`                                                     |
| Input state      | `border border-border bg-surface-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-brand-line`        |
| Primary action   | `bg-brand px-4 py-3 text-brand-ink`                                                                     |
| Supporting note  | `bg-brand-soft px-3 py-2 text-ink-2`                                                                    |

**Pattern notes:**
Desktop pairs the email/Google auth card with an editorial introduction; mobile keeps the auth card full width with a compact brand mark. The single-account organizer messaging and all existing authentication behavior remain in the form.

### ProfilePage

File: app/profile/page.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| Background       | Page `bg-background`; account and settings panels `bg-surface`                            |
| Border           | `border border-border`; row separators `border-b border-border`                           |
| Border radius    | Panels `rounded-2xl`; icon containers `rounded-lg` / `rounded-full`                        |
| Text — primary   | `text-[24px] font-extrabold tracking-tight text-ink`                                      |
| Text — secondary | `text-[12px] font-medium text-ink-2`; captions `text-[10px] font-medium text-ink-3`       |
| Spacing          | Main content `px-4 py-6 pb-24`; panels `p-5`; rows `py-4`                                  |
| Hover state      | Settings rows `hover:text-brand`; organizer action `hover:bg-surface-2`                   |
| Accent usage     | Account type and avatar use `bg-brand-soft text-brand`; logout uses `text-live`           |
| Appearance       | `ProfileThemeToggle` uses a token-colored `role="switch"` control and Sun/Moon icons; selection persists in browser storage |

**Pattern notes:**
The account surface reads only the signed-in user's profile. The settings list links to existing ticket and organizer routes and exposes the working sign-out action; it does not invent edit, interests, or security settings that the app does not support. Attendees get the organizer onboarding action; existing organizers get a dashboard action. Account data remains server-loaded and errors are surfaced.
The appearance switch controls app-wide light/dark tokens. Light is the default when no browser preference exists, and the saved preference is applied before first paint.

### EventCard

File: components/discover/EventCard.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface` card shell; category gradient behind the cover image                                       |
| Border           | `border border-border`                                                                                  |
| Border radius    | `rounded-2xl` outer card, `rounded-full` on the status badge                                            |
| Text — primary   | `text-[16px] font-extrabold leading-5 text-ink` title                                                   |
| Text — secondary | `text-[11px] font-semibold text-ink-3` date/location; price uses `text-[12px] font-extrabold text-ink` |
| Spacing          | Cover `h-40 w-full sm:h-44`, body `p-4`                                                                 |
| Hover state      | `hover:border-line-2`; title transitions to `text-brand`                                                |
| Shadow           | `shadow-sm`                                                                                            |
| Accent usage     | Date/countdown and event action use `text-brand`; status uses shared `StatusBadge`                      |

**Pattern notes:**
Cover uses a category-keyed `bg-gradient-to-br` tile beneath the optional event image, never a gray placeholder. Exactly one `StatusBadge` renders top-left on the cover. The footer shows the lowest available tier price and links to `/e/[event_id]`.

### EventDetail

File: components/events/EventDetail.tsx
Last updated: 2026-10-17

| Property         | Class                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------|
| Page shell       | `flex min-h-screen flex-col bg-background`                                                              |
| Main panel       | `overflow-hidden rounded-2xl border border-border bg-surface`                                           |
| Cover            | Category-keyed gradient with the optional cover image                                                   |
| Heading          | `text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-ink`                                  |
| Supporting text  | `text-[12.5px] font-semibold leading-5 text-ink-2`; metadata uses `text-ink-3`                          |
| Ticket panel     | `rounded-xl border border-border bg-surface-2 p-4`; rows use the `TicketTierSelector` pattern           |
| Spacing          | Main content `gap-7 p-4 md:p-7`; sections separated with `border-t border-border`                       |
| Primary action   | `bg-brand text-brand-ink`; enabled after selecting an available tier                                     |
| Shadow           | `none`                                                                                                   |

**Pattern notes:**
The detail route shares the event card's category gradient, status badge, and token-based surface/border system. Ticket tiers are selectable through `TicketTierSelector`; its CTA passes the selected tier into Checkout. Sold-out and ended events remain unavailable.

### TicketTierSelector

File: components/events/TicketTierSelector.tsx
Last updated: 2026-10-17

| Property         | Class                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------|
| Background       | `bg-surface` unselected, `bg-brand-soft` selected                                                  |
| Border           | `border border-border` unselected, `border-brand` selected                                         |
| Border radius    | `rounded-lg`                                                                                        |
| Text — primary   | `text-[12px] font-bold text-ink` tier name; `text-[12px] font-extrabold text-ink` price            |
| Text — secondary | `text-[10.5px] font-semibold text-ink-3` availability                                               |
| Spacing          | `px-3 py-3`; rows `space-y-2.5`; CTA `mt-4 h-11`                                                    |
| Hover state      | `hover:border-line-2` on available, unselected tiers                                               |
| Shadow           | `none`                                                                                             |
| Accent usage     | Selected row uses `bg-brand-soft border-brand`; sold-out state stays neutral                       |

**Pattern notes:**
Rows use an accessible radio-group interaction and the CTA stays unavailable until a tier is selected. The checkout URL carries the tier ID and initial quantity so the selection survives navigation and sign-in.

### CheckoutForm

File: components/checkout/CheckoutForm.tsx
Last updated: 2026-10-17

| Property         | Class                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------|
| Background       | `bg-surface` panels; `bg-sunken` missing-selection notice                                            |
| Border           | `border border-border`; section dividers use `border-t border-border`                                |
| Border radius    | `rounded-2xl` panels, `rounded-xl` notice, `rounded-md` quantity controls                            |
| Text — primary   | `text-ink`; page heading `text-[22px] font-extrabold`; total `text-[15px] font-extrabold`            |
| Text — secondary | `text-ink-2` event detail; `text-ink-3` labels and availability                                      |
| Spacing          | Grid `gap-5`; panels `p-4 md:p-6`; tier section `mt-6`; summary `p-4 md:p-5`                           |
| Hover state      | Primary action `hover:opacity-95`; quantity controls disabled at their limits                        |
| Shadow           | `none`                                                                                              |
| Accent usage     | Primary action uses `bg-brand text-brand-ink`; low inventory uses `text-warn`                        |

**Pattern notes:**
The checkout summary is derived from the selected tier’s integer-kobo price and current quantity. Quantity is limited to available inventory and the shared `MAX_TICKETS_PER_ORDER` constant. The server-provided timestamp determines whether the event has ended.

### CheckoutStatus

File: components/checkout/CheckoutStatus.tsx
Last updated: 2026-10-17

| Property         | Class                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Background       | `bg-surface`; state icon uses `text-brand`, `text-ok`, or neutral `text-ink-3`                           |
| Border           | `border border-border`; no state-specific border color                                                 |
| Border radius    | `rounded-2xl`                                                                                          |
| Text — primary   | `text-[22px] font-extrabold text-ink`                                                                   |
| Text — secondary | `text-[13px] font-medium leading-6 text-ink-2`; reference and error notices use `text-ink-3` / `text-ink-2` |
| Spacing          | `mx-auto max-w-[560px] p-6 sm:p-8`; status updates poll every 2.5 seconds                               |
| Shadow           | `none`                                                                                                 |
| Accent usage     | State is communicated by the icon and copy; only tickets confirmed by the server advance to the wallet |

**Pattern notes:**
The browser return is never treated as proof of payment. This screen polls the owner-scoped server status endpoint and only navigates to My Tickets after the reservation and paid order are confirmed in the database. The hold countdown starts from a server-provided timestamp.

### MyTicketsPage

File: app/my-tickets/page.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Page shell       | `flex min-h-screen flex-col bg-background`                                                              |
| Content shell    | `mx-auto w-full max-w-[1000px] flex-1 px-4 py-5 pb-24 sm:px-6 md:py-8 md:pb-12`                         |
| Card layout      | `grid gap-4 lg:grid-cols-2`                                                                            |
| Empty state      | `min-h-[420px]` centered `rounded-2xl border border-border bg-surface` panel with `bg-sunken` icon orb |
| Primary action   | `bg-brand text-brand-ink`; "Find an event" returns to Discover                                         |
| Navigation       | Desktop navbar uses `/my-tickets`; mobile bottom tab selects `tickets`                                 |

**Pattern notes:**
Ticket, order, and tier reads are scoped to the signed-in owner. Event display details come from an owner-checked RPC that returns only safe fields, never the private online join URL. Missing related event/tier data is surfaced as an error instead of silently hiding an issued ticket.
The empty wallet uses a centered encouragement panel with one clear discovery action; issued and past-ticket sections retain their separate groupings.

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

### DiscoverSearchBar

File: components/discover/DiscoverSearchBar.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface-2`                                                                                            |
| Border           | `border border-border`                                                                                   |
| Border radius    | `rounded-xl` mobile search, `rounded-lg` desktop input and city selector                                  |
| Text — primary   | `text-[13px] font-medium text-ink`; placeholder `text-ink-3`                                             |
| Spacing          | Mobile city row plus `h-10 px-3 gap-2` search field; desktop controls in one row                          |
| Hover state      | City selector `hover:text-ink` / `hover:border-line-2`                                                   |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Search remains neutral; location pin uses `text-brand`                                                   |

**Pattern notes:**
Mobile presents the city picker above a full-width search field. Desktop places the search and separate city picker side by side. Both retain manual city selection and outside-click dismissal.

### CategoryChips

File: components/discover/CategoryChips.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | Chip off-state `bg-surface`; chip on-state `bg-brand-soft`                                                |
| Border           | Chip off-state `border border-border`; chip on-state `border-brand-line`                                  |
| Border radius    | `rounded-full`                                                                                            |
| Text — primary   | Chip off `text-ink-2 font-bold text-xs`; chip on `text-brand`                                             |
| Spacing          | `px-3.5 py-1.5`; row `flex gap-2 overflow-x-auto py-1`                                                    |
| Hover state       | `hover:border-line-2` on off-state chips                                                                  |
| Shadow           | `none`                                                                                                     |
| Accent usage     | Active state uses the soft brand background and brand text                                                |

**Pattern notes:**
The same horizontally scrollable category chip row appears directly below search on mobile and desktop. "All" is always first. The legacy `CategorySidebar` remains available but is not used by the live Discover page.

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
The checkout countdown re-derives from the server-provided `expires_at` on every tick. Online join access follows the same server-timestamp basis with `starts_at - 30 minutes`, while keeping the route-specific refresh behavior in `OnlineJoinAccess`.

### TicketCard (wallet card and shared 3D face)

Files: `components/tickets/TicketCard.tsx`, `components/tickets/TicketCardFace.tsx`, `components/tickets/TicketCardObject.tsx`
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | Organizer-selected token/custom color rendered on the 3D mesh with optional face artwork; QR surface `bg-ticket-white` |
| Border           | Face `border border-ticket-white/25`; selected order uses `ring-2 ring-brand-line`                         |
| Border radius    | Solid mesh has rounded corners; torn mesh has actual notches; 2D fallback uses `.ticket-card-face--torn` |
| Text — primary   | `text-[18px] font-extrabold leading-6`; organizer selects `text-ticket-black` or `text-ticket-white`       |
| Text — secondary | `text-[10px] font-semibold`; uses selected black/white face color with reduced opacity                      |
| Spacing          | Face `p-4`; QR DOM fallback `h-[92px] w-[92px] sm:h-[104px] sm:w-[104px]`                                  |
| Hover state      | Pointer movement, touch drag, or focused arrow keys rotate the R3F mesh; Home resets it                    |
| Shadow           | Ticket stage uses a token-derived drop shadow; this is the one component allowed elevated depth             |
| Accent usage     | `meshPhysicalMaterial` normal/metallic finish; QR is a mesh texture over opaque white and an accessible DOM fallback |

**Pattern notes:**
Issued tickets use an actual React Three Fiber extruded mesh, organizer-selected color, optional artwork, solid or notched geometry, normal or metallic physical material, and black or white text. The DOM text rotates in sync with the mesh so it remains accessible. The signed QR is a front-face texture with an opaque white backing; its accessible DOM image remains visible until WebGL and the QR texture are ready, and is the WebGL-unavailable fallback. Canvas is client-only, demand-rendered, and mounted only near the viewport. Used and void tickets render through the separate flattened `UsedTicketRow` treatment and never show a QR. Issued online tickets include a ticket-specific "Join online event" link; the development-only mock preview remains separate.

### UsedTicketRow

File: components/tickets/UsedTicketRow.tsx
Last updated: 2026-10-17

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
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-sunken` full-bleed panel; icon orb `bg-surface` (locked/unavailable) / `bg-ok-soft` (unlocked)          |
| Border           | `none`                                                                                                     |
| Border radius    | `none` (fills its container)                                                                                |
| Text — primary   | `text-[16.5px] font-extrabold` heading, countdown `text-[30px] font-extrabold tabular-nums`                |
| Text — secondary | `text-[12.5px] font-medium text-ink-2 max-w-[280px] text-center`                                           |
| Spacing          | `flex flex-col items-center justify-center gap-2 p-6`                                                      |
| Hover state      | Actual join link uses `hover:opacity-95`                                                                   |
| Shadow           | `none`                                                                                                    |
| Accent usage     | `bg-surface text-ink-3` locked/unavailable icon orb; `bg-ok-soft text-ok` success state once unlocked        |

**Pattern notes:**
This component has locked, unlocked, and unavailable states and follows the established 30px tabular countdown scale. The development-only preview route uses mock state and never includes an organizer URL. The live URL appears only as an external anchor after the server RPC validates ticket ownership, paid order, issued status, and the unlock time.

### OnlineJoinAccess

File: components/events/OnlineJoinAccess.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | Delegates to `OnlineJoinLock` (`bg-sunken`)                                                               |
| Border           | `none`                                                                                                    |
| Border radius    | `none`                                                                                                    |
| Text — primary   | Delegates to `OnlineJoinLock` (`text-[16.5px] font-extrabold`)                                            |
| Text — secondary | Delegates to `OnlineJoinLock` (`text-[12.5px] font-medium text-ink-2`)                                    |
| Spacing          | Delegates to `OnlineJoinLock` (`p-6`, `gap-2`)                                                            |
| Hover state      | `none`                                                                                                    |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Delegates to the locked, unavailable, and unlocked icon-orb states                                       |

**Pattern notes:**
This component adds no independent visual treatment. It derives the countdown from the RPC's database timestamps and refreshes access after the threshold; the join URL is passed through only when the RPC says access is unlocked.

### EventDetailsStep — private online URL field

File: components/onboarding/EventDetailsStep.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface-2`                                                                                            |
| Border           | `border border-border`                                                                                    |
| Border radius    | `rounded-lg`                                                                                              |
| Text — primary   | `text-[12px] font-medium text-ink`                                                                        |
| Text — secondary | `text-[10px] font-medium leading-4 text-ink-3`                                                            |
| Spacing          | `h-10 px-3`; helper copy sits one spacing step below the field                                            |
| Hover state      | `none`                                                                                                    |
| Shadow           | `none`                                                                                                    |
| Accent usage     | Focus ring uses `focus:ring-2 focus:ring-brand-line`                                                     |

**Pattern notes:**
The URL is a separate optional HTTPS field for drafts; publishing requires it for online events. Keep the platform/venue field unchanged and load the draft URL only through the organizer-scoped RPC.

### WizardShell

File: components/onboarding/WizardShell.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                                                   |
| Border           | `border border-border`                                                                                                         |
| Border radius    | `rounded-2xl`                                                                                                                  |
| Progress track   | `h-1 rounded-full bg-brand-soft` outer, `bg-brand rounded-full` fill, width set by `(step / 5) * 100%`                           |
| Step indicators  | `h-8 w-8 rounded-full`; completed/current `bg-brand text-brand-ink`, pending `bg-sunken text-ink-3`                             |
| Spacing          | Desktop two-column shell; stepper `p-4 md:p-5`; content panel `p-4 sm:p-5 md:p-6`                                               |
| Accent usage     | Progress and active/completed step indicators use brand tokens; the step body stays surface-based                               |

**Pattern notes:**
`WizardShell` uses a vertical step list beside the current form on desktop and a compact horizontal step row on mobile. It links only to the current or previously reached steps; future steps remain non-interactive until the server confirms progress. Repeat-event flows reuse the same shell but skip profile/payout links and retain the selected draft ID in event-step navigation. Form navigation belongs to each step's `WizardStepFooter`, preventing users from bypassing required saves.

### WizardStepFooter

File: components/onboarding/WizardStepFooter.tsx
Last updated: 2026-10-16

| Property         | Class                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| Background       | Primary action `bg-brand`; secondary action `bg-surface`                                                |
| Border           | Secondary action `border border-line-2`; separator `border-t border-border`                            |
| Border radius    | `rounded-md`                                                                                            |
| Text — primary   | `text-[12px] font-bold text-brand-ink`                                                                  |
| Text — secondary | `text-[12px] font-bold text-ink`                                                                        |
| Spacing          | `mt-6 flex min-h-11 justify-between gap-3 pt-4`; buttons `h-10 px-4` or `px-5`                            |
| Hover state      | Primary `hover:opacity-90`; secondary `hover:bg-surface-2`                                               |
| Shadow           | `none`                                                                                                  |
| Accent usage     | The submit button is the single high-contrast action in each step                                        |

**Pattern notes:**
The footer renders within the step form so its primary button submits that form. It shows a real pending label and disables the action while saving; the back link is omitted on the first step.

### OnboardingStepForms

Files: `components/onboarding/ProfileStep.tsx`, `PayoutStep.tsx`, `EventDetailsStep.tsx`
Last updated: 2026-10-16

| Property         | Class                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------|
| Background       | Step bodies inherit the shared `bg-surface` wizard panel                                                                      |
| Border           | Inputs use `border border-border`; upload targets use `border-dashed border-line-2`                                          |
| Border radius    | Inputs `rounded-lg`; organizer logo dropzone `rounded-xl`                                                                      |
| Text — primary   | `text-ink`                                                                                                                    |
| Text — secondary | `text-ink-2`; placeholders and field labels use `text-ink-3`                                                                  |
| Spacing          | Heading `text-[20px] font-extrabold`; fields `gap-2`; step introduction `mt-1 text-[12.5px] leading-5`                        |
| Focus state      | `focus:outline-none focus:ring-2 focus:ring-brand-line` on editable text controls                                             |
| Accent usage     | `border-brand-line bg-brand-soft text-brand` for the selected event format; neutral `bg-sunken` notices explain preview-only behavior |

**Pattern notes:**
Profile, payout, and event forms are persisted through authenticated Server Actions. Organizer logo and event cover files use the shared staged-upload endpoint. Payout bank and account fields are transient and BVN is never requested; only Paystack's returned subaccount code is retained. Each form shows a human-readable error and disables submission while saving. Repeat events reuse organizer/payout setup and start with a separate event draft.

### ReviewPublishStep

File: `components/onboarding/ReviewPublishStep.tsx`
Last updated: 2026-10-16

| Property         | Class                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------|
| Background       | Event preview `bg-surface`; ticket preview uses `bg-gradient-to-br from-tier-b-1 to-tier-b-2`                   |
| Border           | Event preview `border border-border`; tier rows `border border-border`                                         |
| Border radius    | `rounded-2xl` preview cards; `rounded-lg` tier rows                                                             |
| Text — primary   | `text-ink`                                                                                                       |
| Text — secondary | `text-ink-3`                                                                                                     |
| Spacing          | Preview grid `gap-5`; cards `p-3` or `p-3.5`                                                                    |
| Shadow           | `shadow-lg` on the colored ticket-card preview                                                                  |
| Accent usage     | `from-tier-a-1 to-tier-a-2` event banner; `from-tier-b-1 to-tier-b-2` sample ticket card                       |

**Pattern notes:**
The event and ticket rows render the organizer's saved draft. The QR icon remains decorative and explicitly labeled `PREVIEW`; it is not a ticket code. Publishing is submitted from this form and validated atomically on the server. Published-event confirmation offers a direct path to create another event.

### OnboardingPage

File: `components/onboarding/OnboardingPage.tsx`
Last updated: 2026-10-16

| Property         | Class                                      |
| ---------------- | -------------------------------------------|
| Background       | `bg-background`                             |
| Border           | Inherited from the shared wizard panel      |
| Border radius    | Inherited from the shared wizard panel      |
| Spacing          | Main content `pb-20 md:pb-10`               |
| Accent usage     | Uses the shared `Navbar` and `BottomTabBar` |

**Pattern notes:**
All five onboarding routes use the same server-loaded page composition. The page authenticates the user, loads the organizer profile and either the selected event draft or the published-event confirmation, and redirects away from inaccessible future steps. Completed organizers can start a fresh event at event details; dashboard draft actions resume by explicit event ID. The existing app navigation remains in place.

### TierDesignerStep

File: components/onboarding/TierDesignerStep.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                                              |
| ---------------- | -----------------------------------------------------------------------------------------------------------------------------------|
| Swatch           | `h-7 w-7 rounded-full` filled with a token gradient; `ring-2 ring-ink ring-offset-2 ring-offset-surface` when selected             |
| Custom swatch    | Native color picker over `border border-dashed border-line-2`; selected custom hex uses an inline background value                |
| Image target     | `border-dashed border-line-2 rounded-2xl bg-surface`                                                                                |
| Card options     | Shape `3D card` / `Torn ticket`; finish `Normal` / `Metallic`; face text `Black` / `White`                                          |
| Live preview     | Shared `TicketCardFace`; reflects color, image, shape, finish, and text color with a decorative QR placeholder                      |
| Accent usage     | Preset colors use tier, warn, and live tokens; custom organizer color uses a validated six-digit hex value                          |

**Pattern notes:**
This step persists up to 20 ticket tiers through an ownership-checked RPC. Styling is saved per tier with safe defaults for older callers and existing events. Optional images are staged, optimized server-side, and attached to the saved tier. The live card remains a sample preview, not an issued ticket.

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
Bar height is proportional to `count / firstStageCount`, not independently scaled per bar — so the visual drop-off between stages is honest at a glance. Data source is the PostHog server-side query described in `library-docs.md`; this component never calls PostHog's client SDK directly. The paid checkout stage counts only successful paid-reservation API responses, not failed attempts or free-ticket orders.

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
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                               |
| Border           | `border-t border-border`                                                                                  |
| Border radius    | Active tab `rounded-xl`                                                                                    |
| Icon — inactive  | `text-ink-3`                                                                                               |
| Icon — active    | `bg-brand-soft text-brand`                                                                                 |
| Spacing          | `flex items-center justify-around px-4 py-2.5`; tab hit target `h-9 w-12`                                  |

**Pattern notes:**
Four tabs fixed in this order always: Discover, My tickets, Create (center, leads to the onboarding wizard or event creation if already an organizer), Profile. Never reorder or add a fifth tab — if a new top-level destination is needed, it goes in Profile's list instead.

### Navbar (desktop)

File: components/layout/Navbar.tsx
Last updated: 2026-11-03

| Property         | Class                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------|
| Background       | `bg-surface`                                                                                                |
| Border           | `border-b border-border`                                                                                  |
| Text — primary   | `text-[13px] font-semibold text-ink-2`, active link `text-brand`                                           |
| Spacing          | `h-[54px] px-5 flex items-center justify-between gap-5`                                                    |
| Auth control     | Profile avatar `h-9 w-9 rounded-full`; sign-out icon uses the same neutral hover surface                   |
| Accent usage     | `bg-brand text-brand-ink` on the single "Create event" CTA; logo mark uses the brand token                 |

**Pattern notes:**
The control follows Supabase's live auth state: logged-out users see "Log in," while signed-in users get a profile avatar link and a separate "Log out" action that calls `supabase.auth.signOut()`. A brief status placeholder is shown while the browser session is restored. The "Create event" CTA remains the single high-contrast action.

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

### DashboardStatCards

File: components/dashboard/DashboardStatCards.tsx
Last updated: 2026-10-17

| Property         | Class                                                          |
| ---------------- | -------------------------------------------------------------- |
| Background       | `bg-surface-2`                                                 |
| Border           | `border border-border`                                         |
| Border radius    | `rounded-2xl`                                                   |
| Text — primary   | `text-[23px] font-extrabold tracking-tight text-ink`            |
| Text — secondary | `text-[11px] font-bold text-ink-3`; detail `text-[10.5px]`     |
| Spacing          | `p-3.5`; `grid-cols-2 gap-3 lg:grid-cols-4`                    |
| Hover state      | None                                                            |
| Shadow           | None                                                            |
| Accent usage     | Net earnings detail explicitly says “After 20.3% fee”          |

**Pattern notes:**
Stat cards use the established dashboard token scale and show organizer earnings only as net after commission. Phase 5 currently supplies sample values; live reads are not wired yet.

### DashboardFunnelPreview / DashboardFunnel

Files: `components/dashboard/DashboardFunnelPreview.tsx`, `components/dashboard/DashboardFunnel.tsx`
Last updated: 2026-11-03

| Property         | Class                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Background       | `bg-surface`; bars use `bg-brand-soft` / `bg-brand`                                       |
| Border           | `border border-border`; early bars use `border-brand-line`                               |
| Border radius    | `rounded-2xl`; bars `rounded-t-lg`                                                       |
| Text — primary   | `text-[16px] font-extrabold text-ink`; counts `text-[11px] font-extrabold tabular-nums`  |
| Text — secondary | `text-[11px] font-semibold text-ink-3`; labels `text-[10px] font-bold text-ink-3`        |
| Spacing          | Panel `p-4 md:p-6`; chart `mt-6`; bars `gap-2.5`                                        |
| Hover state      | None                                                                                    |
| Shadow           | None                                                                                    |
| Accent usage     | Final paid stage is solid `bg-brand`; earlier stages are `bg-brand-soft`                |

**Pattern notes:**
Mock stage bar heights follow the displayed sample counts proportionally. The live funnel preserves this visual pattern and uses server-side, organizer-scoped PostHog counts. When the query is unavailable, it shows a clear unavailable state rather than preview/sample values.

### DashboardOverviewPreview / EventDashboardPreview / Live Organizer Dashboards

Files: `components/dashboard/DashboardOverviewPreview.tsx`, `components/dashboard/EventDashboardPreview.tsx`, `app/dashboard/page.tsx`, `app/dashboard/[event_id]/page.tsx`
Last updated: 2026-11-03
Last updated: 2026-10-17

| Property         | Class                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Background       | Page `bg-background`; event rows and panels `bg-surface`; stats `bg-surface-2`             |
| Border           | `border border-border`; list separators `divide-y divide-border`                           |
| Border radius    | Panels `rounded-2xl`; status pills `rounded-full`; icon chips `rounded-lg`                 |
| Text — primary   | `text-ink`; page heading `text-[23px–24px] font-extrabold tracking-tight`                  |
| Text — secondary | `text-ink-2`; helper text `text-[10.5px–12px] font-semibold text-ink-3`                    |
| Spacing          | Page `px-4 py-5 pb-24 sm:px-6 md:py-8`; panels `p-4 md:p-6`                                |
| Hover state      | Neutral actions `hover:bg-surface-2`; links `hover:text-brand` / `hover:bg-brand-soft`    |
| Shadow           | None                                                                                       |
| Accent usage     | `bg-brand` primary actions; `bg-ok-soft text-ok-ink` for published state                  |

**Pattern notes:**
Preview screens use clearly labeled sample data and local-only preview actions; live routes use organizer-scoped Supabase metrics and server-side PostHog counts. Earnings are represented as net after the platform fee. Dashboard pages keep the standard navbar and mobile tabs, with no dashboard tab falsely marked active.

### DoorStaffPreview / DoorStaffManager

Files: `components/door-staff/DoorStaffPreview.tsx`, `components/door-staff/DoorStaffManager.tsx`
Last updated: 2026-11-03

| Property         | Class                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------- |
| Background       | Gate rows, modal, and QR canvas `bg-surface`; form control `bg-surface-2`                    |
| Border           | `border border-border`; modal `border border-border`                                       |
| Border radius    | Panel/modal `rounded-2xl`; gate rows `rounded-lg`; link QR `rounded-xl`                     |
| Text — primary   | `text-[13px] font-bold text-ink`; modal heading `text-[18px] font-extrabold`               |
| Text — secondary | `text-[10.5px–12px] font-semibold text-ink-3`                                              |
| Spacing          | Page `px-4 py-5 pb-24`; rows `px-4 py-4`; modal `p-5 sm:p-6`                                |
| Hover state      | Neutral actions `hover:bg-surface-2`; primary action `hover:opacity-95`                    |
| Shadow           | Modal `shadow-lg`                                                                          |
| Accent usage     | Active gate icon `bg-brand-soft text-brand`; active/revoked pills use `bg-ok-soft text-ok-ink` / `bg-sunken text-ink-3`; QR encodes the one-time secure gate link |

**Pattern notes:**
Revoked rows remain visible as historical records. The live manager creates and revokes gates through organizer-authorized actions; its modal displays the plaintext token only once, while the database stores only the token hash. Revoke actions are immediate and are checked again on every scan.

### ScannerPreview / CheckinScanner

Files: `components/checkin/ScannerPreview.tsx`, `components/checkin/CheckinScanner.tsx`
Last updated: 2026-11-03

| Property         | Class                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Background       | Landing `bg-background` with `bg-surface` card; live scan `bg-ink`; camera frame `bg-sunken`; result `bg-ok-soft` / `bg-live-soft` / `bg-sunken` |
| Border           | Landing `border border-border`; live viewfinder `border-background/85`                         |
| Border radius    | Main surfaces `rounded-2xl`; gate detail `rounded-xl`; logo tile `rounded-lg`; status orb `rounded-full` |
| Text — primary   | `text-[22px] font-extrabold text-ink`; gate heading `text-[16px] font-extrabold`              |
| Text — secondary | `text-[12px] font-medium text-ink-2`; captions `text-[10px] font-medium text-ink-3`           |
| Spacing          | Landing card `p-5 sm:p-6`; live camera `min-h-[300px]`; controls `mt-3`                       |
| Hover state      | Preview controls `hover:bg-surface-2`; primary action `hover:opacity-95`                     |
| Shadow           | Landing panel `shadow-sm`                                                                    |
| Accent usage     | Brand mark and gate icon use `bg-brand-soft text-brand`; result orb `bg-ok`, `bg-live`, or `bg-ink-3`; scanner intentionally has no app navigation |

**Pattern notes:**
The landing screen gives staff the event and assigned gate, and labels the check-in count as event-wide because that is the scope returned by the scan-context RPC. The live scanner uses a dark, chromeless camera layout, requests camera access only after staff starts scanning, and submits decoded tokens for online validation. It displays ticket tier but no attendee identity; network failure is a distinct state and never accepts or queues a scan.
