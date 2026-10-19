# Design

## Context

Greenfield repo: only OpenSpec scaffolding exists. The deliverable is a one-day take-home (see proposal.md, Why). These constraints shape the design:
- The deployed demo is static plus one Next.js route (the AI route, added later). There's no long-lived server to hold mock state, so the mock runs on the client.
- Two apps (Next.js, Expo) have to share types, the mock and tokens without a build step that can go stale.
- Playwright needs the failures to be deterministic, while the deployed demo needs them to look random.

Requirements are in `specs/listing-contract`, `specs/mock-api`, `specs/api-client` and `specs/design-tokens`.

## Goals / Non-Goals

**Goals:**
- Define types once, in zod, and infer the TypeScript types from them.
- Have one mock engine with identical behaviour on web, on mobile and in tests.
- Make chaos reproducible by seed and independent of request order.
- Get the Expo + Metro + pnpm setup working at minute 20 (checkpoint 1).

**Non-Goals:**
- Any console or phone UI beyond the checkpoint lists (that's `web-console` and `mobile-problems-feed`).
- The AI route, deploy, and the README beyond the skip entry.
- A Go service (cut; Track D2 is done as a pairing session in the demo).
- Shared state between devices, or mock state that survives a reload.
- Server-sent events (the wishlist argues for them; the mock uses polling).

## Decisions

**D1. pnpm workspaces, source-only packages, no Turborepo.**
Packages export `.ts` directly. Next uses `transpilePackages`, and Metro compiles TS itself. *Alternatives:* tsup builds (stale `dist/` bugs, extra step) and Turborepo (caching saves nothing in a one-day repo). *Fallback, decided in advance:* if Metro can't resolve the workspace packages under pnpm's isolated layout, set `node-linker=hoisted` in `.npmrc` and don't debug further.

**D2. A transport-free engine: `handle(Request): Promise<Response>`.**
It's built on web-standard types that exist in browsers, in Node 18+ and in React Native.
```
           packages/mock  engine.handle(Request) -> Response
                 |                 |                    |
   web: MSW http.all('/api/*')   mobile: fetch = (i, init) =>      tests: call
        -> engine.handle(req)        engine.handle(new Request(..))       directly
```
*Alternative:* `msw/native` on mobile, which needs a polyfill stack in the riskiest setup step. *Side benefit:* the same engine could sit behind a Node or Next route later without a rewrite (not in scope).

**D3. Chaos decided by hash, not by a seeded sequence.**
`writeFails = hash(chaosSeed, listingId, attempt) % 100 < failRate`. A seeded random generator draws numbers in request order, and polling, StrictMode double effects and parallel bulk ops all make that order unpredictable. Hashing makes "which rows fail" a pure function, so Playwright can call the same helper to know in advance which rows will fail. 429s depend on order and are switched off in e2e (`rate429=0`); the Retry-After logic gets a Vitest test instead. The data seed and the chaos seed are separate.

**D4. The engine keeps state in memory and drifts on a timer.**
State is a `Map<id, Listing>`, plus a change log with a monotonic sequence number (`changesCursor` = the sequence number) and an idempotency store keyed by Idempotency-Key. Every ~2–4 s a drift tick changes a few sync entries (and sometimes `listedQuantity`), appends them to the log, and resolves pending entries older than the tick to live or error. A `/changes?since=n` call returns log entries after `n`. One seeded "edited elsewhere" price change fires once, about 60 s after start, so the 409 path can be demonstrated. State is never persisted: a reload regenerates it from the seeds. *Alternative rejected:* IndexedDB persistence. Every reload starting clean makes demos and tests repeatable, and it avoids a second source of truth.

**D5. Opaque base64 keyset cursors.**
The list cursor encodes `{sortKey, id}` of the last row, so pagination behaves the way a keyset cursor would at 50k rows, and `total` is computed per filter. The client must treat cursors as opaque.

**D6. Version in the body, not `If-Match`.**
Bulk has to carry per-item versions in the body anyway, so PATCH does the same. That gives one conflict mechanism. ETags are left to the wishlist, for GET caching only.

**D7. Domain rules live in `contract`, next to the schemas.**
`isProblem`, `problemRank`, `priceHealth`, `STALE_PENDING_MS` (30 s, compressed for the mock), `PRICE_BANDS` and `SUGGESTION_CLAMP` are all pure functions and constants. The mock's `problem=any` filter, the web count, `n`/`N` and the phone feed all import them, so they can't disagree.

**D8. Client: an injected fetch, with TanStack Query cache shape "Option Y".**
`createClient({ fetch, baseUrl })` returns typed functions that parse responses with zod. Query keys are `['listings', filters]` (pages of ids + total) and `['listing', id]` (one Listing, filled in from each page). `applyChanges(queryClient, changes)` writes only `['listing', id]`. The optimistic and rollback logic, and the bulk retry/undo builders, are pure functions with the query-specific wiring kept thin around them, so Vitest can test them without React. *Alternative:* rows reading from the page arrays, where one change re-renders every visible row. That will be measured as the "before" in `web-console`.

**D9. Tokens as a TS object, turned into CSS variables at render time.**
`tokens.ts` exports the values. `toCssVars(tokens, density)` produces the CSS for the `:root` and `[data-density=compact]` blocks, which the Next root layout inlines in a `<style>` tag. React Native imports the object. *Alternative:* a generated `tokens.css` file (one more build step to forget). *Accepted cost:* `var(--…)` names in CSS Modules aren't type-checked.

**D10. Fixtures from a deterministic generator.**
`generate(dataSeed)` uses mulberry32 and covers 18 fictional events over about 120 days, about 500 listings, ~80/8/5/7% live/pending/error/not_listed, ~2% quantity mismatches, and prices spread so every price band appears. `venue.ts` hand-authors 16 polygons (2 floor, 8 lower bowl, 6 upper) whose ids are the section values. Templates (7, labelled invented): below minimum price (with a £ floor), quantity exceeds inventory, event mapping not found, auth token expired, marketplace timeout, duplicate listing, and an injection template. The second injection fixture goes in one event name.

**D11. Matching React versions.**
Both apps use the React major version the current Expo SDK supports. Next is pinned to a version compatible with it, and checked at checkpoint 1.

## Risks / Trade-offs

- [Metro fails to resolve workspace packages under pnpm] → D1 fallback (`node-linker=hoisted`), stopping after 20 min.
- [The MSW service worker later conflicts with a PWA service worker] → not relevant, since mobile is Expo. Web registers only MSW.
- [Mock state is per tab and lost on reload] → accepted and stated in the README. Edits made on the phone don't show on desktop.
- [Drift timer keeps running in hidden tabs] → the engine keeps time, but clients pause polling when hidden (`web-console`).
- [Chaos breaks Playwright runs] → hash-based failures, `chaos=off` / `rate429=0` / `latency` overrides.
- [`client` becomes an unused abstraction if Track B is cut] → accepted. Moving it into a package at hour 7 would be worse.
- [CSS variable typos fail silently] → accepted; a lint check is an optional extra.

## Migration Plan

Greenfield, so there's nothing to migrate. Rollback means reverting commits. Each task group ends in its own commit (no squash).
