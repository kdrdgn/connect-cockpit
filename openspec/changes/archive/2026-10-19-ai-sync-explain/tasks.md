# Tasks

## 1. Contract and pure logic

- [x] 1.1 Add `packages/contract/src/explain.ts` with `ExplainRequest` (no event, venue or id fields; `lastError` ≤ 2,000), `ExplainModelOutput` (280-character explanation, 7-value cause, 4-value action, confidence, optional `floor`) and `ExplainResponse` (result or null, reason, meta), exported from the index; verify Vitest cases that "delist_all" and a 600-character explanation are rejected and that an event field is stripped or rejected
- [x] 1.2 Add `suggestPrice({ floor, marketPrice })` → `{ price, capped }` on top of `clampSuggestion`; verify Vitest cases 96/120 → 114 not capped, 500/100 → 130 capped, and no floor at 120 → 114

## 2. Server pipeline (`apps/web/src/ai`)

- [x] 2.1 Add `@anthropic-ai/sdk` and `server-only` to `apps/web`, and create `ANTHROPIC_API_KEY` / `AI_PROVIDER` / `AI_MODEL` handling plus an `.env.example` with empty values; verify `pnpm install`, `pnpm typecheck` and `git check-ignore apps/web/.env.local`
- [x] 2.2 Implement `prompt.ts` (`PROMPT_VERSION`, static system prompt, sanitise → truncate to 500 → `<untrusted_error>` wrap, facts as JSON); verify Vitest cases that `<`/`>` and control characters are stripped, a 900-character error ends at 500 characters plus "…", and the built messages never contain the `INJECTION_EVENT` text when given a listing that has it
- [x] 2.3 Implement `policy.ts` (`applyPolicy`: instruction-like pattern list → flagged, cause unknown, delist and adjust_price downgraded to none, "looks unusual" prefix; `floor` sanity range); verify Vitest cases with `INJECTION_ERROR` + action delist → none and flagged, and floor 5,000 at market 100 → dropped
- [x] 2.4 Implement the `Explainer` interface, the Anthropic explainer (`claude-haiku-5-5` unless `AI_MODEL` is set, temperature 0, `max_tokens` 300, `maxRetries` 0, one forced `report_sync_error` tool from `z.toJSONSchema`) and the keyword-rule mock (about 400 ms, `source: "mock"`); verify a Vitest case where the mock answers all seven templates with schema-valid output, and a test with an injected fake SDK client that confirms the request carries the forced tool and no event name
- [x] 2.5 Implement the LRU cache (500 entries, key `sha256(model, PROMPT_VERSION, marketplace, sanitisedError)`, valid results only) and the route `src/app/api/ai/explain-sync/route.ts` (zod-parsed body → 400; cache; 5.5 s server timeout; parse, then policy; the status mapping from design X9; meta with tokens, latency, cached, source; server log on failure); verify Vitest route tests with fake explainers covering valid → 200, invalid output → 200 + null, a hang → 504 under fake timers, an SDK throw → 502, and a second identical call → `cached: true` with zero tokens

## 3. Client and drawer UI

- [x] 3.1 Add `explainSync(body, signal)` to `packages/client` (same-origin `/api/ai/explain-sync`, 6 s `AbortSignal.any`, zod parse of `ExplainResponse`) and `useExplainSync(listing, marketplace)` (key `['explain', marketplace, lastError]`, `staleTime: Infinity`, `retry: 0`, enabled only in error); verify Vitest cases that a slow fetch aborts at 6 s and that a non-error entry makes no request
- [x] 3.2 Generalise the drawer's handlers (`onRetry`, `onEditPrice(initial)`, `onDelist` → sets the existing confirm) and build `ExplainPanel` in `ExplainSlot` (status line "Reading the error…", explanation, cause in words, one "Suggested: …" button, "No action suggested", "Low confidence", flagged in attention style, "Mock AI" chip, "No suggestion" + "Try again", polite live region, no focus moves) with a CSS Module using only token variables; verify RTL cases that manual actions render while loading, "Adjust price to £114" puts the price cell in edit mode with 114 and sends no PATCH, a suggested delist shows "Confirm delist from SeatGeek", and a failure shows Try again with no toast
- [x] 3.3 Run the app without a key and with `?seed=` set; verify in the browser that the injection listing's SeatGeek section shows a flagged, non-delist suggestion with the "Mock AI" chip, that a repeated error is served cached (meta in the network panel), and that keyboard focus stays on the drawer heading when the explanation arrives
- [x] 3.4 Add a Playwright spec that stubs `/api/ai/explain-sync` with `page.route`, opens an errored row, checks the suggestion text and activates "Adjust price", expecting the price cell in edit mode with the value filled in; verify it passes three times in a row alongside the existing specs

## 4. Evals and README

- [x] 4.1 Add `src/ai/evals.ts` (the five cases from design X11), `explain.eval.ts`, `vitest.eval.config.mts` (node environment, eval files only), `"eval"` scripts in `apps/web` and the root, and confirm `pnpm test` does not pick up eval files; verify `pnpm eval` prints the five-row table (raw answer, after policy, pass, tokens, latency) against the mock without a key, and exits non-zero when case 5 is forced to delist
- [x] 4.2 Run `pnpm eval` with a real key if one is available, and record the results; verify the numbers in the README come from that run, or that the README says plainly that only the mock was run
- [x] 4.3 Write the README "AI feature" section: what the model may decide, the injection defence layers with file pointers, model choice and why, measured tokens and latency per call, the cost-reduction idea (digit-masked template key), the eval table, what we do when the model is wrong, and how to set the key (`.env.local`, never committed); update the feedback-log entry for #4 to mention the explanation; verify every command in the section runs as written

## 5. Final check

- [x] 5.1 Run `pnpm typecheck`, `pnpm test`, `pnpm e2e` and `pnpm --filter web build`, then search `.next/static` for `ANTHROPIC` and the key value; verify everything passes with zero errors and the search finds nothing

## Workflow follow-up

- Archive this change after review, then `mobile-problems-feed` can reuse `useExplainSync` and `suggestPrice` on the phone's problem detail.
