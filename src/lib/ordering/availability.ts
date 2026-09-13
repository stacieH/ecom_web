import { formatLongDate, formatTime } from '@/lib/booking/time';
import type { OrderingStatus, SlotList } from './types';

export type Availability =
  | { kind: 'open' }
  | { kind: 'closedToday'; message: string }
  | { kind: 'paused'; message: string }
  | { kind: 'closed'; message: string };

/**
 * What the menu banner says. `days` is today then tomorrow. When only today is
 * over, guests can still order ahead for tomorrow, so only `paused` and
 * `closed` disable the Add buttons.
 */
export function describeAvailability(status: OrderingStatus, days: SlotList[] | null): Availability {
  if (!status.acceptingOrders) {
    return { kind: 'paused', message: status.message ?? 'Online ordering is paused right now.' };
  }
  if (!days) return { kind: 'open' };

  const [today, ...later] = days;
  if (today && today.slots.length > 0) return { kind: 'open' };

  const next = later.find((candidate) => candidate.slots.length > 0);
  if (!next) {
    return { kind: 'closed', message: 'Online ordering is closed right now.' };
  }

  const weekday = formatLongDate(next.date).split(' ')[0];
  return {
    kind: 'closedToday',
    message: `Online ordering is closed right now. Next orders from ${weekday} ${formatTime(next.slots[0].startsAt)}`,
  };
}
