# Tasks

## 1. Workspace scaffold (checkpoint 1 risk first)

- [x] 1.1 Create root `package.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`) and `.gitignore`; verify `pnpm install` succeeds
- [x] 1.2 Scaffold `apps/mobile` with the current Expo SDK (TypeScript template) and record its React version; verify `pnpm --filter mobile start` opens and renders the default screen
- [x] 1.3 Scaffold `apps/web` with Next.js App Router, TS strict, pinned to the same React major version as mobile; verify `pnpm --filter web dev` serves the default page and `tsc --noEmit` passes
- [x] 1.4 Create empty source-only packages `@cockpit/contract`, `@cockpit/mock`, `@cockpit/client`, `@cockpit/tokens` (each exporting `./src/index.ts`), add `transpilePackages` in Next and the workspace deps in both apps; verify a `hello` export from each package renders in web and mobile (apply the `node-linker=hoisted` fallback if Metro can't resolve the packages)
- [x] 1.5 Add Vitest at the root, with a workspace config covering `packages/*`; verify `pnpm test` runs and reports zero tests without error

## 2. Contract (`packages/contract`)

- [x] 2.1 Define zod schemas for Marketplace, SyncState, SyncEntry (with `listedQuantity?`) and Listing (with `version`), and export inferred types; verify with Vitest that a valid listing parses and an unknown sync state fails naming the field
- [x] 2.2 Define schemas for the list query/response, changes response, PATCH body, bulk request/response (setPrice / delist ops, per-item results), retry-sync, history and the error envelope (closed code set); verify with Vitest that a CONFLICT envelope requires the current listing and RATE_LIMITED carries `retryAfterMs`
- [x] 2.3 Implement `priceHealth`, `PRICE_BANDS` and `clampSuggestion` (±30%); verify Vitest cases: +15% → above, 131/100 → overpriced +31%, suggestion 1 with market 100 → 70
- [x] 2.4 Implement `problemsOf(listing, now)`, `isProblem`, `problemRank` and `STALE_PENDING_MS`; verify Vitest cases: mismatch is a problem, fresh pending is not, underpriced is not, mismatch outranks a sooner error, same kind ranks by date

## 3. Fixtures (`packages/mock`)

- [x] 3.1 Hand-author `venue.ts` with 16 sections (2 floor, 8 lower, 6 upper) as SVG polygons with ids and labels; verify with a Vitest test that all ids are unique and every polygon has 3 or more points
- [x] 3.2 Write `templates.ts` with the 7 invented error templates (labelled invented in a header comment) and the two injection strings; verify each template renders to a non-empty string
- [x] 3.3 Implement `generate(dataSeed)` (mulberry32, 18 fictional events, about 500 listings, the state distribution from the design, ~2% mismatches, all price bands present, one injected lastError and one injected event name); verify Vitest checks: identical output for the same seed, every section exists in the venue, exactly one of each injection, every band appears

## 4. Mock engine (`packages/mock`)

- [x] 4.1 Implement engine state (Map, change log with sequence cursor, idempotency store) and chaos config parsing (`chaos`, `seed`, `latency`, `failRate`, `rate429`) with brief-matching defaults; verify with Vitest that `chaos=off` yields zero failures and zero 429s across 200 calls
- [x] 4.2 Implement `GET /listings`: AND across filter kinds, OR within `sync`, `problem=any` using contract rules, sort, opaque keyset cursor, `total`, `changesCursor`; verify Vitest cases for `sync=stubhub:error`, OR plus section, and a full cursor walk returning each match exactly once
- [x] 4.3 Implement `PATCH /listings/:id` with version check (409 + current), version increment, and live → pending propagation; verify Vitest cases for a stale version (no change) and a write setting StubHub to pending
- [x] 4.4 Implement `POST /listings/bulk` with per-item results, hash-based failures `hash(seed,id,attempt)` exported as `writeFails`, and Idempotency-Key replay; verify Vitest cases: the same failures in shuffled order, replay returns the identical body with no double apply, and a retried failure counts as a new attempt
- [x] 4.5 Implement `POST /listings/:id/retry-sync` and `GET /listings/:id/history`; verify with Vitest that retry sets pending and adds a newest-first history entry
- [x] 4.6 Implement the drift tick (sync/lastError/updatedAt/listedQuantity only, pending resolution, the single seeded "edited elsewhere" price change) and `GET /listings/changes?since`; verify with Vitest (fake timers) that changes arrive and no price changes except the seeded event
- [x] 4.7 Implement the latency wrapper (300–800 ms default) and read 429s (`Retry-After` seconds + envelope); verify with Vitest that default latency stays within bounds and a forced 429 has the right header and envelope

## 5. Transports

- [x] 5.1 Add an MSW adapter (`http.all('/api/*')` → `engine.handle`) and register it in `apps/web` on the client before the first fetch; verify in the browser that `/api/listings` returns data with visible latency in DevTools
- [x] 5.2 Add the in-process fetch adapter for mobile; verify the Expo app logs a successful `/api/listings` response

## 6. Client (`packages/client`)

- [x] 6.1 Implement `createClient({ fetch, baseUrl })` with zod-validated responses and envelope parsing (an invalid body becomes INTERNAL); verify with Vitest against the engine that a malformed body yields INTERNAL
- [x] 6.2 Implement the read retry policy honouring `Retry-After` (exposing the remaining wait) and no automatic write retry; verify Vitest cases for a 3 s wait then retry, and a PATCH 429 that isn't retried
- [x] 6.3 Implement the TanStack Query keys and hooks (Option Y: id-pages + per-listing entries), `applyChanges` and the optimistic edit with exact rollback; verify with Vitest that a failed write restores 120, a success stores the server version, and one change replaces only one entry's identity
- [x] 6.4 Implement the pure bulk helpers `failedOps(results)` (new idempotency key) and `buildUndo(results, before)` (reverses successes only; delist → relist); verify Vitest cases for 6 of 40 failed → 6 retried, and undo with 34 ops

## 7. Tokens (`packages/tokens`)

- [x] 7.1 Define the token object (spacing, type, density, colour roles with no green, radius, motion, dark values marked not verified) and `toCssVars()`; verify with a Vitest snapshot of the generated CSS and a test that no role is named or valued as green
- [x] 7.2 Add a contrast check (WCAG ratio function) over the light-theme text roles against their surfaces; verify with Vitest that every pair is at least 4.5:1, attention text included
- [x] 7.3 Inline `toCssVars()` output in the Next root layout, with `prefers-reduced-motion` setting durations to 0; verify in DevTools that `--space-4` and the density variables switch with `data-density`

## 8. Checkpoint 1 and integration

- [ ] 8.1 Render a plain list of the first 50 listings (event, section, price) from `packages/mock` through `packages/client` in both `apps/web` and `apps/mobile`; verify both show data after the 300–800 ms delay
- [x] 8.2 Start the README with how to run and the first "What I skipped and why" entry (Go mock service cut; Go done as a pairing session in the demo); verify the run commands work from a fresh clone
- [x] 8.3 Run `pnpm -r exec tsc --noEmit` and `pnpm test`; verify both pass with zero errors

## Workflow follow-up

- Archive this change once checkpoint 1 is demoed, then propose `web-console`.
