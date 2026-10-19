# live-status Specification

## Purpose

Keeps sync states current while the console stays open all day, without disturbing what the broker is doing and without hiding when updates stop.

## Requirements

### Requirement: Changes are polled
While the page is visible, the console SHALL request changes since its last cursor about every 3 seconds and apply them to the listings already shown.

#### Scenario: Drift appears
- **WHEN** a listing's StubHub state changes from live to error in the mock
- **THEN** its StubHub cell shows error within about 3 seconds, without a reload

### Requirement: Surgical updates
Applying changes SHALL re-render only the rows whose listings changed. Scroll position, focus and selection SHALL NOT change.

#### Scenario: Focus survives an update
- **WHEN** focus is on row 40 and a change arrives for row 41
- **THEN** focus stays on row 40 and only row 41 re-renders

### Requirement: The row being edited is not disturbed
While a cell is in edit mode, an incoming change for that listing SHALL update its sync cells but SHALL NOT change the input's value or leave edit mode.

#### Scenario: Price changes elsewhere mid-edit
- **WHEN** the broker is typing in a price cell and a change arrives with a new price for that listing
- **THEN** the input keeps the broker's text, and committing it is handled as a conflict

### Requirement: Hidden tabs do not poll
When the page becomes hidden, polling SHALL stop. When it becomes visible again, the console SHALL make one catch-up request from the stored cursor, then resume polling.

#### Scenario: Return after an hour
- **WHEN** the tab was hidden for an hour and becomes visible
- **THEN** one changes request is sent with the old cursor and every change is applied

### Requirement: Freshness indicator
The toolbar SHALL show how long ago the last successful poll was ("Live · 2s ago"). A rate-limited poll SHALL show a quiet "Live · paused 3s" with no alert. After three failed polls in a row it SHALL show "Updates stalled. Retrying" until a poll succeeds.

#### Scenario: Poll is rate-limited
- **WHEN** a poll gets 429 with Retry-After 3
- **THEN** the indicator shows "Live · paused 3s", no alert or toast appears, and polling resumes after 3 seconds

#### Scenario: Stalled
- **WHEN** three polls in a row fail
- **THEN** the indicator shows "Updates stalled. Retrying" and is announced once to screen readers
