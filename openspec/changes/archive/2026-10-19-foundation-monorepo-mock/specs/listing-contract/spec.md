# Spec Delta

## Purpose

Defines the listing data model, the API request and response shapes, the error envelope, and the shared domain rules (problems, problem ranking, price health) once, so web, mobile, mock and tests cannot disagree.

## ADDED Requirements

### Requirement: Listing shape
A listing SHALL carry the brief's fields (id, event, venue, ISO date, section, row, quantity, price and marketPrice in GBP per ticket, and sync per marketplace) plus an integer `version`. Each marketplace sync entry SHALL hold `state`, `updatedAt`, an optional `lastError` and an optional `listedQuantity`. Marketplaces are exactly stubhub, seatgeek, vividseats and ticombo.

#### Scenario: Valid listing parses
- **WHEN** a listing with all four marketplaces, a numeric version and valid sync states is validated
- **THEN** validation succeeds and yields a typed listing

#### Scenario: Unknown sync state is rejected
- **WHEN** a listing has a sync state outside live, pending, error and not_listed
- **THEN** validation fails with a message naming the field

### Requirement: Error envelope
Every non-2xx API response SHALL have the body `{ error: { code, message, retryable, retryAfterMs? } }`. `code` SHALL be one of VALIDATION, CONFLICT, RATE_LIMITED, MARKETPLACE_REJECTED, NOT_FOUND, INTERNAL. `message` SHALL be readable by a broker.

#### Scenario: Conflict carries the current listing
- **WHEN** a write is rejected because its version is stale
- **THEN** the envelope code is CONFLICT and the response also includes the current listing

#### Scenario: Rate limit carries wait time
- **WHEN** a request is rate-limited
- **THEN** the envelope code is RATE_LIMITED, retryable is true and retryAfterMs matches the Retry-After header

### Requirement: Problem detection
A listing SHALL count as a problem when, on any marketplace, it is in error, its listedQuantity differs from its quantity while listed, or it has been pending longer than the stale-pending threshold. A price outside the healthy band SHALL count as a problem only when overpriced.

#### Scenario: Quantity mismatch is a problem
- **WHEN** quantity is 2 and StubHub is live with listedQuantity 4
- **THEN** the listing is a problem of kind quantity_mismatch for StubHub

#### Scenario: Fresh pending is not a problem
- **WHEN** a marketplace has been pending for less than the stale-pending threshold
- **THEN** that marketplace does not make the listing a problem

#### Scenario: Underpriced is not a problem
- **WHEN** price is 22% below marketPrice and all marketplaces are live
- **THEN** the listing is not a problem

### Requirement: Problem ranking
Problems SHALL be ordered by kind: quantity mismatch, then error, then stale pending, then overpriced, then fresh pending (shown in feeds but not counted as a problem). Within a kind, the soonest event comes first. The same ranking SHALL drive every problem list, count and next-problem navigation.

#### Scenario: Mismatch outranks error
- **WHEN** one listing has a quantity mismatch and another has an error, with the error's event sooner
- **THEN** the mismatch listing ranks first

#### Scenario: Same kind ranks by date
- **WHEN** two listings both have errors
- **THEN** the one with the earlier event date ranks first

### Requirement: Price health bands
Price health SHALL come from gap = (price − marketPrice) / marketPrice, using fixed bands: overpriced above +15%, above from +5% to +15%, at market within ±5%, below from −15% to −5%, underpriced below −15%. Bands SHALL NOT depend on time to the event.

#### Scenario: Band boundaries
- **WHEN** gap is exactly +15%
- **THEN** health is above, not overpriced

#### Scenario: Overpriced
- **WHEN** price is 131 and marketPrice is 100
- **THEN** health is overpriced with gap +31%

### Requirement: Suggested price clamp
Any machine-suggested price SHALL be clamped to within ±30% of marketPrice before it reaches the user. This clamp is separate from the price health bands.

#### Scenario: Suggestion below band is clamped
- **WHEN** a suggested price is 1 and marketPrice is 100
- **THEN** the price offered to the user is 70
