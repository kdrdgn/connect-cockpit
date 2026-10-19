import { describe, expect, it } from "vitest";
import { clampSuggestion, priceHealth, suggestPrice } from "./price";

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

describe("suggestPrice", () => {
  it("takes 95% of market when it's above the error's floor: 96 at 120 -> 114", () => {
    expect(suggestPrice({ floor: 96, marketPrice: 120 })).toEqual({ price: 114, capped: false });
  });

  it("caps a floor far above market at +30%: 500 at 100 -> 130", () => {
    expect(suggestPrice({ floor: 500, marketPrice: 100 })).toEqual({ price: 130, capped: true });
  });

  it("works without a floor", () => {
    expect(suggestPrice({ marketPrice: 120 })).toEqual({ price: 114, capped: false });
  });

  it("follows a floor above 95% of market, rounded up to a whole pound", () => {
    expect(suggestPrice({ floor: 110.2, marketPrice: 100 })).toEqual({ price: 111, capped: false });
  });
});
