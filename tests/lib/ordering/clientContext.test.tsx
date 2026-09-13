import { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import {
  createOrderingClient,
  OrderingClientProvider,
  useOrderingClient,
} from '@/lib/ordering/clientContext';
import { MockOrderingClient } from '@/lib/ordering/mock/MockOrderingClient';
import { createGuestClient } from '../../helpers/renderGuest';

describe('ordering client context', () => {
  it('uses the demo data client for the mock data source, which is the configured one', () => {
    expect(createOrderingClient('mock')).toBeInstanceOf(MockOrderingClient);
    expect(createOrderingClient()).toBeInstanceOf(MockOrderingClient);
  });

  it('refuses any other data source', () => {
    expect(() => createOrderingClient('api')).toThrow('Ordering API client is not available yet');
  });

  it('gives children the provided client and fails loudly without a provider', () => {
    const client = createGuestClient();
    const { result } = renderHook(() => useOrderingClient(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <OrderingClientProvider client={client}>{children}</OrderingClientProvider>
      ),
    });
    expect(result.current).toBe(client);

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useOrderingClient())).toThrow(
      'useOrderingClient must be used inside OrderingClientProvider',
    );
    consoleError.mockRestore();
  });
});
