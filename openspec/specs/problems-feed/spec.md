# problems-feed Specification

## Purpose

Lets the broker find and fix one listing from a phone in under 20 seconds: a ranked feed of listings that need attention, a detail screen, and one-tap retry, quick price edit and delist.

## Requirements

### Requirement: Feed of listings that need the broker
The app SHALL open on a feed of every listing with a problem, plus listings with an ordinary pending marketplace. It SHALL be ordered by the shared problem ranking: quantity mismatch, error, stale pending, overpriced, then ordinary pending, with the soonest event first within a kind. A header SHALL show how many listings are problems, not counting ordinary pending.

#### Scenario: Worst first
- **WHEN** the feed contains a quantity mismatch, an error and an ordinary pending listing
- **THEN** the mismatch is first, the error second, and the pending listing last

#### Scenario: Healthy listings are absent
- **WHEN** a listing is live on every marketplace, its listed quantities match and its price is not overpriced
- **THEN** it does not appear in the feed

### Requirement: Rows say what is wrong in words
Each row SHALL show the event, date, section and row, and its most urgent issue in words with the marketplace named, for example "StubHub: shows 4, you have 2" or "SeatGeek: error". Status SHALL NOT rely on colour alone. Ordinary pending rows SHALL look quieter than problem rows.

#### Scenario: Quantity mismatch row
- **WHEN** StubHub lists 4 tickets and the broker holds 2
- **THEN** the row reads "StubHub: shows 4, you have 2" with a warning shape next to it

### Requirement: One-tap retry from the feed
A row whose most urgent issue is on a marketplace that can be retried (error, stale pending or quantity mismatch) SHALL have a Retry button. Tapping it SHALL retry that marketplace immediately, with no confirmation, and show it as pending. A failed retry SHALL roll back and say why on that row.

#### Scenario: Retry a mismatch
- **WHEN** the broker taps Retry on "StubHub: shows 4, you have 2"
- **THEN** the row shows StubHub as pending at once, without opening the detail

### Requirement: The feed doesn't reorder under the thumb
Incoming changes SHALL update rows in place. The feed's order and membership SHALL be recomputed only on pull to refresh or on returning from a listing's detail, so a row the broker is about to tap never moves.

#### Scenario: Drift while scrolling
- **WHEN** a listing in the feed changes state while the feed is open
- **THEN** its row's text updates where it is, and no row changes position until the broker pulls to refresh or returns from a detail

#### Scenario: Back from a fix
- **WHEN** the broker fixes a listing in detail and goes back
- **THEN** the feed is recomputed and the fixed listing has moved down or left the feed

### Requirement: Listing detail
Tapping a row SHALL open the listing's detail: event, date, venue, section and row, quantity, price against market, and each marketplace's state with its full error text. Each marketplace in error, stale pending or mismatch SHALL offer Retry sync. The detail SHALL also offer Edit price and, for each listed marketplace, Delist. The detail SHALL show no AI explanation.

#### Scenario: Errored marketplace
- **WHEN** the broker opens a listing whose SeatGeek sync is in error
- **THEN** the detail shows SeatGeek's full error message and a Retry sync button for SeatGeek

### Requirement: Quick price edit
Edit price SHALL open a sheet with the current price filled in, a numeric keypad, and buttons that lower or raise the price by £1. Saving SHALL show the new price at once and close the sheet. A price that is not positive or has more than two decimals SHALL keep the sheet open with a message and send nothing. Saving an unchanged price SHALL send nothing.

#### Scenario: Raise by two pounds
- **WHEN** the price is £46 and the broker taps +£1 twice and Save
- **THEN** the sheet closes, the detail shows £48 straight away, and one price write is sent

#### Scenario: Invalid price
- **WHEN** the broker clears the field and taps Save
- **THEN** the sheet stays open, says "Enter a price", and nothing is sent

### Requirement: Failed and conflicting edits are visible
When a price write fails, the price SHALL return to its exact previous value and the detail SHALL say why, with a Retry that re-sends the same price. When the listing changed elsewhere, the message SHALL say what it changed to and the broker's price SHALL NOT be applied silently.

#### Scenario: Marketplace rejects the price
- **WHEN** a save from £46 to £48 fails
- **THEN** the detail shows £46 again and a message with the reason and a Retry

### Requirement: Delist needs a confirmation
Delist SHALL ask for confirmation in a native dialog naming the marketplace, and SHALL do nothing unless confirmed.

#### Scenario: Cancel a delist
- **WHEN** the broker taps Delist for StubHub and then Cancel
- **THEN** nothing is sent and StubHub stays listed

### Requirement: Live updates on the phone
While the app is in the foreground, it SHALL request changes about every 3 seconds and apply them to listings already loaded. When the app goes to the background, polling SHALL stop. When it returns, the app SHALL make one catch-up request, then resume. A rate-limited poll SHALL be retried quietly, with no alert.

#### Scenario: Back from the background
- **WHEN** the app has been in the background for a minute and comes back
- **THEN** one catch-up request is made at once and the rows show current states

### Requirement: Loading, empty and error states
The feed SHALL show a loading state until the first listings arrive, "Nothing needs you right now" when no listing qualifies, and a load error with a Retry button when listings can't be loaded. Pull to refresh SHALL reload the listings.

#### Scenario: Nothing to fix
- **WHEN** no listing has a problem or a pending marketplace
- **THEN** the feed says "Nothing needs you right now"

### Requirement: Touch targets and accessibility
Every tappable control SHALL be at least 44 by 44 points. The feed and detail SHALL be usable at 390 points wide with no horizontal scrolling. Every control SHALL have an accessible name and role, and each row SHALL be announced as one item with its issue in words.

#### Scenario: Screen reader on a row
- **WHEN** VoiceOver focuses a feed row
- **THEN** it reads the event, seats and issue in words, for example "Glass Harbour, section 104 row F, StubHub: shows 4, you have 2", and the Retry button is announced separately

### Requirement: Fix one listing in under 20 seconds
From a cold start of the app in Expo Go, the broker SHALL be able to fix the top listing (retry it, or change its price) in under 20 seconds.

#### Scenario: Timed run
- **WHEN** the broker opens the app, taps the top row, taps Edit price, raises the price by £2 and saves
- **THEN** the price is saved and the broker is back on the feed in under 20 seconds, as timed in the recording
