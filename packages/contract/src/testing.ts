import type { Listing, SyncEntry } from "./listing";

const live = (updatedAt: string): SyncEntry => ({ state: "live", updatedAt });

// Test fixture builder; shared by package tests, not used by app code.
export function makeListing(overrides: Partial<Listing> = {}): Listing {
  const at = "2026-10-19T12:00:00.000Z";
  return {
    id: "L0001",
    event: "Glass Harbour",
    venue: "Harbour Arena",
    date: "2026-11-20T19:30:00.000Z",
    section: "104",
    row: "F",
    quantity: 4,
    price: 120,
    marketPrice: 118,
    version: 1,
    sync: { stubhub: live(at), seatgeek: live(at), vividseats: live(at), ticombo: live(at) },
    ...overrides,
  };
}
