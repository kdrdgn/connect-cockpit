import type { SyncEntry } from "@cockpit/contract";
import { describe, expect, it } from "vitest";
import { syncKind, syncLabel } from "./sync";

const now = Date.parse("2026-10-19T12:00:00Z");
const at = (msAgo: number) => new Date(now - msAgo).toISOString();
const entry = (e: Partial<SyncEntry>): SyncEntry => ({ state: "live", updatedAt: at(1000), ...e });

describe("syncLabel", () => {
  it("names the marketplace, the state and the error", () => {
    const e = entry({ state: "error", lastError: "Price below event minimum of £45" });
    expect(syncLabel("stubhub", e, 2, now)).toBe("StubHub: error. Price below event minimum of £45");
  });

  it("describes a quantity mismatch in words", () => {
    expect(syncLabel("stubhub", entry({ listedQuantity: 4 }), 2, now)).toBe("StubHub: listed 4, you have 2");
    expect(syncKind(entry({ listedQuantity: 4 }), 2, now)).toBe("mismatch");
  });

  it("says how long a stale pending has been pending", () => {
    const e = entry({ state: "pending", updatedAt: at(4 * 60_000) });
    expect(syncLabel("stubhub", e, 2, now)).toBe("StubHub: pending for 4 minutes");
  });

  it("keeps fresh pending plain", () => {
    expect(syncLabel("seatgeek", entry({ state: "pending", updatedAt: at(5000) }), 2, now)).toBe("SeatGeek: pending");
  });

  it("ignores listedQuantity when not listed", () => {
    expect(syncLabel("ticombo", entry({ state: "not_listed", listedQuantity: 4 }), 2, now)).toBe("Ticombo: not listed");
  });

  it("truncates very long errors", () => {
    const label = syncLabel("vividseats", entry({ state: "error", lastError: "x".repeat(300) }), 1, now);
    expect(label.length).toBeLessThan(150);
    expect(label.endsWith("…")).toBe(true);
  });
});
