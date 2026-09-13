import { isTerminal, orderStatusLabel, orderTimeline } from '@/lib/ordering/orderStatus';
import { orderSummary } from '../../helpers/orderSummary';

describe('order status', () => {
  it('uses the guest labels, naming READY by fulfilment', () => {
    expect(orderStatusLabel('CONFIRMED', 'PICKUP')).toBe('Order received');
    expect(orderStatusLabel('READY', 'PICKUP')).toBe('Ready for pickup');
    expect(orderStatusLabel('READY', 'DELIVERY')).toBe('Ready for dispatch');
    expect(orderStatusLabel('EXPIRED', 'PICKUP')).toBe('Payment not completed');
    expect(isTerminal('DELIVERED')).toBe(true);
    expect(isTerminal('OUT_FOR_DELIVERY')).toBe(false);
  });

  it('follows the pickup steps up to the current status', () => {
    expect(orderTimeline(orderSummary()).map((step) => [step.label, step.state])).toEqual([
      ['Order received', 'done'],
      ['Preparing', 'current'],
      ['Ready for pickup', 'upcoming'],
      ['Picked up', 'upcoming'],
    ]);
  });

  it('shows a failed delivery on the on-the-way step', () => {
    const order = orderSummary({
      fulfilment: 'DELIVERY',
      status: 'DELIVERY_FAILED',
      statusHistory: ['CONFIRMED', 'ACCEPTED', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].map((status) => ({
        status: status as 'CONFIRMED',
        at: '2026-10-02T09:00:00Z',
      })),
    });

    expect(orderTimeline(order).map((step) => [step.label, step.state])).toEqual([
      ['Order received', 'done'],
      ['Preparing', 'done'],
      ['Ready for dispatch', 'done'],
      ['Delivery issue; we will call you', 'current'],
      ['Delivered', 'upcoming'],
    ]);
  });

  it('keeps the steps a cancelled order reached', () => {
    const order = orderSummary({
      status: 'CANCELLED',
      statusHistory: [
        { status: 'CONFIRMED', at: '2026-10-02T09:00:00Z' },
        { status: 'CANCELLED', at: '2026-10-02T09:02:00Z' },
      ],
    });

    expect(orderTimeline(order).map((step) => step.state)).toEqual(['done', 'upcoming', 'upcoming', 'upcoming']);
  });
});
