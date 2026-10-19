import { describe, expect, it } from 'vitest';
import { formatDate, formatDateLong } from './format';

// Built from local time, as the phone formats in the device's time zone.
const friday = new Date(2026, 9, 30, 19, 30).toISOString();

describe('dates', () => {
  it('shows day and short month in the feed, day first', () => {
    expect(formatDate(friday)).toBe('30 Oct');
  });

  it('keeps the weekday on the detail', () => {
    expect(formatDateLong(friday)).toBe('Friday 30 October');
  });
});
