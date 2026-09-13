import {
  CheckoutContext,
  checkoutRules,
  CheckoutValues,
  holdEndsAt,
  initialCheckoutValues,
  promisedTime,
  toPlaceOrderRequest,
} from '@/lib/ordering/checkoutForm';
import { MOCK_DELIVERY_AREAS } from '@/lib/ordering/mock/mockData';
import type { OrderingStatus, PaymentMethod, Quote } from '@/lib/ordering/types';

const status: OrderingStatus = {
  acceptingOrders: true,
  message: null,
  pickupEnabled: true,
  deliveryEnabled: true,
  payAtPickup: true,
  cashOnDelivery: true,
  cashOnDeliveryMaxCentavos: 300000,
  onlinePaymentMethods: ['gcash', 'paymaya', 'card', 'qrph'],
};

function quote(totalCentavos: number, paymentMethods: PaymentMethod[]): Quote {
  return {
    lines: [],
    subtotalCentavos: totalCentavos,
    deliveryFeeCentavos: 0,
    totalCentavos,
    minimumOrderCentavos: null,
    paymentMethods,
  };
}

const base = initialCheckoutValues({ fulfilment: 'PICKUP', areaId: null, customer: null });
const contact = { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142', consent: true };
const deliveryAddress = {
  fulfilment: 'DELIVERY' as const,
  areaId: 'area-poblacion',
  street: '12 Jupiter Street',
  landmark: 'Beside the bakery',
};

function errorsFor(values: Partial<CheckoutValues>, context: Partial<CheckoutContext> = {}) {
  const all: CheckoutValues = { ...base, ...values };
  const rules = checkoutRules({
    signedIn: false,
    status,
    slots: null,
    areas: MOCK_DELIVERY_AREAS,
    quote: quote(36000, ['ONLINE', 'PAY_AT_PICKUP']),
    ...context,
  });

  const errors: Partial<Record<keyof CheckoutValues, string>> = {};
  (Object.keys(rules) as (keyof CheckoutValues)[]).forEach((name) => {
    const rule = rules[name] as (value: unknown, values: CheckoutValues) => string | undefined;
    const message = rule(all[name], all);
    if (message) errors[name] = message;
  });
  return errors;
}

describe('checkout values', () => {
  it('start from the cart’s fulfilment and area, prefilled for a signed-in customer', () => {
    const customer = { id: 'cust-1', name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142', emailVerified: true };

    expect(initialCheckoutValues({ fulfilment: 'DELIVERY', areaId: 'area-bel-air', customer })).toEqual({
      fulfilment: 'DELIVERY',
      timeMode: '',
      startsAt: '',
      addressChoice: 'new',
      areaId: 'area-bel-air',
      street: '',
      building: '',
      landmark: '',
      instructions: '',
      saveAddress: false,
      addressLabel: '',
      name: 'Alex Rivera',
      email: 'alex@example.com',
      phone: '+63 917 555 0142',
      paymentMethod: '',
      notes: '',
      consent: false,
    });
  });
});

describe('checkoutRules', () => {
  it('flags each empty required field of a guest pickup order, in page order', () => {
    const errors = errorsFor({});

    expect(errors).toEqual({
      timeMode: 'Choose when you’d like your order',
      name: 'Please tell us your name',
      email: 'Enter a valid email address',
      phone: 'Enter a phone number we can reach you on',
      paymentMethod: 'Choose how you’ll pay',
      consent: 'Please agree to the privacy notice',
    });
    expect(Object.keys(errors)).toEqual(['timeMode', 'name', 'email', 'phone', 'paymentMethod', 'consent']);
  });

  it('checks the address only for delivery', () => {
    expect(
      errorsFor({ ...contact, fulfilment: 'DELIVERY', timeMode: 'ASAP', paymentMethod: 'ONLINE' }),
    ).toEqual({
      areaId: 'Choose a delivery area',
      street: 'Enter your street address',
      landmark: 'Add a landmark so our rider can find you',
    });
  });

  it('needs a time that is still offered when scheduling', () => {
    const scheduled = { ...contact, timeMode: 'SCHEDULED' as const, paymentMethod: 'ONLINE' as const };

    expect(errorsFor(scheduled)).toEqual({ startsAt: 'Choose a pickup time' });
    expect(errorsFor({ ...scheduled, ...deliveryAddress })).toEqual({ startsAt: 'Choose a delivery time' });
    expect(
      errorsFor(
        { ...scheduled, startsAt: '2026-10-02T10:00:00Z' },
        { slots: [{ startsAt: '2026-10-02T10:00:00Z', available: false }] },
      ),
    ).toEqual({ startsAt: 'That time is no longer available' });
  });

  it('applies the cash on delivery cap and keeps pay at pickup to pickup orders', () => {
    const delivery = { ...contact, ...deliveryAddress, timeMode: 'ASAP' as const };

    expect(
      errorsFor({ ...delivery, paymentMethod: 'CASH_ON_DELIVERY' }, { quote: quote(402000, ['ONLINE']) }),
    ).toEqual({ paymentMethod: 'Cash on delivery is available for orders up to ₱3,000' });
    expect(errorsFor({ ...delivery, paymentMethod: 'PAY_AT_PICKUP' })).toEqual({
      paymentMethod: 'Pay at pickup is only for pickup orders',
    });
  });

  it('skips consent for a signed-in customer and names an address they save', () => {
    expect(
      errorsFor(
        {
          ...contact,
          ...deliveryAddress,
          consent: false,
          timeMode: 'ASAP',
          paymentMethod: 'ONLINE',
          saveAddress: true,
          addressLabel: '',
        },
        { signedIn: true },
      ),
    ).toEqual({ addressLabel: 'Give this address a name' });
  });
});

describe('checkout helpers', () => {
  it('builds the order request from trimmed values and the quoted total', () => {
    const values: CheckoutValues = {
      ...base,
      ...contact,
      ...deliveryAddress,
      name: ' Alex Rivera ',
      building: ' Unit 3B ',
      timeMode: 'SCHEDULED',
      startsAt: '2026-10-02T11:00:00Z',
      paymentMethod: 'CASH_ON_DELIVERY',
      notes: ' Ring twice ',
    };
    const draft = {
      fulfilment: 'DELIVERY' as const,
      delivery: { areaId: 'area-poblacion', street: '', building: '', landmark: '', instructions: '' },
      lines: [{ dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-medium'], quantity: 1, note: '' }],
    };

    expect(toPlaceOrderRequest(values, draft, quote(204000, ['ONLINE', 'CASH_ON_DELIVERY']))).toEqual({
      fulfilment: 'DELIVERY',
      delivery: {
        areaId: 'area-poblacion',
        street: '12 Jupiter Street',
        building: 'Unit 3B',
        landmark: 'Beside the bakery',
        instructions: '',
      },
      lines: draft.lines,
      timing: { mode: 'SCHEDULED', startsAt: '2026-10-02T11:00:00Z' },
      customer: { name: 'Alex Rivera', email: 'alex@example.com', phone: '+63 917 555 0142' },
      paymentMethod: 'CASH_ON_DELIVERY',
      expectedTotalCentavos: 204000,
      notes: 'Ring twice',
    });
  });

  it('promises delivery at the end of its slot and holds unpaid orders for 15 minutes', () => {
    expect(promisedTime('PICKUP', '2026-10-02T09:30:00Z')).toBe('2026-10-02T09:30:00.000Z');
    expect(promisedTime('DELIVERY', '2026-10-02T09:30:00Z')).toBe('2026-10-02T09:45:00.000Z');
    expect(holdEndsAt('2026-10-02T09:00:00Z')).toBe('2026-10-02T09:15:00.000Z');
  });
});
