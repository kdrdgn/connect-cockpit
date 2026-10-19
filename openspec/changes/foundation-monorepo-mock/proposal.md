# Proposal

## Why

Every later track depends on the same building blocks: the web console, the AI error explainer, the Expo problems feed and the API wishlist all need one listing contract, one mock API that misbehaves on purpose, and one set of design tokens. If these get built inside the web app first and pulled out later, that refactor lands at hour 7. Building them first, as shared packages, also tests the riskiest setup step (Expo + Metro inside a pnpm monorepo) in the first 20 minutes instead of at the end.

## What Changes

- Set up a pnpm-workspace monorepo with `apps/web` (Next.js App Router, TS strict) and `apps/mobile` (Expo), plus four source-only packages: `contract`, `mock`, `client`, `tokens`. No Turborepo, no package build step. Pin React to one major version across both apps.
- `packages/contract`: zod schemas that define the API types once. Extends the brief's `Listing` with `version` and per-marketplace `listedQuantity`. Also holds the shared domain rules: `problem=any`, `problemRank`, `priceHealth` bands (±5 / ±15), the stale-pending threshold, and the AI price clamp constant (±30%).
- `packages/mock`: a transport-free engine, `handle(Request) → Response`. It covers list (cursor, filters, sort, total), changes-since polling, PATCH, bulk with per-item results and an idempotency key, retry-sync, and history. Bad behaviour is on purpose: 300–800 ms latency, about 15% write failures decided by hash, about 1 in 20 reads returning 429 with `Retry-After`, and sync drift. All of it is controlled by URL/config params, with a seeded "edited elsewhere" event. Fixtures come from a deterministic generator: about 500 listings, 18 fictional events, one fictional 16-section venue as SVG polygons, 7 error templates labelled as invented, and 2 prompt-injection fixtures.
- Adapters: an MSW adapter for web, an injectable fake `fetch` for mobile, and direct calls in Vitest.
- `packages/client`: a typed fetch client with an injectable transport, a `Retry-After`-aware retry policy, an error envelope parser, and the optimistic-update and rollback logic. TanStack Query hooks follow Option Y: per-listing cache entries plus ID lists.
- `packages/tokens`: spacing, type scale, density (compact 28 px / comfortable 40 px), colour roles (no green, amber for attention, red only for rollback), radius and motion, with a `toCssVars()` helper for web. Dark values are defined and marked as not contrast-verified.
- Checkpoint 1: the web and mobile apps each render a list served by `packages/mock`.

## Capabilities

### New Capabilities
- `listing-contract`: the listing data model, API request/response shapes, the error envelope, and shared domain rules (problem detection, problem ranking, price health, the price clamp).
- `mock-api`: listings API behaviour: endpoints, filtering and pagination, versioned writes, bulk with idempotency, sync drift, and controllable chaos.
- `api-client`: client-side transport, retry and rate-limit handling, error parsing, and optimistic updates with rollback.
- `design-tokens`: the single source of design values shared by web and mobile, including density modes and colour roles.

### Modified Capabilities
<!-- none: no existing specs -->

## Impact

- New repo structure: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `apps/*`, `packages/*`.
- Dependencies: next, react, expo, react-native, zod, msw, @tanstack/react-query, vitest. Later changes add nuqs, zustand and @tanstack/react-virtual.
- No backend and no deployed services yet. Deploy, the AI route, the console UI and the mobile UI belong to later changes (`web-console`, `ai-sync-explain`, `mobile-problems-feed`, `docs-api-wishlist`).
- README "What I skipped and why" gets its first entry: the Go mock service (Track D2) is cut, and Go will be done as a pairing session in the demo.
