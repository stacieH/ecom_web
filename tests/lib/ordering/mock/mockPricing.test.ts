import { ApiError } from '@/lib/api/client';
import { buildMockMenu, MOCK_DELIVERY_AREAS, MOCK_SETTINGS } from '@/lib/ordering/mock/mockData';
import { allowedPaymentMethods, priceDraft } from '@/lib/ordering/mock/mockPricing';
import type { OrderDraft } from '@/lib/ordering/types';

const menu = buildMockMenu();
const base = { menu, areas: MOCK_DELIVERY_AREAS, settings: MOCK_SETTINGS };

const ribeye = (quantity = 1, optionIds = ['ribeye-doneness-medium-rare'], note = '') => ({
  dishId: 'dish-ribeye',
  quantity,
  optionIds,
  note,
});

const delivery = {
  areaId: 'area-poblacion',
  street: '12 Jupiter Street',
  building: '',
  landmark: 'Beside the bakery',
  instructions: '',
};

function priceError(draft: OrderDraft, overrides: Partial<typeof base> = {}): ApiError {
  try {
    priceDraft({ ...base, ...overrides, draft });
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('Expected priceDraft to throw');
}

describe('priceDraft', () => {
  it('prices lines with options for pickup', () => {
    const quote = priceDraft({
      ...base,
      draft: {
        fulfilment: 'PICKUP',
        delivery: null,
        lines: [
          ribeye(2, ['ribeye-doneness-medium-rare'], ' No sauce '),
          { dishId: 'dish-vanilla-latte', quantity: 1, optionIds: ['vanilla-latte-milk-oat-milk'], note: '' },
        ],
      },
    });

    expect(quote).toEqual({
      lines: [
        {
          dishId: 'dish-ribeye',
          name: 'Dry-Aged Ribeye',
          quantity: 2,
          unitPriceCentavos: 198000,
          options: [{ groupName: 'Doneness', optionName: 'Medium rare', priceDeltaCentavos: 0 }],
          note: 'No sauce',
          lineTotalCentavos: 396000,
        },
        {
          dishId: 'dish-vanilla-latte',
          name: 'Iced Vanilla Latte',
          quantity: 1,
          unitPriceCentavos: 20000,
          options: [{ groupName: 'Milk', optionName: 'Oat milk', priceDeltaCentavos: 4000 }],
          note: '',
          lineTotalCentavos: 20000,
        },
      ],
      subtotalCentavos: 416000,
      deliveryFeeCentavos: 0,
      totalCentavos: 416000,
      minimumOrderCentavos: null,
      paymentMethods: ['ONLINE', 'PAY_AT_PICKUP'],
    });
  });

  it('adds the area fee and minimum for delivery, even below the minimum', () => {
    const quote = priceDraft({
      ...base,
      draft: {
        fulfilment: 'DELIVERY',
        delivery,
        lines: [{ dishId: 'dish-tiramisu', quantity: 1, optionIds: [], note: '' }],
      },
    });

    expect(quote).toMatchObject({
      subtotalCentavos: 36000,
      deliveryFeeCentavos: 6000,
      totalCentavos: 42000,
      minimumOrderCentavos: 80000,
      paymentMethods: ['ONLINE', 'CASH_ON_DELIVERY'],
    });
  });

  it('offers cash on delivery only up to the cap', () => {
    expect(allowedPaymentMethods('DELIVERY', 300000, MOCK_SETTINGS)).toEqual(['ONLINE', 'CASH_ON_DELIVERY']);
    expect(allowedPaymentMethods('DELIVERY', 300001, MOCK_SETTINGS)).toEqual(['ONLINE']);
    expect(
      allowedPaymentMethods('PICKUP', 1000, { ...MOCK_SETTINGS, payAtPickupEnabled: false }),
    ).toEqual(['ONLINE']);
  });

  it('refuses sold-out and not-orderable dishes line by line', () => {
    const error = priceError(
      {
        fulfilment: 'PICKUP',
        delivery: null,
        lines: [
          ribeye(),
          { dishId: 'dish-old-fashioned', quantity: 1, optionIds: [], note: '' },
        ],
      },
      { menu: buildMockMenu({ soldOutDishSlugs: ['ribeye'] }) },
    );

    expect(error).toMatchObject({
      errorCode: 'ITEM_UNAVAILABLE',
      fieldErrors: {
        'lines.0.dishId': ['This dish is no longer available'],
        'lines.1.dishId': ['This dish is no longer available'],
      },
    });
  });

  it('reports invalid options, quantities, and notes as field errors', () => {
    const error = priceError({
      fulfilment: 'PICKUP',
      delivery: null,
      lines: [
        ribeye(1, []),
        ribeye(0, ['not-an-option']),
        ribeye(1, ['ribeye-doneness-rare'], 'x'.repeat(141)),
      ],
    });

    expect(error).toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: {
        'lines.0.optionIds': ['Choose a doneness'],
        'lines.1.quantity': ['Choose a quantity from 1 to 20'],
        'lines.1.optionIds': ['Choose from the listed options'],
        'lines.2.note': ['Keep the note under 140 characters'],
      },
    });
  });

  it('checks the order size', () => {
    expect(priceError({ fulfilment: 'PICKUP', delivery: null, lines: [] })).toMatchObject({
      errorCode: 'VALIDATION_FAILED',
      fieldErrors: { lines: ['Your order is empty'] },
    });
    expect(
      priceError({
        fulfilment: 'PICKUP',
        delivery: null,
        lines: [
          { dishId: 'dish-tiramisu', quantity: 20, optionIds: [], note: '' },
          { dishId: 'dish-cannoli', quantity: 11, optionIds: [], note: '' },
        ],
      }),
    ).toMatchObject({ fieldErrors: { lines: ['Orders are limited to 30 items'] } });
  });

  it('refuses an unknown delivery area and a disabled fulfilment type', () => {
    expect(
      priceError({
        fulfilment: 'DELIVERY',
        delivery: { ...delivery, areaId: 'area-nowhere' },
        lines: [ribeye()],
      }),
    ).toMatchObject({
      errorCode: 'DELIVERY_AREA_UNAVAILABLE',
      fieldErrors: { 'delivery.areaId': ['Choose a delivery area'] },
    });
    expect(
      priceError(
        { fulfilment: 'PICKUP', delivery: null, lines: [ribeye()] },
        { settings: { ...MOCK_SETTINGS, pickupEnabled: false } },
      ),
    ).toMatchObject({ errorCode: 'ORDERING_PAUSED', message: 'Pickup is not available right now.' });
  });
});
