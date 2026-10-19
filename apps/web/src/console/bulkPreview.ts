import { type BulkOp, type Listing, type Marketplace, type PriceHealth, priceHealth, type SyncState } from "@cockpit/contract";

export type BulkIntent = { kind: "price"; pct: number } | { kind: "delist"; marketplace: Marketplace };

export type PreviewRow =
  | { id: string; listing: Listing; kind: "price"; oldPrice: number; newPrice: number; health: PriceHealth }
  | { id: string; listing: Listing; kind: "delist"; state: SyncState; skip: boolean };

export const MIN_PRICE = 1;

/** Whole pounds, never below £1. Integer maths, so 125 at −10% is exactly 112.5 and rounds to 113. */
export function applyPct(price: number, pct: number): number {
  return Math.max(MIN_PRICE, Math.round((price * (100 + pct)) / 100));
}

/**
 * What a bulk action would do, row by row, before anything is sent. The ops carry absolute prices and each
 * row's version, so what is applied is exactly what was previewed; a row that changed since fails on its own.
 */
export function previewBulk(listings: readonly Listing[], intent: BulkIntent): { rows: PreviewRow[]; ops: BulkOp[] } {
  const rows: PreviewRow[] = [];
  const ops: BulkOp[] = [];
  for (const l of listings) {
    if (intent.kind === "price") {
      const newPrice = applyPct(l.price, intent.pct);
      rows.push({ id: l.id, listing: l, kind: "price", oldPrice: l.price, newPrice, health: priceHealth(newPrice, l.marketPrice) });
      if (newPrice !== l.price) ops.push({ op: "setPrice", id: l.id, version: l.version, price: newPrice });
    } else {
      const state = l.sync[intent.marketplace].state;
      const skip = state === "not_listed";
      rows.push({ id: l.id, listing: l, kind: "delist", state, skip });
      if (!skip) ops.push({ op: "delist", id: l.id, version: l.version, marketplace: intent.marketplace });
    }
  }
  return { rows, ops };
}
