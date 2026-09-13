import { areaOptionLabel, optionSummary } from '@/lib/ordering/labels';
import { MOCK_DELIVERY_AREAS } from '@/lib/ordering/mock/mockData';

describe('ordering labels', () => {
  it('describes a delivery area with its fee and minimum', () => {
    expect(areaOptionLabel(MOCK_DELIVERY_AREAS[0])).toBe('Poblacion · ₱60 delivery · ₱800 minimum');
  });

  it('lists a priced line’s options by group', () => {
    expect(
      optionSummary({
        dishId: 'dish-vanilla-latte',
        name: 'Iced Vanilla Latte',
        quantity: 1,
        unitPriceCentavos: 20000,
        options: [{ groupName: 'Milk', optionName: 'Oat milk', priceDeltaCentavos: 4000 }],
        note: '',
        lineTotalCentavos: 20000,
      }),
    ).toBe('Milk: Oat milk');
  });
});
