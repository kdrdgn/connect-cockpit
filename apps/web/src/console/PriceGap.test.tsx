import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceGap } from "./PriceGap";
import { formatPrice, gapDisplay, priceWarning } from "./price";
import styles from "./PriceGap.module.css";

describe("PriceGap", () => {
  it("131 against 100 is +31% in the attention colour", () => {
    expect(gapDisplay(131, 100)).toMatchObject({ text: "+31%", band: "overpriced", attention: true, direction: "up" });
    render(<PriceGap price={131} marketPrice={100} />);
    const el = screen.getByText("31% above market, overpriced").parentElement!;
    expect(el.className).toContain(styles.attention);
  });

  it("102 against 100 is +2% in ink", () => {
    expect(gapDisplay(102, 100)).toMatchObject({ text: "+2%", band: "at_market", attention: false });
    render(<PriceGap price={102} marketPrice={100} />);
    expect(screen.getByText("2% above market").parentElement!.className).not.toContain(styles.attention);
  });

  it("underpriced is coloured and uses a real minus sign", () => {
    expect(gapDisplay(78, 100)).toMatchObject({ text: "−22%", band: "underpriced", attention: true });
  });
});

describe("price limits", () => {
  it("caps a huge gap at +999%+ but keeps the exact figure for screen readers", () => {
    expect(gapDisplay(99_999, 250)).toMatchObject({ text: "+999%+", label: "39900% above market, overpriced" });
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
