# Design

## Context

The contract (`packages/contract/src/api.ts`) and the mock (`packages/mock/src/engine.ts`, `query.ts`) already implement most of what the wishlist asks for. The positions below were settled during planning (item 8: contract details; the polling vs SSE split); this document records how each becomes a bullet. See proposal.md for the why.

## Goals / Non-Goals

**Goals:**
- Each bullet is something the frontend already depends on and can point to in code, so the backend team gets a spec with a working reference.
- Where the wishlist asks for more than the mock does, it says so.

**Non-Goals:**
- An OpenAPI document. The zod contract is the source of truth; generating OpenAPI from it is mentioned as a follow-up.
- Changing the contract to match the wishlist.

## Decisions

The eight bullets, in this order (each is one line plus a one-line reason in the document):

| # | Ask | Reason (one line) | Where it already lives |
|---|---|---|---|
| 1 | **Keyset pagination**: opaque `cursor` + `limit` (max 200), response `{ items, nextCursor, total }`; the cursor encodes the last row's sort key | Offsets slow down and skip or duplicate rows when data shifts; a keyset is an index seek at 50,000 rows, and an exact `total` stays cheap with a covering count (or can become an estimate past a threshold) | `ListQuery`, `ListResponse`, `encodeCursor` |
| 2 | **Flat, repeatable query params**: `q`, `dateFrom`/`dateTo`, `priceMin`/`priceMax`, `section`, `sync=<marketplace>:<state>` (repeatable, OR), `problem=any`, `sort=field:dir`; different params AND | A URL the console can share as is maps one-to-one to a SQL `WHERE`, with no query language to parse | `toSearchParams` / `parseListQuery` |
| 3 | **`POST /listings/bulk`** with `{ ops[] }` (≤500, absolute values plus per-row `version`), `Idempotency-Key` header, **200 with per-item `results[]`** | Partial success is the normal case; absolute values make retry and undo safe; the key makes a double-click or a retry after a timeout apply once (Redis, 24 h) | `BulkRequest`, `BulkResponse`, `IDEMPOTENCY_HEADER` |
| 4 | **Sync status via SSE** (`GET /listings/events`, `Last-Event-ID` resume), with `GET /listings/changes?since=<cursor>` kept as the fallback the mock uses today | Traffic flows only from server to client; SSE is plain HTTP through Gin and proxies, reconnects by itself, and Redis pub/sub feeds it; WebSocket adds a protocol for no gain | `ChangesResponse` (polling); SSE is the ask beyond the mock |
| 5 | **One error envelope**: `{ error: { code, message, retryable, retryAfterMs? }, current? }` with a closed `code` set | The UI branches on `code` and `retryable`, never on message text; `current` on conflict lets it show what changed without another request | `ErrorEnvelope`, `ERROR_CODES` |
| 6 | **429 with `Retry-After` (seconds) and `retryAfterMs`** in the body; reads may be retried, writes never automatically | The client waits exactly as long as asked and shows a countdown; writes must stay one human intent | `RATE_LIMITED` refinement, client `send()` |
| 7 | **Stale-edit detection by `version` in the body**, 409 `CONFLICT` with `current` | One mechanism for single and bulk writes (a bulk op can't carry per-row `If-Match` headers); an integer column with `WHERE version = $n` is all Postgres needs | `PatchBody`, bulk ops, mock's seeded "edited elsewhere" |
| 8 | **Next:** a server-side `GET /listings/feed` (problems plus pending, ranked by `problemRank`), and the AI route behind the broker's session with a per-user rate limit | The phone loads all 500 listings to build its feed, which won't survive 50,000; the AI route is currently open to anyone who can reach the app | `buildFeed` (mobile), README "What I skipped" |

Bullet 7 deliberately prefers a version in the body over ETag/`If-Match`. The document says ETags would still be fine for single-listing reads (`GET /listings/:id`) as a cache validator.

**"What we'd give up to keep the backend simple"** (a short list after the bullets):
- GraphQL and field selection: the list returns full listings, and at ~1 KB per row a 200-row page is fine.
- WebSocket: SSE covers one-way updates.
- AND across marketplace states (for example, "error on StubHub *and* live on SeatGeek"): only OR within `sync`.
- Server-side undo history: undo is the client re-sending old values under a new idempotency key, at depth 1.
- Exact `total` at any size: an estimate is acceptable past 10,000 rows.
- Real-time delivery guarantees: SSE plus resume by cursor, not a message queue.

**Format.** One page: a title, two sentences of context (the zod contract is the reference implementation), the eight numbered bullets, the "give up" list, and one line on generating OpenAPI from zod.

## Risks / Trade-offs

- [The wishlist reads as a description of our mock rather than a request] → Bullets 4 and 8 ask for things the mock doesn't do, and each bullet's reason is about the Go side (index seek, Redis, `WHERE version`), not the frontend.
- [Eight bullets can't cover everything] → Auth, CORS and versioning are left out deliberately. The document names them in one line as "assumed, not asked".
