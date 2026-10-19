# Proposal

## Why

Track D1 asks for a one-page API wishlist for the Go backend team (Gin, PostgreSQL, Redis). It should be at most eight bullets, each with a one-line reason, and name what we'd give up to keep the backend simple. The frontend was built against a contract we chose (`packages/contract`) and a mock that implements it, so the wishlist is the real API the screens depend on today, not a guess.

## What Changes

- **`docs/api-wishlist.md`**, one page and at most eight bullets, covering the brief's seven topics:
  - pagination that survives 500 rows today and 50,000 later
  - the filter query shape
  - bulk endpoints with per-item results and an idempotency key
  - how sync status reaches the browser, and why
  - a machine-readable error envelope
  - the 429 and `Retry-After` contract
  - stale-edit detection
  - one bullet for what the phone and AI routes need next: a server-side feed query, plus auth and rate limiting on the AI route
- Every bullet maps to something the contract and mock already do, and points to its file, except where the bullet deliberately asks for more than the mock does. Server-Sent Events (SSE) instead of polling is the main one.
- A closing **"What we'd give up to keep the backend simple"** section, including no GraphQL, no WebSocket, no cross-marketplace AND filters and no multi-level undo.
- The README gets a link to the wishlist, and its Architecture section gains a one-line pointer.

## Capabilities

### New Capabilities
<!-- None: a document for the backend team. No system behaviour changes, so this change sets skip_specs. -->

### Modified Capabilities
<!-- None. -->

## Impact

- New file `docs/api-wishlist.md`, plus README links. No code, contract or test changes.
- Out of scope: the Go mock service (Track D2, already cut and explained in the README), deployment, and changing the contract to match the wishlist where they differ. The differences are listed in the document instead.
