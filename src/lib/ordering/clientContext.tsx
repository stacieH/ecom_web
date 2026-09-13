'use client';
import { createContext, ReactNode, useContext, useState } from 'react';
import { MockOrderingClient } from './mock/MockOrderingClient';
import type { OrderingClient } from './types';

/**
 * Picks the OrderingClient for NEXT_PUBLIC_ORDERING_DATA_SOURCE. Only the demo
 * data source exists until the ordering API (3A) is live.
 */
export function createOrderingClient(
  source: string | undefined = process.env.NEXT_PUBLIC_ORDERING_DATA_SOURCE,
): OrderingClient {
  if (source === 'mock') return new MockOrderingClient();
  throw new Error('Ordering API client is not available yet');
}

const OrderingClientContext = createContext<OrderingClient | null>(null);

export function OrderingClientProvider({
  client,
  children,
}: {
  client?: OrderingClient;
  children: ReactNode;
}) {
  const [value] = useState(() => client ?? createOrderingClient());
  return <OrderingClientContext.Provider value={value}>{children}</OrderingClientContext.Provider>;
}

export function useOrderingClient(): OrderingClient {
  const client = useContext(OrderingClientContext);
  if (!client) {
    throw new Error('useOrderingClient must be used inside OrderingClientProvider');
  }
  return client;
}
