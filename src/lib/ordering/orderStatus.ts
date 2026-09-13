import type { Fulfilment, OrderStatus, OrderSummary } from './types';

export const TERMINAL_STATUSES: OrderStatus[] = ['COMPLETED', 'DELIVERED', 'CANCELLED', 'EXPIRED'];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

// Guest labels from the 3A spec, "Statuses".
const LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Waiting for payment',
  CONFIRMED: 'Order received',
  ACCEPTED: 'Preparing',
  READY: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'On the way',
  DELIVERY_FAILED: 'Delivery issue; we will call you',
  COMPLETED: 'Picked up',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Payment not completed',
};

export function orderStatusLabel(status: OrderStatus, fulfilment: Fulfilment): string {
  return status === 'READY' && fulfilment === 'DELIVERY' ? 'Ready for dispatch' : LABELS[status];
}

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  state: 'done' | 'current' | 'upcoming';
}

const PICKUP_STEPS: OrderStatus[] = ['CONFIRMED', 'ACCEPTED', 'READY', 'COMPLETED'];
const DELIVERY_STEPS: OrderStatus[] = ['CONFIRMED', 'ACCEPTED', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** The steps for the order's fulfilment type. A failed delivery sits on the on-the-way step. */
export function orderTimeline(order: OrderSummary): TimelineStep[] {
  const steps = order.fulfilment === 'PICKUP' ? PICKUP_STEPS : DELIVERY_STEPS;
  const failed = order.status === 'DELIVERY_FAILED';
  const currentIndex = steps.indexOf(failed ? 'OUT_FOR_DELIVERY' : order.status);
  const reached = new Set(order.statusHistory.map((entry) => entry.status));

  return steps.map((status, index) => {
    let state: TimelineStep['state'] = 'upcoming';
    if (index === currentIndex) {
      state = 'current';
    } else if (index < currentIndex || (currentIndex === -1 && reached.has(status))) {
      state = 'done';
    }

    const labelStatus = failed && status === 'OUT_FOR_DELIVERY' ? 'DELIVERY_FAILED' : status;
    return { status, label: orderStatusLabel(labelStatus, order.fulfilment), state };
  });
}
