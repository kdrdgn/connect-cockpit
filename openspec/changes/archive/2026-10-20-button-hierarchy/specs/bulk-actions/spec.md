# Spec Delta

## MODIFIED Requirements

### Requirement: Retry failed only
The result SHALL offer "Retry failed", which re-sends only the failed ops, as a new intent with a new idempotency key. Its results SHALL replace the previous failures. Wherever it is offered, "Retry failed" SHALL be danger when the failed ops are delists and primary when they are price changes.

#### Scenario: Retry six
- **WHEN** the broker chooses "Retry failed" after 6 of 40 failed
- **THEN** exactly 6 ops are sent with a new idempotency key

#### Scenario: Retry failed delists
- **WHEN** a bulk delist from StubHub finished with 3 failures
- **THEN** "Retry failed (3)" is danger in the result dialog and in the bulk bar after the dialog closes

## ADDED Requirements

### Requirement: Apply emphasis follows the intent
The preview's confirming control SHALL be danger when the intent is a delist and primary when it is a price change. Its label SHALL stay "Apply to N listings" for both.

#### Scenario: Bulk delist preview
- **WHEN** the broker previews delisting 12 listings from StubHub
- **THEN** "Apply to 12 listings" is danger and "Cancel" is default

#### Scenario: Bulk price preview
- **WHEN** the broker previews +10% on 40 listings
- **THEN** "Apply to 40 listings" is primary

### Requirement: Result dialog emphasis and focus
When any op failed, "Retry failed" SHALL be the result dialog's only filled control and Close SHALL be default. When nothing failed, Close SHALL be primary. In both cases Undo SHALL be default, and focus SHALL start on Close so that Enter never sends another write.

#### Scenario: Partial failure result
- **WHEN** 40 price changes are applied and 6 fail
- **THEN** "Retry failed (6)" is primary, Undo and Close are default, and focus is on Close

#### Scenario: Full success result
- **WHEN** 40 price changes are applied and none fail
- **THEN** Close is primary and has focus, and Undo is default

#### Scenario: Enter on the result
- **WHEN** the result dialog opens after a bulk delist with failures and the broker presses Enter
- **THEN** the dialog closes and no write is sent
