import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceGap } from "./PriceGap";
import { gapDisplay } from "./price";
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
