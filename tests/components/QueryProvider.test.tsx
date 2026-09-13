import { render } from '@testing-library/react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import QueryProvider, { makeQueryClient, shouldRetry } from '@/components/providers/QueryProvider';
import { ApiError } from '@/lib/api/client';

describe('QueryProvider', () => {
  it('gives its children one browser query client across renders', () => {
    const seen: QueryClient[] = [];

    function Capture() {
      seen.push(useQueryClient());
      return null;
    }

    const { unmount } = render(
      <QueryProvider>
        <Capture />
      </QueryProvider>,
    );
    unmount();
    render(
      <QueryProvider>
        <Capture />
      </QueryProvider>,
    );

    expect(seen[0]).toBeInstanceOf(QueryClient);
    expect(seen[seen.length - 1]).toBe(seen[0]);
  });

  it('does not retry an answer the API gave on purpose', () => {
    expect(shouldRetry(0, new ApiError(409, 'SLOT_FULL', 'Full'))).toBe(false);
    expect(shouldRetry(0, new ApiError(404, 'ORDER_NOT_FOUND', 'Gone'))).toBe(false);
  });

  it('retries a network failure or a server error once', () => {
    const network = new ApiError(0, 'NETWORK_ERROR', 'Offline');

    expect(shouldRetry(0, network)).toBe(true);
    expect(shouldRetry(1, network)).toBe(false);
    expect(shouldRetry(0, new ApiError(503, 'UNKNOWN', 'Down'))).toBe(true);
  });

  it('never retries mutations, so an order is not sent twice by the client', () => {
    expect(makeQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});
