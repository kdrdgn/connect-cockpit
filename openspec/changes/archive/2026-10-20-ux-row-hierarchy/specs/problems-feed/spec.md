# Spec Delta

## MODIFIED Requirements

### Requirement: Rows say what is wrong in words
Each row SHALL show the event in strong weight, the venue under it in muted text, the date as day and short month ("30 Oct"), section and row as "section / row" ("112 / F"), and its most urgent issue in words with the marketplace named, for example "StubHub: shows 4, you have 2" or "SeatGeek: error". Status SHALL NOT rely on colour alone. Ordinary pending rows SHALL look quieter than problem rows.

#### Scenario: Quantity mismatch row
- **WHEN** StubHub lists 4 tickets and the broker holds 2
- **THEN** the row reads "StubHub: shows 4, you have 2" with a warning shape next to it

#### Scenario: Row layout
- **WHEN** a listing for "Glass Harbour – Tidal Tour" at Harbour Arena on 30 October, section 112 row F, is in the feed
- **THEN** its row shows "Glass Harbour – Tidal Tour", then "Harbour Arena", then "30 Oct · 112 / F"

### Requirement: Touch targets and accessibility
Every tappable control SHALL be at least 44 by 44 points. The feed and detail SHALL be usable at 390 points wide with no horizontal scrolling. Every control SHALL have an accessible name and role, and each row SHALL be announced as one item with its issue in words, with seats spoken as "section X row Y" rather than the visible "X / Y".

#### Scenario: Screen reader on a row
- **WHEN** VoiceOver focuses a feed row
- **THEN** it reads the event, venue, seats and issue in words, for example "Glass Harbour – Tidal Tour, Harbour Arena, section 104 row F, StubHub: shows 4, you have 2", and the Retry button is announced separately
