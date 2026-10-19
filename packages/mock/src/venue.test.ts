import { describe, expect, it } from "vitest";
import { VENUE } from "./venue";

describe("VENUE", () => {
  it("has 16 sections with unique ids", () => {
    const ids = VENUE.sections.map((s) => s.id);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws every section as a polygon of at least 3 points", () => {
    for (const s of VENUE.sections) expect(s.points.length).toBeGreaterThanOrEqual(3);
  });
});
