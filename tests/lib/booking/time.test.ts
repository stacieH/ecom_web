import {
  addDays,
  formatDateTime,
  formatLongDate,
  formatPartySize,
  formatTime,
  venueDateOf,
  VENUE_TIME_ZONE,
} from '@/lib/booking/time';

describe('venue time helpers', () => {
  it('pins the venue time zone', () => {
    expect(VENUE_TIME_ZONE).toBe('Asia/Manila');
  });

  it('formats an instant as a Manila clock time', () => {
    expect(formatTime('2026-10-02T10:30:00Z')).toBe('6:30 PM');
    expect(formatTime('2026-10-02T04:05:00Z')).toBe('12:05 PM');
  });

  it('formats a time after midnight as AM', () => {
    expect(formatTime('2026-10-02T16:30:00Z')).toBe('12:30 AM');
  });

  it('formats a venue date in full without shifting the day', () => {
    expect(formatLongDate('2026-10-02')).toBe('Friday 2 October 2026');
    expect(formatLongDate('2027-01-01')).toBe('Friday 1 January 2027');
  });

  it('combines the date and time of an instant', () => {
    expect(formatDateTime('2026-10-02T10:30:00Z')).toBe('Friday 2 October 2026 · 6:30 PM');
  });

  it('finds the Manila calendar date of an instant', () => {
    expect(venueDateOf('2026-10-02T15:59:00Z')).toBe('2026-10-02');
    expect(venueDateOf('2026-10-02T16:00:00Z')).toBe('2026-10-03');
    expect(venueDateOf(new Date('2026-09-11T20:00:00Z'))).toBe('2026-09-12');
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-10-02', 60)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-10-02', 0)).toBe('2026-10-02');
  });

  it('counts guests in words', () => {
    expect(formatPartySize(1)).toBe('1 guest');
    expect(formatPartySize(4)).toBe('4 guests');
  });
});
