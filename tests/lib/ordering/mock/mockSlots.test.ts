import { MOCK_SERVICE_DAYS, MOCK_SETTINGS } from '@/lib/ordering/mock/mockData';
import {
  isoInstant,
  isoWeekday,
  manilaInstant,
  offeredDates,
  orderingWindow,
  planSlots,
  promisedAt,
  roundUpToSlot,
} from '@/lib/ordering/mock/mockSlots';

// 2026-10-02 is a Friday. 09:00Z is 5:00 PM in Manila.
const fridayFivePm = new Date('2026-10-02T09:00:00Z');

function plan(overrides: Partial<Parameters<typeof planSlots>[0]> = {}) {
  return planSlots({
    now: fridayFivePm,
    date: '2026-10-02',
    fulfilment: 'PICKUP',
    settings: MOCK_SETTINGS,
    serviceDays: MOCK_SERVICE_DAYS,
    extraMinutes: 0,
    usedCount: () => 0,
    nextSlotFull: false,
    ...overrides,
  });
}

describe('slot helpers', () => {
  it('converts Manila wall times and weekdays', () => {
    expect(manilaInstant('2026-10-02', '17:30').toISOString()).toBe('2026-10-02T09:30:00.000Z');
    expect(isoWeekday('2026-10-02')).toBe(5);
    expect(isoWeekday('2026-10-04')).toBe(7);
    expect(isoWeekday('2026-10-05')).toBe(1);
  });

  it('writes instants without milliseconds and rounds up to 15 minutes', () => {
    expect(isoInstant(Date.parse('2026-10-02T09:30:00Z'))).toBe('2026-10-02T09:30:00Z');
    expect(roundUpToSlot(new Date('2026-10-02T09:25:01Z')).toISOString()).toBe(
      '2026-10-02T09:30:00.000Z',
    );
    expect(roundUpToSlot(new Date('2026-10-02T09:30:00Z')).toISOString()).toBe(
      '2026-10-02T09:30:00.000Z',
    );
  });

  it('offers today and tomorrow, or today only', () => {
    expect(offeredDates(fridayFivePm, MOCK_SETTINGS)).toEqual(['2026-10-02', '2026-10-03']);
    expect(offeredDates(fridayFivePm, { ...MOCK_SETTINGS, daysAhead: 0 })).toEqual(['2026-10-02']);
  });

  it('builds ordering windows that close after midnight, and none on closed days', () => {
    expect(orderingWindow('2026-10-02', MOCK_SERVICE_DAYS, MOCK_SETTINGS)).toEqual({
      opens: new Date('2026-10-02T09:30:00Z'),
      lastSlot: new Date('2026-10-02T16:00:00Z'),
    });
    expect(orderingWindow('2026-10-05', MOCK_SERVICE_DAYS, MOCK_SETTINGS)).toBeNull();
  });

  it('promises pickup at the slot start and delivery at the slot end', () => {
    expect(promisedAt('PICKUP', '2026-10-02T09:30:00Z')).toBe('2026-10-02T09:30:00Z');
    expect(promisedAt('DELIVERY', '2026-10-02T09:30:00Z')).toBe('2026-10-02T09:45:00Z');
  });
});

describe('planSlots', () => {
  it('starts after prep time and runs to 30 minutes before close', () => {
    const list = plan();

    expect(list.slots[0]).toEqual({ startsAt: '2026-10-02T09:30:00Z', available: true });
    expect(list.slots[list.slots.length - 1].startsAt).toBe('2026-10-02T16:00:00Z');
    expect(list.slots).toHaveLength(27);
    expect(list.asapStartsAt).toBe('2026-10-02T09:30:00Z');
  });

  it('adds the delivery area\'s extra minutes', () => {
    const list = plan({ fulfilment: 'DELIVERY', extraMinutes: 10 });

    expect(list.slots[0].startsAt).toBe('2026-10-02T09:45:00Z');
    expect(list.fulfilment).toBe('DELIVERY');
  });

  it('marks slots at the cap as full and moves ASAP to the next open slot', () => {
    const list = plan({
      usedCount: (_fulfilment, startsAt) => (startsAt === '2026-10-02T09:30:00Z' ? 6 : 0),
    });

    expect(list.slots[0]).toEqual({ startsAt: '2026-10-02T09:30:00Z', available: false });
    expect(list.asapStartsAt).toBe('2026-10-02T09:45:00Z');
  });

  it('fills the next open slot when the demo scenario asks for it', () => {
    expect(plan({ nextSlotFull: true }).slots[0].available).toBe(false);
  });

  it('offers every slot tomorrow, without an ASAP time', () => {
    const list = plan({ date: '2026-10-03' });

    expect(list.slots[0].startsAt).toBe('2026-10-03T09:30:00Z');
    expect(list.asapStartsAt).toBeNull();
  });

  it('offers nothing when closed, paused, too late, or too far ahead', () => {
    expect(plan({ now: new Date('2026-10-05T09:00:00Z'), date: '2026-10-05' }).slots).toEqual([]);
    expect(plan({ settings: { ...MOCK_SETTINGS, acceptingOrders: false } }).slots).toEqual([]);
    expect(plan({ settings: { ...MOCK_SETTINGS, pickupEnabled: false } }).slots).toEqual([]);
    expect(plan({ now: new Date('2026-10-02T15:50:00Z') }).slots).toEqual([]);
    expect(plan({ date: '2026-10-04' }).slots).toEqual([]);
  });
});
