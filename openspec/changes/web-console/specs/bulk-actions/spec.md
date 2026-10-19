# Spec Delta

## Purpose

Lets the broker reprice or delist many listings at once, see exactly what will change before it happens, and recover precisely from partial failure.

## ADDED Requirements

### Requirement: Row selection
Each row SHALL have a checkbox. Shift-clicking a checkbox SHALL select the range from the last clicked row. Space SHALL toggle the focused row, and Shift+Space SHALL extend the range to it. A header checkbox SHALL select or clear every loaded row in the view. The bulk bar SHALL show how many rows are selected.

#### Scenario: Shift-click range
- **WHEN** the broker checks row 10, then shift-clicks row 49
- **THEN** rows 10 to 49 are selected and the bar says "40 selected"

### Requirement: Bulk operations offered
With rows selected, the broker SHALL be able to change price by a percentage (positive or negative) or delist from one chosen marketplace. New prices SHALL be rounded to whole pounds and SHALL stay above zero.

#### Scenario: Minus ten percent
- **WHEN** the broker chooses −10% for a row priced £125
- **THEN** its new price is £113 (112.5 rounded)

### Requirement: Preview before applying
Before anything is sent, a preview SHALL list every affected row with its old price, new price, the new gap to market and its price health. For delist it SHALL list each row and the marketplace's current state. Nothing SHALL be written until the broker confirms.

#### Scenario: Price preview
- **WHEN** the broker previews +10% on 40 rows
- **THEN** 40 rows are listed with old price, new price, gap and health, and no write has been sent

#### Scenario: Cancel the preview
- **WHEN** the broker closes the preview with Escape
- **THEN** no write is sent and the selection is kept

### Requirement: Apply exactly what was previewed
Confirming SHALL send the absolute prices shown in the preview with each row's version, as one user intent with its own idempotency key. A row that changed since the preview SHALL fail individually with a conflict rather than receive a different price.

#### Scenario: Row drifted since preview
- **WHEN** one of 40 rows is edited elsewhere between preview and confirm
- **THEN** that row fails with "Changed elsewhere" and the other 39 are applied as previewed

### Requirement: Per-item results
After applying, the console SHALL say how many succeeded and failed, and SHALL list exactly which rows failed with each reason. Failed rows SHALL keep their previous values and be marked in the table.

#### Scenario: Six of forty fail
- **WHEN** 40 price changes are applied and 6 fail
- **THEN** the result says "34 updated, 6 failed", lists the 6 rows with reasons, and those 6 still show their old prices

### Requirement: Retry failed only
The result SHALL offer "Retry failed", which re-sends only the failed ops, as a new intent with a new idempotency key. Its results SHALL replace the previous failures.

#### Scenario: Retry six
- **WHEN** the broker chooses "Retry failed" after 6 of 40 failed
- **THEN** exactly 6 ops are sent with a new idempotency key

### Requirement: Undo the last bulk action
After a bulk action, the console SHALL offer Undo, also on Ctrl+Z or Cmd+Z, until the next bulk action. Undo SHALL reverse only the ops that succeeded: old prices for price changes, and relist for delists. Undo of a delist SHALL be labelled "Relist (may lose position)". Undo is a write and SHALL report its own per-item results.

#### Scenario: Undo after partial failure
- **WHEN** the broker undoes after 34 of 40 succeeded
- **THEN** the action says "Undo 34 changes" and sends 34 ops restoring the old prices
