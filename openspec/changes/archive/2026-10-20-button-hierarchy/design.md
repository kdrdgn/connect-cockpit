# Design

## Context

`Button` (`apps/web/src/ui/Button.tsx`) has three variants: `default` (outlined), `primary` (accent fill, surface text) and `ghost` (no border or fill). All emphasis in the console comes from choosing among these at each call site. There is no danger variant, though the `--color-danger` and `--color-danger-bg` tokens already exist and are used by toasts.

The places that break the hierarchy (see proposal.md - What Changes) are all in three files: `Drawer.tsx` (`MarketplaceSection`), `ExplainPanel.tsx` (`Explanation`) and `BulkActions.tsx` (`BulkDialog`, `LastBulkActions`). `LastBulkActions` renders in both the result dialog footer and the bulk bar, so one change covers both places.

## Goals / Non-Goals

**Goals:**
- Add a `danger` variant to the existing `Button`, with no new tokens.
- Choose each variant from state the component already has, without new store fields.

**Non-Goals:**
- No lint rule or runtime check for "one filled button per section". It's enforced by review and by the tests named below.
- No change to `IconButton`, the mobile app, or the token values.

## Decisions

### Danger is a fourth `Button` variant that mirrors `.primary`
`.danger` sets the border and background to `--color-danger` and the text to `--color-surface`, with the same `brightness(1.1)` hover as primary. The existing `:disabled:not(.ghost)` rule already flattens it when disabled, because it comes last in the file.
*Alternative:* a separate `DangerButton` component. Rejected because every other emphasis is a variant, and a separate component would bypass the shared disabled and focus styling.

### The drawer's Retry is primary unless a delist confirmation is open
`MarketplaceSection` already has `canRetry` and `confirmDelist`. Retry's variant is `confirmDelist ? "default" : "primary"`, which keeps one filled control per section (design-tokens: One filled button per section). Retry is primary for error, stale and mismatch alike. The spec only describes error, but every state where Retry is offered is a broken one, and the recommendation is the same.
*Alternative:* hide Retry while confirming. Rejected because it changes the layout under the cursor, the same problem decision 2 avoided.

### The suggestion button is dropped for `retry`, not just restyled
In `Explanation`, when `suggestion.action === "retry"`, the button isn't rendered. The explanation text and cause stay. `suggestionFor` is unchanged, so the eval and policy code that read the action keep working. Other suggestions render as `default` (they already do; the spec now pins it).

### Bulk danger is decided by the ops' type, not by `intent.kind`
- Preview Apply: `bulk.intent.kind === "delist" ? "danger" : "primary"`.
- `LastBulkActions` "Retry failed": danger when the failed ops are `delist` ops. Reading the ops rather than `last.intent` matters for undo: retrying a failed undo of a delist re-sends `relist` ops, and a relist removes nothing, so it should be primary even though the intent was a delist.
- Result dialog Close: `failed > 0 ? "default" : "primary"`. `autoFocus` stays on Close in both cases.

## Risks / Trade-offs

- [Two filled buttons at once in the bulk bar, if a stale result stays visible next to a future primary control] → Today the bar has no primary controls (Preview buttons are default), so this can't happen. The design-tokens requirement makes adding one a visible spec violation.
- [Emphasis on Retry failed and focus on Close are on different controls, which can feel inconsistent with keyboard use] → This is deliberate (bulk-actions: Result dialog emphasis and focus). An e2e check that Enter sends no write keeps it from regressing.
- [Dark theme: surface text on the danger fill is not formally verified] → Per design-tokens, dark values are marked as not contrast-verified. The measured value is about 6.9:1.
- [Tests that count Retry sync controls could pick up a removed suggestion] → No current test selects "Suggested: Retry sync" (only the adjust-price and delist suggestions are selected), so nothing breaks. A new test pins the single control.
- [Emphasis is only visible as a CSS class, so it's easy to regress silently] → Component tests assert on the `Button.module.css` class names, following the pattern in `PriceGap.test.tsx`.
