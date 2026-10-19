import type { BulkResult, Listing } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { resultSummary, undoLabel } from "./BulkActions";
import type { LastBulk } from "./store";

const ok = (id: string): BulkResult => ({ id, ok: true, listing: { id } as Listing });
const bad = (id: string): BulkResult => ({ id, ok: false, error: { code: "MARKETPLACE_REJECTED", message: "no", retryable: true } });
const last = (intent: LastBulk["intent"], results: BulkResult[]): LastBulk => ({ kind: "apply", intent, ops: [], results, before: new Map() });

describe("bulk copy", () => {
  it("price: counts successes and failures, and undo names the count", () => {
    const b = last({ kind: "price", pct: -10 }, [...Array.from({ length: 34 }, (_, i) => ok(`a${i}`)), ...Array.from({ length: 6 }, (_, i) => bad(`b${i}`))]);
    expect(resultSummary(b)).toBe("34 updated, 6 failed");
    expect(undoLabel(b)).toBe("Undo 34 changes");
  });

  it("delist: undo is an honest relist", () => {
    const b = last({ kind: "delist", marketplace: "stubhub" }, [ok("a"), ok("b")]);
    expect(resultSummary(b)).toBe("2 delisted from StubHub");
    expect(undoLabel(b)).toBe("Relist 2 (may lose position)");
  });
});
