import { Listing, MARKETPLACES, priceHealth } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { LISTING_COUNT, MISMATCH_COUNT, generate } from "./generate";
import { INJECTION_ERROR, INJECTION_EVENT } from "./templates";
import { SECTION_IDS } from "./venue";

const now = Date.parse("2026-10-19T00:00:00.000Z");
const data = generate(42, now);

describe("generate", () => {
  it("is identical for the same seed and differs for another", () => {
    expect(generate(42, now)).toEqual(data);
    expect(generate(43, now)).not.toEqual(data);
  });

  it("produces 500 valid listings across 18 events", () => {
    expect(data).toHaveLength(LISTING_COUNT);
    for (const l of data) expect(Listing.safeParse(l).success).toBe(true);
    expect(new Set(data.map((l) => l.event)).size).toBe(18);
  });

  it("only uses sections that exist on the venue map", () => {
    for (const l of data) expect(SECTION_IDS).toContain(l.section);
  });

  it("places exactly one lastError injection and one event-name injection", () => {
    const errors = data.flatMap((l) => MARKETPLACES.map((m) => l.sync[m].lastError));
    expect(errors.filter((e) => e === INJECTION_ERROR)).toHaveLength(1);
    expect(new Set(data.filter((l) => l.event === INJECTION_EVENT).map((l) => l.event)).size).toBe(1);
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
