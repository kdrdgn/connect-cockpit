import { Listing, MARKETPLACES, priceHealth } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { LISTING_COUNT, MISMATCH_COUNT, generate } from "./generate";
import { INJECTION_ERROR, INJECTION_EVENT } from "./templates";
import { SECTION_IDS } from "./venue";

const now = Date.parse("2026-10-19T00:00:00.000Z");
const data = generate(42, now);

/** FNV-1a, 32-bit: enough to notice any change, and no Node types needed. */
function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16);
}

describe("generate", () => {
  it("is identical for the same seed and differs for another", () => {
    expect(generate(42, now)).toEqual(data);
    expect(generate(43, now)).not.toEqual(data);
  });

  // Everything but the display names, as generated before venues and tours were added. Naming must not draw from
  // the rng, or every price, state and seat for a seed would shift.
  it("keeps prices, seats and sync states stable for a seed", () => {
    const rest = data.map(({ event: _event, venue: _venue, ...r }) => r);
    expect(fingerprint(JSON.stringify(rest))).toBe("3ce3ee7d");
  });

  it("produces 500 valid listings across 18 events", () => {
    expect(data).toHaveLength(LISTING_COUNT);
    for (const l of data) expect(Listing.safeParse(l).success).toBe(true);
    expect(new Set(data.map((l) => l.event)).size).toBe(18);
  });

  it("spreads events over several venues, one venue per event", () => {
    expect(new Set(data.map((l) => l.venue)).size).toBeGreaterThanOrEqual(4);
    for (const event of new Set(data.map((l) => l.event))) {
      expect(new Set(data.filter((l) => l.event === event).map((l) => l.venue)).size).toBe(1);
    }
  });

  it("names every event \"<artist> – <tour>\"", () => {
    for (const l of data) expect(l.event).toMatch(/^.+ – .+ Tour$/);
  });

  it("only uses sections that exist on the shared layout", () => {
    for (const l of data) expect(SECTION_IDS).toContain(l.section);
  });

  it("places exactly one lastError injection and one event-name injection", () => {
    const errors = data.flatMap((l) => MARKETPLACES.map((m) => l.sync[m].lastError));
    expect(errors.filter((e) => e === INJECTION_ERROR)).toHaveLength(1);
    expect(new Set(data.filter((l) => l.event.includes(INJECTION_EVENT)).map((l) => l.event)).size).toBe(1);
  });

  it("covers every price band", () => {
    const bands = new Set(data.map((l) => priceHealth(l.price, l.marketPrice).band));
    expect([...bands].sort()).toEqual(["above", "at_market", "below", "overpriced", "underpriced"]);
  });

  it("creates the expected number of quantity mismatches", () => {
    const mismatches = data.filter((l) =>
      MARKETPLACES.some((m) => {
        const s = l.sync[m];
        return s.listedQuantity !== undefined && s.listedQuantity !== l.quantity;
      }),
    );
    expect(mismatches).toHaveLength(MISMATCH_COUNT);
  });
});
