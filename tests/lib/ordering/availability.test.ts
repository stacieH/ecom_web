import { describeAvailability } from '@/lib/ordering/availability';
import type { OrderingStatus, SlotList } from '@/lib/ordering/types';

const status: OrderingStatus = {
  acceptingOrders: true,
  message: null,
  pickupEnabled: true,
  deliveryEnabled: true,
  payAtPickup: true,
  cashOnDelivery: true,
  cashOnDeliveryMaxCentavos: 300000,
  onlinePaymentMethods: ['gcash'],
};

function day(date: string, startsAt: string[]): SlotList {
  return {
    date,
    fulfilment: 'PICKUP',
    asapStartsAt: startsAt[0] ?? null,
    slots: startsAt.map((start) => ({ startsAt: start, available: true })),
  };
}

describe('describeAvailability', () => {
  it('is open while slots load or while today still has slots', () => {
    expect(describeAvailability(status, null)).toEqual({ kind: 'open' });
    expect(
      describeAvailability(status, [day('2026-10-02', ['2026-10-02T09:30:00Z']), day('2026-10-03', [])]),
    ).toEqual({ kind: 'open' });
  });

  it('shows the pause message, or a default one', () => {
    expect(describeAvailability({ ...status, acceptingOrders: false, message: 'Back at 7 PM' }, null)).toEqual({
      kind: 'paused',
      message: 'Back at 7 PM',
    });
    expect(describeAvailability({ ...status, acceptingOrders: false }, null)).toEqual({
      kind: 'paused',
      message: 'Online ordering is paused right now.',
    });
  });

  it('names the next opening once today is over', () => {
    expect(
      describeAvailability(status, [day('2026-10-05', []), day('2026-10-06', ['2026-10-06T10:00:00Z'])]),
    ).toEqual({
      kind: 'closedToday',
      message: 'Online ordering is closed right now. Next orders from Tuesday 6:00 PM',
    });
  });

  it('is closed when neither day has a slot', () => {
    expect(describeAvailability(status, [day('2026-10-04', []), day('2026-10-05', [])])).toEqual({
      kind: 'closed',
      message: 'Online ordering is closed right now.',
    });
  });
});
