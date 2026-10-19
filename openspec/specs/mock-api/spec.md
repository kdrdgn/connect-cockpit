# mock-api Specification

## Purpose

A stand-in listings API that misbehaves in realistic, controllable ways: slow responses, failures, rate limits and live drift. The console and the phone are built and tested against it, the same way they would be against the real backend.

## Requirements

### Requirement: Same behaviour on every transport
The mock SHALL behave identically whether it is reached through the browser's request interception, through an in-process fetch on mobile, or by direct calls in tests. That covers data, latency, failures and drift.

#### Scenario: Same seed, same failures everywhere
- **WHEN** the same data seed and chaos seed are used on web and in a test
- **THEN** the same listings exist and the same writes fail

### Requirement: Deterministic fixtures
Given a data seed, the mock SHALL generate the same dataset every time: about 500 listings across 18 events named "Artist – Tour" with fictional artist and tour names, about 5 fictional venue names that share one section layout of 16 sections drawn as SVG polygons, each event at one venue, and every listing's section matching a layout section id. About 2% of listings SHALL start with a quantity mismatch.

#### Scenario: Reproducible data
- **WHEN** fixtures are generated twice with the same data seed
- **THEN** both datasets are identical

#### Scenario: Sections match the map
- **WHEN** any listing is read
- **THEN** its section id exists in the shared layout's sections

#### Scenario: Venues vary
- **WHEN** fixtures are generated with the default data seed
- **THEN** listings name at least 4 different venues, and all listings for one event name the same venue

#### Scenario: Event names carry a tour
- **WHEN** any listing is read
- **THEN** its event reads "<artist> – <tour>"

### Requirement: State resets on reload
Mock state SHALL NOT be persisted. Reloading the page or restarting the app SHALL discard all edits and drift, and SHALL regenerate state from the data seed.

#### Scenario: Edit is gone after reload
- **WHEN** a price is edited successfully and the page is then reloaded
- **THEN** the listing shows its generated price again

### Requirement: Invented error templates and injection fixtures
Error messages SHALL come from 7 templates labelled as invented. The dataset SHALL include one listing whose lastError contains instruction-like text and one event whose name contains instruction-like text, so defences against prompt injection can be tested.

#### Scenario: Injection fixtures present
- **WHEN** fixtures are generated with the default data seed
- **THEN** exactly one lastError and exactly one event name contain the injection text

### Requirement: List listings
`GET /listings` SHALL return `{ items, nextCursor, total, changesCursor }`. It accepts an opaque cursor, a limit, a sort, and the filters q (event contains, case-insensitive), dateFrom, dateTo, priceMin, priceMax, section, repeatable sync=marketplace:state, and problem=any. Different filter kinds combine with AND; repeated sync values combine with OR.

#### Scenario: Marketplace by state filter
- **WHEN** listings are requested with sync=stubhub:error
- **THEN** only listings in error on StubHub are returned and total counts all of them

#### Scenario: OR within sync, AND across kinds
- **WHEN** listings are requested with sync=stubhub:error, sync=seatgeek:error and section=104
- **THEN** results are in section 104 and in error on StubHub or SeatGeek

#### Scenario: Cursor pagination
- **WHEN** pages are followed by nextCursor until it is absent
- **THEN** every matching listing appears exactly once

### Requirement: Changes since a cursor
`GET /listings/changes?since=<cursor>` SHALL return every listing change after that cursor, plus a new cursor. Drift SHALL change only sync state, lastError, updatedAt and listedQuantity, every few seconds. The only exception is one seeded "edited elsewhere" event that changes a price.

#### Scenario: Drift is visible
- **WHEN** a client polls changes a few seconds apart
- **THEN** it receives sync changes and never a price or quantity change other than the seeded event

### Requirement: Versioned single write
`PATCH /listings/:id` SHALL take price and/or quantity together with the version the client last saw. A stale version SHALL return 409 CONFLICT with the current listing. A successful write SHALL increment the version and set every live marketplace to pending.

#### Scenario: Stale version
- **WHEN** a PATCH carries a version older than the current one
- **THEN** the response is 409 CONFLICT including the current listing, and nothing changes

#### Scenario: Write starts propagation
- **WHEN** a PATCH succeeds on a listing that is live on StubHub
- **THEN** StubHub becomes pending and later drifts to live or error

### Requirement: Bulk write with per-item results
`POST /listings/bulk` SHALL accept an Idempotency-Key header and ops of the form setPrice (absolute price), delist (one marketplace) or relist (one marketplace, used to undo a delist), each with its version. It SHALL return 200 with one result per op, success or error. Repeating a request with the same key SHALL return the stored result without applying anything again.

#### Scenario: Partial failure
- **WHEN** 40 ops are sent and 6 fail
- **THEN** the response is 200 with 34 ok results and 6 error results, each naming its id

#### Scenario: Idempotent replay
- **WHEN** the same bulk request is sent twice with the same Idempotency-Key
- **THEN** the second response equals the first and no listing changes twice

### Requirement: Retry sync and history
`POST /listings/:id/retry-sync` SHALL set the named marketplace to pending, after which it drifts to live or error. `GET /listings/:id/history` SHALL return that listing's per-marketplace state changes, newest first.

#### Scenario: Retry moves to pending
- **WHEN** retry-sync is called for StubHub on an errored listing
- **THEN** StubHub becomes pending and a history entry is recorded

### Requirement: Latency
Every call SHALL take between 300 and 800 ms unless the latency is overridden.

#### Scenario: Default latency
- **WHEN** chaos is at its defaults
- **THEN** every response arrives between 300 and 800 ms after the request

### Requirement: Deterministic write failures
About 15% of write operations SHALL fail with a clear MARKETPLACE_REJECTED or similar envelope. Whether a write fails SHALL depend only on the chaos seed, the listing id and the attempt number, never on request order.

#### Scenario: Order independence
- **WHEN** the same bulk ops are sent in a different order with the same chaos seed
- **THEN** exactly the same listings fail

#### Scenario: Retry can succeed
- **WHEN** a failed write is retried
- **THEN** the retry counts as a new attempt and may succeed

### Requirement: Rate limiting
About 1 in 20 reads SHALL return 429 with a Retry-After header and a RATE_LIMITED envelope.

#### Scenario: 429 shape
- **WHEN** a read is rate-limited
- **THEN** the status is 429, Retry-After holds whole seconds and the envelope says retryable

### Requirement: Chaos controls
Chaos SHALL be configurable at startup with chaos (on or off), seed, latency range, failRate and rate429. Defaults SHALL match the brief. With chaos off, there are no failures, no 429s and minimal latency.

#### Scenario: Chaos off for tests
- **WHEN** the mock starts with chaos=off
- **THEN** no write fails and no read returns 429
