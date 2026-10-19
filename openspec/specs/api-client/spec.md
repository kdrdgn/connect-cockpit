# api-client Specification

## Purpose

The shared client layer that web and mobile use to talk to the listings API. It validates responses, respects rate limits, and applies optimistic edits that roll back visibly when a write fails.

## Requirements

### Requirement: Injectable transport
The client SHALL send every request through a fetch function supplied by its caller, so the same client can target the mock in a browser, the mock in-process on mobile, or a real backend.

#### Scenario: Mobile in-process transport
- **WHEN** the client is created with a fetch that calls the mock directly
- **THEN** list, write and changes calls work without any network

### Requirement: Validated responses
Every response body SHALL be validated against the contract before it reaches the UI. An invalid body SHALL surface as an INTERNAL error, not as partially typed data.

#### Scenario: Malformed body
- **WHEN** a list response is missing `items`
- **THEN** the caller receives an INTERNAL error and no listings are cached

### Requirement: Retry-After handling
On 429, the client SHALL wait the Retry-After duration before retrying a read, and SHALL report the remaining wait to the caller so the UI can show it. Writes SHALL NOT be retried automatically.

#### Scenario: Read waits then retries
- **WHEN** a list read returns 429 with Retry-After 3
- **THEN** the client exposes a 3-second wait and retries after it, not sooner

#### Scenario: Write is not auto-retried
- **WHEN** a PATCH returns 429
- **THEN** the caller receives RATE_LIMITED and no retry is sent automatically

### Requirement: Optimistic edit with rollback
A single-listing edit SHALL show the new value right away. On failure it SHALL restore the exact previous value and return the error, so the UI can mark the rollback.

#### Scenario: Failed write rolls back
- **WHEN** price is edited from 120 to 130 and the write fails
- **THEN** the cached listing returns to 120 and the error identifies that listing

#### Scenario: Successful write keeps the server result
- **WHEN** the write succeeds
- **THEN** the cached listing becomes the server's listing, with its new version

### Requirement: Surgical updates
Applying a change, whether from polling or from a write, SHALL update only that listing's cache entry and SHALL NOT replace other listings' entries.

#### Scenario: One change, one entry
- **WHEN** a changes response contains one listing
- **THEN** only that listing's cached entry changes identity

### Requirement: Bulk results and undo
After a bulk write, the client SHALL report which ops succeeded and which failed, offer a retry of only the failed ops under a new idempotency key, and build an undo that reverses only the successful ops.

#### Scenario: Retry only failures
- **WHEN** 6 of 40 ops failed
- **THEN** retrying sends exactly those 6 ops with a new idempotency key

#### Scenario: Undo reverses only successes
- **WHEN** undo is requested after 34 of 40 ops succeeded
- **THEN** the undo request contains 34 ops restoring the previous prices or relisting
