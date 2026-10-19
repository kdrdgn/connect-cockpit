# sync-drawer Specification

## Purpose

Gives the broker one place to understand why a listing is out of sync on a marketplace and to push it again, without leaving the table.

## Requirements

### Requirement: Open and close the drawer
Clicking a row outside its controls, or pressing `o` on a focused row, SHALL open a side drawer for that listing. Escape or the close button SHALL close it and return focus to where it was. The drawer SHALL NOT cover the table's focused row.

#### Scenario: Keyboard round trip
- **WHEN** the broker presses `o` on a row, then Escape
- **THEN** the drawer opens with focus inside it, then closes with focus back on the same row

### Requirement: Per-marketplace detail
The drawer SHALL show, for each marketplace, its state (in the same shapes and words as the table), when it last changed, the listed quantity when it differs, and the full last error text. It SHALL update live while open.

#### Scenario: Error text in full
- **WHEN** the drawer is open on a listing in error on SeatGeek
- **THEN** the SeatGeek section shows the full error text and when the error happened

### Requirement: History
The drawer SHALL show the listing's sync history, newest first, with marketplace, state, time and error. While history loads, it SHALL show placeholders, and if it fails it SHALL offer Retry without affecting the rest of the drawer.

#### Scenario: History newest first
- **WHEN** a listing went live, then error, then pending on StubHub
- **THEN** the history lists pending first, then error, then live

### Requirement: Retry sync
Each marketplace in error or stale pending SHALL offer "Retry sync". Activating it SHALL set that marketplace to pending at once and add a history entry. A failed retry SHALL roll back and say why.

#### Scenario: Retry an error
- **WHEN** the broker retries StubHub on an errored listing
- **THEN** StubHub shows pending in the drawer and the table, and later drifts to live or error

### Requirement: Space for an explanation
The drawer SHALL reserve a section per errored marketplace where an explanation and a suggested action can appear later. Without one, the manual actions SHALL be complete on their own.

#### Scenario: No explanation available
- **WHEN** no explanation feature is present
- **THEN** the drawer shows the error, Retry sync and the price and delist actions, with no empty or broken area
