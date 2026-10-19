import { z } from "zod";

export const MARKETPLACES = ["stubhub", "seatgeek", "vividseats", "ticombo"] as const;
export const Marketplace = z.enum(MARKETPLACES);
export type Marketplace = z.infer<typeof Marketplace>;

export const SYNC_STATES = ["live", "pending", "error", "not_listed"] as const;
export const SyncState = z.enum(SYNC_STATES);
export type SyncState = z.infer<typeof SyncState>;

export const SyncEntry = z.object({
  state: SyncState,
  lastError: z.string().optional(),
  updatedAt: z.iso.datetime(),
  // What the marketplace reports as listed; differs from quantity when out of sync.
  listedQuantity: z.number().int().nonnegative().optional(),
});
export type SyncEntry = z.infer<typeof SyncEntry>;

export const Listing = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  venue: z.string().min(1),
  date: z.iso.datetime(),
  section: z.string().min(1),
  row: z.string().min(1),
  quantity: z.number().int().nonnegative(),
  // GBP per ticket.
  price: z.number().positive(),
  marketPrice: z.number().positive(),
  version: z.number().int().nonnegative(),
  sync: z.object({
    stubhub: SyncEntry,
    seatgeek: SyncEntry,
    vividseats: SyncEntry,
    ticombo: SyncEntry,
  }),
});
export type Listing = z.infer<typeof Listing>;
