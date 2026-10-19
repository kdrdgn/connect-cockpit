import type { BulkOp, BulkResult, Listing } from "@cockpit/contract";
import { makeListing } from "@cockpit/contract/testing";
import { describe, expect, it } from "vitest";
import { buildUndo, failedOps, summarize } from "./bulk";

const listings: Listing[] = Array.from({ length: 40 }, (_, i) =>
  makeListing({ id: `L${i}`, price: 100 + i, version: 1 }),
);
const ops: BulkOp[] = listings.map((l) => ({ op: "setPrice", id: l.id, version: l.version, price: l.price + 10 }));
const failedIds = new Set(["L3", "L7", "L11", "L19", "L28", "L35"]);
const results: BulkResult[] = listings.map((l) =>
  failedIds.has(l.id)
    ? { id: l.id, ok: false, error: { code: "MARKETPLACE_REJECTED", message: "Rejected", retryable: true } }
    : { id: l.id, ok: true, listing: { ...l, price: l.price + 10, version: 2 } },
);

describe("bulk helpers", () => {
  it("summarizes exactly which rows failed", () => {
    const s = summarize(results);
    expect(s.succeeded).toHaveLength(34);
    expect(s.failed.map((f) => f.id)).toEqual([...failedIds]);
  });

  it("retries only the 6 failed ops under a new idempotency key", () => {
    const retry = failedOps(ops, results, () => "retry-key");
    expect(retry.ops.map((o) => o.id)).toEqual([...failedIds]);
    expect(retry.idempotencyKey).toBe("retry-key");
  });

  it("undoes only the 34 successes, restoring old prices at the new version", () => {
    const before = new Map(listings.map((l) => [l.id, l]));
    const undo = buildUndo(ops, results, before, () => "undo-key");
    expect(undo.ops).toHaveLength(34);
    expect(undo.ops.some((o) => failedIds.has(o.id))).toBe(false);
    expect(undo.ops[0]).toEqual({ op: "setPrice", id: "L0", version: 2, price: 100 });
  });

  it("undoes a delist with a relist", () => {
    const l = listings[0]!;
    const delist: BulkOp[] = [{ op: "delist", id: l.id, version: 1, marketplace: "stubhub" }];
    const ok: BulkResult[] = [{ id: l.id, ok: true, listing: { ...l, version: 2 } }];
    expect(buildUndo(delist, ok, new Map([[l.id, l]])).ops).toEqual([
      { op: "relist", id: l.id, version: 2, marketplace: "stubhub" },
    ]);
  });
});
