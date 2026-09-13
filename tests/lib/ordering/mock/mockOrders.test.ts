import { ApiError } from '@/lib/api/client';
import { MockContext } from '@/lib/ordering/mock/mockContext';
import {
  advanceOrder,
  cancelOrderRecord,
  checkoutSessionView,
  completeCheckout,
  currentMenu,
  expireHolds,
  findOrderByToken,
  nextStatuses,
  orderingStatus,
  placeOrder,
  quoteDraft,
  resumePayment,
  slotsFor,
  toSummary,
} from '@/lib/ordering/mock/mockOrders';
import { DemoState, DemoStore, emptyDemoState } from '@/lib/ordering/mock/mockStore';
import type { PlaceOrderRequest } from '@/lib/ordering/types';

// Friday 2 October 2026, 5:00 PM in Manila.
let now = new Date('2026-10-02T09:00:00Z');

const ctx: MockContext = {
  store: new DemoStore(null),
  now: () => now,
  random: Math.random,
  hashPassword: async (password, salt) => `${salt}:${password}`,
};

const tiramisu = { dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' };
const ribeye = { dishId: 'dish-ribeye', quantity: 1, optionIds: ['ribeye-doneness-medium'], note: '' };

function pickupRequest(overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest {
  return {
    fulfilment: 'PICKUP',
    delivery: null,
    lines: [ribeye],
    timing: { mode: 'ASAP' },
    customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
    paymentMethod: 'PAY_AT_PICKUP',
    expectedTotalCentavos: 198000,
    notes: '',
    ...overrides,
  };
}

function deliveryRequest(overrides: Partial<PlaceOrderRequest> = {}): PlaceOrderRequest {
  return pickupRequest({
    fulfilment: 'DELIVERY',
    delivery: {
      areaId: 'area-poblacion',
      street: '12 Jupiter Street',
      building: '',
      landmark: 'Beside the bakery',
      instructions: '',
    },
    paymentMethod: 'CASH_ON_DELIVERY',
    expectedTotalCentavos: 204000,
    ...overrides,
  });
}

function caught(run: () => unknown): ApiError {
  try {
    run();
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Expected an ApiError');
}

let state: DemoState;

beforeEach(() => {
  now = new Date('2026-10-02T09:00:00Z');
  state = emptyDemoState();
});

describe('reading the menu, status, slots, and quotes', () => {
  it('reports the ordering status from the settings', () => {
    expect(orderingStatus()).toEqual({
      acceptingOrders: true,
      message: null,
      pickupEnabled: true,
      deliveryEnabled: true,
      payAtPickup: true,
      cashOnDelivery: true,
      cashOnDeliveryMaxCentavos: 300000,
      onlinePaymentMethods: ['gcash', 'paymaya', 'card', 'qrph'],
    });
  });

  it('reflects demo scenarios in the menu', () => {
    state.scenarios.soldOutDishSlugs = ['ribeye'];

    const ribeyeDish = currentMenu(state)
      .categories.flatMap((category) => category.dishes)
      .find((dish) => dish.slug === 'ribeye');

    expect(ribeyeDish?.soldOut).toBe(true);
  });

  it('needs an area for delivery slots and counts orders holding a slot', () => {
    expect(caught(() => slotsFor(state, now, { fulfilment: 'DELIVERY', date: '2026-10-02' }))).toMatchObject({
      errorCode: 'DELIVERY_AREA_UNAVAILABLE',
    });

    for (let count = 0; count < 6; count += 1) {
      placeOrder(state, ctx, pickupRequest(), `key-${count}`);
    }

    const list = slotsFor(state, now, { fulfilment: 'PICKUP', date: '2026-10-02' });
    expect(list.slots[0]).toEqual({ startsAt: '2026-10-02T09:30:00Z', available: false });
    expect(list.asapStartsAt).toBe('2026-10-02T09:45:00Z');
  });

  it('quotes with the current menu', () => {
    expect(quoteDraft(state, { fulfilment: 'PICKUP', delivery: null, lines: [tiramisu] }).totalCentavos).toBe(
      36000,
    );
  });
});

describe('placeOrder', () => {
  it('confirms a pay-at-pickup order at once and emails a tracking link', () => {
    const response = placeOrder(state, ctx, pickupRequest(), 'key-1');

    expect(response.checkoutUrl).toBeNull();
    expect(response.trackingToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.order).toMatchObject({
      reference: expect.stringMatching(/^O-[0-9A-HJKMNP-TV-Z]{6}$/),
      status: 'CONFIRMED',
      fulfilment: 'PICKUP',
      timingMode: 'ASAP',
      promisedAt: '2026-10-02T09:30:00Z',
      totalCentavos: 198000,
      payment: { method: 'PAY_AT_PICKUP', status: 'UNPAID' },
      canCancel: true,
      canResumePayment: false,
    });
    expect(state.outbox[0]).toMatchObject({
      to: 'alex@example.com',
      subject: `Order ${response.order.reference} received`,
      links: [{ label: 'Track your order', href: `/order/track#token=${response.trackingToken}` }],
    });
  });

  it('holds an online order for payment on the demo checkout page', () => {
    const response = placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1');

    expect(response.order).toMatchObject({
      status: 'AWAITING_PAYMENT',
      payment: { method: 'ONLINE', status: 'PENDING' },
      canResumePayment: true,
    });
    expect(response.checkoutUrl).toMatch(/^\/order\/pay-demo\?session=cs-[a-z0-9]{12}$/);
    expect(state.orders[0].payment.holdExpiresAt).toBe('2026-10-02T09:15:00Z');
    expect(state.outbox).toEqual([]);
  });

  it('returns the first result for a repeated key and refuses the key for a different order', () => {
    const first = placeOrder(state, ctx, pickupRequest(), 'key-1');

    expect(placeOrder(state, ctx, pickupRequest(), 'key-1')).toEqual(first);
    expect(state.orders).toHaveLength(1);
    expect(caught(() => placeOrder(state, ctx, pickupRequest({ notes: 'Different' }), 'key-1'))).toMatchObject({
      errorCode: 'IDEMPOTENCY_CONFLICT',
    });
  });

  it('validates contact and delivery details with the field rules', () => {
    const error = caught(() =>
      placeOrder(
        state,
        ctx,
        deliveryRequest({
          customer: { name: '', email: 'alex@', phone: '123' },
          delivery: { areaId: 'area-poblacion', street: '', building: '', landmark: '', instructions: '' },
          notes: 'x'.repeat(501),
        }),
        'key-1',
      ),
    );

    expect(error).toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: {
        'customer.name': ['Please tell us your name'],
        'customer.email': ['Enter a valid email address'],
        'customer.phone': ['Enter a phone number we can reach you on'],
        'delivery.street': ['Enter your street address'],
        'delivery.landmark': ['Add a landmark so our rider can find you'],
        notes: ['Keep notes under 500 characters'],
      },
    });
  });

  it('refuses a stale total with the fresh quote attached', () => {
    const error = caught(() => placeOrder(state, ctx, pickupRequest({ expectedTotalCentavos: 100 }), 'key-1'));

    expect(error).toMatchObject({ errorCode: 'PRICE_CHANGED' });
    expect((error.extras.quote as { totalCentavos: number }).totalCentavos).toBe(198000);
  });

  it('refuses a delivery below the area minimum', () => {
    expect(
      caught(() =>
        placeOrder(state, ctx, deliveryRequest({ lines: [tiramisu], expectedTotalCentavos: 42000 }), 'key-1'),
      ),
    ).toMatchObject({ errorCode: 'BELOW_MINIMUM_ORDER', message: 'Add ₱440 more to reach Poblacion’s ₱800 minimum.' });
  });

  it('refuses cash on delivery above the cap', () => {
    const error = caught(() =>
      placeOrder(
        state,
        ctx,
        deliveryRequest({ lines: [{ ...ribeye, quantity: 2 }], expectedTotalCentavos: 402000 }),
        'key-1',
      ),
    );

    expect(error).toMatchObject({
      errorCode: 'PAYMENT_METHOD_NOT_ALLOWED',
      fieldErrors: { paymentMethod: ['Cash on delivery is available for orders up to ₱3,000'] },
    });
  });

  it('refuses a full slot and a time that is not offered, and accepts a slot after midnight', () => {
    for (let count = 0; count < 6; count += 1) {
      placeOrder(state, ctx, pickupRequest(), `key-${count}`);
    }

    expect(
      caught(() =>
        placeOrder(state, ctx, pickupRequest({ timing: { mode: 'SCHEDULED', startsAt: '2026-10-02T09:30:00Z' } }), 'full'),
      ),
    ).toMatchObject({
      errorCode: 'SLOT_FULL',
      fieldErrors: { 'timing.startsAt': ['That time just filled up. Choose another.'] },
    });
    expect(
      caught(() =>
        placeOrder(state, ctx, pickupRequest({ timing: { mode: 'SCHEDULED', startsAt: '2026-10-02T09:40:00Z' } }), 'odd'),
      ),
    ).toMatchObject({ errorCode: 'SLOT_NOT_OFFERED' });
    expect(
      placeOrder(state, ctx, pickupRequest({ timing: { mode: 'SCHEDULED', startsAt: '2026-10-02T16:00:00Z' } }), 'late')
        .order.promisedAt,
    ).toBe('2026-10-02T16:00:00Z');
  });

  it('says ordering is closed when no slot is left today', () => {
    now = new Date('2026-10-05T09:00:00Z');

    expect(caught(() => placeOrder(state, ctx, pickupRequest(), 'key-1'))).toMatchObject({
      errorCode: 'ORDERING_CLOSED',
    });
  });

  it('fails online payment when the demo scenario says so, saving nothing', () => {
    state.scenarios.failOnlinePayments = true;

    expect(
      caught(() => placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1')),
    ).toMatchObject({ errorCode: 'PAYMENT_PROVIDER_UNAVAILABLE' });
    expect(state.orders).toEqual([]);
  });

  it('attaches the order to the signed-in customer', () => {
    state.sessionCustomerId = 'cust-1';

    placeOrder(state, ctx, pickupRequest(), 'key-1');

    expect(state.orders[0].customer.accountId).toBe('cust-1');
  });
});

describe('tracking, cancelling, and expiry', () => {
  it('finds an order by its token only', () => {
    const { trackingToken } = placeOrder(state, ctx, pickupRequest(), 'key-1');

    expect(findOrderByToken(state, trackingToken).reference).toBe(state.orders[0].reference);
    expect(caught(() => findOrderByToken(state, 'nope'))).toMatchObject({ errorCode: 'ORDER_NOT_FOUND' });
  });

  it('cancels a confirmed order and emails the guest', () => {
    placeOrder(state, ctx, pickupRequest(), 'key-1');

    const cancelled = cancelOrderRecord(state, ctx, state.orders[0]);

    expect(cancelled.status).toBe('CANCELLED');
    expect(state.outbox[0].subject).toBe(`Order ${cancelled.reference} cancelled`);
    expect(toSummary(cancelled, now).canCancel).toBe(false);
  });

  it('marks a paid order’s refund as pending when cancelled', () => {
    const response = placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1');
    completeCheckout(state, ctx, state.orders[0].payment.checkoutSessionId as string, 'PAID');

    const cancelled = cancelOrderRecord(state, ctx, findOrderByToken(state, response.trackingToken));

    expect(cancelled.payment.status).toBe('REFUND_PENDING');
  });

  it('refuses to cancel once the kitchen has accepted', () => {
    const { order } = placeOrder(state, ctx, pickupRequest(), 'key-1');
    advanceOrder(state, ctx, order.reference, 'ACCEPTED');

    expect(caught(() => cancelOrderRecord(state, ctx, state.orders[0]))).toMatchObject({
      errorCode: 'ORDER_NOT_CANCELLABLE',
    });
  });

  it('expires an unpaid online order after the hold and releases its slot', () => {
    placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1');
    now = new Date('2026-10-02T09:15:00Z');

    expireHolds(state, ctx);

    expect(state.orders[0].status).toBe('EXPIRED');
    expect(state.checkoutSessions[0].status).toBe('EXPIRED');
    expect(state.outbox[0].subject).toBe(`Payment not completed for ${state.orders[0].reference}`);
    expect(slotsFor(state, now, { fulfilment: 'PICKUP', date: '2026-10-02' }).slots.every((slot) => slot.available)).toBe(true);
  });

  it('resumes payment only while the order is held', () => {
    placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1');
    const order = state.orders[0];

    expect(resumePayment(now, order)).toEqual({
      checkoutUrl: `/order/pay-demo?session=${order.payment.checkoutSessionId}`,
    });

    completeCheckout(state, ctx, order.payment.checkoutSessionId as string, 'PAID');
    expect(caught(() => resumePayment(now, state.orders[0]))).toMatchObject({ errorCode: 'ORDER_STATE_CHANGED' });
  });
});

describe('demo checkout and status changes', () => {
  it('shows the checkout session and completes it with each outcome', () => {
    placeOrder(state, ctx, pickupRequest({ paymentMethod: 'ONLINE' }), 'key-1');
    const sessionId = state.orders[0].payment.checkoutSessionId as string;
    const reference = state.orders[0].reference;

    expect(checkoutSessionView(state, sessionId)).toMatchObject({
      id: sessionId,
      reference,
      status: 'OPEN',
      totalCentavos: 198000,
      methods: ['gcash', 'paymaya', 'card', 'qrph'],
      holdExpiresAt: '2026-10-02T09:15:00Z',
    });
    expect(completeCheckout(state, ctx, sessionId, 'FAILED')).toEqual({ redirectTo: null });
    expect(completeCheckout(state, ctx, sessionId, 'CANCELLED')).toEqual({
      redirectTo: `/order/checkout?reference=${reference}&payment=cancelled`,
    });
    expect(completeCheckout(state, ctx, sessionId, 'PAID')).toEqual({
      redirectTo: `/order/paid?reference=${reference}`,
    });
    expect(state.orders[0]).toMatchObject({ status: 'CONFIRMED', payment: { status: 'PAID' } });
    expect(state.outbox[0].subject).toBe(`Payment received for ${reference}`);
    expect(caught(() => completeCheckout(state, ctx, sessionId, 'PAID'))).toMatchObject({
      errorCode: 'ORDER_STATE_CHANGED',
    });
    expect(caught(() => checkoutSessionView(state, 'cs-missing'))).toMatchObject({ errorCode: 'NOT_FOUND' });
  });

  it('lists the allowed next statuses for each fulfilment type', () => {
    placeOrder(state, ctx, pickupRequest(), 'pickup');
    placeOrder(state, ctx, deliveryRequest(), 'delivery');
    const [pickup, delivery] = state.orders;

    expect(nextStatuses(pickup)).toEqual(['ACCEPTED', 'CANCELLED']);
    pickup.status = 'READY';
    delivery.status = 'READY';
    expect(nextStatuses(pickup)).toEqual(['COMPLETED']);
    expect(nextStatuses(delivery)).toEqual(['OUT_FOR_DELIVERY']);
  });

  it('advances a delivery through dispatch, needing rider details, and collects cash on delivery', () => {
    const { order } = placeOrder(state, ctx, deliveryRequest(), 'key-1');

    advanceOrder(state, ctx, order.reference, 'ACCEPTED');
    advanceOrder(state, ctx, order.reference, 'READY');
    expect(caught(() => advanceOrder(state, ctx, order.reference, 'OUT_FOR_DELIVERY'))).toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: { riderName: ['Enter the rider’s name'], riderPhone: ['Enter the rider’s phone'] },
    });

    const row = advanceOrder(state, ctx, order.reference, 'OUT_FOR_DELIVERY', {
      name: 'Nico',
      phone: '+63 917 555 0100',
    });
    expect(row.status).toBe('OUT_FOR_DELIVERY');
    expect(toSummary(state.orders[0], now).delivery).toMatchObject({
      riderName: 'Nico',
      riderPhone: '+63 917 555 0100',
    });
    expect(state.outbox[0].subject).toBe(`Order ${order.reference} is on the way`);

    advanceOrder(state, ctx, order.reference, 'DELIVERED');
    expect(state.orders[0].payment.status).toBe('PAID');
    expect(caught(() => advanceOrder(state, ctx, order.reference, 'READY'))).toMatchObject({
      errorCode: 'ORDER_STATE_CHANGED',
    });
  });
});
