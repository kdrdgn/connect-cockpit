import { type Listing, MARKETPLACES, type Marketplace } from "./listing";
import { priceHealth } from "./price";

// Compressed for the mock, where drift happens every few seconds. Production would be ~5 minutes.
export const STALE_PENDING_MS = 30_000;

/** Ordered most to least urgent. Overselling costs more than a missing listing. */
export const ISSUE_KINDS = ["quantity_mismatch", "error", "stale_pending", "overpriced", "pending"] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export type Issue = { kind: IssueKind; marketplace?: Marketplace };

/** Every issue on a listing, including fresh pending, which is shown but is not a problem. */
export function issuesOf(listing: Listing, now: number): Issue[] {
  const issues: Issue[] = [];
  for (const marketplace of MARKETPLACES) {
    const s = listing.sync[marketplace];
    const listed = s.state === "live" || s.state === "pending";
    if (listed && s.listedQuantity !== undefined && s.listedQuantity !== listing.quantity) {
      issues.push({ kind: "quantity_mismatch", marketplace });
    }
    if (s.state === "error") issues.push({ kind: "error", marketplace });
    if (s.state === "pending") {
      const stale = now - Date.parse(s.updatedAt) > STALE_PENDING_MS;
      issues.push({ kind: stale ? "stale_pending" : "pending", marketplace });
    }
  }
  if (priceHealth(listing.price, listing.marketPrice).band === "overpriced") {
    issues.push({ kind: "overpriced" });
  }
  return issues.sort((a, b) => ISSUE_KINDS.indexOf(a.kind) - ISSUE_KINDS.indexOf(b.kind));
}

/** Problems are issues that need the broker. Fresh pending and underpriced do not. */
export function problemsOf(listing: Listing, now: number): Issue[] {
  return issuesOf(listing, now).filter((i) => i.kind !== "pending");
}

export function isProblem(listing: Listing, now: number): boolean {
  return problemsOf(listing, now).length > 0;
}

/** Sort key: most urgent issue kind first, then soonest event. Listings without issues sort last. */
export function problemRank(listing: Listing, now: number): [number, number] {
  const top = issuesOf(listing, now)[0];
  return [top ? ISSUE_KINDS.indexOf(top.kind) : ISSUE_KINDS.length, Date.parse(listing.date)];
}

export function compareProblems(a: Listing, b: Listing, now: number): number {
  const [ka, da] = problemRank(a, now);
  const [kb, db] = problemRank(b, now);
  return ka - kb || da - db;
}
