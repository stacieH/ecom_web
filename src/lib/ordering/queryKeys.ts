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
