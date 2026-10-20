# Tasks

## 1. Danger variant and colour rule

- [x] 1.1 Add `danger` to `Button`'s `Variant` type and a `.danger` rule in `Button.module.css` mirroring `.primary` (danger fill and border, surface text, brightness hover), placed before the `:disabled` rules. Verify a disabled danger button renders flat, the same as a disabled primary.
- [x] 1.2 Add a token test that surface text on the danger fill is at least 4.5:1 in the light theme, next to the existing contrast checks in `packages/tokens/src/tokens.test.ts`. Verify with `pnpm test`.
- [x] 1.3 Update the "danger is reserved for rollbacks" comment in `ExplainPanel.module.css` to the widened meaning (a system rollback or confirming a removal). Verify by reading the file.

## 2. Sync drawer emphasis

- [x] 2.1 In `MarketplaceSection`, make Retry sync `primary` when offered, and `default` while the delist confirmation is open. Make Edit price `default`, keep "Delist…" and "Keep listed" `ghost`, and make "Confirm delist from X" `danger`, keeping its `autoFocus`. Verify with a component test asserting each button's class in the error, confirming and live states.
- [x] 2.2 In `Explanation`, render no suggestion button when the action is `retry`, and keep the explanation and cause visible. Verify with an `ExplainPanel.test.tsx` case showing a retry suggestion renders no "Suggested:" button, and that the existing adjust-price and delist suggestion tests still pass.
- [x] 2.3 Add an e2e check in `drawer.spec.ts` or `explain.spec.ts` that the action row's buttons keep the same order and classes before and after the explanation arrives, and that an errored section has exactly one Retry sync. Verify with `pnpm e2e`.

## 3. Bulk emphasis

- [x] 3.1 In `BulkDialog` preview, make Apply `danger` when `bulk.intent.kind === "delist"` and `primary` otherwise, with the label unchanged. Verify with a component test for both intents, and with the existing `/^Apply to/` e2e selectors still passing.
- [x] 3.2 In `LastBulkActions`, make "Retry failed" `danger` when the failed ops are delist ops and `primary` otherwise (a failed undo-of-delist sends relists, so it's primary). Keep Undo `default`. Verify with a test covering a failed delist, a failed price change and a failed relist undo, in both the dialog and the bulk bar.
- [x] 3.3 In the result dialog, make Close `default` when any op failed and `primary` otherwise, keeping `autoFocus` on Close. Verify with a test of both cases, and an e2e check in `edit-bulk-undo.spec.ts` that pressing Enter on a result with failures closes the dialog and sends no write.

## 4. Integration check

- [x] 4.1 Run `pnpm typecheck`, `pnpm test` and `pnpm e2e`, then open the console and check by eye that no drawer section, dialog footer or bulk bar shows two filled buttons at once, in the light and dark themes.

## Workflow follow-up

- Archive the change once reviewed, so the deltas merge into `design-tokens`, `sync-drawer`, `sync-explain` and `bulk-actions`.
