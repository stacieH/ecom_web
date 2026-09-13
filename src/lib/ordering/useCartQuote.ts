import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';
import type { CartState } from './cart/cartReducer';
import { useOrderingClient } from './clientContext';
import { orderingKeys } from './queryKeys';
import type { OrderDraft } from './types';

export const QUOTE_DEBOUNCE_MS = 400;

const EMPTY_DRAFT: OrderDraft = { fulfilment: 'PICKUP', delivery: null, lines: [] };

/** The draft a cart quotes. Delivery without an area is drafted as pickup, so a subtotal still shows. */
export function draftFromCart(cart: CartState): OrderDraft | null {
  if (cart.lines.length === 0) return null;

  const delivery = cart.fulfilment === 'DELIVERY' && cart.areaId !== null;
  return {
    fulfilment: delivery ? 'DELIVERY' : 'PICKUP',
    delivery: delivery
      ? { areaId: cart.areaId as string, street: '', building: '', landmark: '', instructions: '' }
      : null,
    lines: cart.lines.map(({ dishId, optionIds, quantity, note }) => ({ dishId, optionIds, quantity, note })),
  };
}

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Prices the cart through `quote`. The first quote runs at once; later changes
 * wait until the cart has been still for 400 ms. Checkout calls this with the
 * same cart, so both share one cache entry.
 */
export function useCartQuote(cart: CartState) {
  const client = useOrderingClient();
  const draft = draftFromCart(cart);
  const draftJson = draft ? JSON.stringify(draft) : '';
  const settledJson = useDebounced(draftJson, QUOTE_DEBOUNCE_MS);
  const settled = settledJson ? (JSON.parse(settledJson) as OrderDraft) : null;

  const query = useQuery({
    queryKey: orderingKeys.quote(settled ?? EMPTY_DRAFT),
    queryFn: () => client.quote(settled as OrderDraft),
    enabled: settled !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  return {
    draft: settled,
    quote: settled ? query.data : undefined,
    error: settled && query.error instanceof ApiError ? query.error : null,
    isUpdating: draftJson !== settledJson || query.isFetching,
    needsArea: cart.fulfilment === 'DELIVERY' && cart.areaId === null,
    retry: () => {
      void query.refetch();
    },
  };
}
