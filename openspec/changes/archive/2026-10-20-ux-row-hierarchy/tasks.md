# Tasks

## 1. Tokens: attention-strong role

- [x] 1.1 Add `attentionStrong` to `packages/tokens/src/tokens.ts` (light `#A8400A`, dark `#FF9A66` under the existing "not contrast-verified" note) and verify the generated CSS contains `--color-attention-strong` in `tokens.test.ts`
- [x] 1.2 Add `attentionStrong` to the AA checks on `surface`, `bg` and `accentBg`, and add a test that its hue is ≥ 15° (not red) while `danger` stays the only red role; verify `pnpm test packages/tokens` passes, including the existing no-green test

## 2. Contract: far-from-market threshold

- [x] 2.1 Export `FAR_FROM_MARKET_BPS = SUGGESTION_CLAMP * 10_000` from `packages/contract/src/price.ts` and verify a `price.test.ts` case asserts it equals 3000 and that `priceHealth` bands are unchanged

## 3. Mock data: venues, tours, shared layout

- [x] 3.1 Before changing the generator, record a fingerprint of the default-seed dataset without `event` and `venue` (id, date, section, row, quantity, price, marketPrice, sync) in `generate.test.ts`, and verify it passes on the current code
- [x] 3.2 Rename the section layout from `VENUE` to a layout export with a layout title (e.g. "Arena layout"), add `VENUES` (about 5 fictional names) and a `TOURS` list parallel to `ARTISTS`, and update `venue.test.ts`; verify the 16-section tests still pass
- [x] 3.3 Assign event *i* the venue `VENUES[i % VENUES.length]` and the name `"<artist> – <tour>"` with no new `rng` calls (design D4), including the injection event; verify the 3.1 fingerprint still matches
- [x] 3.4 Add `generate.test.ts` cases: at least 4 distinct venues, one venue per event, every event matches `"<artist> – <tour>"`, and exactly one event name still contains the injection text; verify `pnpm test packages/mock` and `apps/web/src/ai/prompt.test.ts` pass

## 4. Web: price-gap tiers

- [x] 4.1 Replace the `attention` flag in `gapDisplay` (`apps/web/src/console/price.ts`) with `tier: "muted" | "ink" | "attention" | "strong"`, using `FAR_FROM_MARKET_BPS` with a strict "beyond", and append ", far from market" to the strong label; update every caller and verify `pnpm typecheck` passes
- [x] 4.2 Render the tiers in `PriceGap.tsx` and its CSS module: muted ink, ink, attention semibold, and attention-strong semibold with a doubled ▲▲ / ▼▼ glyph in the same 10 px box. Update `PriceGap.test.tsx` to the spec scenarios (102 → muted, 110 → ink, 125 → attention, exactly 130 → attention, 142 → strong with doubled glyph and "far from market" label, 68 → strong down) and verify it passes

## 5. Web: row columns and hierarchy

- [x] 5.1 Change `formatDate` in `apps/web/src/console/format.ts` to "30 Oct" (en-GB, UTC, no weekday) and keep `formatDateLong` for the tooltip and drawer; add `format.test.ts` asserting "30 Oct" and a full date with the weekday, and verify it passes
- [x] 5.2 Update `columns.ts` to 11 columns (date about 64 px, merged seats about 72 px with sort `section`), the "Sec / Row" header in `Table.tsx`, and `PlaceholderRow` colSpans; verify `pnpm typecheck` passes and the loading state shows no layout shift in the existing e2e run
- [x] 5.3 In `Row.tsx`, render the seats cell as "112 / F" with `aria-label="Section 112, row F"`, the date and seats in muted ink at regular weight, and the price display semibold ink; verify in the browser at both densities
- [x] 5.4 Render the event cell as event plus venue spans with the full "event · venue" `title`: stacked in comfortable, inline with " · " in compact with the venue truncated first, and both spans muted on a repeated event (design D6); verify visually at both densities that comfortable rows stay 40 px and compact rows 28 px
- [x] 5.5 Update `apps/web/e2e/map.spec.ts`, which reads the section from `td:nth-child(4)` text, to read it from the seats cell's accessible name or a `data-section` attribute; verify `pnpm e2e` passes, including the compact "at least 28 rows" check where one exists

## 6. Web: seating map title

- [x] 6.1 Title the map and its `aria-label` in `SeatingMap.tsx` with the shared layout name instead of a venue name; add an e2e assertion in `map.spec.ts` that filtering by a section shows listings from more than one venue, and verify `pnpm e2e` passes

## 7. Mobile: feed, detail and price sheet

- [x] 7.1 Change `formatDate` in `apps/mobile/src/format.ts` to "30 Oct" and add `formatDateLong` ("Friday 30 October"); add `apps/mobile/src/format.test.ts` covering both and verify it passes under `pnpm test`
- [x] 7.2 Lay out the feed row in `screens/Feed.tsx` as the event (strong), the venue (muted), then "30 Oct · 112 / F", with an accessibility label of "<event>, <venue>, section X row Y, <issue>"; verify in Expo Go at 390 pt wide with no horizontal scroll and with VoiceOver reading the label
- [x] 7.3 Use `formatDateLong` on the Listing detail and make the Price sheet's "Now £X" semibold; verify both in Expo Go

## 8. Docs

- [x] 8.1 Update `README.md` line 81 and feedback rows #1 and #2 for the strong tier ("beyond ±30%: darker orange and a doubled glyph, still never red"), add a feedback-log row for the row hierarchy, and note the shared venue layout in one line; verify by reading the README against the running console

## 9. Integration checks

- [x] 9.1 Run `pnpm test`, `pnpm typecheck` and `pnpm e2e`, and verify all pass
- [x] 9.2 Run `openspec validate ux-row-hierarchy --strict` and verify it passes
- [x] 9.3 Walk the console at 1920×1080 in both densities and the mobile feed, and verify against the delta specs: no green or red price cells, red seen only on a rollback, and every strong-tier cell shows the doubled glyph

## Workflow follow-up

- Archive the change with `/opsx:archive` after review, then verify the main specs picked up the five deltas.
