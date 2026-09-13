import {
  addressLabelRule,
  areaRule,
  buildingRule,
  cartItemsRule,
  consentRule,
  emailRule,
  fulfilmentRule,
  instructionsRule,
  landmarkRule,
  lineNoteRule,
  minimumOrderMessage,
  nameRule,
  optionGroupRule,
  orderNotesRule,
  paymentMethodRule,
  phoneRule,
  quantityRule,
  scheduledTimeRule,
  streetRule,
  timeModeRule,
} from '@/lib/ordering/validation/rules';
import type { MenuOptionGroup } from '@/lib/ordering/types';

describe('contact rules', () => {
  it.each([
    ['', 'Please tell us your name'],
    ['   ', 'Please tell us your name'],
    ['a'.repeat(81), 'Keep your name under 80 characters'],
    ['Alex Rivera', undefined],
  ])('name %p', (value, expected) => {
    expect(nameRule(value)).toBe(expected);
  });

  it('checks email and phone', () => {
    expect(emailRule('alex@')).toBe('Enter a valid email address');
    expect(emailRule('alex@example.com')).toBeUndefined();
    expect(phoneRule('12345')).toBe('Enter a phone number we can reach you on');
    expect(phoneRule('+63 917 555 0142')).toBeUndefined();
  });

  it('requires privacy consent', () => {
    expect(consentRule(false)).toBe('Please agree to the privacy notice');
    expect(consentRule(true)).toBeUndefined();
  });
});

describe('timing rules', () => {
  const slots = [
    { startsAt: '2026-10-02T10:00:00Z', available: false },
    { startsAt: '2026-10-02T10:15:00Z', available: true },
  ];

  it('needs an enabled fulfilment type', () => {
    expect(fulfilmentRule('', { pickup: true, delivery: true })).toBe('Choose pickup or delivery');
    expect(fulfilmentRule('DELIVERY', { pickup: true, delivery: false })).toBe(
      'Choose pickup or delivery',
    );
    expect(fulfilmentRule('PICKUP', { pickup: true, delivery: false })).toBeUndefined();
  });

  it('needs a time mode', () => {
    expect(timeModeRule('')).toBe('Choose when you’d like your order');
    expect(timeModeRule('ASAP')).toBeUndefined();
  });

  it('needs an offered, open slot only when scheduling', () => {
    expect(scheduledTimeRule(null, { mode: 'ASAP', fulfilment: 'PICKUP', slots })).toBeUndefined();
    expect(scheduledTimeRule(null, { mode: 'SCHEDULED', fulfilment: 'PICKUP', slots })).toBe(
      'Choose a pickup time',
    );
    expect(scheduledTimeRule(null, { mode: 'SCHEDULED', fulfilment: 'DELIVERY', slots })).toBe(
      'Choose a delivery time',
    );
    expect(
      scheduledTimeRule('2026-10-02T10:00:00Z', { mode: 'SCHEDULED', fulfilment: 'PICKUP', slots }),
    ).toBe('That time is no longer available');
    expect(
      scheduledTimeRule('2026-10-02T10:15:00Z', { mode: 'SCHEDULED', fulfilment: 'PICKUP', slots }),
    ).toBeUndefined();
    expect(
      scheduledTimeRule('2026-10-02T10:00:00Z', {
        mode: 'SCHEDULED',
        fulfilment: 'PICKUP',
        slots: null,
      }),
    ).toBeUndefined();
  });
});

describe('address rules', () => {
  const areas = [
    { id: 'area-poblacion', name: 'Poblacion', feeCentavos: 6000, minOrderCentavos: 80000, extraMinutes: 10 },
  ];

  it.each([
    [addressLabelRule, '', 'Give this address a name'],
    [addressLabelRule, 'x'.repeat(41), 'Keep the name under 40 characters'],
    [streetRule, ' ', 'Enter your street address'],
    [streetRule, 'x'.repeat(161), 'Keep the street address under 160 characters'],
    [buildingRule, 'x'.repeat(121), 'Keep the building details under 120 characters'],
    [landmarkRule, '', 'Add a landmark so our rider can find you'],
    [landmarkRule, 'x'.repeat(121), 'Keep the landmark under 120 characters'],
    [instructionsRule, 'x'.repeat(201), 'Keep the instructions under 200 characters'],
  ])('%p rejects %p', (rule, value, expected) => {
    expect(rule(value)).toBe(expected);
  });

  it('accepts valid and empty optional address values', () => {
    expect(addressLabelRule('Home')).toBeUndefined();
    expect(streetRule('27 Cinderwood Lane')).toBeUndefined();
    expect(buildingRule('')).toBeUndefined();
    expect(landmarkRule('Beside the bakery')).toBeUndefined();
    expect(instructionsRule('')).toBeUndefined();
  });

  it('needs a known delivery area', () => {
    expect(areaRule('', areas)).toBe('Choose a delivery area');
    expect(areaRule('area-rockwell', areas)).toBe('Choose a delivery area');
    expect(areaRule('area-poblacion', areas)).toBeUndefined();
    expect(areaRule('area-rockwell', null)).toBeUndefined();
  });
});

describe('payment and notes rules', () => {
  const context = {
    fulfilment: 'DELIVERY' as const,
    totalCentavos: 250000,
    allowed: ['ONLINE', 'CASH_ON_DELIVERY'] as const,
    cashOnDeliveryMaxCentavos: 300000,
  };

  it('needs a method this order may use', () => {
    expect(paymentMethodRule('', { ...context, allowed: [...context.allowed] })).toBe(
      'Choose how you’ll pay',
    );
    expect(paymentMethodRule('PAY_AT_PICKUP', { ...context, allowed: [...context.allowed] })).toBe(
      'Pay at pickup is only for pickup orders',
    );
    expect(
      paymentMethodRule('CASH_ON_DELIVERY', {
        ...context,
        totalCentavos: 310000,
        allowed: ['ONLINE'],
      }),
    ).toBe('Cash on delivery is available for orders up to ₱3,000');
    expect(
      paymentMethodRule('CASH_ON_DELIVERY', { ...context, allowed: [...context.allowed] }),
    ).toBeUndefined();
    expect(
      paymentMethodRule('CASH_ON_DELIVERY', { ...context, fulfilment: 'PICKUP', allowed: ['ONLINE'] }),
    ).toBe('Choose how you’ll pay');
  });

  it('caps order notes', () => {
    expect(orderNotesRule('x'.repeat(501))).toBe('Keep notes under 500 characters');
    expect(orderNotesRule('')).toBeUndefined();
  });
});

describe('dish and cart rules', () => {
  const doneness: MenuOptionGroup = {
    id: 'ribeye-doneness',
    name: 'Doneness',
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: 'ribeye-doneness-rare', name: 'Rare', priceDeltaCentavos: 0, soldOut: false },
      { id: 'ribeye-doneness-medium', name: 'Medium', priceDeltaCentavos: 0, soldOut: true },
    ],
  };
  const extras: MenuOptionGroup = {
    id: 'lobster-extras',
    name: 'Extras',
    minSelect: 0,
    maxSelect: 2,
    options: [
      { id: 'a', name: 'A', priceDeltaCentavos: 100, soldOut: false },
      { id: 'b', name: 'B', priceDeltaCentavos: 100, soldOut: false },
      { id: 'c', name: 'C', priceDeltaCentavos: 100, soldOut: false },
    ],
  };

  it('checks option groups', () => {
    expect(optionGroupRule(doneness, [])).toBe('Choose a doneness');
    expect(optionGroupRule(doneness, ['ribeye-doneness-medium'])).toBe('This option is sold out');
    expect(optionGroupRule(doneness, ['ribeye-doneness-rare'])).toBeUndefined();
    expect(optionGroupRule(extras, ['a', 'b', 'c'])).toBe('Choose up to 2 extras');
    expect(optionGroupRule(extras, [])).toBeUndefined();
    expect(optionGroupRule(extras, ['unrelated-option'])).toBeUndefined();
  });

  it('checks quantity and line notes', () => {
    expect(quantityRule(0)).toBe('Choose a quantity from 1 to 20');
    expect(quantityRule(21)).toBe('Choose a quantity from 1 to 20');
    expect(quantityRule(1.5)).toBe('Choose a quantity from 1 to 20');
    expect(quantityRule(20)).toBeUndefined();
    expect(lineNoteRule('x'.repeat(141))).toBe('Keep the note under 140 characters');
    expect(lineNoteRule('No onions')).toBeUndefined();
  });

  it('checks the cart size', () => {
    expect(cartItemsRule(0)).toBe('Your order is empty');
    expect(cartItemsRule(31)).toBe('Orders are limited to 30 items');
    expect(cartItemsRule(30)).toBeUndefined();
  });

  it('explains how much more reaches a delivery minimum', () => {
    expect(
      minimumOrderMessage({ areaName: 'Poblacion', subtotalCentavos: 56000, minimumOrderCentavos: 80000 }),
    ).toBe('Add ₱240 more to reach Poblacion’s ₱800 minimum');
    expect(
      minimumOrderMessage({ areaName: 'Poblacion', subtotalCentavos: 80000, minimumOrderCentavos: 80000 }),
    ).toBeUndefined();
    expect(
      minimumOrderMessage({ areaName: 'Poblacion', subtotalCentavos: 0, minimumOrderCentavos: null }),
    ).toBeUndefined();
  });
});
