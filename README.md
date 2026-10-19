# Connect Cockpit

A broker console for ~500 ticket listings synced to four marketplaces: a Next.js web console and an Expo phone app, both running against a mock API that misbehaves on purpose.

## How to run

Requires Node 20+ and pnpm 11.

```bash
pnpm install
pnpm dev:web        # http://localhost:3000
pnpm dev:mobile     # Expo dev server; open in Expo Go
pnpm test           # Vitest across packages
pnpm typecheck      # strict tsc in every package and app
```

### Mock controls (URL params on the web app)

| Param | Default | Meaning |
|---|---|---|
| `chaos` | `on` | `off` = no failures, no 429s, 0–20 ms latency |
| `seed` | random per page load | which writes fail (same seed, same rows fail) |
| `dataSeed` | fixed | which listings are generated |
| `latency` | `300-800` | per-call delay range in ms |
| `failRate` | `15` | % of write attempts that fail |
| `rate429` | `5` | % of reads that return 429 with `Retry-After` |

Example: `http://localhost:3000/?seed=42&failRate=50` makes failures easy to demo.

**Mock state resets on reload by design**, so every session starts from the same seeded data. Edits made on the phone do not appear on the web, because each runs its own copy of the mock.

## Architecture

```
apps/web        Next.js App Router (console)
apps/mobile     Expo (problems feed)
packages/
  contract      zod schemas -> the only API types; shared rules (problems, ranking, price health)
  mock          transport-free engine: handle(Request) -> Response; fixtures, drift, chaos
  client        typed fetch client, Retry-After handling, TanStack Query cache, optimistic edits
  tokens        design tokens -> CSS variables on web, plain values on mobile
```

The mock engine is reached three ways with identical behaviour: MSW in the browser, an in-process `fetch` on mobile, and direct calls in Vitest. Which writes fail is decided by `hash(seed, listingId, attempt)`, so failures do not depend on request order and tests can predict them.

Packages ship TypeScript source with no build step: Next uses `transpilePackages`, and Metro compiles TS itself.

## What I skipped and why

- **Go mock service (Track D2).** Cut to protect Track A; the mock is TypeScript only. I would rather make the Go change together in the demo, where how I read and steer the diff is visible, than ship ~150 lines I could not defend line by line. <!-- TODO(author): state your actual Go experience here in one honest line. -->

## Running the mobile app

The phone app has its own in-process copy of the mock, so it needs no server. Start it with `pnpm dev:mobile` and scan the QR code with Expo Go.

## Fixtures

Artists, venue and error messages are fictional. The 7 `lastError` templates in `packages/mock/src/templates.ts` are **invented**; no real marketplace samples were available. Two prompt-injection fixtures are planted on purpose (one in a `lastError`, one in an event name) to test the AI feature's defences.
