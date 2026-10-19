# Tasks

## 1. Setup

- [x] 1.1 Add `nuqs`, `zustand` and `@tanstack/react-virtual` to `apps/web`, wrap the app in the nuqs adapter, and add `apps/web` to the root Vitest projects; verify `pnpm install`, `pnpm typecheck` and `pnpm test` pass
- [x] 1.2 Create the Zustand UI store (selection, anchor, editing, drafts, drawerId, focused, density, lastBulk, rollbackFlash) with per-id selectors; verify with a Vitest test that toggling one id changes only that id's selector result

## 2. Table core (A0)

- [x] 2.1 Build the primitives `Button`, `IconButton`, `Chip`, `Toast` and `Dialog` as CSS Modules using only token variables; verify they render on a scratch route in both densities and that grep finds no raw hex colours in `apps/web/src`
- [x] 2.2 Implement `syncLabel(marketplace, entry, quantity, now)` and the `SyncGlyph` shapes (live, pending, stale pending, error, not listed); verify Vitest cases: "StubHub: error. <msg>", "StubHub: listed 4, you have 2", "pending for 4 minutes"
- [x] 2.3 Implement `PriceGap` (glyph + signed % from `priceHealth`, attention colour only for over/underpriced); verify Vitest cases for 131/100 → "+31%" attention and 102/100 → "+2%" ink
- [x] 2.4 Render the native `<table>` with `colgroup`, sticky `thead`, the spacer-row virtualizer (overscan 10), `aria-rowcount`/`aria-rowindex`, the problem edge bar, and placeholder rows for unloaded indexes; load every page in the background (W5); verify in the browser that 500 rows scroll and that a screen reader (VoiceOver) announces "row N of 501"
- [x] 2.5 Replace the checkpoint list on `/` with the console layout (toolbar, chips row, table, right column); verify the page loads with no console errors and CLS 0 in a Lighthouse run

## 3. Filters and sort (A0)

- [x] 3.1 Implement `useFilters()` with nuqs parsers matching `toSearchParams`, `history: "replace"`, invalid values dropped, and a 250 ms debounced `q`; verify Vitest cases: a URL round-trips to the same `ListQueryInput`, `priceMin=abc` is dropped, and fast typing produces one query
- [x] 3.2 Build the controls: search, the 4 × 4 Sync matrix popover (also opened from a marketplace header), date range, price range and "Problems only", plus sortable headers with `aria-sort`; verify in the browser that StubHub × error shows only those rows and that a copied URL reproduces the view in a new tab
- [x] 3.3 Add active filter chips and "Clear all" (keeps sort), and dim the rows while `isPlaceholderData`; verify that removing the "Section 104" chip drops only `section` from the URL

## 4. Inline edit (A0)

- [x] 4.1 Implement the price and quantity edit cells (button → input on Enter/F2/click/digit, value selected, validation messages) with drafts in the store; verify Vitest/RTL cases for "-1" → "Quantity must be 0 or more" and for an unchanged commit sending nothing
- [x] 4.2 Wire the keys: Enter commits and stays, Escape cancels, Tab/Shift+Tab commit and move focus one cell right/left in navigation mode; verify with an RTL test that Tab after typing 3 in quantity sends one PATCH and focuses the same row's price cell
- [x] 4.3 Show saving, rollback (danger flash, static outline under reduced motion), the conflict message "Changed elsewhere to £X" and the toast region with a keyboard-reachable Retry; verify in the browser with `?seed=` set so a known row fails, and with an emulated `prefers-reduced-motion`
- [x] 4.4 Confirm rows keep their position after an edit when sorted by price; verify in the browser, and add the "row stays put" decision to the README

## 5. Live status (A0)

- [x] 5.1 Add `useLiveChanges` to `packages/client` (setTimeout loop from the first page's `changesCursor`, pause on hidden, one catch-up on visible, quiet 429, failure count); verify Vitest cases with fake timers: hidden → 0 polls, visible → 1 catch-up, 429 → no rate-limit banner event, 3 failures → stalled
- [x] 5.2 Mount polling in the console and add the freshness indicator ("Live · 2s ago", "Live · paused 3s", "Updates stalled. Retrying" announced once); verify in the browser that drift appears within ~3 s and that focus and scroll don't move
- [x] 5.3 Verify the editing rule end to end: while a price input is open, an incoming change for that row updates its sync cells but not the input; check with the seeded "edited elsewhere" event or a forced drift

## 6. Keyboard, problems, density, states (A0)

- [x] 6.1 Implement `focusCell(row, col)` (scrollToIndex, then focus once mounted), arrow-key navigation on `<tbody>`, and Tab across the window edge; verify with a Playwright spec that tabbing from the last rendered row focuses the next row
- [x] 6.2 Implement `useProblemOrder()` (loaded listings, `isProblem`, `compareProblems`, 5 s clock), the toolbar count, the "Next problem" button and `n`/`N` (ignored in inputs); verify a Vitest case for the ordering and, in the browser, that `n` reaches a problem 300 rows away
- [x] 6.3 Add the skip link, `/` for search, and the `?` shortcut sheet listing every key; verify each works with the keyboard alone
- [x] 6.4 Add the density toggle (`data-density` on `<html>`, persisted in localStorage); verify that compact shows 28 or more rows on a 1920×1080 window and that only row height, padding and cell text change
- [x] 6.5 Finish the view states: empty with "Clear filters", load error with Retry, and 429 "Waiting 3s…" counting down from `onRateLimit` while the previous rows stay; verify each with `?failRate=`/`?rate429=100` or by forcing the engine
- [x] 6.6 Checkpoint 2 (h4.5): run `pnpm typecheck` and `pnpm test`, and go through the A0 list from the proposal; if anything in A0 is incomplete, record that A3 is cut in the README before continuing

## 7. Bulk actions (A1)

- [x] 7.1 Implement selection: row checkboxes, shift-click ranges, Space / Shift+Space, the header select-all over loaded rows, and the "N selected" bulk bar; verify an RTL case where checking row 10 then shift-clicking row 49 selects 40
- [x] 7.2 Implement `previewBulk(listings, op)` (whole-pound rounding, £1 minimum, gap and band) and add `useBulk` to `packages/client` wrapping `bulk`, `applyBulkResults`, `failedOps` and `buildUndo`; verify Vitest cases for 125 at −10% → 113, a floor at £1, and undo after 34 of 40 containing 34 ops
- [x] 7.3 Build the preview dialog (old, new, gap, health per row; delist shows the current state), confirm → apply, and the result panel ("34 updated, 6 failed" with the failed rows and reasons, failed-row markers in the table); verify in the browser with `?seed=` that the listed failures match `writeFails`
- [x] 7.4 Add "Retry failed" and Undo ("Undo 34 changes", "Relist (may lose position)", Ctrl/Cmd+Z outside inputs), each as a new intent; verify in the browser that retry sends exactly the failed ops with a new Idempotency-Key and that undo restores the old prices
- [x] 7.5 Add the Playwright run at a fixed seed: edit a price → bulk −10% on 40 rows → assert the failed rows equal the `writeFails` prediction → retry failed → undo; verify it passes three times in a row

## 8. Sync drawer (A2, thin)

- [x] 8.1 Add `useHistory(id)` and `useRetrySync()` (optimistic pending, rollback on error) to `packages/client`; verify Vitest cases that retry sets pending and that a failure restores the previous state
- [x] 8.2 Build the drawer `<aside>` (opened by row click or `o`, Escape returns focus through `focusCell`, per-marketplace state and full error, newest-first history with placeholders and Retry, an `ExplainSlot` per errored marketplace); verify the keyboard round trip in the browser, and that the drawer updates live while open

## 9. Seating map (A3, thin)

- [x] 9.1 Render `VENUE` as an SVG in the collapsible right column, highlight the focused or drawer row's section (accent plus outline), and make each section a focusable control named "Section 104, 31 listings" that toggles the `section` filter; verify in the browser that clicking 104 sets `section=104` with a chip and that clicking again clears it

## 10. Demo controls (A3, cut first)

- [x] 10.1 Add `setChaos(partial)` to the engine (read per request, state kept); verify with a Vitest test that raising `failRate` to 100 fails the next write without resetting the listings
- [x] 10.2 Build the `?demo=1`-only lazy panel (chaos on/off, fail-rate slider, "Drift now", labelled as controlling a mock); verify it's absent without the flag and that 50% makes about half of a 40-row bulk fail

## 11. Performance and README

- [x] 11.1 Add the temporary `?rows=pages` (Option X) row mode, record the before numbers (Profiler row commits per poll, a Chrome Performance scroll trace in compact, Lighthouse desktop), switch back to Option Y and record the after numbers; verify that the README has a before/after table against the budget (60 fps, at most N rows per N changes, CLS 0, Lighthouse ≥ 90), then remove the switch
- [x] 11.2 Write the README sections for Track A: a defence of each stack choice (CSS Modules, TanStack Query + Option Y, nuqs, Zustand, TanStack Virtual without Table, native table vs grid, server-side filters, polling vs SSE), the two-line colour trade-off, feedback log entries for #1, #2, #3 and the web half of #4, and the keyboard map; verify every README run command works
- [x] 11.3 Final check: run `pnpm typecheck`, `pnpm test` and the Playwright specs; verify all pass with zero errors

## Workflow follow-up

- Archive `foundation-monorepo-mock` before starting apply, so its specs are the baseline.
- Archive this change once A0–A2 are demoed, then propose `ai-sync-explain`, which fills `ExplainSlot`.
