import { type Listing, MARKETPLACES, type SyncEntry, type SyncState } from "@cockpit/contract";
import { makeRng } from "./rng";
import { INJECTION_ERROR, INJECTION_EVENT, ORDINARY_TEMPLATES } from "./templates";
import { VENUE } from "./venue";

export const DEFAULT_DATA_SEED = 20261019;
export const LISTING_COUNT = 500;
export const MISMATCH_COUNT = 10; // 2% of 500

// Fictional artists. The last event carries the event-name injection fixture.
const ARTISTS = [
  "Glass Harbour",
  "The Velvet Static",
  "Mara Quill",
  "Northern Tide",
  "Copper Saints",
  "Lumen Drive",
  "Ivy & the Hollow",
  "Saffron Kites",
  "Echo Parade",
  "Ruby Arcade",
  "The Paper Moons",
  "Delta Fable",
  "Kestrel Bloom",
  "Neon Orchard",
  "Silver Hum",
  "Atlas Wren",
  "Midnight Ferry",
  INJECTION_EVENT,
] as const;

const LEVEL_FACTOR = { floor: 1.6, lower: 1.2, upper: 0.8 } as const;
const ROWS = "ABCDEFGHJKLMNPQRST".split("");
const DAY = 86_400_000;

/**
 * Deterministic dataset for a seed. `now` anchors event dates and timestamps so the
 * demo always shows upcoming events; the same seed and `now` give identical output.
 */
export function generate(dataSeed: number = DEFAULT_DATA_SEED, now: number = startOfDay(Date.now())): Listing[] {
  const rng = makeRng(dataSeed);
  const iso = (ms: number) => new Date(ms).toISOString();

  const events = ARTISTS.map((artist, i) => ({
    name: artist,
    date: iso(now + (2 + Math.floor((i * 118) / ARTISTS.length) + rng.int(0, 5)) * DAY + 19.5 * 3_600_000),
    basePrice: rng.int(40, 220),
  }));

  const listings: Listing[] = [];
  for (let i = 0; i < LISTING_COUNT; i++) {
    const event = events[i % events.length]!;
    const section = rng.pick(VENUE.sections);
    const quantity = rng.pick([1, 2, 2, 2, 3, 4, 4, 4, 6, 8]);
    const marketPrice = Math.max(15, Math.round(event.basePrice * LEVEL_FACTOR[section.level] * (0.85 + rng.next() * 0.3)));
    const gap = {
      at: () => -0.05 + rng.next() * 0.1,
      above: () => 0.06 + rng.next() * 0.08,
      below: () => -0.14 + rng.next() * 0.08,
      over: () => 0.17 + rng.next() * 0.25,
      under: () => -0.32 + rng.next() * 0.14,
    }[rng.weighted({ at: 55, above: 15, below: 10, over: 12, under: 8 })]();
    const row = rng.pick(ROWS);

    const entry = (state: SyncState, n: number): SyncEntry => {
      const updatedAt = iso(state === "pending" ? now - rng.int(0, 20_000) : now - rng.int(60_000, 6 * 3_600_000));
      if (state === "not_listed") return { state, updatedAt };
      if (state === "error") {
        const template = rng.pick(ORDINARY_TEMPLATES);
        const lastError = template.render({ marketplace: MARKETPLACES[n]!, marketPrice, quantity, section: section.id, row, n: rng.int(0, 99_999) });
        return { state, updatedAt, lastError };
      }
      return { state, updatedAt, listedQuantity: quantity };
    };
    const states = MARKETPLACES.map(() => rng.weighted({ live: 80, pending: 8, error: 5, not_listed: 7 }));

    listings.push({
      id: `L${String(i + 1).padStart(4, "0")}`,
      event: event.name,
      venue: VENUE.name,
      date: event.date,
      section: section.id,
      row,
      quantity,
      price: Math.max(5, Math.round(marketPrice * (1 + gap))),
      marketPrice,
      version: 1,
      sync: {
        stubhub: entry(states[0]!, 0),
        seatgeek: entry(states[1]!, 1),
        vividseats: entry(states[2]!, 2),
        ticombo: entry(states[3]!, 3),
      },
    });
  }

  // Quantity mismatches: the marketplace still shows more tickets than are held (feedback #4).
  const mismatched = new Set<number>();
  while (mismatched.size < MISMATCH_COUNT) mismatched.add(rng.int(0, LISTING_COUNT - 1));
  for (const i of mismatched) {
    const l = listings[i]!;
    l.sync.stubhub = { state: "live", updatedAt: l.sync.stubhub.updatedAt, listedQuantity: l.quantity + rng.int(1, 2) };
  }

  // The lastError injection fixture, on a listing that is not one of the mismatches.
  const target = [...Array(LISTING_COUNT).keys()].find((i) => i % 37 === 11 && !mismatched.has(i))!;
  const t = listings[target]!;
  t.sync.seatgeek = { state: "error", updatedAt: t.sync.seatgeek.updatedAt, lastError: INJECTION_ERROR };

  return listings;
}

export function startOfDay(ms: number): number {
  return ms - (ms % DAY);
}
