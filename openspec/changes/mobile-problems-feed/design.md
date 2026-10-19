# Design

## Context

What already exists (see proposal.md for the why):
- **`apps/mobile`.** Expo SDK 57 (React Native 0.86, React 19.2.3), a single `App.tsx` checkpoint list. It runs its own engine via `createInProcessFetch` with a random write seed, and state resets on restart. It's verified on a real phone in Expo Go.
- **`packages/client`.** It's DOM-free except `createPoller`, whose default visibility source is `document`; `PollerDeps` already accepts `isHidden` / `onVisibilityChange`, but `useLiveChanges` doesn't pass them through. `usePatchListing` (optimistic, exact rollback, CONFLICT with `current`, `baseVersion`), `useRetrySync` (optimistic pending, rollback), `useBulk`, `useListing`, `useListings` and `applyChanges` all work in React Native.
- **`packages/contract`.** It has `issuesOf` / `problemsOf` / `compareProblems` (mismatch > error > stale pending > overpriced > pending, then soonest event) and `STALE_PENDING_MS`. The server filter `problem=any` excludes fresh pending, so it can't produce the feed on its own.
- **`packages/tokens`.** Plain values (`color.light`, `space`, `text`, `radius`), already used by the checkpoint list.
- **The web console's `parseEdit(field, raw)`** lives in `apps/web/src/console/edit.ts` and has no DOM dependency.
- **Decided in this change:** no AI on the phone, and `docs/mobile-adr.md` is written here.

Requirements are in `specs/problems-feed`. This document only covers how.

## Goals / Non-Goals

**Goals:**
- The 20-second script works on a real phone and is timed in the recording.
- The phone reuses the contract's ranking and the client's write paths. No second copy of business rules.
- Logic worth testing (feed building, issue wording) lives in plain TypeScript that Vitest runs without React Native.

**Non-Goals:**
- React Native component tests (jest-expo, RNTL). The UI is verified by hand on the phone and in the recording, and the ADR says so.
- A development build, push, Face ID, TestFlight, deep links, and dark mode.
- Sharing state with the web app.

## Decisions

### M1. Load every listing in-process, build the feed on the phone
`useAllListings()` calls `useListings({ limit: 200 })` and fetches the remaining pages (3 for 500 listings), as the console's `useListingView` does. A pure function `buildFeed(listings, now)` in `apps/mobile/src/feed.ts` keeps listings with `problemsOf(l, now).length > 0` or any `pending` issue, sorts them with `compareProblems`, and returns `{ ids, problemCount }`.
- *Alternatives:* `problem=any` on the server (it drops fresh pending, which the brief asks for); adding a `feed=` filter to the contract and mock (a contract change for something the phone can do locally in about a millisecond).

### M2. A frozen order, refreshed at two moments
The feed screen keeps `ids` in state, computed from the cache with `buildFeed`. It recomputes only on pull to refresh (which also refetches) and on screen focus (returning from detail). Rows subscribe to `useListing(id)`, so drift updates their text in place (Option Y, as on web). A listing that stops qualifying stays visible until the next recompute, and its text then reads its current state, for example "All marketplaces live".
- *Alternative:* re-sorting on every poll (rows jump while the broker reaches for one, the exact failure the spec forbids).

### M3. Navigation: React Navigation native stack *(default)*
Two screens, `Feed` and `Listing` (params `{ id }`), plus the price editor as a `formSheet` presentation on iOS (a modal on Android). Install with `npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context`, all supported in Expo Go. A native stack gives the iOS back-swipe and a native sheet for free.
- *Alternatives:* Expo Router (file-based routes, more setup and conventions for a three-screen slice); hand-rolled state with `Modal` (no back gesture, which users notice at once).

### M4. Issue wording shared by row and screen reader
`issueText(issue, listing, now)` in `apps/mobile/src/feed.ts` returns, for example, "StubHub: shows 4, you have 2", "SeatGeek: error", "Vivid Seats: pending 4 min", "Overpriced +31%" or "Ticombo: pending". The row shows it next to a shape glyph (◆ mismatch, ▲ error, ◔ stale, ↑ overpriced, ● pending), mirroring the web's shapes, as `Text`, not colour. The row's `accessibilityLabel` is `${event}, section ${section} row ${row}, ${issueText}`.
- Marketplace display names come from `MARKETPLACE_NAMES`, exported by `@cockpit/mock`'s templates today; a 4-entry map is copied into `feed.ts` instead, so the app doesn't depend on mock internals for display text.

### M5. Shared price parsing: move `parseEdit` to the contract
`parseEdit` moves to `packages/contract/src/edit.ts` (unchanged behaviour and messages, plus a test file), and `apps/web/src/console/edit.ts` re-exports it. The phone's sheet uses the same rules and messages ("Enter a price", "Price must be more than £0", "Use at most 2 decimals").
- *Alternative:* a copy in `apps/mobile` (two validators drift apart; the brief grades "defined once").

### M6. Writes reuse the client hooks; failures shown inline
- **Retry (feed and detail):** `useRetrySync()`. On error, the row or section shows "Retry failed: <message>" for 5 s, with the rollback done by the hook.
- **Price:** `usePatchListing()` with `{ id, price, baseVersion }`, where `baseVersion` is the version when the sheet opened, so a mid-edit change becomes a CONFLICT. The sheet closes on Save (optimistic). On error, the detail shows a banner: conflict gives "Changed elsewhere to £X. Your £Y was not saved." and other errors give "<reason>" plus a Retry that re-sends `{ price }` with the current version.
- **Delist:** `Alert.alert("Delist from StubHub?", …, [Cancel, Delist (destructive)])`, then `useBulk()` with one `delist` op and a new idempotency key. No undo on the phone *(default)*; the confirmation is the guard.
- *Alternative:* a toast system like the web's (more UI to build; on a phone the detail screen is where the broker is looking).

### M7. Polling with `AppState`
`useLiveChanges(cursor, { visibility })` gains an optional `visibility: { isHidden(): boolean; subscribe(listener): () => void }` passed through to `createPoller`. The browser default stays `document`. Mobile passes an `AppState`-based source (`AppState.currentState !== "active"`, `AppState.addEventListener("change", …)`). The cursor comes from the first list page, as on web. A small status line under the feed header shows "Live · 2s ago" / "Updates stalled", using the existing `LiveStatus`.

### M8. Touch, layout and accessibility rules
A single `minTouch = 44` constant. Buttons are `Pressable` with `minHeight`/`minWidth` 44 and `hitSlop` where the visual is smaller. Each has `accessibilityRole="button"` and an explicit label ("Retry StubHub"). Font sizes come from `text` tokens, with `allowFontScaling` left on. The layout uses flex only, so nothing has a fixed width beyond the screen. Colour stays in the web's budget: amber for attention, grey for healthy and pending, red only for a rolled-back write's message.

### M9. Write seed and data seed
The app keeps the random write seed (failures vary per launch). `EXPO_PUBLIC_SEED` pins it for recording a repeatable demo *(default)*.

### M10. Tests
- **Vitest** (`apps/mobile` added to the root projects, node environment, `src/**/*.test.ts` only): `buildFeed` (worst first, healthy excluded, fresh pending last and not counted) and `issueText` for each kind. `parseEdit` tests move with it to the contract. A test for the `useLiveChanges` visibility pass-through goes in `packages/client` (a fake visibility source: hidden → 0 polls, visible → 1 catch-up).
- **By hand on the phone,** following a checklist in tasks: the 20-second run, 44-point targets (checked with the Accessibility Inspector or VoiceOver), and 390-point width on an iPhone 15 or newer, or the iOS simulator if available.

### M11. The ADR
`docs/mobile-adr.md`, one page. It has a comparison table for a three-engineer team that already runs Next.js (React Native/Expo, Swift, PWA) against the brief's seven criteria, then one recommendation: Expo / React Native. It covers what we'd ship in two weeks (dev build plus TestFlight, push via Expo Notifications, Face ID via `expo-local-authentication`, the feed against the real API) and what we'd regret (native modules outside Expo's set, upgrade cadence, list performance at 50,000 rows without FlashList). It says plainly what this slice shipped natively: a JS app in Expo Go; no dev build, push or biometrics. It's written after the slice works, so it can cite real friction (the SDK 57 pin to match Expo Go, the `document`-based poller).

## Risks / Trade-offs

- [Expo Go only supports its own SDK (57), so the app can't move to 58 until Expo Go does] → It's documented. A dev build removes the limit, and that's in the two-week plan.
- [500 listings loaded and filtered on the phone] → It's in-process and cheap now. With a real API this becomes a server `feed` query, which is noted in the ADR and in the wishlist change.
- [A frozen order can show a fixed listing until refresh] → Its row text updates live, so it reads as fixed. Returning from detail recomputes.
- [Hand-only UI verification] → The checklist and the timed recording are the evidence, and the ADR states the testing gap.
- [Phone and web don't share edits] → Already in the README. The demo script says so up front.

## Migration Plan

This replaces the checkpoint list in `apps/mobile/App.tsx`. Moving `parseEdit` keeps the web import path working through a re-export.

## Open Questions

- Whether to publish with EAS Update (it needs your Expo account and creates a public link) or deliver a screen recording only. This doesn't change the code; tasks cover both, and publishing waits for your go-ahead.
