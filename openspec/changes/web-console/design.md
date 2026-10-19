# Design

## Context

The foundation change (`foundation-monorepo-mock`) is in place. What it provides:
- `packages/client` already implements the Option Y cache: `['listings', filters]` holds pages of ids plus `total`, and `['listing', id]` holds one listing. It also provides `putListing` (which keeps an in-flight optimistic edit while still taking sync), `applyChanges`, `patchMutationOptions` with exact rollback and CONFLICT handling, `failedOps`, `buildUndo` and `newIdempotencyKey`. The client exposes `getChanges`, `getHistory`, `bulk`, `retrySync` and an `onRateLimit` listener. There are no hooks yet for polling, bulk, history or retry-sync.
- `packages/contract` defines the URL format (`parseListQuery` / `toSearchParams`), `priceHealth`, `issuesOf` / `problemsOf` / `compareProblems`, and `STALE_PENDING_MS`.
- `packages/mock` provides the engine, with `tick()` exposed. The chaos config is read once, at start.
- `packages/tokens` provides CSS variables that `toCssVars()` inlines into the root layout, with density switched by `data-density`.
- `apps/web` is a single client-rendered page under `MockProvider`, because MSW must be ready before the first fetch.

Requirements are in `specs/*`. This document only covers how.

## Goals / Non-Goals

**Goals:**
- Every Track A bullet, at A0–A3 depth, with A0 complete before A1 starts.
- The rendering cost of a drift poll is proportional to the rows that changed, and this is measured, not claimed.
- Keyboard and screen-reader behaviour we can defend line by line in the demo.

**Non-Goals:**
- Server rendering of listing data. The mock lives in the browser; the README says where an RSC first page would go in production.
- Column resize or reorder, saved views, multi-level undo, and cross-marketplace AND filters.
- Dark mode in the UI (the tokens are defined but not verified).
- The AI explanation itself: the drawer only reserves its slot.

## Decisions

Decisions marked *(default)* are mine and haven't been confirmed. All others were confirmed during planning.

**W1. A real `<table>`, virtualized with spacer rows.**
TanStack Virtual computes the window. The `<tbody>` renders a top spacer `<tr>`, the visible rows plus an overscan of 10, and a bottom spacer `<tr>`. The table uses `table-layout: fixed` with widths from a `<colgroup>`, and the `<thead>` is sticky. `aria-rowcount` = total + 1 and `aria-rowindex` is set on each row. Row height comes from the density token, so `estimateSize` is exact and there's no measuring. *Alternatives:* `role="grid"` on divs (rejected in planning: half a grid is worse than a native table), and no virtualization (500 rows × 13 cells × live updates; a profile showed it, see W12).

**W2. Focus model on a native table.**
Every interactive element in a cell (checkbox, price button, quantity button, sync cells that open the drawer) is a real focusable element in DOM order, so Tab works natively. Arrow keys come from one `keydown` handler on `<tbody>`, which finds the neighbouring cell through `data-row` / `data-col` and focuses it. For a row outside the rendered window, it calls `virtualizer.scrollToIndex`, waits one frame, then focuses. The same `focusCell(row, col)` helper serves arrows, Tab across the window edge, `n`/`N`, and returning focus from the drawer. *Trade-off accepted:* Tab walks every rendered control. That's mitigated by the skip link and by `/` working from anywhere.

**W3. UI state in one Zustand store with per-row selectors.**
The store holds `selection: Set<id>`, `anchor` (for shift ranges), `editing: {id, field} | null`, `drafts`, `drawerId`, `focused: {row, col}`, `density`, `lastBulk` (ops, results and the before snapshot, for retry and undo) and `rollbackFlash: Set<id>`. Rows subscribe with `useStore(s => s.selection.has(id))`, so toggling one row re-renders one row. Density is mirrored to `<html data-density>` and to `localStorage` *(default: persisted)*. *Alternative:* React context, which re-renders every consumer on each selection change.

**W4. Filters with nuqs, mapped one-to-one onto the API.**
A single `useFilters()` hook declares the nuqs parsers for `q`, `dateFrom`, `dateTo`, `priceMin`, `priceMax`, `section`, `sync` (an array of `mp:state`), `problem` and `sort`, all with `history: "replace"`. It returns a `ListQueryInput` and setters. The query key is that object, so the URL, the cache key and the request can't disagree. Invalid values parse to `null` and are dropped. `q` updates the URL immediately, but the query receives a 250 ms debounced copy. `useListings` already sets `keepPreviousData`, and TanStack Query passes its `AbortSignal` into `fetch`, which cancels the superseded request. The table dims while `isPlaceholderData` is true. *Alternative:* hand-parsed `useSearchParams` (where `NaN` bugs come from).

**W5. Loading the whole view through cursor pages.**
The first page (limit 100) renders immediately. Then `fetchNextPage` runs in the background until `nextCursor` is null, so the five pages for 500 rows load one after another. Rows at indexes that aren't loaded yet render as fixed-height placeholders, so the scrollbar is the right size from the first paint. Selection, "select all" and `n`/`N` work on loaded rows. With everything loaded after about 3 s, that's every row. *Alternative:* load pages as you scroll. That's needed at 50k, but here it would make `n`/`N` and "select all" partial. The README notes what changes at 50k.

**W6. Problem count and `n`/`N` from loaded listings, with the contract's rules.**
`useProblemOrder()` reads the loaded ids, takes each listing from the cache, keeps those where `isProblem(l, now)`, and sorts them with `compareProblems`. It's recomputed when listings change (from `applyChanges`) and on a 5 s clock, so stale pending crosses the threshold without a poll. The toolbar count uses the same list, so the count and the navigation always agree. The current position comes from the focused row's index. *Alternative:* a separate `problem=any` request for the count, which adds a request and can disagree during drift.

**W7. Polling as one hook in `packages/client`.**
`useLiveChanges({ intervalMs: 3000 })` starts from the `changesCursor` of the first list page and loops with `setTimeout` (not `setInterval`, so slow responses don't stack). Each poll calls `getChanges(since)`, then `applyChanges`, and stores the new cursor. It stops on `visibilitychange` → hidden and makes one immediate catch-up call on visible. It uses the client with `maxReadRetries: 0` for polls and handles a 429 itself, so a poll never triggers the user-facing "Waiting…" banner. The hook exposes `{ lastOkAt, pausedUntil, failures }` for the indicator. The web app owns the timer, and mobile can reuse the hook later. *Alternative:* `refetchInterval` on a query, which doesn't fit a cursor that advances or the custom 429 handling.

**W8. Edit cell: the draft lives in the store, not in the cache.**
While editing, the input is controlled by `drafts[id:field]`. Incoming changes go through `putListing`, so they update `['listing', id]` but never touch the draft. That's the "row being edited is not disturbed" rule. On commit, an unchanged value does nothing. Otherwise `usePatchListing().mutate`. Rollback and conflict are already in `patchMutationOptions`. The UI reads `error.code` to choose the message, and `error.current` for "Changed elsewhere to £X". The rollback flash is a CSS class held in the store for 1.2 s. Under `prefers-reduced-motion` it's a static danger outline for the same time, without a transition. Messages use one `aria-live="polite"` toast region with a Retry button that re-sends the broker's value. *(default: toast stays until dismissed or the next edit; Retry is reachable with Tab, and Alt+R retries the last failure.)*

**W9. Rows stay in place through the id list.**
A successful edit writes only `['listing', id]`. The `['listings', filters]` id list is not invalidated, so the row keeps its index until the filters or sort change or the page reloads. This is deliberate, and it's written in the README.

**W10. Bulk flow as a small state machine in the store.**
`idle → preview → applying → result` (with undo / retry both going `applying → result`). The preview is computed in a pure `previewBulk(listings, op)` function: `round(price × (1 + pct/100))` to whole pounds *(default)*, minimum £1, gap and band from `priceHealth`. It's tested in Vitest. Confirm builds absolute `setPrice` / `delist` ops with each row's current version, then calls `client.bulk(ops, newIdempotencyKey())` followed by `applyBulkResults`, and stores `{ops, results, before}` as `lastBulk`. "Retry failed" uses `failedOps`, and Undo uses `buildUndo`. Both are existing pure helpers, and both replace `lastBulk` with the new intent's results, so the user can retry a failed undo. Failed rows get a marker in the table until the next bulk action. The preview is a modal dialog (`<dialog>` with `showModal`, focus trapped, Escape closes it). Ctrl/Cmd+Z triggers undo only when focus isn't in an input.

**W11. Drawer, history and retry-sync.**
The drawer is a non-modal `<aside>` on the right that shrinks the table's width rather than covering it. Focus moves into it on open and returns through `focusCell` on close. It reads `useListing(id)`, so it updates live, plus a new `useHistory(id)` query that is refetched when that listing's `version` or sync changes. `useRetrySync()` sets the marketplace to `pending` in the cache optimistically and rolls back on error. Each errored marketplace section has an empty `<ExplainSlot marketplace listing />` component that `ai-sync-explain` will fill.

**W12. The measured optimisation: row subscription X → Y.**
For the before measurement, a temporary `?rows=pages` switch makes rows read their listing from the page arrays (Option X: a drift poll creates new page arrays, so every visible row re-renders). The after measurement is the Option Y default. Measurement uses the React Profiler for row commits per poll, plus a Chrome Performance trace while scrolling 500 rows in compact, and Lighthouse (desktop) for performance score, CLS and TBT. Numbers go into the README, and the switch is removed afterwards. *Budget (default):* scrolling at 60 fps with no long task over 50 ms, at most N row renders for N changed listings, CLS 0 on load, and a Lighthouse performance score of 90 or higher on desktop.

**W13. Styling.**
CSS Modules per component, using only `var(--…)` from tokens. A few primitives are shared across the table, drawer and bulk dialog: `Button`, `IconButton`, `Chip`, `SyncGlyph`, `PriceGap`, `Toast` and `Dialog`. `SyncGlyph` draws inline SVG shapes: a filled dot for live, a hollow ring for pending, a ring with a clock tick for stale pending, a triangle with ! for error, and a dash for not listed. Each has an `aria-label` from one `syncLabel(mp, entry, quantity, now)` function, which is tested in Vitest.

**W14. Layout.** *(default)*
```
+----------------------------------------------------------------------+
| [/ Search events]  [Sync v] [Dates] [Price] [Problems only]  Density |
| 7 problems  [Next problem (n)]          Live . 2s ago     [?]        |
| chips: StubHub: error x | Section 104 x | Clear all                  |
+------------------------------------------------+---------------------+
| [] Event        Date   Sec Row Qty  Price  Gap  SH SG VV TC | Map    |
| ...virtualized rows...                                      | (coll- |
|                                                             | apsible|
+-------------------------------------------------------------+ ) or   |
| Bulk bar: 40 selected  [Price +-%] [Delist from v] [Clear]  | drawer |
+-------------------------------------------------------------+--------+
```
The right column shows the map, or the drawer when one is open, so the screen never has three panes. The Sync filter is a popover with a 4 × 4 marketplace × state checkbox matrix. Activating a marketplace column header also opens it, pre-scrolled to that marketplace.

**W15. Demo controls.**
The engine gets `setChaos(partial)`, which merges into its live config and is read on each request. It already has `tick()`. The panel only renders with `?demo=1`, is lazy-loaded, and reaches the engine through `getMockEngine()`.

**W16. Tests.**
Vitest covers `previewBulk` rounding and bands, `syncLabel`, the problem order, and the polling hook (fake timers: hidden → no polls, visible → one catch-up, a 429 is quiet, three failures → stalled). There's one Playwright spec at `?seed=<fixed>&rate429=0&latency=0-50`: edit a price → bulk −10% on 40 rows → assert that the rows `writeFails(seed, id, 1)` predicts are exactly the failed rows → retry failed → undo. A second short spec checks Tab across the virtual window edge.

## Risks / Trade-offs

- [Spacer-row virtualization with a sticky `<thead>` jitters in some browsers] → fixed row heights, `contain: strict` on the scroller, and checks in Chrome and Safari. Fallback: a div-based `role="table"` layout with the same ARIA (the semantics stay, only the elements change).
- [Focusing a row that isn't rendered yet loses focus to `<body>`] → every jump goes through `focusCell` (scroll first, then focus once mounted), covered by the Playwright Tab spec.
- [Loading all pages fights the 1-in-20 read 429] → the client already retries reads after `Retry-After`. Background pages show their wait in the indicator, not as a blocking banner.
- [The problem list recomputes on every change] → it's a sort of at most 500 items, done after `applyChanges`, which is cheap. Profile it as part of W12.
- [Undo after a partial failure confuses people] → the copy always gives the count ("Undo 34 changes"), and undo results use the same result panel.
- [Single-letter shortcuts clash with screen-reader quick navigation] → they're ignored in inputs, documented in `?`, and each has a visible button equivalent.
- [The demo panel leaks into a broker's view] → it only appears with `?demo=1`, and its UI says it controls a mock.

## Migration Plan

This replaces the checkpoint list in `apps/web` (task 8.1 of the foundation), so there's nothing to migrate. Each task group ends in its own commit. Rollback is reverting the commits.

## Open Questions

- Whether `Alt+R` (retry the last failed edit) is worth teaching, or whether Tab-reachable Retry is enough. Decide after the first keyboard pass. It doesn't change the specs.
