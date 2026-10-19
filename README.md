# Connect Cockpit

A broker console for ~500 ticket listings synced to four marketplaces: a Next.js web console and an Expo phone app, both running against a mock API that misbehaves on purpose.

## How to run

Requires Node 20+ and pnpm 11.

```bash
pnpm install
pnpm dev:web        # http://localhost:3000
pnpm dev:mobile     # Expo dev server; open in Expo Go
pnpm test           # Vitest across packages and the web app
pnpm typecheck      # strict tsc in every package and app
pnpm e2e            # Playwright against the web app (starts `pnpm dev:web` if it isn't running)
```

The first `pnpm e2e` on a new machine may need `pnpm --filter web exec playwright install chromium`.

### Mock controls (URL params on the web app)

| Param | Default | Meaning |
|---|---|---|
| `chaos` | `on` | `off` = no failures, no 429s, 0–20 ms latency |
| `seed` | random per page load | which writes fail (same seed, same rows fail) |
| `dataSeed` | fixed | which listings are generated |
| `latency` | `300-800` | per-call delay range in ms |
| `failRate` | `15` | % of write attempts that fail |
| `rate429` | `5` | % of reads that return 429 with `Retry-After` |

Example: `http://localhost:3000/?seed=42&failRate=50` makes failures easy to demo. Add `demo=1` for a small panel that switches chaos, sets the failure rate and triggers a drift tick while the page is open.

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

## Web console

### Choices, and why

- **CSS Modules + CSS custom properties from `packages/tokens`.** Class names such as `.syncCell` and `.rollback` read like a design system, and every value is a `var(--…)`, with no raw colours in `apps/web`. Density is one attribute: `[data-density=compact]` swaps row height, cell padding and cell text. Tailwind would be faster to write, but a dense table cell with fourteen utilities is harder to review.
- **TanStack Query, with the cache shaped as ids plus one entry per listing.** The list query holds pages of ids; each row subscribes to `['listing', id]`. A changes poll or a write replaces only that entry, so only that row re-renders. This is the optimisation measured under Performance. Optimistic edits and exact rollback are pure functions in `packages/client`, tested without React.
- **nuqs for filters in the URL.** Typed parsers that use the same names and formats as the list API, `history: "replace"`, and invalid values dropped instead of `NaN`. A copied link reproduces the view.
- **Zustand for UI state** (selection, editing drafts, drawer, density, the last bulk result). Rows subscribe to their own bit (`selection.has(id)`), so shift-selecting 40 rows re-renders 40 rows.
- **TanStack Virtual without TanStack Table.** Sorting and filtering happen in the API, and selection and the keyboard model are custom, so a table abstraction would sit unused.
- **A native `<table>`, not `role="grid"`.** Virtualized with spacer rows (an empty `<tr>` above and below the rendered window), with `aria-rowcount`/`aria-rowindex` so a screen reader hears "row 212 of 501". Price and quantity are real buttons, so Tab works natively. A half-finished ARIA grid is worse than a native table; arrow keys are an extra for sighted keyboard users.
- **Filtering in the mock API, not in the browser.** 500 rows would filter instantly on the client, but the API is shaped for 50,000. Search is debounced (250 ms), superseded requests are cancelled, and the old rows stay on screen, dimmed, while a new filter loads.
- **Polling `/listings/changes?since=<cursor>` every 3 s, not SSE.** The client code is the same either way ("everything after cursor X"), polling works through the in-process mock on the phone too, and the wishlist argues for SSE in production. Polling stops in hidden tabs and makes one catch-up call on return. A rate-limited poll waits quietly ("Live · paused 3s"); three failed polls in a row show "Updates stalled. Retrying".

### Decisions you might trip over

- **An edited row stays where it is.** After a price or quantity edit, the row keeps its position even if the current sort would move it. It moves when the filters or sort change or the page reloads. Re-sorting under the broker's cursor would be worse than a briefly out-of-order row.
- **An edit is checked against the version it started from.** If someone else changes the listing while the broker is typing, the incoming change updates the sync cells but not the input, and committing gives "Changed elsewhere to £125. Your £130 was not saved." It never silently overwrites.
- **A new filter clears the selection,** so a bulk action can only touch rows the broker can see.
- **Bulk sends absolute prices with each row's version.** What the preview showed is exactly what is written; a row that changed since the preview fails on its own with a conflict. "Retry failed" and Undo are new intents with new idempotency keys. Undo reverses only what succeeded, has depth 1, and is itself a write that can fail per row. Undoing a delist is labelled "Relist (may lose position)".
- **Red means one thing: a write that failed and was rolled back.** Errors on marketplaces are amber.

### Colour, and the founder's two notes

> Colour is reserved for "needs you": a healthy row is grey, so the few coloured marks are the work queue. That makes the price dot quiet most of the time; I gave up always-on coloured dots (#2) so that an error stands out without alarm (#1), even in compact mode.

Each signal has its own channel. Sync state is a shape in a fixed column (dot live, ring pending, ring with a clock stuck pending, triangle error, diamond quantity mismatch, dash not listed), always with words for screen readers. Price health is a direction glyph plus the signed gap. A problem row gets an amber edge, and there's a count in the toolbar.

### Keyboard

| Where | Keys |
|---|---|
| Anywhere | `n` / `Shift+N` next / previous problem · `/` search · `?` shortcut sheet · `Alt+R` retry the last failed save · `Ctrl+Z` / `⌘Z` undo the last bulk change |
| Table | Tab / Shift+Tab next / previous cell · arrow keys · Home / End · Ctrl+Home / Ctrl+End · Page Up / Page Down (20 rows) · Space select row · Shift+Space extend selection · Enter / F2 / a digit edit · `o` sync details |
| Editing | Enter save and stay · Escape cancel · Tab / Shift+Tab save and move right / left |

A "Skip to bulk actions" link comes first, because Tab walks every rendered cell. Letter shortcuts never fire while typing or while a dialog is open, and each has a visible button too: screen readers in browse mode keep letter keys for themselves.

## Feedback log

| Message | What I did | Why |
|---|---|---|
| #1 "Red looks scary everywhere" | Errors are amber with a shape, never red. Red appears only for a write that was just rolled back. A healthy row is plain grey. | Problems stay visible without the "house on fire" feeling, and red keeps its meaning for the rare moment something you did didn't stick. |
| #2 "Priced above or below market without opening anything" | Every row has a direction glyph and the signed gap ("▲ +31%"). It's coloured only when overpriced or underpriced (beyond ±15%). | The answer is on the row, but quiet. See the colour trade-off above: always-on coloured dots would compete with errors. |
| #3 "If I have to touch the mouse to change a price I'm leaving" | Edit from the keyboard: Enter or a digit to start, Enter to save, Escape to cancel, Tab to save and move on. Bulk changes, the sync drawer, problem jumping (`n`) and the map work from the keyboard too. | The broker's main loop (find a problem, fix the price, move on) never needs the mouse. Checked with Playwright specs. |
| #4 "Sold 2 of 4 and StubHub still shows 4" (web half) | Marketplaces report `listedQuantity`. A mismatch is the top-ranked problem: a diamond in that marketplace's column, an amber edge on the row, and first in `n`. The toolbar counts problems, and "Problems only" filters to them. | Overselling is the most expensive failure, so it ranks above errors. The phone's problems feed (Track B) uses the same ranking from `packages/contract`. |

## Performance

**Budget**
- Scroll all 500 rows at 60 fps with no long task over 50 ms.
- A changes poll that touches N listings re-renders at most N rows.
- CLS 0 on load, and Lighthouse desktop performance of 90 or more.

**The one optimisation measured: how rows subscribe to data.** In **Option X**, rows read their listing from the list's page arrays. In **Option Y**, the list holds ids only and each row subscribes to its own cache entry (`['listing', id]`). The table shipped with Y; a temporary `?rows=pages` switch rebuilt X for the "before" numbers and was removed afterwards.

Production build (`next build --profile`), 1440×900, Chromium, same seed. Changes polls were measured over 10 polls, with 83 listings changed and 10 of them in the rendered window. Scrolling covered all 500 rows in compact over 4 s.

| | Before: Option X | After: Option Y |
|---|---|---|
| Row renders for 10 polls | 301 (every rendered row, every poll) | 11 (one per changed row, plus one) |
| React commit time for 10 polls | 31.9 ms | 4.6 ms |
| Scroll, no throttling | 60 fps, worst frame 16.8 ms, 0 long tasks | 60 fps, worst frame 16.8 ms, 0 long tasks |
| Scroll, 4× CPU throttling | 56 fps, 17 of 223 frames over 20 ms, 0 long tasks | 55 fps, 20 of 221 frames over 20 ms, 0 long tasks |

The extra row render under Y came in one poll where one row changed but two rendered. The likely source is the 5-second clock that re-renders rows with a pending marketplace, so they can turn stale; I haven't confirmed it.

Lighthouse (desktop, production build): **performance 100, accessibility 100**, CLS 0.0002, TBT 0 ms, LCP 730 ms. One advisory note remains: on the seating map, a section's visible label is split across two SVG text elements, so Lighthouse can't match it to the accessible name ("Section 104, 31 listings").

**What the numbers say.** Virtualization keeps scrolling within budget either way, since only about 50 rows are ever mounted. The subscription model is what keeps live updates cheap: with X, every poll re-renders the whole window even when nothing visible changed. Under 4× throttling, scrolling dips to about 55 fps without long tasks; that's below the 60 fps budget on a slow machine, and the next thing I'd profile.

**A bug the measurement caught.** The first production Lighthouse run gave CLS 0.62. The toolbar wrapped onto a second line when the problem count arrived after load, pushing the table down. In dev it happened to fit. The status cluster now renders from the first paint with fixed widths, and the rate-limit notice floats over the table instead of taking toolbar space.

## What I skipped and why

- **Go mock service (Track D2).** Cut to protect Track A; the mock is TypeScript only. I would rather make the Go change together in the demo, where how I read and steer the diff is visible, than ship ~150 lines I could not defend line by line. <!-- TODO(author): state your actual Go experience here in one honest line. -->

## Running the mobile app

The phone app has its own in-process copy of the mock, so it needs no server. Start it with `pnpm dev:mobile` and scan the QR code with Expo Go.

It targets **Expo SDK 57**, the SDK that the store version of Expo Go supports at the time of writing (SDK 58 is on npm, but Expo Go in the App Store is still on 57). If Expo Go says the project needs a newer version, check the SDK it lists under Settings.

## Fixtures

Artists, venue and error messages are fictional. The 7 `lastError` templates in `packages/mock/src/templates.ts` are **invented**; no real marketplace samples were available. Two prompt-injection fixtures are planted on purpose (one in a `lastError`, one in an event name) to test the AI feature's defences.
