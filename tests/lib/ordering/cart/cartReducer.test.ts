import {
  cartItemCount,
  cartReducer,
  CartState,
  EMPTY_CART,
  lineKey,
  parseStoredCart,
} from '@/lib/ordering/cart/cartReducer';

function add(
  state: CartState,
  dishId: string,
  extra: Partial<{ optionIds: string[]; quantity: number; note: string }> = {},
) {
  return cartReducer(state, {
    type: 'ADD',
    line: { dishId, optionIds: [], quantity: 1, note: '', ...extra },
  });
}

describe('cartReducer', () => {
  it('adds a line keyed by dish, sorted options, and trimmed note', () => {
    const state = add(EMPTY_CART, 'dish-ribeye', { optionIds: ['b', 'a'], note: '  no salt ' });

    expect(state.lines).toEqual([
      { key: 'dish-ribeye|a,b|no salt', dishId: 'dish-ribeye', optionIds: ['a', 'b'], quantity: 1, note: 'no salt' },
    ]);
    expect(lineKey({ dishId: 'dish-ribeye', optionIds: ['b', 'a'], note: 'no salt' })).toBe(
      'dish-ribeye|a,b|no salt',
    );
  });

  it('merges the same configuration and keeps different ones apart', () => {
    let state = add(EMPTY_CART, 'dish-tiramisu', { quantity: 2 });
    state = add(state, 'dish-tiramisu', { quantity: 3 });
    state = add(state, 'dish-tiramisu', { note: 'Birthday candle' });

    expect(state.lines.map((line) => [line.note, line.quantity])).toEqual([
      ['', 5],
      ['Birthday candle', 1],
    ]);
  });

  it('keeps each line between 1 and 20', () => {
    let state = add(EMPTY_CART, 'dish-tiramisu', { quantity: 15 });
    state = add(state, 'dish-tiramisu', { quantity: 10 });
    expect(state.lines[0].quantity).toBe(20);

    const { key } = state.lines[0];
    expect(cartReducer(state, { type: 'SET_QUANTITY', key, quantity: 0 }).lines[0].quantity).toBe(1);
    expect(cartReducer(state, { type: 'SET_QUANTITY', key, quantity: 25 }).lines[0].quantity).toBe(20);
  });

  it('removes a line', () => {
    const state = add(add(EMPTY_CART, 'dish-tiramisu'), 'dish-cannoli');

    const next = cartReducer(state, { type: 'REMOVE', key: state.lines[0].key });

    expect(next.lines.map((line) => line.dishId)).toEqual(['dish-cannoli']);
  });

  it('replaces an edited line in place, and merges it when it matches another line', () => {
    let state = add(EMPTY_CART, 'dish-ribeye', { optionIds: ['ribeye-doneness-rare'] });
    state = add(state, 'dish-ribeye', { optionIds: ['ribeye-doneness-medium'] });
    state = add(state, 'dish-tiramisu');

    const edited = cartReducer(state, {
      type: 'REPLACE',
      key: state.lines[1].key,
      line: { dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-well-done'], quantity: 2, note: '' },
    });
    expect(edited.lines.map((line) => line.optionIds[0] ?? line.dishId)).toEqual([
      'ribeye-doneness-rare',
      'ribeye-doneness-well-done',
      'dish-tiramisu',
    ]);

    const merged = cartReducer(edited, {
      type: 'REPLACE',
      key: edited.lines[1].key,
      line: { dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-rare'], quantity: 2, note: '' },
    });
    expect(merged.lines.map((line) => [line.optionIds[0] ?? line.dishId, line.quantity])).toEqual([
      ['ribeye-doneness-rare', 3],
      ['dish-tiramisu', 1],
    ]);
  });

  it('stores fulfilment and area, and keeps them when the lines are cleared', () => {
    let state = cartReducer(EMPTY_CART, { type: 'SET_FULFILMENT', fulfilment: 'DELIVERY' });
    state = cartReducer(state, { type: 'SET_AREA', areaId: 'area-rockwell' });
    state = add(state, 'dish-tiramisu');

    expect(cartReducer(state, { type: 'CLEAR' })).toEqual({
      version: 1,
      fulfilment: 'DELIVERY',
      areaId: 'area-rockwell',
      lines: [],
    });
  });

  it('counts items across lines', () => {
    const state = add(add(EMPTY_CART, 'dish-tiramisu', { quantity: 2 }), 'dish-cannoli', { quantity: 3 });
    expect(cartItemCount(state)).toBe(5);
  });
});

describe('parseStoredCart', () => {
  it('restores lines for the next quote to re-check, rebuilding keys and dropping malformed ones', () => {
    const raw = JSON.stringify({
      version: 1,
      fulfilment: 'DELIVERY',
      areaId: 'area-bel-air',
      lines: [
        { key: 'stale', dishId: 'dish-retired', optionIds: [], quantity: 2, note: '' },
        { dishId: 'dish-tiramisu', optionIds: 'not a list', quantity: 1, note: '' },
        { dishId: 'dish-tiramisu', optionIds: [], quantity: 1, note: '' },
      ],
    });

    expect(parseStoredCart(raw)).toEqual({
      version: 1,
      fulfilment: 'DELIVERY',
      areaId: 'area-bel-air',
      lines: [
        { key: 'dish-retired||', dishId: 'dish-retired', optionIds: [], quantity: 2, note: '' },
        { key: 'dish-tiramisu||', dishId: 'dish-tiramisu', optionIds: [], quantity: 1, note: '' },
      ],
    });
  });

  it('starts empty for missing, unreadable, or older data', () => {
    expect(parseStoredCart(null)).toBe(EMPTY_CART);
    expect(parseStoredCart('{')).toBe(EMPTY_CART);
    expect(parseStoredCart(JSON.stringify({ version: 0, lines: [] }))).toBe(EMPTY_CART);
  });
});
