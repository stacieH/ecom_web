// Mirrors the SlotPlanner rules in the 3A spec, "Slots". Manila is UTC+8 all
// year (no daylight saving), so wall times convert with a fixed offset, and a
// 15-minute boundary in UTC is also one in Manila.
import { addDays, venueDateOf } from '@/lib/booking/time';
import type { Fulfilment, Slot, SlotList } from '../types';
import type { MockSettings, ServiceDayRule } from './mockData';

const MINUTE = 60_000;
const SLOT_MINUTES = 15;
const DAY = 24 * 60 * MINUTE;

export function isoInstant(ms: number): string {
  return new Date(ms).toISOString().replace('.000Z', 'Z');
}

export function manilaInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

export function isoWeekday(date: string): ServiceDayRule['weekday'] {
  const day = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  return (day === 0 ? 7 : day) as ServiceDayRule['weekday'];
}

export function offeredDates(now: Date, settings: MockSettings): string[] {
  const today = venueDateOf(now);
  return settings.daysAhead === 1 ? [today, addDays(today, 1)] : [today];
}

export function orderingWindow(
  date: string,
  serviceDays: ServiceDayRule[],
  settings: MockSettings,
): { opens: Date; lastSlot: Date } | null {
  const rule = serviceDays.find((day) => day.weekday === isoWeekday(date));
  if (!rule?.opensAt || !rule.closesAt) return null;

  const opens = manilaInstant(date, rule.opensAt);
  let closes = manilaInstant(date, rule.closesAt);
  // A closing time at or before opening belongs to the next calendar day.
  if (closes.getTime() <= opens.getTime()) closes = new Date(closes.getTime() + DAY);

  const lastSlot = new Date(closes.getTime() - settings.lastOrderMinutesBeforeClose * MINUTE);
  return lastSlot.getTime() >= opens.getTime() ? { opens, lastSlot } : null;
}

export function roundUpToSlot(instant: Date): Date {
  const size = SLOT_MINUTES * MINUTE;
  return new Date(Math.ceil(instant.getTime() / size) * size);
}

export function promisedAt(fulfilment: Fulfilment, slotStart: string): string {
  const start = Date.parse(slotStart);
  return isoInstant(fulfilment === 'DELIVERY' ? start + SLOT_MINUTES * MINUTE : start);
}

export interface PlanSlotsInput {
  now: Date;
  date: string;
  fulfilment: Fulfilment;
  settings: MockSettings;
  serviceDays: ServiceDayRule[];
  extraMinutes: number;
  usedCount: (fulfilment: Fulfilment, startsAt: string) => number;
  nextSlotFull: boolean;
}

export function planSlots(input: PlanSlotsInput): SlotList {
  const { now, date, fulfilment, settings } = input;
  const empty: SlotList = { date, fulfilment, asapStartsAt: null, slots: [] };

  const enabled = fulfilment === 'PICKUP' ? settings.pickupEnabled : settings.deliveryEnabled;
  if (!settings.acceptingOrders || !enabled || !offeredDates(now, settings).includes(date)) {
    return empty;
  }

  const window = orderingWindow(date, input.serviceDays, settings);
  if (!window) return empty;

  const earliest = roundUpToSlot(
    new Date(now.getTime() + (settings.prepMinutes + input.extraMinutes) * MINUTE),
  ).getTime();
  const cap = fulfilment === 'PICKUP' ? settings.pickupSlotCap : settings.deliverySlotCap;
  const slots: Slot[] = [];

  for (let time = window.opens.getTime(); time <= window.lastSlot.getTime(); time += SLOT_MINUTES * MINUTE) {
    if (time < earliest) continue;
    const startsAt = isoInstant(time);
    slots.push({ startsAt, available: input.usedCount(fulfilment, startsAt) < cap });
  }

  if (input.nextSlotFull) {
    const firstOpen = slots.find((slot) => slot.available);
    if (firstOpen) firstOpen.available = false;
  }

  const asapStartsAt =
    date === venueDateOf(now) ? (slots.find((slot) => slot.available)?.startsAt ?? null) : null;

  return { date, fulfilment, asapStartsAt, slots };
}
