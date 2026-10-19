# Tasks

## 1. Shared pieces

- [x] 1.1 Move `parseEdit` to `packages/contract/src/edit.ts` (behaviour and messages unchanged), export it, re-export it from `apps/web/src/console/edit.ts`, and add contract tests for "" → "Enter a price", "0" → "Price must be more than £0", "1.234" → "Use at most 2 decimals" and "-1" quantity; verify `pnpm test` and `pnpm typecheck` pass with the web EditCell tests unchanged
- [x] 1.2 Add an optional `visibility` source to `useLiveChanges`, passed through to `createPoller` (browser default unchanged); verify a Vitest case with a fake source: hidden → no polls over 10 s, visible → one immediate catch-up

## 2. Mobile setup

- [x] 2.1 Install the React Navigation native stack and its peers with `npx expo install`, rename the app in `app.json` ("Cockpit"), add `apps/mobile` to the root Vitest projects (node environment, `src/**/*.test.ts`), and move app code under `apps/mobile/src/` (providers, engine, client); verify `pnpm install`, `pnpm typecheck`, `npx expo install --check` and that the app still starts in Expo Go

## 3. Feed

- [x] 3.1 Implement `buildFeed(listings, now)` and `issueText(issue, listing, now)` in `src/feed.ts`, plus `useAllListings()` (all pages); verify Vitest cases: mismatch, then error, then fresh pending in that order; a healthy listing excluded; `problemCount` excludes fresh pending; "StubHub: shows 4, you have 2"; "Vivid Seats: pending 4 min" for stale; "Overpriced +31%"
- [x] 3.2 Build the Feed screen: header with the problem count and live status (`useLiveChanges` with an `AppState` source), a `FlatList` of rows (glyph, event, date, seats, issue text, muted style for fresh pending, a 44-point Retry for retryable issues with an inline "Retry failed: …"), a frozen order recomputed on pull to refresh and on focus, and loading / "Nothing needs you right now" / load error with Retry states; verify on the phone that drift changes row text without moving rows, Retry shows pending at once, and backgrounding then returning makes one catch-up request (log line in dev)

## 4. Detail and actions

- [x] 4.1 Build the Listing screen: event, date, venue, seats, quantity, price against market, and per-marketplace state with full error text, Retry sync per retryable marketplace, Edit price, and Delist per listed marketplace behind `Alert.alert` (Cancel / Delist); no AI explanation; verify on the phone that the injection listing shows its raw error as plain text, and that Cancel on delist sends nothing
- [x] 4.2 Build the price sheet (`formSheet`): pre-filled price, numeric keypad, −£1 / +£1 steppers, Save via `usePatchListing` with `baseVersion`, validation through the shared `parseEdit`, unchanged → no write; plus the detail's failure banner (conflict "Changed elsewhere to £X. Your £Y was not saved."; other errors with Retry); verify on the phone with `EXPO_PUBLIC_SEED` set so a known listing's write fails: £46 +£1 +£1 Save shows £48 then rolls back to £46 with the reason and Retry, and an empty field shows "Enter a price"
- [x] 4.3 Accessibility and touch pass: every control at least 44 × 44 points with an explicit accessible name and role, rows announced as one item with their issue, no horizontal scroll at 390 points; verify with VoiceOver on the phone (or the iOS simulator's Accessibility Inspector) and note the result in the README

## 5. Delivery and docs

- [x] 5.1 Run the 20-second script on the phone (cold start → top row → Edit price → +£2 → Save → back on the feed) and record it; verify the run is under 20 seconds and the recording or its link is referenced in the README. Publishing with `eas update` happens only on your explicit go-ahead, and then the Expo Go link goes in the README as well
- [x] 5.2 Write `docs/mobile-adr.md` (one page: comparison of React Native/Expo, Swift and PWA on the brief's seven criteria for a three-engineer Next.js team; one recommendation; the two-week plan; what we'd regret; what this slice shipped natively and what it didn't); verify it ends with a single recommendation and names push, Face ID and TestFlight as not shipped
- [x] 5.3 Update the README: running the phone app (including `EXPO_PUBLIC_SEED`), the feedback log row for #5 and the phone half of #4, "What I skipped" (push, Face ID, TestFlight, AI on the phone, phone/web shared state, RN component tests), and a link to the ADR; verify every command in those sections runs as written
- [x] 5.4 Final check: `pnpm typecheck`, `pnpm test`, `pnpm e2e` and `npx expo export --platform ios` (bundle builds) all pass with zero errors

## Workflow follow-up

- Archive this change after review; `docs-api-wishlist` can then cite the phone's need for a server-side feed query.
