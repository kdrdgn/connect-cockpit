import type { Listing, SyncEntry } from '@cockpit/contract';
import { makeListing } from '@cockpit/contract/testing';
import { describe, expect, it } from 'vitest';
import { buildFeed, canRetryEntry, entryText, isRetryable, issueText, topIssue } from './feed';

const now = Date.parse('2026-10-19T12:00:00.000Z');
const at = (msAgo: number) => new Date(now - msAgo).toISOString();
const live = (): SyncEntry => ({ state: 'live', updatedAt: at(0) });
const listing = (id: string, sync: Partial<Listing['sync']>, extra: Partial<Listing> = {}) =>
  makeListing({
    id,
    price: 100,
    marketPrice: 100,
    sync: { stubhub: live(), seatgeek: live(), vividseats: live(), ticombo: live(), ...sync },
    ...extra,
  });

const mismatch = listing('mismatch', { stubhub: { state: 'live', updatedAt: at(0), listedQuantity: 4 } }, { quantity: 2 });
const error = listing('error', { seatgeek: { state: 'error', updatedAt: at(0), lastError: 'Timed out' } });
const pending = listing('pending', { ticombo: { state: 'pending', updatedAt: at(5_000) } });
const stale = listing('stale', { vividseats: { state: 'pending', updatedAt: at(4 * 60_000) } });
const overpriced = listing('overpriced', {}, { price: 131 });
const healthy = listing('healthy', {});

describe('buildFeed', () => {
  it('orders worst first: mismatch, error, stale, overpriced, then fresh pending', () => {
    const feed = buildFeed([pending, overpriced, error, healthy, stale, mismatch], now);
    expect(feed.ids).toEqual(['mismatch', 'error', 'stale', 'overpriced', 'pending']);
  });

  it('leaves out healthy listings and does not count fresh pending as a problem', () => {
    const feed = buildFeed([healthy, pending, error], now);
    expect(feed.ids).not.toContain('healthy');
    expect(feed.problemCount).toBe(1);
  });
});

describe('issueText', () => {
  const text = (l: Listing) => issueText(topIssue(l, now), l, now);

  it.each([
    [mismatch, 'StubHub: shows 4, you have 2'],
    [error, 'SeatGeek: error'],
    [stale, 'Vivid Seats: pending 4 min'],
    [overpriced, 'Overpriced +31%'],
    [pending, 'Ticombo: pending'],
    [healthy, 'All marketplaces live'],
  ])('%#: %s', (l, expected) => {
    expect(text(l)).toBe(expected);
  });
});

describe('isRetryable', () => {
  it('offers retry for mismatch, error and stale pending only', () => {
    expect([mismatch, error, stale, overpriced, pending].map((l) => isRetryable(topIssue(l, now), l, now))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe('a mismatch being retried', () => {
  const retrying = listing('retrying', { stubhub: { state: 'pending', updatedAt: at(2_000), listedQuantity: 4 } }, { quantity: 2 });

  it('reads as pending and offers no second retry', () => {
    const issue = topIssue(retrying, now);
    expect(issueText(issue, retrying, now)).toBe('StubHub: shows 4, you have 2 · pending');
    expect(isRetryable(issue, retrying, now)).toBe(false);
  });
});

describe('entryText', () => {
  it.each([
    [{ state: 'live', updatedAt: at(0) }, 'Live'],
    [{ state: 'pending', updatedAt: at(4 * 60_000) }, 'Pending 4 min, stuck'],
    [{ state: 'live', updatedAt: at(0), listedQuantity: 4 }, 'Live · shows 4, you have 2'],
    [{ state: 'error', updatedAt: at(0), lastError: 'x' }, 'Error'],
    [{ state: 'not_listed', updatedAt: at(0) }, 'Not listed'],
  ] as [SyncEntry, string][])('%#: %s', (entry, expected) => {
    expect(entryText(entry, 2, now)).toBe(expected);
  });
});

describe('canRetryEntry', () => {
  it.each([
    [{ state: 'error', updatedAt: at(0) }, true],
    [{ state: 'pending', updatedAt: at(4 * 60_000) }, true],
    [{ state: 'pending', updatedAt: at(2_000) }, false],
    [{ state: 'live', updatedAt: at(0), listedQuantity: 4 }, true],
    [{ state: 'pending', updatedAt: at(2_000), listedQuantity: 4 }, false],
    [{ state: 'live', updatedAt: at(0) }, false],
  ] as [SyncEntry, boolean][])('%#: %s', (entry, expected) => {
    expect(canRetryEntry(entry, 2, now)).toBe(expected);
  });
});
