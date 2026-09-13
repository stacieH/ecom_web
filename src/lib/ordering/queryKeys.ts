import type { Fulfilment, OrderDraft } from './types';

export const orderingKeys = {
  menu: ['ordering', 'menu'] as const,
  status: ['ordering', 'status'] as const,
  areas: ['ordering', 'areas'] as const,
  slotsRoot: ['ordering', 'slots'] as const,
  slots: (fulfilment: Fulfilment, date: string, areaId: string | null) =>
    ['ordering', 'slots', fulfilment, date, areaId] as const,
  quote: (draft: OrderDraft) => ['ordering', 'quote', JSON.stringify(draft)] as const,
  tracked: (token: string) => ['ordering', 'tracked', token] as const,
  session: ['customer', 'session'] as const,
  addresses: ['customer', 'addresses'] as const,
  orders: ['customer', 'orders'] as const,
  order: (reference: string) => ['customer', 'order', reference] as const,
  demo: ['ordering', 'demo'] as const,
  checkoutSession: (id: string) => ['ordering', 'demo', 'checkout', id] as const,
};

/**
 * True for a cached `['customer', …]` query that sign-in and sign-out should
 * clear. Keeps the session (overwritten by the caller instead) and a
 * verify-email result (`VerifyEmail.tsx` caches it with `gcTime: Infinity` so
 * a used link keeps showing its already-checked result instead of re-running
 * against a token the server has since consumed).
 */
export function isDisposableCustomerQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[1] !== 'session' && query.queryKey[1] !== 'verify-email';
}
