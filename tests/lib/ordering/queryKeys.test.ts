import { orderingKeys } from '@/lib/ordering/queryKeys';

describe('orderingKeys', () => {
  it('nests every slot list under one root so an order can refresh them all', () => {
    expect(orderingKeys.slots('DELIVERY', '2026-10-02', 'area-poblacion')).toEqual([
      'ordering',
      'slots',
      'DELIVERY',
      '2026-10-02',
      'area-poblacion',
    ]);
    expect(orderingKeys.slots('PICKUP', '2026-10-02', null).slice(0, 2)).toEqual(
      orderingKeys.slotsRoot,
    );
  });

  it('keys a quote by the exact draft', () => {
    const draft = {
      fulfilment: 'PICKUP' as const,
      delivery: null,
      lines: [{ dishId: 'dish-ribeye', quantity: 1, optionIds: [], note: '' }],
    };

    expect(orderingKeys.quote(draft)).toEqual(['ordering', 'quote', JSON.stringify(draft)]);
    expect(orderingKeys.quote({ ...draft, fulfilment: 'DELIVERY' })).not.toEqual(
      orderingKeys.quote(draft),
    );
  });

  it('keeps customer data under its own root', () => {
    expect(orderingKeys.session[0]).toBe('customer');
    expect(orderingKeys.order('O-7K2M9Q')).toEqual(['customer', 'order', 'O-7K2M9Q']);
  });
});
