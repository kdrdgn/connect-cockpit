import { describe, expect, it } from "vitest";
import { LAYOUT, VENUES } from "./venue";

describe("LAYOUT", () => {
  it("has 16 sections with unique ids", () => {
    const ids = LAYOUT.sections.map((s) => s.id);
    expect(ids).toHaveLength(16);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("draws every section as a polygon of at least 3 points", () => {
    for (const s of LAYOUT.sections) expect(s.points.length).toBeGreaterThanOrEqual(3);
  });

  it("is shared by several distinct venues", () => {
    expect(new Set(VENUES).size).toBeGreaterThanOrEqual(4);
  });
});
