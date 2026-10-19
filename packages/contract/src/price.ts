// Fixed bands in basis points of marketPrice. Integer maths avoids 115/100 - 1 = 0.15000000000000002.
export const PRICE_BANDS = { atMarketBps: 500, overpricedBps: 1500 } as const;

// Safety limit for machine-suggested prices; deliberately separate from the health bands.
export const SUGGESTION_CLAMP = 0.3;

export type PriceBand = "overpriced" | "above" | "at_market" | "below" | "underpriced";

export type PriceHealth = {
  band: PriceBand;
  /** Gap to market as a whole percentage, e.g. 31 for +31%. */
  gapPercent: number;
};

export function priceGapBps(price: number, marketPrice: number): number {
  return Math.round(((price - marketPrice) / marketPrice) * 10_000);
}

export function priceHealth(price: number, marketPrice: number): PriceHealth {
  const bps = priceGapBps(price, marketPrice);
  const { atMarketBps, overpricedBps } = PRICE_BANDS;
  const band: PriceBand =
    bps > overpricedBps
      ? "overpriced"
      : bps > atMarketBps
        ? "above"
        : bps >= -atMarketBps
          ? "at_market"
          : bps >= -overpricedBps
            ? "below"
            : "underpriced";
  return { band, gapPercent: Math.round(bps / 100) };
}

/** Clamps a suggested price to within ±30% of marketPrice, rounded to pence. */
export function clampSuggestion(suggested: number, marketPrice: number): number {
  const min = marketPrice * (1 - SUGGESTION_CLAMP);
  const max = marketPrice * (1 + SUGGESTION_CLAMP);
  return Math.round(Math.min(max, Math.max(min, suggested)) * 100) / 100;
}
