import { CartAction, cartReducer, CartState, EMPTY_CART, parseStoredCart } from './cartReducer';

export const CART_STORAGE_KEY = 'cs-cart-v1';

export type CartStorage = Pick<Storage, 'getItem' | 'setItem'>;

export interface CartStore {
  getSnapshot: () => CartState;
  getServerSnapshot: () => CartState;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: CartAction) => void;
}

/** localStorage when the browser allows it; null on the server or when blocked. */
export function cartStorage(): CartStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * A small external store for useSyncExternalStore. The server render and
 * hydration see an empty cart; the stored cart is read on the first client
 * snapshot, so restoring it never causes a hydration mismatch.
 */
export function createCartStore(storage: CartStorage | null, initial?: CartState): CartStore {
  let state: CartState | null = initial ?? null;
  const listeners = new Set<() => void>();

  const read = (): CartState => {
    if (state === null) {
      let raw: string | null = null;
      try {
        raw = storage?.getItem(CART_STORAGE_KEY) ?? null;
      } catch {
        raw = null;
      }
      state = parseStoredCart(raw);
    }
    return state;
  };

  return {
    getSnapshot: read,
    getServerSnapshot: () => EMPTY_CART,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action) => {
      const current = read();
      const next = cartReducer(current, action);
      if (next === current) return;

      state = next;
      try {
        storage?.setItem(CART_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Storage is full or blocked: the cart keeps working for this visit.
      }
      listeners.forEach((listener) => listener());
    },
  };
}
