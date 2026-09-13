import { ApiError } from '@/lib/api/client';
import { initialCheckoutValues } from '@/lib/ordering/checkoutForm';
import { CHECKOUT_FAILED, checkoutErrorOutcome } from '@/lib/ordering/checkoutErrors';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { Quote } from '@/lib/ordering/types';

const values = initialCheckoutValues({ fulfilment: 'PICKUP', areaId: null, customer: null });
const asap = { ...values, timeMode: 'ASAP' as const };
const scheduled = { ...values, timeMode: 'SCHEDULED' as const, startsAt: '2026-10-02T10:00:00Z' };

describe('checkoutErrorOutcome', () => {
  it('shows the fresh quote when prices changed', () => {
    const quote: Quote = {
      lines: [],
      subtotalCentavos: 40000,
      deliveryFeeCentavos: 0,
      totalCentavos: 40000,
      minimumOrderCentavos: null,
      paymentMethods: ['ONLINE'],
    };

    expect(
      checkoutErrorOutcome(new ApiError(409, 'PRICE_CHANGED', 'Prices have changed.', {}, { quote }), asap),
    ).toEqual({
      fieldErrors: {},
      lineErrors: {},
      alert: null,
      notice: { kind: 'priceChanged', quote },
      refetch: [orderingKeys.menu],
    });
  });

  it('marks unavailable lines for removal', () => {
    const outcome = checkoutErrorOutcome(
      new ApiError(409, 'ITEM_UNAVAILABLE', 'Some items are no longer available.', {
        'lines.1.dishId': ['This dish is no longer available'],
        'lines.1.optionIds': ['This option is sold out'],
      }),
      asap,
    );

    expect(outcome.lineErrors).toEqual({ 1: 'No longer available' });
    expect(outcome.alert).toBe('Some items are no longer available. Remove them to continue.');
    expect(outcome.refetch).toEqual([orderingKeys.menu, ['ordering', 'quote']]);
  });

  it('puts a full slot on the chosen time, or on as soon as possible', () => {
    const full = new ApiError(409, 'SLOT_FULL', 'That time just filled up.');

    expect(checkoutErrorOutcome(full, scheduled)).toMatchObject({
      fieldErrors: { startsAt: 'That time just filled up. Choose another.' },
      refetch: [orderingKeys.slotsRoot],
    });
    expect(checkoutErrorOutcome(full, asap).fieldErrors).toEqual({
      timeMode: 'That time just filled up. Choose another.',
    });
  });

  it('says when a time is no longer offered', () => {
    expect(
      checkoutErrorOutcome(new ApiError(422, 'SLOT_NOT_OFFERED', 'That time is no longer available.'), scheduled)
        .fieldErrors,
    ).toEqual({ startsAt: 'That time is no longer available' });
  });

  it('explains an order below the area minimum', () => {
    const message = 'Add ₱440 more to reach Poblacion’s ₱800 minimum.';

    expect(checkoutErrorOutcome(new ApiError(422, 'BELOW_MINIMUM_ORDER', message), asap).notice).toEqual({
      kind: 'belowMinimum',
      message,
    });
  });

  it('shows why a payment method was refused', () => {
    expect(
      checkoutErrorOutcome(
        new ApiError(422, 'PAYMENT_METHOD_NOT_ALLOWED', 'Not allowed.', {
          paymentMethod: ['Cash on delivery is available for orders up to ₱3,000'],
        }),
        asap,
      ).fieldErrors,
    ).toEqual({ paymentMethod: 'Cash on delivery is available for orders up to ₱3,000' });
    expect(
      checkoutErrorOutcome(new ApiError(422, 'PAYMENT_METHOD_NOT_ALLOWED', 'Choose another way to pay.'), asap)
        .fieldErrors,
    ).toEqual({ paymentMethod: 'Choose another way to pay.' });
  });

  it('closes checkout while ordering is paused or closed', () => {
    ['ORDERING_PAUSED', 'ORDERING_CLOSED'].forEach((code) => {
      const outcome = checkoutErrorOutcome(
        new ApiError(409, code as 'ORDERING_PAUSED', 'Online ordering is closed right now.'),
        asap,
      );
      expect(outcome.notice).toEqual({ kind: 'closed', message: 'Online ordering is closed right now.' });
    });
  });

  it('asks for another way to pay when online payment is down', () => {
    expect(checkoutErrorOutcome(new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Down'), asap).alert).toBe(
      'Online payment is unavailable right now. Choose another way to pay or try again.',
    );
  });

  it('maps validation errors onto fields and lines, and counts them', () => {
    const outcome = checkoutErrorOutcome(
      new ApiError(422, 'VALIDATION_FAILED', 'Please check the highlighted details.', {
        'customer.email': ['Enter a valid email address'],
        'delivery.street': ['Enter your street address'],
        'lines.0.quantity': ['Choose a quantity from 1 to 20'],
      }),
      asap,
    );

    expect(outcome.fieldErrors).toEqual({
      email: 'Enter a valid email address',
      street: 'Enter your street address',
    });
    expect(outcome.lineErrors).toEqual({ 0: 'Choose a quantity from 1 to 20' });
    expect(outcome.alert).toBe('Please fix the 3 highlighted fields.');
  });

  it('asks the guest to wait when rate limited', () => {
    expect(checkoutErrorOutcome(new ApiError(429, 'RATE_LIMITED', 'Slow down'), asap).alert).toBe(
      'Too many attempts. Please wait a minute and try again.',
    );
  });

  it('falls back to calling the venue for anything else', () => {
    expect(CHECKOUT_FAILED).toBe('We couldn’t place your order. Please try again, or call us on +63 2 8123 4567.');
    expect(checkoutErrorOutcome(new ApiError(500, 'UNKNOWN', 'Oops'), asap).alert).toBe(CHECKOUT_FAILED);
    expect(checkoutErrorOutcome(new Error('boom'), asap).alert).toBe(CHECKOUT_FAILED);
  });
});
