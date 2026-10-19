import { type ListQuery, type Listing, type SortField, isProblem } from "@cockpit/contract";

const day = (iso: string) => iso.slice(0, 10);

/** AND across filter kinds, OR within repeated `sync` values. */
export function matches(l: Listing, q: ListQuery, now: number): boolean {
  if (q.q && !l.event.toLowerCase().includes(q.q.toLowerCase())) return false;
  if (q.dateFrom && day(l.date) < q.dateFrom) return false;
  if (q.dateTo && day(l.date) > q.dateTo) return false;
  if (q.priceMin !== undefined && l.price < q.priceMin) return false;
  if (q.priceMax !== undefined && l.price > q.priceMax) return false;
  if (q.section && l.section !== q.section) return false;
  if (q.sync.length > 0 && !q.sync.some((f) => l.sync[f.marketplace].state === f.state)) return false;
  if (q.problem === "any" && !isProblem(l, now)) return false;
  return true;
}

type Key = { v: string | number; id: string };

const keyOf = (l: Listing, field: SortField): Key => ({ v: l[field], id: l.id });

function compareKeys(a: Key, b: Key): number {
  const byValue = typeof a.v === "number" && typeof b.v === "number" ? a.v - b.v : String(a.v).localeCompare(String(b.v));
  return byValue || a.id.localeCompare(b.id);
}

// Opaque keyset cursor: the sort key of the last row returned. Behaves like a DB keyset at 50k rows.
// URL-safe base64 without padding, so no "=" or "+" can be mangled by a query-string parser.
export function encodeCursor(k: Key): string {
  return btoa(encodeURIComponent(JSON.stringify(k))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(cursor: string): Key | null {
  try {
    const b64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
    const k: unknown = JSON.parse(decodeURIComponent(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4))));
    if (k && typeof k === "object" && "id" in k && "v" in k && typeof k.id === "string") {
      if (typeof k.v === "string" || typeof k.v === "number") return { v: k.v, id: k.id };
    }
    return null;
  } catch {
    return null;
  }
}

export function page(all: Listing[], q: ListQuery, now: number, after: Key | null) {
  const dir = q.sort.dir === "asc" ? 1 : -1;
  const sorted = all
    .filter((l) => matches(l, q, now))
    .sort((a, b) => dir * compareKeys(keyOf(a, q.sort.field), keyOf(b, q.sort.field)));
  const start = after ? sorted.findIndex((l) => dir * compareKeys(keyOf(l, q.sort.field), after) > 0) : 0;
  const items = start === -1 ? [] : sorted.slice(start, start + q.limit);
  const last = items[items.length - 1];
  const hasMore = start !== -1 && start + q.limit < sorted.length;
  return {
    items,
    total: sorted.length,
    nextCursor: hasMore && last ? encodeCursor(keyOf(last, q.sort.field)) : null,
  };
}
