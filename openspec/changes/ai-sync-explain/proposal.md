# Proposal

## Why

A broker who opens an errored listing sees a raw marketplace message ("Seller authentication expired…", "below the event minimum of £96") and has to work out the fix alone. Track C asks for one AI feature against a real model. "Explain and fix a sync error" is the one we chose, because it answers feedback #4 directly and fills the slot the drawer already reserves. It also lets us show the three Track C rules in the demo: validated output, untrusted input, and no destructive action without a human.

## What Changes

- **Explain on open.** When the drawer shows a marketplace in error, an explanation loads by itself: what went wrong in plain words, a cause, and **one** suggested action (retry, adjust price, delist, or none). The manual Retry / Edit price / Delist buttons render straight away and never wait for it.
- **The model classifies and explains; code decides.** The model's output is a closed schema (enums plus a short text) validated with zod before it reaches the UI. It never names a listing id or a final amount. For "adjust price" the client computes the price from `marketPrice` and an optional floor the model read from the error, clamps it with the existing `clampSuggestion` (±30% of market), and opens the existing inline price editor pre-filled, so Enter confirms.
- **Suggestions are shortcuts to manual actions.** A suggested retry runs the same retry; a suggested delist opens the same two-step confirm. There is no new write path.
- **Untrusted input.** Only the fields needed are sent (no event name, venue or id). The error text is truncated, stripped of markup and wrapped as data, and the system prompt says so. The two planted injection fixtures become eval cases.
- **States.** Loading, timeout (~6 s), failure and rejected output all collapse to "No suggestion" with "Try again". The manual path is unchanged.
- **Server route with the key.** `POST /api/ai/explain-sync` is a Next route handler; `ANTHROPIC_API_KEY` stays on the server and is never committed. Without a key, a **clearly labelled mock explainer** answers behind the same interface.
- **Cost and evidence.** Identical errors are answered from a cache. Each response reports tokens, latency and whether it was cached. A five-input eval set, runnable with one command, and a README section cover the model choice, tokens and latency, one cost-reduction idea, and what we do when the model is wrong.

## Capabilities

### New Capabilities
- `sync-explain`: explaining a marketplace sync error and proposing one human-confirmed action, including the output schema, untrusted-input handling, failure states, caching and the eval set.

### Modified Capabilities
- `sync-drawer`: the "Space for an explanation" requirement now holds the explanation, while still requiring the manual actions to be complete on their own when no explanation is available.

## Impact

- `packages/contract`: explain request and result schemas, the cause and action enums, and a pure `suggestPrice` built on `clampSuggestion`.
- `packages/client`: `explainSync` and a `useExplainSync(listing, marketplace)` hook. Mobile can reuse both later, given a server origin.
- `apps/web`: the route under `src/app/api/ai/explain-sync/`, server-only explainer code (prompt, Anthropic provider, mock provider, cache), the drawer's `ExplainSlot`, an eval script, and README sections.
- New dependency: `@anthropic-ai/sdk` in `apps/web` (server only).
- Out of scope: the phone UI (that's `mobile-problems-feed`, which reuses the contract and client), deployment and its env setup, per-user rate limiting of the route, and the natural-language filter and price suggestion options.
