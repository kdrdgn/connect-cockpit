# Tasks

## 1. Wishlist

- [x] 1.1 Write `docs/api-wishlist.md` from design.md: a title, two lines of context, the eight numbered bullets (each one line plus a one-line reason), the "What we'd give up to keep the backend simple" list, one line on auth/CORS/versioning as assumed, and one line on generating OpenAPI from the zod contract; verify there are at most eight bullets, all seven brief topics are covered (pagination, filters, bulk with per-item results and idempotency key, sync delivery and why, error envelope, 429/Retry-After, stale-edit detection), and it fits on one page (about 60 lines or fewer)
- [x] 1.2 Cross-check every bullet against the code it cites (`packages/contract/src/api.ts`, `packages/mock/src/query.ts`, `packages/mock/src/engine.ts`, `packages/client/src/client.ts`): limits, header names, status codes and field names match exactly, and each ask beyond the mock (SSE, feed query, AI route auth) is marked as such; verify by listing each bullet with its matching file and line in the task notes
  - Cross-check notes:
    1. Pagination: `limit` 1–200 default 100 `api.ts:59`; `{ items, nextCursor, total, changesCursor }` `api.ts:74-79`; keyset cursor `query.ts:27-30`, `:58`.
    2. Filters: params as listed `api.ts:106-123` (`toSearchParams`); OR within `sync`, AND across `api.ts:67`.
    3. Bulk: `POST /listings/bulk` `client.ts:139`; 1–500 ops `api.ts:161`; `setPrice`/`delist`/`relist` with `version` `api.ts:148-158`; key required `engine.ts:192`; per-item results, 200 `api.ts:164-170`, `engine.ts:198-219`. Redis 24 h is the ask; the mock keeps keys in memory (`engine.ts:99`).
    4. Polling `GET /listings/changes?since=` `client.ts:133`, every 3 s `live.ts:47`. SSE marked beyond the mock.
    5. Envelope `api.ts:17-40`; codes `api.ts:6-13`; status map `engine.ts:34-41` (400/404/409/422/429/500); bulk `error` is `ApiErrorBody` `api.ts:166`.
    6. `Retry-After` seconds `engine.ts:250`; `retryAfterMs` required on RATE_LIMITED `api.ts:35-40`; reads only retried `client.ts:105`, writes never `client.ts:44`.
    7. `version` in `PatchBody` `api.ts:137` and every bulk op; 409 `engine.ts:37`; `current` required on CONFLICT `api.ts:32-33`. Fixed: retry-sync carries no version (`RetrySyncBody` `api.ts:173`), so the bullet now names edits only.
    8. Feed and AI-route auth marked beyond the mock; `problemRank` `problems.ts:44`; phone's `buildFeed` `apps/mobile/src/feed.ts:20`; open AI route `README.md:172`.

## 2. README

- [x] 2.1 Link `docs/api-wishlist.md` from the README (Architecture section and "What I skipped" next to the Go note) and check that the Go TODO line still stands as written; verify both links resolve and no README command changed

## Workflow follow-up

- Archive this change after review. All five planned changes are then done; what's left before submission is deployment, the recording, and the README TODO(author) lines.
