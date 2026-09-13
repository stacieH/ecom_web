import { EMPTY_CART } from '@/lib/ordering/cart/cartReducer';
import { draftFromCart } from '@/lib/ordering/useCartQuote';
import { cartLine } from '../../helpers/renderGuest';

describe('draftFromCart', () => {
  it('has nothing to quote for an empty cart', () => {
    expect(draftFromCart(EMPTY_CART)).toBeNull();
  });

  it('quotes delivery once an area is chosen, and pickup until then', () => {
    const lines = [cartLine('dish-tiramisu', [], 2, 'Candle')];

    expect(draftFromCart({ ...EMPTY_CART, fulfilment: 'DELIVERY', lines })).toEqual({
      fulfilment: 'PICKUP',
      delivery: null,
      lines: [{ dishId: 'dish-tiramisu', optionIds: [], quantity: 2, note: 'Candle' }],
    });
    expect(draftFromCart({ ...EMPTY_CART, fulfilment: 'DELIVERY', areaId: 'area-rockwell', lines })).toEqual({
      fulfilment: 'DELIVERY',
      delivery: { areaId: 'area-rockwell', street: '', building: '', landmark: '', instructions: '' },
      lines: [{ dishId: 'dish-tiramisu', optionIds: [], quantity: 2, note: 'Candle' }],
    });
  });
});
