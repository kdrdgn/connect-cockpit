import { FAR_FROM_MARKET_BPS, type PriceBand, priceGapBps, priceHealth } from "@cockpit/contract";

/**
 * How loud the gap is, by distance from market: muted at market, ink above or below, attention when over- or
 * underpriced, strong beyond the suggestion clamp. Strong is told apart by a doubled glyph as well as colour.
 */
export type GapTier = "muted" | "ink" | "attention" | "strong";

export type GapDisplay = {
  band: PriceBand;
  /** "+31%", "−9%", "0%". Uses a real minus sign so columns of figures line up. */
  text: string;
  direction: "up" | "down" | "flat";
  tier: GapTier;
  /** Words for assistive tech: "31% above market, overpriced", "42% above market, overpriced, far from market". */
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
  // Capped so a fat-fingered price can't push the figure into the next column; the label keeps the exact value.
  const shown = Math.min(Math.abs(gapPercent), 999);
  const capped = Math.abs(gapPercent) > 999 ? "+" : "";
  const text = gapPercent > 0 ? `+${shown}%${capped}` : gapPercent < 0 ? `−${shown}%${capped}` : "0%";
  const where = gapPercent === 0 ? "at market" : `${Math.abs(gapPercent)}% ${gapPercent > 0 ? "above" : "below"} market`;
  const far = Math.abs(priceGapBps(price, marketPrice)) > FAR_FROM_MARKET_BPS;
  const tier: GapTier =
    band === "at_market" ? "muted" : band === "above" || band === "below" ? "ink" : far ? "strong" : "attention";
  return {
    band,
    text,
    direction,
    tier,
    label:
      tier === "muted" || tier === "ink"
        ? where
        : `${where}, ${BAND_WORDS[band]}${tier === "strong" ? ", far from market" : ""}`,
  };
}

/** "£260", "£48.50", "£99,999". Grouped so a large figure reads as large. */
export const formatPrice = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** Prices further than this from market need a second Enter: almost always a typo, and a costly one. */
export const PRICE_CONFIRM_BAND = 0.5;

/** The question to ask before saving an outlying price, or null when the price is within the band. */
export function priceWarning(price: number, marketPrice: number): string | null {
  const ratio = price / marketPrice;
  if (ratio <= 1 + PRICE_CONFIRM_BAND && ratio >= 1 - PRICE_CONFIRM_BAND) return null;
  const how =
    ratio >= 2
      ? `${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)}× market`
      : `${Math.round(Math.abs(ratio - 1) * 100)}% ${ratio > 1 ? "above" : "below"} market`;
  return `${formatPrice(price)} is ${how} (${formatPrice(marketPrice)}). Press Enter again to save.`;
}
