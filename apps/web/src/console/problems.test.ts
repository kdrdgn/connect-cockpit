import type { Listing, SyncEntry } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { problemOrder, stepProblem } from "./problems";

const now = Date.parse("2026-10-19T12:00:00Z");
const live: SyncEntry = { state: "live", updatedAt: new Date(now - 1000).toISOString() };
const make = (id: string, date: string, patch: Partial<Listing["sync"]> = {}, price = 100): Listing => ({
  id, event: id, venue: "V", date: `${date}T19:00:00.000Z`, section: "101", row: "A", quantity: 2, price, marketPrice: 100, version: 1,
  sync: { stubhub: live, seatgeek: live, vividseats: live, ticombo: live, ...patch },
});

describe("problemOrder", () => {
  it("ranks mismatch > error > stale pending > overpriced, then soonest event", () => {
    const stale: SyncEntry = { state: "pending", updatedAt: new Date(now - 60_000).toISOString() };
    const fresh: SyncEntry = { state: "pending", updatedAt: new Date(now - 1000).toISOString() };
    const listings = [
      make("overpriced", "2026-10-20", {}, 140),
      make("error-late", "2026-12-01", { seatgeek: { ...live, state: "error", lastError: "x" } }),
      make("error-soon", "2026-11-01", { seatgeek: { ...live, state: "error", lastError: "x" } }),
      make("mismatch", "2027-01-01", { stubhub: { ...live, listedQuantity: 4 } }),
      make("stale", "2026-10-21", { ticombo: stale }),
      make("fresh-pending", "2026-10-20", { ticombo: fresh }),
      make("healthy", "2026-10-20"),
      make("underpriced", "2026-10-20", {}, 70),
    ];
    expect(problemOrder(listings, now)).toEqual(["mismatch", "error-soon", "error-late", "stale", "overpriced"]);
  });

  it("n/N step through the ranking and wrap", () => {
    const order = ["a", "b", "c"];
    expect(stepProblem(order, null, 1)).toBe("a");
    expect(stepProblem(order, "a", 1)).toBe("b");
    expect(stepProblem(order, "c", 1)).toBe("a");
    expect(stepProblem(order, "a", -1)).toBe("c");
    expect(stepProblem(order, "not-a-problem", -1)).toBe("c");
    expect(stepProblem([], "a", 1)).toBeNull();
  });
});
