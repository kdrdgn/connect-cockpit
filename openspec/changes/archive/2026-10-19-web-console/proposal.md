# Proposal

## Why

Track A is the one part of the take-home that is never cut, and it's graded the hardest. The foundation gives us the contract, a mock that misbehaves, a client with optimistic edits, and tokens, but the broker still sees a plain list of 50 rows. This change builds the screen a broker keeps open all day: it scans 500 listings for problems, fixes prices from the keyboard, and applies bulk changes without losing track of which writes failed. It also answers founder feedback #1 (calm problems), #2 (price at a glance) and #3 (never touch the mouse) inside the product.

## What Changes

- **Inventory table**: a real `<table>` with spacer-row virtualization (TanStack Virtual, no TanStack Table) over about 500 rows. It has four narrow sync columns (StubHub, SeatGeek, Vivid Seats, Ticombo), a quiet price-health glyph with the gap in %, a problem edge bar, and a density toggle (comfortable 40 px / compact 28 px). Every state is finished: loading without layout shift, empty, error, 429 with a visible wait, and partial failure.
- **Filters in the URL** (nuqs): event search, marketplace × sync state (OR within sync), date range, price range, section and `problem=any`, plus sort. Filtering runs in the mock. Search is debounced, superseded requests are cancelled and the previous rows stay on screen while a new filter loads. Active filters show as removable chips, so a link reproduces the view.
- **Inline edit** of price and quantity: button cells that turn into inputs. Enter commits and stays on the cell, Escape cancels, and Tab commits, leaves edit mode and moves focus one cell to the right. Edits are optimistic. A failed write rolls back visibly (red, the only place red is used) and offers a Retry reachable from the keyboard. A 409 shows the value someone else saved. The row stays in place after an edit, even when the sort would move it.
- **Keyboard extras**: arrow keys between cells, `n` / `N` plus a visible "Next problem" button that jumps through rows in `problemRank` order, `/` to focus search, `?` for the shortcut sheet, and a "Skip to bulk actions" link.
- **Live status**: poll `/listings/changes?since` about every 3 s and apply changes surgically through the foundation's Option Y cache. The row being edited keeps its draft. Polling pauses in hidden tabs and makes one catch-up call on return. A 429 on a poll stays quiet ("Live · paused 3s"). The toolbar shows "Live · 2s ago" and "Updates stalled. Retrying" after three failures in a row.
- **Bulk actions**: select rows (checkbox, shift-click range, Shift+Space), then change price by ±% or delist from one marketplace. A preview shows the old price, new price, gap to market and price health per row. Confirm sends absolute prices with per-row versions. Results are reported per item, with "Retry failed only" under a new idempotency key, and Undo (depth 1) reverses only the successful items.
- **Sync detail drawer** (thin): per-marketplace state, last error, newest-first history, and retry-sync per marketplace. It leaves a slot for the AI explanation that `ai-sync-explain` fills.
- **Seating map** (thin): the foundation's 16-section SVG venue. It highlights the section of the focused or selected row, and clicking a section toggles the `section` filter.
- **Demo controls panel** (cuttable, first to go): chaos on/off, fail rate, and "drift now", so the partial-failure path can be shown on demand.
- **Quality bar for Track A**: a stated performance budget, a React Profiler and Lighthouse before/after for one optimisation (Option X → Option Y row subscriptions), one Playwright run (edit → bulk −10% → predicted failures → retry failed → undo), and README sections defending each stack choice. The README also gets feedback log entries for #1–#3, part of #4, and the two-line colour trade-off.

## Capabilities

### New Capabilities
- `inventory-table`: the virtualized listings table: columns, sync and price-health display, problem marking, density, view states, keyboard navigation and problem jumping, and the performance budget.
- `listing-filters`: URL-backed filter and sort state, filter controls and chips, and how filter changes load.
- `inline-edit`: keyboard-first editing of price and quantity, with optimistic updates, visible rollback and conflict handling.
- `live-status`: polling for changes, surgical application, behaviour in hidden tabs, and the freshness indicator.
- `bulk-actions`: row selection, the pricing and delist preview, applying the changes, per-item results, retry of failures only, and undo.
- `sync-drawer`: the per-listing sync detail panel with history, last error and retry-sync.
- `seating-map`: the venue map, which highlights the current row's section and filters by section.
- `demo-controls`: the in-app panel that changes mock chaos at runtime for demos.

### Modified Capabilities
<!-- none: no specs have been archived yet; foundation-monorepo-mock's capabilities are used as they are -->

## Impact

- `apps/web`: the console replaces the checkpoint list. New components, CSS Modules, a Zustand UI store, nuqs filter state and a Playwright config.
- `packages/client`: new hooks for change polling, bulk writes, history and retry-sync, built on the existing `createClient`, `applyChanges`, `failedOps` and `buildUndo`.
- `packages/mock`: an engine method to change chaos settings at runtime and trigger a drift tick, used only by the demo controls.
- Dependencies: nuqs, zustand and @tanstack/react-virtual in `apps/web`, and @playwright/test (already at the root).
- Out of scope: the AI explanation (`ai-sync-explain` fills the drawer slot), deployment, the mobile app and the API wishlist.
- Depends on `foundation-monorepo-mock`, which should be archived first so its specs become the baseline.
