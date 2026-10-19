import {
  compareProblems,
  type Issue,
  issuesOf,
  type Listing,
  type Marketplace,
  priceHealth,
  problemsOf,
  STALE_PENDING_MS,
} from '@cockpit/contract';

export const MARKETPLACE_NAME: Record<Marketplace, string> = {
  stubhub: 'StubHub',
  seatgeek: 'SeatGeek',
  vividseats: 'Vivid Seats',
  ticombo: 'Ticombo',
};

/** Problems, plus listings with an ordinary pending marketplace (shown last, not counted), worst first. */
export function buildFeed(listings: readonly Listing[], now: number): { ids: string[]; problemCount: number } {
  let problemCount = 0;
  const kept = listings.filter((l) => {
    const isProblem = problemsOf(l, now).length > 0;
    if (isProblem) problemCount++;
    return isProblem || issuesOf(l, now).some((i) => i.kind === 'pending');
  });
  kept.sort((a, b) => compareProblems(a, b, now));
  return { ids: kept.map((l) => l.id), problemCount };
}

/** The issue that leads a row: the most urgent one, or null when the listing has recovered since the feed was built. */
export const topIssue = (listing: Listing, now: number): Issue | null => issuesOf(listing, now)[0] ?? null;

/**
 * A mismatch stays a mismatch while its retry is pending (the marketplace still reports the old count),
 * so the row says "pending" and stops offering Retry until the sync lands or goes stale.
 */
const syncingMismatch = (issue: Issue, listing: Listing, now: number) => {
  const entry = issue.marketplace && listing.sync[issue.marketplace];
  return (
    issue.kind === 'quantity_mismatch' &&
    entry?.state === 'pending' &&
    now - Date.parse(entry.updatedAt) <= STALE_PENDING_MS
  );
};

/** Issues a sync retry can fix; overpriced, fresh pending and an in-flight mismatch retry can't be retried. */
export const isRetryable = (
  issue: Issue | null,
  listing: Listing,
  now: number,
): issue is Issue & { marketplace: Marketplace } =>
  !!issue?.marketplace &&
  (issue.kind === 'error' || issue.kind === 'stale_pending' || issue.kind === 'quantity_mismatch') &&
  !syncingMismatch(issue, listing, now);

export function shortDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.round(m / 60)} h`;
}

/** The words for an issue, used on the row and in its screen-reader label, so status never relies on colour. */
export function issueText(issue: Issue | null, listing: Listing, now: number): string {
  if (!issue) return 'All marketplaces live';
  const name = issue.marketplace ? MARKETPLACE_NAME[issue.marketplace] : '';
  const entry = issue.marketplace ? listing.sync[issue.marketplace] : undefined;
  switch (issue.kind) {
    case 'quantity_mismatch':
      return `${name}: shows ${entry?.listedQuantity}, you have ${listing.quantity}${syncingMismatch(issue, listing, now) ? ' · pending' : ''}`;
    case 'error':
      return `${name}: error`;
    case 'stale_pending':
      return `${name}: pending ${shortDuration(now - Date.parse(entry!.updatedAt))}`;
    case 'overpriced':
      return `Overpriced +${priceHealth(listing.price, listing.marketPrice).gapPercent}%`;
    case 'pending':
      return `${name}: pending`;
  }
}

/** A shape per issue kind, mirroring the console, so the row reads without colour. */
export const ISSUE_GLYPH: Record<Issue['kind'] | 'none', string> = {
  quantity_mismatch: '◆',
  error: '▲',
  stale_pending: '◔',
  overpriced: '↑',
  pending: '●',
  none: '✓',
};

/** One marketplace's state in words, for the listing screen. */
export function entryText(entry: Listing['sync'][Marketplace], quantity: number, now: number): string {
  const listed = entry.state === 'live' || entry.state === 'pending';
  const mismatch = listed && entry.listedQuantity !== undefined && entry.listedQuantity !== quantity;
  const base =
    entry.state === 'pending'
      ? now - Date.parse(entry.updatedAt) > STALE_PENDING_MS
        ? `Pending ${shortDuration(now - Date.parse(entry.updatedAt))}, stuck`
        : 'Pending'
      : entry.state === 'error'
        ? 'Error'
        : entry.state === 'live'
          ? 'Live'
          : 'Not listed';
  return mismatch ? `${base} · shows ${entry.listedQuantity}, you have ${quantity}` : base;
}

/** Whether one marketplace offers Retry sync: in error, stuck pending, or a mismatch not already being retried. */
export function canRetryEntry(entry: Listing['sync'][Marketplace], quantity: number, now: number): boolean {
  const freshPending = entry.state === 'pending' && now - Date.parse(entry.updatedAt) <= STALE_PENDING_MS;
  if (entry.state === 'error' || (entry.state === 'pending' && !freshPending)) return true;
  const listed = entry.state === 'live' || entry.state === 'pending';
  return listed && !freshPending && entry.listedQuantity !== undefined && entry.listedQuantity !== quantity;
}
