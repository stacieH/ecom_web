import type { OrderSummary } from '@/lib/ordering/types';

/** A pickup order the kitchen has accepted, for display tests. */
export function orderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  return {
    reference: 'O-7K2M9Q',
    status: 'ACCEPTED',
    fulfilment: 'PICKUP',
    timingMode: 'ASAP',
    promisedAt: '2026-10-02T09:30:00Z',
    customerName: 'Alex Rivera',
    lines: [
      {
        dishId: 'dish-ribeye',
        name: 'Dry-Aged Ribeye',
        quantity: 1,
        unitPriceCentavos: 198000,
        options: [{ groupName: 'Doneness', optionName: 'Medium rare', priceDeltaCentavos: 0 }],
        note: 'Extra jus',
        lineTotalCentavos: 198000,
      },
    ],
    notes: '',
    subtotalCentavos: 198000,
    deliveryFeeCentavos: 0,
    totalCentavos: 198000,
    payment: { method: 'PAY_AT_PICKUP', status: 'UNPAID' },
    delivery: null,
    canCancel: false,
    canResumePayment: false,
    statusHistory: [
      { status: 'CONFIRMED', at: '2026-10-02T09:00:00Z' },
      { status: 'ACCEPTED', at: '2026-10-02T09:05:00Z' },
    ],
    createdAt: '2026-10-02T09:00:00Z',
    ...overrides,
  };
}
