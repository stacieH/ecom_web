'use client';
import { createContext, ReactNode, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrderingClient } from '@/lib/ordering/clientContext';
import { orderingKeys } from '@/lib/ordering/queryKeys';
import type { Customer } from '@/lib/ordering/types';

export type SessionStatus = 'loading' | 'signedIn' | 'signedOut' | 'error';

interface CustomerSession {
  status: SessionStatus;
  customer: Customer | null;
  retry: () => void;
}

const SessionContext = createContext<CustomerSession | null>(null);

/** One session query for every guest page; sign-in and sign-out update its cache entry. */
export default function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const client = useOrderingClient();
  const session = useQuery({ queryKey: orderingKeys.session, queryFn: () => client.getSession() });
  const customer = session.data ?? null;

  let status: SessionStatus;
  if (session.isError) {
    status = 'error';
  } else if (session.isPending) {
    status = 'loading';
  } else {
    status = customer ? 'signedIn' : 'signedOut';
  }

  return (
    <SessionContext.Provider value={{ status, customer, retry: () => void session.refetch() }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useCustomerSession(): CustomerSession {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useCustomerSession must be used inside CustomerSessionProvider');
  }
  return value;
}
