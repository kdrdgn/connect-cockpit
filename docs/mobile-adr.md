# Mobile: React Native (Expo), Swift or PWA

**Context.** Three engineers who already run a Next.js web app, building the first iPhone app for brokers who "always have the phone in hand". The first job is a problems feed: see what's broken, fix one listing in under 20 seconds.

**Decision: React Native with Expo.** It's the only option that is native enough for push and Face ID, and also lets the same three engineers share the web app's types, API client and business rules from day one.

## The options against what matters

| | Expo / React Native | Swift (SwiftUI) | PWA |
|---|---|---|---|
| **Speed to a first version** | Fast. This slice reuses `contract`, `client` and `mock` unchanged: ranking, optimistic edits, rollback, 429 handling. Only screens are new. | Slowest. Every type, the API client and the problem ranking are rewritten in Swift, and kept in sync by hand. | Fastest to a URL, since it's a route in the existing Next app. |
| **App Store / TestFlight** | Real review, but EAS Build and Submit make TestFlight a command, not a Mac ritual. JS-only fixes ship as EAS Updates without review. | Real review; the best tooling and the fewest surprises, but every fix waits on review. | No review, but no App Store presence either. "Add to Home Screen" is a step most brokers won't take. |
| **Push notifications** | Yes: `expo-notifications` with APNs, but it needs a development build, not Expo Go. | Yes, first-class. | Web Push works on iOS 16.4+ only for installed PWAs; delivery and permission UX are weaker. This is the deal-breaker for "tell me when StubHub breaks". |
| **Biometric login** | Yes: `expo-local-authentication` with Face ID, in a dev build. | Yes, first-class. | Only via passkeys/WebAuthn; workable for login, not for "confirm this delist with Face ID". |
| **Long lists** | `FlatList` virtualizes; at 50,000 rows we'd move to FlashList and a server-side feed query. | `List` is excellent. | DOM virtualization works (the web console does it), but scroll feel on iOS Safari is the weakest of the three. |
| **Code reuse with web** | High: TypeScript, zod contract, TanStack Query, design tokens. Not the UI: web components don't run on React Native. | None, beyond an OpenAPI-generated client. | Total, including UI. |
| **Who maintains it in a year** | The same three engineers. The cost is Expo SDK upgrades about twice a year (this slice already hit one: see below). | Needs an iOS specialist; with three engineers, that's a bus factor of one. | The same three engineers, with the least to learn. |

## Recommendation

**Ship Expo / React Native.** Swift buys the best iOS feel at the price of a second codebase and a hire the team doesn't have. A PWA buys speed but fails the two things the founder's phone use needs most: reliable push when something breaks, and Face ID before a destructive action. Expo keeps one language, one contract and one set of business rules across web and phone, and still reaches the native APIs.

## What we'd ship in two weeks

1. A **development build** on TestFlight via EAS (Expo Go can't do push or Face ID).
2. The **problems feed** from this slice against the real API, with a server-side `feed` query instead of loading every listing (the slice loads all 500 because its mock is in-process).
3. **Push** for new errors and quantity mismatches (`expo-notifications`, APNs key in EAS), opening straight onto the listing.
4. **Face ID** to unlock the app, and again before a delist.
5. EAS Update channels, so a copy fix doesn't wait on App Store review.

## What we'd regret

- **Expo's upgrade treadmill.** This slice is pinned to **SDK 57** only because the App Store's Expo Go still runs 57 while 58 is out. A dev build removes that constraint but makes SDK upgrades our job.
- **A native module Expo doesn't cover** (for example, a marketplace SDK that ships only for iOS) would mean writing Swift anyway, through an Expo module.
- **Shared code that assumes a browser.** The shared poller detected background state through `document`; the phone needed a pluggable visibility source. Cheap here, but it's the kind of leak that grows if nobody watches the shared packages.
- **No component tests yet.** The slice tests its logic in Vitest and was checked by hand on a phone; React Native component tests (jest-expo) are the first thing to add.

## What this slice shipped natively, honestly

An Expo app that runs in **Expo Go**: a problems feed, a listing screen, one-tap retry, a quick price sheet and delist with a native confirmation, all against an in-process mock. **Not shipped:** a development build, TestFlight, push notifications, Face ID, and the AI explanation (web only). The brief's web-app manifest applies to the PWA route, which we didn't take.
