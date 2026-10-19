import { type Marketplace, STALE_PENDING_MS, type SyncEntry } from "@cockpit/contract";

export const MARKETPLACE_NAME: Record<Marketplace, string> = {
  stubhub: "StubHub",
  seatgeek: "SeatGeek",
  vividseats: "Vivid Seats",
  ticombo: "Ticombo",
};

export const MARKETPLACE_SHORT: Record<Marketplace, string> = {
  stubhub: "SH",
  seatgeek: "SG",
  vividseats: "VV",
  ticombo: "TC",
};

/** What a sync cell draws. A quantity mismatch outranks the state it happens in, because overselling costs most. */
export type SyncKind = "live" | "pending" | "stale" | "error" | "not_listed" | "mismatch";

export function syncKind(entry: SyncEntry, quantity: number, now: number): SyncKind {
  const listed = entry.state === "live" || entry.state === "pending";
  if (listed && entry.listedQuantity !== undefined && entry.listedQuantity !== quantity) return "mismatch";
  if (entry.state === "pending") return now - Date.parse(entry.updatedAt) > STALE_PENDING_MS ? "stale" : "pending";
  return entry.state;
}

/** Kinds that use the attention colour. Everything else is ink. */
export const ATTENTION_KINDS: ReadonlySet<SyncKind> = new Set(["error", "stale", "mismatch"]);

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  return `${h} hour${h === 1 ? "" : "s"}`;
}

const MAX_ERROR = 120;

/** The words for a sync cell, so its state never depends on colour or shape alone. */
export function syncLabel(marketplace: Marketplace, entry: SyncEntry, quantity: number, now: number): string {
  const name = MARKETPLACE_NAME[marketplace];
  switch (syncKind(entry, quantity, now)) {
    case "mismatch":
      return `${name}: listed ${entry.listedQuantity}, you have ${quantity}`;
    case "error": {
      const msg = entry.lastError?.trim();
      if (!msg) return `${name}: error`;
      return `${name}: error. ${msg.length > MAX_ERROR ? `${msg.slice(0, MAX_ERROR - 1)}…` : msg}`;
    }
    case "stale":
      return `${name}: pending for ${formatDuration(now - Date.parse(entry.updatedAt))}`;
    case "pending":
      return `${name}: pending`;
    case "live":
      return `${name}: live`;
    case "not_listed":
      return `${name}: not listed`;
  }
}
