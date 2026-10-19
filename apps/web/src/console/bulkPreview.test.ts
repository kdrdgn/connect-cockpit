import { buildUndo } from "@cockpit/client";
import type { BulkResult, Listing } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { applyPct, previewBulk } from "./bulkPreview";

const live = { state: "live" as const, updatedAt: "2026-10-19T12:00:00.000Z" };
const make = (i: number, price: number, marketPrice = 100): Listing => ({
  id: `L${i}`, event: "E", venue: "V", date: "2026-11-01T19:00:00.000Z", section: "101", row: "A", quantity: 2,
  price, marketPrice, version: 3,
  sync: { stubhub: live, seatgeek: live, vividseats: live, ticombo: { ...live, state: "not_listed" } },
});

describe("previewBulk", () => {
  it("125 at −10% becomes 113", () => {
    expect(applyPct(125, -10)).toBe(113);
    const { rows, ops } = previewBulk([make(1, 125, 120)], { kind: "price", pct: -10 });
    expect(rows[0]).toMatchObject({ oldPrice: 125, newPrice: 113, health: { band: "below", gapPercent: -6 } });
    expect(ops).toEqual([{ op: "setPrice", id: "L1", version: 3, price: 113 }]);
  });

  it("never goes below £1", () => {
    expect(applyPct(2, -90)).toBe(1);
    expect(applyPct(1, -50)).toBe(1);
  });

  it("delist skips marketplaces where the row is not listed", () => {
    const { rows, ops } = previewBulk([make(1, 100)], { kind: "delist", marketplace: "ticombo" });
    expect(rows[0]).toMatchObject({ kind: "delist", state: "not_listed", skip: true });
    expect(ops).toEqual([]);
  });

  it("undo after 34 of 40 succeeded contains 34 ops restoring the old prices", () => {
    const listings = Array.from({ length: 40 }, (_, i) => make(i, 100 + i));
    const { ops } = previewBulk(listings, { kind: "price", pct: 10 });
    const failed = new Set([1, 5, 9, 14, 22, 37].map((i) => `L${i}`));
    const results: BulkResult[] = ops.map((op) =>
      failed.has(op.id)
        ? { id: op.id, ok: false, error: { code: "MARKETPLACE_REJECTED", message: "no", retryable: true } }
        : { id: op.id, ok: true, listing: { ...listings.find((l) => l.id === op.id)!, price: (op as { price: number }).price, version: 4 } },
    );
    const undo = buildUndo(ops, results, new Map(listings.map((l) => [l.id, l])));
    expect(undo.ops).toHaveLength(34);
    expect(undo.ops[0]).toEqual({ op: "setPrice", id: "L0", version: 4, price: 100 });
  });
});
