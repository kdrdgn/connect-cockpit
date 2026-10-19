# API wishlist for the backend team

The console and the phone were built against a contract we wrote down in zod (`packages/contract/src/api.ts`) and a mock that implements it (`packages/mock`). Everything below already works against that mock, except where a bullet says **beyond the mock**. Each reason is about what it costs the Go side.

1. **Keyset pagination.** `GET /listings?cursor=&limit=` (limit 1–200, default 100) returns `{ items, nextCursor, total, changesCursor }`; the cursor is opaque and encodes the last row's sort key.
   *Why:* offsets get slower and skip or repeat rows as data shifts; a keyset is an index seek in Postgres at 500 rows or 50,000.
2. **Flat, repeatable filter params.** `q`, `dateFrom`/`dateTo`, `priceMin`/`priceMax`, `section`, `problem=any`, `sort=field:dir`, and `sync=<marketplace>:<state>` (repeatable, OR'd); different params are AND'd.
   *Why:* the console's shareable URL is the API query, and each param maps to one `WHERE` clause with no query language to parse.
3. **Bulk writes with per-item results.** `POST /listings/bulk` with `{ ops: [...] }` (1–500 ops: `setPrice` with an absolute price, `delist`, `relist`, each with the row's `version`), a required `Idempotency-Key` header, and **200** with one `{ id, ok, listing | error }` per op.
   *Why:* partial success is normal; absolute values make retry and undo safe, and the key, stored in Redis for 24 h, makes a double-click or a retry after a timeout apply once.
4. **Sync status over Server-Sent Events.** **Beyond the mock:** `GET /listings/events` streams changed listings, resuming with `Last-Event-ID`; keep `GET /listings/changes?since=<cursor>` (what we poll every 3 s today) as the fallback.
   *Why:* updates only flow server to client; SSE is plain HTTP through Gin and proxies, reconnects by itself, and Redis pub/sub feeds it. WebSocket adds a protocol for no gain.
5. **One machine-readable error envelope.** `{ error: { code, message, retryable, retryAfterMs? }, current? }`, with `code` from a closed set (`VALIDATION` 400, `NOT_FOUND` 404, `CONFLICT` 409, `MARKETPLACE_REJECTED` 422, `RATE_LIMITED` 429, `INTERNAL` 500). Bulk results use the same `error` shape.
   *Why:* the UI branches on `code` and `retryable`, never on message text, and one Gin middleware can produce it.
6. **429 with `Retry-After`.** The `Retry-After` header in seconds plus `retryAfterMs` in the body. Clients retry reads after waiting and never retry writes automatically.
   *Why:* the client waits exactly as long as asked and can show a countdown, and a write stays one human decision.
7. **Stale-edit detection with `version` in the body.** Every edit (`PATCH /listings/:id` and each bulk op) sends the version it started from; a mismatch returns **409 `CONFLICT` with `current`**, the listing as it is now.
   *Why:* one mechanism covers single and bulk writes (a bulk request can't carry a separate `If-Match` per row), and Postgres only needs `UPDATE … WHERE version = $n`. An ETag on `GET /listings/:id` is still welcome as a cache check.
8. **Next, for the phone and the AI route.** **Beyond the mock:** `GET /listings/feed`, listings with problems or pending marketplaces ranked as in `problemRank`, and the AI route behind the broker's session with a per-user rate limit.
   *Why:* the phone loads every listing to build its feed, which won't survive 50,000 rows, and the AI route is open to anyone who can reach the app.

## What we'd give up to keep the backend simple

- **GraphQL and field selection.** Lists return full listings (~1 KB each), so a 200-row page is fine.
- **WebSocket.** SSE covers updates that only flow server to client; writes stay on REST.
- **AND across marketplace states,** such as "error on StubHub *and* live on SeatGeek". Only OR within `sync`.
- **Server-side undo history.** Undo is the client re-sending old values under a new idempotency key, one level deep.
- **An exact `total` at any size.** An estimate is fine past 10,000 rows.
- **Delivery guarantees.** SSE plus resume by cursor, not a message queue.

**Assumed, not asked:** authentication, CORS and API versioning follow your existing Gin conventions. The zod contract can generate an OpenAPI document (`z.toJSONSchema`) if the team wants one to review against.
