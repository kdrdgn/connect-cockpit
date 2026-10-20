# Proposal

## Why

Button emphasis in the console does not follow consequence. In the sync drawer, "Confirm delist" is the loudest control on screen and it is styled in the accent "go" colour. Retry, Edit price and Delist… look almost the same, so nothing marks the recommended next step. The AI panel can also show "Suggested: Retry sync" right above an identical Retry button. The bulk flows have the same problem: a bulk delist is applied with an accent-blue button, and the result dialog emphasises "Close" even when rows failed.

## What Changes

- Add an app-wide button hierarchy with four variants, each with one meaning:
  - **primary**: the single recommended next step, at most one per section.
  - **danger** (new, filled like primary): confirms a destructive action or marks a system rollback.
  - **default**: a reasonable alternative.
  - **ghost**: an escape, or the start of a flow.
- Widen the danger colour role from "rollback only" to "a system rollback, or confirming an action that removes something". "Rollback" means the system reverting a rejected edit. A user-initiated Undo is not a rollback and stays default.
- Sync drawer, action row in error state: Retry sync becomes primary and keeps a fixed position. Edit price moves from ghost to default. "Delist…" and "Keep listed" stay ghost. "Confirm delist from X" moves from primary to danger.
- Sync drawer, AI suggestion: a suggestion button appears only when it differs from an action already in the row. A "retry" suggestion shows its explanation with no button. The action row's emphasis never changes when the explanation loads.
- Bulk preview: Apply is danger when the intent is delist and stays primary for a price change. The label stays "Apply to N listings".
- Bulk result, when some ops failed: "Retry failed" takes the original intent's variant (primary for price, danger for delist), and Close becomes default. Initial focus stays on Close, so Enter never sends another write. The same variant applies where "Retry failed" appears again in the bulk bar.
- Danger text uses the surface colour, the same way primary does. No new colour tokens are needed: the existing danger values reach about 7:1 in light and about 6.9:1 in dark.
- Out of scope: other buttons (filters, toasts, popovers, demo panel, problem nav, chips), which already follow the hierarchy. Bulk-apply labels and Undo's variant also stay as they are.

## Capabilities

### New Capabilities

None. The button hierarchy lives with the colour rules in `design-tokens`.

### Modified Capabilities

- `design-tokens`: the colour budget widens the danger role and defines "rollback". A new requirement adds the button hierarchy (variant meanings, one primary per section, danger as a filled confirm).
- `sync-drawer`: the marketplace action row gets fixed emphasis (Retry primary in error state, Edit price default, Delist… ghost), and the delist confirmation becomes danger.
- `sync-explain`: a suggestion matching an action already in the row shows no duplicate button. This changes the scenario that requires "one suggested action" to appear.
- `bulk-actions`: Apply uses danger for a delist intent. "Retry failed" follows the intent's variant, Close becomes default when ops failed, and initial focus stays on Close.

## Impact

- `apps/web/src/ui/Button.tsx`, `Button.module.css`: new `danger` variant.
- `apps/web/src/console/Drawer.tsx`: action-row variants and the delist confirm.
- `apps/web/src/console/ExplainPanel.tsx`: hide the suggestion button when it matches the row's Retry. Update the "rollback" comment in `ExplainPanel.module.css`.
- `apps/web/src/console/BulkActions.tsx`: Apply variant by intent, `LastBulkActions` variant by intent, Close variant when ops failed.
- Tests and e2e that check button roles or focus in the drawer and bulk dialogs (`drawer.spec.ts`, `explain.spec.ts`, `edit-bulk-undo.spec.ts`, `ExplainPanel.test.tsx`).
- No API, contract, token value or mobile changes.
