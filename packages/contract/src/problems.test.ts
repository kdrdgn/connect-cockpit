import { describe, expect, it } from "vitest";
import { STALE_PENDING_MS, compareProblems, isProblem, problemsOf } from "./problems";
import { makeListing } from "./testing";

const now = Date.parse("2026-10-19T12:00:00.000Z");
const base = makeListing();

describe("problems", () => {
  it("treats a quantity mismatch as a problem for that marketplace", () => {
    const l = makeListing({
      quantity: 2,
      sync: { ...base.sync, stubhub: { state: "live", updatedAt: base.sync.stubhub.updatedAt, listedQuantity: 4 } },
    });
    expect(problemsOf(l, now)).toEqual([{ kind: "quantity_mismatch", marketplace: "stubhub" }]);
  });

  it("does not treat fresh pending as a problem, but stale pending is", () => {
    const pendingSince = (ms: number) =>
      makeListing({
        sync: { ...base.sync, seatgeek: { state: "pending", updatedAt: new Date(now - ms).toISOString() } },
      });
    expect(isProblem(pendingSince(STALE_PENDING_MS - 1000), now)).toBe(false);
    expect(isProblem(pendingSince(STALE_PENDING_MS + 1000), now)).toBe(true);
  });

  it("does not treat underpriced as a problem", () => {
    expect(isProblem(makeListing({ price: 78, marketPrice: 100 }), now)).toBe(false);
  });

  it("treats overpriced as a problem", () => {
    expect(isProblem(makeListing({ price: 131, marketPrice: 100 }), now)).toBe(true);
  });
});

describe("compareProblems", () => {
  const error = (date: string) =>
    makeListing({ date, sync: { ...base.sync, ticombo: { state: "error", updatedAt: base.sync.ticombo.updatedAt } } });

  it("ranks a mismatch above an error with a sooner event", () => {
    const mismatch = makeListing({
      date: "2026-12-01T19:00:00.000Z",
      quantity: 2,
      sync: { ...base.sync, stubhub: { state: "live", updatedAt: base.sync.stubhub.updatedAt, listedQuantity: 4 } },
    });
    expect(compareProblems(mismatch, error("2026-10-25T19:00:00.000Z"), now)).toBeLessThan(0);
  });

  it("ranks the same kind by soonest event", () => {
    const sooner = error("2026-10-25T19:00:00.000Z");
    const later = error("2026-11-25T19:00:00.000Z");
    expect([later, sooner].sort((a, b) => compareProblems(a, b, now))).toEqual([sooner, later]);
  });
});
