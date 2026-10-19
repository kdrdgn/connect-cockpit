# inventory-table Specification

## Purpose

The broker's all-day screen: one scannable, keyboard-complete table of every listing, where problems stand out without alarm and healthy rows stay quiet.

## Requirements

### Requirement: Native table semantics
The listings SHALL render as a native HTML table with a header row and column headers. Under virtualization the table SHALL expose the full row count and each rendered row's position, so assistive technology reports "row 212 of 501" and not the rendered window's size.

#### Scenario: Row count with virtualization
- **WHEN** 500 listings match and 40 rows are rendered
- **THEN** the table reports 501 rows (header included) and each rendered row reports its true index

### Requirement: Columns
Each row SHALL show a selection checkbox, event, date, section, row, quantity, price, the gap to market, and one narrow column per marketplace (StubHub, SeatGeek, Vivid Seats, Ticombo) in that fixed order. Prices and quantities SHALL use tabular figures.

#### Scenario: Marketplace columns scan vertically
- **WHEN** the broker looks down the StubHub column
- **THEN** every row's StubHub state is in the same horizontal position

### Requirement: Sync state is never colour alone
Each sync cell SHALL show a distinct shape per state (live, pending, stale pending, error, not listed) and SHALL carry an accessible name with the marketplace, the state and, for errors, the short error text. Only error and stale pending SHALL use the attention colour; live, pending and not listed SHALL use ink tones. No sync state SHALL be shown in red or green.

#### Scenario: Error on StubHub
- **WHEN** a listing is in error on StubHub with "Price below event minimum of £45"
- **THEN** its StubHub cell shows the error shape in the attention colour, and its accessible name is "StubHub: error. Price below event minimum of £45"

#### Scenario: Stale pending
- **WHEN** a marketplace has been pending longer than the stale-pending threshold
- **THEN** its cell shows the pending shape plus a clock mark in the attention colour, and its accessible name says how long it has been pending

### Requirement: Price health at a glance
Each row SHALL show its gap to market as a signed percentage with a direction glyph, using the contract's price-health bands. Only overpriced and underpriced SHALL use the attention colour; above, at market and below SHALL use ink.

#### Scenario: Overpriced row
- **WHEN** price is 131 and market price is 100
- **THEN** the gap cell shows an up glyph and "+31%" in the attention colour

#### Scenario: Healthy row stays quiet
- **WHEN** price is 102 and market price is 100
- **THEN** the gap cell shows "+2%" in ink with no colour

### Requirement: Problem rows are marked
A row that is a problem by the contract's rules SHALL show a left-edge bar in the attention colour plus a problem count in its accessible name. Rows that are not problems SHALL have no edge bar.

#### Scenario: Quantity mismatch row
- **WHEN** quantity is 2 and StubHub is live with listed quantity 4
- **THEN** the row shows the attention edge bar and the StubHub cell says "StubHub: listed 4, you have 2"

#### Scenario: Underpriced only
- **WHEN** a row is underpriced and all marketplaces are live
- **THEN** its gap cell is coloured but the row has no edge bar and is not counted as a problem

### Requirement: Problem count and next-problem navigation
The toolbar SHALL show the number of problem listings in the current view and a visible "Next problem" button. The button and the `n` / `N` keys SHALL move focus to the next or previous problem row in the contract's problem ranking, scrolling it into view first. Letter shortcuts SHALL NOT fire while focus is in a text input.

#### Scenario: Jump to an unrendered row
- **WHEN** the next problem row is 300 rows below the rendered window and the broker presses `n`
- **THEN** the table scrolls to it and focus lands on that row's first cell

#### Scenario: Typing is not hijacked
- **WHEN** focus is in the search box and the broker types "n"
- **THEN** the letter is typed and focus does not move

### Requirement: Keyboard navigation
Every interactive cell SHALL be reachable with Tab in visual order. Arrow keys SHALL move focus between interactive cells. A "Skip to bulk actions" link SHALL come before the table, `/` SHALL focus search, and `?` SHALL open a sheet listing every shortcut. Focus SHALL always be visible.

#### Scenario: Tab past the rendered window
- **WHEN** focus is on the last rendered row and the broker presses Tab
- **THEN** the next row is rendered and focused, and focus does not leave the table

#### Scenario: Skip the table
- **WHEN** a keyboard user activates "Skip to bulk actions"
- **THEN** focus moves to the bulk action bar without tabbing through rows

### Requirement: Density modes
A toggle SHALL switch between comfortable (40 px rows) and compact (28 px rows, about 30 rows on a 1080p screen). The choice SHALL change only row height, cell padding and cell text size, and SHALL persist across reloads on the same browser.

#### Scenario: Compact on 1080p
- **WHEN** compact is chosen on a 1920×1080 window
- **THEN** at least 28 data rows are visible without scrolling

### Requirement: View states
The table SHALL have a defined loading, empty, error and rate-limited state. Loading SHALL use fixed-height placeholder rows, so nothing shifts when data arrives. An empty filter result SHALL offer to clear filters. A failed load SHALL offer Retry. A rate-limited load SHALL show the remaining wait and keep any rows already shown.

#### Scenario: First load does not shift
- **WHEN** the page loads and the first page arrives after 600 ms
- **THEN** the layout shift measured for the page is 0

#### Scenario: Rate-limited filter change
- **WHEN** a filter change gets 429 with Retry-After 3
- **THEN** the previous rows stay visible and the toolbar shows "Waiting 3s…" counting down

### Requirement: Performance budget
With 500 listings loaded, scrolling the full table SHALL hold 60 fps on a mid-range laptop. A drift update that changes N listings SHALL re-render at most N rows. The budget and the measured numbers SHALL be stated in the README.

#### Scenario: Drift touches three rows
- **WHEN** a changes poll returns 3 listings and the React Profiler is recording
- **THEN** the commit contains at most 3 row renders
