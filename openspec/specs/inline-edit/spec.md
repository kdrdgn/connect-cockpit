# inline-edit Specification

## Purpose

Lets the broker change a listing's price or quantity straight in the table, from the keyboard, and always see whether the change actually landed.

## Requirements

### Requirement: Enter edit mode
The price and quantity cells SHALL be focusable controls. Pressing Enter or F2, or clicking, SHALL turn the cell into an input with its value selected. Typing a digit on a focused cell SHALL start editing with that digit.

#### Scenario: Start editing from the keyboard
- **WHEN** focus is on a price cell showing £120 and the broker presses Enter
- **THEN** an input appears with "120" selected

### Requirement: Commit and cancel keys
In edit mode, Enter SHALL commit and keep focus on the same cell. Escape SHALL cancel, restore the value and keep focus on the cell. Tab SHALL commit, leave edit mode and move focus to the next interactive cell to the right. Shift+Tab SHALL do the same to the left. Committing an unchanged value SHALL NOT send a write.

#### Scenario: Tab moves on
- **WHEN** the broker types 3 in a quantity cell and presses Tab
- **THEN** the write is sent, the cell shows 3, and focus is on the same row's price cell (the next cell to the right) in navigation mode

#### Scenario: Escape cancels
- **WHEN** the broker types 130 and presses Escape
- **THEN** no write is sent and the cell shows £120

### Requirement: Input validation
Price SHALL accept a positive number with at most two decimals. Quantity SHALL accept a whole number of zero or more. Invalid input SHALL keep the cell in edit mode with an inline message and SHALL NOT send a write.

#### Scenario: Negative quantity
- **WHEN** the broker enters -1 as quantity and presses Enter
- **THEN** the cell stays in edit mode and says "Quantity must be 0 or more"

### Requirement: Optimistic update
A committed edit SHALL show the new value immediately and mark the cell as saving until the server answers. Marketplaces that were live SHALL then show pending, because the change has not propagated yet.

#### Scenario: Saving then propagating
- **WHEN** a price edit succeeds on a listing live on StubHub
- **THEN** the cell shows the new price at once, the saving mark clears on success, and the StubHub cell shows pending

### Requirement: Visible rollback
When a write fails, the cell SHALL return to the exact previous value, show the danger colour briefly, and show a message naming the listing and the reason with a Retry action that is reachable from the keyboard. With reduced motion, the danger colour SHALL appear without animation. Danger is used for nothing else in the console.

#### Scenario: Failed write rolls back
- **WHEN** a price edit from 120 to 130 is rejected by the marketplace
- **THEN** the cell shows £120 again in the danger colour, and a message says why with a Retry that re-sends 130

### Requirement: Conflict with a newer version
When a write is rejected because the listing changed elsewhere, the cell SHALL show the server's current value, and a message SHALL say what it changed to. The broker's value SHALL NOT be applied silently.

#### Scenario: Edited elsewhere
- **WHEN** the broker commits £130 but the listing was changed to £125 elsewhere
- **THEN** the cell shows £125 and the message says "Changed elsewhere to £125. Your £130 was not saved."

### Requirement: Rows stay in place
A row whose edit changes its sort position SHALL stay where it is until the list is next reloaded or the sort or filters change.

#### Scenario: Sorted by price
- **WHEN** the table is sorted by price and the broker raises one row's price above every other row
- **THEN** that row stays in its current position
