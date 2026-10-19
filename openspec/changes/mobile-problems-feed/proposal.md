# Proposal

## Why

The founder's feedback #5: "My phone is always in my hand. Can I fix one listing from the sofa in under 20 seconds?" Track B asks for a decision note (React Native, Swift or PWA) and a phone slice: a problems feed where the broker taps a listing, retries a sync in one tap or makes a quick price edit, all within 20 seconds. Today `apps/mobile` is only the foundation's checkpoint list, which proves contract → mock → client → UI on a phone and nothing more.

## What Changes

- **Problems feed.** The app opens on a list of listings that need the broker, worst first, using the shared ranking from `packages/contract`: quantity mismatch, error, stale pending, overpriced, then ordinary pending, muted at the bottom. Each row names the event, seats, which marketplace, and what's wrong in words, and has a one-tap Retry when retrying makes sense.
- **Listing detail.** Tapping a row shows the four marketplaces' states and the full error text. It offers Retry sync per marketplace, a quick price edit, and delist with a native confirmation.
- **Quick price edit.** A sheet pre-filled with the current price, with ±£1 steppers and a numeric keypad. Saving is optimistic; a failed save rolls back and says why, with Retry.
- **Live while open.** The feed polls for changes the way the console does. Polling stops when the app is backgrounded and catches up once on return. Rows update in place; the order is recomputed only on pull to refresh or on returning from detail, so nothing jumps under the broker's thumb.
- **Phone-grade touch and accessibility.** Every control is 44 points or more, everything has an accessible name and role, status is never colour alone, and it all works at 390 points wide.
- **No AI on the phone (decided).** The detail screen shows the raw error and the manual actions only. The explanation stays web-only, and the README and ADR say so.
- **`docs/mobile-adr.md`.** The one-page decision note, written after building the slice. It covers speed to a first version, App Store and TestFlight reality, push, biometrics, long lists, code reuse with the web app and who maintains it in a year. It ends with one recommendation (Expo / React Native), what we'd ship in two weeks, and what we'd regret. It's honest about what was shipped natively: nothing beyond Expo Go.
- **Delivery.** An Expo Go link via EAS Update if you choose to publish, otherwise a 60-second screen recording of the timed 20-second script.

## Capabilities

### New Capabilities
- `problems-feed`: the phone's problems feed, listing detail and quick actions (retry, price edit, delist), plus their live updates, touch and accessibility rules.

### Modified Capabilities
<!-- None. The console's live-status spec is unchanged; the phone states its own polling rules in problems-feed. -->

## Impact

- `apps/mobile`: the checkpoint list is replaced by a feed screen, a detail screen and a price sheet, using `@react-navigation/native` and its native stack (new dependencies, installed with `expo install`). `app.json` gets a proper name.
- `packages/client`: `useLiveChanges` gains an optional visibility source, so React Native's `AppState` can pause polling. The browser default is unchanged.
- Root Vitest config: `apps/mobile` is added for its pure feed logic (no React Native rendering in tests).
- `docs/mobile-adr.md` (new) and README updates: running on a phone, the feedback log entry for #5 and the phone half of #4, and "What I skipped" (push, Face ID, TestFlight, AI on the phone).
- Out of scope: push notifications, biometric login, a development build or TestFlight, sharing state between the phone and web (each runs its own mock), offline persistence, and the PWA alternative.
