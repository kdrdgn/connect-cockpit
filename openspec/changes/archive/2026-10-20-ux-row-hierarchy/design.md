# Design

## Context

See proposal.md for the why. Current state that shapes the approach:
- The web row (`apps/web/src/console/Row.tsx`) has 12 columns from `columns.ts`: event, date (104 px, "Fri 30 Oct" via `Intl` en-GB, UTC), section (60 px), row (48 px), quantity, price, gap, and four marketplaces. `PlaceholderRow` uses `colSpan` 2 + 10.
- `PriceGap` gets band, text, direction, an `attention` flag and a label from `gapDisplay` in `apps/web/src/console/price.ts`. That is built on `priceHealth` and `PRICE_BANDS` (±5 / ±15) in `packages/contract`.
- `packages/contract` already has `SUGGESTION_CLAMP = 0.3`, the furthest from market the app will ever suggest a price.
- The mock has one `VENUE` ("Harbour Arena", 16 sections). Every listing's `venue` is `VENUE.name`, events are named after the artist only, and the seating map uses `VENUE.name` as its title.
- Mobile formats dates by hand in `apps/mobile/src/format.ts` ("Fri 30 Oct", device local time) and builds the feed row text in `screens/Feed.tsx`.
- README line 81 and the feedback rows #1 and #2 promise "red means rollback, errors are amber, never red".

Requirements are in the five delta specs. This document covers only how.

## Goals / Non-Goals

**Goals:**
- One threshold source for the far-from-market tier, shared with the suggestion clamp, so "red-orange" means "further than we'd ever suggest".
- Seeded data stays byte-identical apart from `event` and `venue` strings, so existing tests and the README's measured numbers keep their meaning.
- Every new visual distinction is also there without colour (doubled glyph, accessible names).

**Non-Goals:**
- A price or gap in the mobile feed. Mobile picks up layout, date and seat notation only. The Price sheet's "Now £X" becomes semibold.
- Separate maps per venue, or a venue filter.
- Making the problem ranking aware of the far tier. Overpriced stays the problem. The new tier is display only.
- Verifying dark-theme contrast. Dark stays define-only.

## Decisions

### D1. Far-from-market tier is a display tier, threshold from the clamp
`packages/contract` exports `FAR_FROM_MARKET_BPS = SUGGESTION_CLAMP * 10_000` (3000). `gapDisplay` gains `tier: "muted" | "ink" | "attention" | "strong"` in place of the boolean `attention`: at_market → muted, above/below → ink, overpriced/underpriced → attention, and |gap bps| > 3000 → strong. Exactly ±30% stays attention, because "beyond" is strict. The label appends ", far from market" for strong.
- *Alternative:* a sixth contract band. Rejected because bands drive problems and ranking, and this tier must not change either.

### D2. `attentionStrong` token: `#A8400A` light, `#FF9A66` dark (unverified)
Contrast on `surface` is 6.17, on `bg` 5.71 and on `accentBg` (selected row) 5.30. Its hue is about 20°, against about 3° for `danger` (`#B3261E`) and about 34° for `attention`. The tokens test gains two checks: AA on surface and accentBg, and hue ≥ 15° so it can't drift into red. Against `attention` the contrast is 1.01, so the tier is told apart by hue and **shape**: D3 is required, not decorative.
- *Alternative:* reuse `danger`. Rejected because it breaks "red means rollback" (README feedback #1).

### D3. Doubled glyph for the strong tier
`PriceGap` draws two stacked or side-by-side triangles in the same 10 px glyph box (▲▲ / ▼▼) for `strong`. The figure keeps its position, so the column stays 76 px and the numbers stay aligned.

### D4. Venues and tours assigned by index, not by RNG
`packages/mock` gets `VENUES` (about 5 fictional names, including "Harbour Arena") and a `TOURS` list parallel to `ARTISTS`. Event *i* gets `VENUES[i % VENUES.length]` and `"<artist> – <TOURS[i]>"`. No new `rng` calls are made, so every price, state, section, row and date for a seed is unchanged. The injection event gets a tour suffix too and still contains the injection text. The section layout object is renamed from venue to layout (title such as "Arena layout"). The map title and its `aria-label` use the layout name.
- *Alternative:* `rng.pick` venues. Rejected because it shifts every later draw and changes the whole dataset.

### D5. Columns: 12 → 11
`columns.ts` becomes select, event, date (76 px, the narrowest that fits "30 Oct" at comfortable text size), seats (88 px, so the "Sec / Row" header fits; sort `section`), quantity, price, gap, then the marketplaces. `PlaceholderRow` and `COLUMN_COUNT` follow. The seats cell renders `112 / F` (hidden from assistive tech) plus screen-reader-only text "Section 112, row F", and carries `data-seats` for tests (`data-section` is taken by the map polygons). The header reads "Sec / Row".

### D6. Event cell layout by density
The event cell holds two spans: event (semibold, ink, matching the price so nothing in the row outweighs it) and venue (muted, `xs` text). In comfortable they stack (20 + 16 = 36 px inside the 40 px row). In compact, a `data-density` selector makes them one flex line with a " · " separator, the event `flex-shrink: 0` up to the cell width, and the venue `min-width: 0` with an ellipsis, so the venue is cut first. The existing `.repeat` class mutes both spans. The full "event · venue" text goes in the cell's `title`.

### D7. Dates
Web `formatDate` drops `weekday` ("30 Oct"). `formatDateLong` already gives the weekday and is used for the tooltip and the drawer. Mobile `formatDate` becomes `"<d> <Mon>"`, and a new `formatDateLong` ("Friday 30 October") is used on the Listing detail.

### D8. Row text weights
Price display gets `font-weight: semibold` and ink. The date and seats cells use `--color-ink-muted` at regular weight. Quantity is unchanged.

### D9. README
Line 81 and feedback rows #1 and #2 keep "never red" and gain the strong tier: "beyond ±30%, a darker orange and a doubled glyph". A feedback-log row notes the row-hierarchy change and its reasons.

## Risks / Trade-offs

- [The longer "Artist – Tour" names change event sort order and `q` search results] → Re-check e2e and unit tests that search or sort by event name, and update fixtures that hard-code "Glass Harbour" and similar names.
- [Five venues share identical section numbering, which a ticketing reviewer may notice] → The map is titled as a shared layout, and the README says so in one line.
- [Attention and attention-strong differ only slightly in hue] → The doubled glyph and the accessible label carry the tier. The hue test keeps it from drifting toward red.
- [The event cell is the only cell that changes layout by density, a precedent for more] → The design-tokens spec limits it to a "secondary line, stacked or inline". Anything more needs a spec change.
- [Mobile dates use device local time and web uses UTC, so dates can differ near midnight] → Pre-existing, unchanged here. Noted, not fixed.

## Migration Plan

None. The mock state regenerates on reload, and no API or contract shape changes.
