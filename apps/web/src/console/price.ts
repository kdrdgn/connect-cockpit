import { type PriceBand, priceHealth } from "@cockpit/contract";

export type GapDisplay = {
  band: PriceBand;
  /** "+31%", "−9%", "0%". Uses a real minus sign so columns of figures line up. */
  text: string;
  direction: "up" | "down" | "flat";
  attention: boolean;
  /** Words for assistive tech: "31% above market, overpriced". */
  label: string;
};

const BAND_WORDS: Record<PriceBand, string> = {
  overpriced: "overpriced",
  above: "above market",
  at_market: "at market",
  below: "below market",
  underpriced: "underpriced",
};

export function gapDisplay(price: number, marketPrice: number): GapDisplay {
  const { band, gapPercent } = priceHealth(price, marketPrice);
  const direction = band === "at_market" ? "flat" : gapPercent > 0 ? "up" : "down";
  const text = gapPercent > 0 ? `+${gapPercent}%` : gapPercent < 0 ? `−${-gapPercent}%` : "0%";
  const where = gapPercent === 0 ? "at market" : `${Math.abs(gapPercent)}% ${gapPercent > 0 ? "above" : "below"} market`;
  return {
    band,
    text,
    direction,
    attention: band === "overpriced" || band === "underpriced",
    label: band === "at_market" || band === "above" || band === "below" ? where : `${where}, ${BAND_WORDS[band]}`,
  };
}

export const formatPrice = (n: number) => `£${Number.isInteger(n) ? n : n.toFixed(2)}`;
