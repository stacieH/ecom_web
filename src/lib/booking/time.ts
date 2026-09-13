export const VENUE_TIME_ZONE = 'Asia/Manila';

type Parts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const longDateFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: VENUE_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const numericDateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: VENUE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Strings are assembled from parts rather than taken from format(), whose
// punctuation and spaces vary between ICU versions.
function partsOf(format: Intl.DateTimeFormat, date: Date): Parts {
  return format.formatToParts(date).reduce<Parts>((parts, part) => {
    parts[part.type] = part.value;
    return parts;
  }, {});
}

// Midday UTC is 8 PM the same day in Manila (UTC+8), so a bare calendar date
// never slips to the day before or after.
function middayOf(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

/** "6:30 PM" */
export function formatTime(instant: string): string {
  const { hour, minute, dayPeriod } = partsOf(clockFormat, new Date(instant));
  return `${hour}:${minute} ${dayPeriod?.toUpperCase()}`;
}

/** "Friday 2 October 2026" for a YYYY-MM-DD venue date. */
export function formatLongDate(date: string): string {
  const { weekday, day, month, year } = partsOf(longDateFormat, middayOf(date));
  return `${weekday} ${day} ${month} ${year}`;
}

/** YYYY-MM-DD calendar date of an instant, in Manila. */
export function venueDateOf(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  const { year, month, day } = partsOf(numericDateFormat, date);
  return `${year}-${month}-${day}`;
}

/** "Friday 2 October 2026 · 6:30 PM" */
export function formatDateTime(instant: string): string {
  return `${formatLongDate(venueDateOf(instant))} · ${formatTime(instant)}`;
}

/** The YYYY-MM-DD date `days` after `date`. */
export function addDays(date: string, days: number): string {
  const shifted = middayOf(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function formatPartySize(size: number): string {
  return size === 1 ? '1 guest' : `${size} guests`;
}
