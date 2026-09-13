'use client';
import { createContext, ReactNode, useContext, useState, useSyncExternalStore } from 'react';
import { CartAction, cartItemCount, CartState } from '@/lib/ordering/cart/cartReducer';
import { cartStorage, CartStore, createCartStore } from '@/lib/ordering/cart/cartStore';

interface CartContextValue {
  cart: CartState;
  itemCount: number;
  dispatch: (action: CartAction) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export default function CartProvider({ store, children }: { store?: CartStore; children: ReactNode }) {
  const [cartStore] = useState(() => store ?? createCartStore(cartStorage()));
  const cart = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot,
  );

  return (
    <CartContext.Provider value={{ cart, itemCount: cartItemCount(cart), dispatch: cartStore.dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return value;
}
