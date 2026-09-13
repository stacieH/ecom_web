import { EMPTY_CART } from '@/lib/ordering/cart/cartReducer';
import { CART_STORAGE_KEY, CartStorage, createCartStore } from '@/lib/ordering/cart/cartStore';

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: jest.fn((key: string) => items.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      items.set(key, value);
    }),
  };
}

const ribeye = { dishId: 'dish-ribeye', optionIds: ['ribeye-doneness-medium'], quantity: 1, note: '' };

describe('createCartStore', () => {
  it('restores the stored cart once and keeps one snapshot until it changes', () => {
    const storage = memoryStorage({
      [CART_STORAGE_KEY]: JSON.stringify({
        version: 1,
        fulfilment: 'DELIVERY',
        areaId: 'area-poblacion',
        lines: [ribeye],
      }),
    });
    const store = createCartStore(storage);

    const first = store.getSnapshot();

    expect(first).toMatchObject({
      fulfilment: 'DELIVERY',
      areaId: 'area-poblacion',
      lines: [{ dishId: 'dish-ribeye', quantity: 1 }],
    });
    expect(store.getSnapshot()).toBe(first);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it('saves each change and tells subscribers until they unsubscribe', () => {
    const storage = memoryStorage();
    const store = createCartStore(storage);
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);

    store.dispatch({ type: 'ADD', line: ribeye });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(JSON.parse(storage.items.get(CART_STORAGE_KEY) as string)).toEqual(store.getSnapshot());

    unsubscribe();
    store.dispatch({ type: 'REMOVE', key: store.getSnapshot().lines[0].key });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when an action changes nothing', () => {
    const storage = memoryStorage();
    const store = createCartStore(storage);
    const listener = jest.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'SET_FULFILMENT', fulfilment: 'PICKUP' });

    expect(listener).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('serves an empty cart to the server render and can start from a given cart', () => {
    const store = createCartStore(null, { ...EMPTY_CART, fulfilment: 'DELIVERY' });

    expect(store.getServerSnapshot()).toBe(EMPTY_CART);
    expect(store.getSnapshot().fulfilment).toBe('DELIVERY');
  });

  it('keeps working in memory when storage throws', () => {
    const broken: CartStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const store = createCartStore(broken);

    store.dispatch({ type: 'ADD', line: ribeye });

    expect(store.getSnapshot().lines).toHaveLength(1);
  });
});
