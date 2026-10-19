import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceGap } from "./PriceGap";
import { formatPrice, gapDisplay, priceWarning } from "./price";
import styles from "./PriceGap.module.css";

const tierOf = (price: number) => {
  const { container } = render(<PriceGap price={price} marketPrice={100} />);
  return container.querySelector("[data-tier]")!;
};

describe("PriceGap", () => {
  it("at market is muted: 102 against 100 is +2%", () => {
    expect(gapDisplay(102, 100)).toMatchObject({ text: "+2%", band: "at_market", tier: "muted" });
    expect(tierOf(102).className).toContain(styles.muted);
  });

  it("above market is ink with no colour: 110 is +10%", () => {
    expect(gapDisplay(110, 100)).toMatchObject({ text: "+10%", band: "above", tier: "ink", label: "10% above market" });
    expect(tierOf(110).className).toContain(styles.ink);
  });

  it("overpriced is attention with one glyph: 125 is +25%", () => {
    expect(gapDisplay(125, 100)).toMatchObject({ text: "+25%", tier: "attention", direction: "up", label: "25% above market, overpriced" });
    const el = tierOf(125);
    expect(el.className).toContain(styles.attention);
    expect(el.querySelector("path")!.getAttribute("d")!.match(/M/g)).toHaveLength(1);
  });

  it("exactly 30% is still attention, not strong", () => {
    expect(gapDisplay(130, 100).tier).toBe("attention");
    expect(gapDisplay(70, 100).tier).toBe("attention");
  });

  it("beyond 30% is strong, with a doubled glyph and words for it: 142 is +42%", () => {
    expect(gapDisplay(142, 100)).toMatchObject({
      text: "+42%",
      tier: "strong",
      direction: "up",
      label: "42% above market, overpriced, far from market",
    });
    const el = tierOf(142);
    expect(el.className).toContain(styles.strong);
    expect(el.querySelector("path")!.getAttribute("d")!.match(/M/g)).toHaveLength(2);
    expect(screen.getByText("42% above market, overpriced, far from market")).toBeTruthy();
  });

  it("far below market is strong too, pointing down with a real minus sign: 68 is −32%", () => {
    expect(gapDisplay(68, 100)).toMatchObject({ text: "−32%", band: "underpriced", tier: "strong", direction: "down" });
  });
});

describe("price limits", () => {
  it("caps a huge gap at +999%+ but keeps the exact figure for screen readers", () => {
    expect(gapDisplay(99_999, 250)).toMatchObject({ text: "+999%+", label: "39900% above market, overpriced, far from market" });
  });

  it("groups thousands in prices", () => {
    expect([formatPrice(99_999), formatPrice(48.5), formatPrice(260)]).toEqual(["£99,999", "£48.50", "£260"]);
  });

  it("warns about prices beyond ±50% of market only", () => {
    expect(priceWarning(140, 100)).toBeNull();
    expect(priceWarning(60, 100)).toBeNull();
    expect(priceWarning(99_999, 250)).toBe("£99,999 is 400× market (£250). Press Enter again to save.");
    expect(priceWarning(170, 100)).toBe("£170 is 70% above market (£100). Press Enter again to save.");
    expect(priceWarning(30, 100)).toBe("£30 is 70% below market (£100). Press Enter again to save.");
  });
});
