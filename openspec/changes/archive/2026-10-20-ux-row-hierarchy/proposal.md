# Proposal

## Why

Every cell in a listing row has about the same visual weight, so the broker's eye has nowhere to land. The event says only the artist, the venue is hidden in the drawer, section and row take two columns, and the price looks like the quantity. The vs-market gap has one coloured tier, so +17% and +42% look the same. This change gives the row a clear hierarchy on web and mobile without spending the colour budget that keeps problems calm (founder feedback #1).

## What Changes

- **Event and venue together.** Line 1 is the event as "Artist – Tour", in strong weight. The venue sits under it, muted, in comfortable density, and after it on the same line in compact density, where it is truncated first. The mobile feed card always uses two lines.
- **Mock data varies venues.** Events are spread over about 5 fictional venue names that share the one existing section layout, and every event name gets a fictional tour name. The seating map is titled as the shared layout, not as one venue.
- **Price is emphasised.** Semibold, ink, same size as the rest of the row.
- **Short date.** "30 Oct" (day first, no weekday) on web and in the mobile feed. The full date with weekday stays in the tooltip, the drawer and the mobile detail.
- **Section and row in one column.** "112 / F", announced as "Section 112, row F", sorting by section. The mobile feed uses the same notation.
- **Date and seats are lighter.** Muted ink at regular weight.
- **The vs-market gap gets distance-based intensity.** Muted ink at market (within ±5%), ink above or below (to ±15%), attention when overpriced or underpriced (to ±30%), and a new attention-strong role with a doubled direction glyph beyond ±30%. There is still no green, and red stays reserved for rollback.
- **The design-token density rule is relaxed.** Density may now also switch the event cell between two lines and one line.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `inventory-table`: the column set and order (event with venue, short date, merged section / row), price emphasis, muted date and seats, the four-tier price-health display, and the density layouts.
- `design-tokens`: a new `attention-strong` colour role, and density allowed to change the event cell's layout.
- `mock-api`: fixtures with about 5 venue names sharing one section layout, and "Artist – Tour" event names.
- `seating-map`: the map is the shared venue layout, titled as such, and the section filter applies across venues.
- `problems-feed`: feed rows show event, venue, short date and "section / row".

## Impact

- `packages/tokens`: the `attentionStrong` role in light and dark, plus a contrast test.
- `packages/mock`: the venue list and tour names in the generator. The injection-fixture event must still carry its injection text.
- `apps/web`: the table columns, the row cells, the date formatter, the price-gap display, the placeholder rows, the seating-map title, and the e2e tests that read date or section text.
- `apps/mobile`: the feed row layout and the date formatter.
- `README.md`: the colour notes (founder feedback #1 and #2) gain the new tier. "Never red" stays true.
- Contract and API: unchanged. `venue` is already a listing field.
