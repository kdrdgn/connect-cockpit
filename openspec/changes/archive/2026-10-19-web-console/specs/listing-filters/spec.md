# Spec Delta

## Purpose

Lets the broker narrow 500 listings to the ones that matter right now, and share or bookmark that exact view as a link.

## ADDED Requirements

### Requirement: Filters live in the URL
Every filter and the sort SHALL be stored in the page URL, using the same parameter names and value formats as the list API. Opening a URL SHALL reproduce the same filters, sort and result set. Changing a filter SHALL replace the current history entry, not push a new one per keystroke.

#### Scenario: Link reproduces the view
- **WHEN** a URL with `?sync=stubhub:error&priceMax=150&sort=date:asc` is opened in a new tab
- **THEN** the filter controls show those values and the table shows the same listings

#### Scenario: Invalid parameter
- **WHEN** the URL contains `priceMin=abc`
- **THEN** that filter is ignored and the rest of the view loads

### Requirement: Available filters
The broker SHALL be able to filter by event search (case-insensitive, contains), marketplace × sync state, date range, price range, section, and "problems only". Different filter kinds SHALL combine with AND. Several marketplace × state choices SHALL combine with OR.

#### Scenario: Everything errored on StubHub
- **WHEN** the broker chooses StubHub × error
- **THEN** only listings in error on StubHub are shown, and the count says how many

#### Scenario: OR within sync, AND across kinds
- **WHEN** the broker chooses StubHub × error and SeatGeek × error, and section 104
- **THEN** every row is in section 104 and in error on StubHub or SeatGeek

### Requirement: Sort
Clicking or activating a sortable column header SHALL sort by that column, and doing it again SHALL reverse the order. The header SHALL announce the current sort direction. Sortable columns are date, event, section, quantity and price.

#### Scenario: Sort by price
- **WHEN** the broker activates the Price header twice
- **THEN** rows are sorted by price descending and the header announces "descending"

### Requirement: Active filter chips
Each active filter SHALL appear as a chip that names it in words. Removing a chip SHALL remove only that filter. A "Clear all" control SHALL remove every filter but keep the sort.

#### Scenario: Remove one chip
- **WHEN** the chips are "StubHub: error" and "Section 104", and the broker removes "Section 104"
- **THEN** the URL keeps `sync=stubhub:error` and drops `section`

### Requirement: Responsive filter loading
Typing in search SHALL wait about 250 ms after the last keystroke before requesting. A new filter request SHALL cancel the previous one. While a new result loads, the previous rows SHALL stay visible in a dimmed state instead of being replaced by placeholders.

#### Scenario: Fast typing
- **WHEN** the broker types "glass" in under 250 ms
- **THEN** one list request is sent, for "glass"

#### Scenario: Previous rows stay
- **WHEN** a filter changes and the new result takes 700 ms
- **THEN** the old rows stay visible and dimmed until the new rows replace them
