import { describe, expect, it } from "vitest";
import { clampSuggestion, priceHealth } from "./price";

describe("priceHealth", () => {
  it("treats exactly +15% as above, not overpriced", () => {
    expect(priceHealth(115, 100).band).toBe("above");
  });

  it("flags 131 against 100 as overpriced +31%", () => {
    expect(priceHealth(131, 100)).toEqual({ band: "overpriced", gapPercent: 31 });
  });

  it.each([
    [105, "at_market"],
    [95, "at_market"],
    [94, "below"],
    [85, "below"],
    [78, "underpriced"],
  ] as const)("price %d against 100 is %s", (price, band) => {
    expect(priceHealth(price, 100).band).toBe(band);
  });
});

describe("clampSuggestion", () => {
  it("clamps a suggestion of 1 against market 100 up to 70", () => {
    expect(clampSuggestion(1, 100)).toBe(70);
  });

  it("clamps above +30% down to 130 and keeps in-band values", () => {
    expect(clampSuggestion(500, 100)).toBe(130);
    expect(clampSuggestion(98.456, 100)).toBe(98.46);
  });
});
